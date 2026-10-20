# Entrega 1.7.0 — Gestión, notificaciones y Skynet

Trabajo de estudiantes de la EEST N°3, con corrección técnica y seguimiento docente.
La publicación técnica no sustituye la aprobación institucional de contenidos,
autorizaciones de imagen, responsables de tratamiento o conservación de datos.

## Desarrollo incorporado

- Contacto real en Supabase mediante Netlify Function: validación de servidor,
  comprobante, consentimiento, reintentos idempotentes y límite persistente.
- Bandeja administrativa con estados, responsables, notas, historial y eliminación.
- Comunicados, documentos PDF, proyectos y horarios, con filtros, programación,
  vencimiento y control de concurrencia.
- Calendario multianual y exportación iCalendar.
- Notificaciones internas por intereses, preferencias y lecturas privadas.
  Avisos manuales y sincronización automática desde publicaciones.
- Skynet: asistente guiado por doce temas, con fuentes locales, diálogo accesible,
  cierre con Escape y retorno del foco. No es IA generativa y no guarda conversaciones.
- Corrección de respuestas pendientes tras cerrar sesión y del selector CMS del
  botón de contacto, sin renumerar campos ni modificar publicaciones anteriores.

## Evidencias de verificación

- 71 pruebas automatizadas aprobadas: Auth, CMS, contacto, publicaciones,
  notificaciones, calendarios, sesiones, galerías, carreras y paquete público.
- Build correcto; el paquete público excluye funciones, SQL, pruebas y dependencias.
- Migraciones quinta y sexta aplicadas con autorización al Supabase real.
  Las ocho tablas nuevas tienen RLS habilitada; las publicaciones CMS anteriores
  conservaron sus cantidades.
- Contacto en producción: HTTP 201, reintento con idéntico comprobante y una sola
  fila persistida. Consulta adicional desde el formulario publicado: comprobante
  visible y limpieza de campos después de la recepción.
- Gestión real de la consulta técnica mediante RPC administrativa, seguida de
  eliminación. Las dos consultas de prueba y su historial quedaron eliminados.
- Prueba transaccional en PostgreSQL real bajo rol autenticado administrativo:
  creación idempotente, lectura, preferencias, retiro, publicación automática,
  edición sin duplicar ni perder lecturas y retiro del artículo. Rollback completo;
  no quedaron artículos ni avisos de prueba.
- API REST real: acceso anónimo denegado a consultas, historial, preferencias,
  lecturas y RPC privados; lectura pública de artículos habilitada.
- Navegador a 375 px: Skynet reconoce temas y desconocidos, conserva ocho turnos,
  cierra con Escape y devuelve el foco, sin overflow ni tráfico externo por consultar.
- Comprobados 1482 selectores de las siete plantillas CMS contra los HTML.
- Interfaz de notificaciones comprobada con respuestas simuladas y eventos DOM:
  lectura, desactivación/reactivación, creación y retiro. Esta prueba no sustituye
  una sesión real de usuario de extremo a extremo.

## Corrección docente

Se reconoce la integración del frontend con persistencia real, control de acceso,
auditoría y pruebas de regresión. Se corrigió la expectativa de que una respuesta
HTTP exitosa bastaba como evidencia: se verificaron filas, duplicados y eliminación.
Se preservaron los campos CMS existentes y el contenido previo.

### Próxima entrega y criterios de aceptación

1. **Validación institucional:** confirmar responsables, retención, canales,
   contenidos oficiales y autorizaciones para menores e imágenes.
2. **Auth:** completar confirmación de un registro autorizado y cambio de contraseña;
   la recepción del correo de recuperación ya se comprobó en la entrega anterior.
3. **Accesibilidad:** probar con lector de pantalla y teléfonos físicos; importar
   una agenda `.ics` en un calendario de prueba independiente.
4. **Operación:** completar una sesión real de usuario en el centro de notificaciones
   y una carga de PDF autorizado; no subir documentos sensibles.
5. **Recuperación:** ejecutar un simulacro documentado de backup/restauración y
   definir monitoreo sin registrar datos personales.
6. **Etapas futuras:** campañas de correo con cola y bajas, push, preinscripción
   y roles editor/revisor requieren diseño y aprobación separados.

Los avisos actuales son internos: no envían campañas ni push. Skynet orienta;
no confirma vacantes, no inventa requisitos ni realiza trámites.
