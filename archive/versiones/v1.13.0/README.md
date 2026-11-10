# Entrega 1.13.0 — Calendario recurrente y correo verificado

Corrección/ampliación sobre la 1.12.1.

## Cambios

- Eventos recurrentes semanales, mensuales y anuales con fecha límite.
- El calendario público y la suscripción `.ics` expanden las ocurrencias.
- El editor de Gestión permite indicar recurrencia y fecha límite.
- Validación de recurrencia y fecha en PostgreSQL.
- Envío real de correo verificado desde Netlify (`sent`).
- Webhook de Brevo activo.

## Verificación

- 140 pruebas aprobadas.
- Auditoría de accesibilidad sin hallazgos automáticos.
- Migración 18 aplicada en producción.
- Feed RSS, `.ics`, manifest, service worker y página offline publicados.

## Pendientes

1. Preinscripción con definición institucional de menores, retención y responsables.
2. Auditoría manual de accesibilidad con lector de pantalla y teléfono real.
3. Rotación de secretos de correo y responsables de la cola.
