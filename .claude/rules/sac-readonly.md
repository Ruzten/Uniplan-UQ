---
description: La integración con el SAC es de solo lectura y guiada por encabezados
paths:
  - "entrypoints/sac.content.ts"
  - "src/sync/sac-extract.ts"
  - "src/sync/sac-import.ts"
  - "src/domain/sac.ts"
  - "tests/fixtures/sac/**"
---

# SAC: solo lectura

- El content script nunca hace clic, envía formularios, navega, abre ventanas ni hace peticiones
  de red en el SAC. Prohibido en `entrypoints/sac.content.ts` y `src/sync/sac-extract.ts`:
  `.click(`, `.submit(`, `location.href`, `location.assign`, `location.replace`, `window.open`,
  `fetch(`, `XMLHttpRequest`. Un `grep` en el paso 12 lo vigila. Para la URL usa `document.URL`.
- Nunca se automatiza el inicio de sesión ni se leen, guardan o escriben credenciales.
- Lo único que el script agrega a la página es su propio host `div#uniplan-sac-host` con un
  shadow root abierto. Los estilos van dentro del shadow root con valores literales.
- "Guardar muestra" no dispara una descarga por código: muestra un enlace
  `<a download="uniplan-sac-muestra.json">Descargar muestra</a>` que pulsa el estudiante.
- El análisis es por texto de encabezado normalizado (minúsculas, sin tildes, sin espacios
  sobrantes), nunca por selectores CSS, ids o posiciones de columna fijas.
- Los sinónimos de encabezados son datos (`settings.headerSynonyms`), editables en Ajustes. Para
  reconocer una columna nueva se agrega un sinónimo, no una rama de código.
- Una tabla que no se reconoce se ignora y se cuenta; nunca borra ni modifica datos.
- Las muestras de `tests/fixtures/sac/` son sintéticas y están marcadas como tales. No las
  presentes como datos reales ni las edites para "parecerse" a una pantalla que no has visto.
- Los archivos de `tests/fixtures/` los entrega el blueprint. No los modifiques para que una
  prueba pase.
