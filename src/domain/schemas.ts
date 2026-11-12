import { z } from "zod";

export const VIEW_IDS = [
  "agenda",
  "notas",
  "pensum",
  "ruta",
  "ajustes",
] as const;
export type ViewId = (typeof VIEW_IDS)[number];

export const sourceSchema = z.enum(["manual", "sac", "classroom", "moodle"]);
export type Source = z.infer<typeof sourceSchema>;

export const subjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  semester: z.number().int().min(1).max(11),
  credits: z.number().positive().nullable(),
  prereqIds: z.array(z.string()),
  kind: z.enum(["obligatoria", "profundizacion"]),
  status: z.enum(["aprobada", "cursando", "pendiente"]),
  finalGrade: z.number().nullable(),
  overrides: z.array(z.string()),
});
export type Subject = z.infer<typeof subjectSchema>;

export const linkSchema = z.object({
  title: z.string(),
  url: z.string(),
});

export const itemTypeSchema = z.enum([
  "tarea",
  "parcial",
  "quiz",
  "proyecto",
  "otro",
]);
export type ItemType = z.infer<typeof itemTypeSchema>;

export const itemSchema = z.object({
  id: z.string().min(1),
  type: itemTypeSchema,
  title: z.string().min(1),
  subjectId: z.string().nullable(),
  dueAt: z.string().nullable(),
  weightPct: z.number().min(0).max(100).nullable(),
  notes: z.string(),
  done: z.boolean(),
  links: z.array(linkSchema),
  isActa: z.boolean(),
  source: sourceSchema,
  externalId: z.string().nullable(),
  overrides: z.array(z.string()),
  hidden: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Item = z.infer<typeof itemSchema>;

export const gradeSchema = z.object({
  id: z.string().min(1),
  subjectId: z.string().min(1),
  label: z.string().min(1),
  // null = "sin calificar": a pending component whose weight is known.
  score: z.number().min(0).nullable(),
  maxScore: z.number().positive(),
  weightPct: z.number().min(0).max(100).nullable(),
  source: sourceSchema,
  externalId: z.string().nullable(),
  overrides: z.array(z.string()),
  hidden: z.boolean(),
  updatedAt: z.string(),
});
export type Grade = z.infer<typeof gradeSchema>;

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/);

export const scheduleBlockSchema = z.object({
  id: z.string().min(1),
  subjectId: z.string().nullable(),
  rawSubjectName: z.string(),
  day: z.number().int().min(1).max(7),
  start: timeSchema,
  end: timeSchema,
  room: z.string(),
  source: sourceSchema,
});
export type ScheduleBlock = z.infer<typeof scheduleBlockSchema>;

export const syncCountsSchema = z.object({
  created: z.number().int().min(0),
  updated: z.number().int().min(0),
  skipped: z.number().int().min(0),
  unmatched: z.number().int().min(0),
});
export type SyncCounts = z.infer<typeof syncCountsSchema>;

export const syncRunSchema = z.object({
  id: z.string().min(1),
  source: z.enum(["sac", "classroom", "moodle"]),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  status: z.enum(["ok", "partial", "error"]),
  counts: syncCountsSchema,
  error: z.string().nullable(),
});
export type SyncRun = z.infer<typeof syncRunSchema>;

export const notifiedRowSchema = z.object({ key: z.string().min(1) });
export type NotifiedRow = z.infer<typeof notifiedRowSchema>;

export type SettingRow = { key: string; value: unknown };

export type GradeScale = { min: number; max: number; pass: number };

export type HeaderSynonyms = {
  subjectName: string[];
  subjectCode: string[];
  credits: string[];
  finalGrade: string[];
  partialGradePattern: string;
  group: string[];
  day: string[];
  start: string[];
  end: string[];
  room: string[];
  period: string[];
};

export type Settings = {
  googleClientId: string;
  creditCap: number | null;
  courseCap: number;
  assumeCurrentPass: boolean;
  gradeScale: GradeScale;
  headerSynonyms: HeaderSynonyms;
  subjectAliases: Record<string, string>;
  unmatchedSubjects: string[];
  reminderLeadHours: number[];
  activeView: ViewId;
  lastBackupAt: string | null;
  careerName: string;
  pensumReviewed: boolean;
  moodleAutoSync: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  googleClientId: "",
  creditCap: null,
  courseCap: 5,
  assumeCurrentPass: true,
  gradeScale: { min: 0, max: 5, pass: 3 },
  headerSynonyms: {
    subjectName: [
      "asignatura",
      "materia",
      "nombre asignatura",
      "espacio academico",
      "curso",
    ],
    subjectCode: ["codigo", "cod", "codigo asignatura"],
    credits: ["creditos", "cred", "nro creditos", "numero de creditos"],
    finalGrade: [
      "definitiva",
      "nota definitiva",
      "nota final",
      "nota",
      "calificacion",
    ],
    partialGradePattern: "^(nota|parcial|corte)\\s*\\d+",
    group: ["grupo"],
    day: ["dia"],
    start: ["hora inicio", "inicio", "hora inicial"],
    end: ["hora fin", "fin", "hora final"],
    room: ["aula", "salon", "espacio fisico"],
    period: ["periodo", "periodo academico", "semestre"],
  },
  subjectAliases: {},
  unmatchedSubjects: [],
  reminderLeadHours: [24, 3],
  activeView: "agenda",
  lastBackupAt: null,
  careerName: "Ingeniería de Sistemas",
  pensumReviewed: false,
  moodleAutoSync: true,
};
