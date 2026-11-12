# Presupuesto de permisos — Uniplan UQ

Cada permiso que declara el manifiesto generado aparece aquí con su razón. La prueba
`permission budget` de `e2e/smoke.spec.ts` falla si el manifiesto construido declara algo que
no esté en esta lista entre comillas invertidas. Para agregar un permiso: primero esta tabla,
después `wxt.config.ts`, después las listas esperadas de `e2e/smoke.spec.ts`.

## Permisos de API

| Permiso | Para qué lo usa la extensión | Qué no hace con él |
|---|---|---|
| `storage` | Guardar el token temporal de Classroom en `browser.storage.session` | No guarda contraseñas ni credenciales del SAC |
| `unlimitedStorage` | Evitar que el navegador borre la base local (IndexedDB) al crecer | No sincroniza nada con la nube |
| `alarms` | Despertar el service worker cada 60 minutos para revisar recordatorios | No programa trabajo sin relación con recordatorios |
| `notifications` | Mostrar el aviso de una tarea o parcial que está por vencer | No muestra publicidad ni avisos de terceros |
| `identity` | Abrir la ventana de consentimiento de Google (`launchWebAuthFlow`) para Classroom | No lee la identidad del perfil del navegador |

## Permisos de host

| Host | Para qué | Qué no hace |
|---|---|---|
| `https://sac.uniquindio.edu.co/*` | Leer las tablas de las páginas del SAC que el estudiante tiene abiertas | Nunca hace clic, envía formularios, navega ni matricula en el SAC |
| `https://classroom.googleapis.com/*` | Leer cursos, tareas, entregas y materiales con alcances de solo lectura | Nunca escribe en Classroom |
| `https://aulasvirtuales.uniquindio.edu.co/*` | Con la sesión que el estudiante ya tiene abierta en Aulas Virtuales (Moodle), leer sus cursos, las actividades con fecha de entrega y su reporte de calificaciones | Nunca pide, guarda ni escribe la contraseña; nunca entrega, envía formularios ni cambia nada en Moodle |

## Lo que la extensión no pide

No pide acceso a pestañas, inyección dinámica de scripts, descargas, cookies ni a todos los
sitios (se nombran aquí sin comillas invertidas a propósito, para que la prueba no los tome por
aprobados). Ningún dato sale
del equipo salvo las llamadas a `classroom.googleapis.com`, al consentimiento OAuth de Google y
las consultas de solo lectura a Aulas Virtuales con la sesión del propio estudiante.
