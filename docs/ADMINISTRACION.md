# Administración editorial

## Alcance de esta entrega

CMS por bloques para **Inicio, Historia, Galería, Calendario y las tres carreras**, conectado al mismo
Supabase que las cuentas de comunidad. No requiere un servidor Node en producción:
el backend es PostgreSQL + funciones transaccionales/PostgREST + Supabase Auth + Storage.
El servidor Node del repositorio sirve archivos **solo para desarrollo**.

El administrador puede:

- Editar títulos y descripción de cada página; textos, títulos, imágenes, descripciones
  alternativas y enlaces de las secciones originales.
- Cambiar las imágenes de portada, identidad, navegación, redes y pie por página.
- Agregar bloques de texto, texto con imagen, llamadas a la acción y grupos de hasta
  12 tarjetas; duplicar bloques nuevos y cambiar su estilo o distribución.
- Ordenar, ocultar y quitar secciones. Las originales conservan internamente los nodos
  necesarios para las interacciones, pero las secciones quitadas no son visibles.
- Actualizar la galería (fotos/videos), agenda (año, fecha, tipo, título, descripción,
  imagen destacada) y listas de audio.
- Subir medios, editar su nombre/descripción, copiar URL y archivarlos.
- Guardar borradores privados, revisar la vista previa adaptable y publicar por página.
- Consultar historial paginado y restaurar una versión como un nuevo borrador.
- Ir al portal de comunidad para aprobar solicitudes de alumnos/as y profesores/as.

No hay edición libre de HTML/CSS/JavaScript, ni generación de páginas nuevas, ni edición
de componentes técnicos de autenticación, clima automático o controles del reproductor.
Las plantillas originales mantienen su estructura interna y su diseño: para nuevas
composiciones se agregan bloques o se reemplaza una sección por bloques nuevos.
Los formularios de contacto y mapa mantienen su integración técnica original.
No se implementan campañas de correo, notas o gestión académica.

## Activación

### Estado del proyecto conectado

Las migraciones `202610060001_comunidad.sql`, `202610060002_editorial.sql`,
`202610060003_catalogo.sql` y `202610060004_carreras.sql` ya se aplicaron en el proyecto `dzkcpsfmubwwguixtruu`
desde el SQL Editor. La cuarta extiende las páginas permitidas e incorpora las tres
plantillas de carreras, conservando los manifiestos y datos anteriores.
Se verificaron las seis tablas con RLS, las siete plantillas
y el bucket público `institutional-media` con límite de 20 MB.
La API anónima permite consultar publicaciones y deniega perfiles y borradores.

**No reejecutar las migraciones en este proyecto.** La aplicación manual no registra
el historial de Supabase CLI: antes de usar `db push`, un operador debe reconciliar
ese historial con el esquema desplegado, sin volver a crear tablas ni políticas.

La primera cuenta administrativa ya está confirmada y habilitada; su titular confirmó
acceso al editor de las cuatro páginas. No se publicó contenido de prueba desde el CMS.
Las páginas conservan su contenido original hasta la primera publicación.
Quedan pendientes las pruebas reales de guardado, publicación y subida de medios.
Consultar [el estado de Auth y correo](COMUNIDAD.md#estado-del-proyecto-conectado).

### Procedimiento para un proyecto nuevo

1. Completar [la configuración de cuentas](COMUNIDAD.md).
2. Aplicar las migraciones, **una sola vez y en este orden**, en el SQL Editor privado:
   - `supabase/migrations/202610060001_comunidad.sql` si aún no se aplicó.
   - `supabase/migrations/202610060002_editorial.sql`.
   - `supabase/migrations/202610060003_catalogo.sql`.
   - `supabase/migrations/202610060004_carreras.sql`.
3. Estas migraciones suponen un proyecto donde no existen tablas CMS ni el bucket
   `institutional-media`. No ejecutar repetidamente la creación de tablas/políticas.
   Revisar políticas preexistentes de Storage: una política permisiva global no debe
   otorgar escritura sobre este bucket. Las políticas RLS se combinan mediante OR.
4. Configurar URL y clave **publishable/anon** en `assets/js/comunidad-config.js`.
   Nunca usar `service_role` ni una secret key en el navegador.
5. Acceder a `comunidad.html` con la cuenta habilitada como administrador/a y elegir
   **Administrar el sitio**, o abrir `admin.html` tras iniciar sesión.
6. Elegir una página. Inicialmente se muestra la plantilla original: no hay borrador
   en la base hasta guardar por primera vez. Guardar y publicar las páginas deseadas.
7. Confirmar que la URL pública muestra el contenido y que Storage entrega los medios.
   Hacer este control con una sesión anónima, no solo desde la vista previa.

Sin Supabase configurado, las páginas institucionales conservan su contenido local y sus
interacciones; el editor muestra una pantalla de activación y no habilita escrituras.
Si el backend configurado no responde o falta una migración, la página pública avisa
explícitamente y muestra la plantilla incluida. No simula una publicación exitosa.

## Modelo y API de backend

| Recurso | Acceso | Uso |
| --- | --- | --- |
| `cms_pages` | Lectura administrativa | Borrador actual y versión editorial |
| `cms_published` | Lectura pública | Instantánea publicada, sin datos del autor |
| `cms_revisions` | Lectura administrativa | Historial inmutable con autor, fecha y acción |
| `cms_templates` | Solo operadores privados | Tipos de campos y plantillas permitidos |
| `cms_media` | Administradores | Metadatos de archivos; archivo lógico |
| Storage `institutional-media` | Lectura pública; altas administrativas | Medios institucionales públicos |

Las escrituras editoriales no se hacen con `UPDATE` directo:

```js
await supabase.rpc('cms_save_draft', {
  page_slug: 'inicio', document: contenido, expected_version: versionActual
});
await supabase.rpc('cms_publish', {
  page_slug: 'inicio', expected_version: versionActual
});
await supabase.rpc('cms_restore', {
  page_slug: 'inicio', revision_id: idRevision, expected_version: versionActual
});
```

Las funciones devuelven un objeto JSON con `draft`, `version`, `updated_at` y `updated_by`.
La primera escritura usa versión esperada `0`; cada guardado, publicación o restauración
incrementa la versión. Todas las operaciones exigen rol administrador **desde la base**,
validan el documento y bloquean la fila durante la transacción.
Si otra sesión ya cambió la página, se rechaza con código `40001`: el editor conserva
los cambios locales, no fuerza la sobrescritura y pide recargar.
Guardar un borrador no modifica la publicación. Restaurar tampoco publica automáticamente.
El historial no permite edición/borrado por la API pública.

El servidor valida tamaño (1 MB por documento), tipos de campos, fuentes originales,
URLs permitidas, cantidades de bloques/módulos y fechas reales no duplicadas.
No acepta introducir un enlace ejecutable cambiando su tipo a texto.
El renderizado usa nodos DOM/texto plano y URLs validadas; no ejecuta HTML del editor.

## Medios y privacidad

- Formatos: JPG, PNG, WebP, GIF, MP4 y MP3. Máximo exacto: **20 MB** por archivo.
- SVG, HTML, PDF y documentos privados no están permitidos.
- Archivos con UUID y extensión controlada, sin sobrescritura ni borrado desde el panel.
  Así una versión histórica no pierde la imagen que utilizaba.
- Archivar oculta el medio de la biblioteca, **no elimina su URL ni las referencias**.
- La biblioteca carga 30 archivos por página; el historial carga 20 versiones por página.
- Elegir una imagen copia su descripción al campo. Cambiar luego el metadato del archivo
  no modifica automáticamente las descripciones ya insertadas.
- El archivo se sube primero a Storage y después se registra su metadato. Si el segundo
  paso falla, el editor ofrece **Reintentar registro** sin repetir la subida.
  Si se abandona esa pestaña, un operador debe revisar el objeto huérfano en Storage.
- Solo publicar imágenes, videos y audios autorizados para difusión. El bucket es público:
  no es un almacén de datos privados de estudiantes.

La eliminación física de medios y la política de conservación de historial quedan a cargo
de operadores privados. Antes de eliminar un objeto, revisar borradores, publicaciones y
**todas** sus versiones. No borrar objetos referenciados.
Configurar backups/retención del proyecto institucional antes de producción. No se ofrece
una garantía de backup independiente del plan de Supabase contratado.

## Catálogo y cambios de código

### Páginas de carreras

`informatica.html`, `madera.html` y `obras.html` tienen enfoque, objetivos, referencia
documental, materias de 4.º a 7.º con horas reloj anuales, galería independiente y
secciones reservadas para horarios y equipo docente. El selector del administrador
permite editar cada carrera, incluidos sus textos y tablas, imágenes, videos y audios.
No es una aplicación de gestión de horarios o asignaciones docentes.

La información inicial se sintetizó a partir de los documentos aportados:

- Informática: `IF-2018-31698000-GDEBA-DETECDGCYE`, tabla en página 9.
- Madera y Mueble: Resolución DGCyE 2254/15, tabla en página 7 del PDF escaneado.
- Maestro Mayor de Obras: `IF-2018-31695509-GDEBA-DETECDGCYE`, tabla en página 8.

No se utilizó el diseño modular de adultos de 2025 para secundaria. Los PDF completos
no se copian al repositorio ni se publican. Los nombres y horas de materias son datos
del diseño aportado; confirmar vigencia y aplicación institucional antes de la difusión.
Informática y Obras conservan fotos y video institucionales de referencia. Madera
incluye cinco fotos propias del taller, autorizadas para esta entrega el 2026-10-13.
`assets/cms/madera-galeria.json` contiene sus rutas y descripciones; el catálogo inicial
las usa sin cambiar el manifiesto de campos ni reejecutar migraciones.
`node tools/madera-galeria.mjs` actualiza solo esa galería inicial, no datos remotos.
Si ya existe una publicación de Madera en Supabase, prevalece sobre el catálogo:
editar y publicar la galería desde el administrador; no sobrescribir borradores con SQL.
Conservar fechas, responsables y permisos detallados en un registro privado institucional.

`tools/carreras-datos.mjs` conserva la estructura factual y las referencias para la
generación inicial. `tools/carreras-scaffold.mjs` genera las nuevas páginas reutilizando
cabecera, galería, clima, reproductor y redes; no ejecutarlo sobre plantillas desplegadas
sin planificar compatibilidad. Para esta incorporación se usó
`node tools/cms-catalog.mjs --carreras`: conserva las cuatro entradas originales
del catálogo y genera únicamente la migración incremental de carreras.
Ahora que esa migración está aplicada, cualquier cambio estructural debe ir en otra
migración, no regenerar y reejecutar la cuarta.

`assets/js/sitio-compartido.mjs` enlaza las carreras y completa los servicios ausentes
en las diez páginas, después del renderizado CMS. Así no cambia las posiciones de los
campos de las cuatro plantillas ya desplegadas. El contador sigue siendo local por
dispositivo, no una estadística global. El reproductor no inicia música automáticamente.

`assets/cms/catalogo.json` contiene valores iniciales y referencias de campos en el HTML.
Se genera desde las cuatro páginas y los módulos estáticos, no desde datos de usuarios:

```sh
npm ci
npm run cms:catalog
npm test
```

Regenerarlo cuando se cambie manualmente la estructura HTML. El comando también genera
el manifiesto SQL de tipos de campos. En un proyecto **ya desplegado**, aplicar el nuevo
manifiesto mediante una **nueva migración**; no reescribir una migración ya aplicada.
Cambiar posiciones estructurales puede cambiar IDs de campos: planificar una migración
de borradores/publicaciones antes de desplegar una plantilla incompatible. No regenerar
indiscriminadamente un catálogo publicado.
Los ajustes de código del CMS no requieren regenerar contenido si no cambia el HTML base.

## Verificación

`npm test` cubre contratos de contenido, límites de archivo, migraciones PostgreSQL,
RLS, versiones concurrentes, separación borrador/publicación, restauración y permisos
de Storage. PostgreSQL embebido reproduce el esquema Auth/Storage mínimo para estos tests;
el servicio HTTP de Storage, SMTP y Auth se verifican aparte en el proyecto real.

Checklist institucional:

1. Una cuenta común y una sesión anónima no abren el editor ni consultan borradores/historial.
2. Guardar texto/imágenes no cambia la web pública hasta publicar.
3. Dos administradores con la misma versión producen un conflicto, sin pérdida de cambios.
4. Restaurar recupera bloques y archivos; la publicación se mantiene hasta confirmar.
5. Verificar las siete páginas editoriales en claro/oscuro, móvil, teclado y escritorio.
6. Subir un archivo permitido y probar uno de más de 20 MB y un formato no admitido.
7. Verificar fotos/videos, agenda por año y audios tanto en vista previa como públicamente.
8. Revisar permisos de difusión, contacto, datos institucionales y copias de seguridad.

`tests/fixtures/cms-sdk.mjs` es un doble de prueba usado por el navegador para comprobar
el editor sin credenciales. **No se importa ni se usa en producción** y no concede permisos
en Supabase. No sustituye la prueba con un proyecto real.
