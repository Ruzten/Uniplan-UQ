# Epic 03: Integraciones

> Al terminar los datos entran solos: el SAC por un botón de solo lectura, Google Classroom por
> una sincronización opcional; hay recordatorios, respaldo, registro de sincronizaciones y una
> prueba de extremo a extremo que recorre el flujo completo.

| | |
|---|---|
| **Epic id** | `03-integrations` |
| **Tasks** | `E3-T1` … `E3-T6` |
| **Depends on** | `01-foundation`; `02-views` para `E3-T3`, `E3-T4` y `E3-T6` |
| **Unlocks** | nada — es la última |
| **Parallel with** | `E3-T1` y `E3-T2` pueden correr junto a `02-views` |

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
| Test (un archivo) | `pnpm test tests/sac/import.test.ts` |
| E2E (un spec) | `pnpm e2e e2e/sac-import.spec.ts` |

**Gate:** `pnpm build && pnpm typecheck && pnpm lint && pnpm test && pnpm e2e` pasa antes de
marcar una tarea como hecha.

Orden al terminar de escribir: `pnpm format` → los comandos de **Verify**. Los comandos corren
desde la raíz del proyecto, en Git Bash. No hay servicios que arrancar y ninguna prueba sale a
internet: el SAC se simula con una ruta de Playwright y Classroom con `fetch` inyectado.

## Directory subtree

```
entrypoints/
  background.ts              # existe; lo editas en E3-T1, E3-T3 y E3-T5
  sac.content.ts             # NUEVO en E3-T2
src/
  domain/
    schemas.ts  text.ts  grades.ts   # existen; solo lectura
    sac.ts                   # NUEVO en E3-T2
    classroom.ts             # NUEVO en E3-T4
    backup.ts                # NUEVO en E3-T6
  db/db.ts  db/repo.ts       # existen; solo lectura
  sync/
    merge.ts                 # existe; solo lectura
    messages.ts              # NUEVO en E3-T1
    sac-extract.ts           # NUEVO en E3-T2
    sac-import.ts            # NUEVO en E3-T3
    classroom-client.ts      # NUEVO en E3-T4
    reminders.ts             # NUEVO en E3-T5
  ui/
    views/notas.tsx          # existe; lo editas en E3-T4
    ajustes/sections/sac.tsx            # NUEVO en E3-T3
    ajustes/sections/classroom.tsx      # NUEVO en E3-T4
    ajustes/sections/recordatorios.tsx  # NUEVO en E3-T5
    ajustes/sections/backup.tsx         # NUEVO en E3-T6
    ajustes/sections/sync-log.tsx       # NUEVO en E3-T6
tests/
  fixtures/sac/              # existe; solo lectura: grades.json schedule.json enrollment.json unknown.json sac-page.html
  fixtures/classroom/        # existe; solo lectura: courses.page1.json courses.page2.json coursework.1001.json submissions.1001.json materials.1001.json
  sync/messages.test.ts  sac/capture.test.ts  sac/import.test.ts   # NUEVOS
  classroom/classroom.test.ts  reminders/reminders.test.ts  domain/backup.test.ts   # NUEVOS
e2e/
  fixtures.ts                # existe; solo lectura
  messages.spec.ts  sac-capture.spec.ts  sac-import.spec.ts  full-flow.spec.ts   # NUEVOS
docs/CONEXION-CLASSROOM.md   # existe; solo lectura
```

Todo lo que está fuera de este subárbol queda fuera de alcance. Nunca edites `package.json`,
`wxt.config.ts` (los permisos ya están completos), las demás configuraciones, `e2e/fixtures.ts`,
`PERMISSIONS.md` ni `tests/fixtures/**`.

## Data model touched here

| Entity | Fields this epic adds or reads | Notes |
|---|---|---|
| `grades` | upsert con `source` `sac` o `classroom` | `externalId`: `sac\|<subjectId>\|<encabezado normalizado>` o `sub\|<courseId>\|<courseWorkId>` |
| `items` | upsert con `source` `classroom`; lectura para recordatorios | `externalId`: `cw\|<courseId>\|<id>` o `mat\|<courseId>\|<id>` |
| `scheduleBlocks` | reemplazo de los de `source` `sac` | Solo si se reconoció al menos un bloque |
| `subjects` | `credits`, `status`, `finalGrade` vía `patchSubject(..., "sync")` | Respeta `overrides` |
| `settings` | `headerSynonyms`, `subjectAliases`, `unmatchedSubjects`, `googleClientId`, `reminderLeadHours`, `lastBackupAt` | |
| `syncRuns` | una fila por corrida | Siempre, incluso cuando falla |
| `notified` | `key` = `<itemId>\|<leadHours>` | Deduplicación de recordatorios |

## Contracts

**Consumed** — ya existe, no lo reconstruyas:

| From | Interface | Guarantee |
|---|---|---|
| `01-foundation` | `db`, `UniplanDb`, `getSetting`, `setSetting`, `listVisibleItems` | Base única, sembrada, validada |
| `01-foundation` | `upsertSynced(db, table, source, incoming)` → `SyncCounts` | Upsert por (`source`, `externalId`); no pisa `overrides`; no revive `hidden`; no borra |
| `01-foundation` | `patchSubject(db, id, patch, "sync")` | Omite las claves que están en `overrides` |
| `01-foundation` | `runSync(db, source, work)` → `SyncRun`; `work` devuelve `{ counts, note? }` | Escribe la fila de `syncRuns`; `partial` si `unmatched` > 0 o hay `note`; `error` si lanza; nunca relanza |
| `01-foundation` | `normalizeText(value)` | Minúsculas, sin tildes, espacios colapsados |
| `01-foundation` | Tipo `SettingsSection` de `@/src/ui/views/ajustes` | Un archivo en `src/ui/ajustes/sections/` se monta solo, ordenado por `order` |
| `02-views` | `normalizeScore`, vista `Notas` con insignias `SAC` y `Classroom` y la marca `editado` | Las notas se muestran normalizadas a la escala configurada |
| Bootstrap | `entrypoints/background.ts` | Registra `action.onClicked` de forma síncrona dentro de `defineBackground` |

**Produced**:

| Export | Signature | Used by |
|---|---|---|
| `src/sync/messages.ts` | `Result<T>`, `sacCaptureSchema`, `SacCapture`, `Message`, `handleMessage(raw, handlers)`, `sendMessage(message)`, `registerRouter(handlers)` | `E3-T2`, `E3-T3`, `E3-T5` |
| `src/sync/sac-extract.ts` | `extractTables(doc)`, `collectDocuments(root)`, `captureSac(root, now)` | `E3-T2` |
| `src/domain/sac.ts` | `classifyTable(table, synonyms)`, `parseScore`, `parseDay`, `parseTime` | `E3-T3` |
| `src/sync/sac-import.ts` | `importSacCapture(db, capture): Promise<SyncRun>` | `E3-T3`, `E3-T6` |
| `src/sync/reminders.ts` | `REMINDER_ALARM`, `ensureReminderAlarm()`, `selectDueReminders(...)`, `runReminderCheck(db, notify, now)`, `notifyWithBrowser(n)` | `E3-T5` |
| `src/domain/backup.ts` | `exportBackup(db, now)`, `importBackup(db, raw)`, `daysSinceBackup(lastBackupAt, now)` | `E3-T6` |

Envoltura de resultado, en todo el proyecto: `{ ok: true, data } | { ok: false, error: { code,
message } }`. Códigos permitidos: `unknown_message`, `not_implemented`, `handler_error`,
`invalid_backup`, `auth_required`, `classroom_http_error`.

## Conventions that bite in this area

- **El SAC es de solo lectura.** En `entrypoints/sac.content.ts` y `src/sync/sac-extract.ts`
  están prohibidos `.click(`, `.submit(`, `location.href`, `location.assign`, `location.replace`,
  `window.open`, `fetch(` y `XMLHttpRequest`. Para la URL usa `document.URL`. Un `grep` lo vigila.
- **Nunca credenciales.** Nada lee, guarda ni escribe contraseñas, ni automatiza el inicio de
  sesión.
- **Mensajería en un solo archivo.** `browser.runtime.sendMessage` y `onMessage` solo dentro de
  `src/sync/messages.ts`. Un `grep` lo vigila.
- **Red en un solo archivo.** `fetch` solo dentro de `src/sync/classroom-client.ts`, y solo hacia
  `https://classroom.googleapis.com/`. Un `grep` lo vigila; no escribas `fetch(` ni en comentarios
  de otros archivos.
- **Service worker sin estado.** Cero variables de módulo con estado; todos los listeners se
  registran de forma síncrona en el cuerpo de `defineBackground`; esperas con `browser.alarms`.
- **Análisis por encabezado, no por selector.** Los sinónimos son datos de `settings`.
- **Los fixtures son sintéticos y los entrega el blueprint.** Los números de los criterios salen
  de esos archivos; no los edites.
- En `src/` importa `browser` desde `"wxt/browser"`. En `entrypoints/` es auto-importado.
- Los specs no importan de `src/`; leen los fixtures con `node:fs`.

Reglas completas del proyecto: `CLAUDE.md`. Reglas por zona: `.claude/rules/background-worker.md`,
`.claude/rules/sac-readonly.md`, `.claude/rules/storage-merge.md`, `.claude/rules/testing.md`.
Están en la raíz del proyecto.

---

## Tasks

En el mismo orden que `tasks.json`. Ese orden es el orden de construcción.

### `E3-T1` — Add typed message contract and background router

**Depends on:** `E1-T2` · **Priority:** p0 — metadato para recortes de alcance, no un orden

Un contrato tipado para todo lo que cruza entre contextos. La lógica vive en `handleMessage`, una
función pura que se prueba sin `browser`; `registerRouter` es un envoltorio delgado. Un mensaje
desconocido se rechaza con un error, nunca se descarta en silencio.

**Files**
- `src/sync/messages.ts` — nuevo: `Result<T>`. `sacCaptureSchema` (zod) = `{ url: string, title:
  string, capturedAt: string, tables: { headers: string[], rows: string[][] }[] }` y el tipo
  `SacCapture`. `messageSchema` = `z.discriminatedUnion("type", [...])` con `{ type: "ping" }`, `{
  type: "sac/import", payload: sacCaptureSchema }` y `{ type: "reminders/check" }`; `Message` se
  infiere. `Handlers` = un manejador opcional por tipo. `handleMessage(raw: unknown, handlers):
  Promise<Result<unknown>>`: no cumple `messageSchema` → `unknown_message` sin invocar nada; tipo
  válido sin manejador → `not_implemented`; el manejador lanza → `handler_error` con su `message`;
  si no, `{ ok: true, data }`. `sendMessage(message)` envuelve `browser.runtime.sendMessage`.
  `registerRouter(handlers)` registra un único listener de `browser.runtime.onMessage` que
  responde con `sendResponse` y devuelve `true`.
- `entrypoints/background.ts` — editar: dentro de `defineBackground`, de forma síncrona, agrega
  `registerRouter({ ping: async () => "pong" });`. El listener de `action.onClicked` queda igual.
- `tests/sync/messages.test.ts` — nuevo: criterios 1 a 3, llamando a `handleMessage` directamente.
- `e2e/messages.spec.ts` — nuevo: criterio 4. Abre `dashboard.html` y envía desde
  `page.evaluate`, accediendo así para no depender de un tipo global:
  `(globalThis as unknown as { chrome: { runtime: { sendMessage(m: unknown): Promise<unknown> } } }).chrome.runtime.sendMessage(...)`.

**Acceptance**

Copiados del arreglo `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un comando de abajo, en este equipo, durante el build.

1. **WHEN** `handleMessage` recibe `{ type: "ping" }` con un manejador registrado **THE SYSTEM SHALL** resolver `{ ok: true, data: "pong" }`.
2. **WHEN** `handleMessage` recibe un objeto cuyo `type` no pertenece a la unión, o un valor que no es un objeto **THE SYSTEM SHALL** resolver `{ ok: false, error: { code: "unknown_message", message } }` sin invocar ningún manejador.
3. **WHEN** un manejador lanza un error **THE SYSTEM SHALL** resolver `{ ok: false, error: { code: "handler_error", message } }` con el mensaje del error.
4. **WHEN** la página del panel envía `{ type: "ping" }` al service worker de la extensión construida **THE SYSTEM SHALL** recibir `{ ok: true, data: "pong" }`, y recibir el código `unknown_message` cuando envía `{ type: "nope" }`.
5. **WHEN** `grep` busca `runtime.sendMessage` o `runtime.onMessage` en `entrypoints/` y `src/` excluyendo `messages.ts` **THE SYSTEM SHALL** no contener ninguna coincidencia.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está correcta; el último saliendo con 0 es lo que la da por hecha.

```bash
pnpm test tests/sync/messages.test.ts
status=0; grep -rnE 'runtime\.(sendMessage|onMessage)' entrypoints src --exclude=messages.ts || status=$?; test "$status" -eq 1
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e e2e/messages.spec.ts
pnpm e2e
```

**Checkpoint**

```bash
git add -A && git commit -m "E3-T1: Add typed message contract and background router"
git tag step-11-messages
```

Ejecuta ambos después de que el último comando de **Verify** salga con 0 y antes de empezar la tarea siguiente. La etiqueta es el punto de retorno: si la tarea siguiente sale mal, `git reset --hard` a esta etiqueta.

### `E3-T2` — Capture and classify SAC tables

**Depends on:** `E3-T1` · **Priority:** p0 — metadato para recortes de alcance, no un orden

El content script convierte cada `<table>` de la página (y de sus `iframe` del mismo origen) en
una estructura neutra y la envía al service worker. No conoce el marcado real del SAC: por eso no
usa selectores, ids ni posiciones. En esta tarea el manejador de `sac/import` todavía no existe,
así que el botón muestra `No se pudo importar: <mensaje>`; es lo esperado.

**Files**
- `src/sync/sac-extract.ts` — nuevo: `extractTables(doc: Document)` → una entrada `{ headers,
  rows }` por cada `<table>`: `headers` = textos de las celdas de la primera fila de
  `table.rows`; `rows` = las demás. El texto es `textContent` con espacios colapsados y recortado.
  Omite las tablas sin encabezados o sin filas de datos. `collectDocuments(root: Document):
  Document[]` = el documento más el `contentDocument` de cada `iframe`, de forma recursiva; si
  leerlo lanza o da `null`, ese marco se omite. `captureSac(root, now: Date): SacCapture` usa
  `root.URL`, `root.title`, `now.toISOString()` y las tablas de todos los documentos.
- `src/domain/sac.ts` — nuevo: `classifyTable(table, synonyms)` → `{ kind, columns }`. Cada
  encabezado se normaliza con `normalizeText` y se compara por **igualdad exacta** con los
  sinónimos; las columnas de nota parcial son las que cumplen `new
  RegExp(synonyms.partialGradePattern)`. Tipos, en este orden de prioridad: `schedule` (materia +
  día + hora de inicio), `grades` (materia + alguna columna definitiva o parcial), `enrollment`
  (materia + créditos), y si no, `unknown`. `columns` guarda el índice de cada columna reconocida
  y la lista de columnas parciales. `parseScore(text)` (acepta coma decimal; vacío o no numérico →
  `null`). `parseDay(text)` → 1–7 por el nombre normalizado o sus tres primeras letras (`lunes` =
  1). `parseTime(text)` → `HH:mm` desde `H:mm` o `HH:mm`, con `am` o `pm` opcional; inválido →
  `null`.
- `entrypoints/sac.content.ts` — nuevo: `export default defineContentScript({ matches:
  ["https://sac.uniquindio.edu.co/sgacampus/*"], allFrames: true, main() { ... } })`. Si
  `window.top !== window`, no hace nada. En el marco superior agrega a `document.documentElement`
  un `div#uniplan-sac-host` con shadow root abierto, fijo abajo a la derecha, con los botones
  `Importar a Uniplan` y `Guardar muestra` y un texto con `role="status"`. Importar: `captureSac`
  → `sendMessage({ type: "sac/import", payload })`. Con `ok` `false` muestra `No se pudo importar:
  <mensaje>`. Con `ok` `true`, `data` es una fila `SyncRun`: si su `error` no es nulo muestra ese
  texto; si no, `Importado: <created> nuevas, <updated> actualizadas, <unmatched> sin asociar` con
  los números de `data.counts`. Guardar muestra: `captureSac` → `Blob` JSON → agrega dentro del
  shadow root el enlace `<a download="uniplan-sac-muestra.json">Descargar muestra</a>` con `href`
  a la URL del blob; lo pulsa el estudiante, nunca el código.
- `tests/sac/capture.test.ts` — nuevo: criterios 1 a 3. Lee `tests/fixtures/sac/sac-page.html`
  con `node:fs`, lo analiza con `new DOMParser().parseFromString(html, "text/html")` y prueba
  `extractTables` sobre la tabla del cuerpo; `classifyTable` sobre las tablas de los cuatro JSON;
  y `collectDocuments` con un marco simulado cuyo `contentDocument` lanza.
- `e2e/sac-capture.spec.ts` — nuevo: criterio 4. `context.route(
  "https://sac.uniquindio.edu.co/sgacampus/**", ...)` responde `sac-page.html` con `contentType`
  `text/html; charset=utf-8`; abre `https://sac.uniquindio.edu.co/sgacampus/notas`; comprueba los
  botones; pulsa `Guardar muestra`; lee el JSON del enlace con `page.evaluate` (el `fetch` sobre
  el `href` ocurre dentro del spec, no en `src/`).

**Acceptance**

Copiados del arreglo `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un comando de abajo, en este equipo, durante el build.

1. **WHEN** `extractTables` procesa `tests/fixtures/sac/sac-page.html` **THE SYSTEM SHALL** devolver la tabla del cuerpo con los encabezados `Asignatura`, `Grupo`, `Nota 1`, `Nota 2`, `Definitiva` y una fila por cada `tr` de datos.
2. **WHEN** `classifyTable` procesa las tablas de `grades.json`, `schedule.json`, `enrollment.json` y `unknown.json` con los sinónimos por defecto **THE SYSTEM SHALL** clasificarlas como `grades`, `schedule`, `enrollment` y `unknown` respectivamente.
3. **WHEN** un `iframe` lanza una excepción al leer `contentDocument` **THE SYSTEM SHALL** omitir ese marco y devolver las tablas de los demás documentos.
4. **WHEN** la página SAC simulada carga con la extensión construida **THE SYSTEM SHALL** mostrar dentro de un shadow root los botones `Importar a Uniplan` y `Guardar muestra`, y tras pulsar `Guardar muestra` ofrecer el enlace `Descargar muestra` cuyo JSON contiene la tabla del cuerpo y la tabla del `iframe`.
5. **WHEN** `grep` busca `.click(`, `.submit(`, `location.href`, `location.assign`, `location.replace`, `window.open`, `fetch(` o `XMLHttpRequest` en `entrypoints/sac.content.ts` y `src/sync/sac-extract.ts` **THE SYSTEM SHALL** no contener ninguna coincidencia.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está correcta; el último saliendo con 0 es lo que la da por hecha.

```bash
pnpm test tests/sac/capture.test.ts
status=0; grep -nE '\.(click|submit)\(|location\.(href|assign|replace)|window\.open|fetch\(|XMLHttpRequest' entrypoints/sac.content.ts src/sync/sac-extract.ts || status=$?; test "$status" -eq 1
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e e2e/sac-capture.spec.ts
pnpm e2e
```

**Checkpoint**

```bash
git add -A && git commit -m "E3-T2: Capture and classify SAC tables"
git tag step-12-sac-capture
```

Ejecuta ambos después de que el último comando de **Verify** salga con 0 y antes de empezar la tarea siguiente. La etiqueta es el punto de retorno: si la tarea siguiente sale mal, `git reset --hard` a esta etiqueta.

### `E3-T3` — Import SAC captures and add SAC settings

**Depends on:** `E1-T4`, `E1-T5`, `E2-T3`, `E3-T2` · **Priority:** p0 — metadato para recortes de alcance, no un orden

Convierte una captura en filas de la base a través del motor de fusión. Una tabla que no se
reconoce se cuenta y se ignora; nunca borra ni modifica datos. Los números de los criterios salen
de `tests/fixtures/sac/`: `grades.json` tiene cuatro notas parciales de materias que existen en el
pensum y una fila de `Electiva Deportiva`, que no existe.

**Files**
- `src/sync/sac-import.ts` — nuevo: `importSacCapture(db, capture): Promise<SyncRun>` dentro de
  `runSync(db, "sac", ...)`. Carga `headerSynonyms`, `subjectAliases`, `gradeScale` y `subjects`.
  Asociación: igualdad de `normalizeText` con `subject.name`, y después
  `subjectAliases[normalizeText(nombre)]`; sin coincidencia → el nombre original se agrega (sin
  repetir) a `settings.unmatchedSubjects` y cuenta una vez en `unmatched`. Tabla `grades`: por
  cada fila asociada y cada columna parcial con `parseScore` no nulo, una nota entrante con
  `externalId` `sac|<subjectId>|<encabezado normalizado>`, `label` = encabezado original,
  `maxScore` = `gradeScale.max`, `weightPct` `null`, vía `upsertSynced`; si la columna definitiva
  tiene valor, `patchSubject(db, id, { finalGrade }, "sync")`. Tabla `schedule`: construye los
  bloques (`parseDay`, `parseTime`; omite filas inválidas; `subjectId` `null` si no se asocia) y,
  si hay al menos uno, reemplaza en una transacción todos los `scheduleBlocks` con `source`
  `sac`. Tabla `enrollment`: `patchSubject(db, id, { credits }, "sync")` y, si la materia está
  `pendiente`, también `{ status: "cursando" }`. Tabla `unknown`: suma 1 a `skipped`. Si ninguna
  tabla se reconoció, devuelve la nota `0 tablas reconocidas` (la corrida queda `partial`). Los
  conteos `created`, `updated` y `skipped` son la suma de lo que devuelve `upsertSynced`; las
  llamadas a `patchSubject` no cuentan.
- `tests/sac/import.test.ts` — nuevo: criterios 1 a 4 y 6, sobre una base nueva (sembrada).
- `entrypoints/background.ts` — editar: agrega al objeto de `registerRouter` el manejador
  `"sac/import": (message) => importSacCapture(db, message.payload)`.
- `src/ui/ajustes/sections/sac.tsx` — nuevo: `export default { id: "sac", order: 20, title: "SAC:
  columnas y materias sin asociar", Section }`. Bloque `Sin asociar`: por cada nombre de
  `unmatchedSubjects`, un `<select>` de materias y el botón `Asociar` (escribe el alias y quita el
  nombre); vacío: `No hay nombres sin asociar.` Bloque `Mapeo de columnas`: un campo de texto por
  cada clave de `headerSynonyms` con los sinónimos separados por coma, y los botones `Guardar
  mapeo` y `Restablecer valores por defecto`; `subjectName` vacío → `Debe haber al menos un
  sinónimo para la materia` con `role="alert"`.
- `e2e/sac-import.spec.ts` — nuevo: criterio 5, con la misma ruta simulada de `E3-T2`; después
  abre el panel en otra página del mismo contexto y revisa `Notas`.

**Acceptance**

Copiados del arreglo `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un comando de abajo, en este equipo, durante el build.

1. **WHEN** `importSacCapture` procesa `tests/fixtures/sac/grades.json` sobre el pensum sembrado **THE SYSTEM SHALL** crear 4 notas con `source` `sac`, reportar `created` 4 y `unmatched` 1, y registrar `Electiva Deportiva` en `unmatchedSubjects`.
2. **WHEN** la misma captura se importa por segunda vez **THE SYSTEM SHALL** reportar `created` 0 y dejar igual el número de filas de `grades`.
3. **WHEN** `importSacCapture` procesa `tests/fixtures/sac/unknown.json` **THE SYSTEM SHALL** escribir una fila en `syncRuns` con `status` `partial` y `error` `0 tablas reconocidas`, sin crear ni borrar filas en `grades`, `scheduleBlocks` ni `subjects`.
4. **WHEN** `importSacCapture` procesa `tests/fixtures/sac/enrollment.json` **THE SYSTEM SHALL** asignar a cada materia asociada los `credits` de la tabla, salvo cuando `credits` está en sus `overrides`.
5. **WHEN** el estudiante pulsa `Importar a Uniplan` en la página SAC simulada **THE SYSTEM SHALL** mostrar `Importado: 4 nuevas, 0 actualizadas, 1 sin asociar`, y mostrar en la vista `Notas` la nota `Nota 1` de `Cálculo integral` con la insignia `SAC`.
6. **WHEN** el estudiante asocia `Electiva Deportiva` a una materia en `Ajustes` y la captura se importa de nuevo **THE SYSTEM SHALL** crear bajo esa materia la nota `Parcial 1` de esa fila.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está correcta; el último saliendo con 0 es lo que la da por hecha.

```bash
pnpm test tests/sac/import.test.ts
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e e2e/sac-import.spec.ts
pnpm e2e
```

**Checkpoint**

```bash
git add -A && git commit -m "E3-T3: Import SAC captures and add SAC settings"
git tag step-13-sac-import
```

Ejecuta ambos después de que el último comando de **Verify** salga con 0 y antes de empezar la tarea siguiente. La etiqueta es el punto de retorno: si la tarea siguiente sale mal, `git reset --hard` a esta etiqueta.

### `E3-T4` — Sync Google Classroom against recorded fixtures

**Depends on:** `E1-T4`, `E1-T5`, `E2-T3` · **Priority:** p1 — metadato para recortes de alcance, no un orden

Todo se construye y se prueba contra los archivos de `tests/fixtures/classroom/` con `fetchImpl`
inyectado. La conexión con una cuenta real **no** es una compuerta: depende del administrador de
la universidad y está en la lista de lanzamiento. No intentes abrir la ventana de Google en una
prueba. Si Classroom queda bloqueado, el producto sigue completo con entrada manual.

**Files**
- `src/domain/classroom.ts` — nuevo, puro. `mapCourseWork(courseWork, subjectId)` → ítem
  entrante: `externalId` `cw|<courseId>|<id>`; `dueAt` = `new Date(Date.UTC(año, mes - 1, día,
  horas, minutos)).toISOString()`, donde sin `dueDate` el resultado es `null`, sin `dueTime` la
  hora es 23:59, y con `dueTime` cada campo ausente vale 0; tipo por título y descripción:
  contiene `parcial` o `examen` → `parcial`; contiene `quiz` → `quiz`; si no, `tarea`; `links` =
  `Abrir en Classroom` con `alternateLink` más los adjuntos. `mapMaterial(material, subjectId)` →
  ítem de tipo `otro` con `isActa: true` y `externalId` `mat|<courseId>|<id>` cuando el título o
  el de un adjunto cumple `/acta|concertaci[oó]n/i`; si no, `null`. `mapSubmissionGrade(
  submission, courseWork, subjectId)` → nota entrante con `externalId`
  `sub|<courseId>|<courseWorkId>`, `label` = título de la tarea, `score` = `assignedGrade ??
  draftGrade`, `maxScore` = `maxPoints`; `null` sin calificación o sin `maxPoints` positivo.
  `matchCourse(name, subjects, aliases)` (nombre normalizado y después alias). `actaLinks(items,
  subjectId)` → enlaces de los ítems con `isActa` `true` y `hidden` `false` de esa materia.
- `src/sync/classroom-client.ts` — nuevo; único archivo del proyecto que llama a `fetch`.
  `CLASSROOM_SCOPES`: `classroom.courses.readonly`, `classroom.coursework.me.readonly`,
  `classroom.student-submissions.me.readonly`, `classroom.courseworkmaterials.readonly`,
  `classroom.announcements.readonly`, cada uno con el prefijo
  `https://www.googleapis.com/auth/`. `buildAuthUrl(clientId, redirectUri)` sobre
  `https://accounts.google.com/o/oauth2/v2/auth` con `response_type=token`.
  `parseAuthRedirect(url)` → `{ accessToken, expiresAt }` desde el fragmento. `getToken({
  interactive })`: lee `classroomToken` de `browser.storage.session`; si vence en menos de 60
  segundos llama a `browser.identity.launchWebAuthFlow({ url, interactive })` con la redirección
  `browser.identity.getRedirectURL()`; sin ID de cliente o sin token → lanza con código
  `auth_required`. `listAll(path, listKey, token, fetchImpl)`: base
  `https://classroom.googleapis.com`, cabecera `Authorization: Bearer`, sigue `nextPageToken` con
  `pageToken`; respuesta distinta de 200 → lanza con código `classroom_http_error` y el estado;
  una respuesta sin la clave `listKey` cuenta como lista vacía. Rutas: `/v1/courses?courseStates=ACTIVE&studentId=me`
  (`courses`), `/v1/courses/{id}/courseWork` (`courseWork`),
  `/v1/courses/{id}/courseWork/-/studentSubmissions?userId=me` (`studentSubmissions`),
  `/v1/courses/{id}/courseWorkMaterials` (`courseWorkMaterial`). `syncClassroom(db, { fetchImpl,
  token })` dentro de `runSync(db, "classroom", ...)`: cursos → asociación (sin coincidencia →
  `unmatchedSubjects` y `unmatched`) → por cada curso asociado: tareas, entregas y materiales →
  `upsertSynced`; con 401 borra `classroomToken`.
- `tests/classroom/classroom.test.ts` — nuevo: los seis criterios. `fetchImpl` es un `vi.fn` que
  responde según la URL con los archivos de fixtures y `{}` para lo demás. Cuentas del criterio 4,
  sacadas de los fixtures: el curso `Programación III` aporta tres tareas y un material que es
  acta (4 ítems) y dos entregas con calificación (2 notas); `Semillero de robótica` no existe en
  el pensum (1 sin asociar).
- `src/ui/ajustes/sections/classroom.tsx` — nuevo: `export default { id: "classroom", order: 30,
  title: "Google Classroom", Section }`. Campo `ID de cliente de Google` (guarda en
  `settings.googleClientId`), campo de solo lectura `URI de redirección`, y los botones `Conectar
  con Google` (deshabilitado con el ID vacío), `Sincronizar ahora` y `Reconectar` (visible cuando
  la última corrida falló con `auth_required`); un texto con `role="status"` muestra el resultado
  y un párrafo remite a `docs/CONEXION-CLASSROOM.md`.
- `src/ui/views/notas.tsx` — editar: si `actaLinks` devuelve algo para la materia, la tarjeta
  muestra el bloque `Acta de concertación` con esos enlaces y un formulario corto (`Título`,
  `Fecha y hora`, botón `Agregar parcial`) que crea un ítem manual de tipo `parcial` para esa
  materia. No se lee el contenido del PDF: es un no-objetivo.

**Acceptance**

Copiados del arreglo `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un comando de abajo, en este equipo, durante el build.

1. **WHEN** `listAll` recibe una primera página con `nextPageToken` **THE SYSTEM SHALL** pedir la segunda página con `pageToken` y devolver los elementos de ambas en orden.
2. **WHEN** `mapCourseWork` recibe `dueDate` `{ year: 2026, month: 11, day: 20 }` y `dueTime` `{ hours: 23, minutes: 59 }` **THE SYSTEM SHALL** producir `dueAt` `2026-11-20T23:59:00.000Z`, y `dueAt` nulo cuando no hay `dueDate`.
3. **WHEN** el título de una tarea contiene `parcial` o `examen` **THE SYSTEM SHALL** asignar el tipo `parcial`, el tipo `quiz` cuando contiene `quiz` y `tarea` en los demás casos, y marcar `isActa` cuando el título de un material contiene `acta` o `concertación`.
4. **WHEN** `syncClassroom` corre con las respuestas grabadas de `tests/fixtures/classroom/` **THE SYSTEM SHALL** crear 4 ítems y 2 notas con `source` `classroom`, reportar `unmatched` 1 y no pedir ninguna URL fuera de `https://classroom.googleapis.com/`.
5. **WHEN** la API responde 401 **THE SYSTEM SHALL** escribir una fila en `syncRuns` con `status` `error`, borrar el token guardado y no borrar ningún ítem ni nota.
6. **WHEN** `actaLinks` recibe ítems de una materia **THE SYSTEM SHALL** devolver solo los enlaces de los que tienen `isActa` `true` y `hidden` `false`, y una lista vacía para otra materia.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está correcta; el último saliendo con 0 es lo que la da por hecha.

```bash
pnpm test tests/classroom/classroom.test.ts
status=0; grep -rnE 'fetch\(' entrypoints src --exclude=classroom-client.ts || status=$?; test "$status" -eq 1
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e
```

**Checkpoint**

```bash
git add -A && git commit -m "E3-T4: Sync Google Classroom against recorded fixtures"
git tag step-14-classroom
```

Ejecuta ambos después de que el último comando de **Verify** salga con 0 y antes de empezar la tarea siguiente. La etiqueta es el punto de retorno: si la tarea siguiente sale mal, `git reset --hard` a esta etiqueta.

### `E3-T5` — Add reminders with alarms and dedupe

**Depends on:** `E3-T1`, `E3-T3` · **Priority:** p1 — metadato para recortes de alcance, no un orden

El service worker se despierta cada 60 minutos con una alarma, nunca con un temporizador. La
selección es una función pura; `notify` se inyecta para poder probarla. Se avisa una sola vez por
ítem y anticipación.

**Files**
- `src/sync/reminders.ts` — nuevo: `REMINDER_ALARM = "uniplan-reminders"`.
  `ensureReminderAlarm()`: si `browser.alarms.get(REMINDER_ALARM)` no devuelve nada,
  `browser.alarms.create(REMINDER_ALARM, { periodInMinutes: 60 })`. `selectDueReminders(items,
  notifiedKeys: Set<string>, now, leadHours)`: considera los ítems visibles, sin hacer y con
  `dueAt` posterior a `now`; para cada uno toma la **menor** anticipación `L` tal que `dueAt −
  now ≤ L` horas; si no hay ninguna, o si la clave `<itemId>|<L>` ya está en `notifiedKeys`, no
  devuelve nada para ese ítem; si no, devuelve `{ item, leadHours: L, key, keysToMark }`, donde
  `keysToMark` son las claves de todas las anticipaciones que ya se cumplen.
  `runReminderCheck(db, notify, now)`: lee ítems, `notified` y `reminderLeadHours`; por cada
  recordatorio llama a `notify({ id: key, title, message })` con `title` `Uniplan UQ` y `message`
  `<título> · vence en <h> h` (`h` = horas redondeadas, mínimo 1), y después guarda `keysToMark`
  en `notified`. `notifyWithBrowser(n)` llama a `browser.notifications.create(n.id, { type:
  "basic", iconUrl: NOTIFICATION_ICON, title, message })`, con `NOTIFICATION_ICON` = este PNG
  transparente de 1×1 como URL de datos:
  `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`.
- `tests/reminders/reminders.test.ts` — nuevo: los cinco criterios; `notify` es un `vi.fn`; la
  alarma se comprueba con `fakeBrowser` de `"wxt/testing/fake-browser"`.
- `entrypoints/background.ts` — editar: en el cuerpo de `defineBackground`, de forma síncrona:
  `browser.runtime.onInstalled.addListener(() => ensureReminderAlarm())`,
  `browser.runtime.onStartup.addListener(() => ensureReminderAlarm())`, un
  `browser.alarms.onAlarm.addListener` que ejecuta `runReminderCheck(db, notifyWithBrowser, new
  Date())` cuando `alarm.name` es `REMINDER_ALARM`, y el manejador `"reminders/check"` en
  `registerRouter`, que ejecuta lo mismo.
- `src/ui/ajustes/sections/recordatorios.tsx` — nuevo: `export default { id: "recordatorios",
  order: 40, title: "Recordatorios", Section }`. Campo `Horas de anticipación` (números positivos
  separados por coma) y el botón `Guardar`; valor inválido → `Escribe horas positivas separadas
  por coma` con `role="alert"`.

**Acceptance**

Copiados del arreglo `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un comando de abajo, en este equipo, durante el build.

1. **WHEN** `selectDueReminders` recibe un ítem visible y sin hacer que vence en 20 horas con anticipaciones `[24, 3]` **THE SYSTEM SHALL** devolver un recordatorio con `leadHours` 24 y la clave `<itemId>|24`.
2. **WHEN** ese ítem ya tiene la clave `<itemId>|24` en `notified` y vence en 20 horas **THE SYSTEM SHALL** no devolver ningún recordatorio, y devolver uno con `leadHours` 3 cuando vence en 2 horas.
3. **WHEN** un ítem está hecho, oculto, sin fecha o ya vencido **THE SYSTEM SHALL** excluirlo de los recordatorios.
4. **WHEN** `runReminderCheck` corre dos veces seguidas con el mismo reloj **THE SYSTEM SHALL** invocar `notify` una sola vez por ítem y dejar su clave en la tabla `notified`.
5. **WHEN** `ensureReminderAlarm` se llama dos veces **THE SYSTEM SHALL** dejar una única alarma `uniplan-reminders` con `periodInMinutes` 60 en `fakeBrowser.alarms`.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está correcta; el último saliendo con 0 es lo que la da por hecha.

```bash
pnpm test tests/reminders/reminders.test.ts
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e
```

**Checkpoint**

```bash
git add -A && git commit -m "E3-T5: Add reminders with alarms and dedupe"
git tag step-15-reminders
```

Ejecuta ambos después de que el último comando de **Verify** salga con 0 y antes de empezar la tarea siguiente. La etiqueta es el punto de retorno: si la tarea siguiente sale mal, `git reset --hard` a esta etiqueta.

### `E3-T6` — Add backup, sync log and the full e2e flow

**Depends on:** `E2-T1`, `E2-T4`, `E3-T3` · **Priority:** p0 — metadato para recortes de alcance, no un orden

Todos los datos viven en un perfil del navegador, así que el respaldo es la única red de
seguridad. Importar reemplaza todo en una sola transacción, después de una confirmación explícita
y de descargar un respaldo automático. La prueba final recorre el producto completo.

**Files**
- `src/domain/backup.ts` — nuevo: `BACKUP_SCHEMA_VERSION = 1`. `backupSchema` (zod): `{
  schemaVersion: z.literal(1), exportedAt: string, tables: { subjects, items, grades,
  scheduleBlocks, settings, syncRuns, notified } }`, cada tabla como arreglo validado con su
  esquema de `src/domain/schemas.ts` (`settings` como `{ key: string, value: unknown }`).
  `exportBackup(db, now)` lee todas las tablas. `importBackup(db, raw)`: si no cumple el esquema →
  `{ ok: false, error: { code: "invalid_backup", message } }` sin tocar la base; si cumple, en una
  sola transacción de lectura y escritura sobre todas las tablas hace `clear()` y `bulkAdd()` de
  cada una y devuelve `{ ok: true, data: null }`. `daysSinceBackup(lastBackupAt, now)` → días
  enteros, o `null`. Recibe `db` como parámetro e importa solo tipos de `src/db/db.ts`.
- `tests/domain/backup.test.ts` — nuevo: criterios 1 y 2.
- `src/ui/ajustes/sections/backup.tsx` — nuevo: `export default { id: "backup", order: 50, title:
  "Respaldo", Section }`. Aviso con `role="status"`: `Último respaldo: nunca` cuando
  `lastBackupAt` es `null`; `Último respaldo hace <n> días — exporta uno ahora` cuando pasan de 7;
  `Último respaldo hace <n> días` en otro caso. Botón `Exportar respaldo`: descarga
  `uniplan-respaldo-<yyyy-MM-dd>.json` (un `Blob` y un enlace temporal con `download`) y guarda
  `lastBackupAt`. Campo de archivo `Importar respaldo`: al elegir un archivo muestra `Esto
  reemplaza todos los datos actuales. Antes se descargará un respaldo automático.` con los botones
  `Reemplazar todo` y `Cancelar`; `Reemplazar todo` exporta primero y después llama a
  `importBackup`; archivo inválido → `El archivo no es un respaldo válido de Uniplan` con
  `role="alert"`.
- `src/ui/ajustes/sections/sync-log.tsx` — nuevo: `export default { id: "sync-log", order: 60,
  title: "Registro de sincronización", Section }`. Tabla de `syncRuns` de la más reciente a la más
  antigua con origen, inicio, estado, los cuatro conteos y el error. Vacío: `Aún no hay
  sincronizaciones.`
- `e2e/full-flow.spec.ts` — nuevo: un solo recorrido — abre el panel con perfil nuevo; en
  `Pensum` la tarjeta `Matemáticas Generales` tiene `data-state="aprobada"`; en `Agenda` agrega
  `Entrega proyecto`, recarga y sigue ahí; abre la página SAC simulada (misma ruta de `E3-T2`) y
  pulsa `Importar a Uniplan`; en `Notas` edita `Nota 1` de `Cálculo integral` a 4.9; vuelve a la
  página SAC y pulsa `Importar a Uniplan` otra vez; en `Notas` la nota sigue en 4.9 con la marca
  `editado`; en `Ajustes` el aviso empieza por `Último respaldo`, el registro tiene al menos 2
  filas, y `Exportar respaldo` produce una descarga (`page.waitForEvent("download")`) cuyo nombre
  sugerido cumple `^uniplan-respaldo-\d{4}-\d{2}-\d{2}\.json$`.

**Acceptance**

Copiados del arreglo `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un comando de abajo, en este equipo, durante el build.

1. **WHEN** el resultado de `exportBackup` se pasa a `importBackup` sobre otra base **THE SYSTEM SHALL** dejar en cada tabla las mismas filas que la base de origen.
2. **WHEN** `importBackup` recibe un objeto que no cumple el esquema o cuyo `schemaVersion` no es 1 **THE SYSTEM SHALL** devolver `{ ok: false, error: { code: "invalid_backup", message } }` y no modificar ninguna tabla.
3. **WHEN** `lastBackupAt` es nulo o tiene más de 7 días **THE SYSTEM SHALL** mostrar en `Ajustes` un aviso con `role="status"` que empieza por `Último respaldo`.
4. **WHEN** el estudiante pulsa `Exportar respaldo` **THE SYSTEM SHALL** descargar un archivo cuyo nombre tiene la forma `uniplan-respaldo-AAAA-MM-DD.json`.
5. **WHEN** el recorrido de `e2e/full-flow.spec.ts` agrega un ítem manual, recarga, importa la página SAC simulada, edita `Nota 1` de `Cálculo integral` a 4.9 y vuelve a importar **THE SYSTEM SHALL** conservar el ítem manual tras recargar y mostrar 4.9 con la marca `editado` tras la segunda importación.
6. **WHEN** `grep` busca `.skip(` u `.only(` en `tests/` y `e2e/` **THE SYSTEM SHALL** no contener ninguna coincidencia.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está correcta; el último saliendo con 0 es lo que la da por hecha.

```bash
pnpm test tests/domain/backup.test.ts
status=0; grep -rnE '\.(skip|only)\(' tests e2e || status=$?; test "$status" -eq 1
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e e2e/full-flow.spec.ts
pnpm e2e
```

**Checkpoint**

```bash
git add -A && git commit -m "E3-T6: Add backup, sync log and the full e2e flow"
git tag step-16-backup
```

Ejecuta ambos después de que el último comando de **Verify** salga con 0 y antes de empezar la tarea siguiente. La etiqueta es el punto de retorno: si la tarea siguiente sale mal, `git reset --hard` a esta etiqueta.

---

## Epic acceptance

La épica está hecha cuando cada tarea está `done` **y**:

1. **WHEN** el recorrido completo de `e2e/full-flow.spec.ts` corre contra la extensión construida **THE SYSTEM SHALL** conservar el dato manual y la edición del estudiante después de recargar y de volver a importar.
2. **WHEN** una importación no reconoce ninguna tabla o Classroom responde con error **THE SYSTEM SHALL** registrar la corrida en `syncRuns` y no borrar ningún dato.

```bash
pnpm build && pnpm typecheck && pnpm lint && pnpm test
pnpm e2e
```

## Pitfalls

- **Guardar estado en el service worker** — el navegador lo mata en cualquier momento. Todo en
  Dexie o en `browser.storage.session`.
- **Registrar un listener después de un `await`** — el evento que despertó al worker se pierde.
- **Un `a.click()` en el content script** — rompe la compuerta de solo lectura; el enlace lo
  pulsa el estudiante.
- **`iframe` de otro origen** — leer `contentDocument` lanza; se omite, no se propaga.
- **Comparar encabezados por inclusión** — `nota 1` contendría `nota`; la comparación es por
  igualdad exacta y las parciales por expresión regular.
- **Agregar un permiso** — el conjunto está fijado y `e2e/smoke.spec.ts` falla si cambia.
- **Probar contra el Google real** — necesita la cuenta del estudiante y el visto bueno del
  administrador; va en la lista de lanzamiento, no aquí.
- **Mover la carpeta del proyecto** — cambia el id de la extensión y con él la URI de redirección.

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
