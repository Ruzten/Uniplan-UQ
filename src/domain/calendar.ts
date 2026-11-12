import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { Item, ItemType } from "@/src/domain/schemas";

const WEEK_OPTIONS = { weekStartsOn: 1 } as const;

export function monthMatrix(year: number, monthIndex: number): Date[][] {
  const first = startOfMonth(new Date(year, monthIndex, 1));
  const last = endOfWeek(endOfMonth(first), WEEK_OPTIONS);
  const weeks: Date[][] = [];
  let cursor = startOfWeek(first, WEEK_OPTIONS);
  while (cursor <= last) {
    const week: Date[] = [];
    for (let day = 0; day < 7; day += 1) {
      week.push(cursor);
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export function dayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function itemsByDay(items: readonly Item[]): Map<string, Item[]> {
  const byDay = new Map<string, Item[]>();
  for (const item of items) {
    if (item.dueAt === null) {
      continue;
    }
    const key = dayKey(new Date(item.dueAt));
    const list = byDay.get(key);
    if (list === undefined) {
      byDay.set(key, [item]);
    } else {
      list.push(item);
    }
  }
  return byDay;
}

export type ItemFilters = {
  subjectId: string | "all";
  type: ItemType | "all";
};

export function filterItems(
  items: readonly Item[],
  { subjectId, type }: ItemFilters,
): Item[] {
  return items.filter(
    (item) =>
      (subjectId === "all" || item.subjectId === subjectId) &&
      (type === "all" || item.type === type),
  );
}
