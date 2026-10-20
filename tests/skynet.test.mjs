import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { SKYNET_TOPICS, careerContext, introducedName, skynetAnswer, validateAnswer, validateNickname } from '../assets/js/skynet-modelo.mjs';
import { searchPlan, searchPublications, withPublications } from '../assets/js/skynet-servicios.mjs';

test('Skynet responde temas con fuentes locales, sin inventar trámites ni permisos', async () => {
  for (const topic of SKYNET_TOPICS) {
    assert.equal(skynetAnswer(topic.label).id, topic.id);
    for (const [href] of topic.links) {
      assert.ok(!href.includes('://') && !href.startsWith('/'));
      await access(new URL(`../${href.split(/[?#]/)[0]}`, import.meta.url));
    }
  }
  assert.equal(skynetAnswer('¿Cómo recuperar mi contraseña?').id, 'cuenta');
  assert.equal(skynetAnswer('INFORMÁTICA').id, 'informatica');
  assert.equal(skynetAnswer('¿Hay vacantes para inscribirme?').id, 'inscripciones');
  assert.match(skynetAnswer('vacantes').text, /No confirmo vacantes/);
  assert.match(skynetAnswer('horarios').text, /no voy a inventar/);
  assert.match(skynetAnswer('administrador').text, /no cambia cuentas/);
});
test('Skynet limita entradas, reconoce desconocidos y no depende de servicios externos', async () => {
  for (const input of ['', ' '.repeat(3), 'x'.repeat(301), null]) assert.throws(() => skynetAnswer(input), /consulta/);
  assert.equal(skynetAnswer('<script>alert(1)</script>').id, 'sin-coincidencia');
  assert.equal(skynetAnswer('cuentahack').id, 'sin-coincidencia');
  const code = await readFile(new URL('../assets/js/skynet.mjs', import.meta.url), 'utf8');
  assert.ok(!/\b(fetch|localStorage|sessionStorage|innerHTML)\b/.test(code));
  assert.match(code, /showModal/);
  assert.match(code, /slice\(-100\)/);
  assert.match(code, /skynet\.png/);
});
test('diálogo, nombre opcional y seguimiento de carrera sin inventar información', () => {
  for (const [question, id] of [['hola', 'saludo'], ['¿cómo estás?', 'saludo'], ['gracias', 'gracias'], ['quién sos', 'identidad'], ['ayuda', 'ayuda'], ['chau', 'despedida']]) {
    assert.equal(skynetAnswer(question).id, id);
  }
  assert.equal(introducedName('me llamo María'), 'María');
  assert.equal(introducedName('llamame Fabi'), 'Fabi');
  assert.equal(introducedName('horarios de informática'), null);
  for (const name of ['', '--', '1', '<script>', 'A'.repeat(41), 'juan@example.invalid']) assert.throws(() => validateNickname(name));
  assert.equal(careerContext('madera'), 'madera');
  assert.equal(careerContext('¿y los horarios?', 'informatica'), 'informatica');
  assert.equal(careerContext('ahora obras', 'informatica'), 'obras');
  assert.equal(skynetAnswer('¿y las materias?', 'informatica').id, 'informatica');
  const answer = skynetAnswer('horarios informática');
  assert.equal(answer.id, 'horarios');
  assert.deepEqual(searchPlan('horarios informática', answer), { kind: 'horario', career: 'informatica', term: '' });
  for (const input of ['mi contraseña es abc123', 'mi dni: 12345678', 'correo juan@example.invalid', '11 1234 5678']) {
    assert.throws(() => skynetAnswer(input), /No envíes/);
  }
  assert.doesNotThrow(() => skynetAnswer('calendario 2026'));
});
test('búsqueda solo pública, filtros exactos, errores explícitos y fuentes locales seguras', async () => {
  const config = { supabaseUrl: 'https://test.supabase.co', supabasePublishableKey: 'public-key' };
  let request;
  const rows = [{ id: '00000000-0000-4000-8000-000000000001', title: 'Horario del taller', published_at: '2026-10-01T10:00:00Z' }];
  const plan = { kind: 'horario', career: 'madera', term: '100%_' };
  assert.deepEqual(await searchPublications(config, plan, undefined, async (url, options) => {
    request = { url: new URL(url), options }; return { ok: true, json: async () => rows };
  }), rows);
  assert.equal(request.url.searchParams.get('career'), 'eq.madera');
  assert.equal(request.url.searchParams.get('kind'), 'eq.horario');
  assert.equal(request.url.searchParams.get('title'), 'ilike.%100\\%\\_%');
  assert.match(request.url.searchParams.get('published_at'), /^lte\./);
  assert.match(request.url.searchParams.get('or'), /expires_at/);
  assert.deepEqual(request.options.headers, { apikey: 'public-key' });
  const answer = withPublications(skynetAnswer('horarios'), rows, plan);
  assert.match(answer.text, /Horario del taller/);
  assert.equal(answer.links[0][0], `novedades.html?post=${rows[0].id}`);
  assert.match(withPublications(skynetAnswer('horarios'), [], plan).text, /no confirma/);
  await assert.rejects(searchPublications(config, plan, undefined, async () => ({ ok: false })), /No se pudieron/);
  await assert.rejects(searchPublications(config, plan, undefined, async () => ({ ok: true, json: async () => [{}] })), /inválida/);
  for (const href of ['javascript:alert(1)', 'https://outside.invalid', '//outside.invalid', 'novedades.html?x=<script>']) {
    assert.throws(() => validateAnswer({ id: 'saludo', text: 'Hola', links: [[href, 'Fuente']] }), /inválida/);
  }
});
test('personaje optimizado en PNG con canal alfa y dimensiones acotadas', async () => {
  const png = await readFile(new URL('../assets/images/skynet.png', import.meta.url));
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.ok(png.readUInt32BE(16) <= 420);
  assert.ok(png.readUInt32BE(20) <= 420);
  assert.ok([4, 6].includes(png[25]), 'PNG debe conservar un canal alfa');
  assert.ok(png.length < 200 * 1024);
});
