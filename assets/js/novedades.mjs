import { obtenerCliente, resultado } from './supabase-cliente.mjs';
import { POST_COLUMNS, POST_KINDS, CAREERS, searchPattern, safeAttachment } from './gestion-modelo.mjs';
const $ = id => document.getElementById(id);
let offset = 0;
let total = 0;
let loading = false;
function node(tag, text, className) {
  const item = document.createElement(tag);
  item.textContent = text;
  if (className) item.className = className;
  return item;
}
async function load() {
  if (loading) return;
  loading = true;
  const status = $('public-status');
  const filters = new FormData($('public-filter'));
  $('public-filter').inert = true;
  $('public-prev').disabled = $('public-next').disabled = true;
  $('public-list').replaceChildren();
  status.textContent = 'Consultando publicaciones…';
  const previousOffset = offset;
  try {
    const client = await obtenerCliente();
    const now = new Date().toISOString();
    let query = client.from('institutional_posts').select(POST_COLUMNS, { count: 'exact' })
      .abortSignal(AbortSignal.timeout(12000))
      .lte('published_at', now).or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('published_at', { ascending: false }).order('id');
    for (const key of ['kind', 'career', 'audience']) {
      if (filters.get(key)) query = query.eq(key, filters.get(key));
    }
    if (filters.get('search').trim()) query = query.ilike('title', searchPattern(filters.get('search')));
    const response = await query.range(offset, offset + 19);
    const posts = resultado(response);
    if (!Number.isInteger(response.count)) throw new Error('Missing publication count');
    total = response.count;
    for (const post of posts) {
      const card = node('article', '', 'gestion-card');
      card.append(node('h2', post.title), node('p', `${POST_KINDS[post.kind]} · ${CAREERS[post.career]} · ${post.audience}`, 'gestion-meta'),
        node('p', `Publicado: ${new Date(post.published_at).toLocaleDateString('es-AR')} · Actualizado: ${new Date(post.updated_at).toLocaleDateString('es-AR')} · v${post.version}`, 'gestion-meta'),
        node('p', post.body, 'gestion-text'));
      if (post.expires_at) card.append(node('p', `Vigente hasta: ${new Date(post.expires_at).toLocaleString('es-AR')}`));
      if (post.attachment_url) {
        if (!safeAttachment(post.attachment_url)) throw new Error('Unsafe attachment URL');
        const link = node('a', post.attachment_label);
        link.href = post.attachment_url; link.target = '_blank'; link.rel = 'noopener noreferrer';
        card.append(link);
      }
      $('public-list').append(card);
    }
    status.textContent = total ? `${total} publicaciones vigentes · página ${offset / 20 + 1}` : 'No hay publicaciones vigentes para estos filtros.';
    status.dataset.error = 'false';
  } catch (error) {
    offset = previousOffset;
    total = 0;
    $('public-list').replaceChildren();
    console.error('Publicaciones institucionales:', error.code || error.name);
    status.dataset.error = 'true';
    status.textContent = ['42P01', 'PGRST205'].includes(error.code)
      ? 'Esta sección todavía no está activada en la base de datos. Consultá los canales institucionales del inicio.'
      : 'No se pudieron consultar las publicaciones. Revisá la conexión e intentá nuevamente con Buscar.';
  } finally {
    loading = false;
    $('public-filter').inert = false;
    $('public-prev').disabled = offset === 0;
    $('public-next').disabled = offset + 20 >= total;
  }
}
$('public-filter').addEventListener('submit', event => { event.preventDefault(); if (!loading) { offset = 0; load(); } });
$('public-prev').addEventListener('click', () => { if (!loading) { offset = Math.max(0, offset - 20); load(); } });
$('public-next').addEventListener('click', () => { if (!loading) { offset += 20; load(); } });
const params = new URLSearchParams(location.search);
for (const field of ['kind', 'career']) {
  const value = params.get(field);
  if ([...$('public-filter').elements.namedItem(field).options].some(option => option.value === value)) {
    $('public-filter').elements.namedItem(field).value = value;
  }
}
load();
