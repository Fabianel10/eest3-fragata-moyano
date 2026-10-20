import test from 'node:test';
import assert from 'node:assert/strict';
import { createContactHandler } from '../netlify/functions/contacto.mjs';

const id = '00000000-0000-4000-8000-000000000001';
const input = { request_id: id, nombre: ' Equipo prueba ', correo: 'equipo@example.invalid', asunto: 'Consulta técnica',
  mensaje: 'Mensaje de prueba sin datos personales.', categoria: 'general', carrera: '', privacidad: 'aceptada', 'sitio-web': '' };
const env = {
  CONTACT_ENABLED: 'true', URL: 'https://school.example', SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'server-only-test', CONTACT_HASH_SECRET: 'a'.repeat(64)
};
function setup({ config = env, upstream = new Response(JSON.stringify(id)), fetcher } = {}) {
  const requests = [];
  const logs = [];
  const handler = createContactHandler({ env: config, logger: { error: (...data) => logs.push(data) },
    fetcher: fetcher || (async (...args) => { requests.push(args); return upstream; }) });
  const send = (body = input, overrides = {}) => handler(new Request('https://school.example/.netlify/functions/contacto', {
    method: 'POST', headers: { Origin: 'https://school.example', 'Content-Type': 'application/json' },
    body: JSON.stringify(body), ...overrides
  }), { ip: '192.0.2.1' });
  return { send, requests, logs, handler };
}
test('contacto backend persiste primero, devuelve comprobante y no registra datos personales', async () => {
  const h = setup();
  const response = await h.send();
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { id });
  const payload = JSON.parse(h.requests[0][1].body);
  assert.equal(payload.payload.nombre, 'Equipo prueba');
  assert.match(payload.source_hash, /^[a-f0-9]{64}$/);
  assert.ok(!h.requests[0][1].body.includes('192.0.2.1'));
  assert.equal(h.logs.length, 0);
});
test('configuración desactivada, origen ajeno, formato y campos inválidos no escriben', async () => {
  assert.equal((await setup({ config: { ...env, CONTACT_ENABLED: 'false' } }).send()).status, 503);
  assert.equal((await setup({ config: { ...env, CONTACT_HASH_SECRET: '' } }).send()).status, 503);
  const h = setup();
  assert.equal((await h.send(input, { headers: { Origin: 'https://attacker.invalid', 'Content-Type': 'application/json' } })).status, 403);
  assert.equal((await h.send(input, { headers: { Origin: env.URL, 'Content-Type': 'text/plain' } })).status, 415);
  for (const bad of [
    { nombre: 'x' }, { correo: 'no-email' }, { mensaje: 'x'.repeat(5001) }, { categoria: 'secreta' },
    { carrera: 'otra' }, { privacidad: '' }, { request_id: '1' }, { 'sitio-web': 'spam.invalid' }
  ]) assert.equal((await h.send({ ...input, ...bad })).status, 400);
  assert.equal(h.requests.length, 0);
});
test('límite real de tamaño, método y JSON roto', async () => {
  const h = setup();
  assert.equal((await h.send(input, { method: 'GET', body: undefined })).status, 405);
  assert.equal((await h.send(input, { body: '{' })).status, 400);
  assert.equal((await h.send(input, { body: 'x'.repeat(24001) })).status, 413);
});
test('rate limit, conflicto y fallo de persistencia nunca aparentan éxito', async () => {
  for (const [code, status] of [['P0001', 429], ['23505', 409], ['42P01', 503]]) {
    const h = setup({ upstream: new Response(JSON.stringify({ code, message: 'private data' }), { status: 400 }) });
    const response = await h.send();
    assert.equal(response.status, status);
    assert.ok(!(await response.text()).includes('private data'));
    assert.ok(!JSON.stringify(h.logs).includes(input.correo));
  }
  const h = setup({ fetcher: async () => { throw new TypeError('network'); } });
  assert.equal((await h.send()).status, 503);
  assert.equal((await setup({ upstream: new Response(JSON.stringify('wrong receipt')) }).send()).status, 503);
});
