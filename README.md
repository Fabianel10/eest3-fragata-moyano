# EEST N°3 Fragata Moyano

Sitio institucional de muestra para la Escuela de Educación Secundaria Técnica N°3 "Fragata Moyano", San Fernando.

## Ejecutar el proyecto

Abrir `index.html` en un navegador. El sitio es estático y no requiere instalar dependencias.

## Estructura

- `index.html`: estructura y contenido del sitio.
- `estilo.css`: estilos responsive y animaciones.
- `script.js`: interacciones, navegación y reproductor.
- `img/`: imágenes del sitio.
- `Sounds/`: recursos de audio.
- `versiones/`: historial documentado de versiones publicadas.

## Versionado

Cada entrega publicada debe tener una etiqueta Git y una carpeta dentro de `versiones/`.

1. Crear una rama para el cambio: `git switch -c tipo/descripcion-corta`.
2. Realizar y probar el cambio.
3. Actualizar `CHANGELOG.md` y crear `versiones/vX.Y.Z/README.md`.
4. Crear un commit descriptivo.
5. Fusionar el cambio y crear una etiqueta: `git tag -a vX.Y.Z -m "Versión X.Y.Z"`.
6. Publicar commits y etiquetas: `git push origin main --follow-tags`.

Se utiliza versionado semántico:

- `v1.0.0`: primera entrega o cambio mayor.
- `v1.1.0`: nueva sección o función compatible.
- `v1.0.1`: corrección pequeña.

No se deben versionar contraseñas, claves ni datos personales de estudiantes.
