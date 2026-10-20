# Despliegue para colaboradores

Esta guía permite publicar el sitio de la EEST N°3. El frontend es estático y el backend
de cuentas y contenidos es Supabase. Se generan solo los archivos públicos en `dist/`.

## Sitio de trabajo vinculado

- URL: https://eest3sf.netlify.app
- Netlify: sitio `eest3sf`, conectado a `Fabianel10/eest3-fragata-moyano`, rama `main`.
- Node: 22. Instalación: `npm ci`. Verificación: `npm test`. Empaquetado: `npm run build`.
- `netlify.toml` ejecuta `npm test && npm run build` y publica `dist`.
- El posprocesado HTML se desactiva para conservar rutas `.html` y referencias CMS.
- Desactivar también **Pretty URLs** en la configuración del sitio Netlify si
  estaba habilitado antes de incorporar `netlify.toml`; reconstruir después.
- GitHub Actions comprueba las pruebas y el paquete en pushes a `main` y Pull Requests.
- No publicar `.`, porque contiene pruebas, SQL, documentos fuente y dependencias.
- Las claves publishable son públicas; nunca agregar secret keys ni credenciales de despliegue.

## Antes de comenzar

1. Iniciar sesión en GitHub con la cuenta que recibió acceso al repositorio.
2. Abrir `https://github.com/Fabianel10/eest3-fragata-moyano`.
3. Confirmar que el repositorio se visualiza y que se puede crear una rama o subir un cambio.
4. Si GitHub muestra una invitación pendiente, aceptarla antes de continuar. Actualmente esta acción corresponde a `kkanek99-glitch`.

## Activación de la gestión institucional preparada

**Autorizado y aplicado el 2026-10-20.** Las migraciones quinta y sexta ya están
en el proyecto real. El contacto usa Supabase mediante una función privada de Netlify.
Los pasos siguientes documentan el procedimiento para otros entornos; no reejecutar
las migraciones en el proyecto conectado.

1. Revisar los cambios, hacer backup del proyecto y confirmar responsables,
   retención de consultas y autorización de documentos públicos.
2. En un entorno de prueba con las cuatro migraciones existentes, aplicar
   `supabase/migrations/202610200005_gestion.sql` y después
   `supabase/migrations/202610200006_notificaciones.sql` y
   `supabase/migrations/202610200007_skynet.sql`. No reejecutar las
   migraciones anteriores ni usar `db push` sin reconciliar el historial.
   Probar que el CMS anterior sigue funcionando.
3. Tras aprobarlo, aplicar esa misma migración incremental al proyecto real.
   No hay importación de datos ni asignación automática de permisos.
4. Cargar variables privadas en Netlify, **contexto producción**. Usar scope
   Functions si el plan lo permite. El plan actual requiere todos los scopes;
   los valores siguen siendo privados y nunca se incorporan al JavaScript público.

   | Variable | Uso |
   | --- | --- |
   | `CONTACT_ENABLED` | `true` únicamente cuando se apruebe la recepción en Supabase |
   | `SUPABASE_URL` | URL del mismo proyecto utilizado por el frontend |
   | `SUPABASE_SERVICE_ROLE_KEY` | Credencial privada de servidor, nunca la publishable |
   | `CONTACT_HASH_SECRET` | Secreto de al menos 64 caracteres, generado con 32 bytes aleatorios en hexadecimal |

   Netlify suministra `URL` con el origen del sitio y `context.ip` con la IP de
   conexión. La función rechaza otros orígenes y no habilita deploy previews.
   No guardar valores privados en archivos, capturas, comandos registrados ni Git.
5. En `index.html`, cambiar explícitamente `data-backend="netlify"` por
   `data-backend="supabase"` y quitar `data-netlify` / `netlify-honeypot`.
   Conservar el campo trampa y el consentimiento. El botón requiere JavaScript;
   la función solo admite JSON. No hay fallback automático a Netlify ante fallos.
6. Antes de ese cambio, actualizar la información visible de privacidad para
   indicar Supabase como receptor activo, responsable y retención. La aceptación
   de contacto se registra con versión `2026-10-20`; esto no suscribe a campañas.
7. Ejecutar `npm test` y `npm run build`. Netlify publica `dist/` y empaqueta las
   funciones desde `netlify/functions`, fuera del paquete público. Vercel no
   ejecuta esta función sin adaptar el runtime; no activar este modo allí.
8. En prueba controlada: enviar una consulta, registrar su comprobante y comprobar
   **una sola fila** en `contact_requests`, visible solo para administración.
   Verificar cambios de estado, notas, conflictos de versión y eliminación.
9. Probar borrador, programación, publicación y vencimiento de artículos con una
   sesión anónima y PDF autorizado. Confirmar que el PDF no expone información privada.
10. Verificar calendario 2026 y un año sin fechas; importar un `.ics` de prueba en
    un calendario separado, sin modificar el calendario personal.

Las consultas históricas de Netlify no se migran automáticamente. Conservarlas
privadamente según la política institucional; no exportarlas al repositorio. Una
eventual importación debe auditar cantidades y duplicados antes de cerrar la bandeja antigua.

Para volver temporalmente a Netlify Forms, desactivar `CONTACT_ENABLED`, restaurar
el modo y atributos Netlify en un nuevo deploy y verificar su detección y recepción.
No borrar tablas o archivos de Supabase para revertir la interfaz. La función
deshabilitada devuelve 503 explícito.

### Historial y nombre de Skynet

La séptima migración agrega tablas y RPC privados; no modifica permisos de usuarios,
contenidos CMS, contacto ni notificaciones. No requiere credenciales nuevas:
utiliza la sesión Auth existente y RLS por propietario. Revisar
[consentimiento, retención y pruebas](SKYNET.md).
Fue aplicada al proyecto conectado el 2026-10-20. Se verificaron los RPC en una
transacción con rollback, la denegación anónima y la ausencia de chats de prueba.
Las siete migraciones están aplicadas; no reejecutarlas.

Antes de aplicar, confirmar con `to_regclass('public.skynet_turns')` y
`to_regclass('public.skynet_preferences')` que todavía no existen. Después, comprobar
RLS, permisos de RPC y que la lectura anónima esté denegada. No escribir chats reales
para probar. Preferir comprobaciones transaccionales con rollback y datos técnicos.
No otorgar consentimiento a otras personas ni reutilizar una sesión ajena.

Reversión: volver a un deploy validado no elimina datos ni revoca consentimiento.
Deshabilitar la interfaz en un nuevo deploy si fuera necesario y conservar las
tablas para permitir una eliminación controlada. No borrar el esquema como rollback.

## Alternativa: publicar en Vercel

1. Crear una cuenta o iniciar sesión en `https://vercel.com` usando **Continue with GitHub**.
2. Autorizar a Vercel para acceder a GitHub cuando lo solicite.
3. En el panel de Vercel, seleccionar **Add New...** y luego **Project**.
4. Buscar y elegir el repositorio `Fabianel10/eest3-fragata-moyano`.
5. En la configuración del proyecto, usar estos valores:

   | Campo            | Valor       |
   | ---------------- | ----------- |
   | Framework Preset | Other       |
   | Build Command    | `npm test && npm run build` |
   | Output Directory | `dist`                     |
   | Install Command  | `npm ci`                   |

6. Seleccionar **Deploy**.
7. Esperar a que Vercel finalice la publicación y abrir la URL entregada para comprobar el sitio.
8. Guardar la URL en los canales internos de la escuela y comunicarla al equipo.

## Opción utilizada: publicar en Netlify

1. Crear una cuenta o iniciar sesión en `https://app.netlify.com` usando GitHub.
2. Seleccionar **Add new site** y luego **Import an existing project**.
3. Elegir **Deploy with GitHub** y autorizar el acceso solicitado.
4. Seleccionar el repositorio `Fabianel10/eest3-fragata-moyano`.
5. En la configuración de despliegue, usar estos valores:

   | Campo             | Valor       |
   | ----------------- | ----------- |
   | Base directory    | Dejar vacío |
   | Build command     | `npm test && npm run build` |
   | Publish directory | `dist`                     |

6. Seleccionar **Deploy site**.
7. Cuando termine, abrir la dirección asignada por Netlify y comprobar el sitio.

## Actualizar el sitio publicado

1. Crear una rama desde el repositorio antes de modificar archivos.
2. Realizar los cambios y comprobar `index.html` localmente.
3. Subir la rama a GitHub y crear un Pull Request para revisión.
4. Después de aprobar y fusionar los cambios en `main`, Vercel o Netlify publicarán automáticamente la nueva versión.
5. Verificar la URL de producción y comunicar cualquier cambio relevante a la comunidad.

La versión publicada debe corresponder al SHA subido a GitHub. Comprobar estado
`ready` del despliegue y abrir las nuevas páginas y fotos. Si se necesita publicar
manualmente, usar `netlify deploy --prod --dir=dist --functions=netlify/functions --no-build` desde el sitio vinculado,
después de verificar pruebas y build; nunca pasar `--dir=.`.

Netlify puede insertar un comentario de hosting y su script público HUD aunque
el posprocesado esté desactivado. No comparar el hash del HTML servido como única
validación: comprobar que se conserva el HTML original al excluir esas inserciones,
que los enlaces mantienen `.html` y que el CMS carga al navegar. Los recursos del
catálogo y las imágenes sí deben coincidir exactamente con el paquete.

### Auth de producción y límites

Configurar en Supabase Site URL `https://eest3sf.netlify.app` y Redirect URLs exactas
`https://eest3sf.netlify.app/comunidad.html` y
`https://eest3sf.netlify.app/comunidad.html?recuperacion=1`.
Conservar los retornos de localhost para desarrollo. Un deploy preview no queda
autorizado automáticamente para enlaces de confirmación: no usar comodines globales.
Configurar SMTP institucional antes de abrir el registro a cualquier destinatario.
Verificar el estado de las siete migraciones antes de operar; no reejecutarlas al desplegar.

### Recepción de consultas

El formulario de inicio usa **Supabase mediante Netlify Function**, no `mailto`
ni el SMTP. Confirmar el comprobante UUID y la existencia de una única fila en
`contact_requests`; un HTTP 200 aislado no demuestra almacenamiento.

Las consultas quedan restringidas a cuentas administrativas en Gestión institucional.
Asignar un responsable y revisar entradas. Guardar una consulta no envía un aviso
ni una respuesta por correo. La bandeja histórica de Netlify Forms permanece
separada y no recibe los envíos nuevos.
No publicar consultas ni incorporarlas al catálogo CMS. En localhost y vista
previa no se envían datos. Ante error, los campos se conservan y se informa
explícitamente que la recepción no está confirmada.

### Reversión

Desde el panel del sitio en Netlify se puede volver a publicar un deploy anterior
verificado. Para revertir código en Git, crear un commit de reversión y revisarlo;
no reescribir la historia compartida. El contenido CMS vive en Supabase: volver a
un deploy no revierte publicaciones ni migraciones. Usar el historial editorial
para restaurar un borrador y publicarlo expresamente.

## Recomendaciones de trabajo

- No publicar datos personales de estudiantes, docentes o familias.
- Confirmar los datos institucionales antes de reemplazar el contenido de ejemplo.
- No compartir contraseñas ni tokens en el repositorio, capturas o chats.
- Antes de una publicación oficial, usar un dominio institucional y definir quién administrará la cuenta de despliegue.
