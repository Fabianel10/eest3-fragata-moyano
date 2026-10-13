export const PAGINAS = Object.freeze({
  inicio: 'Inicio', historia: 'Historia', galeria: 'Galería', calendario: 'Calendario',
  informatica: 'Informática Personal y Profesional',
  madera: 'Industrialización de la Madera y el Mueble', obras: 'Maestro Mayor de Obras'
});
export const ARCHIVOS = Object.freeze({
  inicio: 'index.html', historia: 'historia.html', galeria: 'galeria.html', calendario: 'calendario.html',
  informatica: 'informatica.html', madera: 'madera.html', obras: 'obras.html'
});
export const TIPOS_BLOQUE = ['original', 'texto', 'imagen', 'llamada', 'tarjetas'];
export const TIPOS_EVENTO = ['feriado', 'local', 'docente', 'turistico', 'efemeride', 'tecnica'];
export const TIPOS_MEDIO = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'audio/mpeg'];
export const MAX_ARCHIVO = 20 * 1024 * 1024;

export function urlSegura(value, kind = 'link') {
  if (typeof value !== 'string' || value.length > 2048 || /[\u0000-\u0020\\<>"'`]/.test(value)) return false;
  if (!value) return kind !== 'link';
  if (kind === 'link' && /^(#[a-zA-Z0-9_-]+|mailto:[^:]+@[^:]+|tel:\+?[0-9-]+)$/.test(value)) return true;
  if (/^https:\/\/[^/@:?#]+(?::443)?(?:[/?#][^\s]*)?$/.test(value)) return true;
  if (/^(?:assets\/[a-zA-Z0-9_%./()-]+|[a-zA-Z0-9_-]+\.html(?:#[a-zA-Z0-9_-]+)?)$/.test(value) &&
      !value.split('/').includes('..') && !/%(?:2e|2f|5c)/i.test(value)) return true;
  return false;
}

function exigir(ok, message) { if (!ok) throw new Error(message); }
function texto(value, max = 10000) { return typeof value === 'string' && value.length <= max && !value.includes('\u0000'); }
export function validarCampo(campo) {
  exigir(campo && ['text', 'image', 'link', 'background'].includes(campo.kind), 'Tipo de campo inválido.');
  exigir(texto(campo.value), 'El texto supera el límite de 10.000 caracteres.');
  if (campo.kind !== 'text') exigir(urlSegura(campo.value, campo.kind), 'URL inválida: usá HTTPS o una ruta local permitida, sin espacios.');
  if (campo.kind === 'image') exigir(texto(campo.alt, 500), 'La descripción de imagen supera 500 caracteres.');
}
function validarCamposNuevos(fields) {
  const tipos = { kicker: 'text', title: 'text', body: 'text', image: 'image', link: 'link', linkText: 'text' };
  for (const [key, field] of Object.entries(fields)) {
    exigir(tipos[key] === field.kind, 'Campo no permitido en un bloque nuevo.');
  }
}

export function validarDocumento(doc) {
  exigir(doc && doc.version === 1, 'Versión de contenido incompatible.');
  exigir(new TextEncoder().encode(JSON.stringify(doc)).length <= 1048576, 'La página supera el límite de 1 MB de contenido.');
  exigir(texto(doc.title, 200) && doc.title.trim(), 'Ingresá un título de página de hasta 200 caracteres.');
  exigir(texto(doc.description, 500), 'La descripción de página supera 500 caracteres.');
  exigir(Array.isArray(doc.blocks) && doc.blocks.length > 0 && doc.blocks.length <= 60, 'La página debe tener entre 1 y 60 bloques.');
  exigir(doc.chrome && typeof doc.chrome === 'object' && !Array.isArray(doc.chrome), 'Faltan campos de cabecera y pie.');
  const validarCampos = (fields) => {
    exigir(fields && typeof fields === 'object' && !Array.isArray(fields) && Object.keys(fields).length <= 1000, 'Campos de bloque inválidos.');
    Object.entries(fields).forEach(([key, campo]) => {
      exigir(/^[a-zA-Z0-9_-]{1,80}$/.test(key), 'Identificador de campo inválido.');
      validarCampo(campo);
    });
  };
  validarCampos(doc.chrome);
  const ids = new Set();
  const originales = new Set();
  for (const bloque of doc.blocks) {
    exigir(bloque && typeof bloque.id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(bloque.id) && !ids.has(bloque.id), 'ID de bloque duplicado o inválido.');
    ids.add(bloque.id);
    exigir(TIPOS_BLOQUE.includes(bloque.kind) && typeof bloque.hidden === 'boolean', 'Tipo o visibilidad de bloque inválidos.');
    exigir(['claro', 'acento', 'oscuro'].includes(bloque.theme), 'Tema de bloque inválido.');
    exigir(['izquierda', 'derecha'].includes(bloque.layout), 'Distribución de bloque inválida.');
    exigir(texto(bloque.label, 120), 'Nombre de bloque inválido.');
    validarCampos(bloque.fields);
    if (bloque.kind === 'original') {
      exigir(typeof bloque.source === 'string' && /^b[0-9]+$/.test(bloque.source) && !originales.has(bloque.source), 'Sección original inválida o duplicada.');
      originales.add(bloque.source);
    } else validarCamposNuevos(bloque.fields);
    exigir(Array.isArray(bloque.cards) && bloque.cards.length <= 12, 'Un bloque admite hasta 12 tarjetas.');
    bloque.cards.forEach((fields) => { validarCampos(fields); validarCamposNuevos(fields); });
  }
  exigir(doc.modules && typeof doc.modules === 'object', 'Módulos inválidos.');
  exigir(Array.isArray(doc.modules.gallery) && doc.modules.gallery.length <= 100, 'La galería admite hasta 100 elementos.');
  for (const item of doc.modules.gallery) {
    exigir(['image', 'video'].includes(item.type) && urlSegura(item.src, 'image') && item.src &&
      texto(item.title, 300) && item.title.trim(), 'Elemento de galería inválido.');
  }
  exigir(Array.isArray(doc.modules.events) && doc.modules.events.length <= 500, 'La agenda admite hasta 500 fechas.');
  const fechas = new Set();
  for (const item of doc.modules.events) {
    exigir(/^\d{4}-\d{2}-\d{2}$/.test(item.date) && Number(item.date.slice(0, 4)) >= 2000 &&
      Number(item.date.slice(0, 4)) <= 2100 &&
      !Number.isNaN(Date.parse(`${item.date}T12:00:00Z`)) &&
      new Date(`${item.date}T12:00:00Z`).toISOString().slice(0, 10) === item.date && !fechas.has(item.date),
    'Fecha de agenda inválida.');
    fechas.add(item.date);
    exigir(TIPOS_EVENTO.includes(item.type) && texto(item.title, 300) && item.title.trim() &&
      texto(item.description, 2000) && urlSegura(item.image, 'image'), 'Actividad de agenda inválida.');
  }
  exigir(Array.isArray(doc.modules.playlist) && doc.modules.playlist.length <= 30, 'Se admiten hasta 30 audios.');
  doc.modules.playlist.forEach((item) => exigir(urlSegura(item.src, 'image') && item.src &&
    texto(item.title, 300) && item.title.trim(), 'Audio inválido.'));
  exigir(Number.isInteger(doc.modules.year) && doc.modules.year >= 2000 && doc.modules.year <= 2100, 'Año de calendario inválido.');
  return doc;
}

export function nuevoBloque(kind) {
  exigir(TIPOS_BLOQUE.includes(kind) && kind !== 'original', 'Elegí un tipo de bloque nuevo.');
  const campos = {
    kicker: { kind: 'text', value: 'Comunidad Técnica 3' },
    title: { kind: 'text', value: 'Un nuevo espacio para compartir' },
    body: { kind: 'text', value: 'Escribí aquí el contenido de esta sección.' }
  };
  if (kind === 'imagen') campos.image = { kind: 'image', value: '', alt: '' };
  if (kind === 'llamada') {
    campos.link = { kind: 'link', value: 'comunidad.html' };
    campos.linkText = { kind: 'text', value: 'Conocé más' };
  }
  return {
    id: `n-${crypto.randomUUID()}`, kind, source: '', label: 'Nueva sección', hidden: false,
    theme: 'claro', layout: 'derecha', fields: campos,
    cards: kind === 'tarjetas' ? [nuevaTarjeta()] : []
  };
}
export function nuevaTarjeta() {
  return {
    title: { kind: 'text', value: 'Título de tarjeta' },
    body: { kind: 'text', value: 'Descripción de la propuesta.' },
    image: { kind: 'image', value: '', alt: '' },
    link: { kind: 'link', value: 'index.html' },
    linkText: { kind: 'text', value: 'Ver más' }
  };
}
export function validarArchivo(file) {
  exigir(file && TIPOS_MEDIO.includes(file.type), 'Formato permitido: JPG, PNG, WebP, GIF, MP4 o MP3.');
  exigir(file.size > 0 && file.size <= MAX_ARCHIVO, 'El archivo debe pesar entre 1 byte y 20 MB.');
}
export const escaparHTML = (value) => String(value).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[c]);
