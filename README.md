# EEST N.º 3 «Fragata Moyano»

**Portal educativo e institucional · San Fernando, Buenos Aires**

[![Verificación](https://github.com/Fabianel10/eest3-fragata-moyano/actions/workflows/verificar.yml/badge.svg)](https://github.com/Fabianel10/eest3-fragata-moyano/actions)

[Visitar el sitio](https://eest3sf.netlify.app) ·
[Documentación](docs/README.md) ·
[Entrega v1.8.0](archive/versiones/v1.8.0/README.md) ·
[Historial](CHANGELOG.md)

Proyecto desarrollado por estudiantes, con revisión técnica y seguimiento docente.
Integra información de las especialidades, servicios para la comunidad y herramientas
de gestión. La publicación técnica no reemplaza la validación institucional de
contenidos, licencias, autorizaciones de imagen y tratamiento de datos.

## Funcionalidades

| Área | Capacidades |
| --- | --- |
| Institución y carreras | Inicio, historia, galerías y páginas de Informática, Madera y Mueble y Maestro Mayor de Obras; diseños curriculares y materias de 4.º a 7.º |
| Comunidad | Registro, confirmación de correo, login, recuperación y solicitud de perfil; aprobación institucional de permisos |
| Administración editorial | Edición de siete páginas por bloques, imágenes, medios, borradores, publicación, historial y respaldos JSON |
| Gestión | Consultas privadas, responsables, notas, auditoría, control de concurrencia y eliminación |
| Recursos públicos | Comunicados, documentos PDF, proyectos y horarios con filtros, programación y vencimiento |
| Calendario | Selector multianual y exportación iCalendar de las fechas cargadas |
| Notificaciones | Avisos internos por intereses, preferencias, lecturas privadas y sincronización de publicaciones |
| Skynet | Personaje PNG transparente, conversación guiada, nombre opcional, contexto de carrera, búsqueda de publicaciones e historial privado con consentimiento |
| Servicios compartidos | Tema claro/oscuro, clima, fecha, música activada por la persona usuaria y redes |

### Skynet: alcance y privacidad

Skynet **no es IA generativa ni atención humana**. Responde temas institucionales,
reconoce saludos y preguntas de seguimiento y consulta títulos publicados y vigentes.
Ejemplos: `hola`, `Informática`, `¿y sus horarios?`, `buscar taller`.
No confirma vacantes, no realiza trámites ni solicita contraseñas.

- Sin cuenta o sin consentimiento: conversación temporal en la página.
- Con autorización: historial privado por cuenta en Supabase, hasta 100 turnos
  y ventana de 90 días. Permite recuperar, descargar y eliminar la conversación.
- Nombre de pila o apodo opcional: se recuerda en la cuenta solo al autorizarlo;
  tiene un control independiente para olvidarlo.
- Las respuestas antiguas se identifican como históricas; deben verificarse sus fuentes.
- No se envían consultas a proveedores de modelos de IA.

Consultar [la guía completa de Skynet](docs/SKYNET.md) y la
[política visible de privacidad](https://eest3sf.netlify.app/privacidad.html).

## Desarrollo local

Requisito: **Node.js 22 o superior**, con npm.

```sh
git clone https://github.com/Fabianel10/eest3-fragata-moyano.git
cd eest3-fragata-moyano
npm run dev
```

Abrir `http://localhost:4173`. El servidor estático no necesita dependencias;
para ejecutar las pruebas:

```sh
npm ci
npm test
npm run build
```

| Comando | Resultado |
| --- | --- |
| `npm run dev` | Servidor de desarrollo estático en el puerto 4173 |
| `npm test` | Pruebas Node, contratos HTML y PostgreSQL embebido mediante PGlite |
| `npm run build` | Paquete público aislado en `dist/` |
| `npm run cms:catalog` | Regenera catálogo y manifiestos; requiere revisión de compatibilidad antes de usarlo |

**Atención:** el frontend local utiliza el Supabase configurado; no es una base de
prueba aislada. No modificar contenidos reales durante desarrollo. El contacto está
deshabilitado en localhost y vistas previas; requiere Netlify Functions en producción.
No abrir los módulos con `file://`.

## Arquitectura y organización

```text
*.html                    Páginas públicas y herramientas privadas
assets/
  cms/                    Catálogo editorial y datos iniciales
  css/                    Estilos generales y de módulos
  js/                     Módulos ES y lógica de interfaz
  images/                 Identidad, galerías y personaje Skynet
  audio/                  Recursos del reproductor
netlify/functions/        Endpoint privado de contacto
supabase/migrations/      Evolución incremental del esquema, RPC y RLS
tests/                    Pruebas automatizadas
tools/                    Servidor local, build y herramientas de contenido
docs/                     Guías vigentes de uso, operación y contribución
archive/versiones/        Evidencias y corrección docente por entrega
.github/workflows/        Verificación de CI
```

El navegador sirve HTML/CSS/JavaScript sin framework de frontend. Supabase aporta
Auth, PostgreSQL, PostgREST y Storage; Netlify aloja el sitio y ejecuta la función de
contacto. GitHub Actions verifica las pruebas y el build; Netlify publica desde `main`.
El contador de visitas es **local al dispositivo**, no una métrica global.

## Acceso, datos y operación

- La selección de alumno/a o profesor/a no otorga permisos automáticamente.
  Administración se asigna por un operador autorizado, nunca por autorregistro.
- Las consultas de contacto se guardan en Supabase, no en dos destinos a la vez.
  Las consultas históricas de Netlify Forms permanecen en su bandeja anterior.
- El consentimiento de correo es independiente de los avisos internos y del historial
  de Skynet. **No se envían campañas ni push** en esta versión.
- Los PDF autorizados son públicos por URL, incluso si su artículo es borrador o
  deja de mostrarse. No subir legajos, firmas, DNI ni documentación sensible.
- Las claves publishable son públicas por diseño. Nunca publicar `service_role`,
  claves SMTP, tokens de despliegue o datos personales.
- Las migraciones aplicadas manualmente no deben reejecutarse. Antes de `db push`,
  reconciliar el historial CLI con el esquema real.

La recuperación de correo con Brevo fue comprobada en una entrega anterior.
La confirmación de un registro nuevo autorizado y el cambio final de contraseña
siguen siendo recorridos de validación separados: ver [Comunidad](docs/COMUNIDAD.md).

## Documentación por responsabilidad

| Necesidad | Documento |
| --- | --- |
| Índice y estado de la entrega | [Documentación](docs/README.md) |
| Cuentas y permisos | [Comunidad](docs/COMUNIDAD.md) |
| Editar y publicar; gestionar consultas | [Administración](docs/ADMINISTRACION.md) |
| Usar, mantener y probar el asistente | [Skynet](docs/SKYNET.md) |
| Configurar entornos, migrar y desplegar | [Despliegue](docs/DESPLIEGUE_COLABORADORES.md) |
| Colaborar y presentar evidencias | [Contribución](CONTRIBUTING.md) |
| Próximas mejoras y criterios docentes | [Hoja de ruta](docs/MEJORAS.md) |
| Consultar entregas anteriores | [Versiones](archive/versiones/README.md) |

## Calidad y publicación

Antes de publicar: pruebas aprobadas, build correcto, verificación móvil y por teclado,
permisos reales y contenido autorizado. La evidencia distingue pruebas simuladas,
transaccionales y recorridos de producción; no confundir un HTTP exitoso con
persistencia confirmada.

Solo `dist/` se publica como archivos estáticos. Las funciones se empaquetan aparte
desde `netlify/functions/`. No publicar la raíz del repositorio.
Cada entrega incluye commit, etiqueta semántica, release y
[evaluación docente](archive/versiones/).

## Autoría y recursos

La autoría corresponde a estudiantes y docentes que participan en el proyecto,
conservada en la historia Git. La identidad visual, fotografías y materiales de
terceros requieren las autorizaciones y licencias correspondientes; estar en un
repositorio público no concede por sí solo una licencia de reutilización.
No se incluyen datos personales de estudiantes como ejemplos.
