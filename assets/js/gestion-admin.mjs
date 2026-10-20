import { obtenerCliente, resultado } from './supabase-cliente.mjs';
import { POST_COLUMNS, POST_KINDS, CONTACT_STATES, searchPattern, validatePost } from './gestion-modelo.mjs';

const $ = (id) => document.getElementById(id);
const editor = $('post-editor');
let client;
let admins = [];
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
async function authorize() {
  const { user } = resultado(await sessionRequest(client.auth.getUser()));
  const profile = resultado(await sessionRequest(client.from('profiles').select('role').eq('id', user.id).single()));
  if (profile.role !== 'administrador') throw new Error('Administrator permission required');
}
async function start() {
  try {
    client = await obtenerCliente();
    client.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') {
        revision++;
        $('gestion-workspace').hidden = true;
        for (const id of ['contact-list', 'contact-detail', 'post-list', 'post-history']) $(id).replaceChildren();
        $('contact-detail').dataset.dirty = 'false';
        editor.reset(); activePost = null; dirty = false; admins = [];
        status('Sesión cerrada. Volvé a iniciar sesión desde Mi cuenta.');
      }
    });
    await authorize();
    editPost(null);
    admins = resultado(await sessionRequest(client.from('profiles').select('id,full_name').eq('role', 'administrador').order('full_name')));
    $('gestion-workspace').hidden = false;
    await operation(async () => { await loadContacts(); await loadPosts(); status('Gestión disponible para administración.'); });
  } catch (error) {
    if (error.name === 'AbortError') return;
    console.error('Acceso a gestión:', error.code || error.name);
    status('Acceso restringido. Iniciá sesión con una cuenta administrativa habilitada.', true);
  }
}
start();
