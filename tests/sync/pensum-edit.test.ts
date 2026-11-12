import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, type UniplanDb } from "@/src/db/db";
import { addManualItem, getSetting, setSetting } from "@/src/db/repo";
import { parsePensumText } from "@/src/domain/pensum-text";
import type { Subject } from "@/src/domain/schemas";
import {
  addSubject,
  removeSubject,
  replacePensum,
  resetProgress,
} from "@/src/sync/merge";

function subject(id: string, overrides: Partial<Subject> = {}): Subject {
  return {
    id,
    name: id,
    semester: 1,
    credits: null,
    prereqIds: [],
    kind: "obligatoria",
    status: "pendiente",
    finalGrade: null,
    overrides: [],
    ...overrides,
  };
}

let db: UniplanDb;

beforeEach(() => {
  db = createDb(`uniplan-test-${crypto.randomUUID()}`);
});

afterEach(async () => {
  await db.delete();
});

describe("addSubject", () => {
  it("adds a new subject and refuses an id that already exists", async () => {
    expect(await addSubject(db, subject("biologia"))).toBe(true);
    expect(
      await addSubject(db, subject("biologia", { name: "Otra", semester: 3 })),
    ).toBe(false);
    expect((await db.subjects.get("biologia"))?.name).toBe("biologia");
  });
});

describe("removeSubject", () => {
  it("deletes the subject and unlinks it from its dependents", async () => {
    await replacePensum(db, [
      subject("a"),
      subject("b", { prereqIds: ["a"] }),
      subject("c", { prereqIds: ["a", "b"] }),
    ]);
    await removeSubject(db, "a");
    expect(await db.subjects.get("a")).toBeUndefined();
    expect((await db.subjects.get("b"))?.prereqIds).toEqual([]);
    expect((await db.subjects.get("c"))?.prereqIds).toEqual(["b"]);
  });
});

describe("replacePensum", () => {
  it("swaps every subject, clears SAC aliases and keeps agenda items", async () => {
    await db.open();
    expect(await db.subjects.count()).toBeGreaterThan(0);
    await setSetting(db, "subjectAliases", { "calculo i": "calculo-integral" });
    await setSetting(db, "unmatchedSubjects", ["Calculo I"]);
    const item = await addManualItem(db, { title: "Taller" });

    const { subjects } = parsePensumText(
      "1 | Química |\n2 | Bioquímica | | Química\n",
    );
    await replacePensum(db, subjects);

    expect((await db.subjects.toArray()).map((s) => s.id).sort()).toEqual([
      "bioquimica",
      "quimica",
    ]);
    expect(await getSetting(db, "subjectAliases")).toEqual({});
    expect(await getSetting(db, "unmatchedSubjects")).toEqual([]);
    expect(await getSetting(db, "pensumReviewed")).toBe(true);
    expect(await db.items.get(item.id)).toBeDefined();
  });

  it("accepts an empty pensum", async () => {
    await replacePensum(db, []);
    expect(await db.subjects.count()).toBe(0);
  });
});

describe("resetProgress", () => {
  it("keeps every subject but clears status, final grade and overrides", async () => {
    await replacePensum(db, [
      subject("a", {
        status: "aprobada",
        finalGrade: 4.2,
        overrides: ["status"],
      }),
      subject("b", { status: "cursando", prereqIds: ["a"] }),
    ]);
    await resetProgress(db);
    const rows = await db.subjects.toArray();
    expect(rows.map((row) => row.id).sort()).toEqual(["a", "b"]);
    for (const row of rows) {
      expect(row).toMatchObject({
        status: "pendiente",
        finalGrade: null,
        overrides: [],
      });
    }
    expect((await db.subjects.get("b"))?.prereqIds).toEqual(["a"]);
  });
});
