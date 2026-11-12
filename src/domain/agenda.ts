import { endOfDay, endOfWeek, format, startOfDay } from "date-fns";
import type { Item } from "@/src/domain/schemas";

export type AgendaGroups = {
  hoy: Item[];
  semana: Item[];
  despues: Item[];
  sinFecha: Item[];
  vencidas: Item[];
};

export type AgendaGroupKey = keyof AgendaGroups;

function compareItems(a: Item, b: Item): number {
  const dueA =
    a.dueAt === null ? Number.POSITIVE_INFINITY : Date.parse(a.dueAt);
  const dueB =
    b.dueAt === null ? Number.POSITIVE_INFINITY : Date.parse(b.dueAt);
  if (dueA !== dueB) {
    return dueA < dueB ? -1 : 1;
  }
  if (a.title === b.title) {
    return 0;
  }
  return a.title < b.title ? -1 : 1;
}

export function groupItems(items: readonly Item[], now: Date): AgendaGroups {
  const groups: AgendaGroups = {
    hoy: [],
    semana: [],
    despues: [],
    sinFecha: [],
    vencidas: [],
  };
  const todayStart = startOfDay(now).getTime();
  const todayEnd = endOfDay(now).getTime();
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).getTime();
  for (const item of items) {
    if (item.dueAt === null) {
      groups.sinFecha.push(item);
      continue;
    }
    const due = Date.parse(item.dueAt);
    if (due < todayStart) {
      if (!item.done) {
        groups.vencidas.push(item);
      }
    } else if (due <= todayEnd) {
      groups.hoy.push(item);
    } else if (due <= weekEnd) {
      groups.semana.push(item);
    } else {
      groups.despues.push(item);
    }
  }
  for (const list of Object.values(groups)) {
    list.sort(compareItems);
  }
  return groups;
}

// Agenda and calendar list things to do; acta documents only feed Notas.
export function agendaItems(items: readonly Item[]): Item[] {
  return items.filter((item) => !item.isActa);
}

export function localInputToIso(value: string): string | null {
  if (value.trim() === "") {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function isoToLocalInput(iso: string | null): string {
  if (iso === null) {
    return "";
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : format(date, "yyyy-MM-dd'T'HH:mm");
}
