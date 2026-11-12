import { describe, expect, it } from "vitest";
import { PENSUM_SEED_TEXT } from "@/src/data/pensum.seed";
import { createDb } from "@/src/db/db";
import { parsePensumSeed } from "@/src/domain/pensum";
import type { Subject } from "@/src/domain/schemas";

function byId(a: Subject, b: Subject): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

describe("pensum seed on populate", () => {
  it("seeds a new database once and never re-seeds a deleted subject", async () => {
    const name = `uniplan-test-${crypto.randomUUID()}`;
    const expected = parsePensumSeed(PENSUM_SEED_TEXT).sort(byId);
    const first = createDb(name);
    const stored = (await first.subjects.toArray()).sort(byId);
    expect(stored).toEqual(expected);

    const removed = expected[0];
    expect(removed).toBeDefined();
    if (removed === undefined) {
      return;
    }
    await first.subjects.delete(removed.id);
    first.close();

    const second = createDb(name);
    expect(await second.subjects.get(removed.id)).toBeUndefined();
    expect(await second.subjects.count()).toBe(expected.length - 1);
    await second.delete();
  });
});
