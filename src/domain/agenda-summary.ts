import { differenceInCalendarDays, startOfDay } from "date-fns";
import { groupItems } from "@/src/domain/agenda";
import type { Item } from "@/src/domain/schemas";

export type AgendaSummary = {
  today: number;
  week: number;
  overdue: number;
  done: number;
  next: Item | null;
};

export type DueTone = "overdue" | "today" | "soon" | "later" | "none";

export function agendaSummary(
  items: readonly Item[],
  now: Date,
): AgendaSummary {
  const groups = groupItems(items, now);
  const pending = (list: readonly Item[]) =>
    list.filter((item) => !item.done).length;
  const nowMs = now.getTime();
  let next: Item | null = null;
  for (const item of items) {
    if (item.done || item.dueAt === null) continue;
    const due = Date.parse(item.dueAt);
    if (due < nowMs) continue;
    if (next === null || due < Date.parse(next.dueAt ?? "")) {
      next = item;
    }
  }
  return {
    today: pending(groups.hoy),
    week: pending(groups.hoy) + pending(groups.semana),
    overdue: groups.vencidas.length,
    done: items.filter((item) => item.done).length,
    next,
  };
}

export function greetingFor(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function dueTone(item: Item, now: Date): DueTone {
  if (item.dueAt === null) return "none";
  const due = new Date(item.dueAt);
  const days = differenceInCalendarDays(startOfDay(due), startOfDay(now));
  if (due.getTime() < startOfDay(now).getTime()) {
    return item.done ? "later" : "overdue";
  }
  if (days <= 0) return "today";
  if (days <= 3) return "soon";
  return "later";
}

export function daysUntilLabel(dueAt: string, now: Date): string {
  const days = differenceInCalendarDays(new Date(dueAt), now);
  if (days <= 0) return "Hoy";
  if (days === 1) return "Mañana";
  return `En ${days} días`;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function summaryMessage(summary: AgendaSummary): string {
  const week =
    summary.week === 0
      ? "No tienes pendientes esta semana"
      : `Tienes ${plural(summary.week, "pendiente", "pendientes")} esta semana`;
  if (summary.overdue === 0) return `${week}.`;
  return `${week} y ${plural(summary.overdue, "vencido", "vencidos")}.`;
}
