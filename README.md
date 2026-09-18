# EEST N°3 Fragata Moyano

Sitio institucional de muestra para la Escuela de Educación Secundaria Técnica N°3 "Fragata Moyano", San Fernando.

## Ejecutar el proyecto

Abrir `index.html` en un navegador. El sitio es estático y no requiere instalar dependencias.

## Estructura

- `index.html`: estructura y contenido del sitio.
- `assets/css/estilo.css`: estilos responsive y animaciones.
- `assets/js/script.js`: interacciones, navegación, selector de tema y reproductor.
- `assets/images/`: imágenes e identidad visual del sitio.
- `assets/audio/`: recursos de audio del reproductor.
- `archive/versiones/`: historial documentado de las versiones publicadas.
- `docs/MEJORAS.md`: hoja de ruta para organizar y profesionalizar el sitio institucional.
- `docs/DESPLIEGUE_COLABORADORES.md`: pasos para que los colaboradores publiquen el sitio en Vercel o Netlify.

## Entrega actual

La versión `v1.1.1` corrige una referencia de audio inexistente y evita incorporar al repositorio
materiales de trabajo que no forman parte del sitio. La evaluación docente, los criterios de
publicación y los próximos pasos se documentan en `archive/versiones/v1.1.1/README.md` y
`docs/MEJORAS.md`.

## Versionado

Cada entrega publicada debe tener una etiqueta Git y una carpeta dentro de `archive/versiones/`.

1. Crear una rama para el cambio: `git switch -c tipo/descripcion-corta`.
2. Realizar y probar el cambio.
3. Actualizar `CHANGELOG.md` y crear `archive/versiones/vX.Y.Z/README.md`.
4. Crear un commit descriptivo.
5. Fusionar el cambio y crear una etiqueta: `git tag -a vX.Y.Z -m "Versión X.Y.Z"`.
6. Publicar commits y etiquetas: `git push origin main --follow-tags`.

Se utiliza versionado semántico:

- `v1.0.0`: primera entrega o cambio mayor.
- `v1.1.0`: nueva sección o función compatible.
- `v1.0.1`: corrección pequeña.

No se deben versionar contraseñas, claves ni datos personales de estudiantes.

hecho por estudiantes de 7° tecipp.
