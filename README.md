# EEST N°3 Fragata Moyano

Sitio institucional de muestra para la Escuela de Educación Secundaria Técnica N°3 "Fragata Moyano", San Fernando.

## Ejecutar el proyecto

El sitio usa archivos estáticos y módulos JavaScript:
para todas las páginas, ejecutar `npm run dev` y visitar
`http://localhost:4173`. El servidor local usa únicamente Node 22 o superior; no requiere instalar dependencias.

Para publicar: `npm ci`, `npm test` y `npm run build`. El paquete `dist/` contiene
solo las páginas y recursos públicos. Netlify ejecuta pruebas y genera ese paquete
automáticamente desde `main`; no publicar la raíz del repositorio.

## Estructura

- `index.html`: estructura y contenido del sitio.
- `assets/css/estilo.css`: estilos responsive y animaciones.
- `assets/js/script.js`: interacciones, navegación, selector de tema y reproductor.
- `assets/images/`: imágenes e identidad visual del sitio.
- `assets/audio/`: recursos de audio del reproductor.
- `comunidad.html`: registro, login, recuperación y preferencias de la comunidad.
- `privacidad.html`: información sobre el tratamiento de datos de las cuentas.
- `supabase/migrations/`: esquema de perfiles y permisos para Supabase.
- `docs/COMUNIDAD.md`: activación del portal, administración y pruebas.
- `admin.html`: administrador editorial por bloques, biblioteca, borradores e historial.
- `informatica.html`, `madera.html`, `obras.html`: páginas independientes de las carreras.
- `assets/cms/catalogo.json`: catálogo de contenido inicial y referencias de campos.
- `docs/ADMINISTRACION.md`: backend editorial, activación y flujo de publicación.
- `archive/versiones/`: historial documentado de las versiones publicadas.
- `docs/MEJORAS.md`: hoja de ruta para organizar y profesionalizar el sitio institucional.
- `docs/DESPLIEGUE_COLABORADORES.md`: pasos para que los colaboradores publiquen el sitio en Vercel o Netlify.

## Entrega actual

La versión `v1.4.1` consolida la entrega `v1.4.0` del trabajo estudiantil de comunidad, autenticación,
administración editorial y las tres carreras, además de las cinco nuevas fotografías
del taller de Madera y Mueble. La revisión docente, las verificaciones y las tareas
de la próxima entrega se documentan en
[la entrega 1.4.0](archive/versiones/v1.4.0/README.md) y [la hoja de ruta](docs/MEJORAS.md).
El [ajuste 1.4.1](archive/versiones/v1.4.1/README.md) conserva las rutas HTML en Netlify.

Sitio de trabajo: **https://eest3sf.netlify.app**.
La publicación técnica no reemplaza la validación institucional de contenidos y datos.

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

No se deben versionar contraseñas, claves secretas ni datos personales de estudiantes.
La URL y la clave publishable de Supabase son configuración pública, protegida por RLS.

## Cuentas y comunidad

El portal permite solicitar perfiles de alumno/a y profesor/a, o sumarse como comunidad.
Los permisos institucionales requieren aprobación; administración se asigna privadamente.
El proyecto Supabase real ya está conectado, con migraciones aplicadas, confirmación
de correo y URLs de retorno para `http://localhost:4173`.
La primera cuenta administrativa está habilitada y su acceso fue confirmado.
Las URLs HTTPS de retorno de Netlify están configuradas y se conservaron las locales.
Falta SMTP propio;
el correo predeterminado no permite abrir el registro a cualquier destinatario.
Consultar [el estado y la guía de cuentas](docs/COMUNIDAD.md).
Esta entrega guarda preferencias para futuras notificaciones; todavía no las envía.

Para pruebas automatizadas: `npm ci` y `npm test`. Las dependencias son solo de desarrollo.

## Administrar el contenido

Las cuentas administrativas pueden editar las siete páginas institucionales desde
`admin.html`. Incluye secciones por bloques, textos, imágenes, enlaces, galería, agenda,
audios, biblioteca de archivos, vista previa, borradores y publicación con historial.
El backend real es Supabase (PostgreSQL, Auth, PostgREST y Storage), no el servidor local.
Las cuatro migraciones ya están aplicadas en el proyecto conectado; no reejecutarlas.
Consultar [la guía editorial](docs/ADMINISTRACION.md) antes de operar o usar Supabase CLI.
Sin configuración no se habilitan escrituras ni se simulan publicaciones.

## Carreras técnicas

Cada especialidad cuenta con una página conectada al inicio, galería, calendario y comunidad:

- [Informática Personal y Profesional](informatica.html).
- [Industrialización de la Madera y el Mueble](madera.html).
- [Maestro Mayor de Obras](obras.html).

Incluyen síntesis del enfoque y objetivos, referencias a los diseños aportados, materias
de 4.º a 7.º con horas reloj anuales y galería editable por carrera. Horarios y profesores/as
quedan preparados para incorporar información institucional validada.
Los servicios de clima/fecha, música, redes y visitas locales están disponibles en todas
las páginas. Las visitas no representan un contador global de personas.

hecho por estudiantes de 7° tecipp.
