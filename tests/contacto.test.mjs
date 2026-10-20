import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { parse } from 'parse5';

const codigo = await readFile(new URL('../assets/js/contacto.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const catalog = JSON.parse(await readFile(new URL('../assets/cms/catalogo.json', import.meta.url), 'utf8'));
const values = {
  'form-name': 'contacto-institucional', nombre: 'Equipo de prueba',
  correo: 'prueba@example.invalid', asunto: 'Verificación técnica',
  mensaje: 'Consulta técnica de prueba sin datos personales.',
  'sitio-web': '', privacidad: 'aceptada', categoria: 'general', carrera: ''
};

function formulario({ hostname = 'eest3sf.netlify.app', preview = false, response = { ok: true }, data = values, backend = 'netlify' } = {}) {
  const status = { dataset: {}, hidden: true, focus() {} };
  const submit = { disabled: false };
  let action;
  let resets = 0;
  const requests = [];
  let requestCounter = 0;
  const form = {
    dataset: { backend }, reportValidity: () => true,
    querySelector: (selector) => selector === '.contacto-estado' ? status : submit,
    addEventListener: (type, listener) => { action = listener; },
    setAttribute() {}, removeAttribute() {},
    reset() { resets++; }
  };
  runInNewContext(codigo, {
    document: { querySelector: () => form }, window: { CMS_PREVIEW: preview },
    location: { hostname }, URLSearchParams, AbortSignal,
    FormData: class extends Map { constructor() { super(Object.entries(data)); } },
    crypto: { randomUUID: () => `00000000-0000-4000-8000-${String(++requestCounter).padStart(12, '0')}` },
    fetch: async (url, options) => { requests.push({ url, options }); return typeof response === 'function' ? await response(url, options) : await response; },
    console: { error() {} }
  });
  return { form, status, submit, requests, send: () => action({ preventDefault() {} }), resets: () => resets };
}

test('formulario estático activa Supabase sin doble escritura y conserva consentimiento y honeypot', () => {
  const nodes = [];
  function walk(node) { nodes.push(node); node.childNodes?.forEach(walk); }
  walk(parse(html));
  const attrs = (node) => Object.fromEntries(node.attrs.map((a) => [a.name, a.value]));
  const form = nodes.find((node) => node.tagName === 'form' && attrs(node).name === 'contacto-institucional');
  assert.equal(attrs(form)['data-backend'], 'supabase');
  assert.equal(attrs(form)['data-netlify'], undefined);
  assert.equal(attrs(form)['netlify-honeypot'], undefined);
  assert.equal(attrs(form).method, 'post');
  assert.equal(attrs(form).action, '/');
  for (const name of Object.keys(values)) {
    assert.ok(nodes.some((node) => node.attrs && attrs(node).name === name), name);
  }
  assert.ok(nodes.some((node) => node.tagName === 'input' && attrs(node).name === 'privacidad' && 'required' in attrs(node)));
  for (const [name, maximum] of [['nombre', '100'], ['correo', '254'], ['asunto', '200'], ['mensaje', '5000']]) {
    const field = nodes.find((node) => node.attrs && attrs(node).name === name);
    assert.equal(attrs(field).maxlength, maximum);
    assert.ok('required' in attrs(field));
  }
  assert.ok(!html.includes('action="mailto:'));
  const submitField = catalog.inicio.descriptors.blocks.b5.fields.f223;
  assert.equal(submitField.selector, '.formulario-contacto > button[type="submit"]');
  assert.equal(catalog.inicio.defaults.blocks.find(block => block.source === 'b5').fields.f223.value, 'Enviar consulta');
});

test('contacto recibe confirmación HTTPS y solo entonces limpia los campos', async () => {
  const f = formulario();
  await f.send();
  assert.equal(f.requests[0].url, '/');
  assert.equal(f.requests[0].options.method, 'POST');
  assert.equal(f.requests[0].options.headers['Content-Type'], 'application/x-www-form-urlencoded');
  const data = new URLSearchParams(f.requests[0].options.body);
  assert.equal(data.get('form-name'), 'contacto-institucional');
  assert.equal(data.get('privacidad'), 'aceptada');
  assert.equal(f.resets(), 1);
  assert.match(f.status.textContent, /fue recibida/);
  assert.equal(f.submit.disabled, false);
});

test('fallo de recepción conserva los datos y permite reintentar sin afirmar éxito', async () => {
  const f = formulario({ response: { ok: false, status: 503 } });
  await f.send();
  assert.equal(f.resets(), 0);
  assert.equal(f.status.dataset.tipo, 'error');
  assert.match(f.status.textContent, /No pudimos confirmar/);
  assert.equal(f.submit.disabled, false);
});

test('desarrollo, vista previa y entradas vacías no envían consultas', async () => {
  for (const options of [{ hostname: 'localhost' }, { hostname: '127.0.0.1' }, { preview: true }, { data: { ...values, nombre: '   ' } }]) {
    const f = formulario(options);
    await f.send();
    assert.equal(f.requests.length, 0);
    assert.equal(f.resets(), 0);
    assert.equal(f.status.hidden, false);
  }
});

test('un envío pendiente bloquea duplicados', async () => {
  let resolve;
  const response = new Promise((done) => { resolve = done; });
  const f = formulario({ response });
  const first = f.send();
  await f.send();
  assert.equal(f.requests.length, 1);
  assert.equal(f.submit.disabled, true);
  resolve({ ok: true });
  await first;
  assert.equal(f.submit.disabled, false);
});

test('modo Supabase conserva identificador al reintentar y exige comprobante real', async () => {
  let attempt = 0;
  const f = formulario({ backend: 'supabase', response: async (url, options) => {
    attempt++;
    return attempt === 1
      ? { ok: false, json: async () => ({ error: 'Servicio temporalmente no disponible.' }) }
      : { ok: true, json: async () => ({ id: JSON.parse(options.body).request_id }) };
  } });
  await f.send();
  assert.equal(f.resets(), 0);
  await f.send();
  assert.equal(f.resets(), 1);
  assert.equal(f.requests[0].url, '/.netlify/functions/contacto');
  assert.equal(JSON.parse(f.requests[0].options.body).request_id, JSON.parse(f.requests[1].options.body).request_id);
  assert.match(f.status.textContent, /Número: 00000000/);
  const invalid = formulario({ backend: 'supabase', response: { ok: true, json: async () => ({ id: 'invalid' }) } });
  await invalid.send();
  assert.equal(invalid.resets(), 0);
  assert.match(invalid.status.textContent, /comprobante válido/);
});
