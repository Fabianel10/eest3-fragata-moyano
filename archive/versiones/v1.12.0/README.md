# Entrega 1.12.0 — Operación, seguridad y acceso

Proyecto estudiantil de la EEST N.º 3 «Fragata Moyano».

## Correo verificado

- La restricción de IP de la API de Brevo fue desactivada por la institución.
- Prueba real desde Netlify: `enviados=1`, `fallidos=0`, estado `sent`.
- El mensaje técnico se eliminó de la cola después de verificar; el correo de
  prueba llegó al remitente institucional.
- HTML, `reply-to`, webhook de rebotes y diagnóstico siguen activos.

## Recuperación de 2FA

- Ocho códigos de un solo uso, almacenados como hash.
- `mfa_recovery_use` elimina los factores TOTP y desactiva la exigencia de 2FA.
- Cada código se invalida después de usarse.
- La recuperación sigue siendo un evento sensible: la institución debe definir
  quién la autoriza y cómo se comunica.

## Respuestas

- Plantillas reutilizables por administración.
- Adjuntos por enlace HTTPS con nombre visible.
- El hilo conserva el adjunto y la cola lo incorpora al texto y HTML.

## Monitoreo y respaldos

- `system_health` muestra cola, antigüedad, consultas nuevas, calendario y métricas.
- Exportación CSV de métricas.
- Respaldo diario programado a las 03:00 UTC en `institutional-backups`.
- El respaldo incluye contenido editorial, publicaciones, calendario, plantillas e
  índice; excluye consultas, perfiles, sesiones y métricas.

## Acceso y descubrimiento

- PWA con manifest, service worker, iconos y página offline.
- Suscripción `.ics` a eventos publicados.
- RSS en `/feed.xml`.
- JSON-LD de organización y sitio.
- Sinónimos de búsqueda.

## Verificación

- **140 pruebas aprobadas** y build correcto.
- Auditoría automática de accesibilidad sin hallazgos.
- Migraciones 12 a 17 aplicadas en producción.
- Webhook de Brevo activo.
- Envío real de correo confirmado.

## Pendientes

1. Preinscripción: requiere definición institucional de requisitos, retención y
   tratamiento de menores. No se activa por defecto.
2. Recurrencia de calendario: la suscripción `.ics` ya funciona, pero los eventos
   recurrentes aún se cargan como fechas individuales.
3. Auditoría manual con lector de pantalla, contraste medido y teléfonos reales.
4. Rotación y responsables de los secretos de correo.
