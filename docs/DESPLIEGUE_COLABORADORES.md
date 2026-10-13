# Despliegue para colaboradores

Esta guía permite publicar el sitio de la EEST N°3. El frontend es estático y el backend
de cuentas y contenidos es Supabase. Se generan solo los archivos públicos en `dist/`.

## Sitio de trabajo vinculado

- URL: https://eest3sf.netlify.app
- Netlify: sitio `eest3sf`, conectado a `Fabianel10/eest3-fragata-moyano`, rama `main`.
- Node: 22. Instalación: `npm ci`. Verificación: `npm test`. Empaquetado: `npm run build`.
- `netlify.toml` ejecuta `npm test && npm run build` y publica `dist`.
- GitHub Actions comprueba las pruebas y el paquete en pushes a `main` y Pull Requests.
- No publicar `.`, porque contiene pruebas, SQL, documentos fuente y dependencias.
- Las claves publishable son públicas; nunca agregar secret keys ni credenciales de despliegue.

## Antes de comenzar

1. Iniciar sesión en GitHub con la cuenta que recibió acceso al repositorio.
2. Abrir `https://github.com/Fabianel10/eest3-fragata-moyano`.
3. Confirmar que el repositorio se visualiza y que se puede crear una rama o subir un cambio.
4. Si GitHub muestra una invitación pendiente, aceptarla antes de continuar. Actualmente esta acción corresponde a `kkanek99-glitch`.

## Alternativa: publicar en Vercel

1. Crear una cuenta o iniciar sesión en `https://vercel.com` usando **Continue with GitHub**.
2. Autorizar a Vercel para acceder a GitHub cuando lo solicite.
3. En el panel de Vercel, seleccionar **Add New...** y luego **Project**.
4. Buscar y elegir el repositorio `Fabianel10/eest3-fragata-moyano`.
5. En la configuración del proyecto, usar estos valores:

   | Campo            | Valor       |
   | ---------------- | ----------- |
   | Framework Preset | Other       |
   | Build Command    | `npm test && npm run build` |
   | Output Directory | `dist`                     |
   | Install Command  | `npm ci`                   |

6. Seleccionar **Deploy**.
7. Esperar a que Vercel finalice la publicación y abrir la URL entregada para comprobar el sitio.
8. Guardar la URL en los canales internos de la escuela y comunicarla al equipo.

## Opción utilizada: publicar en Netlify

1. Crear una cuenta o iniciar sesión en `https://app.netlify.com` usando GitHub.
2. Seleccionar **Add new site** y luego **Import an existing project**.
3. Elegir **Deploy with GitHub** y autorizar el acceso solicitado.
4. Seleccionar el repositorio `Fabianel10/eest3-fragata-moyano`.
5. En la configuración de despliegue, usar estos valores:

   | Campo             | Valor       |
   | ----------------- | ----------- |
   | Base directory    | Dejar vacío |
   | Build command     | `npm test && npm run build` |
   | Publish directory | `dist`                     |

6. Seleccionar **Deploy site**.
7. Cuando termine, abrir la dirección asignada por Netlify y comprobar el sitio.

## Actualizar el sitio publicado

1. Crear una rama desde el repositorio antes de modificar archivos.
2. Realizar los cambios y comprobar `index.html` localmente.
3. Subir la rama a GitHub y crear un Pull Request para revisión.
4. Después de aprobar y fusionar los cambios en `main`, Vercel o Netlify publicarán automáticamente la nueva versión.
5. Verificar la URL de producción y comunicar cualquier cambio relevante a la comunidad.

La versión publicada debe corresponder al SHA subido a GitHub. Comprobar estado
`ready` del despliegue y abrir las nuevas páginas y fotos. Si se necesita publicar
manualmente, usar `netlify deploy --prod --dir=dist` desde el sitio vinculado,
después de verificar pruebas y build; nunca pasar `--dir=.`.

### Auth de producción y límites

Configurar en Supabase Site URL `https://eest3sf.netlify.app` y Redirect URLs exactas
`https://eest3sf.netlify.app/comunidad.html` y
`https://eest3sf.netlify.app/comunidad.html?recuperacion=1`.
Conservar los retornos de localhost para desarrollo. Un deploy preview no queda
autorizado automáticamente para enlaces de confirmación: no usar comodines globales.
Configurar SMTP institucional antes de abrir el registro a cualquier destinatario.
Las cuatro migraciones del proyecto real ya se aplicaron; no reejecutarlas al desplegar.

### Reversión

Desde el panel del sitio en Netlify se puede volver a publicar un deploy anterior
verificado. Para revertir código en Git, crear un commit de reversión y revisarlo;
no reescribir la historia compartida. El contenido CMS vive en Supabase: volver a
un deploy no revierte publicaciones ni migraciones. Usar el historial editorial
para restaurar un borrador y publicarlo expresamente.

## Recomendaciones de trabajo

- No publicar datos personales de estudiantes, docentes o familias.
- Confirmar los datos institucionales antes de reemplazar el contenido de ejemplo.
- No compartir contraseñas ni tokens en el repositorio, capturas o chats.
- Antes de una publicación oficial, usar un dominio institucional y definir quién administrará la cuenta de despliegue.
