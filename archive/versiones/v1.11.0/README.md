# Entrega 1.11.0 — Correo avanzado, respuestas, calendario, accesibilidad y 2FA

Proyecto estudiantil de la EEST N.º 3 «Fragata Moyano», con revisión técnica y
corrección docente.

## Capacidades incorporadas

### Correo
- HTML accesible y `reply-to` en avisos y respuestas.
- Alertas internas cuando un envío llega al máximo de intentos.
- Webhook de rebotes/complaints con baja automática y eventos.
- Diagnóstico de proveedor sin enviar correos.
- Brevo, Resend y SMTP autenticado.

### Consultas
- Hilo de consulta con mensaje inicial y respuestas institucionales.
- Respuesta por correo desde Gestión, con nota, idempotencia y estado `respondida`.
- La respuesta queda en `contact_messages` y en la cola de correo.

### Calendario
- Eventos con fecha, título, tipo, descripción, fuente y responsable.
- Borrador/publicado, versión, concurrencia y fecha de actualización.
- Integración con calendario público, búsqueda global y exportación `.ics`.

### Accesibilidad
- Auditoría automática de etiquetas, nombres accesibles, IDs, encabezados,
  referencias ARIA, iframes, tabindex y subtítulos.
- Pista WebVTT y nota descriptiva del video institucional.
- Corrección de jerarquía de encabezados y controles.

### Seguridad
- 2FA TOTP con QR y código de verificación.
- Opción de exigir AAL2 para operaciones de administración.
- Listado de sesiones propias, cierre individual y cierre de las demás.
- Funciones SQL con RLS, permisos mínimos y `search_path=''`.

## Activación

- Migraciones 12 a 15 aplicadas con Management API.
- Webhook transaccional creado en Brevo (eventos de entrega, rebote y baja).
- Deploy de producción desde Git.
- `EMAIL_ENABLED=false` mientras Brevo mantenga el bloqueo de IP de API:
  Netlify usa IP de salida dinámica. Se observaron `3.147.59.242` y
  `13.184.249.207`; agregar una sola IP no alcanza. La solución estable es
  desactivar la restricción de IP para la API o usar un proxy con IP fija.
- La cola, el hilo, el calendario, la búsqueda y las métricas funcionan sin envío
  de correo. Al habilitar el proveedor se procesan los pendientes.

## Verificación

- **133 pruebas aprobadas** y build correcto.
- Pruebas de PostgreSQL embebido para HTML/reply-to, alertas, rebotes, respuestas,
  calendario, 2FA, sesiones y RLS.
- Auditoría automática de accesibilidad sin hallazgos.
- Producción: `search_index`, `calendar_events`, `contact_messages` y RPCs nuevos.

## Límites

- La 2FA se configura desde la cuenta; la exigencia para administración es opt-in
  y debe activarse después de verificar un factor TOTP.
- La recuperación de una cuenta que perdió su factor requiere un operador de
  Supabase; documentar responsables antes de exigir 2FA en todas las cuentas.
- El webhook de Brevo debe configurarse en el panel del proveedor con la URL y el
  secreto correspondientes.
- La revisión con lector de pantalla y teléfono físico sigue siendo manual.
