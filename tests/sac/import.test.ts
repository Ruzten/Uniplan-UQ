import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, type UniplanDb } from "@/src/db/db";
import { getSetting, setSetting } from "@/src/db/repo";
import { normalizeText, slugify } from "@/src/domain/text";
import { patchSubject } from "@/src/sync/merge";
import { type SacCapture, sacCaptureSchema } from "@/src/sync/messages";
import { importSacCapture } from "@/src/sync/sac-import";

function readCapture(name: string): SacCapture {
  const file = path.resolve("tests/fixtures/sac", name);
  return sacCaptureSchema.parse(JSON.parse(readFileSync(file, "utf8")));
}

let db: UniplanDb;

beforeEach(async () => {
  db = createDb(`uniplan-test-${crypto.randomUUID()}`);
  await db.open();
});

afterEach(async () => {
  await db.delete();
});

describe("importSacCapture", () => {
  it("creates the partial grades of known subjects and records the unknown name", async () => {
    const run = await importSacCapture(db, readCapture("grades.json"));
    expect(run.counts.created).toBe(4);
    expect(run.counts.unmatched).toBe(1);
    expect(run.status).toBe("partial");
    const grades = await db.grades.toArray();
    expect(grades).toHaveLength(4);
    expect(grades.every((grade) => grade.source === "sac")).toBe(true);
    const calculo = grades.find(
      (grade) =>
        grade.subjectId === slugify("Cálculo integral") &&
        grade.label === "Nota 1",
    );
    expect(calculo?.score).toBe(3.8);
    expect(calculo?.externalId).toBe(
      `sac|${slugify("Cálculo integral")}|nota 1`,
    );
    expect(await getSetting(db, "unmatchedSubjects")).toContain(
      "Electiva Deportiva",
    );
    expect(await db.syncRuns.count()).toBe(1);
  });

  it("does not duplicate grades when the same capture is imported again", async () => {
    const capture = readCapture("grades.json");
    await importSacCapture(db, capture);
    const before = await db.grades.count();
    const second = await importSacCapture(db, capture);
    expect(second.counts.created).toBe(0);
    expect(await db.grades.count()).toBe(before);
    expect(await getSetting(db, "unmatchedSubjects")).toEqual([
      "Electiva Deportiva",
    ]);
  });

  it("logs a partial run and touches no data for an unknown table", async () => {
    const subjectsBefore = await db.subjects.toArray();
    const run = await importSacCapture(db, readCapture("unknown.json"));
    expect(run.status).toBe("partial");
    expect(run.error).toBe("0 tablas reconocidas");
    const [stored] = await db.syncRuns.toArray();
    expect(stored?.status).toBe("partial");
    expect(stored?.error).toBe("0 tablas reconocidas");
    expect(await db.grades.count()).toBe(0);
    expect(await db.scheduleBlocks.count()).toBe(0);
    expect(await db.subjects.toArray()).toEqual(subjectsBefore);
  });

  it("assigns credits from enrollment unless the student overrode them", async () => {
    const capture = readCapture("enrollment.json");
    const [table] = capture.tables;
    if (table === undefined) throw new Error("fixture without tables");
    const nameIndex = table.headers.indexOf("Asignatura");
    const creditsIndex = table.headers.indexOf("Créditos");
    const protectedId = slugify("Programación III");
    await patchSubject(db, protectedId, { credits: 9 }, "student");

    await importSacCapture(db, capture);

    for (const row of table.rows) {
      const id = slugify(row[nameIndex] ?? "");
      const subject = await db.subjects.get(id);
      if (subject === undefined) continue;
      if (id === protectedId) {
        expect(subject.credits).toBe(9);
      } else {
        expect(subject.credits).toBe(Number(row[creditsIndex]));
      }
    }
  });

  it("imports the schedule blocks and replaces the previous sac blocks", async () => {
    const capture = readCapture("schedule.json");
    await importSacCapture(db, capture);
    await importSacCapture(db, capture);
    const blocks = await db.scheduleBlocks.toArray();
    expect(blocks).toHaveLength(capture.tables[0]?.rows.length ?? -1);
    const monday = blocks.find((block) => block.day === 1);
    expect(monday?.subjectId).toBe(slugify("Cálculo integral"));
    expect(monday?.start).toBe("18:00");
    expect(blocks.some((block) => block.start === "08:00")).toBe(true);
  });

  it("creates the grade under the aliased subject after the name is associated", async () => {
    const capture = readCapture("grades.json");
    await importSacCapture(db, capture);
    const targetId = slugify("Infraestructura computacional");
    await setSetting(db, "subjectAliases", {
      [normalizeText("Electiva Deportiva")]: targetId,
    });
    await setSetting(db, "unmatchedSubjects", []);

    const run = await importSacCapture(db, capture);
    expect(run.counts.unmatched).toBe(0);
    const grade = (await db.grades.toArray()).find(
      (row) => row.subjectId === targetId,
    );
    expect(grade?.label).toBe("Parcial 1");
    expect(grade?.score).toBe(5);
    expect(await getSetting(db, "unmatchedSubjects")).toEqual([]);
  });
});
