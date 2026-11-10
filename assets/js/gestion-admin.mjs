import { obtenerCliente, resultado } from './supabase-cliente.mjs';
import { POST_COLUMNS, POST_KINDS, CONTACT_STATES, searchPattern, validatePost } from './gestion-modelo.mjs';

const $ = (id) => document.getElementById(id);
const editor = $('post-editor');
let client;
let admins = [];
let role = 'comunidad';
let currentUserId = '';
let activePost;
let newPostId;
let dirty = false;
let busy = false;
let revision = 0;
async function sessionRequest(request) {
  const generation = revision;
  const response = await request;
  if (generation !== revision) throw new DOMException('Session changed', 'AbortError');
  return response;
}
const offsets = { contact: 0, post: 0 };
function node(tag, text, className) {
  const item = document.createElement(tag);
  if (text) item.textContent = text;
  if (className) item.className = className;
  return item;
}
function status(text, error = false) {
  const target = $('gestion-status');
  target.textContent = text;
  target.dataset.error = String(error);
  target.focus();
}
function errorMessage(error) {
  if (error.code === '40001') return 'Otra sesión modificó el registro. Conservá tus cambios y volvé a cargarlo antes de guardar.';
  if (['42P01', 'PGRST205', 'PGRST202'].includes(error.code)) return 'La gestión todavía no está activada. Falta aplicar la migración aprobada en Supabase.';
  return 'No se pudo completar la operación. Revisá tu sesión, los datos y la conexión antes de reintentar.';
}
async function operation(action) {
  if (busy) return;
  busy = true;
  $('gestion-workspace').inert = true;
  $('gestion-workspace').querySelectorAll('button').forEach(e => { e.disabled = true; });
  try { await action(); } catch (error) {
    if (error.name === 'AbortError') return;
    console.error('Gestión institucional:', error.code || error.name);
    status(errorMessage(error), true);
  } finally {
    busy = false;
    $('gestion-workspace').inert = false;
    $('gestion-workspace').querySelectorAll('button').forEach(e => { e.disabled = false; });
    for (const type of ['contact', 'post']) {
      $(`${type}-prev`).disabled = offsets[type] === 0;
      $(`${type}-next`).disabled = $(`${type}-next`).dataset.more !== 'true';
    }
  }
}
function button(text, action) {
  const item = node('button', text);
  item.type = 'button';
  item.addEventListener('click', () => operation(action));
  return item;
}
function choose(label, options, value) {
  const wrapper = node('label', label);
  const input = node('select');
  for (const [key, text] of Object.entries(options)) {
    const option = node('option', text); option.value = key; input.append(option);
  }
  input.value = value;
  wrapper.append(input);
  return { wrapper, input };
}
async function contactDetail(request) {
  const target = $('contact-detail');
  target.replaceChildren();
  const card = node('article', '', 'gestion-card');
  card.append(node('h3', request.subject), node('p', `Consulta ${request.id}`),
    node('p', `${request.name} · ${request.email}`),
    node('p', `${request.category} · ${request.career || 'Sin carrera'} · ${new Date(request.created_at).toLocaleString('es-AR')}`),
    node('p', request.message, 'gestion-text'));
  const state = choose('Estado', CONTACT_STATES, request.status);
  const assignee = choose('Responsable', Object.fromEntries([['', 'Sin asignar'], ...admins.map(a => [a.id, a.full_name])]), request.assigned_to || '');
  const label = node('label', 'Nota interna (no se envía por correo)');
  const note = node('textarea'); note.maxLength = 2000; label.append(note);
  let noteDirty = false;
  note.addEventListener('input', () => { noteDirty = true; });
  card.append(state.wrapper, assignee.wrapper, label,
    button('Guardar estado y nota', async () => {
      const updated = resultado(await sessionRequest(client.rpc('contact_manage', {
        request_id: request.id, expected_version: request.version, next_status: state.input.value,
        assignee: assignee.input.value || null, internal_note: note.value
      })));
      noteDirty = false;
      await contactDetail(updated);
      await loadContacts();
      status('Consulta actualizada. No se envió una respuesta por correo.');
    }),
    button('Eliminar consulta y sus notas', async () => {
      if (!confirm('¿Eliminar definitivamente esta consulta y su historial? No puede deshacerse.')) return;
      resultado(await sessionRequest(client.rpc('contact_delete', { request_id: request.id, expected_version: request.version })));
      target.replaceChildren(); await loadContacts(); status('Consulta eliminada.');
    }));
  target.append(card);
  target.dataset.dirty = 'false';
  card.addEventListener('change', () => { target.dataset.dirty = 'true'; });
  note.addEventListener('input', () => { target.dataset.dirty = String(noteDirty); });
  const history = resultado(await sessionRequest(client.from('contact_history').select('id,created_at,status,note').abortSignal(AbortSignal.timeout(12000))
    .eq('request_id', request.id).order('id', { ascending: false }).limit(50)));
  card.append(node('h4', 'Últimos 50 cambios'));
  history.forEach(entry => card.append(node('p', `${new Date(entry.created_at).toLocaleString('es-AR')} · ${CONTACT_STATES[entry.status]} · ${entry.note}`, 'gestion-text')));

  const thread = resultado(await sessionRequest(client.rpc('contact_thread', { target_request: request.id })));
  card.append(node('h4', 'Hilo de la consulta'));
  if (!thread.length) card.append(node('p', 'No hay mensajes.'));
  for (const message of thread) {
    const item = node('div', '', `gestion-mensaje ${message.direction}`);
    item.append(node('p', message.direction === 'inbound' ? 'Consulta recibida' : 'Respuesta institucional', 'gestion-meta'),
      node('p', message.body, 'gestion-text'),
      node('p', new Date(message.created_at).toLocaleString('es-AR'), 'gestion-meta'));
    card.append(item);
  }
  const reply = node('div', '', 'gestion-respuesta');
  reply.append(node('h4', 'Responder por correo'));
  const subject = node('input');
  subject.type = 'text'; subject.maxLength = 200; subject.value = request.subject.startsWith('Re:') ? request.subject : `Re: ${request.subject}`;
  const subjectLabel = node('label', 'Asunto'); subjectLabel.append(subject);
  const body = node('textarea'); body.rows = 7; body.maxLength = 10000;
  const bodyLabel = node('label', 'Mensaje'); bodyLabel.append(body);
  reply.append(subjectLabel, bodyLabel, button('Enviar respuesta y guardar en el hilo', async () => {
    if (body.value.trim().length < 10) { status('Escribí una respuesta de al menos 10 caracteres.', true); return; }
    if (!confirm('¿Enviar esta respuesta al correo de la persona consultante? Quedará registrada en el hilo y en la cola de correo.')) return;
    const result = resultado(await sessionRequest(client.rpc('contact_reply', {
      p_request_id: request.id, p_expected_version: request.version,
      p_subject: subject.value.trim(), p_body: body.value.trim(), p_request_key: crypto.randomUUID()
    })));
    const updated = result.request;
    await contactDetail(updated);
    await loadContacts();
    status('Respuesta guardada en el hilo y encolada para envío. Revisá Correo y cola.');
  }));
  card.append(reply);
}
async function loadContacts() {
  const filter = new FormData($('contact-filter'));
  let query = client.from('contact_requests').select('*', { count: 'exact' })
    .abortSignal(AbortSignal.timeout(12000))
    .order('created_at', { ascending: false }).order('id');
  if (filter.get('status')) query = query.eq('status', filter.get('status'));
  if (filter.get('search').trim()) query = query.ilike('subject', searchPattern(filter.get('search')));
  const response = await sessionRequest(query.range(offsets.contact, offsets.contact + 24));
  const rows = resultado(response);
  if (!Number.isInteger(response.count)) throw new Error('Missing contact count');
  $('contact-list').replaceChildren();
  $('contact-count').textContent = `${response.count} consultas · página ${offsets.contact / 25 + 1}`;
  rows.forEach(request => {
    const card = node('article', '', 'gestion-card');
    card.append(node('h3', request.subject), node('p', `${CONTACT_STATES[request.status]} · ${new Date(request.created_at).toLocaleDateString('es-AR')}`),
      button('Abrir consulta', async () => {
        if ($('contact-detail').dataset.dirty === 'true' && !confirm('¿Descartar la nota y cambios sin guardar?')) return;
        const latest = resultado(await sessionRequest(client.from('contact_requests').select('*').eq('id', request.id).single().abortSignal(AbortSignal.timeout(12000))));
        await contactDetail(latest);
      }));
    $('contact-list').append(card);
  });
  if (!rows.length) $('contact-list').append(node('p', 'No hay consultas para este filtro.'));
  $('contact-next').dataset.more = String(offsets.contact + rows.length < response.count);
}
function editPost(post) {
  activePost = post;
  newPostId = post?.id || crypto.randomUUID();
  editor.reset();
  for (const field of ['kind', 'title', 'body', 'career', 'audience', 'attachment_url', 'attachment_label']) {
    if (post) editor.elements.namedItem(field).value = post[field];
  }
  for (const field of ['published_at', 'expires_at']) {
    if (post?.[field]) {
      const date = new Date(post[field]);
      editor.elements.namedItem(field).value = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }
  }
  $('post-editor-title').textContent = post ? `Editar · versión ${post.version}` : 'Nueva publicación';
  dirty = false;
  $('post-history').replaceChildren();
}
async function postHistory(post) {
  if (!post) return;
  const rows = resultado(await sessionRequest(client.from('institutional_post_history').select('id,created_at,document').abortSignal(AbortSignal.timeout(12000))
    .eq('post_id', post.id).order('id', { ascending: false }).limit(10)));
  const history = $('post-history');
  history.append(node('h4', 'Últimas 10 revisiones'));
  for (const entry of rows) {
    const details = node('details');
    details.append(node('summary', `v${entry.document.version} · ${new Date(entry.created_at).toLocaleString('es-AR')}`),
      node('p', entry.document.title), node('p', entry.document.body, 'gestion-text'));
    history.append(details);
  }
}
async function loadPosts() {
  const filter = new FormData($('post-filter'));
  let query = client.from('institutional_posts').select(POST_COLUMNS, { count: 'exact' })
    .abortSignal(AbortSignal.timeout(12000))
    .order('updated_at', { ascending: false }).order('id');
  if (filter.get('kind')) query = query.eq('kind', filter.get('kind'));
  if (filter.get('search').trim()) query = query.ilike('title', searchPattern(filter.get('search')));
  const response = await sessionRequest(query.range(offsets.post, offsets.post + 24));
  const rows = resultado(response);
  if (!Number.isInteger(response.count)) throw new Error('Missing post count');
  $('post-list').replaceChildren();
  rows.forEach(post => {
    const card = node('article', '', 'gestion-card');
    const state = !post.published_at ? 'Borrador' : new Date(post.published_at) > new Date() ? 'Programada'
      : post.expires_at && new Date(post.expires_at) <= new Date() ? 'Vencida' : 'Publicada';
    card.append(node('h3', post.title), node('p', `${POST_KINDS[post.kind]} · ${state} · v${post.version}`),
      button('Editar publicación', async () => {
        if (dirty && !confirm('¿Descartar los cambios de la publicación sin guardar?')) return;
        editPost(post);
        await postHistory(post);
      }));
    $('post-list').append(card);
  });
  if (!rows.length) $('post-list').append(node('p', 'No hay publicaciones para este filtro.'));
  $('post-next').dataset.more = String(offsets.post + rows.length < response.count);
}
editor.addEventListener('input', () => { dirty = true; });
editor.addEventListener('submit', event => {
  event.preventDefault();
  if (!editor.reportValidity()) return;
  operation(async () => {
    const data = Object.fromEntries(new FormData(editor));
    for (const field of ['published_at', 'expires_at']) data[field] = data[field] ? new Date(data[field]).toISOString() : null;
    try { validatePost(data); } catch (error) { status(error.message, true); return; }
    if (data.published_at && !confirm('¿Guardar esta publicación con fecha pública? Revisá contenido y autorizaciones.')) return;
    const saved = resultado(await sessionRequest(client.rpc('institutional_post_save', {
      post_id: activePost?.id || newPostId, expected_version: activePost?.version || 0, document: data
    })));
    editPost(saved); await postHistory(saved); await loadPosts(); status('Publicación guardada. Revisá el resultado en la página pública.');
  });
});
$('post-new').addEventListener('click', () => {
  if (!busy && (!dirty || confirm('¿Descartar la publicación sin guardar?'))) editPost(null);
});
$('document-upload').addEventListener('click', () => operation(async () => {
  const file = $('document-file').files[0];
  if (!file || file.type !== 'application/pdf' || file.size > 10 * 1024 * 1024 || file.size === 0 ||
    new TextDecoder().decode(await file.slice(0, 5).arrayBuffer()) !== '%PDF-') {
    status('Seleccioná un PDF válido de hasta 10 MB.', true); return;
  }
  if (!confirm('El PDF quedará disponible públicamente por su URL. ¿Confirmás que no contiene datos sensibles y está autorizado?')) return;
  const name = `${crypto.randomUUID()}.pdf`;
  resultado(await sessionRequest(client.storage.from('institutional-documents').upload(name, file, { contentType: 'application/pdf', upsert: false })));
  editor.elements.namedItem('attachment_url').value = client.storage.from('institutional-documents').getPublicUrl(name).data.publicUrl;
  editor.elements.namedItem('attachment_label').value = file.name.slice(0, 200);
  dirty = true;
  status('PDF subido. Su URL ya es pública; guardá la publicación para incorporarlo al catálogo.');
}));
for (const type of ['contact', 'post']) {
  const load = type === 'contact' ? loadContacts : loadPosts;
  $(`${type}-filter`).addEventListener('submit', event => { event.preventDefault(); operation(async () => { offsets[type] = 0; await load(); }); });
  for (const [suffix, delta] of [['prev', -25], ['next', 25]]) {
    $(`${type}-${suffix}`).addEventListener('click', () => operation(async () => {
      const previous = offsets[type];
      offsets[type] = Math.max(0, previous + delta);
      try { await load(); } catch (error) { offsets[type] = previous; throw error; }
    }));
  }
}
window.addEventListener('beforeunload', event => {
  if (dirty || $('contact-detail').dataset.dirty === 'true') { event.preventDefault(); event.returnValue = ''; }
});
$('team-refresh').addEventListener('click', () => operation(loadTeam));
$('email-refresh').addEventListener('click', () => operation(loadEmail));
$('metrics-filter').addEventListener('submit', (event) => {
  event.preventDefault();
  operation(loadMetrics);
});

const CALENDAR_TYPES = {
  feriado: 'Feriado', local: 'Asueto local', docente: 'Jornada docente',
  turistico: 'Puente turístico', efemeride: 'Efeméride', tecnica: 'Formación técnica'
};
let calendarEditing = null;
function editCalendar(event = null) {
  calendarEditing = event;
  const form = $('calendar-editor');
  form.reset();
  $('calendar-id').value = event?.id || crypto.randomUUID();
  $('calendar-version').value = String(event?.version || 0);
  $('calendar-date').value = event?.event_date || new Date().toISOString().slice(0, 10);
  $('calendar-title').value = event?.title || '';
  $('calendar-type').value = event?.type || 'tecnica';
  $('calendar-description').value = event?.description || '';
  $('calendar-source').value = event?.source || '';
  $('calendar-responsible').value = event?.responsible || '';
  $('calendar-published').checked = Boolean(event?.published);
  $('calendar-delete').hidden = !event;
  $('calendar-editor-title').textContent = event ? `Editar evento · v${event.version}` : 'Nuevo evento';
  $('calendar-editor-status').textContent = event?.updated_at
    ? `Actualizado: ${new Date(event.updated_at).toLocaleString('es-AR')}` : 'Sin guardar.';
}
async function loadCalendar() {
  const target = $('calendar-list');
  target.replaceChildren(node('p', 'Cargando calendario…'));
  const rows = resultado(await sessionRequest(client.from('calendar_events')
    .select('*').order('event_date', { ascending: true }))) || [];
  target.replaceChildren();
  if (!rows.length) target.append(node('p', 'No hay eventos cargados.'));
  for (const event of rows) {
    const card = node('article', '', 'gestion-card');
    card.append(
      node('h3', event.title),
      node('p', `${event.event_date} · ${CALENDAR_TYPES[event.type] || event.type} · ${event.published ? 'Publicado' : 'Borrador'} · v${event.version}`, 'gestion-meta'),
      node('p', [event.source && `Fuente: ${event.source}`, event.responsible && `Responsable: ${event.responsible}`].filter(Boolean).join(' · ') || 'Sin fuente ni responsable registrados.', 'gestion-meta'),
      node('p', `Actualizado: ${new Date(event.updated_at).toLocaleString('es-AR')}`, 'gestion-meta'),
      button('Editar evento', () => editCalendar(event))
    );
    target.append(card);
  }
  $('calendar-status').textContent = `${rows.length} eventos cargados. Los borradores no aparecen en el sitio público.`;
}
$('calendar-new').addEventListener('click', () => editCalendar(null));
$('calendar-refresh').addEventListener('click', () => operation(loadCalendar));
$('calendar-editor').addEventListener('submit', (event) => {
  event.preventDefault();
  operation(async () => {
    const form = $('calendar-editor');
    if (!form.reportValidity()) return;
    const document = {
      event_date: $('calendar-date').value,
      title: $('calendar-title').value.trim(),
      type: $('calendar-type').value,
      description: $('calendar-description').value.trim(),
      source: $('calendar-source').value.trim(),
      responsible: $('calendar-responsible').value.trim(),
      published: $('calendar-published').checked
    };
    if (document.title.length < 3) { status('Ingresá un título de al menos 3 caracteres.', true); return; }
    if (document.published && (!document.source.trim() || !document.responsible.trim())) {
      status('Para publicar, indicá fuente oficial y responsable.', true); return;
    }
    const saved = resultado(await sessionRequest(client.rpc('calendar_event_save', {
      event_id: $('calendar-id').value,
      expected_version: Number($('calendar-version').value) || 0,
      document
    })));
    editCalendar(saved);
    await loadCalendar();
    status('Evento guardado. Si está publicado, ya aparece en el calendario público y en el buscador.');
  });
});
$('calendar-delete').addEventListener('click', () => operation(async () => {
  if (!calendarEditing) return;
  if (!confirm(`¿Eliminar definitivamente “${calendarEditing.title}”? Esta acción no se puede deshacer.`)) return;
  resultado(await sessionRequest(client.rpc('calendar_event_delete', {
    event_id: calendarEditing.id, expected_version: calendarEditing.version
  })));
  editCalendar(null);
  await loadCalendar();
  status('Evento eliminado.');
}));

const ROLE_LABELS = {
  comunidad: 'Comunidad', alumno: 'Alumno/a', profesor: 'Profesor/a',
  editor: 'Editor/a', revisor: 'Revisor/a', administrador: 'Administrador/a'
};
function tarjetaMetrica(titulo, valor, detalle = '') {
  const card = node('article', '', 'gestion-card');
  card.append(node('p', titulo, 'gestion-meta'), node('strong', String(valor)), detalle ? node('p', detalle, 'gestion-meta') : '');
  return card;
}
function listaMetrica(titulo, filas, etiqueta = (fila) => fila.target) {
  const card = node('article', '', 'gestion-card');
  card.append(node('h3', titulo));
  if (!filas.length) { card.append(node('p', 'Sin datos en el período.')); return card; }
  const lista = node('ul');
  for (const fila of filas.slice(0, 12)) {
    const item = node('li', `${etiqueta(fila)} · ${Number(fila.total).toLocaleString('es-AR')}`);
    item.className = 'gestion-metrica-fila';
    lista.append(item);
  }
  card.append(lista);
  return card;
}
async function loadTeam() {
  const target = $('team-list');
  const estado = $('team-status');
  target.replaceChildren(node('p', 'Cargando equipo…'));
  const rows = resultado(await sessionRequest(client.from('profiles')
    .select('id,full_name,role').order('full_name'))) || [];
  target.replaceChildren();
  if (!rows.length) target.append(node('p', 'No hay perfiles para mostrar.'));
  for (const profile of rows) {
    const fila = node('div', '', 'gestion-equipo-fila');
    fila.append(node('strong', profile.full_name || 'Cuenta sin nombre'));
    const selector = choose('Rol', ROLE_LABELS, profile.role);
    selector.input.disabled = profile.id === currentUserId;
    fila.append(selector.wrapper);
    fila.append(button('Guardar rol', async () => {
      const nuevo = selector.input.value;
      const nota = $('team-note').value.trim();
      if (nuevo === profile.role) { estado.textContent = 'El rol no cambió.'; return; }
      if (!confirm(`¿Cambiar el rol de ${profile.full_name || 'esta cuenta'} a ${ROLE_LABELS[nuevo]}?`)) return;
      resultado(await sessionRequest(client.rpc('profile_role_set', {
        target_id: profile.id, new_role: nuevo, note: nota
      })));
      $('team-note').value = '';
      await loadTeam();
      estado.textContent = 'Rol actualizado y registrado en el historial.';
    }));
    target.append(fila);
  }
  const history = resultado(await sessionRequest(client.from('profile_role_history')
    .select('id,previous_role,new_role,note,created_at').order('id', { ascending: false }).limit(10))) || [];
  const card = node('div', '', 'gestion-historial');
  card.append(node('h3', 'Últimos cambios de rol'));
  if (!history.length) card.append(node('p', 'Todavía no hay cambios registrados.'));
  for (const entry of history) {
    card.append(node('p', `${new Date(entry.created_at).toLocaleString('es-AR')} · ${ROLE_LABELS[entry.previous_role] || entry.previous_role} → ${ROLE_LABELS[entry.new_role] || entry.new_role}${entry.note ? ` · ${entry.note}` : ''}`, 'gestion-text'));
  }
  target.append(card);
}
async function loadEmail() {
  const resumen = $('email-summary');
  const lista = $('email-list');
  const estado = $('email-status');
  resumen.replaceChildren(node('p', 'Consultando cola…'));
  const data = resultado(await sessionRequest(client.rpc('email_admin_summary'))) || {};
  resumen.replaceChildren(
    tarjetaMetrica('Pendientes', data.pending, 'En espera de envío o reintento'),
    tarjetaMetrica('En proceso', data.sending, 'Reclamados por el procesador'),
    tarjetaMetrica('Enviados', data.sent, 'Confirmados por el proveedor'),
    tarjetaMetrica('Fallidos', data.failed, 'Requieren revisión'),
    tarjetaMetrica('Cancelados', data.cancelled, 'Bajas voluntarias'),
    tarjetaMetrica('Destinatarios activos', data.recipients, 'Equipo con avisos habilitados')
  );
  lista.replaceChildren();
  if (!Array.isArray(data.recent) || !data.recent.length) {
    lista.append(node('p', 'La cola está vacía.'));
    estado.textContent = 'Cola consultada.';
    return;
  }
  for (const item of data.recent) {
    const card = node('article', '', 'gestion-card');
    card.append(node('h3', `${item.kind === 'contact_receipt' ? 'Comprobante' : 'Aviso de consulta'} · ${item.status}`),
      node('p', `Destinatario: ${item.recipient}`),
      node('p', `Intentos: ${item.attempts} · ${new Date(item.created_at).toLocaleString('es-AR')}`, 'gestion-meta'));
    if (item.last_error) card.append(node('p', `Último error: ${item.last_error}`, 'gestion-text'));
    if (['failed', 'cancelled'].includes(item.status)) {
      card.append(button('Reintentar envío', async () => {
        if (!confirm('¿Volver a encolar este correo? Se reinician los intentos.')) return;
        resultado(await sessionRequest(client.rpc('email_retry', { item_id: item.id })));
        await loadEmail();
        estado.textContent = 'Correo reencolado para el próximo procesamiento.';
      }));
    }
    lista.append(card);
  }
  estado.textContent = 'Cola consultada.';
}
async function loadMetrics() {
  const days = Number($('metrics-filter').elements.namedItem('days').value) || 30;
  const estado = $('metrics-status');
  const resumen = $('metrics-summary');
  const tablas = $('metrics-tables');
  resumen.replaceChildren(node('p', 'Consultando métricas…'));
  const rows = resultado(await sessionRequest(client.rpc('metrics_summary', { p_days: days }))) || [];
  const total = (metric) => rows.filter((row) => row.metric === metric)
    .reduce((sum, row) => sum + Number(row.total), 0);
  resumen.replaceChildren(
    tarjetaMetrica('Páginas vistas', total('page_view').toLocaleString('es-AR'), `Últimos ${days} días`),
    tarjetaMetrica('Publicaciones abiertas', total('post_view').toLocaleString('es-AR'), 'Aperturas desde el catálogo'),
    tarjetaMetrica('Búsquedas usadas', total('search_used').toLocaleString('es-AR'), 'Sin guardar el texto buscado')
  );
  tablas.replaceChildren();
  const paginas = rows.filter((row) => row.metric === 'page_view').sort((a, b) => Number(b.total) - Number(a.total));
  const publicaciones = rows.filter((row) => row.metric === 'post_view').sort((a, b) => Number(b.total) - Number(a.total));
  const busquedas = rows.filter((row) => row.metric === 'search_used').sort((a, b) => Number(b.total) - Number(a.total));
  const ids = publicaciones.map((row) => row.target).filter((id) => /^[a-f0-9-]{36}$/i.test(id));
  const titulos = new Map();
  if (ids.length) {
    const posts = resultado(await sessionRequest(client.from('institutional_posts')
      .select('id,title').in('id', ids))) || [];
    for (const post of posts) titulos.set(post.id, post.title);
  }
  const etiquetaPagina = (row) => row.target.replaceAll('-', ' ');
  tablas.append(
    listaMetrica('Páginas más visitadas', paginas, etiquetaPagina),
    listaMetrica('Publicaciones más abiertas', publicaciones, (row) => titulos.get(row.target) || row.target),
    listaMetrica('Búsquedas por tipo', busquedas, (row) => {
      const tipo = row.target ? (row.target.charAt(0).toUpperCase() + row.target.slice(1)) : 'Todos los tipos';
      const carrera = row.career ? ` · ${row.career}` : '';
      return `${tipo}${carrera}`;
    })
  );
  estado.textContent = `Métricas agregadas de los últimos ${days} días. No se guardaron datos personales ni términos de búsqueda.`;
}
async function authorize() {
  const { user } = resultado(await sessionRequest(client.auth.getUser()));
  const profile = resultado(await sessionRequest(client.from('profiles').select('role').eq('id', user.id).single()));
  if (!['administrador', 'editor', 'revisor'].includes(profile.role)) throw new Error('Editorial team permission required');
  role = profile.role;
  currentUserId = user.id;
  return profile.role;
}
async function start() {
  try {
    client = await obtenerCliente();
    client.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') {
        revision++;
        $('gestion-workspace').hidden = true;
        for (const id of ['contact-list', 'contact-detail', 'post-list', 'post-history', 'calendar-list', 'team-list', 'email-list', 'email-summary', 'metrics-summary', 'metrics-tables']) $(id)?.replaceChildren();
        $('contact-detail').dataset.dirty = 'false';
        editor.reset(); activePost = null; dirty = false; admins = []; role = 'comunidad'; currentUserId = '';
        status('Sesión cerrada. Volvé a iniciar sesión desde Mi cuenta.');
      }
    });
    await authorize();
    const admin = role === 'administrador';
    document.querySelectorAll('[data-gestion="admin"]').forEach((section) => { section.hidden = !admin; });
    document.querySelectorAll('[data-gestion="team"]').forEach((section) => { section.hidden = false; });
    if (!admin) {
      for (const id of ['consultas', 'publicaciones', 'equipo', 'correo']) {
        document.querySelector(`nav[aria-label="Secciones de gestión"] a[href="#${id}"]`)?.setAttribute('hidden', '');
      }
    }
    if (admin) {
      editPost(null);
      admins = resultado(await sessionRequest(client.from('profiles').select('id,full_name').eq('role', 'administrador').order('full_name')));
    }
    $('gestion-workspace').hidden = false;
    await operation(async () => {
      if (admin) {
        await loadContacts();
        await loadPosts();
        await loadCalendar();
        await loadTeam();
        await loadEmail();
      }
      await loadMetrics();
      status(admin
        ? 'Gestión disponible para administración.'
        : `Sesión de ${ROLE_LABELS[role] || role}. Podés consultar métricas; la edición de páginas está en el editor.`);
    });
  } catch (error) {
    if (error.name === 'AbortError') return;
    console.error('Acceso a gestión:', error.code || error.name);
    status('Acceso restringido. Iniciá sesión con una cuenta del equipo editorial habilitada.', true);
  }
}
start();
