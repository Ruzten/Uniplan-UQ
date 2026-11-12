import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, type UniplanDb } from "@/src/db/db";
import { addManualItem } from "@/src/db/repo";
import {
  editRecord,
  type IncomingItem,
  patchSubject,
  removeRecord,
  runSync,
  upsertSynced,
} from "@/src/sync/merge";

function incomingItem(overrides: Partial<IncomingItem> = {}): IncomingItem {
  return {
    externalId: "cw|100|1",
    type: "tarea",
    title: "Taller 1",
    subjectId: null,
    dueAt: new Date(2026, 2, 10, 23, 59).toISOString(),
    weightPct: null,
    notes: "",
    done: false,
    links: [],
    isActa: false,
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

describe("upsertSynced", () => {
  it("creates an unknown record with empty overrides, visible, counted as created", async () => {
    const counts = await upsertSynced(db, "items", "classroom", [
      incomingItem(),
    ]);
    expect(counts.created).toBe(1);
    const rows = await db.items.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.overrides).toEqual([]);
    expect(rows[0]?.hidden).toBe(false);
    expect(rows[0]?.source).toBe("classroom");
    expect(rows[0]?.externalId).toBe("cw|100|1");
  });

  it("is idempotent when the same batch arrives twice", async () => {
    const batch = [
      incomingItem(),
      incomingItem({ externalId: "cw|100|2", title: "Quiz 1", type: "quiz" }),
    ];
    await upsertSynced(db, "items", "classroom", batch);
    const before = await db.items.count();
    const second = await upsertSynced(db, "items", "classroom", batch);
    expect(await db.items.count()).toBe(before);
    expect(second.created).toBe(0);
    expect(second.updated).toBe(0);
  });

  it("keeps a student-edited title and still updates other fields", async () => {
    await upsertSynced(db, "items", "classroom", [incomingItem()]);
    const [row] = await db.items.toArray();
    expect(row).toBeDefined();
    if (row === undefined) {
      return;
    }
    await editRecord(db, "items", row.id, { title: "Mi título" });
    const newDue = new Date(2026, 2, 12, 18, 0).toISOString();
    const counts = await upsertSynced(db, "items", "classroom", [
      incomingItem({ title: "Título del curso", dueAt: newDue }),
    ]);
    expect(counts.updated).toBe(1);
    const stored = await db.items.get(row.id);
    expect(stored?.title).toBe("Mi título");
    expect(stored?.overrides).toContain("title");
    expect(stored?.dueAt).toBe(newDue);
  });

  it("does not revive or duplicate a record the student removed", async () => {
    await upsertSynced(db, "items", "classroom", [incomingItem()]);
    const [row] = await db.items.toArray();
    expect(row).toBeDefined();
    if (row === undefined) {
      return;
    }
    await removeRecord(db, "items", row.id);
    const counts = await upsertSynced(db, "items", "classroom", [
      incomingItem({ title: "Otro título" }),
    ]);
    expect(counts.created).toBe(0);
    expect(counts.skipped).toBe(1);
    const rows = await db.items.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.hidden).toBe(true);
    expect(rows[0]?.title).toBe("Taller 1");
  });
});

describe("removeRecord", () => {
  it("deletes a manual record", async () => {
    const item = await addManualItem(db, { title: "Lectura" });
    await removeRecord(db, "items", item.id);
    expect(await db.items.get(item.id)).toBeUndefined();
  });
});

describe("patchSubject", () => {
  it("lets a sync skip the keys the student edited", async () => {
    const [subject] = await db.subjects.toArray();
    expect(subject).toBeDefined();
    if (subject === undefined) {
      return;
    }
    await patchSubject(db, subject.id, { credits: 4 }, "student");
    await patchSubject(db, subject.id, { credits: 2, finalGrade: 4.1 }, "sync");
    const stored = await db.subjects.get(subject.id);
    expect(stored?.credits).toBe(4);
    expect(stored?.finalGrade).toBe(4.1);
    expect(stored?.overrides).toEqual(["credits"]);
  });
});

describe("runSync", () => {
  it("records an error run when work throws and deletes nothing", async () => {
    await upsertSynced(db, "items", "classroom", [incomingItem()]);
    const itemsBefore = await db.items.count();
    const subjectsBefore = await db.subjects.count();
    const run = await runSync(db, "classroom", async () => {
      throw new Error("fallo simulado");
    });
    expect(run.status).toBe("error");
    expect(run.error).toBe("fallo simulado");
    expect(run.counts).toEqual({
      created: 0,
      updated: 0,
      skipped: 0,
      unmatched: 0,
    });
    const stored = await db.syncRuns.get(run.id);
    expect(stored?.status).toBe("error");
    expect(stored?.error).toBe("fallo simulado");
    expect(await db.items.count()).toBe(itemsBefore);
    expect(await db.subjects.count()).toBe(subjectsBefore);
  });

  it("marks a run with a note as partial", async () => {
    const run = await runSync(db, "sac", async () => ({
      counts: { created: 1, updated: 0, skipped: 0, unmatched: 0 },
      note: "0 tablas reconocidas",
    }));
    expect(run.status).toBe("partial");
    expect(run.error).toBe("0 tablas reconocidas");
    expect(run.finishedAt).not.toBeNull();
  });
});
