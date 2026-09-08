# Despliegue para colaboradores

Esta guía permite publicar el sitio de la EEST N°3 desde una cuenta personal de Vercel o Netlify. El proyecto es estático: no necesita instalar dependencias ni ejecutar una compilación.

## Antes de comenzar

1. Iniciar sesión en GitHub con la cuenta que recibió acceso al repositorio.
2. Abrir `https://github.com/Fabianel10/eest3-fragata-moyano`.
3. Confirmar que el repositorio se visualiza y que se puede crear una rama o subir un cambio.
4. Si GitHub muestra una invitación pendiente, aceptarla antes de continuar. Actualmente esta acción corresponde a `kkanek99-glitch`.

## Opción recomendada: publicar en Vercel

1. Crear una cuenta o iniciar sesión en `https://vercel.com` usando **Continue with GitHub**.
2. Autorizar a Vercel para acceder a GitHub cuando lo solicite.
3. En el panel de Vercel, seleccionar **Add New...** y luego **Project**.
4. Buscar y elegir el repositorio `Fabianel10/eest3-fragata-moyano`.
5. En la configuración del proyecto, usar estos valores:

   | Campo            | Valor       |
   | ---------------- | ----------- |
   | Framework Preset | Other       |
   | Build Command    | Dejar vacío |
   | Output Directory | `.`         |
   | Install Command  | Dejar vacío |

6. Seleccionar **Deploy**.
7. Esperar a que Vercel finalice la publicación y abrir la URL entregada para comprobar el sitio.
8. Guardar la URL en los canales internos de la escuela y comunicarla al equipo.

## Alternativa: publicar en Netlify

1. Crear una cuenta o iniciar sesión en `https://app.netlify.com` usando GitHub.
2. Seleccionar **Add new site** y luego **Import an existing project**.
3. Elegir **Deploy with GitHub** y autorizar el acceso solicitado.
4. Seleccionar el repositorio `Fabianel10/eest3-fragata-moyano`.
5. En la configuración de despliegue, usar estos valores:

   | Campo             | Valor       |
   | ----------------- | ----------- |
   | Base directory    | Dejar vacío |
   | Build command     | Dejar vacío |
   | Publish directory | `.`         |

6. Seleccionar **Deploy site**.
7. Cuando termine, abrir la dirección asignada por Netlify y comprobar el sitio.

## Actualizar el sitio publicado

1. Crear una rama desde el repositorio antes de modificar archivos.
2. Realizar los cambios y comprobar `index.html` localmente.
3. Subir la rama a GitHub y crear un Pull Request para revisión.
4. Después de aprobar y fusionar los cambios en `main`, Vercel o Netlify publicarán automáticamente la nueva versión.
5. Verificar la URL de producción y comunicar cualquier cambio relevante a la comunidad.

## Recomendaciones de trabajo

- No publicar datos personales de estudiantes, docentes o familias.
- Confirmar los datos institucionales antes de reemplazar el contenido de ejemplo.
- No compartir contraseñas ni tokens en el repositorio, capturas o chats.
- Antes de una publicación oficial, usar un dominio institucional y definir quién administrará la cuenta de despliegue.
