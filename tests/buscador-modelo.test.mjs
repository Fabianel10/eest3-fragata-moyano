import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizarFiltros, construirConsulta, validarResultados, estadoVacio, POR_PAGINA
} from '../assets/js/buscador-modelo.mjs';

const config = { supabaseUrl: 'https://project.supabase.co' };

test('buscador: normaliza filtros, construye PostgREST y valida resultados', () => {
  const filtros = normalizarFiltros({
    texto: '  taller   de madera  ', tipo: 'inventado', carrera: 'madera',
    desde: '2026-02-31', hasta: '2026-12-01', pagina: '3'
  });
  assert.deepEqual(filtros, {
    texto: 'taller de madera', tipo: '', carrera: 'madera',
    desde: '', hasta: '2026-12-01', pagina: 3
  });
  const url = construirConsulta(filtros, config);
  assert.match(url, /^https:\/\/project\.supabase\.co\/rest\/v1\/search_index\?/);
  assert.match(url, /kind=eq\.madera|career=eq\.madera/);
  assert.match(url, /offset=60/);
  assert.match(url, /or=%28title\.ilike/);
  assert.doesNotMatch(url, /texto=/);

  const rows = validarResultados([
    { id: 'pagina:inicio', kind: 'pagina', title: 'Inicio', summary: 'Portal', career: '', url: 'index.html', result_date: null },
    { id: 'post:1', kind: 'comunicado', title: 'Aviso', summary: 'Texto', career: 'madera', url: 'novedades.html?post=1', result_date: '2026-01-01' }
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[1].date, '2026-01-01');
  assert.equal(POR_PAGINA, 20);
  assert.throws(() => validarResultados([{ id: 'x', kind: 'pagina', title: 'X', summary: '', career: '', url: 'javascript:alert(1)' }]), /no permitido/);
  assert.throws(() => validarResultados([{ id: 'x', kind: 'inventado', title: 'X', summary: '', career: '', url: 'index.html' }]), /no permitido/);
  assert.throws(() => construirConsulta({}, {}), /no está configurada/);
  assert.match(estadoVacio({ texto: 'algo' }), /No encontramos/);
  assert.match(estadoVacio({}), /Escribí una palabra/);
  assert.equal(normalizarFiltros({ pagina: -5 }).pagina, 0);
  assert.equal(normalizarFiltros({ pagina: 999 }).pagina, 100);
  assert.equal(normalizarFiltros({ texto: 'x'.repeat(200) }).texto.length, 80);
});
