import type { HeaderSynonyms } from "@/src/domain/schemas";
import { normalizeText } from "@/src/domain/text";

export type SacTableKind = "schedule" | "grades" | "enrollment" | "unknown";

export type SacColumnKey = Exclude<keyof HeaderSynonyms, "partialGradePattern">;

export type SacColumns = Partial<Record<SacColumnKey, number>> & {
  partials: number[];
};

export type SacTableInput = { headers: string[]; rows: string[][] };

export type ClassifiedTable = { kind: SacTableKind; columns: SacColumns };

const COLUMN_KEYS: readonly SacColumnKey[] = [
  "subjectName",
  "subjectCode",
  "credits",
  "finalGrade",
  "group",
  "day",
  "start",
  "end",
  "room",
  "period",
];

function safePattern(source: string): RegExp | null {
  try {
    return new RegExp(source);
  } catch {
    return null;
  }
}

// Header text compared without accents, case or abbreviation dots, so "Cred."
// matches the synonym "cred".
function headerKey(text: string): string {
  return normalizeText(text.replace(/\./g, " "));
}

// The SAC detail table has one header ("Asignatura") spanning two cells (code
// and name): every row then has one more cell than the headers. When that
// happens and each row starts with a numeric code followed by text, a code
// header is inserted so the remaining headers line up with their cells.
export function alignSpannedHeaders(table: SacTableInput): SacTableInput {
  const width = table.headers.length;
  if (width === 0 || table.rows.length === 0) {
    return table;
  }
  const spanned = table.rows.every(
    (row) =>
      row.length === width + 1 &&
      /^\d+$/.test((row[0] ?? "").trim()) &&
      /\p{L}/u.test(row[1] ?? ""),
  );
  return spanned ? { ...table, headers: ["Cód.", ...table.headers] } : table;
}

export function classifyTable(
  table: SacTableInput,
  synonyms: HeaderSynonyms,
): ClassifiedTable {
  const columns: SacColumns = { partials: [] };
  const partialPattern = safePattern(synonyms.partialGradePattern);
  table.headers.forEach((header, index) => {
    const normalized = headerKey(header);
    if (normalized === "") {
      return;
    }
    for (const key of COLUMN_KEYS) {
      const list = synonyms[key].map(headerKey);
      if (list.includes(normalized)) {
        if (columns[key] === undefined) {
          columns[key] = index;
        }
        return;
      }
    }
    if (partialPattern?.test(normalized)) {
      columns.partials.push(index);
    }
  });
  const hasSubject = columns.subjectName !== undefined;
  let kind: SacTableKind = "unknown";
  if (hasSubject && columns.day !== undefined && columns.start !== undefined) {
    kind = "schedule";
  } else if (
    hasSubject &&
    (columns.finalGrade !== undefined || columns.partials.length > 0)
  ) {
    kind = "grades";
  } else if (hasSubject && columns.credits !== undefined) {
    kind = "enrollment";
  }
  return { kind, columns };
}

// Drops session path parameters (";jsessionid=..."), the query string and the
// hash, so a captured URL never carries a session token.
export function sanitizeSacUrl(url: string): string {
  const [withoutHash = ""] = url.split("#");
  const [withoutQuery = ""] = withoutHash.split("?");
  return withoutQuery.replace(/;jsessionid=[^/;?#]*/gi, "");
}

export function parseScore(text: string): number | null {
  const trimmed = text.trim().replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return null;
  }
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

const DAYS = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
] as const;

export function parseDay(text: string): number | null {
  const normalized = normalizeText(text).replace(/[^a-z]/g, "");
  if (normalized === "") {
    return null;
  }
  const index = DAYS.findIndex(
    (day) => day === normalized || day.slice(0, 3) === normalized,
  );
  return index === -1 ? null : index + 1;
}

export function parseTime(text: string): string | null {
  const normalized = normalizeText(text).replace(/\./g, "");
  const match = /^(\d{1,2}):(\d{2})\s*(am|pm)?$/.exec(normalized);
  if (match === null) {
    return null;
  }
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3];
  if (minutes > 59) {
    return null;
  }
  if (meridiem !== undefined) {
    if (hours < 1 || hours > 12) {
      return null;
    }
    if (meridiem === "am") {
      hours = hours === 12 ? 0 : hours;
    } else {
      hours = hours === 12 ? 12 : hours + 12;
    }
  } else if (hours > 23) {
    return null;
  }
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
