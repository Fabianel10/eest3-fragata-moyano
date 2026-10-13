# Versión 1.6.0 · Respaldo editorial y estado real de correo

**Fecha:** 2026-10-13

Continúa la entrega estudiantil con revisión docente. Esta versión no inventa
éxitos externos: deja documentado qué quedó probado en producción y qué sigue
dependiendo de la configuración institucional fuera del repositorio.

## Funciones completadas

- Exportación de respaldos JSON por página desde el CMS administrativo.
- Importación de respaldos JSON para recuperar un borrador local, incluso al
  cambiar de página dentro del editor.
- Nombres de archivo estables para los respaldos, con `slug` y fecha ISO segura.
- Mensajes más claros para límites de envío, destinatarios restringidos y fallos
  internos de Auth relacionados con la configuración de correo.

## Operaciones reales ya comprobadas

- Cuenta administrativa real con acceso confirmado.
- Guardado de borrador, publicación y restauración verificados en el backend real.
- Alta, lectura pública y archivo de un medio técnico en Storage.
- Contacto HTTPS confirmado en Netlify Forms.
- Suite automatizada ampliada a 46 pruebas aprobadas.

## Estado real del correo

Se comprobaron dos escenarios distintos en Supabase:

1. **Servicio predeterminado**: recuperación bloqueada por límite de envíos
   (`over_email_send_rate_limit`, HTTP 429).
2. **SMTP con Brevo cargado en el panel**: recuperación rechazada por
   `535 "5.7.8 Authentication failed"` en Auth Logs.

Conclusión: el sitio ya informa mejor estos fallos, pero el correo transaccional
todavía no quedó habilitado para producción institucional. Hace falta corregir en
Supabase el **login SMTP** y la **clave SMTP** correctos de Brevo, además de
mantener un remitente verificado.

## Corrección docente y publicación

- Se actualizaron las guías de comunidad y administración para reflejar el estado
  real del proyecto conectado.
- Se preparó la historia pública del repositorio para eliminar la atribución
  automática de Copilot de los commits publicados donde no debía figurar como
  contributor visible.
- La próxima validación obligatoria sigue siendo institucional: contenidos,
  responsables, políticas de datos y configuración final del correo.
