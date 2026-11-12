import { parseDay, parseTime, type SacTableInput } from "@/src/domain/sac";

// Weekly grid of the SAC "Horario del estudiante" report (pacr42): an hours
// column plus one column per weekday; each day cell holds zero or more
// classes whose pieces arrive glued together, e.g.
// "Cod. 70101Prog. 6CÁLCULO INTEGRALGrupo. 01NSubGrupo. 03/08/26 - 23/11/26Aula. B-101 AULA6:00 pm-8:00 pm".

export type GridClass = {
  code: string;
  name: string;
  day: number;
  start: string;
  end: string;
  room: string;
};

const CLASS_START = /(?=Cod\.\s*\d)/i;
const CODE = /^Cod\.\s*(\d+)/i;
const PROGRAM = /^Prog\.\s*\d+/i;
const GROUP = /Grupo\./i;
const ROOM = /Aula\.\s*/i;
const TIME_RANGE =
  /(\d{1,2}:\d{2}\s*(?:[ap]\.?\s*m\.?)?)\s*-\s*(\d{1,2}:\d{2}\s*(?:[ap]\.?\s*m\.?)?)\s*$/i;
const MIN_DAY_COLUMNS = 3;

function dayColumns(headers: readonly string[]): Map<number, number> {
  const columns = new Map<number, number>();
  headers.forEach((header, index) => {
    const day = parseDay(header);
    if (day !== null && !columns.has(index)) {
      columns.set(index, day);
    }
  });
  return columns;
}

export function isScheduleGrid(table: SacTableInput): boolean {
  if (dayColumns(table.headers).size < MIN_DAY_COLUMNS) {
    return false;
  }
  return table.rows.some((row) => row.some((cell) => CLASS_START.test(cell)));
}

// Finds the trailing "start-end" range. When the room glues a digit onto the
// hour ("F6-2042:00 pm") the first try reads an impossible hour; then the
// leading digit is given back to the room.
function splitTime(
  text: string,
): { before: string; start: string; end: string } | null {
  const match = TIME_RANGE.exec(text);
  if (match === null) {
    return null;
  }
  let rawStart = match[1] ?? "";
  let before = text.slice(0, match.index);
  let start = parseTime(rawStart);
  if (start === null && /^\d{2}:/.test(rawStart)) {
    before += rawStart.slice(0, 1);
    rawStart = rawStart.slice(1);
    start = parseTime(rawStart);
  }
  const end = parseTime(match[2] ?? "");
  if (start === null || end === null) {
    return null;
  }
  return { before, start, end };
}

export function parseClassText(text: string, day: number): GridClass | null {
  const clean = text.replace(/\s+/g, " ").trim();
  const code = CODE.exec(clean);
  if (code === null) {
    return null;
  }
  let rest = clean.slice(code[0].length).trim();
  const program = PROGRAM.exec(rest);
  if (program !== null) {
    rest = rest.slice(program[0].length).trim();
  }
  const group = GROUP.exec(rest);
  const name = (group === null ? "" : rest.slice(0, group.index)).trim();
  if (name === "" || !/\p{L}/u.test(name)) {
    return null;
  }
  const time = splitTime(rest);
  if (time === null) {
    return null;
  }
  const room = ROOM.exec(time.before);
  return {
    code: code[1] ?? "",
    name,
    day,
    start: time.start,
    end: time.end,
    room:
      room === null
        ? ""
        : time.before.slice(room.index + room[0].length).trim(),
  };
}

export function parseScheduleGrid(table: SacTableInput): GridClass[] {
  const columns = dayColumns(table.headers);
  const classes: GridClass[] = [];
  const seen = new Set<string>();
  for (const row of table.rows) {
    for (const [index, day] of columns) {
      const cell = row[index] ?? "";
      for (const piece of cell.split(CLASS_START)) {
        const parsed = parseClassText(piece, day);
        if (parsed === null) {
          continue;
        }
        const key = [
          parsed.code,
          parsed.day,
          parsed.start,
          parsed.end,
          parsed.room,
        ].join("|");
        if (!seen.has(key)) {
          seen.add(key);
          classes.push(parsed);
        }
      }
    }
  }
  return classes;
}
