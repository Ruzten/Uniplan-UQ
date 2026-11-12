---
description: Convenciones de pruebas unitarias (vitest) y de extremo a extremo (Playwright)
paths:
  - "tests/**"
  - "e2e/**"
  - "vitest.config.ts"
  - "playwright.config.ts"
---

# Pruebas

- Unitarias: `tests/**/*.test.ts`, vitest con entorno `happy-dom`, `fake-indexeddb` cargado en
  `vitest.setup.ts` y el plugin `WxtVitest()` (alias `@/` y `fakeBrowser`).
- Cada prueba que usa la base crea la suya: `createDb("uniplan-test-" + crypto.randomUUID())`.
  Ninguna prueba depende del orden ni comparte estado con otra.
- Las funciones que dependen del reloj reciben `now: Date`. En pruebas, construye fechas locales
  con `new Date(año, mes, día, hora)` para que el resultado no dependa de la zona horaria.
- La red nunca se toca: el cliente de Classroom recibe `fetchImpl` inyectado y las pruebas le
  pasan un `vi.fn` que responde con los archivos de `tests/fixtures/classroom/`.
- E2E: `e2e/*.spec.ts`, Playwright sobre el build estático `.output/chrome-mv3`. Ejecuta siempre
  `pnpm build` antes de `pnpm e2e`. Nunca contra el servidor de desarrollo.
- Los specs importan `test` y `expect` de `./fixtures` y nada de `src/` (Playwright no conoce el
  alias `@/`). Solo importaciones relativas o de `node:`.
- Cada spec arranca con un perfil vacío: la base está recién sembrada con el pensum.
- La página del SAC se simula con `context.route("https://sac.uniquindio.edu.co/sgacampus/**")`
  respondiendo `tests/fixtures/sac/sac-page.html`. Ningún spec sale a internet.
- Nada de `.skip(` ni `.only(`. `playwright.config.ts` tiene `forbidOnly: true` y el paso 16 lo
  vigila con `grep`.
- Afirma propiedades antes que conteos. Un número solo se afirma cuando sale de un archivo de
  `tests/fixtures/` o es el requisito mismo.
- No edites un comando de verificación ni un archivo de `tests/fixtures/` para que una prueba pase.
