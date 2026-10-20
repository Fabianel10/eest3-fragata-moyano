# Entrega 1.8.0 — Skynet con identidad e historial privado

Proyecto estudiantil de la EEST N.º 3 «Fragata Moyano», con revisión técnica y
corrección docente. Esta entrega continúa la gestión y notificaciones de la 1.7.0.

## Capacidades incorporadas

- Personaje PNG transparente, optimizado desde la imagen aportada.
- Saludos, agradecimientos, despedidas y orientación guiada sobre doce temas.
- Pregunta cómo llamar a la persona; acepta un nombre de pila/apodo opcional.
  El recuerdo en la cuenta requiere autorización y puede eliminarse por separado.
- Contexto de carrera y seguimiento: `Informática` → `¿y sus horarios?`.
- Búsqueda de hasta cinco títulos públicos vigentes; enlaces a artículos concretos.
- Historial privado en Supabase con consentimiento explícito, máximo 100 turnos,
  páginas de 30, ventana visible de 90 días, exportación JSON y borrado.
- Reintentos con UUID estable y aviso explícito cuando no se confirmó el guardado.
- Cierre/cambio de sesión limpia nombre, conversación y contexto.
- README e índice técnico reorganizados; guía de Skynet, contribución y guías
  operativas actualizadas. Se conserva la documentación histórica.
- About de GitHub con descripción, enlace de producción y temas del proyecto.

## Privacidad y límites

Skynet sigue siendo un asistente guiado, no una IA generativa ni una persona.
No confirma vacantes ni crea trámites. Sin consentimiento, no guarda conversaciones.
El nombre recordado es independiente del permiso de historial.

Los datos vencidos se ocultan a los 90 días y se purgan en la siguiente operación
de historial; no se implementó un proceso nocturno. Los chats son privados entre
cuentas por RLS, no cifrados de extremo a extremo frente a operadores técnicos.
No se envían a proveedores de IA. Consultar la [guía de Skynet](../../../docs/SKYNET.md).

## Verificación

- Suite completa de 81 pruebas aprobadas y paquete público generado correctamente.
- Pruebas de PostgreSQL embebido para consentimiento, identidad de propietario,
  idempotencia, conflicto, validación de fuentes, nombre, límite de 100, páginas
  de 30, caducidad, borrado, revocación y eliminación de cuenta.
- Pruebas de diálogo, contexto, patrones evidentes de datos sensibles, búsqueda
  pública con filtros y respuestas de red inválidas.
- Contrato PNG con canal alfa, dimensiones máximas de 420 px y peso inferior a 200 KB.
- Compatibilidad de las siete migraciones con el CMS y las funciones existentes.
- Navegador a 375 px: imagen visible, nombre temporal, recuerdo, olvido y sin overflow.
- Interfaz con Auth/RPC simulados: consentimiento, nombre recordado, persistencia,
  recuperación al recargar y reintento de respuesta perdida sin duplicar turnos.
  Logout limpia los datos privados. No se confunde esta evidencia con un login real.
- API de Contributors de GitHub: solo colaboradores humanos; no se reescribe la
  historia ni se alteran sus autores. La interfaz de GitHub puede mantener caché.
- Migración séptima aplicada al Supabase real. Prueba transaccional bajo rol
  autenticado: consentimiento, nombre, guardado idempotente, recuperación,
  olvido y revocación. Rollback completo, cero turnos y preferencias de prueba.
- REST real devuelve HTTP 401 a anónimos para las tablas y RPC de Skynet.
  El CMS conserva sus cantidades previas.

## Corrección docente

Se valora que el equipo incorporó identidad visual sin perder accesibilidad y
separó orientación, fuentes y persistencia. Se exige consentimiento verificable:
recordar un apodo no autoriza guardar todo el chat. Las pruebas verifican límites
exactos, aislamiento entre cuentas y el caso de una escritura cuya respuesta se pierde.

### Próximos criterios de aceptación

1. Probar con una cuenta autorizada el recorrido completo en un teléfono físico y
   un lector de pantalla; no incluir datos personales en la evidencia pública.
2. Revisar respuestas y datos escolares con Secretaría y equipo docente.
3. Confirmar política de retención, responsables y requisitos para menores.
4. Completar confirmación de registro y cambio de contraseña en Auth.
5. Documentar simulacro de backup/restauración y monitoreo de servicios.
6. Evaluar purga programada si la política institucional exige eliminación física
   sin depender de la siguiente visita.

Campañas de correo, push, roles editor/revisor, preinscripción e IA generativa
siguen fuera del alcance de esta versión.
