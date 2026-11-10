import {
  TIPOS, CARRERAS, POR_PAGINA, normalizarFiltros, construirConsulta,
  validarResultados, estadoVacio
} from './buscador-modelo.mjs';
import { iniciarMetricasPublicas } from './metricas.mjs';

iniciarMetricasPublicas();

const $ = (id) => document.getElementById(id);
const form = $('buscador-form');
const lista = $('buscador-resultados');
const estado = $('buscador-estado');
const anterior = $('buscador-anterior');
const siguiente = $('buscador-siguiente');
let control;
let filtros = normalizarFiltros();

function leerFiltros() {
  return normalizarFiltros({
    texto: $('buscar-texto').value,
    tipo: $('buscar-tipo').value,
    carrera: $('buscar-carrera').value,
    desde: $('buscar-desde').value,
    hasta: $('buscar-hasta').value,
    pagina: new URLSearchParams(location.search).get('pagina') || 0
  });
}
function escribirFormulario(f) {
  $('buscar-texto').value = f.texto;
  $('buscar-tipo').value = f.tipo;
  $('buscar-carrera').value = f.carrera;
  $('buscar-desde').value = f.desde;
  $('buscar-hasta').value = f.hasta;
}
function escribirUrl(f) {
  const params = new URLSearchParams();
  if (f.texto) params.set('q', f.texto);
  if (f.tipo) params.set('tipo', f.tipo);
  if (f.carrera) params.set('carrera', f.carrera);
  if (f.desde) params.set('desde', f.desde);
  if (f.hasta) params.set('hasta', f.hasta);
  if (f.pagina) params.set('pagina', String(f.pagina));
  history.replaceState(null, '', `buscador.html${params.size ? `?${params}` : ''}`);
}
function leerUrl() {
  const params = new URLSearchParams(location.search);
  return normalizarFiltros({
    texto: params.get('q') || '',
    tipo: params.get('tipo') || '',
    carrera: params.get('carrera') || '',
    desde: params.get('desde') || '',
    hasta: params.get('hasta') || '',
    pagina: params.get('pagina') || 0
  });
}
function nodo(tag, texto, clase) {
  const item = document.createElement(tag);
  if (texto) item.textContent = texto;
  if (clase) item.className = clase;
  return item;
}
function fecha(valor) {
  if (!valor) return '';
  const parsed = new Date(`${valor}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
}
function render(items) {
  lista.replaceChildren();
  for (const item of items) {
    const card = nodo('li', '', 'buscador-resultado');
    const titulo = nodo('h2');
    const enlace = nodo('a', item.title);
    enlace.href = item.url;
    titulo.append(enlace);
    const meta = nodo('p', '', 'buscador-meta');
    meta.append(nodo('span', TIPOS[item.kind]));
    if (item.career) meta.append(nodo('span', CARRERAS[item.career]));
    const dia = fecha(item.date);
    if (dia) meta.append(nodo('span', dia));
    card.append(titulo, meta, nodo('p', item.summary || 'Sin descripción adicional.'));
    lista.append(card);
  }
  anterior.disabled = filtros.pagina === 0;
  siguiente.disabled = items.length < POR_PAGINA;
}
async function buscar(nuevosFiltros) {
  filtros = normalizarFiltros(nuevosFiltros);
  escribirFormulario(filtros);
  escribirUrl(filtros);
  control?.abort();
  control = new AbortController();
  const timeout = setTimeout(() => control.abort(), 12000);
  estado.textContent = 'Buscando…';
  estado.dataset.error = 'false';
  lista.replaceChildren();
  try {
    const config = window.COMUNIDAD_CONFIG;
    const url = construirConsulta(filtros, config);
    const response = await fetch(url, {
      headers: { apikey: config.supabasePublishableKey },
      signal: control.signal
    });
    if (!response.ok) throw new Error('No se pudo consultar el índice.');
    const items = validarResultados(await response.json());
    if (!items.length) {
      estado.textContent = estadoVacio(filtros);
    } else {
      const inicio = filtros.pagina * POR_PAGINA + 1;
      estado.textContent = `Resultados ${inicio}–${inicio + items.length - 1}. Seleccioná un resultado para abrir la fuente.`;
    }
    render(items);
    if (window.METRICAS) window.METRICAS.busqueda(filtros.tipo, filtros.carrera);
  } catch (error) {
    if (error.name === 'AbortError') {
      estado.textContent = 'La búsqueda tardó demasiado. Revisá la conexión e intentá de nuevo.';
    } else {
      console.error('Buscador:', error.name);
      estado.textContent = 'No pudimos consultar la búsqueda. Revisá la conexión o intentá más tarde.';
    }
    estado.dataset.error = 'true';
    anterior.disabled = true;
    siguiente.disabled = true;
  } finally {
    clearTimeout(timeout);
  }
}
form.addEventListener('submit', (event) => {
  event.preventDefault();
  buscar({ ...leerFiltros(), pagina: 0 });
});
$('buscador-limpiar').addEventListener('click', () => {
  form.reset();
  buscar({});
});
anterior.addEventListener('click', () => {
  if (filtros.pagina > 0) buscar({ ...filtros, pagina: filtros.pagina - 1 });
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
siguiente.addEventListener('click', () => {
  buscar({ ...filtros, pagina: filtros.pagina + 1 });
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
const inicial = leerUrl();
escribirFormulario(inicial);
if (!window.COMUNIDAD_CONFIG?.supabaseUrl || !window.COMUNIDAD_CONFIG?.supabasePublishableKey) {
  estado.textContent = 'La búsqueda no está configurada en este entorno. Consultá Comunicados y Calendario desde la navegación.';
  estado.dataset.error = 'true';
} else {
  buscar(inicial);
}
