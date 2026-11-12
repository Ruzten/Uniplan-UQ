import { describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { createDb } from "@/src/db/db";
import { addManualItem, setSetting } from "@/src/db/repo";
import { TOKEN_KEY } from "@/src/sync/classroom-client";
import { eraseAllData } from "@/src/sync/reset";

describe("eraseAllData", () => {
  it("removes every record and the Classroom token, and reseeds on reopen", async () => {
    const name = `uniplan-test-${crypto.randomUUID()}`;
    const db = createDb(name);
    await addManualItem(db, { title: "Taller" });
    await setSetting(db, "careerName", "Química");
    await db.subjects.clear();
    await fakeBrowser.storage.session.set({
      [TOKEN_KEY]: { accessToken: "x", expiresAt: Date.now() + 60_000 },
    });

    await eraseAllData(db);

    expect(
      (await fakeBrowser.storage.session.get(TOKEN_KEY))[TOKEN_KEY],
    ).toBeUndefined();
    const fresh = createDb(name);
    expect(await fresh.items.count()).toBe(0);
    expect(await fresh.settings.count()).toBe(0);
    expect(await fresh.subjects.count()).toBeGreaterThan(0);
    const statuses = new Set(
      (await fresh.subjects.toArray()).map((s) => s.status),
    );
    expect([...statuses]).toEqual(["pendiente"]);
    await fresh.delete();
  });
});
