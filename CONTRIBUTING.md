# Contribuir al portal de la EEST N.º 3

Este es un proyecto estudiantil con revisión docente. Cada contribución debe
preservar la autoría real, la privacidad y el funcionamiento de los servicios
institucionales existentes.

## Preparación

1. Leer el [README](README.md) y el [índice técnico](docs/README.md).
2. Usar Node.js 22 o superior. Ejecutar `npm ci`, `npm test` y `npm run dev`.
3. Crear una rama descriptiva: `feat/nombre`, `fix/nombre` o `docs/nombre`.
4. Confirmar el entorno: la configuración local puede apuntar a producción.
   Usar pruebas embebidas o un proyecto Supabase de prueba para experimentar.

## Cambios de código y contenido

- Mantener módulos pequeños y reutilizar validadores y helpers existentes.
- Mostrar carga, vacío y error; nunca presentar como éxito una escritura no confirmada.
- No usar HTML de usuarios en `innerHTML`; crear nodos y asignar `textContent`.
- Probar móvil, teclado, foco y cierre de diálogos. Respetar movimiento reducido.
- No inventar docentes, vacantes, horarios, fechas o datos de contacto.
- No incluir fotografías identificables, audios o documentos sin autorización.
- No regenerar IDs del catálogo CMS sobre páginas ya guardadas sin una migración
  compatible. Cambiar selectores preservando IDs cuando solo cambia el DOM.

## Base de datos

- Agregar una migración incremental nueva; no modificar migraciones aplicadas.
- Definir RLS, permisos mínimos, validación de servidor y controles de propietario.
- Incluir pruebas de usuarios distintos, anónimos, límites exactos y concurrencia
  cuando corresponda. El cliente no reemplaza las validaciones de PostgreSQL.
- Aplicar a producción solo con autorización y preflight de esquema.
- No crear roles ni conceder permisos institucionales como efecto de una prueba.

## Evidencias obligatorias del Pull Request

```text
Objetivo:
Cambios:
Pruebas ejecutadas y resultado:
Verificación móvil/teclado:
Migraciones y configuración necesarias:
Impacto en datos/privacidad:
Reversión:
Limitaciones y próximos pasos:
```

Las pruebas mínimas son `npm test`, `npm run build` y `git diff --check`.
Agregar pruebas específicas para nuevas funciones y regresiones corregidas.
Actualizar documentos directamente relacionados y el [CHANGELOG](CHANGELOG.md).

## Entrega y revisión docente

Una persona autorizada revisa el PR, valida contenidos y publica la versión.
Cada release incluye etiqueta Git y una carpeta en
`archive/versiones/vX.Y.Z/` con logros, evidencia, correcciones y próximos criterios.
No reescribir historia compartida ni forzar pushes sin autorización explícita.
Conservar autores estudiantiles y docentes; no agregar atribuciones automáticas
de herramientas como coautores de commits.

## Comunicación responsable

No publicar credenciales, datos de cuentas, chats reales o vulnerabilidades con
datos explotables en issues públicos. Comunicar incidentes a las personas
responsables del proyecto por un canal privado verificado. La institución debe
definir ese canal antes de la apertura oficial.
