# Versión 1.2.0

**Fecha:** 2026-09-24
**Etiqueta Git:** `v1.2.0`
**Estado:** versión de trabajo publicada en el repositorio; requiere aprobación institucional antes de difundirse a la comunidad.

## Entrega incorporada

- Se agregó una galería institucional multimedia con fotos, video, controles, indicadores y navegación por teclado.
- Se mejoró el calendario 2026 con selección de fecha, detalle del evento elegido y actualización de fechas nacionales.
- Se agregó `netlify.toml` para un despliegue estático reproducible desde la raíz del proyecto.
- Se configuró Git para reconocer los finales de línea CRLF del proyecto sin reportarlos como espacios finales.

## Devolución docente

La implementación tiene buenas decisiones de interacción y una estructura clara para crecer. Sin embargo, una galería escolar y un calendario público requieren un proceso editorial: fuentes verificables, autorizaciones de imagen, responsables de actualización y una revisión previa a cada publicación.

## Condiciones para Netlify

1. Conectar el repositorio a un sitio de Netlify administrado por la institución.
2. Usar `main` como rama de producción y conservar los despliegues de ramas como vistas previas.
3. Abrir la URL de producción y comprobar las páginas Inicio, Calendario y Galería en móvil y escritorio.
4. Registrar la URL y los responsables de la cuenta en la documentación interna, sin publicar claves ni datos de acceso.

## Siguiente incremento

Definir un portal de administración separado del sitio público. Debe usar autenticación institucional, roles, flujo de revisión y una base de datos protegida. No se debe implementar un login sólo en HTML o JavaScript del navegador.
