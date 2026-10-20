# Skynet — Asistente de orientación institucional

## Funcionalidades y límites

Skynet utiliza respuestas guiadas mantenidas en el repositorio y búsqueda de
publicaciones vigentes. No utiliza un modelo generativo y no representa a una
persona de Secretaría. No confirma vacantes, no decide inscripciones ni cambia roles.

- Imagen PNG transparente suministrada para el proyecto, optimizada a 252 × 420 px.
- Saludos, agradecimientos, despedidas y explicación de sus capacidades.
- Nombre de pila o apodo opcional, sin necesidad de indicar nombre completo.
- Doce temas institucionales, contexto de carrera y preguntas de seguimiento.
- Búsqueda de hasta cinco títulos públicos, con filtros por tipo, carrera y vigencia.
- Fuentes locales que abren el artículo concreto o el catálogo filtrado.
- Historial privado opcional: consulta, recuperación por páginas, descarga y borrado.
- Teclado, Escape, retorno de foco, estados de carga/error y adaptación móvil.

### Ejemplo de recorrido

1. Abrir **Skynet · Ayuda** y escribir `hola`.
2. Indicar `me llamo Fabi`. El asistente solicita confirmarlo en **Cómo llamarte**.
3. Elegir usarlo solo en esta página o autorizar recordarlo en la cuenta.
4. Preguntar `Informática` y luego `¿y sus horarios?`.
5. Consultar `buscar taller` para buscar títulos publicados.
6. Descargar la conversación o eliminarla antes de terminar en un equipo compartido.

Preguntas que no reconoce reciben un límite explícito y enlaces a la escuela.
El filtro preventivo rechaza patrones evidentes de correo, teléfono, DNI o claves;
no es un clasificador infalible de datos sensibles. No ingresar esa información.

## Consentimiento, nombre y conversación

| Dato | Sin autorización | Con autorización |
| --- | --- | --- |
| Consulta/respuesta | Memoria de esta página | Historial de la cuenta en Supabase |
| Nombre/apodo | Solo esta página | Preferencia privada de la cuenta |
| Contexto de carrera | Memoria de la conversación | Se reconstruye desde los turnos recuperados |

El guardado está desactivado por defecto. No se guarda retroactivamente lo escrito
antes de autorizar. Cambiar el permiso de historial no suscribe a correo ni cambia
las preferencias de avisos internos.

- Límite: **100 turnos por cuenta**, con preguntas de 1–300 caracteres.
- Ventana visible: **90 días**; los registros vencidos se purgan al consultar,
  guardar o cambiar el consentimiento. No hay un cron de borrado nocturno.
- Consultas de historial: 30 turnos por página; exportación de hasta 100 en JSON.
- Desactivar elimina las conversaciones y detiene nuevas escrituras.
- **Borrar historial** elimina los turnos sin cambiar la elección de guardado.
- El nombre se mantiene hasta usar **Olvidar mi nombre** o eliminar la cuenta.
  Su autorización es independiente del historial.
- Eliminar la cuenta Auth elimina sus preferencias y turnos por cascada.

Las políticas RLS no permiten que otras cuentas, incluidas las administrativas del
portal, lean conversaciones ajenas. Los operadores autorizados de infraestructura
pueden tener acceso técnico a la base; no se promete cifrado de extremo a extremo.
No hay un panel administrativo de conversaciones.

Las respuestas recuperadas son **históricas**, no una garantía de vigencia.
Repetir la consulta actualiza la búsqueda. No se transfieren chats a proveedores
de IA; la búsqueda pública envía al Supabase institucional el filtro necesario.

## Persistencia y API

Migración: `supabase/migrations/202610200007_skynet.sql`.

| Recurso | Responsabilidad |
| --- | --- |
| `skynet_preferences` | Consentimiento, versión de política, nombre autorizado y fecha |
| `skynet_turns` | Propietario, UUID idempotente, pregunta, respuesta y fecha |
| `skynet_consent` | Autorizar/revocar guardado; revocar elimina turnos |
| `skynet_name_set` | Guardar nombre opcional o eliminarlo con `null` |
| `skynet_history_append` | Validar y guardar sin duplicar un reintento |
| `skynet_history_list` | Historial propio con cursor y purga de vencidos |
| `skynet_history_clear` | Borrar únicamente el historial de la cuenta actual |

Los RPC derivan el propietario de `auth.uid()`, no de un ID enviado por el cliente.
Se serializan cambios de la misma cuenta mediante advisory locks. No hay INSERT,
UPDATE o DELETE directos para el navegador. El servidor valida tamaños y fuentes
locales permitidas; el cliente usa `textContent`, no HTML de las conversaciones.

Si falla una escritura, se muestra **no guardada** y se ofrece reintentar con el
mismo UUID. Una respuesta incierta nunca se presenta como guardado confirmado.
Al cambiar o cerrar sesión se aborta la búsqueda y se vacía el contenido privado;
las respuestas pendientes no pueden repoblar el diálogo.

## Mantenimiento

- `assets/js/skynet-modelo.mjs`: temas, diálogo, nombres, contexto y validadores.
- `assets/js/skynet-servicios.mjs`: búsqueda REST pública y composición de fuentes.
- `assets/js/skynet.mjs`: interfaz, sesión, consentimiento, historial y exportación.
- `assets/css/skynet.css`: identidad visual y comportamiento adaptable.
- `assets/images/skynet.png`: personaje con transparencia.
- `tests/skynet*.test.mjs`: contratos, validaciones y pruebas PostgreSQL.

Agregar respuestas solo con fuentes institucionales comprobables. No convertir
una ausencia de publicaciones en una afirmación de que no hay clases o vacantes.
La consulta usa explícitamente publicación/vencimiento y solo la clave pública;
no aprovecha permisos administrativos para mostrar borradores.

## Verificación de cada entrega

1. Pruebas unitarias y de PostgreSQL: `node --test tests/skynet*.test.mjs`.
2. Probar visitante, cuenta sin consentimiento y cuenta con historial.
3. Verificar nombre temporal, nombre recordado, olvido y consentimiento independiente.
4. Recargar: recuperar solo la cuenta actual; cerrar sesión: limpiar datos.
5. Probar búsqueda sin resultados, fallos de red y reintentos sin duplicados.
6. Verificar límites de 100 turnos, 30 por página, vencimiento y exportación.
7. Revisar móvil a 375 px, foco, Escape y visualización del personaje.
8. En producción, verificar tablas y RPC sin dejar conversaciones de prueba.
