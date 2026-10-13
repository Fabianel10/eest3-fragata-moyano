# Versión 1.6.1 · Correo de recuperación operativo

**Fecha:** 2026-10-13

Corrección y verificación docente de la entrega estudiantil, manteniendo las
credenciales fuera del repositorio.

## Resultado real

- Supabase Auth utiliza el SMTP de Brevo con el host y puerto esperados.
- La recuperación de contraseña desde producción confirmó la recepción real del
  correo después de guardar una nueva clave SMTP.
- El error final fue `525 5.7.1 Unauthorized IP address`: la seguridad IP SMTP de
  Brevo bloqueaba conexiones desde la infraestructura de Supabase.
- Se desactivó solo el bloqueo IP para **SMTP keys** en Brevo. El bloqueo de
  **API keys** quedó sin cambios; el usuario y la clave SMTP continúan autenticando
  los envíos.

## Alcance pendiente

- No se cambió la contraseña de la cuenta durante la prueba.
- El mensaje de confirmación de una cuenta nueva todavía debe comprobarse con una
  cuenta de prueba autorizada antes de abrir el registro a todos los destinatarios.
- No se reejecutaron migraciones ni se alteró el contenido institucional.

## Evidencia automatizada y publicación

Esta versión actualiza documentación y estado operativo de SMTP. La entrega previa
v1.6.0 mantiene las pruebas automatizadas y build que ya habían pasado; esta corrección
no cambia código ejecutable.
