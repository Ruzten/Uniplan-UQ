import { z } from "zod";
import type { Grade, Item, ItemType } from "@/src/domain/schemas";
import { normalizeText, slugify } from "@/src/domain/text";

export const MOODLE_ORIGIN = "https://aulasvirtuales.uniquindio.edu.co";

export const moodleCourseSchema = z.object({
  id: z.number(),
  fullname: z.string().min(1),
});
export type MoodleCourse = z.infer<typeof moodleCourseSchema>;

export const moodleEventSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  modulename: z.string().optional(),
  timesort: z.number(),
  url: z.string().optional(),
  course: z.object({ id: z.number() }).optional(),
});
export type MoodleEvent = z.infer<typeof moodleEventSchema>;

// One row of the user grade report, as text straight from its cells.
export type MoodleGradeRow = {
  name: string;
  weight: string;
  grade: string;
  range: string;
};

export type IncomingMoodleItem = Omit<
  Item,
  "id" | "source" | "overrides" | "hidden" | "createdAt" | "updatedAt"
> & { externalId: string };

export type IncomingMoodleGrade = Omit<
  Grade,
  "id" | "source" | "overrides" | "hidden" | "updatedAt"
> & { externalId: string };

export function sesskeyFromHtml(html: string): string | null {
  return /"sesskey":"([A-Za-z0-9]+)"/.exec(html)?.[1] ?? null;
}

export function isMoodleLoginUrl(url: string): boolean {
  return url.includes("/login/");
}

// "Vencimiento de PROYECTO FINAL" → "PROYECTO FINAL"; "Taller 2 vence" → "Taller 2".
export function moodleEventTitle(name: string): string {
  const cleaned = name
    .replace(/^(vencimiento|cierre|apertura|entrega)\s+de\s+/i, "")
    .replace(/\s+(vence|cierra|se cierra|abre|se abre)$/i, "")
    .trim();
  return cleaned === "" ? name.trim() : cleaned;
}

function moodleItemType(
  title: string,
  modulename: string | undefined,
): ItemType {
  if (normalizeText(title).includes("parcial")) return "parcial";
  if (modulename === "quiz") return "quiz";
  return "tarea";
}

export function mapMoodleEvent(
  event: MoodleEvent,
  subjectId: string | null,
): IncomingMoodleItem {
  const title = moodleEventTitle(event.name);
  const url = event.url?.startsWith(`${MOODLE_ORIGIN}/`) ? event.url : null;
  return {
    externalId: `md|${event.course?.id ?? 0}|${event.id}`,
    type: moodleItemType(title, event.modulename),
    title,
    subjectId,
    dueAt: new Date(event.timesort * 1000).toISOString(),
    weightPct: null,
    notes: "",
    done: false,
    links: url === null ? [] : [{ title: "Abrir en Aulas Virtuales", url }],
    isActa: false,
  };
}

// "4,8 Acciones…" → 4.8; "-" or empty → null.
export function moodleNumber(text: string): number | null {
  const match = /-?\d+(?:[.,]\d+)?/.exec(text.trim());
  if (match === null) return null;
  const value = Number(match[0].replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

// "0–5" or "0,00-100,00" → the upper bound.
export function moodleRangeMax(text: string): number | null {
  const parts = text.split(/[–—-]/).map((part) => moodleNumber(part));
  const max = parts.at(-1);
  return max === undefined || max === null || max <= 0 ? null : max;
}

export function mapMoodleGradeRow(
  row: MoodleGradeRow,
  courseId: number,
  subjectId: string,
): IncomingMoodleGrade | null {
  const label = row.name.trim();
  const maxScore = moodleRangeMax(row.range);
  if (label === "" || maxScore === null) return null;
  const score = moodleNumber(row.grade);
  const weight = moodleNumber(row.weight);
  return {
    externalId: `mdg|${courseId}|${slugify(label)}`,
    subjectId,
    label,
    score: score === null ? null : Math.min(score, maxScore),
    maxScore,
    weightPct: weight === null || weight < 0 || weight > 100 ? null : weight,
  };
}

export const AUTO_SYNC_MINUTES = 60;

// Opening Uniplan refreshes Aulas Virtuales at most once an hour, and only
// after the student has run a first sync by hand.
export function shouldAutoSync(
  enabled: boolean,
  lastStartedAt: string | null,
  now: Date,
): boolean {
  if (!enabled) return false;
  if (lastStartedAt === null) return false;
  const elapsed = now.getTime() - Date.parse(lastStartedAt);
  return Number.isNaN(elapsed) || elapsed >= AUTO_SYNC_MINUTES * 60_000;
}
