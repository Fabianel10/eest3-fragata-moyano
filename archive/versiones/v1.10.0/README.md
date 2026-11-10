# Entrega 1.10.0 — Equipo editorial, búsqueda, métricas y correo

Proyecto estudiantil de la EEST N.º 3 «Fragata Moyano», con revisión técnica y
corrección docente. Esta entrega consolida también las mejoras de rendimiento,
SEO y seguridad preparadas en el ciclo 1.9.0.

## Capacidades incorporadas

### Flujo editor / revisor
- Roles `editor`, `revisor` y `administrador`, asignados desde Gestión y auditados.
- Estados de página: borrador, en revisión, aprobado, rechazado y publicado.
- Envío a revisión con nota; aprobación o rechazo; publicación solo con aprobación.
- Registro de autor, rol, fecha, nota, quién aprobó y quién publicó cada versión.
- Un editor no modifica páginas durante la revisión; un revisor no edita contenido.

### Buscador global
- Página `buscador.html` y vista pública `search_index`.
- Índice de páginas, carreras, comunicados, documentos, proyectos, horarios y
  eventos del calendario publicado.
- Filtros por tipo, carrera y rango de fechas; resultados paginados y accesibles.
- RLS respetada mediante `security_invoker`; no expone borradores ni vencidos.

### Métricas responsables
- Conteos diarios de páginas, publicaciones y búsquedas.
- Sin IP, cookies, sesión, user-agent ni texto de búsqueda.
- Retención de 365 días y purga al registrar actividad.
- Panel en Gestión para el equipo editorial.

### Correo transaccional
- Cola persistente de avisos de consultas y comprobantes al remitente.
- Reintentos exponenciales, recuperación de envíos interrumpidos y trazabilidad.
- Bajas por token, cancelación de pendientes y reintento manual.
- Adaptadores Brevo y Resend; endpoint programado y endpoint manual autenticado.

### Rendimiento, SEO y seguridad
- Paquete público reducido de ~68 MB a ~16 MB sin romper el CMS.
- Galería, video, audio, logo y portada optimizados; sin Unsplash en la portada.
- `robots.txt`, `sitemap.xml`, `404.html`, canonical y Open Graph.
- CSP, Permissions-Policy, X-Frame-Options y caché diferenciada en Netlify.
- Tema unificado y pruebas de recursos, SEO y presupuesto de medios.

## Activación en producción

- Migraciones 8 a 11 aplicadas con la API de Management de Supabase.
- Migraciones 1 a 7 registradas como baseline en `schema_migrations`.
- Deploy de producción completado en `https://eest3sf.netlify.app`.
- Funciones desplegadas: `contacto`, `baja`, `procesar-correo`,
  `procesar-correo-manual`.
- `EMAIL_ENABLED=false` porque todavía no se cargó una clave de Brevo o Resend.
  Las consultas reales se encolan; los envíos se activan al configurar proveedor,
  remitente verificado y `EMAIL_ENABLED=true`.

## Verificación

- **118 pruebas aprobadas** y build correcto.
- Pruebas de PostgreSQL embebido para roles, estados, aprobación, búsqueda, métricas,
  cola, reintentos, bajas y RLS.
- Producción: `search_index` responde a anónimos; filtros por tipo y texto funcionan.
- Producción: `metrics_register` valida; `metrics_summary` y `email_admin_summary`
  denegados a anónimos.
- Producción: `email_claim` responde con cola vacía y permisos de servicio.
- Prueba real de consulta → cola: generó aviso interno y comprobante; se eliminaron
  consulta, cola, eventos y límite de prueba. No quedaron datos técnicos.
- `procesar-correo-manual`: 200 con secreto, 401 sin secreto.
- Endpoint programado desplegado; Netlify bloquea su invocación externa.

## Límites y próximos pasos

1. Cargar `BREVO_API_KEY` o `RESEND_API_KEY`, verificar `EMAIL_FROM` y activar
   `EMAIL_ENABLED=true`. Probar un envío técnico y una baja antes de difundir.
2. Asignar roles reales desde Gestión → Equipo editorial.
3. Revisar con Secretaría contenidos, fechas, autorizaciones de imagen y retención.
4. Completar auditoría de accesibilidad con lector de pantalla y teléfono físico.
5. Definir responsables de la bandeja de consultas y del monitoreo de la cola.
6. Evaluar respuestas por correo y campañas con consentimiento como etapa separada.

No se envían campañas masivas ni push. La cola actual es transaccional. Los PDF
siguen siendo públicos por URL. No subir legajos, firmas, DNI ni documentación sensible.
