# Epic 02: Vistas del panel

> Al terminar el panel tiene sus cuatro vistas de trabajo: Agenda (lista agrupada y calendario),
> Notas (promedios), Pensum (cuadrícula editable con avance) y Ruta (recomendación de matrícula).

| | |
|---|---|
| **Epic id** | `02-views` |
| **Tasks** | `E2-T1` … `E2-T5` |
| **Depends on** | `01-foundation` |
| **Unlocks** | `03-integrations` (`E3-T3`, `E3-T4` y `E3-T6` usan estas vistas) |
| **Parallel with** | `E3-T1` y `E3-T2` de `03-integrations` no comparten archivos con esta épica |

No necesitas ningún otro archivo para completar esta épica. Todo lo de abajo se repite aquí a
propósito.

---

## Stack

WXT (Manifest V3) · TypeScript estricto · React · Tailwind con tokens `@theme` · Dexie sobre
IndexedDB (`dexie-react-hooks`) · zod · `date-fns` · `lucide-react` · Vitest + happy-dom +
fake-indexeddb · Playwright · Biome. Sin servidor, sin cuentas, sin variables de entorno. Gestor
de paquetes: `pnpm`. Runtime fijado en `.nvmrc`. Las versiones están en `package.json` y
`pnpm-lock.yaml`: léelas ahí, nunca adivines una.

| Task | Command |
|---|---|
| Build estático | `pnpm build` — salida en `.output/chrome-mv3` |
| Typecheck | `pnpm typecheck` — siempre después de `pnpm build` |
| Lint | `pnpm lint` |
| Formato y arreglos seguros | `pnpm format` |
| Test (un archivo) | `pnpm test tests/domain/agenda.test.ts` |
| E2E (un spec) | `pnpm e2e e2e/agenda.spec.ts` |

**Gate:** `pnpm build && pnpm typecheck && pnpm lint && pnpm test && pnpm e2e` pasa antes de
marcar una tarea como hecha.

Orden al terminar de escribir: `pnpm format` → los comandos de **Verify**. Los comandos corren
desde la raíz del proyecto, en Git Bash. No hay servicios que arrancar.

## Directory subtree

```
src/
  domain/
    schemas.ts  text.ts  pensum.ts   # existen; solo lectura
    agenda.ts                # NUEVO en E2-T1
    calendar.ts              # NUEVO en E2-T2
    grades.ts                # NUEVO en E2-T3
    recommend.ts             # NUEVO en E2-T5
  db/db.ts  db/repo.ts       # existen; solo lectura
  sync/merge.ts              # existe; solo lectura
  ui/
    views.tsx  views/ajustes.tsx     # existen; solo lectura
    views/agenda.tsx         # NUEVO en E2-T1; lo editas en E2-T2
    views/notas.tsx          # NUEVO en E2-T3
    views/pensum.tsx         # NUEVO en E2-T4
    views/ruta.tsx           # NUEVO en E2-T5
    agenda/ItemForm.tsx      # NUEVO en E2-T1
    agenda/MonthCalendar.tsx # NUEVO en E2-T2
    pensum/SubjectPanel.tsx  # NUEVO en E2-T4
    ajustes/sections/escala.tsx      # NUEVO en E2-T3
tests/domain/
  agenda.test.ts  calendar.test.ts  grades.test.ts  recommend.test.ts   # NUEVOS
e2e/
  fixtures.ts                # existe; solo lectura
  agenda.spec.ts  agenda-calendar.spec.ts  notas.spec.ts  pensum.spec.ts  ruta.spec.ts   # NUEVOS
```

Todo lo que está fuera de este subárbol queda fuera de alcance. Nunca edites `App.tsx` para montar
una vista: basta con crear `src/ui/views/<id>.tsx`. Nunca edites `package.json`, las
configuraciones, `e2e/fixtures.ts`, `src/data/pensum.seed.ts` ni `tests/fixtures/**`.

## Data model touched here

| Entity | Fields this epic adds or reads | Notes |
|---|---|---|
| `items` | lee y escribe todos los campos | Altas con `addManualItem`; cambios con `editRecord`; borrados con `removeRecord` |
| `grades` | lee y escribe todos los campos | Altas con `addManualGrade`; cambios y borrados por `merge.ts` |
| `subjects` | lee todo; escribe `status`, `credits`, `finalGrade`, `prereqIds` | Solo con `patchSubject(db, id, patch, "student")` |
| `settings` | `gradeScale`, `creditCap`, `courseCap`, `assumeCurrentPass` | `getSetting` y `setSetting` |

## Contracts

**Consumed** — ya existe, no lo reconstruyas:

| From | Interface | Guarantee |
|---|---|---|
| `01-foundation` | `db`, tipo `UniplanDb` de `@/src/db/db` | Única instancia de Dexie; nace sembrada con el pensum |
| `01-foundation` | `getSetting`, `setSetting`, `addManualItem`, `listVisibleItems`, `addManualGrade`, `listVisibleGrades` de `@/src/db/repo` | Validan con zod; rechazan la promesa si el dato es inválido |
| `01-foundation` | `editRecord`, `removeRecord`, `patchSubject` de `@/src/sync/merge` | Registran `overrides`; borrar un registro sincronizado lo oculta en vez de eliminarlo |
| `01-foundation` | `normalizeText` de `@/src/domain/text`; `detectCycles`, `dependentsOf`, `chainDepth`, `availability`, `progressStats` de `@/src/domain/pensum` | Funciones puras |
| `01-foundation` | Registro de vistas y tipo `SettingsSection` de `@/src/ui/views/ajustes` | Un archivo nuevo en `src/ui/views/` o en `src/ui/ajustes/sections/` se monta solo |

**Produced** — la épica siguiente depende de estas firmas exactas:

| Export | Signature | Used by |
|---|---|---|
| `src/domain/grades.ts` | `normalizeScore(score, maxScore, scale)`, `subjectAverage(grades, scale)`, `formatScore(n)` | `03-integrations` |
| `src/ui/views/notas.tsx` | `export default` de la vista; muestra cada nota con insignia de origen y la marca `editado` | `E3-T3` (e2e), `E3-T4` (la edita), `E3-T6` (e2e) |
| `src/ui/views/agenda.tsx` | `export default`; alta rápida y lista agrupada | `E3-T6` (e2e) |
| `src/ui/views/pensum.tsx` | `export default`; tarjetas con `data-subject-id` y `data-state` | `E3-T6` (e2e) |

## Conventions that bite in this area

- Solo tokens: `bg-surface`, `text-muted`, `border-border`, `rounded-card`. Ningún hex ni color
  arbitrario. El token `blocked` nunca es color de texto.
- El estado nunca se comunica solo con color: texto o icono con nombre accesible siempre.
- Todo control con etiqueta programática; todo botón con `type="button"` salvo el de envío.
- Cada superficie define cargando (`Cargando…` con `role="status"`), vacío y error
  (`role="alert"`).
- Lectura con `useLiveQuery` de `dexie-react-hooks`. Sin tienda global ni enrutador.
- La lógica va en funciones puras de `src/domain` que reciben `now: Date`. En las pruebas
  unitarias construye fechas con `new Date(año, mes, día, hora)`.
- No hay librería de pruebas de componentes: el comportamiento de la interfaz se prueba en `e2e/`.
- Cada spec arranca con un perfil vacío: la base trae el pensum sembrado y ningún ítem ni nota.
- Los textos entre comillas invertidas de los criterios son literales de interfaz: cópialos tal cual.

Reglas completas del proyecto: `CLAUDE.md`. Reglas por zona: `.claude/rules/ui-tokens.md`,
`.claude/rules/testing.md`, `.claude/rules/storage-merge.md`. Están en la raíz del proyecto.

---

## Tasks

En el mismo orden que `tasks.json`. Ese orden es el orden de construcción.

### `E2-T1` — Build agenda manual CRUD and grouped list

**Depends on:** `E1-T3`, `E1-T4`, `E1-T5` · **Priority:** p0 — metadato para recortes de alcance, no un orden

La Agenda es la vista por defecto. Primero la función pura de agrupación y su prueba; después la
vista con alta rápida, edición en línea, marca de hecha y borrado. Todas las escrituras pasan por
`addManualItem`, `editRecord` y `removeRecord`.

**Files**
- `src/domain/agenda.ts` — nuevo: `groupItems(items, now: Date)` → `{ hoy, semana, despues,
  sinFecha, vencidas }`, en hora local con `date-fns` (`startOfDay`, `endOfDay`, `endOfWeek` con
  `weekStartsOn: 1`). `vencidas`: `dueAt` anterior al inicio de hoy y `done` `false`. `hoy`: dentro
  de hoy. `semana`: después de hoy y hasta el fin de la semana. `despues`: posterior. `sinFecha`:
  `dueAt` `null`. Un ítem hecho con fecha anterior a hoy no aparece en ningún grupo. Orden dentro
  del grupo: `dueAt` ascendente y después `title`.
- `tests/domain/agenda.test.ts` — nuevo: criterio 1.
- `src/ui/agenda/ItemForm.tsx` — nuevo: formulario de alta y edición con `Título`, `Tipo`,
  `Materia` (lista de `subjects` más `Sin materia`), `Fecha y hora` (`datetime-local`), `Peso %` y
  `Notas`. Título vacío → `El título es obligatorio` con `role="alert"`. Convierte el valor local
  a ISO en UTC al guardar.
- `src/ui/views/agenda.tsx` — nuevo: `export default`. Alta rápida arriba (Enter agrega). Un
  `<h2>` por grupo, en este orden: `Hoy`, `Esta semana`, `Más adelante`, `Sin fecha`, `Vencidas`;
  los grupos vacíos no se muestran. Cada fila: casilla con `aria-label` `Marcar como hecha:
  <título>`, título, materia, fecha (`format` de `date-fns` con el locale `es`), insignia de origen
  (`Manual`, `SAC` o `Classroom`), la marca `editado` si `overrides` no está vacío, y los botones
  `Editar` y `Eliminar`; eliminar pide una segunda pulsación en `Confirmar eliminación`. Vacío: `No
  hay pendientes. Agrega el primero arriba.`
- `e2e/agenda.spec.ts` — nuevo: criterios 2 a 5.

**Acceptance**

Copiados del arreglo `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un comando de abajo, en este equipo, durante el build.

1. **WHEN** `groupItems` recibe ítems con fecha anterior a hoy sin hacer, de hoy, de esta semana, posteriores y sin fecha **THE SYSTEM SHALL** ubicar cada uno en `vencidas`, `hoy`, `semana`, `despues` y `sinFecha` respectivamente, tomando el lunes como inicio de semana.
2. **WHEN** el estudiante agrega desde el formulario rápido un ítem con título `Taller de grafos` y sin fecha **THE SYSTEM SHALL** mostrarlo bajo el encabezado `Sin fecha` con la insignia `Manual`, y seguir mostrándolo después de recargar la página.
3. **WHEN** el estudiante envía el formulario rápido con el título vacío **THE SYSTEM SHALL** mostrar el texto `El título es obligatorio` en un elemento con `role="alert"` y no crear ningún ítem.
4. **WHEN** el estudiante marca un ítem como hecho, edita su título o lo elimina **THE SYSTEM SHALL** reflejar el cambio en la lista sin recargar y conservarlo después de recargar.
5. **WHEN** no existe ningún ítem visible **THE SYSTEM SHALL** mostrar el texto `No hay pendientes. Agrega el primero arriba.`

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está correcta; el último saliendo con 0 es lo que la da por hecha.

```bash
pnpm test tests/domain/agenda.test.ts
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e e2e/agenda.spec.ts
pnpm e2e
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T1: Build agenda manual CRUD and grouped list"
git tag step-06-agenda
```

Ejecuta ambos después de que el último comando de **Verify** salga con 0 y antes de empezar la tarea siguiente. La etiqueta es el punto de retorno: si la tarea siguiente sale mal, `git reset --hard` a esta etiqueta.

### `E2-T2` — Add agenda month calendar and filters

**Depends on:** `E2-T1` · **Priority:** p1 — metadato para recortes de alcance, no un orden

Segunda forma de ver la misma agenda y filtros compartidos por ambas. No afirmes nombres de mes
en las pruebas: localiza las celdas por `data-date`.

**Files**
- `src/domain/calendar.ts` — nuevo: `monthMatrix(year, monthIndex): Date[][]` (semanas de 7 días
  que empiezan en lunes y cubren el mes). `dayKey(date): string` (`yyyy-MM-dd` en hora local).
  `itemsByDay(items): Map<string, Item[]>`. `filterItems(items, { subjectId, type })`, donde cada
  filtro vale un id o tipo, o `all`.
- `tests/domain/calendar.test.ts` — nuevo: criterios 1 y 2.
- `src/ui/agenda/MonthCalendar.tsx` — nuevo: cuadrícula del mes con los botones `Mes anterior` y
  `Mes siguiente`, título del mes, y una celda por día con `data-date` = `dayKey` y los títulos de
  ese día. Los días de otros meses van atenuados y sin `data-date`.
- `src/ui/views/agenda.tsx` — editar: pestañas `Lista` y `Calendario` (botones con
  `aria-pressed`) y dos `<select>` con las etiquetas `Materia` y `Tipo` (primera opción `Todas` y
  `Todos`) que filtran lista y calendario con `filterItems`.
- `e2e/agenda-calendar.spec.ts` — nuevo: criterios 3 a 5. Calcula en tiempo de ejecución una
  fecha del mes siguiente (día 15, 10:00), crea el ítem, abre `Calendario`, pulsa `Mes siguiente`
  y busca la celda por `data-date`.

**Acceptance**

Copiados del arreglo `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un comando de abajo, en este equipo, durante el build.

1. **WHEN** `monthMatrix` recibe un año y un mes **THE SYSTEM SHALL** devolver semanas de 7 días que empiezan en lunes y contienen todos los días de ese mes.
2. **WHEN** `filterItems` recibe un `subjectId` y un `type` **THE SYSTEM SHALL** devolver solo los ítems que coinciden con ambos, y devolver todos cuando ambos filtros valen `all`.
3. **WHEN** el estudiante crea un ítem con fecha y abre la pestaña `Calendario` en el mes de esa fecha **THE SYSTEM SHALL** mostrar el título del ítem dentro de la celda cuyo atributo `data-date` es esa fecha en formato `yyyy-MM-dd`.
4. **WHEN** el estudiante elige `parcial` en el filtro `Tipo` **THE SYSTEM SHALL** ocultar de la lista y del calendario los ítems de otros tipos.
5. **WHEN** el mes visible no tiene ítems **THE SYSTEM SHALL** renderizar una celda con `data-date` por cada día de ese mes y ningún título de ítem.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está correcta; el último saliendo con 0 es lo que la da por hecha.

```bash
pnpm test tests/domain/calendar.test.ts
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e e2e/agenda-calendar.spec.ts
pnpm e2e
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T2: Add agenda month calendar and filters"
git tag step-07-calendar
```

Ejecuta ambos después de que el último comando de **Verify** salga con 0 y antes de empezar la tarea siguiente. La etiqueta es el punto de retorno: si la tarea siguiente sale mal, `git reset --hard` a esta etiqueta.

### `E2-T3` — Build grades CRUD and averages

**Depends on:** `E1-T3`, `E1-T4`, `E1-T5` · **Priority:** p0 — metadato para recortes de alcance, no un orden

Promedios como funciones puras y la vista de Notas encima. Las notas se guardan en su escala
original (`score` y `maxScore`) y se normalizan al leer. El perfil nuevo ya trae materias
`cursando`, entre ellas `Cálculo integral`.

**Files**
- `src/domain/grades.ts` — nuevo: `normalizeScore(score, maxScore, scale)` = `scale.min + (score ÷
  maxScore) × (scale.max − scale.min)`. `subjectAverage(grades, scale)` → `{ average, weighted,
  gradedPct, neededForPass }`: lista vacía → `average` `null`; si todas tienen `weightPct`, media
  ponderada de las notas normalizadas, `gradedPct` = suma de pesos, `neededForPass` = `(scale.pass
  × 100 − Σ(nota normalizada × peso)) ÷ (100 − Σ pesos)` o `null` si los pesos suman 100; si
  alguna no tiene peso, media simple con `gradedPct` y `neededForPass` `null`. `formatScore(n)` =
  `n.toFixed(2)`.
- `tests/domain/grades.test.ts` — nuevo: criterios 1 a 3.
- `src/ui/views/notas.tsx` — nuevo: `export default`. Una tarjeta por materia `cursando` o con
  alguna nota visible: nombre, `Promedio: <formatScore>` (o `Sin notas`) y, cuando hay pesos,
  `Falta <100 − gradedPct>% por calificar` y `Necesitas <formatScore> en lo restante para pasar`;
  filas con etiqueta, valor y máximo, peso, insignia de origen y la marca `editado`; formulario
  con `Etiqueta`, `Nota`, `Máximo` (por defecto `scale.max`), `Peso %` y el botón `Agregar nota`;
  editar y eliminar con `editRecord` y `removeRecord`. Vacío: `Aún no hay materias en curso. Marca
  una como «cursando» en Pensum.`
- `src/ui/ajustes/sections/escala.tsx` — nuevo: `export default { id: "escala", order: 10, title:
  "Escala de notas", Section }`. Campos `Mínimo`, `Máximo`, `Nota aprobatoria` y el botón `Guardar
  escala`. Si no se cumple mínimo < aprobatoria ≤ máximo: `La nota aprobatoria debe estar entre el
  mínimo y el máximo` con `role="alert"`, y no guarda.
- `e2e/notas.spec.ts` — nuevo: criterios 4 y 5. Cuentas del criterio 4: 4 × 5 ÷ 5 = 4.00;
  (3 × 100 − 4 × 30) ÷ 70 = 2.571, que `toFixed(2)` muestra como `2.57`.

**Acceptance**

Copiados del arreglo `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un comando de abajo, en este equipo, durante el build.

1. **WHEN** `subjectAverage` recibe notas en las que todas tienen `weightPct` **THE SYSTEM SHALL** devolver la media ponderada en la escala configurada, `gradedPct` igual a la suma de pesos y `neededForPass` igual a `(pass × 100 − Σ(nota normalizada × peso)) ÷ (100 − Σ pesos)`.
2. **WHEN** alguna nota no tiene `weightPct` **THE SYSTEM SHALL** devolver la media simple con `gradedPct` y `neededForPass` nulos.
3. **WHEN** `subjectAverage` recibe una lista vacía **THE SYSTEM SHALL** devolver `average` nulo.
4. **WHEN** el estudiante agrega a `Cálculo integral` la nota `Parcial 1` con valor 4, máximo 5 y peso 30 **THE SYSTEM SHALL** mostrar `Promedio: 4.00`, `Falta 70% por calificar` y `Necesitas 2.57 en lo restante para pasar`.
5. **WHEN** el estudiante guarda en `Ajustes` una escala cuya nota aprobatoria es mayor que el máximo **THE SYSTEM SHALL** mostrar `La nota aprobatoria debe estar entre el mínimo y el máximo` y no cambiar la escala guardada.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está correcta; el último saliendo con 0 es lo que la da por hecha.

```bash
pnpm test tests/domain/grades.test.ts
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e e2e/notas.spec.ts
pnpm e2e
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T3: Build grades CRUD and averages"
git tag step-08-notas
```

Ejecuta ambos después de que el último comando de **Verify** salga con 0 y antes de empezar la tarea siguiente. La etiqueta es el punto de retorno: si la tarea siguiente sale mal, `git reset --hard` a esta etiqueta.

### `E2-T4` — Build pensum grid, edit panel and progress

**Depends on:** `E1-T3`, `E1-T4`, `E1-T5` · **Priority:** p0 — metadato para recortes de alcance, no un orden

Cuadrícula por año y semestre, al estilo de una malla curricular. Los estados "disponible" y
"bloqueada" se calculan con `availability`; no se guardan. Compara el avance leyendo
`aria-valuenow` antes y después, nunca contra un número fijo.

**Files**
- `src/ui/views/pensum.tsx` — nuevo: `export default`. Barra con `role="progressbar"`,
  `aria-valuemin="0"`, `aria-valuemax="100"` y `aria-valuenow` = `pctSubjects` redondeado, con el
  texto `<aprobadas> de <total> materias aprobadas`. Seis columnas con los encabezados `Año 1` a
  `Año 6`; el año N contiene los semestres 2N − 1 y 2N. Cada materia es un `<button
  type="button">` con `data-subject-id`, `data-state` (`availability` con
  `settings.assumeCurrentPass`) y el texto visible `Aprobada`, `Cursando`, `Disponible` o
  `Bloqueada`; la aprobada lleva el nombre tachado. Al recibir foco o puntero, sus prerrequisitos
  directos reciben `data-highlight="prereq"` y sus dependientes (`dependentsOf`)
  `data-highlight="dependent"`; al salir se quitan. Pulsarla abre el panel.
- `src/ui/pensum/SubjectPanel.tsx` — nuevo: `<aside aria-label="Editar materia">` con `Estado`,
  `Créditos` (vacío = `null`), `Nota definitiva`, `Prerrequisitos` (una casilla por cada otra
  materia) y los botones `Guardar` y `Cerrar`. Guarda con `patchSubject(db, id, patch,
  "student")`. Antes ejecuta `detectCycles` sobre el pensum con el cambio aplicado; si hay ciclo:
  `Ese prerrequisito crearía un ciclo` con `role="alert"`, y no guarda.
- `e2e/pensum.spec.ts` — nuevo: los cinco criterios.

**Acceptance**

Copiados del arreglo `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un comando de abajo, en este equipo, durante el build.

1. **WHEN** la vista `Pensum` carga con el pensum sembrado **THE SYSTEM SHALL** renderizar una tarjeta con `data-subject-id` por cada materia de `subjects`, bajo los encabezados `Año 1` a `Año 6`.
2. **WHEN** una materia `pendiente` tiene todos sus prerrequisitos `aprobada` o `cursando` **THE SYSTEM SHALL** marcar su tarjeta con `data-state="disponible"`, y con `data-state="bloqueada"` cuando alguno está `pendiente`.
3. **WHEN** la tarjeta `Cálculo integral` recibe foco **THE SYSTEM SHALL** marcar `Cálculo diferencial` con `data-highlight="prereq"` y `Cálculo multivariado y vectorial` con `data-highlight="dependent"`.
4. **WHEN** el estudiante cambia el estado de `Estadística y probabilidad` a `aprobada` en el panel lateral **THE SYSTEM SHALL** actualizar su tarjeta a `data-state="aprobada"` y aumentar el `aria-valuenow` de la barra de progreso.
5. **WHEN** el estudiante agrega `Cálculo integral` como prerrequisito de `Cálculo diferencial` **THE SYSTEM SHALL** mostrar `Ese prerrequisito crearía un ciclo` y no guardar el cambio.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está correcta; el último saliendo con 0 es lo que la da por hecha.

```bash
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e e2e/pensum.spec.ts
pnpm e2e
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T4: Build pensum grid, edit panel and progress"
git tag step-09-pensum-grid
```

Ejecuta ambos después de que el último comando de **Verify** salga con 0 y antes de empezar la tarea siguiente. La etiqueta es el punto de retorno: si la tarea siguiente sale mal, `git reset --hard` a esta etiqueta.

### `E2-T5` — Add the recommender engine and route view

**Depends on:** `E1-T3`, `E1-T4` · **Priority:** p0 — metadato para recortes de alcance, no un orden

Recomendador puro y determinista, sin IA y sin `localeCompare` (la colación depende del runtime).
No tiene en cuenta horarios: es un no-objetivo.

**Files**
- `src/domain/recommend.ts` — nuevo: `recommend(subjects, { creditCap, courseCap,
  assumeCurrentPass })` → arreglo de `{ subjectId, name, semester, unlockCount, chainDepth, score,
  reason }`. Candidatas: materias `pendiente` con `availability` `disponible`. `unlockCount` =
  tamaño de `dependentsOf`. `score` = `unlockCount × 10 + chainDepth × 5 − semester`. Orden:
  `score` descendente, `semester` ascendente, `normalizeText(name)` ascendente comparado con `<`.
  Selección voraz: si `creditCap` no es `null` y todas las candidatas tienen `credits`, toma en
  orden cada materia cuya suma no supere `creditCap`; en otro caso, las primeras `courseCap`.
  `reason`: con `unlockCount` 0 → `No desbloquea otras materias`; si no, `Desbloquea <n> materia;
  cadena de <d> semestre`, con `materias` y `semestres` cuando el número no es 1.
- `tests/domain/recommend.test.ts` — nuevo: criterios 1 a 4 con este grafo — `A` (semestre 1,
  aprobada); `B` (2, pendiente, exige `A`); `C` (3, pendiente, exige `B`); `D` (3, pendiente,
  exige `B`); `E` (2, pendiente, sin prerrequisitos); `F` (4, pendiente, exige `C`). Calculado a
  mano: `B` tiene `unlockCount` 3 (`C`, `D`, `F`), `chainDepth` 2 (`B→C→F`), `score` 3 × 10 + 2 × 5
  − 2 = 38; `E` tiene `score` −2.
- `src/ui/views/ruta.tsx` — nuevo: `export default`. Controles `Tope de materias` (número), `Tope
  de créditos` (vacío = sin tope) y la casilla `Asumir que apruebo lo que estoy cursando`,
  guardados con `setSetting`. Encabezado `Recomendadas para el próximo semestre` y una `<ol>` con
  un `<li data-subject-id>` por materia: nombre, semestre y `reason`. Nota fija: `La recomendación
  no tiene en cuenta horarios.` Vacío: `No hay materias disponibles para recomendar.`
- `e2e/ruta.spec.ts` — nuevo: criterio 5.

**Acceptance**

Copiados del arreglo `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un comando de abajo, en este equipo, durante el build.

1. **WHEN** `recommend` recibe el grafo de prueba con `A` aprobada y `courseCap` 1 **THE SYSTEM SHALL** devolver solo `B` con `unlockCount` 3, `chainDepth` 2, `score` 38 y `reason` `Desbloquea 3 materias; cadena de 2 semestres`.
2. **WHEN** `B` está `cursando` y `assumeCurrentPass` es `false` **THE SYSTEM SHALL** excluir `C` y `D` de las candidatas, e incluirlas cuando `assumeCurrentPass` es `true`.
3. **WHEN** `creditCap` está definido y todas las candidatas tienen `credits` **THE SYSTEM SHALL** elegir en orden de puntaje sin que la suma de créditos supere `creditCap`, y limitar por `courseCap` cuando alguna candidata tiene `credits` nulo.
4. **WHEN** dos candidatas empatan en puntaje **THE SYSTEM SHALL** ordenar primero la de menor `semester` y después por nombre normalizado ascendente.
5. **WHEN** el estudiante cambia `Tope de materias` a 2 en la vista `Ruta` **THE SYSTEM SHALL** listar exactamente 2 materias recomendadas, cada una con su texto de motivo.

**Verify** — todos los comandos, en orden, desde la raíz del proyecto. Cada uno sale con 0 cuando la tarea está correcta; el último saliendo con 0 es lo que la da por hecha.

```bash
pnpm test tests/domain/recommend.test.ts
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e e2e/ruta.spec.ts
pnpm e2e
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T5: Add the recommender engine and route view"
git tag step-10-recommender
```

Ejecuta ambos después de que el último comando de **Verify** salga con 0 y antes de empezar la tarea siguiente. La etiqueta es el punto de retorno: si la tarea siguiente sale mal, `git reset --hard` a esta etiqueta.

---

## Epic acceptance

La épica está hecha cuando cada tarea está `done` **y**:

1. **WHEN** el estudiante recorre `Agenda`, `Notas`, `Pensum` y `Ruta` con un perfil nuevo **THE SYSTEM SHALL** mostrar cada vista con sus datos sembrados o su estado vacío, sin el texto `Vista en construcción.`
2. **WHEN** un formulario recibe un dato inválido **THE SYSTEM SHALL** mostrar un mensaje con `role="alert"` y no escribir en la base.

```bash
pnpm build && pnpm typecheck && pnpm lint && pnpm test
pnpm e2e
```

## Pitfalls

- **Fechas dependientes de la zona horaria** — guarda ISO en UTC, agrupa en hora local, y en las
  pruebas unitarias construye fechas con el constructor local.
- **Afirmar nombres de mes o de día** — salen de los datos de locale de `date-fns`; usa `data-date`.
- **Escribir `overrides` a mano desde un componente** — usa `editRecord` y `patchSubject`.
- **Un ciclo de prerrequisitos** — deja inservibles `chainDepth` y el recomendador; valida antes
  de guardar.
- **Nombres de iconos de `lucide-react`** — si uno no existe, `pnpm typecheck` lo dice; usa el
  exportado más cercano.
- **Romper `e2e/shell.spec.ts`** — el riel, sus cinco botones y el `h1` no se tocan.

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
