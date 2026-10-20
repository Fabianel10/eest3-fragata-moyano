# Documentación del portal

## Propósito y organización

Estas guías describen el sistema vigente. Las carpetas de
[versiones](../archive/versiones/README.md) conservan evidencia histórica y no deben
interpretarse como instrucciones para recrear o reejecutar servicios existentes.
La portada técnica del proyecto es el [README principal](../README.md).

| Perfil | Lectura recomendada |
| --- | --- |
| Comunidad | [Cuentas y preferencias](COMUNIDAD.md), [Skynet](SKYNET.md) y [privacidad del sitio](https://eest3sf.netlify.app/privacidad.html) |
| Administración | [Flujo editorial, consultas y notificaciones](ADMINISTRACION.md) |
| Operación técnica | [Configuración, migraciones y despliegue](DESPLIEGUE_COLABORADORES.md) |
| Estudiantes y colaboradores | [Contribución](../CONTRIBUTING.md), [hoja de ruta](MEJORAS.md) y [entregas](../archive/versiones/README.md) |

## Componentes y fuentes de verdad

- **Código:** rama `main` y etiquetas de release de GitHub.
- **Contenido editorial publicado:** Supabase; el catálogo local es una plantilla
  inicial, no un reemplazo silencioso de publicaciones reales.
- **Acceso:** Supabase Auth y roles autorizados en perfiles; no metadatos editables.
- **Contacto:** Netlify Function → RPC privado → bandeja administrativa de Supabase.
- **Historial Skynet:** RPC autenticados, RLS por propietario, consentimiento separado
  para conversación y nombre recordado.
- **Despliegue:** Netlify vinculado a GitHub; comprobar SHA, estado `ready` y recursos.
- **Historial técnico y docente:** [CHANGELOG](../CHANGELOG.md) y evidencia por versión.

## Reglas de mantenimiento

1. Actualizar la guía del módulo cuando cambie comportamiento, datos o permisos.
2. Mantener secretos y datos reales fuera de ejemplos, capturas y registros.
3. Registrar lo verificado y sus límites; no afirmar pruebas que no se ejecutaron.
4. Las migraciones son incrementales e inmutables después de aplicarse.
5. No mover páginas HTML o recursos sin actualizar enlaces, catálogo CMS y pruebas.
6. Mantener las versiones históricas como evidencia; corregir el estado actual aquí.

## Validaciones institucionales pendientes

La institución debe confirmar responsables, conservación de consultas, requisitos
para menores, contenidos oficiales y derechos de publicación de los recursos.
Campañas de correo, push, matrícula formal e IA generativa no forman parte de esta
entrega. Consultar los criterios de aceptación en la [hoja de ruta](MEJORAS.md).
