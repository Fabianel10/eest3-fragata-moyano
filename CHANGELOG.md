# Historial de cambios

Este proyecto utiliza [versionado semántico](https://semver.org/lang/es/).

## [1.12.1] - 2026-11-10

### PWA

- `Content-Type: application/manifest+json` para el manifest.
- `Service-Worker-Allowed: /` y `Cache-Control: no-cache` para `sw.js`.
- Verificación de producción del manifest, service worker, RSS y calendario `.ics`.

## [1.12.0] - 2026-11-10

### Operación y seguridad

- Códigos de recuperación TOTP de un solo uso; permiten retirar el factor y volver
  a inscribirlo sin intervención de base de datos.
- Estado del servicio en Gestión: cola, antigüedad, consultas nuevas, calendario y métricas.
- Exportación CSV de métricas agregadas.
- Respaldo diario programado de contenido en bucket privado `institutional-backups`.
- Diagnóstico de correo, webhook de rebotes y envío real verificado en producción.

### Consultas y calendario

- Plantillas de respuesta reutilizables.
- Adjuntos por enlace HTTPS con nombre y trazabilidad en el hilo.
- Suscripción `.ics` a los eventos publicados.
- PWA: manifest, service worker, página offline e iconos.

### Descubrimiento y accesibilidad

- RSS de comunicados en `/feed.xml`.
- JSON-LD de organización educativa y sitio con SearchAction.
- Sinónimos de búsqueda para informática, madera, obras, inscripciones, horarios y documentos.
- Auditoría automática de accesibilidad sin hallazgos; checklist manual documentado.

### Pendientes institucionales

- Preinscripción: no se activa hasta definir requisitos, retención y tratamiento de menores.
- Recurrencia de calendario y auditoría manual con lector de pantalla/teléfono real.

## [1.11.0] - 2026-11-10

### Correo transaccional avanzado

- Plantillas HTML accesibles, reply-to, alertas internas por fallos definitivos.
- Webhook de rebotes/complaints con baja automática y trazabilidad.
- Endpoint manual autenticado y diagnóstico `npm run correo:check`.
- Soporte Brevo, Resend y SMTP autenticado.
- La cola conserva HTML, reply-to, intentos, errores y eventos.

### Respuestas y calendario

- Respuesta a consultas desde Gestión, con hilo, idempotencia y estado `respondida`.
- Calendario gestionable con fecha, tipo, descripción, fuente oficial, responsable,
  publicación y fecha de actualización.
- Los eventos publicados aparecen en el calendario, la búsqueda global y el `.ics`.

### Accesibilidad y seguridad

- Auditoría automatizada `npm run auditoria:a11y` sin hallazgos.
- Pista de subtítulos WebVTT y nota descriptiva del video.
- Corrección de jerarquía de encabezados y etiquetas de formularios.
- 2FA TOTP para la cuenta, con opción de exigirla para administración.
- Revisión y cierre de sesiones activas por RPC autenticados.
- `is_community_admin` exige AAL2 cuando la cuenta activa `mfa_required`.

### Calidad

- 133 pruebas aprobadas.
- Migraciones 12 a 15 aplicadas en producción.
- Webhook transaccional creado en Brevo con eventos de entrega, rebote y baja.
- Producción verificada: búsqueda, calendario, cola, respuestas, 2FA y sesiones.

## [1.10.2] - 2026-11-10

### Correo

- Diagnóstico `npm run correo:check -- --netlify` para validar proveedor y remitente
  sin enviar mensajes.
- Errores de Brevo/Resend incluyen el detalle del proveedor para trazabilidad.
- Documentada la restricción de IP de la API de Brevo y el enlace de autorización.
- Producción verificada: la clave existe, pero Brevo bloquea la IP de salida;
  `EMAIL_ENABLED` queda en `false` hasta corregir la restricción.

## [1.10.1] - 2026-11-10

### Correo

- Adaptador SMTP autenticado además de Brevo y Resend.
- Endpoint manual `procesar-correo-manual.mjs` separado del programado.
- Variables `EMAIL_SMTP_*` documentadas.
- Verificación de producción: las migraciones 8 a 11 están aplicadas, la cola
  encola avisos y comprobantes, y el procesamiento manual responde con la cola vacía.
- `EMAIL_ENABLED=false` hasta cargar una credencial de proveedor válida; la
  configuración SMTP de Supabase Auth no se reutiliza automáticamente.

## [1.10.0] - 2026-11-10

### Flujo editorial

- Roles `editor`, `revisor` y `administrador`; asignación auditada desde Gestión.
- Estados de página: borrador, en revisión, aprobado, rechazado y publicado.
- Envío a revisión con nota, aprobación/rechazo y publicación solo con aprobación.
- Registro de autor, rol, fecha, nota, quién aprobó y quién publicó cada versión.
- Migración `202611100008_equipo_editorial.sql`.

### Búsqueda global

- Nueva página `buscador.html` y vista PostgREST `search_index`.
- Índice de páginas, carreras, publicaciones vigentes y eventos del calendario publicado.
- Filtros por tipo, carrera y rango de fechas; RLS respetada con `security_invoker`.
- Migración `202611100009_busqueda_global.sql`.

### Métricas responsables

- Conteos diarios de páginas, publicaciones y búsquedas sin IP, cookies ni términos.
- Respeto de Do Not Track, retención de 365 días y panel en Gestión.
- Migración `202611100010_metricas.sql`.

### Correo transaccional

- Cola persistente con avisos de consultas, comprobante al remitente, reintentos
  exponenciales, eventos de trazabilidad, reintento manual y bajas por token.
- Endpoints `procesar-correo.mjs` (programado/cron) y `baja.mjs`.
- Adaptadores Brevo y Resend; variables documentadas en `.env.example`.
- Migración `202611100011_correo_cola.sql`.

### Calidad y documentación

- Nuevas pruebas de roles, búsqueda, métricas y correo. Total: 118 pruebas aprobadas.
- Guías de arquitectura, administración y despliegue actualizadas.
- Política de privacidad ampliada para correo, búsqueda y métricas agregadas.
- Consolida las mejoras de rendimiento, SEO y seguridad preparadas como 1.9.0.
- Migraciones aplicadas y despliegue de producción verificado el 2026-11-10.


## [1.9.0] - 2026-11-10

### Rendimiento y contenido

- Galería, video institucional, audio, logo e imágenes de portada optimizados:
  el paquete público baja de ~68 MB a ~16 MB sin cambiar nombres ni romper
  referencias del CMS.
- Se elimina la dependencia de imágenes de Unsplash en la portada; las carreras
  usan recursos locales y descripciones accesibles.
- El build excluye `assets/images/image.png` y los originales de Madera que no
  deben publicarse.
- Se agrega `public/` para `robots.txt`, `sitemap.xml` y `404.html`.
- Metadatos canonical, Open Graph y Twitter Card en las páginas públicas.

### Seguridad y operación

- Cabeceras CSP, Permissions-Policy, X-Frame-Options y caché diferenciada en
  `netlify.toml`; las pantallas privadas no se cachean.
- `.env.example`, `.editorconfig` y `.nvmrc` para reproducibilidad.
- Documento de [arquitectura](docs/ARQUITECTURA.md) con la frontera frontend/backend.

### Calidad

- Lógica de tema unificada en `tema.js`; se elimina la duplicación en galería,
  calendario e historia.
- Nuevas pruebas de recursos locales, SEO, presupuesto de medios, build público
  y configuración de Netlify. Total: 90 pruebas aprobadas.


## [1.8.0] - 2026-10-20

### Skynet

- Personaje PNG con transparencia, optimizado desde la imagen aportada.
- Saludos, seguimiento de carrera, nombre de pila/apodo opcional, recuerdo
  autorizado en la cuenta y control para olvidarlo.
- Búsqueda de títulos publicados vigentes con filtros y enlaces a artículos concretos.
- Historial privado por cuenta con consentimiento: hasta 100 turnos, paginación de
  30, ventana de 90 días, descarga, borrado y reintentos idempotentes.
- Validación de fuentes locales, prevención de datos sensibles evidentes y limpieza
  de estado ante cambios de sesión. No se incorpora IA generativa.
- Migración incremental séptima con RLS por propietario y escrituras solo mediante RPC.

### Documentación y organización

- README reestructurado por capacidades, arquitectura, desarrollo, operación y privacidad.
- Índice de documentación, guía de Skynet y procedimiento de contribución estudiantil.
- Guías actuales actualizadas; versiones históricas conservadas como evidencia docente.
- About de GitHub con descripción, sitio publicado y temas pertinentes.
- Verificación de autores: API de Contributors sin Copilot; no se reescribe historia.

## [1.7.0] - 2026-10-20

### Agregado

- Contacto con Netlify Function y RPC privado de Supabase: comprobante UUID,
  idempotencia, validación de servidor, honeypot y límite persistente por HMAC de IP.
- Bandeja administrativa de consultas con búsqueda, estados, responsables, notas,
  historial y eliminación definitiva; concurrencia controlada por versiones.
- Comunicados, documentos, proyectos estudiantiles y horarios con filtros,
  paginación, programación, vencimiento, historial privado y enlaces HTTPS.
- Carga administrativa de PDF públicos de hasta 10 MB en un bucket separado.
- Calendario multianual 2000–2100 y exportación iCalendar de eventos cargados.
- Integración de los nuevos recursos con la navegación y servicios compartidos.
- Notificaciones internas por intereses, preferencias, lecturas privadas,
  avisos manuales idempotentes y sincronización automática de publicaciones.
- Skynet, asistente guiado con doce temas y fuentes locales, diálogo accesible,
  sin IA generativa ni envío o persistencia de conversaciones.
- Protección de las pantallas privadas frente a respuestas pendientes al cerrar sesión.
- Selector estable del botón de contacto en el catálogo CMS, conservando los IDs
  y las publicaciones existentes; generación de catálogo compatible con el calendario multianual.

### Compatibilidad y activación

- Migraciones quinta y sexta aplicadas al Supabase real, conservando el CMS existente.
- Contacto activado explícitamente en Supabase, sin doble escritura en Netlify Forms.
- Sin nuevas cuentas, asignación automática de roles ni campañas de correo/push.
- Pruebas de permisos, límites, reintentos, vencimiento, conflictos y compatibilidad
  con las migraciones editoriales existentes.

## [1.6.1] - 2026-10-13

### Verificado

- La recuperación de contraseña envió y entregó un correo real desde el sitio de
  producción, después de actualizar la credencial SMTP en Supabase.
- Diagnóstico confirmado: Brevo rechazaba la conexión de Supabase por bloqueo IP
  (`525 5.7.1 Unauthorized IP address`), no por un error de la aplicación.
- Se desactivó únicamente el bloqueo IP para SMTP keys en Brevo; el bloqueo de
  API keys no se modificó y la autenticación SMTP continúa activa.

### Documentado

- Actualizado el estado de SMTP, el procedimiento de diagnóstico y las tareas de
  verificación del correo de confirmación de registro.
- Registrado que la recepción del correo de recuperación sí está probada, pero
  el cambio de contraseña y el correo de alta todavía requieren una prueba separada.

## [1.6.0] - 2026-10-13

### Agregado

- Exportación e importación de respaldos JSON por página en el CMS administrativo.
- Módulo dedicado para validar respaldos editoriales y generar nombres de archivo estables.
- Pruebas automatizadas del formato de respaldo.

### Verificado y documentado

- Estado real del correo transaccional en Supabase: el servicio predeterminado llegó a
  `over_email_send_rate_limit` y la configuración posterior con Brevo falló con
  `535 Authentication failed`, por lo que el frontend ahora comunica mejor esos errores.
- Operaciones administrativas reales ya comprobadas: guardar, publicar, restaurar y
  registrar/archivar un medio técnico sin dejar contenido de prueba visible.
- Guías de comunidad y administración actualizadas para dejar explícito qué ya está
  validado, qué depende del panel de Supabase y cómo usar los respaldos editoriales.

### Corregido

- Mensajes de Auth más claros para límites de envío, destinatarios no autorizados y
  fallos internos derivados de una configuración SMTP incompleta o incorrecta.
- Historial Git preparado sin atribución automática de Copilot en los commits públicos
  reescritos de `v1.4.0`, `v1.4.1` y `v1.5.0`.

## [1.5.0] - 2026-10-13

### Agregado

- Contacto por HTTPS con Netlify Forms: consentimiento, honeypot, límites de
  campos, confirmación de recepción y conservación de datos ante errores.
- Pausa/reanudación de galerías, suspensión al interactuar o al ocultar la pestaña,
  controles de video y respeto al movimiento reducido.
- Pruebas de interacción de galerías y de envío de consultas.
- Tarea reproducible de VS Code para levantar el sitio local.

### Verificado en el backend real

- Cuenta administrativa autenticada: guardar, publicar y restaurar Madera.
- Publicación v2 y borrador restaurado v3 con el mismo contenido de la plantilla.
- Subida, registro, lectura pública y archivo de un medio técnico de 308 bytes.
- Las pruebas no cambiaron textos, materias ni las cinco fotos del taller.
- Consulta HTTPS confirmada en Netlify Forms; eliminado únicamente el envío técnico.
- Recuperación por correo bloqueada por HTTP 429 del servicio predeterminado:
  error comunicado explícitamente, sin cambiar contraseña ni desactivar confirmación.

### Corregido

- Indicadores de galería mantienen el foco al navegar y las flechas no desplazan
  la página ni interfieren con formularios.
- Servidor local sirve JSON y MP4 con su tipo correcto, admite HEAD y rechaza
  envíos que no puede procesar, sin aparentar recepción exitosa.
- Mensaje explícito al intentar iniciar una segunda instancia en el puerto 4173.

## [1.4.1] - 2026-10-13

### Corregido

- Desactivado el posprocesado HTML de Netlify: las rutas `.html` y los campos del
  catálogo CMS se conservan como se verificaron localmente, sin reescritura de enlaces.
- Ajuste detectado durante la verificación pública de la entrega 1.4.0.

## [1.4.0] - 2026-10-13

### Agregado

- Tres páginas independientes de carreras, conectadas a la navegación y editables desde el CMS.
- Síntesis curricular con fuentes y materias de 4.º a 7.º, campos formativos y horas reloj anuales de los documentos aportados.
- Galerías por carrera y espacios preparados para horarios y equipo docente.
- Componentes compartidos de carreras, redes, visitas locales, clima/fecha y música en todas las páginas.
- Migración incremental de carreras que conserva las cuatro plantillas y datos editoriales anteriores.
- Cinco fotos autorizadas del taller de Madera y Mueble, optimizadas a WebP, con nombres descriptivos y metadatos eliminados.
- Paquete de publicación en `dist/` y verificación automática con GitHub Actions y Netlify.
- CMS editorial por bloques para las cuatro páginas institucionales: textos, títulos, enlaces, imágenes de portada, cabecera y pie.
- Administrador con biblioteca de medios, editor de galería/agenda/audios, vista previa, borradores, publicación e historial restaurable.
- Backend Supabase con validación de documentos y plantillas, RLS, funciones transaccionales y protección contra ediciones concurrentes.
- Storage público para medios autorizados con altas administrativas, límite de 20 MB y archivos inmutables.
- Portal de comunidad con registro, login, confirmación de correo y recuperación mediante Supabase Auth.
- Perfiles de comunidad, alumno/a y profesor/a; permisos institucionales por aprobación y administración asignada privadamente.
- Cuenta con intereses y consentimiento opcional para futuros avisos, sin envío de notificaciones en esta entrega.
- Migración PostgreSQL con RLS, permisos de columnas, fechas de consentimiento y aprobación administrativa.
- Diseño adaptable claro/oscuro, información de privacidad, guía de activación y pruebas automatizadas de permisos y validación.
- Acceso al portal desde la navegación y el directorio de las cuatro páginas institucionales.

### Mejorado

- Selector de tema del inicio extraído como recurso compartido con el portal.
- La galería de cada carrera conserva su contenido local incluso sin configuración o ante fallos del CMS.
- Navegación por flechas de galería limitada a sus controles, sin interferir con formularios ni el reproductor.
- Fotografías verticales de Madera visibles completas, sin recorte forzado.
- Despliegue excluye originales de fotos, dependencias, pruebas, SQL y documentos fuente.

### Activado para pruebas locales

- Proyecto Supabase real conectado con clave publishable y las tres migraciones aplicadas desde SQL Editor.
- Verificados RLS, catálogo de cuatro páginas, bucket de 20 MB y restricciones de acceso anónimo.
- URLs de Auth configuradas para localhost:4173, confirmación de correo requerida y contraseña mínima de 12 caracteres.
- Primera cuenta confirmada habilitada como administrador/a mediante operación privada; acceso al editor confirmado por su titular.
- Cuarta migración aplicada al proyecto real para habilitar las tres carreras en el backend editorial.
- Site URL y retornos exactos HTTPS de Netlify configurados, conservando los retornos locales de desarrollo.

### Pendiente para producción

- Configurar SMTP propio para registro abierto y probar los correos desde la URL de Netlify.
- Validar recuperación de contraseña y operaciones CMS autenticadas de extremo a extremo.
- Validar política de datos y autorizaciones para menores con la institución antes de recibir registros.

## [1.3.0] - 2026-09-25

### Agregado

- Nueva página de Historia Institucional con línea de tiempo, contenido basado en el documento institucional y acceso desde todas las secciones del sitio.
- Módulos de clima actual para San Fernando y selección automática de la fecha actual en el calendario 2026.
- Galería multimedia ampliada con las 15 imágenes y videos disponibles, navegación por teclado e indicadores.
- Recursos locales para la identidad visual: imágenes de la comunidad, diagrama de especialidades e íconos PNG de redes sociales.

### Mejorado

- Navegación, menú, pie de página, contraste y modo oscuro en Inicio, Galería, Calendario e Historia.
- Diseño responsive sin desbordamiento horizontal comprobado en anchos de 320, 375, 768, 1024 y 1440 px.
- Hero de Historia con jerarquía visual, botón separado del texto y marcador de fundación destacado en celeste.

### Pendiente para producción institucional

- Registrar la autorización de imagen y el responsable de cada foto, video y audio antes de difundir la URL pública.
- Confirmar los datos de contacto, las fechas de calendario y los enlaces externos con Secretaría y equipo directivo.
- Sustituir el contador local por una herramienta de analítica institucional con política de privacidad, o retirarlo.

## [1.2.0] - 2026-09-24

### Agregado

- Galería multimedia institucional con fotografías, video, navegación por teclado, indicadores y controles de reproducción.
- Calendario 2026 mejorado: selección de fecha, detalle accesible de cada evento y actualización del feriado nacional del 20 de noviembre.
- Configuración de Netlify para publicar el sitio estático desde la raíz del repositorio, sin comando de compilación.

### Corregido

- Se declararon los finales de línea CRLF históricos para evitar falsos positivos de espacios finales durante la revisión del diff.

### Pendiente para producción institucional

- Obtener autorización escrita para cada fotografía, video y audio antes de difundir la galería pública.
- Vincular el repositorio con un sitio de Netlify administrado por una cuenta institucional y comprobar la URL de producción.
- Diseñar un área de administración con autenticación institucional y roles antes de permitir altas o ediciones de contenido.

## [1.1.1] - 2026-09-18

### Corregido

- Se eliminó una pista de audio referenciada que no estaba incluida en `assets/audio/`, evitando un error al usar los controles del reproductor.
- Se excluyeron del control de versiones los materiales fuente no destinados al sitio (`.pdf`, `.doc`, `.docx` y `.rar`).

### Revisado

- Se verificó la sintaxis de los scripts del sitio y las referencias locales de recursos publicados.
- Se registró una evaluación docente con criterios para una publicación institucional responsable.

### Pendiente para producción institucional

- Aprobar datos de contacto, calendario, fotografías, videos, audios y textos con las autoridades responsables.
- Reemplazar el formulario `mailto:` por un servicio de recepción seguro con responsable, consentimiento y confirmación.
- Completar pruebas manuales de accesibilidad, navegación móvil y enlaces externos antes de difundir la URL pública.

## [1.1.0] - 2026-09-08

### Agregado

- Centro institucional con accesos para preinscripción, trámites, familias y estudiantes.
- Menú de exploración, submenús por área y navegación adaptada a dispositivos móviles.
- Selector de tema claro/oscuro que conserva la preferencia en el navegador.
- Documentación para despliegue colaborativo y hoja de ruta de mejoras.
- Ficha de versión con registro del trabajo estudiantil y observaciones docentes.

### Modificado

- Reorganización de estilos, scripts, imágenes y audios dentro de `assets/`.
- Actualización de las referencias de recursos y agregado de favicon.
- Reproductor de audio ampliado a una lista de tres temas.
- Navegación mejorada para cerrar menús con enlaces, clic externo o tecla Escape.

### Pendiente

- Reemplazar contenidos de ejemplo por datos institucionales oficiales y vigentes.
- Confirmar derechos de uso y autorizaciones de las imágenes, videos y audios.
- Conectar los accesos y formularios a servicios reales, seguros y con responsables definidos.
- Realizar pruebas de accesibilidad y de uso en teléfonos antes del despliegue público.

## [1.0.0] - 2026-09-08

### Agregado

- Primera versión de muestra del sitio institucional.
- Presentación de especialidades, galería, mapa, formulario y reproductor de audio.
- Navegación responsive, animaciones y mejoras básicas de accesibilidad.

### Pendiente

- Confirmar y reemplazar los datos institucionales de muestra.
- Conectar el formulario a un servicio de envío seguro.
- Validar licencias de imágenes y audios antes de una publicación pública.
