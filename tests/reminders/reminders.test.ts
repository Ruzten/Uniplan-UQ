import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { createDb, type UniplanDb } from "@/src/db/db";
import { addManualItem, setSetting } from "@/src/db/repo";
import type { Item } from "@/src/domain/schemas";
import {
  ensureReminderAlarm,
  REMINDER_ALARM,
  runReminderCheck,
  selectDueReminders,
} from "@/src/sync/reminders";

const NOW = new Date(2026, 10, 10, 8, 0);
const HOUR = 3_600_000;

function inHours(hours: number): string {
  return new Date(NOW.getTime() + hours * HOUR).toISOString();
}

function item(overrides: Partial<Item> = {}): Item {
  return {
    id: "item-1",
    type: "tarea",
    title: "Taller",
    subjectId: null,
    dueAt: inHours(20),
    weightPct: null,
    notes: "",
    done: false,
    links: [],
    isActa: false,
    source: "manual",
    externalId: null,
    overrides: [],
    hidden: false,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  };
}

describe("selectDueReminders", () => {
  it("picks the smallest reached lead for an item due in 20 hours", () => {
    const [reminder, ...rest] = selectDueReminders(
      [item()],
      new Set(),
      NOW,
      [24, 3],
    );
    expect(rest).toEqual([]);
    expect(reminder?.leadHours).toBe(24);
    expect(reminder?.key).toBe("item-1|24");
    expect(reminder?.keysToMark).toEqual(["item-1|24"]);
  });

  it("skips an already notified lead and fires the next one closer to the deadline", () => {
    const notified = new Set(["item-1|24"]);
    expect(selectDueReminders([item()], notified, NOW, [24, 3])).toEqual([]);
    const [soon] = selectDueReminders(
      [item({ dueAt: inHours(2) })],
      notified,
      NOW,
      [24, 3],
    );
    expect(soon?.leadHours).toBe(3);
    expect(soon?.key).toBe("item-1|3");
    expect(soon?.keysToMark).toEqual(["item-1|3", "item-1|24"]);
  });

  it("excludes done, hidden, undated and overdue items", () => {
    const items = [
      item({ id: "done", done: true }),
      item({ id: "hidden", hidden: true }),
      item({ id: "undated", dueAt: null }),
      item({ id: "overdue", dueAt: inHours(-1) }),
    ];
    expect(selectDueReminders(items, new Set(), NOW, [24, 3])).toEqual([]);
  });

  it("returns nothing when the deadline is beyond every lead", () => {
    expect(
      selectDueReminders(
        [item({ dueAt: inHours(48) })],
        new Set(),
        NOW,
        [24, 3],
      ),
    ).toEqual([]);
  });
});

describe("runReminderCheck", () => {
  let db: UniplanDb;

  beforeEach(async () => {
    db = createDb(`uniplan-test-${crypto.randomUUID()}`);
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  it("notifies once per item across two runs with the same clock", async () => {
    await setSetting(db, "reminderLeadHours", [24, 3]);
    const created = await addManualItem(db, {
      title: "Parcial 2",
      dueAt: inHours(20),
    });
    await addManualItem(db, { title: "Lejano", dueAt: inHours(100) });
    const notify = vi.fn(async () => undefined);

    await runReminderCheck(db, notify, NOW);
    await runReminderCheck(db, notify, NOW);

    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith({
      id: `${created.id}|24`,
      title: "Uniplan UQ",
      message: "Parcial 2 · vence en 20 h",
    });
    expect(await db.notified.get(`${created.id}|24`)).toBeDefined();
  });
});

describe("ensureReminderAlarm", () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it("keeps a single hourly alarm when called twice", async () => {
    await ensureReminderAlarm();
    await ensureReminderAlarm();
    const alarms = await fakeBrowser.alarms.getAll();
    expect(alarms).toHaveLength(1);
    expect(alarms[0]?.name).toBe(REMINDER_ALARM);
    expect(alarms[0]?.periodInMinutes).toBe(60);
  });
});
