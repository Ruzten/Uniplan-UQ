---
description: Capa de datos Dexie, esquemas zod y motor de fusión
paths:
  - "src/db/**"
  - "src/domain/schemas.ts"
  - "src/sync/merge.ts"
  - "src/domain/backup.ts"
---

# Datos y fusión

- `src/domain/schemas.ts` es la única fuente de tipos de datos: los tipos se infieren de los
  esquemas zod. No escribas a mano un tipo que duplique un esquema.
- `src/db/db.ts` es el único archivo que crea una instancia de Dexie. Los demás reciben la
  instancia como primer parámetro (`db: UniplanDb`), lo que permite probar con bases de nombre
  único sobre `fake-indexeddb`.
- Toda escritura valida con el esquema zod antes de tocar la tabla.
- Un cambio de índices o tablas es una versión nueva: agrega `version(2).stores(...)` debajo de la
  versión 1 en `applySchema`; nunca edites la declaración de una versión ya publicada.
- IndexedDB no indexa booleanos ni `null`: `hidden` y `done` se filtran en memoria.
- Los ids son `crypto.randomUUID()`, salvo `subjects`, que usa el slug estable de `slugify(name)`.
- Fechas: `dueAt`, `createdAt`, `updatedAt` son cadenas ISO en UTC (`toISOString()`). La hora local
  solo aparece al mostrar o agrupar.
- Ediciones y borrados del estudiante pasan por `editRecord`, `removeRecord` y `patchSubject` de
  `src/sync/merge.ts`. Nunca escribas `overrides` ni `hidden` a mano desde la interfaz.
- Una sincronización hace upsert por (`source`, `externalId`), nunca pisa un campo listado en
  `overrides`, nunca revive una fila con `hidden: true` y nunca borra filas ausentes del lote.
- Cada sincronización escribe una fila en `syncRuns` mediante `runSync`, incluso cuando falla.
- La semilla del pensum se carga solo en el evento `populate` de Dexie (creación de la base).
- Las pruebas afirman propiedades y valores, nunca el texto de un mensaje de error de zod o Dexie.
