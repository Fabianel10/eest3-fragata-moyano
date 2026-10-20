import { obtenerCliente, resultado } from './supabase-cliente.mjs';
const $ = id => document.getElementById(id);
const links = new Set(['novedades.html', 'calendario.html', 'index.html#contacto', 'informatica.html', 'madera.html', 'obras.html', 'comunidad.html']);
let client;
let userId;
let admin = false;
let busy = false;
let revision = 0;
let cursor = null;
let pendingNotification;
async function sessionResult(request) {
  const generation = revision;
  const response = await request;
  if (generation !== revision) throw new DOMException('Session changed', 'AbortError');
  return resultado(response);
}
function node(tag, text) {
  const element = document.createElement(tag); if (text) element.textContent = text; return element;
}
function notice(text, error = false) {
  $('notifications-status').textContent = text; $('notifications-status').dataset.error = String(error);
}
async function action(work) {
  if (busy) return;
  busy = true; $('notifications-workspace').inert = true;
  try { await work(); } catch (error) {
    if (error.name === 'AbortError') return;
    console.error('Notificaciones:', error.code || error.name);
    notice(['42P01', 'PGRST202', 'PGRST205'].includes(error.code)
      ? 'El servicio de notificaciones todavía no está activado en la base de datos.'
      : 'No se pudo completar la operación. Verificá tu sesión y reintentá.', true);
  } finally { busy = false; $('notifications-workspace').inert = false; }
}
async function load(reset = true) {
  const generation = revision;
  const rows = await sessionResult(client.rpc('notifications_list', { before_id: reset ? null : cursor }).abortSignal(AbortSignal.timeout(12000)));
  if (generation !== revision) return;
  if (reset) $('notifications-list').replaceChildren();
  if (reset) cursor = null;
  for (const notification of rows) {
    if (!links.has(notification.link)) throw new Error('Invalid notification destination');
    const article = node('article'); article.className = 'gestion-card';
    const heading = node('h2', notification.title);
    const read = node('p', notification.read_at ? 'Leída' : 'Sin leer');
    article.append(heading, read, node('p', notification.body),
      node('p', `${notification.topic} · ${new Date(notification.published_at).toLocaleString('es-AR')}`));
    const link = node('a', 'Ver información'); link.href = notification.link; article.append(link);
    if (!notification.read_at) {
      const button = node('button', 'Marcar como leída'); button.type = 'button';
      button.addEventListener('click', () => action(async () => {
        const generation = revision;
        await sessionResult(client.rpc('notification_read', { target_id: notification.id }));
        if (generation !== revision) return;
        read.textContent = 'Leída'; button.remove(); notice('Lectura guardada.');
      }));
      article.append(button);
    }
    $('notifications-list').append(article);
    cursor = notification.id;
  }
  const count = $('notifications-list').children.length;
  $('notifications-summary').textContent = count
    ? `${count} avisos cargados. Los estados de lectura se muestran en cada aviso.`
    : 'No hay avisos vigentes para tus intereses, o desactivaste las notificaciones internas.';
  $('notifications-more').hidden = rows.length < 25;
}
async function loadAdmin() {
  const generation = revision;
  const rows = await sessionResult(client.from('institutional_notifications')
    .select('id,title,source_post,withdrawn,published_at').order('id', { ascending: false }).limit(25)
    .abortSignal(AbortSignal.timeout(12000)));
  if (generation !== revision) return;
  $('notifications-admin-list').replaceChildren();
  for (const notification of rows) {
    const article = node('article'); article.className = 'gestion-card';
    article.append(node('h4', notification.title), node('p', `${notification.withdrawn ? 'Retirada' : 'Programada/publicada'} · ${new Date(notification.published_at).toLocaleString('es-AR')}`));
    if (notification.source_post) article.append(node('p', 'Este aviso se gestiona desde su publicación en Gestión institucional.'));
    else if (!notification.withdrawn) {
      const button = node('button', 'Retirar aviso'); button.type = 'button';
      button.addEventListener('click', () => action(async () => {
        if (!confirm('¿Retirar este aviso del portal?')) return;
        await sessionResult(client.rpc('notification_withdraw', { target_id: notification.id }));
        await loadAdmin(); await load(); notice('Aviso retirado.');
      }));
      article.append(button);
    }
    $('notifications-admin-list').append(article);
  }
}
$('notifications-preferences').addEventListener('submit', event => {
  event.preventDefault();
  action(async () => {
    await sessionResult(client.from('notification_preferences').upsert({ user_id: userId, enabled: $('notifications-enabled').checked }).select('enabled').single());
    await load(); notice('Preferencia de notificaciones internas guardada.');
  });
});
$('notifications-refresh').addEventListener('click', () => action(async () => { await load(); if (admin) await loadAdmin(); notice('Avisos actualizados.'); }));
$('notifications-more').addEventListener('click', () => action(() => load(false)));
$('notifications-create').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.target;
  if (!form.reportValidity()) return;
  action(async () => {
    const document = Object.fromEntries(new FormData(form));
    for (const field of ['published_at', 'expires_at']) document[field] = document[field] ? new Date(document[field]).toISOString() : null;
    if (document.expires_at && Date.parse(document.expires_at) <= Date.parse(document.published_at || new Date().toISOString())) {
      notice('El vencimiento debe ser posterior a la publicación.', true); return;
    }
    const fingerprint = JSON.stringify(document);
    if (!pendingNotification || pendingNotification.fingerprint !== fingerprint) pendingNotification = { id: crypto.randomUUID(), fingerprint };
    document.request_id = pendingNotification.id;
    if (!confirm('¿Crear este aviso para las cuentas interesadas en el tema? No envía correo.')) return;
    await sessionResult(client.rpc('notification_create', { document }));
    pendingNotification = null;
    form.reset(); await loadAdmin(); await load(); notice('Aviso creado dentro del portal.');
  });
});
async function start() {
  try {
    client = await obtenerCliente();
    client.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') {
        revision++;
        userId = null; admin = false; cursor = null;
        pendingNotification = null;
        $('notifications-create').reset();
        $('notifications-workspace').hidden = true; $('notifications-admin').hidden = true;
        $('notifications-list').replaceChildren(); $('notifications-admin-list').replaceChildren();
        notice('Sesión cerrada. Volvé a ingresar desde Mi cuenta.');
      }
    });
    const generation = revision;
    const { user } = await sessionResult(client.auth.getUser());
    userId = user.id;
    const profile = await sessionResult(client.from('profiles').select('role').eq('id', userId).single());
    const preference = await sessionResult(client.from('notification_preferences').select('enabled').eq('user_id', userId).maybeSingle());
    if (generation !== revision) return;
    admin = profile.role === 'administrador';
    $('notifications-enabled').checked = preference?.enabled ?? true;
    $('notifications-workspace').hidden = false; $('notifications-admin').hidden = !admin;
    await action(async () => { await load(); if (admin) await loadAdmin(); notice('Avisos internos de tu comunidad.'); });
  } catch (error) {
    if (error.name === 'AbortError') return;
    console.error('Acceso a notificaciones:', error.code || error.name);
    notice(['42P01', 'PGRST205'].includes(error.code)
      ? 'Falta activar la migración de notificaciones.'
      : 'Iniciá sesión desde Mi cuenta para consultar tus avisos.', true);
  }
}
start();
