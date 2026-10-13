import {
  PAGINAS, ARCHIVOS, TIPOS_EVENTO, nuevoBloque, nuevaTarjeta,
  validarDocumento, validarArchivo, urlSegura
} from './cms-modelo.mjs';
import { createCmsBackup, parseCmsBackup, backupFilename } from './cms-backup.mjs';
import { obtenerCliente, configurado, resultado } from './supabase-cliente.mjs';
import { mensajeError } from './comunidad-validacion.mjs';

const $ = (selector) => document.querySelector(selector);
const body = $('#admin-editor-body');
const gate = $('#admin-gate');
const workspace = $('#admin-workspace');
const frame = $('#admin-preview-frame');
let cliente;
let catalogo;
let slug = 'inicio';
let content;
let version = 0;
let publicado = null;
let dirty = false;
let busy = false;
let selection = 'ajustes';
let mediaTarget = null;
let pendingMedia = null;
let historyOffset = 0;
let previewContent;
let previewSlug;
let fieldCounter = 0;

async function cambiarPagina(next) {
  const previous = slug;
  slug = next;
  try {
    await cargarPagina();
    $('#admin-pagina-selector').value = slug;
  } catch (error) {
    slug = previous;
    $('#admin-pagina-selector').value = slug;
    throw error;
  }
}

function element(tag, text, clase) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (clase) node.className = clase;
  return node;
}
function aviso(message, error = false) {
  const node = $('#admin-estado');
  node.textContent = message;
  node.hidden = false;
  node.toggleAttribute('data-error', error);
  node.focus();
}
function informarError(error) {
  console.error('Administración editorial:', error.code || error.name);
  const message = error.code === '40001'
    ? 'Otra sesión cambió esta página. Tus cambios siguen en el editor, pero no se sobrescribió el servidor. Copiá lo que necesites y recargá el borrador antes de continuar.'
    : error.code === '22023'
      ? 'El backend rechazó el contenido. Revisá límites, enlaces y campos obligatorios.'
      : mensajeError(error);
  aviso(message, true);
}
async function operacion(action) {
  if (busy) return;
  busy = true;
  actualizarControles();
  try { await action(); } catch (error) { informarError(error); }
  finally { busy = false; actualizarControles(); }
}
function actualizarControles() {
  $('#admin-editor-fields').disabled = busy;
  $('#admin-pagina-selector').disabled = busy;
  $('#admin-guardar').disabled = busy || !dirty;
  $('#admin-publicar').disabled = busy || dirty || version === 0;
  $('#admin-recargar').disabled = busy;
  $('#admin-exportar').disabled = busy || !content;
  $('#admin-importar').disabled = busy || !catalogo;
  $('#admin-agregar').disabled = busy || !content || content.blocks.length >= 60;
  $('#admin-preview-update').disabled = busy || !content;
  $('#admin-bloques').querySelectorAll('button').forEach((button) => {
    button.disabled = busy || button.dataset.limite === 'true';
  });
  $('#admin-cambios').textContent = dirty ? 'Cambios sin guardar · actualizá la vista previa' : 'Sin cambios pendientes';
  $('#admin-version').textContent = version
    ? `Borrador v${version} · ${publicado ? `publicada v${publicado.version}` : 'sin publicación'}`
    : 'Plantilla inicial · sin borrador';
}
function cambio() { dirty = true; actualizarControles(); }
function confirmar(message) {
  const dialog = $('#admin-confirmacion');
  $('#admin-confirmacion-texto').textContent = message;
  dialog.showModal();
  return new Promise((resolve) => {
    const finish = (ok) => {
      dialog.close();
      $('#admin-confirmacion-si').removeEventListener('click', si);
      $('#admin-confirmacion-no').removeEventListener('click', no);
      dialog.removeEventListener('cancel', cancelar);
      resolve(ok);
    };
    const si = () => finish(true);
    const no = () => finish(false);
    const cancelar = (event) => { event.preventDefault(); finish(false); };
    $('#admin-confirmacion-si').addEventListener('click', si);
    $('#admin-confirmacion-no').addEventListener('click', no);
    dialog.addEventListener('cancel', cancelar);
    $('#admin-confirmacion-no').focus();
  });
}
function boton(text, action, clase = 'admin-btn') {
  const node = element('button', text, clase);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
}
function campo(parent, label, value, setValue, options = {}) {
  const wrapper = element('div', '', 'admin-field');
  const caption = element('label', label);
  const input = element(options.multiline ? 'textarea' : options.choices ? 'select' : 'input');
  input.id = `editor-field-${++fieldCounter}`;
  caption.htmlFor = input.id;
  if (options.choices) {
    options.choices.forEach(([id, nombre]) => {
      const option = element('option', nombre);
      option.value = id;
      input.append(option);
    });
  } else if (!options.multiline) input.type = options.type || 'text';
  if (options.type === 'checkbox') input.checked = value;
  else input.value = value;
  if (options.max) input.maxLength = options.max;
  if (options.min !== undefined) input.min = options.min;
  if (options.required) input.required = true;
  input.addEventListener(options.choices || options.type === 'checkbox' ? 'change' : 'input', () => {
    setValue(options.type === 'checkbox' ? input.checked : input.value);
    if (options.track !== false) cambio();
  });
  wrapper.append(caption, input);
  if (options.help) {
    const help = element('small', options.help);
    help.id = `${input.id}-help`;
    input.setAttribute('aria-describedby', help.id);
    wrapper.append(help);
  }
  parent.append(wrapper);
  return wrapper;
}
function editarCampos(parent, fields, descriptors = {}) {
  for (const [key, field] of Object.entries(fields)) {
    const label = descriptors[key]?.label || ({
      kicker: 'Antetítulo', title: 'Título', body: 'Texto', image: 'Imagen', link: 'Destino del enlace', linkText: 'Texto del botón'
    }[key] || key);
    const wrapper = campo(parent, `${label} · ${key}`, field.value, (value) => { field.value = value; }, {
      multiline: field.kind === 'text', max: field.kind === 'text' ? 10000 : 2048,
      help: field.kind !== 'text' ? 'HTTPS o ruta local. Codificá espacios como %20.' : 'Texto plano: no se ejecuta HTML.'
    });
    if (field.kind === 'image') {
      campo(parent, 'Descripción de imagen (accesibilidad)', field.alt, (value) => { field.alt = value; }, { max: 500 });
    }
    if (['image', 'background'].includes(field.kind)) {
      wrapper.append(boton('Elegir de la biblioteca', () => {
        mediaTarget = { use: (url, alt) => { field.value = url; if (field.kind === 'image') field.alt = alt; }, accept: 'image/', returnSelection: selection };
        selection = 'media';
        renderEditor();
      }));
      if (field.value && urlSegura(field.value, 'image')) {
        const img = element('img');
        img.src = field.value;
        img.alt = field.alt || 'Imagen seleccionada';
        img.loading = 'lazy';
        wrapper.append(img);
      }
    }
  }
}

function renderBloques() {
  const list = $('#admin-bloques');
  list.replaceChildren();
  $('#admin-bloques-cantidad').textContent = `${content.blocks.length}/60`;
  content.blocks.forEach((block, index) => {
    const item = element('li');
    item.toggleAttribute('data-selected', selection === block.id);
    item.append(boton(`${block.hidden ? '○' : '●'} ${block.label || block.kind}`, () => {
      selection = block.id;
      renderEditor();
    }, ''));
    const actions = element('div', '', 'admin-block-actions');
    const up = boton('↑', () => mover(index, -1));
    up.setAttribute('aria-label', `Subir ${block.label}`);
    up.dataset.limite = String(index === 0);
    const down = boton('↓', () => mover(index, 1));
    down.setAttribute('aria-label', `Bajar ${block.label}`);
    down.dataset.limite = String(index === content.blocks.length - 1);
    const visibility = boton(block.hidden ? 'Mostrar' : 'Ocultar', () => {
      block.hidden = !block.hidden;
      cambio();
      renderEditor();
    });
    actions.append(up, down, visibility);
    item.append(actions);
    list.append(item);
  });
  actualizarControles();
}
function mover(index, delta) {
  const next = index + delta;
  if (next < 0 || next >= content.blocks.length) return;
  [content.blocks[index], content.blocks[next]] = [content.blocks[next], content.blocks[index]];
  cambio();
  renderBloques();
}
function renderEditor() {
  if (!content) return;
  body.replaceChildren();
  renderBloques();
  document.querySelectorAll('[data-panel]').forEach((node) => {
    if (node.dataset.panel === selection) node.setAttribute('aria-current', 'true');
    else node.removeAttribute('aria-current');
  });
  const titulo = $('#admin-editor-titulo');
  const titles = {
    ajustes: 'Identidad de la página', chrome: 'Cabecera y pie de página',
    gallery: 'Galería multimedia', events: 'Agenda y calendario',
    playlist: 'Audios institucionales', media: 'Biblioteca de archivos', history: 'Historial de versiones'
  };
  const block = content.blocks.find((item) => item.id === selection);
  titulo.textContent = titles[selection] || block?.label || 'Sección';
  if (selection === 'ajustes') {
    campo(body, 'Título de página (pestaña del navegador)', content.title, (value) => { content.title = value; }, { max: 200, required: true });
    campo(body, 'Descripción para buscadores', content.description, (value) => { content.description = value; }, { multiline: true, max: 500 });
    body.append(element('p', 'Estos ajustes corresponden solo a la página seleccionada. Cabeceras y pies también se editan por página.', 'admin-ayuda'));
  } else if (selection === 'chrome') {
    body.append(element('p', 'Editá identidad, navegación, contacto y redes de esta página. No se modifica código, formularios de acceso ni controles automáticos.', 'admin-ayuda'));
    camposConBusqueda(content.chrome, catalogo[slug].descriptors.chrome);
  } else if (block) {
    campo(body, 'Nombre interno de sección', block.label, (value) => {
      block.label = value;
      renderBloques();
    }, { max: 120 });
    campo(body, 'Ocultar esta sección', block.hidden, (value) => { block.hidden = value; renderBloques(); }, { type: 'checkbox' });
    if (block.kind !== 'original') {
      campo(body, 'Estilo', block.theme, (value) => { block.theme = value; }, {
        choices: [['claro', 'Claro'], ['acento', 'Celeste'], ['oscuro', 'Oscuro']]
      });
      if (block.kind === 'imagen') campo(body, 'Imagen a la', block.layout, (value) => { block.layout = value; }, {
        choices: [['derecha', 'Derecha'], ['izquierda', 'Izquierda']]
      });
    }
    camposConBusqueda(block.fields, catalogo[slug].descriptors.blocks[block.source]?.fields || {});
    if (block.kind === 'tarjetas') {
      block.cards.forEach((card, index) => {
        const detail = element('details', '', 'admin-field-group');
        detail.append(element('summary', `Tarjeta ${index + 1}`));
        editarCampos(detail, card);
        detail.append(boton('Quitar tarjeta', () => { block.cards.splice(index, 1); cambio(); renderEditor(); }));
        body.append(detail);
      });
      if (block.cards.length < 12) body.append(boton('+ Agregar tarjeta', () => { block.cards.push(nuevaTarjeta()); cambio(); renderEditor(); }));
    }
    const actions = element('div', '', 'admin-row-actions');
    if (block.kind !== 'original') actions.append(boton('Duplicar sección', () => {
      if (content.blocks.length >= 60) { aviso('Se alcanzó el límite de 60 bloques.', true); return; }
      const copy = structuredClone(block);
      copy.id = `n-${crypto.randomUUID()}`;
      copy.label = `${copy.label.slice(0, 112)} (copia)`;
      content.blocks.splice(content.blocks.indexOf(block) + 1, 0, copy);
      selection = copy.id;
      cambio();
      renderEditor();
    }));
    actions.append(boton('Quitar sección', async () => {
      if (content.blocks.length === 1) { aviso('La página debe conservar al menos un bloque.', true); return; }
      if (!await confirmar('¿Quitar esta sección del borrador? No afecta al sitio hasta publicar; podrás recuperar una versión anterior.')) return;
      content.blocks.splice(content.blocks.indexOf(block), 1);
      selection = 'ajustes';
      cambio();
      renderEditor();
    }));
    body.append(actions);
    if (block.kind === 'original') body.append(element('p', 'Se conserva la estructura y las interacciones de la plantilla original. Podés ordenar, ocultar o quitar esta sección; agregá bloques nuevos para cambiar la composición.', 'admin-ayuda'));
  } else if (['gallery', 'events', 'playlist'].includes(selection)) {
    renderColeccion(selection);
  } else if (selection === 'media') {
    renderMedia().catch(informarError);
  } else if (selection === 'history') {
    historyOffset = 0;
    renderHistorial().catch(informarError);
  }
}
function camposConBusqueda(fields, descriptors) {
  const filter = element('input');
  filter.type = 'search';
  filter.placeholder = 'Buscar texto, imagen o enlace…';
  filter.setAttribute('aria-label', 'Buscar campos de contenido');
  filter.className = 'admin-fields-search';
  const container = element('div');
  editarCampos(container, fields, descriptors);
  filter.addEventListener('input', () => {
    for (const field of container.querySelectorAll('.admin-field')) {
      const value = field.querySelector('input,textarea')?.value || '';
      field.hidden = !`${field.textContent} ${value}`.toLocaleLowerCase('es').includes(filter.value.toLocaleLowerCase('es'));
    }
  });
  body.append(filter, container);
}
function renderColeccion(key) {
  if ((key === 'gallery' && !['galeria', 'informatica', 'madera', 'obras'].includes(slug)) || (key === 'events' && !['inicio', 'calendario'].includes(slug))) {
    body.append(element('p', 'Este módulo no se usa en esta página. Seleccioná Galería para las imágenes, Inicio o Calendario para la agenda, o una página con reproductor para los audios.', 'admin-ayuda'));
    return;
  }
  if (key === 'events') {
    campo(body, 'Año mostrado en Calendario', content.modules.year, (value) => { content.modules.year = Number(value); }, { type: 'number', min: 2000, help: 'Entre 2000 y 2100. La agenda del Inicio muestra fechas futuras. Cada página publica su propia agenda.' });
  }
  const items = content.modules[key];
  const limit = { gallery: 100, events: 500, playlist: 30 }[key];
  items.forEach((item, index) => {
    const details = element('details', '', 'admin-field-group');
    details.append(element('summary', `${index + 1}. ${item.title || 'Nuevo elemento'}${item.date ? ` · ${item.date}` : ''}`));
    campo(details, 'Título', item.title, (value) => { item.title = value; }, { max: 300, required: true });
    if (key === 'events') {
      campo(details, 'Fecha', item.date, (value) => { item.date = value; }, { type: 'date', required: true });
      campo(details, 'Tipo', item.type, (value) => { item.type = value; }, { choices: TIPOS_EVENTO.map((type) => [type, type]) });
      campo(details, 'Descripción destacada', item.description, (value) => { item.description = value; }, { multiline: true, max: 2000 });
    } else if (key === 'gallery') {
      campo(details, 'Formato', item.type, (value) => { item.type = value; }, { choices: [['image', 'Fotografía'], ['video', 'Video MP4']] });
    }
    const mediaKey = key === 'events' ? 'image' : 'src';
    const wrapper = campo(details, key === 'events' ? 'Imagen destacada (opcional)' : 'Archivo o URL HTTPS', item[mediaKey], (value) => { item[mediaKey] = value; }, { max: 2048, required: key !== 'events' });
    wrapper.append(boton('Elegir de la biblioteca', () => {
      mediaTarget = {
        use: (url) => { item[mediaKey] = url; },
        accept: key === 'playlist' ? 'audio/' : key === 'gallery' && item.type === 'video' ? 'video/' : 'image/',
        returnSelection: selection
      };
      selection = 'media';
      renderEditor();
    }));
    const actions = element('div', '', 'admin-row-actions');
    if (index > 0) actions.append(boton('Subir', () => {
      [items[index - 1], items[index]] = [items[index], items[index - 1]]; cambio(); renderEditor();
    }));
    if (index < items.length - 1) actions.append(boton('Bajar', () => {
      [items[index + 1], items[index]] = [items[index], items[index + 1]]; cambio(); renderEditor();
    }));
    actions.append(boton('Quitar', async () => {
      if (!await confirmar('¿Quitar este elemento del borrador? El archivo original seguirá disponible.')) return;
      items.splice(index, 1); cambio(); renderEditor();
    }));
    details.append(actions);
    body.append(details);
  });
  body.append(element('p', `${items.length} / ${limit} elementos. Los cambios se publican con esta página.`, 'admin-ayuda'));
  if (items.length < limit) body.append(boton('+ Agregar elemento', () => {
    items.push(key === 'events'
      ? { date: `${content.modules.year}-01-01`, title: 'Nueva actividad', type: 'tecnica', description: '', image: '' }
      : key === 'gallery' ? { type: 'image', title: 'Nueva fotografía', src: '' }
        : { title: 'Nuevo audio', src: '' });
    cambio(); renderEditor();
  }));
}

async function renderMedia() {
  const currentSlug = slug;
  const panel = element('div');
  body.append(panel);
  panel.append(element('p', 'Archivos públicos autorizados para difusión. Hasta 20 MB: JPG, PNG, WebP, GIF, MP4 o MP3. No subas documentos ni datos privados de estudiantes. Archivar no elimina archivos usados o históricos.', 'admin-ayuda'));
  if (mediaTarget) panel.append(element('p', `Seleccioná un archivo de tipo ${mediaTarget.accept} para el campo que estabas editando.`, 'admin-ayuda'));
  const upload = element('div', '', 'admin-field-group');
  const fileLabel = element('label', 'Seleccionar archivo', 'admin-field');
  const file = element('input');
  file.type = 'file';
  file.accept = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,audio/mpeg';
  fileLabel.append(file);
  upload.append(fileLabel);
  const metadata = { title: '', alt: '' };
  campo(upload, 'Nombre en la biblioteca', '', (value) => { metadata.title = value; }, { max: 200, track: false });
  campo(upload, 'Descripción accesible', '', (value) => { metadata.alt = value; }, { max: 500, track: false });
  upload.append(boton('Subir archivo', () => operacion(async () => {
    if (pendingMedia) throw new Error('Hay un archivo pendiente de registrar. Reintentá su registro primero.');
    const selected = file.files[0];
    validarArchivo(selected);
    if (!metadata.title.trim()) throw new Error('Ingresá un nombre para el archivo.');
    const id = crypto.randomUUID();
    const extension = {
      'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
      'video/mp4': 'mp4', 'audio/mpeg': 'mp3'
    }[selected.type];
    const path = `${id}.${extension}`;
    resultado(await cliente.storage.from('institutional-media').upload(path, selected, { contentType: selected.type, upsert: false }));
    pendingMedia = { id, path, mime_type: selected.type, size_bytes: selected.size, title: metadata.title.trim(), alt: metadata.alt };
    await registrarMedia();
    aviso('Archivo subido y registrado. Ya podés usarlo en un borrador.');
    renderEditor();
  }), 'admin-btn admin-btn-primary'));
  if (pendingMedia) upload.append(boton('Reintentar registro del archivo subido', () => operacion(async () => {
    await registrarMedia(); aviso('El archivo quedó registrado.'); renderEditor();
  })));
  panel.append(upload);
  const list = element('ul', '', 'admin-media-list');
  const pagination = element('div', '', 'admin-row-actions');
  panel.append(list, pagination);
  let offset = 0;
  async function more() {
    const rows = resultado(await cliente.from('cms_media').select('*').eq('archived', false)
      .order('created_at', { ascending: false }).range(offset, offset + 29));
    if (selection !== 'media' || slug !== currentSlug || !panel.isConnected) return;
    offset += rows.length;
    pagination.replaceChildren();
    if (!rows.length && offset === 0) list.append(element('li', 'Todavía no hay archivos en la biblioteca.'));
    for (const row of rows) {
      const item = element('li');
      const url = cliente.storage.from('institutional-media').getPublicUrl(row.path).data.publicUrl;
      if (row.mime_type.startsWith('image/')) {
        const img = element('img');
        img.src = url; img.alt = row.alt; img.loading = 'lazy'; item.append(img);
      }
      item.append(element('strong', row.title), element('p', `${row.mime_type} · ${(row.size_bytes / 1024 / 1024).toFixed(2)} MB`));
      if (mediaTarget && row.mime_type.startsWith(mediaTarget.accept)) {
        item.append(boton('Usar este archivo', () => {
          mediaTarget.use(url, row.alt); selection = mediaTarget.returnSelection; mediaTarget = null; cambio(); renderEditor();
          aviso('Archivo aplicado al campo. Guardá el borrador y actualizá la vista previa.');
        }, 'admin-btn admin-btn-primary'));
      }
      item.append(boton('Copiar URL', async () => {
        try { await navigator.clipboard.writeText(url); aviso('URL copiada.'); }
        catch { aviso(`No se pudo copiar automáticamente. URL del archivo: ${url}`, true); }
      }));
      const edit = element('details', '', 'admin-field-group');
      edit.append(element('summary', 'Editar datos del archivo'));
      const changes = { title: row.title, alt: row.alt };
      campo(edit, 'Nombre', changes.title, (value) => { changes.title = value; }, { max: 200, track: false });
      campo(edit, 'Descripción accesible', changes.alt, (value) => { changes.alt = value; }, { max: 500, track: false });
      edit.append(boton('Guardar datos del archivo', () => operacion(async () => {
        if (!changes.title.trim()) throw new Error('Ingresá un nombre para el archivo.');
        resultado(await cliente.from('cms_media').update(changes).eq('id', row.id).select('id').single());
        aviso('Datos del archivo actualizados. Las imágenes ya insertadas mantienen su descripción propia.');
        renderEditor();
      })));
      item.append(edit, boton('Archivar de la biblioteca', () => operacion(async () => {
        if (!await confirmar('¿Archivar este archivo? Dejará de aparecer en la biblioteca, pero las páginas y versiones que lo usan seguirán funcionando.')) return;
        resultado(await cliente.from('cms_media').update({ archived: true }).eq('id', row.id).select('id').single());
        aviso('Archivo archivado. No se borró su contenido.'); renderEditor();
      })));
      list.append(item);
    }
    if (rows.length === 30) pagination.append(boton('Cargar más archivos', () => operacion(more)));
  }
  await more();
}
async function registrarMedia() {
  try {
    resultado(await cliente.from('cms_media').insert(pendingMedia));
    pendingMedia = null;
  } catch (error) {
    console.error('Registro de archivo:', error.code || error.name);
    // Ante respuesta perdida, comprobar si el registro realmente se completó.
    let existing;
    try {
      existing = resultado(await cliente.from('cms_media').select('id').eq('id', pendingMedia.id).maybeSingle());
    } catch (verificationError) {
      console.error('Verificación de archivo:', verificationError.code || verificationError.name);
      renderEditor();
      throw new Error('El archivo se subió, pero no pudimos verificar su registro. Conservamos la información en esta pestaña: revisá tu conexión y usá «Reintentar registro» antes de salir.');
    }
    if (existing) { pendingMedia = null; return; }
    renderEditor();
    throw new Error('El archivo se subió, pero no se pudo registrar en la biblioteca. No lo vuelvas a subir: usá «Reintentar registro» antes de salir.');
  }
}
async function renderHistorial(append = false) {
  const pageSlug = slug;
  let list = $('#admin-history-list');
  if (!append) {
    body.append(element('p', 'Restaurar genera un nuevo borrador; no cambia la versión pública. Revisá la vista previa y publicá si querés hacer efectiva la restauración.', 'admin-ayuda'));
    list = element('ul', '', 'admin-history-list'); list.id = 'admin-history-list'; body.append(list);
  }
  const rows = resultado(await cliente.from('cms_revisions')
    .select('id,version,action,created_at,created_by').eq('slug', slug)
    .order('id', { ascending: false }).range(historyOffset, historyOffset + 19));
  if (selection !== 'history' || slug !== pageSlug || !list.isConnected) return;
  historyOffset += rows.length;
  $('#admin-history-more')?.remove();
  if (!rows.length && !append) list.append(element('li', 'Todavía no hay versiones guardadas.'));
  for (const row of rows) {
    const item = element('li');
    item.append(element('strong', `Versión ${row.version} · ${{ save: 'Borrador', publish: 'Publicación', restore: 'Restauración' }[row.action]}`),
      element('p', `${new Date(row.created_at).toLocaleString('es-AR')} · Autor: ${row.created_by || 'Cuenta eliminada'}`));
    item.append(boton('Restaurar como borrador', () => operacion(async () => {
      if (!await confirmar('¿Restaurar esta versión como borrador? Los cambios locales sin guardar se perderán. La página pública no se modifica.')) return;
      const page = resultado(await cliente.rpc('cms_restore', { page_slug: slug, revision_id: row.id, expected_version: version }));
      actualizarPagina(page);
      aviso('Versión restaurada en un nuevo borrador. Revisá antes de publicar.');
    })));
    list.append(item);
  }
  if (rows.length === 20) {
    const more = boton('Cargar más versiones', () => operacion(() => renderHistorial(true)));
    more.id = 'admin-history-more'; body.append(more);
  }
}

function actualizarPagina(page) {
  const draft = structuredClone(page.draft);
  validarDocumento(draft);
  content = draft;
  version = page.version;
  dirty = false;
  selection = 'ajustes';
  mediaTarget = null;
  renderEditor();
  actualizarPreview();
}

function exportarRespaldo() {
  if (!content) throw new Error('Todavía no hay contenido para respaldar.');
  const backup = createCmsBackup(slug, content, {
    draftVersion: version,
    publishedVersion: publicado?.version ?? null
  });
  const blob = new Blob([`${JSON.stringify(backup, null, 2)}\n`], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const link = element('a');
  link.href = href;
  link.download = backupFilename(slug, backup.exported_at);
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
  aviso(`Respaldo descargado para ${PAGINAS[slug]}. Conservá también las copias de seguridad del proyecto en Supabase y Netlify.`);
}

async function importarRespaldo(file) {
  const backup = parseCmsBackup(await file.text());
  if (dirty && !await confirmar('¿Cargar un respaldo y descartar los cambios locales sin guardar?')) return;
  if (backup.slug !== slug) {
    if (!await confirmar(`El respaldo corresponde a ${backup.page}. ¿Querés cambiar de página e importar ese contenido como borrador local?`)) return;
    await cambiarPagina(backup.slug);
  }
  content = structuredClone(backup.document);
  selection = 'ajustes';
  dirty = true;
  renderEditor();
  actualizarPreview();
  aviso(`Respaldo cargado para ${backup.page}. Revisá la vista previa y guardá el borrador para enviarlo al servidor.`);
}

async function cargarPagina() {
  const page = resultado(await cliente.from('cms_pages').select('*').eq('slug', slug).maybeSingle());
  publicado = resultado(await cliente.from('cms_published').select('version,published_at').eq('slug', slug).maybeSingle());
  actualizarPagina(page || { draft: catalogo[slug].defaults, version: 0 });
}
function actualizarPreview() {
  try {
    validarDocumento(content);
    previewContent = structuredClone(content);
    previewSlug = slug;
    $('#admin-public-link').href = ARCHIVOS[slug];
    frame.src = `${ARCHIVOS[slug]}?preview=1&revision=${Date.now()}`;
  } catch (error) { informarError(error); }
}
window.addEventListener('message', (event) => {
  if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
  if (event.data?.type === 'cms:ready' && event.data.slug === previewSlug) {
    frame.contentWindow.postMessage({ type: 'cms:preview', content: previewContent }, location.origin);
  }
  if (event.data?.type === 'cms:error') aviso(`La vista previa no pudo mostrar el borrador: ${event.data.message}`, true);
});
$('#admin-preview-update').addEventListener('click', actualizarPreview);
$('#admin-preview-width').addEventListener('change', (event) => { frame.style.width = event.target.value; });
$('#admin-editor-form').addEventListener('submit', (event) => event.preventDefault());
document.querySelectorAll('[data-panel]').forEach((node) => node.addEventListener('click', () => {
  selection = node.dataset.panel; renderEditor();
}));
$('#admin-agregar').addEventListener('click', () => {
  const block = nuevoBloque($('#admin-tipo-bloque').value);
  content.blocks.push(block); selection = block.id; cambio(); renderEditor();
});
$('#admin-guardar').addEventListener('click', () => operacion(async () => {
  validarDocumento(content);
  const page = resultado(await cliente.rpc('cms_save_draft', { page_slug: slug, document: content, expected_version: version }));
  actualizarPagina(page);
  aviso('Borrador guardado en el servidor. El sitio público todavía no cambió.');
}));
$('#admin-publicar').addEventListener('click', () => operacion(async () => {
  if (dirty) throw new Error('Guardá el borrador antes de publicar.');
  if (!await confirmar(`¿Publicar ${PAGINAS[slug]}? Todas las personas verán este contenido al volver a cargar la página.`)) return;
  const page = resultado(await cliente.rpc('cms_publish', { page_slug: slug, expected_version: version }));
  publicado = { version: page.version };
  actualizarPagina(page);
  aviso('Página publicada. Abrí la versión pública para verificar el resultado.');
}));
$('#admin-recargar').addEventListener('click', () => operacion(async () => {
  if (dirty && !await confirmar('¿Descartar cambios locales y cargar el borrador del servidor?')) return;
  await cargarPagina(); aviso('Borrador recargado.');
}));
$('#admin-exportar').addEventListener('click', () => operacion(async () => {
  exportarRespaldo();
}));
$('#admin-importar').addEventListener('click', () => {
  $('#admin-backup-file').click();
});
$('#admin-backup-file').addEventListener('change', (event) => operacion(async () => {
  const [file] = event.target.files;
  event.target.value = '';
  if (!file) return;
  await importarRespaldo(file);
}));
$('#admin-pagina-selector').addEventListener('change', (event) => operacion(async () => {
  const next = event.target.value;
  event.target.value = slug;
  if (dirty && !await confirmar('¿Cambiar de página y descartar los cambios sin guardar?')) return;
  await cambiarPagina(next);
}));
window.addEventListener('beforeunload', (event) => {
  if (dirty || pendingMedia) { event.preventDefault(); event.returnValue = ''; }
});
document.querySelectorAll('a:not([target])').forEach((link) => link.addEventListener('click', async (event) => {
  if ((!dirty && !pendingMedia) || link.getAttribute('href').startsWith('#')) return;
  event.preventDefault();
  if (await confirmar('¿Salir del editor? Los cambios sin guardar se perderán.')) {
    dirty = false; location.href = link.href;
  }
}));

async function autorizar() {
  const { user } = resultado(await cliente.auth.getUser());
  const profile = resultado(await cliente.from('profiles').select('role,full_name').eq('id', user.id).single());
  if (profile.role !== 'administrador') throw new Error('Tu cuenta no tiene permisos de administración. Contactá a la institución.');
  $('#admin-identidad').textContent = profile.full_name;
}
async function iniciar() {
  if (!configurado()) {
    $('#admin-gate-texto').textContent = 'El backend todavía no está conectado. Configurá Supabase y ejecutá las migraciones siguiendo la guía docs/ADMINISTRACION.md. No se guardan ni publican cambios sin conexión.';
    return;
  }
  try {
    cliente = await obtenerCliente();
    await autorizar();
    const response = await fetch('assets/cms/catalogo.json');
    if (!response.ok) throw new Error('No se pudo cargar el catálogo editorial.');
    catalogo = await response.json();
    await cargarPagina();
    gate.hidden = true; workspace.hidden = false;
    cliente.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        workspace.hidden = true; gate.hidden = false;
        content = null; dirty = false; mediaTarget = null; previewContent = null;
        body.replaceChildren(); $('#admin-bloques').replaceChildren(); frame.src = 'about:blank';
        $('#admin-gate-texto').textContent = 'La sesión se cerró. Iniciá sesión para continuar. Los cambios locales no se publicaron.';
      } else if (event === 'SIGNED_IN') {
        setTimeout(() => operacion(async () => {
          await autorizar(); await cargarPagina(); gate.hidden = true; workspace.hidden = false;
        }), 0);
      } else if (event === 'TOKEN_REFRESHED') {
        setTimeout(() => autorizar().catch((error) => {
          workspace.hidden = true; gate.hidden = false; $('#admin-gate-texto').textContent = mensajeError(error);
        }), 0);
      }
    });
  } catch (error) {
    $('#admin-gate-texto').textContent = error.code === 'session_not_found' || error.name === 'AuthSessionMissingError'
      ? 'Iniciá sesión con tu cuenta institucional de administrador/a para continuar.' : mensajeError(error);
  }
}
iniciar();
