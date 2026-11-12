# Epic 01: Fundamentos

> Al terminar existe una extensión que se construye, se carga y se prueba sola; una base local
> versionada y sembrada con el pensum; el armazón del panel con sus cinco vistas; y el motor de
> fusión que hace que toda edición del estudiante sobreviva a una sincronización.

| | |
|---|---|
| **Epic id** | `01-foundation` |
| **Tasks** | `E1-T1` … `E1-T5` |
| **Depends on** | nada — se empieza aquí, después del bloque Bootstrap |
| **Unlocks** | `02-views`, `03-integrations` |
| **Parallel with** | ninguna |

No necesitas ningún otro archivo para completar esta épica. Todo lo de abajo se repite aquí a
propósito.

---

## Stack

WXT (Manifest V3) · TypeScript estricto · React · Tailwind con tokens `@theme` · Dexie sobre
IndexedDB · zod · Vitest + happy-dom + fake-indexeddb · Playwright · Biome. Sin servidor, sin
cuentas, sin variables de entorno. Gestor de paquetes: `pnpm`. Runtime fijado en `.nvmrc`. Las
versiones están en `package.json` y `pnpm-lock.yaml`: léelas ahí, nunca adivines una.

| Task | Command |
|---|---|
| Build estático | `pnpm build` — salida en `.output/chrome-mv3` |
| Typecheck | `pnpm typecheck` — siempre después de `pnpm build` |
| Lint | `pnpm lint` |
| Formato y arreglos seguros | `pnpm format` |
| Test (un archivo) | `pnpm test tests/db/repo.test.ts` |
| E2E (un spec) | `pnpm e2e e2e/smoke.spec.ts` |

**Gate:** `pnpm build && pnpm typecheck && pnpm lint && pnpm test && pnpm e2e` pasa antes de
marcar una tarea como hecha.

Orden al terminar de escribir: `pnpm format` → los comandos de **Verify**. Los comandos corren
desde la raíz del proyecto, en Git Bash. No hay servicios que arrancar.

**Antes de la primera tarea** el bloque Bootstrap ya se ejecutó (repositorio git, copia de
`blueprints/uniplan-uq/workspace/` a la raíz, `pnpm install`, navegador de Playwright, primer
commit). Si `package.json` no está en la raíz, detente y repórtalo.

## Directory subtree

```
entrypoints/
  background.ts              # existe (lo entregó el blueprint); solo lectura en esta épica
  dashboard/
    index.html               # NUEVO en E1-T1 → se emite como /dashboard.html
    main.tsx                 # NUEVO en E1-T1
    App.tsx                  # NUEVO en E1-T1; lo editas en E1-T3
    style.css                # NUEVO en E1-T1; lo editas en E1-T3
src/
  data/pensum.seed.ts        # existe; solo lectura
  domain/
    schemas.ts               # NUEVO en E1-T2
    text.ts                  # NUEVO en E1-T4
    pensum.ts                # NUEVO en E1-T4
  db/
    db.ts                    # NUEVO en E1-T2; lo editas en E1-T4
    repo.ts                  # NUEVO en E1-T2
  sync/merge.ts              # NUEVO en E1-T5
  ui/
    views.tsx                # NUEVO en E1-T3
    views/ajustes.tsx        # NUEVO en E1-T3
tests/
  data/seed-text.test.ts                  # NUEVO en E1-T1
  db/repo.test.ts  db/migration.test.ts   # NUEVOS en E1-T2
  domain/pensum.test.ts  db/seed.test.ts  # NUEVOS en E1-T4
  sync/merge.test.ts                      # NUEVO en E1-T5
e2e/
  fixtures.ts                # existe; solo lectura
  smoke.spec.ts              # existe; solo lectura
  shell.spec.ts              # NUEVO en E1-T3
```

Nunca edites: `package.json`, `wxt.config.ts`, `tsconfig.json`, `biome.json`, `vitest.config.ts`,
`vitest.setup.ts`, `playwright.config.ts`, `e2e/fixtures.ts`, `e2e/smoke.spec.ts`, `src/data/pensum.seed.ts`,
`PERMISSIONS.md`, `tests/fixtures/**`. Si una tarea parece exigirlo, detente y repórtalo.

## Data model touched here

| Entity | Fields this epic adds or reads | Notes |
|---|---|---|
| `subjects` | `id` (slug), `name`, `semester` 1–11, `credits` (número o null), `prereqIds`, `kind`, `status`, `finalGrade`, `overrides` | Índices `id, semester, status`. Se siembra en el evento `populate` |
| `items` | `id`, `type`, `title`, `subjectId`, `dueAt` (ISO UTC o null), `weightPct`, `notes`, `done`, `links`, `isActa`, `source`, `externalId`, `overrides`, `hidden`, `createdAt`, `updatedAt` | Índices `id, subjectId, dueAt, [source+externalId]` |
| `grades` | `id`, `subjectId`, `label`, `score`, `maxScore`, `weightPct`, `source`, `externalId`, `overrides`, `hidden`, `updatedAt` | Índices `id, subjectId, [source+externalId]` |
| `scheduleBlocks` | `id`, `subjectId`, `rawSubjectName`, `day` 1–7, `start`, `end`, `room`, `source` | Índices `id, subjectId, day, source` |
| `settings` | `key`, `value` | Valores por defecto en `DEFAULT_SETTINGS` |
| `syncRuns` | `id`, `source`, `startedAt`, `finishedAt`, `status`, `counts`, `error` | Índices `id, source, startedAt` |
| `notified` | `key` | |

## Contracts

**Consumed** — ya existe, no lo reconstruyas:

| From | Interface | Guarantee |
|---|---|---|
| Bootstrap | `e2e/fixtures.ts` → `test`, `expect` | `test` carga `.output/chrome-mv3` en un contexto persistente y expone `page`, `context` y `extensionId` |
| Bootstrap | `e2e/smoke.spec.ts` | Tres pruebas: encabezado del panel, permisos exactos del manifiesto y presupuesto de `PERMISSIONS.md` |
| Bootstrap | `entrypoints/background.ts` | Al pulsar el icono abre o enfoca `/dashboard.html` |
| Bootstrap | `src/data/pensum.seed.ts` → `PENSUM_SEED_TEXT` | Una materia por línea: `semestre\|estado\|tipo\|nombre\|prerrequisitos` |
| Bootstrap | `vitest.config.ts` | Entorno `happy-dom`, alias `@/`, `fake-indexeddb` cargado; una corrida sin archivos de prueba falla |

**Produced** — las épicas siguientes dependen de estas firmas exactas:

| Export | Signature | Used by |
|---|---|---|
| `src/domain/schemas.ts` | Esquemas zod y tipos `Subject`, `Item`, `ItemType`, `Grade`, `ScheduleBlock`, `SyncRun`, `SyncCounts`, `Settings`, `ViewId`, `VIEW_IDS`, `DEFAULT_SETTINGS` | todas |
| `src/db/db.ts` | `createDb(name?)`, `db`, `applySchema(target)`, `SCHEMA_V1`, `TABLE_NAMES`, tipo `UniplanDb` | todas |
| `src/db/repo.ts` | `getSetting(db, key)`, `setSetting(db, key, value)`, `putSubject`, `addManualItem(db, input)`, `listVisibleItems(db)`, `addManualGrade(db, input)`, `listVisibleGrades(db, subjectId)` | `02-views`, `03-integrations` |
| `src/domain/text.ts` | `normalizeText(value)`, `slugify(value)` | `02-views`, `03-integrations` |
| `src/domain/pensum.ts` | `parsePensumSeed(text)`, `detectCycles(subjects)`, `dependentsOf(subjects, id)`, `chainDepth(subjects, id)`, `availability(subject, byId, assumeCurrentPass)`, `progressStats(subjects)` | `02-views` |
| `src/sync/merge.ts` | `upsertSynced(db, table, source, incoming)`, `editRecord(db, table, id, patch)`, `removeRecord(db, table, id)`, `patchSubject(db, id, patch, origin)`, `runSync(db, source, work)`, tipos `SyncTable`, `IncomingItem`, `IncomingGrade` | `02-views`, `03-integrations` |
| `src/ui/views.tsx` | `VIEWS`, `resolveViewId(value)`, `viewComponent(id)`; una vista es `src/ui/views/<id>.tsx` con `export default` | `02-views` |
| `src/ui/views/ajustes.tsx` | tipo `SettingsSection = { id, order, title, Section }`; una sección es `src/ui/ajustes/sections/<nombre>.tsx` con `export default` | `02-views`, `03-integrations` |

## Conventions that bite in this area

- Importaciones sin extensión, con el alias `@/` desde la raíz (`@/src/db/db`) o relativas. En
  `e2e/` solo relativas y `node:`; nunca importes de `src/` ahí.
- `pnpm build` va antes de `pnpm typecheck`: regenera `.wxt/` (tipos de rutas y auto-imports).
- `noUncheckedIndexedAccess` está activo: `arr[0]` puede ser `undefined`. Nada de `any` ni de `!`.
- Todo recibe la base como primer parámetro (`db: UniplanDb`); las pruebas crean la suya con
  `createDb("uniplan-test-" + crypto.randomUUID())`.
- Fechas guardadas como ISO en UTC. Las pruebas no afirman textos de error de zod ni de Dexie.
- El `h1` con el texto `Uniplan UQ` no se quita nunca: lo vigila `e2e/smoke.spec.ts`.
- Colores solo por token (`bg-surface`, `text-muted`); ningún hex en un componente.

Reglas completas del proyecto: `CLAUDE.md`. Reglas por zona: `.claude/rules/storage-merge.md`,
`.claude/rules/ui-tokens.md`, `.claude/rules/testing.md`. Están en la raíz del proyecto.

---

## Tasks

En el mismo orden que `tasks.json`. Ese orden es el orden de construcción.

### `E1-T1` — Build the first runnable artifact

**Depends on:** nada · **Priority:** p0 — metadato para recortes de alcance, no un orden

Crea la página del panel y una prueba unitaria de sanidad. `e2e/smoke.spec.ts` ya está en la raíz
(lo entregó el blueprint): carga el build en Chromium, abre el panel y compara el manifiesto con el
presupuesto de permisos; esta tarea es la primera que lo hace pasar. Escribe los cinco archivos con
exactamente el contenido de abajo y ejecuta `pnpm format`. `vitest.config.ts` no tolera una corrida
sin pruebas: `pnpm test` ejecuta al menos la prueba de sanidad.

**Files**
- `entrypoints/dashboard/index.html` — nuevo
- `entrypoints/dashboard/main.tsx` — nuevo
- `entrypoints/dashboard/App.tsx` — nuevo
- `entrypoints/dashboard/style.css` — nuevo
- `tests/data/seed-text.test.ts` — nuevo

`entrypoints/dashboard/index.html`

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Uniplan UQ</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

`entrypoints/dashboard/main.tsx`

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./style.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Missing #root container");
}
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`entrypoints/dashboard/App.tsx`

```tsx
export function App() {
  return (
    <main>
      <h1>Uniplan UQ</h1>
      <p>Panel académico personal.</p>
    </main>
  );
}
```

`entrypoints/dashboard/style.css`

```css
@import "tailwindcss";

body {
  margin: 0;
  background-color: #0b0d10;
  color: #e6e8eb;
}
```

`tests/data/seed-text.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { PENSUM_SEED_TEXT } from "@/src/data/pensum.seed";

describe("pensum seed text", () => {
  it("has five pipe-separated fields on every line", () => {
    const lines = PENSUM_SEED_TEXT.split("\n").filter((line) => line.trim());
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line.split("|")).toHaveLength(5);
    }
  });
});
```

**Acceptance**

Copiados del arreglo `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un comando de abajo, en este equipo, durante el build.

1. **WHEN** `pnpm build` termina **THE SYSTEM SHALL** emitir `.output/chrome-mv3/manifest.json` y `.output/chrome-mv3/dashboard.html`.
2. **WHEN** `pnpm e2e e2e/smoke.spec.ts` carga la extensión construida y abre `chrome-extension://<id>/dashboard.html` **THE SYSTEM SHALL** mostrar un encabezado de nivel 1 con el texto `Uniplan UQ`.
3. **WHEN** la prueba `manifest permissions` lee el manifiesto construido **THE SYSTEM SHALL** declarar exactamente los permisos `alarms`, `identity`, `notifications`, `storage`, `unlimitedStorage` y exactamente los hosts `https://classroom.googleapis.com/*` y `https://sac.uniquindio.edu.co/*`.
4. **WHEN** el manifiesto construido declara un permiso o host que no aparece entre comillas invertidas en `PERMISSIONS.md` **THE SYSTEM SHALL** hacer fallar la prueba `permission budget`.
5. **WHEN** `pnpm typecheck`, `pnpm lint` y `pnpm test` corren **THE SYSTEM SHALL** terminar cada uno con código de salida 0.
6. **WHEN** `pnpm test tests/data/seed-text.test.ts` corre **THE SYSTEM SHALL** comprobar que cada línea no vacía de `PENSUM_SEED_TEXT` tiene cinco campos separados por `|`.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está correcta; el último saliendo con 0 es lo que la da por hecha.

```bash
pnpm build
test -f .output/chrome-mv3/manifest.json
test -f .output/chrome-mv3/dashboard.html
pnpm typecheck
pnpm lint
pnpm test tests/data/seed-text.test.ts
pnpm test
pnpm e2e e2e/smoke.spec.ts
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T1: Build the first runnable artifact"
git tag step-01-scaffold
```

Ejecuta ambos después de que el último comando de **Verify** salga con 0 y antes de empezar la tarea siguiente. La etiqueta es el punto de retorno: si la tarea siguiente sale mal, `git reset --hard` a esta etiqueta.

### `E1-T2` — Add the storage layer

**Depends on:** `E1-T1` · **Priority:** p0 — metadato para recortes de alcance, no un orden

Esquemas zod, base Dexie versión 1, repositorio validado y sus pruebas sobre `fake-indexeddb`.
Escribe los cinco archivos con exactamente el contenido de abajo y ejecuta `pnpm format`. Las
pruebas no suponen que `subjects` esté vacía, a propósito: `E1-T4` hace que toda base nueva nazca
sembrada y estas compuertas deben seguir pasando.

**Files**
- `src/domain/schemas.ts` — nuevo
- `src/db/db.ts` — nuevo
- `src/db/repo.ts` — nuevo
- `tests/db/repo.test.ts` — nuevo
- `tests/db/migration.test.ts` — nuevo

`src/domain/schemas.ts`

```ts
import { z } from "zod";

export const VIEW_IDS = [
  "agenda",
  "notas",
  "pensum",
  "ruta",
  "ajustes",
] as const;
export type ViewId = (typeof VIEW_IDS)[number];

export const sourceSchema = z.enum(["manual", "sac", "classroom"]);
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
  score: z.number().min(0),
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
  source: z.enum(["sac", "classroom"]),
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
};
```

`src/db/db.ts`

```ts
import Dexie, { type Table } from "dexie";
import type {
  Grade,
  Item,
  NotifiedRow,
  ScheduleBlock,
  SettingRow,
  Subject,
  SyncRun,
} from "@/src/domain/schemas";

export const DB_NAME = "uniplan";

export const SCHEMA_V1 = {
  subjects: "id, semester, status",
  items: "id, subjectId, dueAt, [source+externalId]",
  grades: "id, subjectId, [source+externalId]",
  scheduleBlocks: "id, subjectId, day, source",
  settings: "key",
  syncRuns: "id, source, startedAt",
  notified: "key",
} as const;

export type TableName = keyof typeof SCHEMA_V1;

export const TABLE_NAMES = Object.keys(SCHEMA_V1) as TableName[];

export type UniplanDb = Dexie & {
  subjects: Table<Subject, string>;
  items: Table<Item, string>;
  grades: Table<Grade, string>;
  scheduleBlocks: Table<ScheduleBlock, string>;
  settings: Table<SettingRow, string>;
  syncRuns: Table<SyncRun, string>;
  notified: Table<NotifiedRow, string>;
};

export function applySchema(target: Dexie): void {
  target.version(1).stores(SCHEMA_V1);
}

export function createDb(name: string = DB_NAME): UniplanDb {
  const instance = new Dexie(name) as UniplanDb;
  applySchema(instance);
  return instance;
}

export const db = createDb();
```

`src/db/repo.ts`

```ts
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
```

`tests/db/repo.test.ts`

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, type UniplanDb } from "@/src/db/db";
import {
  addManualGrade,
  addManualItem,
  getSetting,
  listVisibleGrades,
  listVisibleItems,
  putSubject,
  setSetting,
} from "@/src/db/repo";
import { DEFAULT_SETTINGS, type Subject } from "@/src/domain/schemas";

const SUBJECT: Subject = {
  id: "materia-de-prueba",
  name: "Materia de prueba",
  semester: 1,
  credits: null,
  prereqIds: [],
  kind: "obligatoria",
  status: "cursando",
  finalGrade: null,
  overrides: [],
};

let db: UniplanDb;

beforeEach(() => {
  db = createDb(`uniplan-test-${crypto.randomUUID()}`);
});

afterEach(async () => {
  await db.delete();
});

describe("settings", () => {
  it("returns the default for a key never written", async () => {
    const cap = await getSetting(db, "courseCap");
    const scale = await getSetting(db, "gradeScale");
    expect(cap).toBe(DEFAULT_SETTINGS.courseCap);
    expect(scale).toEqual(DEFAULT_SETTINGS.gradeScale);
  });

  it("returns the stored value after setSetting", async () => {
    await setSetting(db, "activeView", "pensum");
    expect(await getSetting(db, "activeView")).toBe("pensum");
  });
});

describe("items", () => {
  it("creates a manual, visible, not-done item", async () => {
    const item = await addManualItem(db, { title: "  Taller 1  " });
    expect(item.title).toBe("Taller 1");
    expect(item.source).toBe("manual");
    expect(item.hidden).toBe(false);
    expect(item.done).toBe(false);
    expect(item.id.length).toBeGreaterThan(0);
    const visible = await listVisibleItems(db);
    expect(visible.map((row) => row.id)).toEqual([item.id]);
  });

  it("rejects a blank title and writes nothing", async () => {
    await expect(addManualItem(db, { title: "   " })).rejects.toThrow();
    expect(await db.items.count()).toBe(0);
  });

  it("omits hidden items from listVisibleItems", async () => {
    const item = await addManualItem(db, { title: "Quiz 2" });
    await db.items.update(item.id, { hidden: true });
    expect(await listVisibleItems(db)).toEqual([]);
    expect(await db.items.count()).toBe(1);
  });
});

describe("subjects and grades", () => {
  it("stores a valid subject and rejects an invalid one", async () => {
    await putSubject(db, SUBJECT);
    const stored = await db.subjects.get(SUBJECT.id);
    expect(stored?.name).toBe(SUBJECT.name);
    const invalid = { ...SUBJECT, id: "materia-invalida", semester: 12 };
    await expect(putSubject(db, invalid)).rejects.toThrow();
    expect(await db.subjects.get("materia-invalida")).toBeUndefined();
  });

  it("lists only the visible grades of one subject", async () => {
    const base = { label: "Parcial 1", score: 4, maxScore: 5 };
    const kept = await addManualGrade(db, { ...base, subjectId: SUBJECT.id });
    const gone = await addManualGrade(db, { ...base, subjectId: SUBJECT.id });
    await addManualGrade(db, { ...base, subjectId: "otra-materia" });
    await db.grades.update(gone.id, { hidden: true });
    const grades = await listVisibleGrades(db, SUBJECT.id);
    expect(grades.map((row) => row.id)).toEqual([kept.id]);
  });
});
```

`tests/db/migration.test.ts`

```ts
import Dexie from "dexie";
import { describe, expect, it } from "vitest";
import { applySchema, createDb, TABLE_NAMES } from "@/src/db/db";
import { addManualItem } from "@/src/db/repo";

function uniqueName(): string {
  return `uniplan-test-${crypto.randomUUID()}`;
}

describe("schema v1", () => {
  it("exposes exactly the tables listed in TABLE_NAMES", async () => {
    const db = createDb(uniqueName());
    await db.open();
    const names = db.tables.map((table) => table.name).sort();
    expect(names).toEqual([...TABLE_NAMES].sort());
    expect(db.verno).toBe(1);
    await db.delete();
  });

  it("keeps a row after close and reopen", async () => {
    const name = uniqueName();
    const first = createDb(name);
    const item = await addManualItem(first, { title: "Taller 1" });
    first.close();
    const second = createDb(name);
    const stored = await second.items.get(item.id);
    expect(stored?.title).toBe("Taller 1");
    await second.delete();
  });

  it("keeps v1 rows when a later version is layered on top", async () => {
    const name = uniqueName();
    const first = createDb(name);
    const item = await addManualItem(first, { title: "Parcial 1" });
    first.close();
    const next = new Dexie(name);
    applySchema(next);
    next.version(2).stores({
      items: "id, subjectId, dueAt, type, [source+externalId]",
    });
    await next.open();
    const stored = await next.table("items").get(item.id);
    expect(stored?.title).toBe("Parcial 1");
    expect(next.verno).toBe(2);
    await next.delete();
  });
});
```

**Acceptance**

Copiados del arreglo `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un comando de abajo, en este equipo, durante el build.

1. **WHEN** `pnpm test tests/db/repo.test.ts` corre **THE SYSTEM SHALL** crear un ítem manual con `source` `manual`, `hidden` `false`, `done` `false` y un `id` no vacío, y devolverlo desde `listVisibleItems`.
2. **WHEN** `addManualItem` recibe un título vacío o solo con espacios **THE SYSTEM SHALL** rechazar la promesa y dejar la tabla `items` con 0 filas.
3. **WHEN** `getSetting` se llama para una clave nunca escrita **THE SYSTEM SHALL** devolver el valor de `DEFAULT_SETTINGS` para esa clave.
4. **WHEN** `pnpm test tests/db/migration.test.ts` cierra y reabre la base con el mismo nombre **THE SYSTEM SHALL** conservar la fila escrita antes del cierre, y conservarla también cuando se declara una versión 2 del esquema encima de la versión 1.
5. **WHEN** la base se abre **THE SYSTEM SHALL** exponer exactamente las tablas enumeradas en `TABLE_NAMES` de `src/db/db.ts`.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está correcta; el último saliendo con 0 es lo que la da por hecha.

```bash
pnpm test tests/db
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e e2e/smoke.spec.ts
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T2: Add the storage layer"
git tag step-02-storage
```

Ejecuta ambos después de que el último comando de **Verify** salga con 0 y antes de empezar la tarea siguiente. La etiqueta es el punto de retorno: si la tarea siguiente sale mal, `git reset --hard` a esta etiqueta.

### `E1-T3` — Add design tokens and the app shell

**Depends on:** `E1-T2` · **Priority:** p0 — metadato para recortes de alcance, no un orden

Tokens de diseño en CSS y el armazón: riel de navegación con cinco botones y un `main` que
muestra la vista activa, persistida en `settings.activeView`. Las vistas se descubren con
`import.meta.glob`, de modo que ninguna tarea posterior edita `App.tsx` para montar una vista. No
uses un enrutador ni una tienda global.

**Files**
- `entrypoints/dashboard/style.css` — editar: conserva `@import "tailwindcss";` y agrega el bloque
  `@theme` de abajo; `body` con `background-color: var(--color-bg)`, `color: var(--color-text)`,
  `font-family: var(--font-sans)`, `font-size: 14px`, `line-height: 1.5`; la regla `:focus-visible
  { outline: 2px solid var(--color-accent); outline-offset: 2px; }`; y un bloque `@media
  (prefers-reduced-motion: reduce)` que pone `transition: none` y `animation: none` en `*`.
- `src/ui/views.tsx` — nuevo: `VIEWS` (arreglo ordenado con `id`, `label`, `icon`): `agenda` /
  `Agenda` / `CalendarDays`, `notas` / `Notas` / `GraduationCap`, `pensum` / `Pensum` / `Network`,
  `ruta` / `Ruta` / `Route`, `ajustes` / `Ajustes` / `Settings` (iconos de `lucide-react`; si un
  nombre no existe en la versión instalada, `pnpm typecheck` lo dice: usa el exportado más
  cercano). `resolveViewId(value: unknown): ViewId` devuelve `agenda` cuando el valor no está en
  `VIEW_IDS`. `viewComponent(id)` busca `./views/<id>.tsx` en `import.meta.glob<{ default:
  ComponentType }>("./views/*.tsx", { eager: true })`; si no existe, devuelve un componente que
  muestra `Vista en construcción.`
- `entrypoints/dashboard/App.tsx` — editar: dos columnas. Izquierda: `<nav
  aria-label="Secciones">` con el `<h1>Uniplan UQ</h1>` y un `<button type="button">` por vista
  (icono con `aria-hidden` y etiqueta visible); el activo lleva `aria-current="page"`. Derecha:
  `<main>` de ancho máximo 1200px con `viewComponent(activa)`. Lee la vista con `getSetting(db,
  "activeView")` pasada por `resolveViewId`; la guarda con `setSetting` al cambiar. Mientras lee:
  `Cargando…` con `role="status"`.
- `src/ui/views/ajustes.tsx` — nuevo: `export default` de la vista. Exporta el tipo
  `SettingsSection = { id: string; order: number; title: string; Section: ComponentType }`. Carga
  `import.meta.glob<{ default: SettingsSection }>("../ajustes/sections/*.tsx", { eager: true })`,
  ordena por `order` y renderiza cada sección en `<section aria-labelledby>` con su `<h2>`. Sin
  secciones: `Aún no hay ajustes disponibles.`
- `e2e/shell.spec.ts` — nuevo: una prueba por criterio. Para el cuarto, escribe el valor inválido
  con la API cruda de IndexedDB dentro de `page.evaluate` (abre `indexedDB.open("uniplan")`, hace
  `put({ key: "activeView", value: "zzz" })` en el almacén `settings`, espera `oncomplete`, cierra)
  y recarga.

```css
@theme {
  --color-bg: #0b0d10;
  --color-surface: #14171c;
  --color-surface-2: #1b1f26;
  --color-border: #262b33;
  --color-text: #e6e8eb;
  --color-muted: #8b93a1;
  --color-accent: #7c8cff;
  --color-success: #34d399;
  --color-info: #60a5fa;
  --color-warning: #fbbf24;
  --color-danger: #f87171;
  --color-blocked: #4b5563;
  --font-sans: "Segoe UI Variable", "Segoe UI", system-ui, sans-serif;
  --font-mono: "Cascadia Code", Consolas, monospace;
  --radius-card: 10px;
  --radius-control: 6px;
  --text-xs: 12px;
  --text-sm: 13px;
  --text-base: 14px;
  --text-md: 16px;
  --text-lg: 20px;
  --text-xl: 28px;
}
```

**Acceptance**

Copiados del arreglo `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un comando de abajo, en este equipo, durante el build.

1. **WHEN** el panel carga con un perfil nuevo **THE SYSTEM SHALL** mostrar dentro de un `nav` exactamente los botones `Agenda`, `Notas`, `Pensum`, `Ruta` y `Ajustes`, con `aria-current="page"` en `Agenda`.
2. **WHEN** el estudiante activa `Pensum` y recarga la página **THE SYSTEM SHALL** volver a marcar `Pensum` con `aria-current="page"`.
3. **WHEN** un botón del riel recibe foco con la tecla Tab **THE SYSTEM SHALL** aplicarle un `outline-width` calculado de `2px`.
4. **WHEN** `settings.activeView` contiene un valor que no es una de las cinco vistas **THE SYSTEM SHALL** mostrar `Agenda` como vista activa.
5. **WHEN** la página del panel carga **THE SYSTEM SHALL** tener `lang="es"` en el elemento `html` y conservar el encabezado de nivel 1 `Uniplan UQ`.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está correcta; el último saliendo con 0 es lo que la da por hecha.

```bash
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e e2e/shell.spec.ts
pnpm e2e
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T3: Add design tokens and the app shell"
git tag step-03-shell
```

Ejecuta ambos después de que el último comando de **Verify** salga con 0 y antes de empezar la tarea siguiente. La etiqueta es el punto de retorno: si la tarea siguiente sale mal, `git reset --hard` a esta etiqueta.

### `E1-T4` — Seed the pensum and add graph utilities

**Depends on:** `E1-T2` · **Priority:** p0 — metadato para recortes de alcance, no un orden

Convierte el texto de la semilla en materias, siémbralas una sola vez con el evento `populate` de
Dexie y agrega las utilidades del grafo de prerrequisitos. Todo en `src/domain` es puro. El número
de materias se obtiene contando las líneas no vacías de `PENSUM_SEED_TEXT` dentro de la prueba;
nunca lo escribas como literal.

**Files**
- `src/domain/text.ts` — nuevo: `normalizeText(value)` = `normalize("NFD")`, quita el rango
  `̀-ͯ`, minúsculas, colapsa espacios, recorta. `slugify(value)` = `normalizeText` y
  cada secuencia fuera de `a-z0-9` pasa a `-`, sin guiones en los extremos.
- `src/domain/pensum.ts` — nuevo: `parsePensumSeed(text): Subject[]`. Ignora líneas vacías. Cada
  línea tiene cinco campos separados por `|`: semestre, estado (`A` = `aprobada`, `C` = `cursando`,
  `P` = `pendiente`), tipo (`O` = `obligatoria`, `F` = `profundizacion`), nombre, prerrequisitos
  separados por `;` (puede estar vacío). `id` = `slugify(nombre)`; `credits`, `finalGrade` =
  `null`; `overrides` = `[]`. Un prerrequisito que no es el nombre exacto de otra línea, o una
  línea sin cinco campos, lanza `Error` con ese nombre o esa línea en el mensaje.
  `detectCycles(subjects): string[][]` (vacío si es acíclico). `dependentsOf(subjects, id):
  Set<string>` (transitivos). `chainDepth(subjects, id): number` (aristas del camino más largo
  hasta una materia sin dependientes). `availability(subject, byId, assumeCurrentPass)` →
  `aprobada` | `cursando` | `disponible` | `bloqueada`: una `pendiente` está `disponible` si todos
  sus prerrequisitos están `aprobada`, o `cursando` cuando `assumeCurrentPass` es `true`.
  `progressStats(subjects)` → `{ total, approved, pctSubjects, pctCredits }`; `pctCredits` es
  `null` si alguna materia tiene `credits` `null`.
- `src/db/db.ts` — editar: dentro de `createDb`, después de `applySchema(instance)`, agrega
  `instance.on("populate", (tx) => { tx.table("subjects").bulkAdd(parsePensumSeed(PENSUM_SEED_TEXT)); });`
  con las importaciones de `@/src/data/pensum.seed` y `@/src/domain/pensum`. Nada más cambia.
- `tests/domain/pensum.test.ts` — nuevo: criterios 1 a 4 y 6.
- `tests/db/seed.test.ts` — nuevo: criterio 5.

**Acceptance**

Copiados del arreglo `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un comando de abajo, en este equipo, durante el build.

1. **WHEN** `parsePensumSeed` procesa `PENSUM_SEED_TEXT` **THE SYSTEM SHALL** devolver una materia por cada línea no vacía, con ids únicos y con cada elemento de `prereqIds` apuntando a un id existente.
2. **WHEN** `detectCycles` recibe el pensum sembrado **THE SYSTEM SHALL** devolver una lista vacía.
3. **WHEN** `detectCycles` recibe dos materias que se exigen mutuamente **THE SYSTEM SHALL** devolver un ciclo que contiene ambos ids.
4. **WHEN** una línea de la semilla nombra un prerrequisito que no existe **THE SYSTEM SHALL** lanzar un error cuyo mensaje contiene ese nombre.
5. **WHEN** una base nueva se abre por primera vez **THE SYSTEM SHALL** contener en `subjects` las mismas materias que `parsePensumSeed(PENSUM_SEED_TEXT)`, y no volver a sembrar una materia borrada cuando la base se cierra y se reabre.
6. **WHEN** `progressStats` recibe materias con algún `credits` nulo **THE SYSTEM SHALL** devolver `pctCredits` nulo y `pctSubjects` igual a aprobadas entre total por 100.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está correcta; el último saliendo con 0 es lo que la da por hecha.

```bash
pnpm test tests/domain/pensum.test.ts tests/db/seed.test.ts
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T4: Seed the pensum and add graph utilities"
git tag step-04-pensum-seed
```

Ejecuta ambos después de que el último comando de **Verify** salga con 0 y antes de empezar la tarea siguiente. La etiqueta es el punto de retorno: si la tarea siguiente sale mal, `git reset --hard` a esta etiqueta.

### `E1-T5` — Add the merge engine

**Depends on:** `E1-T2` · **Priority:** p0 — metadato para recortes de alcance, no un orden

El corazón de "todo es editable". Una sincronización hace upsert por (`source`, `externalId`),
nunca pisa un campo que el estudiante editó, nunca revive algo que él borró y nunca borra filas
ausentes del lote. No uses "última escritura gana".

**Files**
- `src/sync/merge.ts` — nuevo. Tipos: `SyncTable = "items" | "grades"`; `IncomingItem` e
  `IncomingGrade` = los campos de `Item` y `Grade` sin `id`, `source`, `overrides`, `hidden`,
  `createdAt`, `updatedAt`, con `externalId: string` obligatorio.
  - `upsertSynced(db, table, source, incoming): Promise<SyncCounts>` — busca por
    `[source+externalId]`. No existe → crea con id `crypto.randomUUID()`, `overrides: []`,
    `hidden: false` (`created`). Existe con `hidden: true` → no la toca (`skipped`). Existe →
    copia cada campo entrante que no esté en `overrides`; si algo cambió, actualiza `updatedAt`
    (`updated`); si no, `skipped`. `unmatched` siempre 0 aquí.
  - `editRecord(db, table, id, patch)` — aplica el cambio validado con el esquema; si `source`
    no es `manual`, agrega cada clave cambiada a `overrides` sin repetir.
  - `removeRecord(db, table, id)` — `manual` → borra la fila; otro `source` → `hidden: true`.
  - `patchSubject(db, id, patch, origin: "student" | "sync")` — `student` aplica y agrega las
    claves a `overrides`; `sync` omite las claves que están en `overrides`.
  - `runSync(db, source: "sac" | "classroom", work: () => Promise<{ counts: SyncCounts; note?:
    string }>): Promise<SyncRun>` — escribe una fila en `syncRuns` con `startedAt` y `finishedAt`
    en ISO. `status` `ok`; `partial` si `counts.unmatched` es mayor que 0 o si `note` existe (y
    entonces `error` = `note`); si `work` lanza, `status` `error`, `counts` en ceros y `error` =
    `message`. Nunca relanza.
- `tests/sync/merge.test.ts` — nuevo: una prueba por criterio, cada una con su propia base.

**Acceptance**

Copiados del arreglo `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un comando de abajo, en este equipo, durante el build.

1. **WHEN** `upsertSynced` recibe un registro cuyo par `source` y `externalId` no existe **THE SYSTEM SHALL** crearlo con `overrides` vacío y `hidden` `false`, y contarlo en `created`.
2. **WHEN** el mismo lote se sincroniza dos veces seguidas **THE SYSTEM SHALL** dejar el mismo número de filas y reportar `created` 0 y `updated` 0 en la segunda corrida.
3. **WHEN** el estudiante edita con `editRecord` el campo `title` de un registro sincronizado y después llega una sincronización con otro `title` y otro `dueAt` **THE SYSTEM SHALL** conservar el `title` del estudiante, mantener `title` en `overrides` y actualizar `dueAt`.
4. **WHEN** el estudiante elimina con `removeRecord` un registro sincronizado y después llega el mismo `externalId` **THE SYSTEM SHALL** conservar la fila con `hidden` `true` y no crear una fila nueva.
5. **WHEN** `removeRecord` se llama sobre un registro con `source` `manual` **THE SYSTEM SHALL** borrar la fila.
6. **WHEN** la función de trabajo pasada a `runSync` lanza un error **THE SYSTEM SHALL** escribir una fila en `syncRuns` con `status` `error` y el mensaje del error, y no borrar ninguna fila existente.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está correcta; el último saliendo con 0 es lo que la da por hecha.

```bash
pnpm test tests/sync/merge.test.ts
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T5: Add the merge engine"
git tag step-05-merge
```

Ejecuta ambos después de que el último comando de **Verify** salga con 0 y antes de empezar la tarea siguiente. La etiqueta es el punto de retorno: si la tarea siguiente sale mal, `git reset --hard` a esta etiqueta.

---

## Epic acceptance

La épica está hecha cuando cada tarea está `done` **y**:

1. **WHEN** la extensión construida se carga con un perfil nuevo **THE SYSTEM SHALL** abrir el panel con el encabezado `Uniplan UQ`, el riel de cinco vistas y la base sembrada con el pensum.
2. **WHEN** una sincronización simulada llega después de una edición del estudiante **THE SYSTEM SHALL** conservar el campo editado y no borrar ninguna fila.

```bash
pnpm build && pnpm typecheck && pnpm lint && pnpm test
pnpm e2e
```

## Pitfalls

- **`pnpm typecheck` antes de `pnpm build`** — falla por rutas como `/dashboard.html` que `.wxt/`
  todavía no conoce. Construye primero.
- **Campos de clase con `!` sobre Dexie** — no declares una subclase; usa el patrón `new
  Dexie(name) as UniplanDb` del cuerpo literal.
- **Suponer `subjects` vacía en una prueba** — deja de ser cierto en `E1-T4`.
- **Índices sobre booleanos** — IndexedDB no los admite; `hidden` y `done` se filtran en memoria.
- **`async ({}, provide)` en `e2e/fixtures.ts`** — es el patrón que Playwright exige; no lo
  "corrijas".
- **Probar el build de desarrollo** — la CSP de extensiones rechaza HMR; las compuertas usan
  siempre `pnpm build`.

## Before moving on

- [ ] Cada tarea de esta épica está `done` en `tasks.json`; ninguna quedó `in_progress`.
- [ ] Pasaron todos los comandos `verify` de cada tarea, no solo el primero.
- [ ] Ningún comando `verify` se editó ni se saltó.
- [ ] Cada tarea tiene su etiqueta `checkpoint` en git: `git tag -l 'step-*'` las lista.
- [ ] La compuerta pasa limpia desde la raíz del proyecto.
- [ ] Cada contrato "Produced" existe con la firma indicada.
- [ ] Ningún archivo fuera del subárbol se modificó.
- [ ] Este proyecto no tiene variables de entorno ni `.env.example`: nada que actualizar.
- [ ] Un commit por tarea, con su id como prefijo, seguido de su etiqueta.
