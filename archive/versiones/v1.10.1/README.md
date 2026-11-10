# Entrega 1.10.1 — Correo SMTP y verificación de producción

Corrección incremental sobre la 1.10.0.

## Cambios

- Adaptador SMTP autenticado además de Brevo y Resend.
- Endpoint `procesar-correo-manual.mjs` separado del programado.
- Variables `EMAIL_SMTP_*` documentadas en `.env.example` y en la guía de activación.
- Migraciones 8 a 11 aplicadas en producción mediante Management API.
- Deploy de producción verificado desde el commit `d163044`.

## Verificación

- 118 pruebas aprobadas y build correcto.
- `search_index` responde a anónimos y respeta RLS.
- `metrics_register` valida; los resúmenes están restringidos al equipo.
- `email_claim` responde con permisos de servicio.
- Consulta técnica → cola: 2 avisos generados; datos de prueba eliminados.
- `procesar-correo-manual`: 200 con secreto, 401 sin secreto.
- SMTP interno de Auth no reutilizable de forma automática: la verificación
  devolvió `535 5.7.8 Authentication failed`. Se deja `EMAIL_ENABLED=false`
  hasta cargar una credencial de proveedor válida.

## Pendiente

1. Cargar `BREVO_API_KEY` o `RESEND_API_KEY`, o credenciales SMTP válidas.
2. Verificar el remitente y activar `EMAIL_ENABLED=true`.
3. Probar un envío y una baja antes de difundir el canal.
