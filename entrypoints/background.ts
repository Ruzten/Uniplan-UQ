import { db } from "@/src/db/db";
import { registerRouter } from "@/src/sync/messages";
import {
  ensureReminderAlarm,
  notifyWithBrowser,
  REMINDER_ALARM,
  runReminderCheck,
} from "@/src/sync/reminders";
import { importSacCapture } from "@/src/sync/sac-import";

export default defineBackground(() => {
  registerRouter({
    ping: async () => "pong",
    "sac/import": (message) => importSacCapture(db, message.payload),
    "reminders/check": () =>
      runReminderCheck(db, notifyWithBrowser, new Date()),
  });
  browser.runtime.onInstalled.addListener(() => ensureReminderAlarm());
  browser.runtime.onStartup.addListener(() => ensureReminderAlarm());
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === REMINDER_ALARM) {
      void runReminderCheck(db, notifyWithBrowser, new Date());
    }
  });
  browser.action.onClicked.addListener(async () => {
    const url = browser.runtime.getURL("/dashboard.html");
    const tabs = await browser.tabs.query({});
    const existing = tabs.find((tab) => tab.url?.startsWith(url));
    if (existing?.id !== undefined) {
      await browser.tabs.update(existing.id, { active: true });
      return;
    }
    await browser.tabs.create({ url });
  });
});
