import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, type UniplanDb } from "@/src/db/db";
import {
  addManualGrade,
  addManualItem,
  getSetting,
  listVisibleGrades,
  listVisibleItems,
  putSubject,
  setSetting,
} from "@/src/db/repo";
import { DEFAULT_SETTINGS, type Subject } from "@/src/domain/schemas";

const SUBJECT: Subject = {
  id: "materia-de-prueba",
  name: "Materia de prueba",
  semester: 1,
  credits: null,
  prereqIds: [],
  kind: "obligatoria",
  status: "cursando",
  finalGrade: null,
  overrides: [],
};

let db: UniplanDb;

beforeEach(() => {
  db = createDb(`uniplan-test-${crypto.randomUUID()}`);
});

afterEach(async () => {
  await db.delete();
});

describe("settings", () => {
  it("returns the default for a key never written", async () => {
    const cap = await getSetting(db, "courseCap");
    const scale = await getSetting(db, "gradeScale");
    expect(cap).toBe(DEFAULT_SETTINGS.courseCap);
    expect(scale).toEqual(DEFAULT_SETTINGS.gradeScale);
  });

  it("returns the stored value after setSetting", async () => {
    await setSetting(db, "activeView", "pensum");
    expect(await getSetting(db, "activeView")).toBe("pensum");
  });
});

describe("items", () => {
  it("creates a manual, visible, not-done item", async () => {
    const item = await addManualItem(db, { title: "  Taller 1  " });
    expect(item.title).toBe("Taller 1");
    expect(item.source).toBe("manual");
    expect(item.hidden).toBe(false);
    expect(item.done).toBe(false);
    expect(item.id.length).toBeGreaterThan(0);
    const visible = await listVisibleItems(db);
    expect(visible.map((row) => row.id)).toEqual([item.id]);
  });

  it("rejects a blank title and writes nothing", async () => {
    await expect(addManualItem(db, { title: "   " })).rejects.toThrow();
    expect(await db.items.count()).toBe(0);
  });

  it("omits hidden items from listVisibleItems", async () => {
    const item = await addManualItem(db, { title: "Quiz 2" });
    await db.items.update(item.id, { hidden: true });
    expect(await listVisibleItems(db)).toEqual([]);
    expect(await db.items.count()).toBe(1);
  });
});

describe("subjects and grades", () => {
  it("stores a valid subject and rejects an invalid one", async () => {
    await putSubject(db, SUBJECT);
    const stored = await db.subjects.get(SUBJECT.id);
    expect(stored?.name).toBe(SUBJECT.name);
    const invalid = { ...SUBJECT, id: "materia-invalida", semester: 12 };
    await expect(putSubject(db, invalid)).rejects.toThrow();
    expect(await db.subjects.get("materia-invalida")).toBeUndefined();
  });

  it("lists only the visible grades of one subject", async () => {
    const base = { label: "Parcial 1", score: 4, maxScore: 5 };
    const kept = await addManualGrade(db, { ...base, subjectId: SUBJECT.id });
    const gone = await addManualGrade(db, { ...base, subjectId: SUBJECT.id });
    await addManualGrade(db, { ...base, subjectId: "otra-materia" });
    await db.grades.update(gone.id, { hidden: true });
    const grades = await listVisibleGrades(db, SUBJECT.id);
    expect(grades.map((row) => row.id)).toEqual([kept.id]);
  });
});
