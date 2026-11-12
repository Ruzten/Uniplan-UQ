# Uniplan UQ

Extensión para Chrome y Brave que reúne en un solo panel lo que un estudiante de la Universidad
del Quindío revisa en cinco sitios distintos: tareas y parciales, notas, pensum, horario y la ruta
sugerida para la próxima matrícula.

- **Agenda:** pendientes de Classroom, Aulas Virtuales y los que agregues a mano, con calendario,
  horario semanal y recordatorios antes de cada entrega.
- **Notas:** componentes del SAC con su peso, acumulado (lo pendiente cuenta 0), cuánto necesitas
  para pasar y un simulador «¿Y si saco…?». Las actividades de Classroom y Aulas Virtuales se
  promedian como nota de seguimiento.
- **Pensum:** malla por semestres con flechas de prerrequisitos; carga el de tu carrera.
- **Ruta:** materias recomendadas para matricular según lo que ya aprobaste.

Todo se guarda **solo en tu navegador**. No hay servidor, cuentas ni telemetría.

## Instalar

1. Ve a **[Releases](../../releases/latest)** y descarga `uniplan-uq-<versión>-chrome.zip`.
2. Descomprímelo en una carpeta que no vayas a borrar, por ejemplo `Documentos\Uniplan`.
3. Abre `chrome://extensions` (en Brave, `brave://extensions`).
4. Activa **Modo de desarrollador** (arriba a la derecha).
5. Pulsa **Cargar descomprimida** y elige la carpeta del paso 2 (la que contiene
   `manifest.json`).
6. Fija Uniplan con el ícono de rompecabezas y haz clic en él para abrir el panel.

**Actualizar:** descarga el ZIP nuevo, reemplaza el contenido de la misma carpeta y pulsa el botón
de recargar de Uniplan en `chrome://extensions`. Tus datos se conservan.

## Configurar (10 minutos)

### 1. Tu pensum
- Si estudias **Ingeniería de Sistemas**, el pensum ya viene cargado con todo pendiente: entra a
  **Pensum** y haz clic en cada materia para marcar las que aprobaste o estás cursando.
- Si estudias otra carrera, ve a **Ajustes → Pensum y carrera → Cargar mi pensum**. Puedes pegar la
  lista (`semestre | nombre | créditos | prerrequisitos`), subir el archivo que exportó un
  compañero o descargar la plantilla.

### 2. SAC (notas oficiales y horario)
1. Inicia sesión en el SAC como siempre y abre tu **reporte de notas** o tu **horario**.
2. Pulsa el botón flotante **Importar a Uniplan**. Uniplan solo lee la página: nunca hace clic,
   envía formularios ni matricula.

### 3. Aulas Virtuales (Moodle)
1. Inicia sesión en [Aulas Virtuales](https://aulasvirtuales.uniquindio.edu.co) en el mismo
   navegador.
2. En Uniplan ve a **Ajustes → Aulas Virtuales (Moodle) → Sincronizar ahora**.
3. Desde ahí se actualiza sola al abrir Uniplan (máximo una vez por hora). Usa tu sesión abierta:
   no pide ni guarda tu contraseña.

### 4. Google Classroom (opcional)
Google exige un «ID de cliente» para que una app lea Classroom. Una persona del grupo lo crea y los
demás lo usan:
1. En **Ajustes → Google Classroom** elige **Un compañero ya lo configuró** y copia la
   **solicitud de acceso**.
2. Envíasela a quien administra el ID junto con tu **correo institucional**; te agrega como
   usuario de prueba.
3. Pega el ID de cliente que te pase, pulsa **Conectar con Google** y luego **Sincronizar ahora**.

Si vas a ser tú quien cree el ID, sigue [docs/CONEXION-CLASSROOM.md](docs/CONEXION-CLASSROOM.md).

### 5. Respaldo
Tus datos viven solo en este navegador. Exporta un respaldo de vez en cuando en
**Ajustes → Respaldo**; desde ahí también puedes importarlo o borrar todo.

## Privacidad

Uniplan solo se conecta a `classroom.googleapis.com` (con permisos de solo lectura), al inicio de
sesión de Google y a Aulas Virtuales con tu sesión abierta. Lee las páginas del SAC que tú abres.
Nunca guarda contraseñas, nunca escribe en el SAC, Moodle ni Classroom, y nada sale de tu equipo
hacia otros servidores. Detalle de cada permiso en [PERMISSIONS.md](PERMISSIONS.md).

## Desarrollo

Requiere Node (versión en `.nvmrc`) y pnpm.

```bash
pnpm install
pnpm build          # salida en .output/chrome-mv3
pnpm exec wxt zip   # ZIP para publicar en Releases
```

Antes de publicar: `pnpm build && pnpm typecheck && pnpm lint && pnpm test && pnpm e2e`.
Las reglas del proyecto están en [CLAUDE.md](CLAUDE.md).
