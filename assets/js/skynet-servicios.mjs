import { careerContext, normalize, validateAnswer } from './skynet-modelo.mjs';
import { searchPattern } from './gestion-modelo.mjs';

export const SKYNET_POLICY = '2026-10-20-skynet';
export function searchPlan(question, answer, previousCareer = '') {
  const kind = { documentos: 'documento', horarios: 'horario', proyectos: 'proyecto', inscripciones: 'comunicado' }[answer.id];
  if (!kind && answer.id !== 'busqueda') return null;
  const term = answer.id === 'busqueda' ? normalize(question).replace(/^(buscar|busca|busqueda|encontrar)\s*/, '').slice(0, 80) : '';
  return { kind, career: careerContext(question, previousCareer), term };
}

export async function searchPublications(config, plan, signal, fetcher = fetch) {
  if (!config?.supabasePublishableKey || !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(config.supabaseUrl)) {
    throw new Error('No está configurada la consulta de publicaciones.');
  }
  const now = new Date().toISOString();
  const params = new URLSearchParams({
    select: 'id,title,kind,career,published_at,updated_at',
    published_at: `lte.${now}`, or: `(expires_at.is.null,expires_at.gt.${now})`,
    order: 'published_at.desc,id', limit: '5'
  });
  if (plan.kind) params.set('kind', `eq.${plan.kind}`);
  if (plan.career) params.set('career', `eq.${plan.career}`);
  if (plan.term) params.set('title', `ilike.${searchPattern(plan.term)}`);
  const response = await fetcher(`${config.supabaseUrl.replace(/\/$/, '')}/rest/v1/institutional_posts?${params}`, {
    headers: { apikey: config.supabasePublishableKey }, signal
  });
  if (!response.ok) throw new Error('No se pudieron consultar las publicaciones vigentes. Reintentá o abrí el catálogo.');
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length > 5 || rows.some(row =>
    !/^[a-f0-9-]{36}$/i.test(row.id) || typeof row.title !== 'string' || row.title.length > 200 ||
    !Number.isFinite(Date.parse(row.published_at)))) throw new Error('El catálogo devolvió una respuesta inválida.');
  return rows;
}

export function withPublications(answer, rows, plan) {
  const filter = new URLSearchParams();
  if (plan.kind) filter.set('kind', plan.kind);
  if (plan.career) filter.set('career', plan.career);
  const catalogue = `novedades.html${filter.size ? `?${filter}` : ''}`;
  const text = rows.length
    ? `${answer.text}\n\nPublicaciones vigentes encontradas (hasta cinco):\n${rows.map(row =>
      `• ${row.title} · publicada ${new Date(row.published_at).toLocaleDateString('es-AR')}`).join('\n')}\nConsultá las fuentes para confirmar el contenido y sus actualizaciones.`
    : `${answer.text}\n\nNo encontré publicaciones vigentes para este filtro. Esto no confirma que no existan horarios, vacantes o actividades. Consultá a Secretaría.`;
  return validateAnswer({
    id: answer.id, text,
    links: [...rows.map(row => [`novedades.html?post=${row.id}`, row.title]), [catalogue, 'Ver catálogo filtrado'], ['index.html#contacto', 'Consultar a Secretaría']]
  });
}
