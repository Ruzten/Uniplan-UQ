import { browser } from "wxt/browser";
import type { UniplanDb } from "@/src/db/db";
import { getSetting } from "@/src/db/repo";
import type { Item } from "@/src/domain/schemas";

export const REMINDER_ALARM = "uniplan-reminders";

export const NOTIFICATION_ICON =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const HOUR_MS = 3_600_000;

export type DueReminder = {
  item: Item;
  leadHours: number;
  key: string;
  keysToMark: string[];
};

export type ReminderNotification = {
  id: string;
  title: string;
  message: string;
};

export async function ensureReminderAlarm(): Promise<void> {
  const existing = await browser.alarms.get(REMINDER_ALARM);
  if (existing === undefined || existing === null) {
    await browser.alarms.create(REMINDER_ALARM, { periodInMinutes: 60 });
  }
}

export function reminderKey(itemId: string, leadHours: number): string {
  return `${itemId}|${leadHours}`;
}

export function selectDueReminders(
  items: readonly Item[],
  notifiedKeys: ReadonlySet<string>,
  now: Date,
  leadHours: readonly number[],
): DueReminder[] {
  const leads = [...new Set(leadHours)]
    .filter((lead) => Number.isFinite(lead) && lead > 0)
    .sort((a, b) => a - b);
  const reminders: DueReminder[] = [];
  for (const item of items) {
    if (item.hidden || item.done || item.dueAt === null) {
      continue;
    }
    const remaining = new Date(item.dueAt).getTime() - now.getTime();
    if (!Number.isFinite(remaining) || remaining <= 0) {
      continue;
    }
    const reached = leads.filter((lead) => remaining <= lead * HOUR_MS);
    const smallest = reached[0];
    if (smallest === undefined) {
      continue;
    }
    const key = reminderKey(item.id, smallest);
    if (notifiedKeys.has(key)) {
      continue;
    }
    reminders.push({
      item,
      leadHours: smallest,
      key,
      keysToMark: reached.map((lead) => reminderKey(item.id, lead)),
    });
  }
  return reminders;
}

export function reminderMessage(item: Item, now: Date): string {
  const dueAt =
    item.dueAt === null ? now.getTime() : new Date(item.dueAt).getTime();
  const hours = Math.max(1, Math.round((dueAt - now.getTime()) / HOUR_MS));
  return `${item.title} · vence en ${hours} h`;
}

export async function runReminderCheck(
  db: UniplanDb,
  notify: (notification: ReminderNotification) => Promise<unknown>,
  now: Date,
): Promise<number> {
  const items = await db.items.toArray();
  const notified = new Set((await db.notified.toArray()).map((row) => row.key));
  const leadHours = await getSetting(db, "reminderLeadHours");
  const due = selectDueReminders(items, notified, now, leadHours);
  for (const reminder of due) {
    await notify({
      id: reminder.key,
      title: "Uniplan UQ",
      message: reminderMessage(reminder.item, now),
    });
    await db.notified.bulkPut(reminder.keysToMark.map((key) => ({ key })));
  }
  return due.length;
}

export async function notifyWithBrowser(
  notification: ReminderNotification,
): Promise<void> {
  await browser.notifications.create(notification.id, {
    type: "basic",
    iconUrl: NOTIFICATION_ICON,
    title: notification.title,
    message: notification.message,
  });
}
