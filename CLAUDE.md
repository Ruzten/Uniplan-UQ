# Uniplan UQ

Extensión de navegador personal (MV3) que le muestra a un estudiante de Ingeniería de Sistemas de
la Universidad del Quindío sus tareas, parciales, notas, pensum y la ruta de matrícula sugerida.

## Comandos

| Tarea | Comando |
|---|---|
| Instalar | `pnpm install` (el `postinstall` corre `wxt prepare` y genera `.wxt/`) |
| Build estático | `pnpm build` — salida en `.output/chrome-mv3` |
| Desarrollo | `pnpm dev` — solo para iterar a mano; ninguna compuerta lo usa |
| Tipos | `pnpm typecheck` — siempre después de `pnpm build` |
| Lint | `pnpm lint` |
| Formato + arreglos seguros | `pnpm format` |
| Unitarias | `pnpm test` · un archivo: `pnpm test tests/db/repo.test.ts` |
| E2E | `pnpm e2e` · un spec: `pnpm e2e e2e/smoke.spec.ts` |
| Navegador de pruebas | `pnpm exec playwright install chromium` |

**Compuerta:** `pnpm build && pnpm typecheck && pnpm lint && pnpm test && pnpm e2e` debe pasar
antes de marcar cualquier tarea como hecha.

Orden obligatorio al terminar de escribir código: `pnpm format` → `pnpm build` → `pnpm typecheck`
→ `pnpm lint` → `pnpm test` → `pnpm e2e`. `pnpm build` regenera los tipos de `.wxt/` (rutas de
entrypoints y auto-imports); sin él, `pnpm typecheck` falla por rutas que aún no conoce.

Node está fijado en `.nvmrc`. Las versiones de dependencias viven en `package.json` y en
`pnpm-lock.yaml`: léelas ahí, nunca las adivines. Los comandos corren en Git Bash sobre Windows.

## Stack

WXT · TypeScript · React · Tailwind (tokens `@theme`) · Dexie sobre IndexedDB · zod · Vitest +
happy-dom + fake-indexeddb · Playwright · Biome · pnpm. Sin servidor, sin cuentas, sin telemetría.

## Arquitectura

**Recorrido de un dato del SAC.** El estudiante abre una página del SAC ya autenticado →
`entrypoints/sac.content.ts` muestra el botón flotante → al pulsarlo, `src/sync/sac-extract.ts`
convierte cada `<table>` en `{ headers, rows }` → `sendMessage` de `src/sync/messages.ts` lo envía
al service worker → `entrypoints/background.ts` lo enruta a `src/sync/sac-import.ts` →
`src/domain/sac.ts` clasifica cada tabla por sus encabezados → `src/sync/merge.ts` hace upsert en
Dexie (`src/db/db.ts`) → el panel (`entrypoints/dashboard/`) se actualiza solo con `useLiveQuery`.

**Recorrido de una edición manual.** Vista en `src/ui/views/*.tsx` → `editRecord` /
`removeRecord` / `patchSubject` de `src/sync/merge.ts` → Dexie. Nunca se escribe una tabla
directamente desde un componente.

**Límites.** Cruzar uno al revés rompe el build o una compuerta:

| Capa | Puede importar de | Nunca |
|---|---|---|
| `entrypoints/**` | `src/**` | Guardar estado en variables de módulo (background) |
| `src/ui/**` | `src/domain`, `src/db`, `src/sync` | Llamar `browser.runtime.*Message` ni `fetch` |
| `src/sync/**` | `src/domain`, `src/db` | Importar React o algo de `src/ui` |
| `src/db/**` | `src/domain`, `src/data` | Importar de `src/sync` o `src/ui` |
| `src/domain/**` | otros archivos de `src/domain` | Importar Dexie, `browser`, React o tocar el DOM |
| `e2e/**` | `./fixtures`, `node:*` | Importar de `src/` o usar el alias `@/` |

**Dónde vive cada cosa.**

| Asunto | Fuente única |
|---|---|
| Tipos y validación de datos | `src/domain/schemas.ts` (esquemas zod; los tipos se infieren) |
| Esquema de la base | `src/db/db.ts` (`SCHEMA_V1`, `applySchema`, `createDb`) |
| Valores por defecto de ajustes | `DEFAULT_SETTINGS` en `src/domain/schemas.ts` |
| Fusión, ediciones, borrados | `src/sync/merge.ts` |
| Contrato de mensajes | `src/sync/messages.ts` |
| Aulas Virtuales (Moodle) | `src/domain/moodle.ts` (mapeo) + `src/sync/moodle-client.ts` (sesión y lectura) |
| Pensum inicial | `src/data/pensum.seed.ts` (texto) → `parsePensumSeed` en `src/domain/pensum.ts` |
| Pensum propio (formato compartible) | `parsePensumText` / `pensumToText` en `src/domain/pensum-text.ts` |
| Permisos | `wxt.config.ts` + `PERMISSIONS.md` + listas de `e2e/smoke.spec.ts` |
| Tokens de diseño | bloque `@theme` de `entrypoints/dashboard/style.css` |
| Vistas | `src/ui/views/<id>.tsx`, descubiertas por `src/ui/views.tsx` |
| Secciones de Ajustes | `src/ui/ajustes/sections/*.tsx`, descubiertas por `src/ui/views/ajustes.tsx` |

## Reglas de código

1. **Importaciones:** alias `@/` desde la raíz (`@/src/db/db`) o relativas, siempre sin extensión.
   En `e2e/` solo relativas. No existen scripts sueltos tipo `node script.ts`: todo corre por
   `wxt`, `vitest` o `playwright`. No crees uno.
2. **Un componente por archivo, máximo 250 líneas.** Más largo se divide.
3. **Lógica en funciones puras** dentro de `src/domain/`, con prueba en `tests/`. Los componentes
   solo componen. Las funciones que dependen de la hora reciben `now: Date`.
4. **Valida en el borde:** todo lo que entra desde un formulario, un mensaje, un archivo de
   respaldo, el SAC o Classroom pasa por un esquema zod antes de tocar la base.
5. **Resultados tipados:** `{ ok: true, data } | { ok: false, error: { code, message } }`. Códigos
   permitidos: `unknown_message`, `not_implemented`, `handler_error`, `invalid_backup`,
   `auth_required`, `classroom_http_error`.
6. **Sin archivos barril** y sin dependencias nuevas. `package.json` lo entrega el blueprint.
7. **Tipos estrictos:** `noUncheckedIndexedAccess` está activo; nada de `any` ni de `!`.
   Importa tipos con `import type`.
8. **Ningún paso edita** `package.json`, `wxt.config.ts`, `tsconfig.json`, `biome.json`,
   `vitest.config.ts`, `playwright.config.ts`, `e2e/fixtures.ts`, `e2e/smoke.spec.ts`,
   `src/data/pensum.seed.ts`,
   `PERMISSIONS.md` ni `tests/fixtures/**`. Si un paso parece exigirlo, detente y repórtalo.
9. **Textos de interfaz en español de Colombia;** identificadores, archivos y commits en inglés.

## Sistema de diseño

Solo tema oscuro, estilo plano "Black Teal". Los componentes usan nombres de token, nunca un
hex. Las piezas repetidas (`card`, `btn`, `field`, `badge`, `segmented`, `data-table`, `empty`)
viven en `@layer components` de `entrypoints/dashboard/style.css`.

| Rol | Token | Valor | Uso |
|---|---|---|---|
| Fondo | `bg` | `#000000` | Página |
| Superficie | `surface` | `#0A0A0A` | Tarjetas, paneles, riel |
| Superficie 2 | `surface-2` | `#161616` | Controles, filas resaltadas |
| Borde | `border` | `#242424` | Divisores, contornos |
| Texto | `text` | `#EDEDED` | Cuerpo |
| Texto atenuado | `muted` | `#A1A1A1` | Secundario, marcadores |
| Acento | `accent` | `#2DD4BF` | Activo, foco, "disponible" |
| Éxito / aprobada | `success` | `#A3E635` | Aprobada, confirmaciones |
| Info / cursando | `info` | `#60A5FA` | Cursando |
| Advertencia | `warning` | `#FBBF24` | Vence pronto, aviso de respaldo |
| Peligro | `danger` | `#F87171` | Errores, vencidas, eliminar |
| Bloqueada | `blocked` | `#525252` | Solo decorativo; nunca texto |

- **Tipografía:** `"Segoe UI Variable", "Segoe UI", system-ui, sans-serif`; mono
  `"Cascadia Code", Consolas, monospace`. Sin fuentes de red. Pesos 400 / 500 / 600 en texto; 700 / 800 en títulos (`font-bold`, `font-extrabold`, `tracking-tight`).
- **Escala:** 12 / 13 / 14 / 16 / 20 / 28 px. Cuerpo 14 px con interlineado 1.5.
- **Espaciado:** base 4 px — 4, 8, 12, 16, 24, 32, 48. Sin valores arbitrarios.
- **Radio:** 16 px tarjetas (`rounded-card`), 10 px controles (`rounded-control`).
- **Elevación:** plana. Bordes de 1 px, sin sombras.
- **Movimiento:** 150 ms `ease-out`, solo `opacity` y `transform`; respeta `prefers-reduced-motion`.
- **Layout:** ancho máximo de contenido 1200 px; riel de navegación a la izquierda con 5 iconos
  y etiquetas. Solo escritorio (ancho mínimo de diseño 1024 px).
- **Foco:** `outline: 2px solid` acento, `outline-offset: 2px`, en `:focus-visible`.

## Entorno

No hay variables de entorno ni archivo `.env`. El ID de cliente de Google es un dato que el
estudiante escribe en Ajustes y se guarda en `settings`; nunca va en el código ni en el build.

## Reglas diferidas

Lee el archivo correspondiente antes de editar esa zona:

| Archivo | Aplica a |
|---|---|
| `.claude/rules/background-worker.md` | `entrypoints/background.ts`, `src/sync/messages.ts`, `src/sync/reminders.ts` |
| `.claude/rules/sac-readonly.md` | `entrypoints/sac.content.ts`, `src/sync/sac-*.ts`, `src/domain/sac.ts`, `tests/fixtures/sac/**` |
| `.claude/rules/storage-merge.md` | `src/db/**`, `src/domain/schemas.ts`, `src/sync/merge.ts`, `src/domain/backup.ts` |
| `.claude/rules/ui-tokens.md` | `entrypoints/dashboard/**`, `src/ui/**` |
| `.claude/rules/testing.md` | `tests/**`, `e2e/**`, `vitest.config.ts`, `playwright.config.ts` |

## Orden de construcción

`blueprints/uniplan-uq/tasks.json` decide qué sigue; `blueprints/uniplan-uq/epics/*.md` dice cómo.
Un commit y una etiqueta `step-NN-<slug>` por tarea. No se construye nada de la lista de
no-objetivos: app móvil, sincronización desatendida del SAC, escritura en el SAC, lectura de PDF
de actas, IA, publicación en tiendas, otros navegadores, multiusuario, tema claro.

## Innegociables

1. Nunca guardar, escribir ni automatizar credenciales o el inicio de sesión del SAC.
2. El SAC es de solo lectura: nunca clic, envío, navegación ni matrícula.
3. Nada sale del equipo salvo las llamadas a `classroom.googleapis.com`, el consentimiento OAuth
   de Google y las consultas de solo lectura a `aulasvirtuales.uniquindio.edu.co` con la sesión
   que el estudiante ya tiene abierta (nunca su contraseña). Sin telemetría, sin reporte de
   errores a terceros, sin fuentes ni scripts remotos.
4. Una sincronización nunca pisa un campo editado por el estudiante, nunca revive algo que él
   borró y nunca borra datos, ni siquiera cuando falla a medias.
5. El service worker no guarda estado en variables de módulo y usa alarmas, no temporizadores.
6. Nunca agregar un permiso al manifiesto sin su fila en `PERMISSIONS.md`.
7. Nunca editar un comando de verificación ni un archivo de `tests/fixtures/` para pasar una prueba.
8. Nunca marcar una tarea como hecha con la compuerta en rojo.
