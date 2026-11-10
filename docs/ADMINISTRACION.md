# Administración editorial

## Alcance de esta entrega

CMS por bloques para **Inicio, Historia, Galería, Calendario y las tres carreras**, conectado al mismo
Supabase que las cuentas de comunidad. No requiere un servidor Node en producción:
el backend es PostgreSQL + funciones transaccionales/PostgREST + Supabase Auth + Storage.
El servidor Node del repositorio sirve archivos **solo para desarrollo**.

El administrador puede:

- Editar títulos y descripción de cada página; textos, títulos, imágenes, descripciones
  alternativas y enlaces de las secciones originales.
- Cambiar las imágenes de portada, identidad, navegación, redes y pie por página.
- Agregar bloques de texto, texto con imagen, llamadas a la acción y grupos de hasta
  12 tarjetas; duplicar bloques nuevos y cambiar su estilo o distribución.
- Ordenar, ocultar y quitar secciones. Las originales conservan internamente los nodos
  necesarios para las interacciones, pero las secciones quitadas no son visibles.
- Actualizar la galería (fotos/videos), agenda (año, fecha, tipo, título, descripción,
  imagen destacada) y listas de audio.
- Subir medios, editar su nombre/descripción, copiar URL y archivarlos.
- Guardar borradores privados, revisar la vista previa adaptable y publicar por página.
- Exportar e importar respaldos JSON por página para conservar una copia local del
  borrador o la publicación, antes de guardar nuevamente en Supabase.
- Consultar historial paginado y restaurar una versión como un nuevo borrador.
- Ir al portal de comunidad para aprobar solicitudes de alumnos/as y profesores/as.

No hay edición libre de HTML/CSS/JavaScript, ni generación de páginas nuevas, ni edición
de componentes técnicos de autenticación, clima automático o controles del reproductor.
Las plantillas originales mantienen su estructura interna y su diseño: para nuevas
composiciones se agregan bloques o se reemplaza una sección por bloques nuevos.
Los formularios de contacto y mapa mantienen su integración técnica original.
No se implementan campañas de correo, notas o gestión académica.

## Recuperación de 2FA y estado operativo

- Tras verificar TOTP, la cuenta puede generar ocho códigos de recuperación de un
  solo uso. Se muestran una vez y se guardan como hash. Un código válido elimina los
  factores TOTP y desactiva la exigencia de 2FA; luego hay que volver a inscribir el
  factor. La institución debe definir quién autoriza y registra una recuperación.
- Gestión → Métricas incluye estado de cola, antigüedad, consultas nuevas, calendario
  y métricas del día. Exporta CSV.
- Gestión → Respaldos muestra los snapshots diarios de contenido. El bucket
  `institutional-backups` es privado; descarga y restauración requieren un operador
  autorizado de Supabase. No incluye consultas, perfiles ni historial privado.
- La PWA cachea la portada y recursos públicos, con página offline. No cachea
  administración, gestión ni notificaciones.

## Plantillas y adjuntos de respuesta

En la respuesta de una consulta se puede elegir una plantilla, guardar el texto
actual como plantilla nueva y agregar un enlace HTTPS público con nombre. El hilo
conserva el adjunto y la cola lo incluye en texto y HTML. No se suben archivos desde
la respuesta: usar un documento ya autorizado y público.

## Respuestas e hilo de consultas

Gestión → Bandeja privada permite responder por correo sin salir del panel:

- el hilo muestra el mensaje inicial y las respuestas institucionales;
- la respuesta exige asunto y cuerpo, y se guarda en `contact_messages`;
- la consulta pasa a `respondida`, incrementa su versión y conserva historial;
- la respuesta se encola como `contact_reply` con HTML y reply-to;
- un reintento con el mismo identificador no duplica el mensaje ni el correo;
- solo administración puede leer el hilo o responder.

La entrega real depende de que la cola de correo esté activa y el proveedor acepte
el origen. Si el envío falla, la respuesta queda en el hilo y el error en la cola.

## Calendario gestionable

Gestión → Calendario permite crear y editar fechas con:

- fecha, título, tipo, descripción;
- fuente oficial y responsable;
- borrador o publicado;
- recurrencia semanal, mensual o anual y fecha límite;
- versión y fecha de actualización automática.

Solo las fechas publicadas aparecen en el calendario público y en `search_index`.
La eliminación es definitiva y requiere confirmación. La fuente y el responsable
son obligatorios para publicar. Los eventos recurrentes se expanden en el calendario
público y en la suscripción `.ics`; la fecha límite acota la repetición.

## 2FA y sesiones

La cuenta puede activar un factor TOTP desde Comunidad → Verificación en dos pasos.
Después puede exigir AAL2 para las operaciones de administración. Si se exige:

- al iniciar sesión se solicita el código antes de habilitar el panel;
- `is_community_admin()` devuelve falso con AAL1;
- la exigencia se puede desactivar desde la cuenta para recuperar acceso.

La sección Sesiones activas lista hasta 50 sesiones propias, marca la actual y
permite cerrar una o todas las demás. Requiere una sesión autenticada. Si se pierde
el factor TOTP, la recuperación debe hacerla un operador de Supabase; documentar
quién asume esa responsabilidad antes de exigir 2FA a todas las cuentas.

## Accesibilidad

`npm run auditoria:a11y` revisa etiquetas, nombres accesibles, IDs, encabezados,
referencias ARIA, iframes, tabindex y subtítulos. La entrega 1.11 no tiene hallazgos
automáticos. El video incluye una pista WebVTT descriptiva. La revisión con lector
de pantalla, teclado y teléfono físico sigue siendo manual; ver
[Accesibilidad](ACCESIBILIDAD.md).

## Correo avanzado

La cola envía HTML y texto, usa reply-to cuando corresponde, registra eventos de
entrega/rebote/complaint y genera una alerta interna si un mensaje agota los
intentos. El webhook `/.netlify/functions/webhook-correo?token=...` debe configurarse
en el proveedor. `npm run correo:check -- --netlify` valida proveedor y remitente
sin enviar correos.

Si Brevo bloquea por IP, no alcanza con autorizar una IP individual: las funciones
de Netlify usan salida dinámica. Desactivar la restricción de IP para la API o usar
un proxy con IP fija. Mantener `EMAIL_ENABLED=false` mientras el diagnóstico falle.



## Flujo editorial con revisión

La migración `202611100008_equipo_editorial.sql` agrega roles y estados:

| Rol | Puede |
| --- | --- |
| Editor/a | Guardar borradores, subir medios, enviar a revisión y restaurar versiones |
| Revisor/a | Leer borradores, aprobar o rechazar con nota; no edita contenido |
| Administrador/a | Todo lo anterior y publicar una versión aprobada |

Estados de página: `borrador`, `en_revision`, `aprobado`, `rechazado` y `publicado`.
Guardar una edición invalida una aprobación anterior y vuelve a `borrador`. Publicar
exige `aprobado`; la publicación registra `published_by`, `approved_by`, versión y nota.
Cada acción (`save`, `submit`, `approve`, `reject`, `publish`, `restore`) queda en
`cms_revisions` con rol, autor, fecha y nota. La asignación de roles se hace desde
Gestión institucional → Equipo editorial y queda auditada en `profile_role_history`.
No se puede cambiar el propio rol ni dejar el sistema sin una cuenta administradora.

## Búsqueda global

`buscador.html` consulta la vista pública `search_index` de Supabase. Reúne páginas,
carreras, publicaciones vigentes y eventos del calendario publicado; excluye borradores
y contenido vencido mediante RLS. Filtra por tipo, carrera y rango de fechas.
La vista usa `security_invoker` para no saltar las políticas de las tablas de origen.
El texto buscado no se guarda en métricas.

## Correo transaccional y bajas

La migración `202611100011_correo_cola.sql` crea una cola persistente. Al recibir una
consulta se encola un aviso para administración/revisión y un comprobante para la
persona consultante. El procesamiento:

- reclama lotes con `email_claim` y evita dobles envíos;
- reintenta con espera exponencial y límite de intentos;
- registra `email_events` con cada intento, envío, fallo o baja;
- permite reintento manual desde Gestión;
- incluye un enlace de baja con token para el equipo; la baja cancela pendientes
  y no afecta consultas ya recibidas.

Variables necesarias en Netlify: `EMAIL_ENABLED`, `EMAIL_PROVIDER` (`brevo`, `resend`
o `smtp`), `EMAIL_FROM`, `EMAIL_FROM_NAME`, la API key correspondiente o las
variables `EMAIL_SMTP_*`, y `EMAIL_QUEUE_SECRET`. El endpoint programado
`procesar-correo.mjs` se ejecuta cada cinco minutos. El endpoint
`procesar-correo-manual.mjs` permite un disparo manual autenticado. `baja.mjs` procesa
el enlace público de baja. Ver `.env.example`.

## Métricas responsables

`metrics_daily` guarda únicamente día, tipo, destino permitido y cantidad. No hay IP,
cookies, sesión, user-agent ni texto de búsqueda. El navegador registra una página
una vez por sesión y respeta Do Not Track. La retención es de 365 días y la purga se
ejecuta al registrar actividad. El equipo editorial consulta agregados desde
Gestión → Métricas; la tabla no es legible directamente por el cliente.

## Gestión institucional

La ampliación de 2026-10-20 agrega `gestion.html`, accesible desde las herramientas
del editor, y la página pública `novedades.html`. Requiere la migración incremental
`202610200005_gestion.sql`, **aplicada al proyecto real el 2026-10-20**. Sin ella,
las páginas informan la falta de activación y no simulan datos.

### Consultas privadas

- Recepción anónima solo mediante `netlify/functions/contacto.mjs`, con validación
  en servidor, control de origen, límite de tamaño, honeypot y límite persistente de
  cinco consultas/IP/hora. No sustituye un servicio de mitigación de ataques a gran escala.
- La función guarda por RPC `contact_submit`, accesible solo con la credencial de
  servidor. No hay permiso de inserción directa para visitantes ni usuarios comunes.
- Comprobante UUID y reintento con el mismo ID mientras la página siga abierta y
  los campos no cambien. Reabrir la página o cambiar el contenido crea una consulta nueva.
  Una respuesta incierta nunca se interpreta como recepción confirmada.
- Bandeja con búsqueda por asunto, estados, páginas de 25 registros, responsable
  administrativo, notas internas e historial de los últimos 50 cambios.
- Actualizaciones con versión esperada: una sesión no sobrescribe a otra.
- Eliminación definitiva autorizada de una consulta y sus notas. La institución
  debe definir y ejecutar el plazo de retención; no se borra automáticamente información.
- La IP no se guarda en claro: se utiliza HMAC-SHA256 con secreto de servidor para
  los límites. Los contadores de más de un día se limpian en el próximo envío aceptado.
- Guardar/gestionar una consulta **no envía una respuesta** al remitente. La cola
  transaccional envía un aviso interno y un comprobante de recepción; una respuesta
  redactada por una persona requiere un canal institucional separado.

### Publicaciones y documentos

- Tipos: comunicado, documento, proyecto estudiantil y horarios/equipo docente.
  No se inventan horarios ni nombres: administración incorpora información autorizada.
- Clasificación por carrera y destinatario, textos planos, enlace HTTPS con nombre,
  fecha de publicación opcional y vencimiento posterior.
- Sin fecha: borrador privado. Fecha futura: publicación programada. Vencida:
  excluida por RLS de la lectura pública. Los destinatarios son etiquetas, no roles
  de acceso: todo lo publicado es público.
- Búsqueda por título, filtros y páginas de 20 artículos públicos / 25 administrativos.
- Cada guardado conserva una revisión privada inmutable; el editor muestra las
  últimas diez. No se implementó restauración automática de esas publicaciones.
- PDF de hasta 10 MB en `institutional-documents`, con nombre UUID, comprobación
  de cabecera PDF, sin reemplazos ni borrado por la aplicación. La validación de tipo
  no es un antivirus: revisar y autorizar el archivo antes de subirlo.
- Los PDF son públicos por URL inmediatamente, aunque el artículo sea borrador o
  venza. No subir datos personales, legajos o documentación sensible. Retirar un
  artículo no revoca una URL previamente difundida. La eliminación excepcional del
  archivo requiere un operador privado de Storage y revisar referencias existentes.
- Los roles editor, revisor y administrador se asignan desde Gestión. Solo el equipo
  editorial accede a borradores, medios y métricas; la comunidad no obtiene permisos
  por seleccionar un perfil.

### Calendario multianual

El CMS ya acepta eventos de distintos años. El calendario permite elegir entre
2000 y 2100 y solo muestra las fechas cargadas de ese año. La agenda se descarga
como `.ics`, con eventos de día completo, fin exclusivo, escape de texto y plegado
de líneas UTF-8. Es una instantánea descargada, no una suscripción sincronizada.
Un año sin fechas se muestra vacío: no se copian feriados de 2026 a 2027.

### Verificación de esta ampliación

- Suite automatizada: incluye las siete migraciones en PostgreSQL embebido para
  comprobar compatibilidad, además de las pruebas de recepción e interfaz.
- Pruebas de recepción HTTP: formato, tamaño, origen, límites, fallos y comprobantes.
- Pruebas de RLS/RPC: consultas privadas, notas, eliminación, permisos, conflictos
  de versión, auditoría de publicaciones, programación, vencimiento y bucket PDF.
- Navegador local a 375 px: publicaciones sin HTML ejecutable ni overflow, guardado
  de notas y de artículos con respuestas simuladas, y bloqueo del panel sin sesión.
- Calendario local: cambio a 2027 sin inventar eventos y comprobación del contenido
  y nombre del archivo `.ics` generado. Falta la importación real en un calendario externo.

Las migraciones quinta y sexta se aplicaron con autorización al proyecto real.
Las pruebas locales no sustituyen la comprobación de recepción en producción
detallada en la entrega 1.7.0.

### Notificaciones internas

`notificaciones.html` requiere una cuenta autenticada. La migración
`202610200006_notificaciones.sql` ya está aplicada. Los avisos se filtran por los
intereses del perfil (`novedades`, `calendario`, `inscripciones`) y por una
preferencia interna independiente del consentimiento de correo.

- Cada cuenta marca sus propias lecturas; no puede consultar las de otras cuentas.
- Se cargan hasta 25 avisos por página, con cursor estable y botón Actualizar.
- Administración crea avisos manuales por tema, con programación y vencimiento.
  Los reintentos de creación con el mismo identificador no duplican avisos.
- Publicar un artículo genera un aviso de novedades. Editarlo conserva la misma
  notificación y sus lecturas; retirar la fecha pública la oculta.
- Los avisos automáticos se gestionan desde el artículo. Los manuales pueden
  retirarse desde el centro de notificaciones. No se envían correo ni push.
- Al cerrar sesión se vacían los paneles privados y se descartan respuestas
  pendientes de la sesión anterior.

### Asistente Skynet

Skynet es un asistente guiado por doce temas, no un modelo generativo ni un
operador humano. Sus respuestas y fuentes se mantienen en
`assets/js/skynet-modelo.mjs`: cualquier nueva fecha o requisito necesita
validación institucional. La versión 1.8.0 incorpora imagen transparente, nombre
opcional, contexto de carrera, búsqueda de publicaciones vigentes e historial
privado por cuenta con consentimiento explícito. Sin autorización, la conversación
permanece en memoria. El diálogo admite teclado, Escape, retorno de foco,
descarga y borrado de conversación.
No tiene permisos para cambiar cuentas, leer consultas o publicar contenido.
Administración no puede leer chats ajenos mediante el portal. Consultar
[la guía de Skynet](SKYNET.md) para retención, permisos y mantenimiento.

## Activación

### Estado del proyecto conectado

Las migraciones `202610060001_comunidad.sql`, `202610060002_editorial.sql`,
`202610060003_catalogo.sql` y `202610060004_carreras.sql` ya se aplicaron en el proyecto `dzkcpsfmubwwguixtruu`
desde el SQL Editor. La cuarta extiende las páginas permitidas e incorpora las tres
plantillas de carreras, conservando los manifiestos y datos anteriores.
Las migraciones quinta y sexta agregan gestión y notificaciones. La séptima,
`202610200007_skynet.sql`, incorpora historial y nombre opcional del asistente.
También se aplicó al proyecto conectado el 2026-10-20, sin alterar el contenido previo.
Se verificaron las seis tablas con RLS, las siete plantillas
y el bucket público `institutional-media` con límite de 20 MB.
La API anónima permite consultar publicaciones y deniega perfiles y borradores.

**No reejecutar las migraciones en este proyecto.** La aplicación manual no registra
el historial de Supabase CLI: antes de usar `db push`, un operador debe reconciliar
ese historial con el esquema desplegado, sin volver a crear tablas ni políticas.

La primera cuenta administrativa ya está confirmada y habilitada; su titular confirmó
acceso al editor y ya se verificaron guardado de borrador, publicación, restauración
de una revisión y alta de un medio técnico en Storage. No se dejaron publicaciones de
prueba visibles: después de la comprobación, las páginas conservaron el contenido
institucional esperado.
Consultar [el estado de Auth y correo](COMUNIDAD.md#estado-del-proyecto-conectado).
La exportación/importación de respaldo no reemplaza los backups de proyecto de Supabase:
sirve para restaurar rápidamente el contenido editorial de una página en el navegador.

### Procedimiento para un proyecto nuevo

1. Completar [la configuración de cuentas](COMUNIDAD.md).
2. Aplicar las migraciones, **una sola vez y en este orden**, en el SQL Editor privado:
   - `supabase/migrations/202610060001_comunidad.sql` si aún no se aplicó.
   - `supabase/migrations/202610060002_editorial.sql`.
   - `supabase/migrations/202610060003_catalogo.sql`.
   - `supabase/migrations/202610060004_carreras.sql`.
   - `supabase/migrations/202610200005_gestion.sql`.
   - `supabase/migrations/202610200006_notificaciones.sql`.
   - `supabase/migrations/202610200007_skynet.sql`.
3. Estas migraciones suponen un proyecto donde no existen tablas CMS ni el bucket
   `institutional-media`. No ejecutar repetidamente la creación de tablas/políticas.
   Revisar políticas preexistentes de Storage: una política permisiva global no debe
   otorgar escritura sobre este bucket. Las políticas RLS se combinan mediante OR.
4. Configurar URL y clave **publishable/anon** en `assets/js/comunidad-config.js`.
   Nunca usar `service_role` ni una secret key en el navegador.
5. Acceder a `comunidad.html` con la cuenta habilitada como administrador/a y elegir
   **Administrar el sitio**, o abrir `admin.html` tras iniciar sesión.
6. Elegir una página. Inicialmente se muestra la plantilla original: no hay borrador
   en la base hasta guardar por primera vez. Guardar y publicar las páginas deseadas.
7. Confirmar que la URL pública muestra el contenido y que Storage entrega los medios.
   Hacer este control con una sesión anónima, no solo desde la vista previa.
8. Descargar respaldos JSON de las páginas antes de cambios grandes. Para recuperar,
   elegir **Importar respaldo**, revisar la vista previa y guardar el borrador.
   Si hace falta restaurar toda la base, usar los backups del panel de Supabase.

Sin Supabase configurado, las páginas institucionales conservan su contenido local y sus
interacciones; el editor muestra una pantalla de activación y no habilita escrituras.
Si el backend configurado no responde o falta una migración, la página pública avisa
explícitamente y muestra la plantilla incluida. No simula una publicación exitosa.

## Copias de seguridad y recuperación

- **Respaldo editorial por página:** el editor exporta un JSON con `slug`, fecha,
  versión del borrador y versión publicada. Sirve para reponer el contenido visual
  de esa página como borrador local, incluso antes de reenviarlo al servidor.
- **Historial en Supabase:** cada guardado, publicación y restauración crea una
  revisión inmutable. Restaurar no toca la publicación hasta volver a publicar.
- **Backups de base de datos:** según la documentación oficial de Supabase, los
  backups de proyecto se gestionan desde **Database → Backups** y pueden requerir
  downtime al restaurar. Las restauraciones de base no recuperan archivos borrados
  de Storage; solo conservan sus metadatos en la base.
- **Storage:** archivar un medio en el CMS no lo elimina. Si un archivo debe
  preservarse fuera del proyecto, descargarlo además desde la biblioteca o el bucket.

## Modelo y API de backend

| Recurso | Acceso | Uso |
| --- | --- | --- |
| `cms_pages` | Lectura administrativa | Borrador actual y versión editorial |
| `cms_published` | Lectura pública | Instantánea publicada, sin datos del autor |
| `cms_revisions` | Lectura administrativa | Historial inmutable con autor, fecha y acción |
| `cms_templates` | Solo operadores privados | Tipos de campos y plantillas permitidos |
| `cms_media` | Administradores | Metadatos de archivos; archivo lógico |
| Storage `institutional-media` | Lectura pública; altas administrativas | Medios institucionales públicos |

Las escrituras editoriales no se hacen con `UPDATE` directo:

```js
await supabase.rpc('cms_save_draft', {
  page_slug: 'inicio', document: contenido, expected_version: versionActual
});
await supabase.rpc('cms_publish', {
  page_slug: 'inicio', expected_version: versionActual
});
await supabase.rpc('cms_restore', {
  page_slug: 'inicio', revision_id: idRevision, expected_version: versionActual
});
```

Las funciones devuelven un objeto JSON con `draft`, `version`, `updated_at` y `updated_by`.
La primera escritura usa versión esperada `0`; cada guardado, publicación o restauración
incrementa la versión. Todas las operaciones exigen rol administrador **desde la base**,
validan el documento y bloquean la fila durante la transacción.
Si otra sesión ya cambió la página, se rechaza con código `40001`: el editor conserva
los cambios locales, no fuerza la sobrescritura y pide recargar.
Guardar un borrador no modifica la publicación. Restaurar tampoco publica automáticamente.
El historial no permite edición/borrado por la API pública.

El servidor valida tamaño (1 MB por documento), tipos de campos, fuentes originales,
URLs permitidas, cantidades de bloques/módulos y fechas reales no duplicadas.
No acepta introducir un enlace ejecutable cambiando su tipo a texto.
El renderizado usa nodos DOM/texto plano y URLs validadas; no ejecuta HTML del editor.

## Medios y privacidad

- Formatos: JPG, PNG, WebP, GIF, MP4 y MP3. Máximo exacto: **20 MB** por archivo.
- SVG, HTML, PDF y documentos privados no están permitidos.
- Archivos con UUID y extensión controlada, sin sobrescritura ni borrado desde el panel.
  Así una versión histórica no pierde la imagen que utilizaba.
- Archivar oculta el medio de la biblioteca, **no elimina su URL ni las referencias**.
- La biblioteca carga 30 archivos por página; el historial carga 20 versiones por página.
- Elegir una imagen copia su descripción al campo. Cambiar luego el metadato del archivo
  no modifica automáticamente las descripciones ya insertadas.
- El archivo se sube primero a Storage y después se registra su metadato. Si el segundo
  paso falla, el editor ofrece **Reintentar registro** sin repetir la subida.
  Si se abandona esa pestaña, un operador debe revisar el objeto huérfano en Storage.
- Solo publicar imágenes, videos y audios autorizados para difusión. El bucket es público:
  no es un almacén de datos privados de estudiantes.

La eliminación física de medios y la política de conservación de historial quedan a cargo
de operadores privados. Antes de eliminar un objeto, revisar borradores, publicaciones y
**todas** sus versiones. No borrar objetos referenciados.
Configurar backups/retención del proyecto institucional antes de producción. No se ofrece
una garantía de backup independiente del plan de Supabase contratado.

## Catálogo y cambios de código

### Páginas de carreras

`informatica.html`, `madera.html` y `obras.html` tienen enfoque, objetivos, referencia
documental, materias de 4.º a 7.º con horas reloj anuales, galería independiente y
secciones reservadas para horarios y equipo docente. El selector del administrador
permite editar cada carrera, incluidos sus textos y tablas, imágenes, videos y audios.
No es una aplicación de gestión de horarios o asignaciones docentes.

La información inicial se sintetizó a partir de los documentos aportados:

- Informática: `IF-2018-31698000-GDEBA-DETECDGCYE`, tabla en página 9.
- Madera y Mueble: Resolución DGCyE 2254/15, tabla en página 7 del PDF escaneado.
- Maestro Mayor de Obras: `IF-2018-31695509-GDEBA-DETECDGCYE`, tabla en página 8.

No se utilizó el diseño modular de adultos de 2025 para secundaria. Los PDF completos
no se copian al repositorio ni se publican. Los nombres y horas de materias son datos
del diseño aportado; confirmar vigencia y aplicación institucional antes de la difusión.
Informática y Obras conservan fotos y video institucionales de referencia. Madera
incluye cinco fotos propias del taller, autorizadas para esta entrega el 2026-10-13.
`assets/cms/madera-galeria.json` contiene sus rutas y descripciones; el catálogo inicial
las usa sin cambiar el manifiesto de campos ni reejecutar migraciones.
`node tools/madera-galeria.mjs` actualiza solo esa galería inicial, no datos remotos.
Si ya existe una publicación de Madera en Supabase, prevalece sobre el catálogo:
editar y publicar la galería desde el administrador; no sobrescribir borradores con SQL.
Conservar fechas, responsables y permisos detallados en un registro privado institucional.

`tools/carreras-datos.mjs` conserva la estructura factual y las referencias para la
generación inicial. `tools/carreras-scaffold.mjs` genera las nuevas páginas reutilizando
cabecera, galería, clima, reproductor y redes; no ejecutarlo sobre plantillas desplegadas
sin planificar compatibilidad. Para esta incorporación se usó
`node tools/cms-catalog.mjs --carreras`: conserva las cuatro entradas originales
del catálogo y genera únicamente la migración incremental de carreras.
Ahora que esa migración está aplicada, cualquier cambio estructural debe ir en otra
migración, no regenerar y reejecutar la cuarta.

`assets/js/sitio-compartido.mjs` enlaza las carreras y completa los servicios ausentes
en las diez páginas, después del renderizado CMS. Así no cambia las posiciones de los
campos de las cuatro plantillas ya desplegadas. El contador sigue siendo local por
dispositivo, no una estadística global. El reproductor no inicia música automáticamente.

`assets/cms/catalogo.json` contiene valores iniciales y referencias de campos en el HTML.
Se genera desde las cuatro páginas y los módulos estáticos, no desde datos de usuarios:

```sh
npm ci
npm run cms:catalog
npm test
```

Regenerarlo cuando se cambie manualmente la estructura HTML. El comando también genera
el manifiesto SQL de tipos de campos. En un proyecto **ya desplegado**, aplicar el nuevo
manifiesto mediante una **nueva migración**; no reescribir una migración ya aplicada.
Cambiar posiciones estructurales puede cambiar IDs de campos: planificar una migración
de borradores/publicaciones antes de desplegar una plantilla incompatible. No regenerar
indiscriminadamente un catálogo publicado.
Los ajustes de código del CMS no requieren regenerar contenido si no cambia el HTML base.

## Verificación

`npm test` cubre contratos de contenido, límites de archivo, migraciones PostgreSQL,
RLS, versiones concurrentes, separación borrador/publicación, restauración y permisos
de Storage. PostgreSQL embebido reproduce el esquema Auth/Storage mínimo para estos tests;
el servicio HTTP de Storage, SMTP y Auth se verifican aparte en el proyecto real.

Checklist institucional:

1. Una cuenta común y una sesión anónima no abren el editor ni consultan borradores/historial.
2. Guardar texto/imágenes no cambia la web pública hasta publicar.
3. Dos administradores con la misma versión producen un conflicto, sin pérdida de cambios.
4. Restaurar recupera bloques y archivos; la publicación se mantiene hasta confirmar.
5. Verificar las siete páginas editoriales en claro/oscuro, móvil, teclado y escritorio.
6. Subir un archivo permitido y probar uno de más de 20 MB y un formato no admitido.
7. Verificar fotos/videos, agenda por año y audios tanto en vista previa como públicamente.
8. Revisar permisos de difusión, contacto, datos institucionales y copias de seguridad.

`tests/fixtures/cms-sdk.mjs` es un doble de prueba usado por el navegador para comprobar
el editor sin credenciales. **No se importa ni se usa en producción** y no concede permisos
en Supabase. No sustituye la prueba con un proyecto real.
