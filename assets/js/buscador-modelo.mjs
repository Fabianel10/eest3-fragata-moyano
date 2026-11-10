import { searchPattern } from './gestion-modelo.mjs';

export const TIPOS = Object.freeze({
  pagina: 'Página',
  carrera: 'Carrera',
  comunicado: 'Comunicado',
  documento: 'Documento',
  proyecto: 'Proyecto estudiantil',
  horario: 'Horario y equipo docente',
  evento: 'Evento del calendario'
});
export const CARRERAS = Object.freeze({
  informatica: 'Informática Personal y Profesional',
  madera: 'Industrialización de la Madera y el Mueble',
  obras: 'Maestro Mayor de Obras'
});
export const POR_PAGINA = 20;

const fecha = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : '';
};

export function normalizarFiltros(input = {}) {
  const texto = (typeof input.texto === 'string' ? input.texto : '')
    .replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  return {
    texto,
    tipo: Object.hasOwn(TIPOS, input.tipo) ? input.tipo : '',
    carrera: Object.hasOwn(CARRERAS, input.carrera) ? input.carrera : '',
    desde: fecha(input.desde),
    hasta: fecha(input.hasta),
    pagina: Math.min(100, Math.max(0, Number.parseInt(input.pagina, 10) || 0))
  };
}

export function construirConsulta(input, config) {
  if (!config?.supabaseUrl || !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(config.supabaseUrl)) {
    throw new Error('La búsqueda no está configurada.');
  }
  const filtros = normalizarFiltros(input);
  const params = new URLSearchParams({
    select: 'id,kind,title,summary,career,url,result_date',
    order: 'result_date.desc.nullslast,title.asc',
    limit: String(POR_PAGINA),
    offset: String(filtros.pagina * POR_PAGINA)
  });
  if (filtros.tipo) params.set('kind', `eq.${filtros.tipo}`);
  if (filtros.carrera) params.set('career', `eq.${filtros.carrera}`);
  if (filtros.desde) params.set('result_date', `gte.${filtros.desde}`);
  if (filtros.hasta) params.set('result_date', `lte.${filtros.hasta}`);
  if (filtros.texto) {
    const patron = searchPattern(filtros.texto);
    params.set('or', `(title.ilike.${patron},summary.ilike.${patron},body.ilike.${patron})`);
  }
  return `${config.supabaseUrl.replace(/\/$/, '')}/rest/v1/search_index?${params}`;
}

export function validarResultados(rows) {
  if (!Array.isArray(rows) || rows.length > POR_PAGINA) throw new Error('La búsqueda devolvió una respuesta inválida.');
  return rows.map((row) => {
    if (!row || typeof row.id !== 'string' || row.id.length > 120 ||
        !Object.hasOwn(TIPOS, row.kind) ||
        typeof row.title !== 'string' || row.title.length < 1 || row.title.length > 200 ||
        typeof row.summary !== 'string' || row.summary.length > 500 ||
        (row.career !== '' && !Object.hasOwn(CARRERAS, row.career)) ||
        typeof row.url !== 'string' || row.url.length > 512 ||
        !/^(index|historia|galeria|calendario|informatica|madera|obras|novedades|comunidad|privacidad|buscador)\.html(\?[A-Za-z0-9%_=&.:-]+)?$/.test(row.url)) {
      throw new Error('La búsqueda devolvió un resultado no permitido.');
    }
    return {
      id: row.id, kind: row.kind, title: row.title, summary: row.summary,
      career: row.career || '', url: row.url, date: row.result_date || null
    };
  });
}

export function estadoVacio(filtros) {
  const f = normalizarFiltros(filtros);
  return f.texto || f.tipo || f.carrera || f.desde || f.hasta
    ? 'No encontramos resultados con esos filtros. Probá con menos palabras o ampliá las fechas.'
    : 'Escribí una palabra o elegí un filtro para buscar en todo el sitio.';
}
