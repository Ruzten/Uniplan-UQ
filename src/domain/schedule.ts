import type { ScheduleBlock } from "@/src/domain/schemas";

export const DAY_NAMES: readonly string[] = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

export type ScheduleEntry = {
  id: string;
  start: string;
  end: string;
  name: string;
  room: string;
};

export type ScheduleDay = {
  day: number;
  title: string;
  entries: ScheduleEntry[];
};

// Groups the blocks by weekday (1 = lunes), only days that have classes,
// sorted by day and then by start time. The subject's pensum name is used when
// the block is associated; otherwise the name the SAC printed.
export function groupScheduleByDay(
  blocks: readonly ScheduleBlock[],
  subjectNames: ReadonlyMap<string, string>,
): ScheduleDay[] {
  const sorted = [...blocks].sort(
    (a, b) =>
      a.day - b.day ||
      a.start.localeCompare(b.start) ||
      a.end.localeCompare(b.end),
  );
  const days: ScheduleDay[] = [];
  for (const block of sorted) {
    let current = days[days.length - 1];
    if (current === undefined || current.day !== block.day) {
      current = {
        day: block.day,
        title: DAY_NAMES[block.day - 1] ?? `Día ${block.day}`,
        entries: [],
      };
      days.push(current);
    }
    const name =
      (block.subjectId === null
        ? undefined
        : subjectNames.get(block.subjectId)) ?? block.rawSubjectName;
    current.entries.push({
      id: block.id,
      start: block.start,
      end: block.end,
      name,
      room: block.room,
    });
  }
  return days;
}

export function formatScheduleEntry(entry: ScheduleEntry): string {
  const parts = [`${entry.start}–${entry.end}`, entry.name];
  if (entry.room !== "") {
    parts.push(entry.room);
  }
  return parts.join(" · ");
}
