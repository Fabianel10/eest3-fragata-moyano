# Accesibilidad

## Auditoría automatizada

```sh
npm run auditoria:a11y
```

El comando revisa todas las páginas y falla si encuentra:

- imágenes sin `alt`;
- controles sin etiqueta, `aria-label` o `aria-labelledby`;
- botones o enlaces sin nombre accesible;
- IDs duplicados;
- referencias `aria-controls` o `aria-labelledby` inexistentes;
- `tabindex` positivo;
- iframes sin `title`;
- cantidad de `h1` distinta de uno;
- falta de `lang`, `main` o enlace para saltar al contenido;
- ausencia de la pista de subtítulos del video.

Estado de la entrega 1.11: **sin hallazgos automáticos**.

## Subtítulos y video

El video de la galería incluye:

- `aria-label` descriptivo;
- `controls` y `muted`;
- pista WebVTT `assets/captions/recorrido-escuela.vtt`;
- nota visible que aclara que no contiene diálogo.

La pista describe el contenido visual; no inventa diálogos. Si en el futuro se
incorpora audio con voz, reemplazar la pista por subtítulos literales y revisar
la sincronización.

## Revisión manual obligatoria

La automatización no reemplaza una auditoría con personas usuarias. Antes de
publicar una nueva versión, revisar:

1. Navegación completa con teclado, foco visible y orden lógico.
2. Lector de pantalla en Inicio, Comunidad, Calendario, Buscador y Administración.
3. Contraste en tema claro y oscuro, incluyendo botones, enlaces y estados de error.
4. Formularios: etiquetas, mensajes de error, foco al primer error y `aria-live`.
5. Diálogos: apertura, Escape, foco atrapado y foco devuelto al botón de origen.
6. Video: subtítulos activables, transcripción y control de pausa.
7. Móvil real a 320, 375 y 414 px, zoom al 200 % y orientación horizontal.
8. Movimiento reducido: carrusel, animaciones y desplazamientos.
9. Carga, vacío y error comprobados con conexión lenta y sin conexión.
10. Revisión de lenguaje claro y mensajes que no dependan solo del color.

Registrar fecha, responsable, dispositivo, lector de pantalla y hallazgos. No
publicar capturas con datos personales.
