import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, type UniplanDb } from "@/src/db/db";
import { addManualGrade, addManualItem, setSetting } from "@/src/db/repo";
import {
  daysSinceBackup,
  exportBackup,
  importBackup,
} from "@/src/domain/backup";
import { slugify } from "@/src/domain/text";
import { runSync } from "@/src/sync/merge";

const TABLES = [
  "subjects",
  "items",
  "grades",
  "scheduleBlocks",
  "settings",
  "syncRuns",
  "notified",
] as const;

type Snapshot = Record<(typeof TABLES)[number], unknown[]>;

function byJson(a: unknown, b: unknown): number {
  const left = JSON.stringify(a);
  const right = JSON.stringify(b);
  return left < right ? -1 : left > right ? 1 : 0;
}

async function snapshot(db: UniplanDb): Promise<Snapshot> {
  const result = {} as Snapshot;
  for (const name of TABLES) {
    const rows = (await db.table(name).toArray()) as unknown[];
    result[name] = rows.sort(byJson);
  }
  return result;
}

const opened: UniplanDb[] = [];

async function freshDb(): Promise<UniplanDb> {
  const db = createDb(`uniplan-test-${crypto.randomUUID()}`);
  await db.open();
  opened.push(db);
  return db;
}

async function seedData(db: UniplanDb): Promise<void> {
  const subjectId = slugify("Cálculo integral");
  await addManualItem(db, { title: "Entrega proyecto" });
  await addManualGrade(db, {
    subjectId,
    label: "Parcial 1",
    score: 4,
    maxScore: 5,
  });
  await db.grades.add({
    id: crypto.randomUUID(),
    subjectId,
    label: "Parcial 2",
    score: null,
    maxScore: 5,
    weightPct: 25,
    source: "sac",
    externalId: "sac|report|70101|parcial 2",
    overrides: [],
    hidden: false,
    updatedAt: new Date(2026, 10, 10, 9).toISOString(),
  });
  await setSetting(db, "courseCap", 3);
  await db.scheduleBlocks.add({
    id: crypto.randomUUID(),
    subjectId,
    rawSubjectName: "Cálculo integral",
    day: 1,
    start: "18:00",
    end: "20:00",
    room: "B-201",
    source: "sac",
  });
  await db.notified.add({ key: "x|24" });
  await runSync(db, "sac", async () => ({
    counts: { created: 0, updated: 0, skipped: 1, unmatched: 0 },
  }));
}

afterEach(async () => {
  while (opened.length > 0) {
    await opened.pop()?.delete();
  }
});

describe("backup round trip", () => {
  let source: UniplanDb;

  beforeEach(async () => {
    source = await freshDb();
    await seedData(source);
  });

  it("restores every table with the same rows on another database", async () => {
    const backup = await exportBackup(source, new Date(2026, 10, 10, 9));
    const target = await freshDb();
    await addManualItem(target, { title: "Se reemplaza" });
    const result = await importBackup(
      target,
      JSON.parse(JSON.stringify(backup)),
    );
    expect(result).toEqual({ ok: true, data: null });
    expect(await snapshot(target)).toEqual(await snapshot(source));
  });

  it("rejects invalid input and a wrong schemaVersion without touching any table", async () => {
    const before = await snapshot(source);
    const backup = await exportBackup(source, new Date(2026, 10, 10, 9));
    const candidates: unknown[] = [
      null,
      "texto",
      { schemaVersion: 1 },
      { ...backup, schemaVersion: 2 },
      { ...backup, tables: { ...backup.tables, items: [{ id: "" }] } },
    ];
    for (const raw of candidates) {
      const result = await importBackup(source, raw);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("invalid_backup");
        expect(typeof result.error.message).toBe("string");
      }
    }
    expect(await snapshot(source)).toEqual(before);
  });
});

describe("daysSinceBackup", () => {
  it("returns whole days or null", () => {
    const now = new Date(2026, 10, 10, 9);
    expect(daysSinceBackup(null, now)).toBeNull();
    expect(daysSinceBackup(new Date(2026, 10, 2, 8).toISOString(), now)).toBe(
      8,
    );
    expect(daysSinceBackup(new Date(2026, 10, 10, 8).toISOString(), now)).toBe(
      0,
    );
  });
});
