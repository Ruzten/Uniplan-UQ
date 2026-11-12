---
description: Interfaz del panel - tokens, accesibilidad y registro de vistas
paths:
  - "entrypoints/dashboard/**"
  - "src/ui/**"
---

# Interfaz del panel

- Solo tema oscuro. Los colores, radios y tipografías salen de los tokens `@theme` de
  `entrypoints/dashboard/style.css`. Prohibido un hex o un color arbitrario en un componente
  (un valor entre corchetes como clase de Tailwind); usa `bg-surface`, `text-muted`,
  `border-border` y `rounded-card`.
- Excepción única: el content script del SAC, que vive en un shadow root sin acceso a los tokens.
- El token `blocked` es decorativo. Nunca es color de texto ni el único indicador de un estado.
- El estado nunca se comunica solo con color: cada tarjeta, insignia o aviso lleva texto o icono
  con nombre accesible.
- Todo control tiene etiqueta programática (`<label>`, `aria-label` o `aria-labelledby`). Todo
  botón lleva `type="button"` salvo el de envío de un formulario.
- Todo es operable con teclado. El foco visible es `outline: 2px solid var(--color-accent)` con
  `outline-offset: 2px`, definido una vez en `style.css` sobre `:focus-visible`.
- Movimiento: 150 ms `ease-out`, solo `opacity` y `transform`, y desactivado bajo
  `prefers-reduced-motion: reduce`.
- Cada lista y cada superficie asíncrona define sus tres estados: cargando (`role="status"`),
  vacío (texto que dice qué hacer) y error (`role="alert"`).
- Los datos se leen con `useLiveQuery` de `dexie-react-hooks`; no hay librería de estado global
  ni enrutador. La vista activa se guarda en `settings.activeView`.
- Una vista es un archivo `src/ui/views/<id>.tsx` con `export default` del componente; el
  registro de `src/ui/views.tsx` la descubre con `import.meta.glob`. No edites `App.tsx` para
  montar una vista.
- Una sección de Ajustes es un archivo `src/ui/ajustes/sections/<nombre>.tsx` con
  `export default` de `{ id, order, title, Section }`; `src/ui/views/ajustes.tsx` la descubre sola.
- El `h1` con el texto `Uniplan UQ` del riel no se elimina ni se renombra: lo vigila
  `e2e/smoke.spec.ts`.
- Textos de interfaz en español de Colombia. Identificadores y nombres de archivo en inglés.
- Iconos de `lucide-react`. Si un nombre de icono no existe en la versión instalada, `pnpm
  typecheck` lo dice; elige el exportado más cercano y sigue.
- No hay librería de pruebas de componentes: la lógica va en funciones puras con pruebas de
  vitest y el comportamiento de la interfaz se prueba con Playwright contra el build.
