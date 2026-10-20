# Historial de cambios

Este proyecto utiliza [versionado semántico](https://semver.org/lang/es/).

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
