import type { Table } from "dexie";
import type { z } from "zod";
import type { UniplanDb } from "@/src/db/db";
import {
  type Grade,
  gradeSchema,
  type Item,
  itemSchema,
  type Subject,
  type SyncCounts,
  type SyncRun,
  subjectSchema,
  syncRunSchema,
} from "@/src/domain/schemas";

export type SyncTable = "items" | "grades";

export type SyncSource = SyncRun["source"];

type SystemKeys =
  | "id"
  | "source"
  | "overrides"
  | "hidden"
  | "createdAt"
  | "updatedAt"
  | "externalId";

export type IncomingItem = Omit<Item, SystemKeys> & { externalId: string };
export type IncomingGrade = Omit<Grade, SystemKeys> & { externalId: string };

export type ItemPatch = Partial<Omit<Item, SystemKeys>>;
export type GradePatch = Partial<Omit<Grade, SystemKeys>>;
export type SubjectPatch = Partial<Omit<Subject, "id" | "overrides">>;

type MergeableRow = {
  id: string;
  source: Item["source"];
  externalId: string | null;
  overrides: string[];
  hidden: boolean;
  updatedAt: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function definedEntries(patch: object): [string, unknown][] {
  return Object.entries(patch).filter(([, value]) => value !== undefined);
}

function emptyCounts(): SyncCounts {
  return { created: 0, updated: 0, skipped: 0, unmatched: 0 };
}

async function upsertRows<T extends MergeableRow>(
  table: Table<T, string>,
  schema: z.ZodType<T>,
  source: SyncSource,
  incoming: readonly object[],
  buildNew: (record: object, now: string) => object,
): Promise<SyncCounts> {
  const counts = emptyCounts();
  for (const record of incoming) {
    const externalId = (record as { externalId: string }).externalId;
    const existing = await table
      .where("[source+externalId]")
      .equals([source, externalId])
      .first();
    const now = nowIso();
    if (existing === undefined) {
      const created = schema.parse({
        ...buildNew(record, now),
        id: crypto.randomUUID(),
        source,
        externalId,
        overrides: [],
        hidden: false,
      });
      await table.add(created);
      counts.created += 1;
      continue;
    }
    if (existing.hidden) {
      counts.skipped += 1;
      continue;
    }
    const next: Record<string, unknown> = { ...existing };
    let changed = false;
    for (const [key, value] of definedEntries(record)) {
      if (existing.overrides.includes(key)) {
        continue;
      }
      if (!sameValue(next[key], value)) {
        next[key] = value;
        changed = true;
      }
    }
    if (!changed) {
      counts.skipped += 1;
      continue;
    }
    next.updatedAt = now;
    await table.put(schema.parse(next));
    counts.updated += 1;
  }
  return counts;
}

export function upsertSynced(
  db: UniplanDb,
  table: "items",
  source: SyncSource,
  incoming: readonly IncomingItem[],
): Promise<SyncCounts>;
export function upsertSynced(
  db: UniplanDb,
  table: "grades",
  source: SyncSource,
  incoming: readonly IncomingGrade[],
): Promise<SyncCounts>;
export function upsertSynced(
  db: UniplanDb,
  table: SyncTable,
  source: SyncSource,
  incoming: readonly IncomingItem[] | readonly IncomingGrade[],
): Promise<SyncCounts> {
  if (table === "items") {
    return upsertRows<Item>(
      db.items,
      itemSchema,
      source,
      incoming,
      (record, now) => ({ ...record, createdAt: now, updatedAt: now }),
    );
  }
  return upsertRows<Grade>(
    db.grades,
    gradeSchema,
    source,
    incoming,
    (record, now) => ({ ...record, updatedAt: now }),
  );
}

async function editRow<T extends MergeableRow>(
  table: Table<T, string>,
  schema: z.ZodType<T>,
  id: string,
  patch: object,
): Promise<boolean> {
  const existing = await table.get(id);
  if (existing === undefined) {
    return false;
  }
  const next: Record<string, unknown> = { ...existing };
  const changedKeys: string[] = [];
  for (const [key, value] of definedEntries(patch)) {
    if (!sameValue(next[key], value)) {
      next[key] = value;
      changedKeys.push(key);
    }
  }
  if (changedKeys.length === 0) {
    return true;
  }
  if (existing.source !== "manual") {
    next.overrides = [...new Set([...existing.overrides, ...changedKeys])];
  }
  next.updatedAt = nowIso();
  await table.put(schema.parse(next));
  return true;
}

export function editRecord(
  db: UniplanDb,
  table: "items",
  id: string,
  patch: ItemPatch,
): Promise<boolean>;
export function editRecord(
  db: UniplanDb,
  table: "grades",
  id: string,
  patch: GradePatch,
): Promise<boolean>;
export function editRecord(
  db: UniplanDb,
  table: SyncTable,
  id: string,
  patch: ItemPatch | GradePatch,
): Promise<boolean> {
  if (table === "items") {
    return editRow<Item>(db.items, itemSchema, id, patch);
  }
  return editRow<Grade>(db.grades, gradeSchema, id, patch);
}

async function removeRow<T extends MergeableRow>(
  table: Table<T, string>,
  schema: z.ZodType<T>,
  id: string,
): Promise<boolean> {
  const existing = await table.get(id);
  if (existing === undefined) {
    return false;
  }
  if (existing.source === "manual") {
    await table.delete(id);
    return true;
  }
  await table.put(schema.parse({ ...existing, hidden: true }));
  return true;
}

export function removeRecord(
  db: UniplanDb,
  table: SyncTable,
  id: string,
): Promise<boolean> {
  if (table === "items") {
    return removeRow<Item>(db.items, itemSchema, id);
  }
  return removeRow<Grade>(db.grades, gradeSchema, id);
}

export async function patchSubject(
  db: UniplanDb,
  id: string,
  patch: SubjectPatch,
  origin: "student" | "sync",
): Promise<boolean> {
  const existing = await db.subjects.get(id);
  if (existing === undefined) {
    return false;
  }
  const next: Record<string, unknown> = { ...existing };
  const overrides = new Set(existing.overrides);
  for (const [key, value] of definedEntries(patch)) {
    if (origin === "sync" && existing.overrides.includes(key)) {
      continue;
    }
    next[key] = value;
    if (origin === "student") {
      overrides.add(key);
    }
  }
  next.overrides = [...overrides];
  await db.subjects.put(subjectSchema.parse(next));
  return true;
}

export async function runSync(
  db: UniplanDb,
  source: SyncSource,
  work: () => Promise<{ counts: SyncCounts; note?: string }>,
): Promise<SyncRun> {
  const id = crypto.randomUUID();
  const startedAt = nowIso();
  let run: SyncRun;
  try {
    const { counts, note } = await work();
    const partial = note !== undefined || counts.unmatched > 0;
    run = syncRunSchema.parse({
      id,
      source,
      startedAt,
      finishedAt: nowIso(),
      status: partial ? "partial" : "ok",
      counts,
      error: note ?? null,
    });
  } catch (error) {
    run = syncRunSchema.parse({
      id,
      source,
      startedAt,
      finishedAt: nowIso(),
      status: "error",
      counts: emptyCounts(),
      error: error instanceof Error ? error.message : String(error),
    });
  }
  await db.syncRuns.add(run);
  return run;
}

export async function addSubject(
  db: UniplanDb,
  subject: Subject,
): Promise<boolean> {
  const parsed = subjectSchema.parse(subject);
  return db.transaction("rw", db.subjects, async () => {
    if ((await db.subjects.get(parsed.id)) !== undefined) {
      return false;
    }
    await db.subjects.add(parsed);
    return true;
  });
}

export async function removeSubject(db: UniplanDb, id: string): Promise<void> {
  await db.transaction("rw", db.subjects, async () => {
    await db.subjects.delete(id);
    const dependents = await db.subjects
      .filter((subject) => subject.prereqIds.includes(id))
      .toArray();
    for (const dependent of dependents) {
      await db.subjects.put(
        subjectSchema.parse({
          ...dependent,
          prereqIds: dependent.prereqIds.filter((prereq) => prereq !== id),
        }),
      );
    }
  });
}

export async function replacePensum(
  db: UniplanDb,
  subjects: readonly Subject[],
): Promise<void> {
  const parsed = subjects.map((subject) => subjectSchema.parse(subject));
  await db.transaction("rw", db.subjects, db.settings, async () => {
    await db.subjects.clear();
    await db.subjects.bulkAdd(parsed);
    await db.settings.put({ key: "subjectAliases", value: {} });
    await db.settings.put({ key: "unmatchedSubjects", value: [] });
    await db.settings.put({ key: "pensumReviewed", value: true });
  });
}

export async function resetProgress(db: UniplanDb): Promise<void> {
  await db.transaction("rw", db.subjects, db.settings, async () => {
    const subjects = await db.subjects.toArray();
    await db.subjects.bulkPut(
      subjects.map((subject) =>
        subjectSchema.parse({
          ...subject,
          status: "pendiente",
          finalGrade: null,
          overrides: [],
        }),
      ),
    );
    await db.settings.put({ key: "pensumReviewed", value: true });
  });
}
