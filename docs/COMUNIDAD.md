# Portal de comunidad

## Qué incluye

- `comunidad.html`: acceso, registro, recuperación de contraseña y cuenta.
- Perfiles públicos: comunidad (familias, visitantes y personas interesadas), alumno/a y profesor/a.
- Confirmación de correo mediante Supabase Auth; contraseña de 12 a 128 caracteres.
- Solicitud de perfil institucional, con permisos de comunidad hasta su aprobación.
- Administración: listado de hasta 50 solicitudes pendientes, ordenadas por antigüedad, y aprobación.
- Acceso al [administrador editorial](ADMINISTRACION.md) para las cuentas habilitadas.
- Preferencias e intereses para futuras notificaciones por correo, con consentimiento opcional.
- Tema claro/oscuro, diseño adaptable, etiquetas accesibles, estados de carga y errores.

No incluye notas, matrícula escolar, campañas de correo ni notificaciones push.
No hay cuentas ficticias ni contraseñas guardadas por la aplicación.
La selección de perfil no otorga permisos: la fuente de autorización es `public.profiles`,
protegida mediante RLS y permisos de columnas, no los metadatos editables de Auth.

## Activar Supabase

### Estado del proyecto conectado

El proyecto `dzkcpsfmubwwguixtruu` (EEST3 San Fernando) está conectado mediante
URL y clave pública publishable. Las cuatro migraciones ya se aplicaron manualmente
desde el SQL Editor; **no volver a ejecutarlas en este proyecto**.

Configuración verificada para Netlify y pruebas locales (2026-10-13):

- Site URL: `https://eest3sf.netlify.app`.
- Redirect URLs: `https://eest3sf.netlify.app/comunidad.html` y
  `https://eest3sf.netlify.app/comunidad.html?recuperacion=1`, además de las dos
  rutas equivalentes en `http://localhost:4173`, conservadas para desarrollo.
- Registro por email habilitado, confirmación de correo requerida y contraseña mínima de 12 caracteres.
- SMTP personalizado deshabilitado: se usa el correo predeterminado de Supabase.
  Este servicio restringe destinatarios a miembros autorizados del equipo y limita envíos;
  no está listo para registro público institucional.

La primera cuenta ya está confirmada y tiene administración asignada privadamente;
su titular confirmó acceso al editor. No se incluyen datos personales de esa cuenta en el repositorio.
El registro y la confirmación se completaron para esa cuenta; la recuperación todavía
no se ha validado de extremo a extremo.
Pendiente: configurar SMTP propio y comprobar confirmación/recuperación desde el sitio HTTPS.
No desactivar la confirmación para eludir las restricciones del correo.

### Procedimiento para un proyecto nuevo

1. Crear un proyecto institucional en Supabase. Elegir la región y revisar las condiciones
   de tratamiento de datos con la institución antes de recibir registros reales.
2. Ejecutar **una sola vez** `supabase/migrations/202610060001_comunidad.sql` en el SQL Editor.
   La migración es para un proyecto nuevo: los usuarios preexistentes requieren un
   aprovisionamiento explícito de perfiles. No inventar consentimientos para migrarlos.
3. En Authentication, habilitar email/password y **Confirm email**. Configurar longitud mínima
   de contraseña en **12**, SMTP de producción, límites de intentos y protección de contraseñas
   filtradas si el plan lo permite. Verificar que SMTP entregue correos antes de abrir el registro.
4. Configurar Site URL con la URL HTTPS real del sitio y agregar estas Redirect URLs exactas:
   - `https://TU-DOMINIO/comunidad.html`
   - `https://TU-DOMINIO/comunidad.html?recuperacion=1`
   - Para pruebas locales, las mismas rutas en `http://localhost:4173`.
   No usar comodines amplios en producción. Las plantillas de confirmación y recuperación
   deben conservar `{{ .ConfirmationURL }}`.
5. Completar `assets/js/comunidad-config.js` con la Project URL (`https://….supabase.co`)
   y la clave **publishable** (o la antigua **anon**). Son valores públicos por diseño;
   la protección real son las políticas RLS. **Nunca usar service_role ni secret keys**.
6. Publicar el sitio estático en Netlify o Vercel. Para probar localmente, servir por HTTP:
   los módulos JavaScript no deben abrirse mediante `file://`.
7. Registrar una cuenta inicial, confirmar el correo y asignarle administración desde el
   SQL Editor privado usando el UUID real obtenido en Authentication → Users:

   ```sql
   update public.profiles
   set role = 'administrador'
   where id = 'UUID-DE-LA-CUENTA-CONFIRMADA';
   ```

   Confirmar que se actualizó exactamente una fila. No existe autorregistro de administrador/a.
   Las siguientes cuentas de administración se aprovisionan por el mismo procedimiento privado.
   No habilitar acceso directo al panel de Supabase para usuarios finales.
8. Revisar `privacidad.html` antes de abrir el servicio: responsable institucional, contacto
   efectivo, retención, eliminación, tratamiento de menores y autorizaciones correspondientes.
   El texto inicial describe la implementación; no sustituye una revisión institucional/legal.

Sin configuración, el portal muestra un aviso y bloquea el envío de formularios.
No pegar claves secretas o datos de estudiantes en chats, commits ni capturas.

## Datos y permisos

`profiles` almacena nombre, perfil solicitado/aprobado, intereses, elección de avisos,
versión/fecha de aceptación y fechas de consentimiento/revocación.
No almacena contraseñas ni duplica el correo de Auth.

- Anónimos: sin acceso a perfiles ni funciones de administración.
- Cuenta autenticada: lectura propia, edición de nombre/intereses/avisos.
- Administración: lectura de perfiles y aprobación mediante `approve_profile`.
- Solo operadores privados de la base pueden otorgar administración.
- El trigger de alta ignora cualquier metadato `role`: el rol inicial siempre es comunidad.
- Cambiar metadatos de Auth después del registro no modifica permisos ni consentimientos.
- Borrar un usuario desde Authentication elimina su perfil por cascada.

Para verificar solicitudes, contrastar identidad y UUID con registros institucionales por
canales privados. El nombre ingresado por el usuario no constituye prueba de identidad.
Solo aprobar alumnos/as o profesores/as tras verificar el vínculo.

El navegador mantiene la sesión con el SDK oficial de Supabase, cargado desde jsDelivr con
versión fijada. Los activos externos deben estar permitidos por las políticas de despliegue;
para ambientes que no permiten CDN, empaquetar/servir el SDK desde el propio sitio.
No se agrega código de envío de correos institucionales: esa futura implementación debe usar
un backend privado, respetar `email_notifications` y ofrecer baja.

## Verificar antes de publicar

1. Registrar comunidad sin avisos: confirmar email, iniciar sesión, guardar intereses.
2. Solicitar alumno/a y profesor/a: comprobar estado pendiente y rol inicial comunidad.
3. Acceder como administrador/a y aprobar: volver a cargar la cuenta aprobada.
4. Intentar desde una cuenta común leer otra cuenta, editar rol o llamar a `approve_profile`:
   debe ser denegado por el servidor.
5. Pedir recuperación, abrir el enlace, cambiar contraseña y probar el nuevo acceso.
   También probar enlace vencido, repetido y correo no confirmado.
6. Retirar consentimiento y confirmar persistencia al recargar. Cerrar sesión en equipo compartido.
7. Revisar teclado, ancho de 375 px, escritorio y ambos temas.

### Pruebas automatizadas locales

`npm ci` y `npm test` ejecutan las pruebas con Node y PostgreSQL embebido (PGlite).
La dependencia es solo de desarrollo: el sitio sigue sin requerir build.
Las pruebas SQL verifican la migración, RLS, permisos de columnas, consentimiento,
aprobación y borrado en cascada con un esquema Auth de prueba.
No sustituyen probar SMTP, Supabase Auth y los enlaces en el proyecto real.
