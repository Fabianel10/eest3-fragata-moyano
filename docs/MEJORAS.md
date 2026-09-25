# Hoja de ruta de organización

## Implementado en esta entrega

- Centro de organización en la página de inicio.
- Accesos agrupados para preinscripción, trámites, familias y estudiantes.
- Espacio preparado para agenda, fechas y comunicados institucionales.
- Navegación directa hacia el nuevo centro institucional.
- Aviso para identificar contenido de ejemplo que requiere validación oficial.

## Prioridad alta

- Definir responsables para actualizar cada contenido: secretaría, preceptoría, docentes y equipo directivo.
- Reemplazar datos de contacto, horarios y enlaces de ejemplo por información oficial confirmada.
- Conectar el formulario a un servicio seguro con confirmación de recepción; no utilizar `mailto` como canal principal.
- Crear un calendario único con actos, mesas, inscripciones, reuniones, feriados y fechas de entrega.
- Publicar comunicados con fecha, destinatario, adjuntos y vencimiento visible.
- Incorporar accesos verificados a plataformas educativas y canales oficiales de la institución.

## Prioridad media

- Crear una sección por especialidad con plan de estudios, talleres, proyectos y perfil del egresado.
- Incorporar un repositorio de formularios y documentos descargables con versiones y fechas vigentes.
- Agregar una cartelera de proyectos, olimpíadas, prácticas profesionalizantes y reconocimientos estudiantiles.
- Ofrecer suscripción a avisos por correo o WhatsApp institucional, siempre con consentimiento.
- Añadir buscador de comunicados y filtros por curso, turno y destinatario.
- Medir consultas frecuentes para mejorar los accesos y reducir trámites presenciales innecesarios.

## Profesionalización y seguridad

- Publicar una política de privacidad y no exponer datos personales, fotografías identificables ni información académica sin autorización.
- Utilizar cuentas institucionales, HTTPS y control de acceso para cualquier área privada.
- Mantener copias de seguridad del contenido y un procedimiento de recuperación.
- Validar licencias y autorizaciones de imágenes, videos y audios antes de publicar.
- Revisar accesibilidad: contraste, navegación por teclado, textos alternativos y subtítulos para contenido audiovisual.
- Establecer revisión trimestral de enlaces, fechas, autoridades y datos de contacto.

## Próxima decisión necesaria

Definir qué contenidos serán públicos y qué gestiones necesitarán acceso con cuenta institucional. Esa decisión determina si el siguiente paso es ampliar este sitio estático o construir un portal con autenticación y roles.

## Evaluación docente de la entrega 1.1.1

### Logros observados

- La propuesta tiene identidad visual consistente, navegación responsive, modo de alto contraste visual y una estructura clara para presentar la institución.
- El calendario interactivo, el menú accesible con Escape y el aviso de contenido de ejemplo muestran una buena intención de diseño y comunicación.
- La documentación de versiones y de despliegue permite que el trabajo continúe entre colaboradores.

### Aspectos a corregir antes de difundirla como sitio oficial

- Validar cada dato publicado con secretaría o equipo directivo. Un sitio institucional no debe exhibir teléfonos, correos, horarios ni fechas supuestos.
- Sustituir textos genéricos, imágenes con nombres informales y contenido histórico sin fuente visible por material institucional actualizado y autorizado.
- Retirar o acreditar recursos de terceros, incluido el contenido cargado desde Unsplash, Facebook y los archivos de audio. Las fotografías donde se reconozca a estudiantes requieren autorización de imagen.
- Reemplazar el formulario `mailto:` por un servicio institucional que no dependa del programa de correo de quien visita el sitio y que informe cómo se usarán los datos.
- Probar todos los flujos con teclado y lector de pantalla, además de teléfonos reales. Revisar especialmente menú, calendario, reproductor, mapa y formulario.

### Criterio de aprobación para publicación

La entrega puede subirse al repositorio como versión de trabajo `v1.1.1`. La publicación pública queda condicionada a una revisión editorial, de privacidad, licencias, accesibilidad y funcionamiento en producción. Debe haber un responsable institucional del contenido y una revisión periódica de fechas, enlaces y formularios.

## Evaluación docente de la entrega 1.2.0

### Logros observados

- La galería muestra una mejora real en la presentación del trabajo escolar: incorpora video, fotografías, avance automático, navegación con teclado, indicadores y mensajes de estado.
- El calendario permite seleccionar un día y relacionar la fecha con su detalle, en lugar de limitarse a una visualización estática.
- El equipo separó los recursos públicos dentro de `assets/` y agregó una configuración reproducible para el despliegue estático.

### Correcciones requeridas

- No difundir la galería hasta contar con autorización de imagen de estudiantes, familias y personal reconocible, y registrar quién la aprobó.
- Cambiar títulos genéricos de fotos y videos por descripciones verificadas: actividad, fecha, curso o taller, responsable y autorización. No incluir apellidos ni datos personales.
- Validar con Secretaría el calendario completo. Las fechas informativas deben indicar fuente oficial y fecha de actualización.
- Reemplazar el contador local de visitas por analítica institucional con política de privacidad, o retirarlo; actualmente no mide visitas reales al sitio.
- Sustituir los botones textuales de controles multimedia por iconos accesibles, manteniendo su etiqueta `aria-label` y su ayuda emergente.

### Próximo incremento: administración segura

El siguiente objetivo no es agregar un formulario de usuario y contraseña al sitio estático. Eso expondría credenciales o permitiría una protección aparente. Primero deben definir un portal separado con estas condiciones:

1. Inicio de sesión mediante cuentas institucionales o un proveedor de identidad confiable; nunca contraseñas guardadas en JavaScript, HTML o Git.
2. Roles mínimos: `administración` para gestionar usuarios y publicar; `editor` para preparar contenido; `revisor` para aprobar; `lector` para ver borradores.
3. Flujo editorial: borrador, revisión, aprobado, publicado y archivado; toda publicación debe conservar autor, fecha y responsable que aprobó.
4. Base de datos y almacenamiento privado para borradores y documentos; las credenciales deben vivir en variables de entorno del servidor.
5. Registro de auditoría, cierre de sesión, recuperación de cuenta y copias de seguridad probadas.

### Trabajo por equipos para avanzar

- **Contenido y comunicación:** inventariar cada texto, foto, video, audio y enlace; registrar fuente, autorización, responsable y vigencia en una planilla institucional.
- **Diseño y accesibilidad:** probar las tres páginas en móvil, teclado y lector de pantalla; corregir contraste, foco visible, alternativas de texto y subtítulos del video.
- **Datos y calendario:** contrastar eventos, feriados, mesas, reuniones y plazos con Secretaría; mantener una única fuente de datos revisada.
- **Desarrollo:** crear una rama por tarea, abrir Pull Request, adjuntar capturas y pruebas realizadas, y no fusionar sin revisión de otra persona.
- **Infraestructura:** vincular Netlify con el repositorio bajo una cuenta institucional, definir responsables de acceso y validar el despliegue en la URL de producción.

## Evaluación docente de la entrega 1.3.0

### Logros observados

- El equipo consolidó una identidad visual más propia: historia institucional, recursos gráficos locales, imágenes de la comunidad y una galería navegable.
- Se resolvieron problemas de navegación móvil, contraste en modo oscuro, jerarquía de botones y visualización de contenido en diferentes anchos.
- El calendario y el clima muestran información dinámica, mientras que los contenidos históricos se organizan en una secuencia clara y accesible.
- La prueba de maquetación no registró desbordamiento horizontal en 320, 375, 768, 1024 y 1440 px para Inicio, Galería, Calendario e Historia.

### Correcciones y criterios profesionales

- La calidad visual no reemplaza la validación institucional: cada fecha, enlace, teléfono, foto, video y audio debe tener fuente, vigencia, responsable y autorización registrados.
- No se debe usar el contador actual como métrica institucional: cuenta cargas en un mismo dispositivo, no visitas reales. Debe retirarse o reemplazarse por analítica institucional con información de privacidad.
- Las imágenes donde se reconoce a personal o estudiantes sólo pueden quedar publicadas con autorización correspondiente. La galería debe llevar descripciones verificadas de actividad, fecha y responsable.
- Antes de publicar como sitio oficial, probar con teclado, lector de pantalla y teléfonos reales; el control de calidad debe incluir enlaces externos, menú, calendario, clima, reproductor, formulario y contraste en ambos temas.

### Próxima clase: actividades obligatorias

1. **Equipo de contenidos:** crear una planilla de inventario para cada texto, imagen, video, audio y enlace con fuente, autorización, fecha, vigencia y responsable institucional.
2. **Equipo de accesibilidad:** realizar pruebas manuales con teclado y lector de pantalla; registrar al menos tres hallazgos o confirmar los flujos probados con capturas.
3. **Equipo de datos:** validar el calendario 2026 con Secretaría, agregar la fuente de cada fecha y definir quién actualiza las novedades.
4. **Equipo de desarrollo:** abrir una rama por mejora, realizar una Pull Request, adjuntar evidencia de la prueba responsive y solicitar revisión de otro integrante.
5. **Equipo de infraestructura:** registrar responsable institucional de GitHub y Netlify, comprobar el despliegue de producción y documentar cómo revertir una publicación.
