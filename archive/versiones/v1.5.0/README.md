# Versión 1.5.0 · Servicios y verificación real

**Fecha:** 2026-10-13

Continúa la entrega estudiantil con revisión docente, sin reemplazar la
validación institucional de datos, autorizaciones y contenidos.

## Funciones completadas

- Formulario de contacto HTTPS con Netlify Forms, consentimiento explícito,
  honeypot, límites, confirmación y tratamiento de errores sin perder los campos.
- Desarrollo y vista previa no envían consultas.
- Pausa/reanudación de las cuatro galerías, suspensión al interactuar o cambiar
  de pestaña, controles de video y movimiento reducido sin reproducción automática.
- Indicadores estables para conservar el foco y navegación por teclado sin
  interferencias con formularios.
- Arranque con la tarea Sitio local, tipos JSON/MP4 correctos y error de puerto
  ocupado comprensible.

## Operaciones reales comprobadas

Con autorización del titular se probó la cuenta administrativa en producción:

1. Guardar Madera como borrador v1.
2. Publicar v2 sin cambiar el contenido.
3. Restaurar la versión guardada como borrador v3, conservando la publicación v2.
4. Verificar igualdad de valores con la plantilla inicial, incluidos textos,
   materias y las cinco fotos autorizadas.
5. Subir y registrar un PNG técnico de 308 bytes, comprobar lectura HTTP 200 y
   archivarlo para retirarlo de la biblioteca activa.

El historial registra estas operaciones. Archivar no elimina el medio de Storage
ni afecta recursos históricos; el archivo de prueba no se incorporó a las páginas.
No se reejecutaron migraciones ni se cambiaron permisos de cuentas.

## Validación

- 43 pruebas automatizadas: se conservan las 33 existentes y se agregan diez de
  contacto e interacción de galerías.
- Pruebas del CMS real, incluyendo restauración y Storage.
- Las cuatro galerías comprobadas en producción a 375 px, sin desbordamiento,
  con pausa funcional y sin errores de catálogo CMS.
- Recepción de contacto comprobada en producción: confirmación en pantalla y
  almacenamiento de la consulta técnica en la bandeja de Netlify. Ese envío,
  sin datos personales, se eliminó después de verificarlo.
- GitHub Actions y Netlify aprobaron la publicación; no se consideró suficiente
  una respuesta HTTP aislada como prueba del formulario.

## Dependencias externas pendientes

SMTP personalizado todavía no está habilitado en el proyecto Supabase comprobado.
Requiere proveedor, remitente autorizado y credenciales cargadas directamente en
el panel, nunca en el repositorio. El servicio predeterminado es limitado y no
equivale a registro abierto para cualquier destinatario.
La prueba autorizada de recuperación devolvió HTTP 429 por límite de correo;
no se confirmó entrega ni se cambió la contraseña.

No se inventan horarios, docentes ni contactos institucionales. Las preferencias
de avisos se guardan para futuras campañas, pero esta versión no las envía.
Responsables, conservación de consultas y políticas para menores requieren
confirmación institucional.
