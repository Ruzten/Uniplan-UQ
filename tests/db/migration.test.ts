import Dexie from "dexie";
import { describe, expect, it } from "vitest";
import { applySchema, createDb, TABLE_NAMES } from "@/src/db/db";
import { addManualItem } from "@/src/db/repo";

function uniqueName(): string {
  return `uniplan-test-${crypto.randomUUID()}`;
}

describe("schema v1", () => {
  it("exposes exactly the tables listed in TABLE_NAMES", async () => {
    const db = createDb(uniqueName());
    await db.open();
    const names = db.tables.map((table) => table.name).sort();
    expect(names).toEqual([...TABLE_NAMES].sort());
    expect(db.verno).toBe(1);
    await db.delete();
  });

  it("keeps a row after close and reopen", async () => {
    const name = uniqueName();
    const first = createDb(name);
    const item = await addManualItem(first, { title: "Taller 1" });
    first.close();
    const second = createDb(name);
    const stored = await second.items.get(item.id);
    expect(stored?.title).toBe("Taller 1");
    await second.delete();
  });

  it("keeps v1 rows when a later version is layered on top", async () => {
    const name = uniqueName();
    const first = createDb(name);
    const item = await addManualItem(first, { title: "Parcial 1" });
    first.close();
    const next = new Dexie(name);
    applySchema(next);
    next.version(2).stores({
      items: "id, subjectId, dueAt, type, [source+externalId]",
    });
    await next.open();
    const stored = await next.table("items").get(item.id);
    expect(stored?.title).toBe("Parcial 1");
    expect(next.verno).toBe(2);
    await next.delete();
  });
});
