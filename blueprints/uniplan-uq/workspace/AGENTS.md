# Uniplan UQ — instrucciones para agentes

Extensión de navegador personal (MV3, WXT + React) que reúne tareas, parciales, notas, pensum y
ruta de matrícula de un estudiante de la Universidad del Quindío. Sin servidor.

## Comandos

| Tarea | Comando |
|---|---|
| Instalar | `pnpm install` |
| Build estático | `pnpm build` — salida en `.output/chrome-mv3` |
| Tipos | `pnpm typecheck` (después de `pnpm build`) |
| Lint / formato | `pnpm lint` · `pnpm format` |
| Unitarias | `pnpm test` · un archivo: `pnpm test tests/db/repo.test.ts` |
| E2E | `pnpm e2e` · un spec: `pnpm e2e e2e/smoke.spec.ts` |

**Compuerta:** `pnpm build && pnpm typecheck && pnpm lint && pnpm test && pnpm e2e`.

## Innegociables

1. Nunca guardar, escribir ni automatizar credenciales o el inicio de sesión del SAC.
2. El SAC es de solo lectura: nunca clic, envío, navegación ni matrícula.
3. Nada sale del equipo salvo `classroom.googleapis.com` y el consentimiento OAuth de Google.
4. Una sincronización nunca pisa un campo editado por el estudiante ni borra datos.
5. El service worker no guarda estado en variables de módulo.
6. No agregar permisos ni dependencias, ni editar `package.json`, los archivos de configuración o
   `tests/fixtures/`.
7. Nunca marcar una tarea como hecha con la compuerta en rojo.

Arquitectura, límites y tokens de diseño: ver `CLAUDE.md` en este directorio. Orden de
construcción: `blueprints/uniplan-uq/tasks.json` y `blueprints/uniplan-uq/epics/`.
