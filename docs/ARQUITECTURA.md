# Arquitectura y organización del proyecto

Este documento fija la frontera entre **frontend**, **backend** y **operación**. El
sitio es estático: no hay un servidor Node propio en producción. Netlify sirve
archivos y ejecuta una función; Supabase aporta autenticación, PostgreSQL, PostgREST
y Storage.

## Mapa de capas

```text
┌──────────────────────────── FRONTEND (navegador) ────────────────────────────┐
│ *.html                     Páginas públicas y paneles privados              │
│ assets/css/                Estilos generales y por módulo                    │
│ assets/js/                 Módulos ES de interfaz, CMS, comunidad y Skynet   │
│ assets/cms/                Catálogo editorial y datos iniciales              │
│ assets/images/ audio/      Recursos publicados                               │
│ public/                    robots.txt, sitemap.xml y 404.html                │
└───────────────────────────────────┬──────────────────────────────────────────┘
                                    │ HTTPS / JSON / PostgREST
┌───────────────────────────────────▼──────────────────────────────────────────┐
│ BACKEND (Netlify Functions + Supabase)                                       │
│ netlify/functions/contacto.mjs   Validación, origen, tamaño, honeypot y HMAC │
│ netlify/functions/…              Cola de correo y bajas                     │
│ netlify/lib/                     Adaptadores Brevo/Resend y procesamiento    │
│ supabase/migrations/             Esquema, RPC, RLS, Storage y auditoría      │
│ Supabase Auth                    Registro, login, recuperación y sesión      │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Responsabilidades por carpeta

| Ruta | Capa | Responsabilidad | Se publica |
| --- | --- | --- | --- |
| `*.html` | Frontend | Páginas y paneles. Se mantienen en la raíz por compatibilidad con Netlify y con los selectores del CMS. | Sí, copiadas a `dist/` |
| `assets/js/` | Frontend | Módulos de interfaz. No contienen claves secretas. | Sí |
| `assets/css/` | Frontend | Presentación, temas y responsive. | Sí |
| `assets/cms/` | Frontend / datos iniciales | Plantillas y catálogo que usa el editor. | Sí |
| `assets/images/`, `assets/audio/` | Frontend | Recursos con autorización y licencia. | Solo los necesarios |
| `public/` | Frontend estático | Archivos que deben quedar en la raíz del sitio (`robots.txt`, `sitemap.xml`, `404.html`). | Sí |
| `netlify/functions/` | Backend | Endpoints serverless. Usan variables de entorno. | Empaquetado aparte por Netlify |
| `supabase/migrations/` | Backend / base de datos | Evolución incremental del esquema, RPC y RLS. | No |
| `tests/` | Calidad | Contratos de HTML, lógica, PostgreSQL embebido (PGlite) y build. | No |
| `tools/` | Operación | Servidor local, build, generación de catálogo y utilidades. | No |
| `docs/` | Documentación | Guías vigentes de uso y operación. | No |
| `archive/versiones/` | Evidencia | Entregas históricas y evaluación docente. | No |

## Flujos principales

### Contenido editorial

1. `admin.html` autentica con Supabase y valida rol `editor`, `revisor` o `administrador`.
2. Un editor guarda el borrador; lo envía a revisión con una nota.
3. Un revisor aprueba o rechaza. Solo administración publica una versión aprobada.
4. `cms_revisions` registra autor, rol, acción, fecha y nota; `cms_published` guarda
   quién aprobó y quién publicó.
5. `cms-publico.mjs` intenta leer `cms_published`; si falla, usa el catálogo local.

### Búsqueda global

1. `buscador.html` consulta la vista pública `search_index` con la clave publishable.
2. La vista combina contenido curado, publicaciones vigentes y eventos publicados.
3. `security_invoker` mantiene las políticas RLS de las tablas de origen.
4. Los filtros son tipo, carrera y rango de fechas; el texto no se persiste.

### Correo transaccional

1. Al insertar una consulta, un trigger encola avisos para administración/revisión y
   un comprobante para la persona consultante.
2. `procesar-correo.mjs` reclama lotes y envía mediante Brevo o Resend.
3. `email_claim`, `email_mark_sent` y `email_mark_failed` controlan intentos,
   backoff, estado y trazabilidad.
4. `baja.mjs` procesa el token de baja desde el correo y cancela pendientes.

### Métricas responsables

1. `metricas.mjs` registra una página por sesión y respeta Do Not Track.
2. `metrics_register` valida destinos y acumula por día; no guarda identidad.
3. El equipo editorial consulta `metrics_summary` desde `gestion.html`.
4. La purga de agregados mayores a 365 días ocurre al registrar actividad.

### Comunidad y permisos

1. El registro crea `auth.users` y un trigger crea `public.profiles`.
2. El perfil solicitado no concede permisos: un administrador debe aprobarlo.
3. RLS impide leer perfiles ajenos; las políticas se prueban con PGlite.

### Contacto

1. `contacto.js` envía JSON a `/.netlify/functions/contacto`.
2. La función valida origen, método, tamaño, consentimiento y honeypot.
3. Se anonimiza la IP con HMAC y se llama al RPC `contact_submit`.
4. El RPC aplica idempotencia y límite de 5 envíos por hora por origen.
5. La consulta aparece en la bandeja privada de `gestion.html`.

### Skynet

1. `skynet.mjs` conversa con respuestas guiadas y fuentes locales.
2. Las publicaciones se consultan con la clave pública y RLS.
3. El historial solo se guarda con consentimiento y RPC autenticados.

## Reglas de frontera

- Ninguna clave `service_role`, SMTP o token de despliegue puede aparecer en
  `assets/` ni en HTML. Las claves publishable son públicas por diseño.
- El navegador nunca decide permisos: los RPC y RLS son la fuente de verdad.
- Toda escritura muestra carga, error y confirmación; no se simula éxito.
- Los recursos externos deben justificarse. La portada ya no depende de Unsplash.
- Las migraciones aplicadas son inmutables. Se agrega una migración nueva.
- Un cambio de selector del CMS requiere migración compatible y pruebas.

## Por qué el HTML sigue en la raíz

Mover las páginas a `frontend/` obligaría a reescribir el build, el servidor local,
las rutas de Netlify, el catálogo del CMS, decenas de enlaces y las pruebas. No
aporta una ventaja funcional y aumenta el riesgo de romper producción. La separación
se mantiene por responsabilidad de carpeta y por el paquete `dist/`, que es lo único
que se publica.

## Comandos de verificación

```sh
npm test          # lógica, contratos HTML, PostgreSQL embebido y build
npm run build     # genera dist/ con HTML, assets optimizados y public/
npm run check     # pruebas + build, igual que Netlify
npm run dev       # servidor local en http://localhost:4173
```

Antes de publicar: revisar `git diff --check`, probar teclado y móvil, confirmar
permisos reales y validar que `dist/` no incluya fuentes, pruebas ni originales.
