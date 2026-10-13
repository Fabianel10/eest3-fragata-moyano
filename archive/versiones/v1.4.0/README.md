# Versión 1.4.0 · Revisión docente del trabajo estudiantil

**Fecha:** 2026-10-13

**Etiqueta:** `v1.4.0`

**Sitio de trabajo:** https://eest3sf.netlify.app

**Alcance:** consolidación técnica y devolución docente; no certifica aprobación
institucional, legal ni curricular.

## Trabajo integrado

- Portal de comunidad con registro, acceso, confirmación de email, recuperación,
  preferencias y solicitud de perfiles.
- Roles institucionales con aprobación; administración asignada privadamente.
- CMS de siete páginas con bloques, medios, borradores, vista previa, publicación,
  historial/restauración y control de concurrencia.
- Backend real Supabase: Auth, PostgreSQL/RLS, funciones transaccionales y Storage.
- Páginas de Informática Personal y Profesional, Industrialización de la Madera
  y el Mueble y Maestro Mayor de Obras, articuladas con Inicio, Galería y Calendario.
- Síntesis de los diseños aportados, materias de 4.º a 7.º y horas reloj anuales.
- Clima/fecha, redes, música y contador local disponibles en todas las páginas.
- Cinco fotografías nuevas del taller de Madera, autorizadas por quien solicita
  esta publicación. No se inventan fecha de captura, cursos ni nombres de personas.

## Correcciones realizadas en la revisión

1. Las fotos se publican como `taller-01.webp` a `taller-05.webp`, sin nombres
   personales en las rutas ni metadatos de cámara. Cada una pesa menos de 250 KB;
   todas conservan proporción 1200 × 1600 y se muestran sin recorte forzado.
2. Galería inicial de Madera independiente de la galería institucional. Se conserva
   cuando no hay publicación CMS o falla el servicio; las publicaciones editoriales
   existentes conservan prioridad y no se sobrescriben.
3. Flechas de galería restringidas a sus controles, evitando interferencias con
   entradas de formularios y ajustes del reproductor.
4. Netlify publica un paquete explícito `dist/`, no la raíz con SQL, dependencias,
   pruebas, documentos fuente ni fotos originales.
5. Pruebas y empaquetado automáticos en GitHub Actions y en el deploy de Netlify.
6. Documentación de responsables, límites y procedimiento de reversión actualizada.

## Verificación de la entrega

- 33 pruebas automatizadas: currículo, galería, límites, RLS, roles, consentimiento,
  publicación, conflictos, historial, Storage y exclusión de archivos no públicos.
- Paquete estático generado y comprobado sin documentos, pruebas ni originales.
- Las cinco fotografías cargan en navegador con títulos descriptivos.
- El backend de carreras conserva las cuatro plantillas anteriores.
- La publicación no reejecuta las migraciones ya aplicadas ni cambia datos de cuentas.
- Auth usa Site URL de Netlify y retornos HTTPS exactos para comunidad y recuperación;
  las dos rutas locales se conservaron y la configuración persistió tras recargar.
- Antes de afirmar un circuito completo de correo o edición real se requiere probar
  confirmación, recuperación y operaciones autenticadas con la cuenta institucional.

## Devolución docente

El equipo avanzó de una presentación estática a un sistema con responsabilidades
claras entre interfaz, autenticación, datos y edición. Se valora la articulación de
las carreras, la identificación de fuentes curriculares y el uso de pruebas para
distinguir contenido público de información privada. La nueva galería acerca la
identidad visual al entorno real del taller.

El próximo objetivo no es sumar funciones sin control: es consolidar calidad de
contenido, accesibilidad, mantenimiento y evidencias de funcionamiento. Cada mejora
debe incluir responsable, criterio de aceptación, prueba reproducible y revisión
por otra persona. No se asigna una nota numérica sin rúbrica ni evaluación docente presencial.

## Próxima entrega

| Prioridad | Equipo / responsable propuesto | Trabajo | Evidencia de aceptación |
| --- | --- | --- | --- |
| Alta | Institución + infraestructura | SMTP y circuito Auth en producción | Confirmar cuenta y recuperar contraseña con correo autorizado |
| Alta | Contenido + Secretaría | Validar contactos, canales sociales, fuentes curriculares y calendario | Registro de responsable, fuente y fecha por contenido |
| Alta | Accesibilidad | Pausa del carrusel, foco, contraste, lector de pantalla y subtítulos | Informe con recorridos de teclado y correcciones verificadas |
| Alta | Administración | Probar guardar, publicar, restaurar y subir medios con cuenta real | Evidencias sin contraseñas ni datos personales |
| Media | Cada especialidad | Fotos propias de Informática y Obras y proyectos contextualizados | Medios autorizados con descripción de actividad y fecha verificada |
| Media | Coordinación académica | Horarios y equipo docente por año/división/turno | Información oficial con fecha de actualización |
| Media | Infraestructura | Copias de seguridad y recuperación | Ensayo de restauración documentado según el plan de Supabase |
| Media | Desarrollo | Preparar calendario 2027 y reducir duplicación de componentes | Una fuente de eventos y pruebas para cambio de año |

## Límites que deben comunicarse

El contador es local por dispositivo, no analítica global. Las preferencias de
avisos se guardan, pero no se envían campañas. Los horarios y docentes no están
completados. Las redes heredadas deben validarse con la institución. La autorización
de estas cinco fotos no acredita licencias o consentimientos de todos los recursos
históricos. Mantener el registro de autorizaciones por canal privado institucional.
