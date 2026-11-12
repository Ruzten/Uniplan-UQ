# Conectar Google Classroom (opcional)

> **Estado: NO VERIFICADO.** Estos pasos no se pudieron probar durante la construcción porque
> exigen la cuenta institucional del estudiante. Uniplan UQ funciona completo sin esta conexión:
> todo lo que vendría de Classroom se puede escribir a mano en Agenda y Notas.

Los nombres de los menús de Google Cloud cambian con frecuencia; si uno no coincide, busca el
equivalente más cercano.

## Antes de empezar

- La extensión ya está cargada sin empaquetar desde `.output/chrome-mv3`.
- **No muevas la carpeta del proyecto.** El ID de una extensión sin empaquetar depende de la ruta
  de la carpeta, y la URI de redirección depende del ID. Si la mueves, repite el paso 4 con la
  nueva URI.

## Pasos

1. Abre el panel de Uniplan UQ → **Ajustes** → sección **Google Classroom**. Copia el texto del
   campo **URI de redirección** (tiene la forma `https://<id-de-la-extensión>.chromiumapp.org/`).
2. En la consola de Google Cloud crea un proyecto nuevo con cualquier cuenta de Google.
3. En ese proyecto habilita la **Google Classroom API**.
4. Configura la **pantalla de consentimiento de OAuth**: tipo de usuario externo, estado de
   publicación "en pruebas", y agrega la cuenta institucional como **usuario de prueba**.
   Agrega estos alcances (todos de solo lectura):
   - `https://www.googleapis.com/auth/classroom.courses.readonly`
   - `https://www.googleapis.com/auth/classroom.coursework.me.readonly`
   - `https://www.googleapis.com/auth/classroom.student-submissions.me.readonly`
   - `https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly`
   - `https://www.googleapis.com/auth/classroom.announcements.readonly`
5. En **Credenciales** crea un **ID de cliente de OAuth** de tipo **Aplicación web** y pega en
   **URI de redirección autorizados** el texto copiado en el paso 1, sin cambiarlo.
6. Copia el **ID de cliente** (termina en `.apps.googleusercontent.com`). No es un secreto. No
   copies ni guardes el "secreto del cliente": la extensión no lo usa.
7. Vuelve a **Ajustes → Google Classroom**, pega el ID de cliente y pulsa **Conectar con Google**.
   Inicia sesión tú mismo en la ventana de Google; la extensión nunca ve tu contraseña.
8. Pulsa **Sincronizar ahora** y revisa **Registro de sincronización**.

## Si algo falla

| Lo que ves | Causa probable | Qué hacer |
|---|---|---|
| Google dice que el administrador de la organización bloqueó la aplicación | El administrador de Workspace de la universidad no permite apps de terceros | No hay solución desde la extensión. Usa la entrada manual |
| `redirect_uri_mismatch` | La URI del paso 5 no es idéntica a la del paso 1, o moviste la carpeta | Copia de nuevo la URI y corrígela en Credenciales |
| La ventana de consentimiento no abre en Brave | Comportamiento de `launchWebAuthFlow` en Brave sin verificar | Revisa los escudos de Brave para esa ventana; si persiste, usa la entrada manual |
| "Reconectar" aparece cada hora | El token dura cerca de una hora y la renovación silenciosa falló | Pulsa **Reconectar** |
| Cursos en "Sin asociar" | El nombre del curso no coincide con una materia del pensum | Asócialo una vez en **Ajustes → SAC: columnas y materias sin asociar** |

Si los alcances de Classroom se clasifican como sensibles o restringidos para tu tipo de cuenta
es algo que este documento no pudo verificar; en modo de pruebas con un usuario de prueba no
debería exigir verificación de la app.
