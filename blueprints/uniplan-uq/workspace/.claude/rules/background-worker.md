---
description: Reglas del service worker MV3 y del contrato de mensajes
paths:
  - "entrypoints/background.ts"
  - "src/sync/messages.ts"
  - "src/sync/reminders.ts"
---

# Service worker (MV3)

- El navegador mata el worker en cualquier momento. Cero estado en variables de módulo: todo
  estado vive en Dexie (`src/db/db.ts`) o en `browser.storage.session`.
- Todos los listeners (`action.onClicked`, `runtime.onInstalled`, `runtime.onStartup`,
  `alarms.onAlarm`, el router de mensajes) se registran de forma síncrona en el cuerpo de
  `defineBackground(() => { ... })`, nunca dentro de un `await`, un `then` ni un `setTimeout`.
- Esperas largas usan `browser.alarms`, nunca `setTimeout` ni `setInterval`.
- `browser.runtime.sendMessage` y `browser.runtime.onMessage` solo se tocan dentro de
  `src/sync/messages.ts`. El resto del código usa `sendMessage()` y `registerRouter()` de ese
  módulo. Un `grep` en el paso 11 lo vigila.
- Todo mensaje pasa por `handleMessage`, que valida con zod. Un tipo desconocido responde
  `{ ok: false, error: { code: "unknown_message", message } }`; nunca se descarta en silencio.
- Los manejadores devuelven `Result`; un error lanzado se convierte en `handler_error`.
- `defineBackground` y `browser` son auto-importados por WXT en `entrypoints/`. En `src/` importa
  `browser` desde `"wxt/browser"`.
- La extensión no tiene popup: `action: {}` y el clic en el icono abre o enfoca el panel.
- No agregues permisos. El conjunto está fijado en `wxt.config.ts`, justificado en
  `PERMISSIONS.md` y vigilado por `e2e/smoke.spec.ts`.
