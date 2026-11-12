import type { UniplanDb } from "@/src/db/db";
import {
  DEFAULT_SETTINGS,
  type Grade,
  gradeSchema,
  type Item,
  type ItemType,
  itemSchema,
  type Settings,
  type Subject,
  subjectSchema,
} from "@/src/domain/schemas";

function nowIso(): string {
  return new Date().toISOString();
}

export async function getSetting<K extends keyof Settings>(
  db: UniplanDb,
  key: K,
): Promise<Settings[K]> {
  const row = await db.settings.get(key);
  if (row === undefined) {
    return DEFAULT_SETTINGS[key];
  }
  return row.value as Settings[K];
}

export async function setSetting<K extends keyof Settings>(
  db: UniplanDb,
  key: K,
  value: Settings[K],
): Promise<void> {
  await db.settings.put({ key, value });
}

export async function putSubject(
  db: UniplanDb,
  subject: Subject,
): Promise<void> {
  await db.subjects.put(subjectSchema.parse(subject));
}

export type NewItemInput = {
  title: string;
  type?: ItemType;
  subjectId?: string | null;
  dueAt?: string | null;
  weightPct?: number | null;
  notes?: string;
};

export async function addManualItem(
  db: UniplanDb,
  input: NewItemInput,
): Promise<Item> {
  const now = nowIso();
  const item = itemSchema.parse({
    id: crypto.randomUUID(),
    type: input.type ?? "tarea",
    title: input.title.trim(),
    subjectId: input.subjectId ?? null,
    dueAt: input.dueAt ?? null,
    weightPct: input.weightPct ?? null,
    notes: input.notes ?? "",
    done: false,
    links: [],
    isActa: false,
    source: "manual",
    externalId: null,
    overrides: [],
    hidden: false,
    createdAt: now,
    updatedAt: now,
  });
  await db.items.add(item);
  return item;
}

export async function listVisibleItems(db: UniplanDb): Promise<Item[]> {
  return db.items.filter((item) => !item.hidden).toArray();
}

export type NewGradeInput = {
  subjectId: string;
  label: string;
  score: number;
  maxScore: number;
  weightPct?: number | null;
};

export async function addManualGrade(
  db: UniplanDb,
  input: NewGradeInput,
): Promise<Grade> {
  const grade = gradeSchema.parse({
    id: crypto.randomUUID(),
    subjectId: input.subjectId,
    label: input.label.trim(),
    score: input.score,
    maxScore: input.maxScore,
    weightPct: input.weightPct ?? null,
    source: "manual",
    externalId: null,
    overrides: [],
    hidden: false,
    updatedAt: nowIso(),
  });
  await db.grades.add(grade);
  return grade;
}

export async function listVisibleGrades(
  db: UniplanDb,
  subjectId: string,
): Promise<Grade[]> {
  return db.grades
    .where("subjectId")
    .equals(subjectId)
    .filter((grade) => !grade.hidden)
    .toArray();
}
