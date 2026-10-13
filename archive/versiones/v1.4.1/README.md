# Versión 1.4.1 · Corrección de publicación

**Fecha:** 2026-10-13

**Etiqueta:** `v1.4.1`

Continúa la [entrega estudiantil y revisión docente 1.4.0](../v1.4.0/README.md).

Durante la comprobación pública, Netlify reescribió enlaces a rutas sin extensión.
El CMS identifica páginas por archivos HTML y sus plantillas deben conservar los
campos verificados. Se desactiva el posprocesado desde `netlify.toml` y la opción
Pretty URLs heredada en el sitio Netlify, seguido de una reconstrucción de `main`,
sin modificar publicaciones ni datos de Supabase.

La verificación del deploy incluye coincidencia de HTML con el paquete local
excluyendo el comentario y el script HUD añadidos por Netlify, coincidencia exacta
de catálogo e imágenes, carga de las cinco imágenes, navegación entre páginas y
exclusión de SQL, pruebas y documentos fuente. Se mantienen las tareas y límites
de la revisión docente.
