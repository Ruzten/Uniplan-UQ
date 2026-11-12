import type { UniplanDb } from "@/src/db/db";
import { getSetting, setSetting } from "@/src/db/repo";
import {
  alignSpannedHeaders,
  type ClassifiedTable,
  classifyTable,
  parseDay,
  parseScore,
  parseTime,
} from "@/src/domain/sac";
import { parseSacReport, type SacReportBlock } from "@/src/domain/sac-report";
import { isScheduleGrid, parseScheduleGrid } from "@/src/domain/sac-schedule";
import {
  type GradeScale,
  type ScheduleBlock,
  type Subject,
  type SyncCounts,
  type SyncRun,
  scheduleBlockSchema,
} from "@/src/domain/schemas";
import { findByLooseName, normalizeText } from "@/src/domain/text";
import {
  type IncomingGrade,
  patchSubject,
  runSync,
  upsertSynced,
} from "@/src/sync/merge";
import type { SacCapture, SacTable } from "@/src/sync/messages";

type ImportContext = {
  db: UniplanDb;
  subjectsByName: Map<string, Subject>;
  subjectsById: Map<string, Subject>;
  aliases: Record<string, string>;
  scale: GradeScale;
  unmatchedNames: Set<string>;
  counts: SyncCounts;
};

function cell(row: string[], index: number | undefined): string {
  return index === undefined ? "" : (row[index] ?? "");
}

function addCounts(target: SyncCounts, extra: SyncCounts): void {
  target.created += extra.created;
  target.updated += extra.updated;
  target.skipped += extra.skipped;
}

function matchSubject(ctx: ImportContext, rawName: string): Subject | null {
  const normalized = normalizeText(rawName);
  if (normalized === "") {
    return null;
  }
  const byName = ctx.subjectsByName.get(normalized);
  if (byName !== undefined) {
    return byName;
  }
  const aliasId = ctx.aliases[normalized];
  const byAlias =
    aliasId === undefined ? undefined : ctx.subjectsById.get(aliasId);
  if (byAlias !== undefined) {
    return byAlias;
  }
  const byLoose = findByLooseName(rawName, ctx.subjectsById.values());
  if (byLoose !== null) {
    return byLoose;
  }
  ctx.unmatchedNames.add(rawName.trim());
  return null;
}

async function importGrades(
  ctx: ImportContext,
  table: SacTable,
  classified: ClassifiedTable,
): Promise<void> {
  const { columns } = classified;
  const incoming: IncomingGrade[] = [];
  for (const row of table.rows) {
    const subject = matchSubject(ctx, cell(row, columns.subjectName));
    if (subject === null) {
      continue;
    }
    for (const index of columns.partials) {
      const score = parseScore(cell(row, index));
      const header = table.headers[index] ?? "";
      if (score === null || score < 0 || header.trim() === "") {
        continue;
      }
      incoming.push({
        externalId: `sac|${subject.id}|${normalizeText(header)}`,
        subjectId: subject.id,
        label: header.trim(),
        score,
        maxScore: ctx.scale.max,
        weightPct: null,
      });
    }
    const finalGrade = parseScore(cell(row, columns.finalGrade));
    if (finalGrade !== null) {
      await patchSubject(ctx.db, subject.id, { finalGrade }, "sync");
    }
  }
  if (incoming.length > 0) {
    addCounts(
      ctx.counts,
      await upsertSynced(ctx.db, "grades", "sac", incoming),
    );
  }
}

function buildBlocks(
  ctx: ImportContext,
  table: SacTable,
  classified: ClassifiedTable,
): ScheduleBlock[] {
  const { columns } = classified;
  const blocks: ScheduleBlock[] = [];
  for (const row of table.rows) {
    const rawSubjectName = cell(row, columns.subjectName).trim();
    const day = parseDay(cell(row, columns.day));
    const start = parseTime(cell(row, columns.start));
    const end = parseTime(cell(row, columns.end));
    if (
      rawSubjectName === "" ||
      day === null ||
      start === null ||
      end === null
    ) {
      continue;
    }
    const subject = matchSubject(ctx, rawSubjectName);
    blocks.push(
      scheduleBlockSchema.parse({
        id: crypto.randomUUID(),
        subjectId: subject?.id ?? null,
        rawSubjectName,
        day,
        start,
        end,
        room: cell(row, columns.room).trim(),
        source: "sac",
      }),
    );
  }
  return blocks;
}

function gridBlocks(ctx: ImportContext, table: SacTable): ScheduleBlock[] {
  return parseScheduleGrid(table).map((parsed) => {
    const subject = matchSubject(ctx, parsed.name);
    return scheduleBlockSchema.parse({
      id: crypto.randomUUID(),
      subjectId: subject?.id ?? null,
      rawSubjectName: parsed.name,
      day: parsed.day,
      start: parsed.start,
      end: parsed.end,
      room: parsed.room,
      source: "sac",
    });
  });
}

function blockKey(block: ScheduleBlock): string {
  return [
    normalizeText(block.rawSubjectName),
    block.day,
    block.start,
    block.end,
    normalizeText(block.room),
  ].join("|");
}

// Replaces the previous SAC schedule with the new one. A block already present
// (same subject, day, hours and room) counts as skipped, any other as created.
async function replaceSacBlocks(
  ctx: ImportContext,
  blocks: ScheduleBlock[],
): Promise<void> {
  const { db } = ctx;
  await db.transaction("rw", db.scheduleBlocks, async () => {
    const previous = await db.scheduleBlocks
      .where("source")
      .equals("sac")
      .toArray();
    const known = new Set(previous.map(blockKey));
    for (const block of blocks) {
      if (known.has(blockKey(block))) {
        ctx.counts.skipped += 1;
      } else {
        ctx.counts.created += 1;
      }
    }
    await db.scheduleBlocks.where("source").equals("sac").delete();
    await db.scheduleBlocks.bulkAdd(blocks);
  });
}

async function importEnrollment(
  ctx: ImportContext,
  table: SacTable,
  classified: ClassifiedTable,
): Promise<void> {
  const { columns } = classified;
  for (const row of table.rows) {
    const subject = matchSubject(ctx, cell(row, columns.subjectName));
    if (subject === null) {
      continue;
    }
    const before = await ctx.db.subjects.get(subject.id);
    const credits = parseScore(cell(row, columns.credits));
    if (credits !== null && credits > 0) {
      await patchSubject(ctx.db, subject.id, { credits }, "sync");
    }
    const current = await ctx.db.subjects.get(subject.id);
    if (current?.status === "pendiente") {
      await patchSubject(ctx.db, subject.id, { status: "cursando" }, "sync");
    }
    const after = await ctx.db.subjects.get(subject.id);
    if (
      before?.credits !== after?.credits ||
      before?.status !== after?.status
    ) {
      ctx.counts.updated += 1;
    }
  }
}

// Imports the blocks of the "Notas registradas" report. A component score of 0
// means "not graded yet" in this SAC, so it is imported as a pending grade
// (score null, weight kept); the same externalId lets a later import fill the
// score in. A Definitiva of 0 is ignored.
async function importReport(
  ctx: ImportContext,
  blocks: SacReportBlock[],
): Promise<void> {
  const incoming: IncomingGrade[] = [];
  for (const block of blocks) {
    const subject = matchSubject(ctx, block.name);
    if (subject === null) {
      continue;
    }
    for (const component of block.components) {
      incoming.push({
        externalId: `sac|report|${block.code}|${normalizeText(component.label)}`,
        subjectId: subject.id,
        label: component.label,
        score: component.score > 0 ? component.score : null,
        maxScore: ctx.scale.max,
        weightPct: component.weightPct,
      });
    }
    if (block.final !== null && block.final > 0) {
      await patchSubject(
        ctx.db,
        subject.id,
        { finalGrade: block.final },
        "sync",
      );
    }
  }
  if (incoming.length > 0) {
    addCounts(
      ctx.counts,
      await upsertSynced(ctx.db, "grades", "sac", incoming),
    );
  }
}

export function importSacCapture(
  db: UniplanDb,
  capture: SacCapture,
): Promise<SyncRun> {
  return runSync(db, "sac", async () => {
    const synonyms = await getSetting(db, "headerSynonyms");
    const aliases = await getSetting(db, "subjectAliases");
    const scale = await getSetting(db, "gradeScale");
    const subjects = await db.subjects.toArray();
    const ctx: ImportContext = {
      db,
      subjectsByName: new Map(subjects.map((s) => [normalizeText(s.name), s])),
      subjectsById: new Map(subjects.map((s) => [s.id, s])),
      aliases,
      scale,
      unmatchedNames: new Set(),
      counts: { created: 0, updated: 0, skipped: 0, unmatched: 0 },
    };
    let recognized = 0;
    const blocks: ScheduleBlock[] = [];
    for (const raw of capture.tables) {
      const table = alignSpannedHeaders(raw);
      if (isScheduleGrid(table)) {
        recognized += 1;
        blocks.push(...gridBlocks(ctx, table));
        continue;
      }
      const classified = classifyTable(table, synonyms);
      if (classified.kind === "unknown") {
        ctx.counts.skipped += 1;
        continue;
      }
      recognized += 1;
      if (classified.kind === "grades") {
        await importGrades(ctx, table, classified);
      } else if (classified.kind === "schedule") {
        blocks.push(...buildBlocks(ctx, table, classified));
      } else {
        await importEnrollment(ctx, table, classified);
      }
    }
    if (blocks.length > 0) {
      await replaceSacBlocks(ctx, blocks);
    }
    const reportBlocks = parseSacReport(capture.texts, scale.max);
    if (reportBlocks.length > 0) {
      recognized += reportBlocks.length;
      await importReport(ctx, reportBlocks);
    }
    if (ctx.unmatchedNames.size > 0) {
      const stored = await getSetting(db, "unmatchedSubjects");
      const merged = [...new Set([...stored, ...ctx.unmatchedNames])];
      await setSetting(db, "unmatchedSubjects", merged);
    }
    ctx.counts.unmatched = ctx.unmatchedNames.size;
    if (recognized === 0) {
      return { counts: ctx.counts, note: "0 tablas reconocidas" };
    }
    return { counts: ctx.counts };
  });
}
