import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { SKYNET_TOPICS, skynetAnswer } from '../assets/js/skynet-modelo.mjs';

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
  assert.match(code, /children.length > 8/);
});
