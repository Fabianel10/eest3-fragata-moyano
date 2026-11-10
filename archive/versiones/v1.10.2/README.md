# Entrega 1.10.2 — Diagnóstico de correo y restricción de IP de Brevo

Corrección incremental sobre la 1.10.1.

## Cambios

- Comando `npm run correo:check -- --netlify` para validar la clave del proveedor
  y el remitente sin enviar correos.
- Los errores de Brevo y Resend incluyen el mensaje del proveedor para trazabilidad.
- Se documenta la restricción de IP de la API de Brevo y el enlace de autorización.
- `EMAIL_ENABLED` queda en `false` mientras el diagnóstico falle.

## Verificación

- La clave `BREVO_API_KEY` existe en Netlify producción.
- Brevo respondió `401` con `unrecognised IP address` al probar desde la red local;
  desde Netlify la cola también registró `Brevo rechazó el envío (401)`.
- Se creó un mensaje técnico en `email_outbox`, se procesó y se eliminó junto con
  sus eventos. No quedó correo ni dato de prueba pendiente.
- 118 pruebas aprobadas y build correcto.

## Acción pendiente

En Brevo → Security → Authorized IPs, desactivar la restricción para la API o
autorizar las IP de salida de Netlify. Después:

```sh
npm run correo:check -- --netlify
netlify env:set EMAIL_ENABLED true --context production --force
netlify api createSiteBuild --data '{"site_id":"735db64b-2c1d-42ee-8f74-77d83922812e"}'
```

La restricción de SMTP es independiente de la de API. No reutilizar el secreto SMTP
interno de Supabase Auth.
