import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { parse } from 'parse5';

const codigo = await readFile(new URL('../assets/js/contacto.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const values = {
  'form-name': 'contacto-institucional', nombre: 'Equipo de prueba',
  correo: 'prueba@example.invalid', asunto: 'Verificación técnica',
  mensaje: 'Consulta técnica de prueba sin datos personales.',
  'sitio-web': '', privacidad: 'aceptada'
};

function formulario({ hostname = 'eest3sf.netlify.app', preview = false, response = { ok: true }, data = values } = {}) {
  const status = { dataset: {}, hidden: true, focus() {} };
  const submit = { disabled: false };
  let action;
  let resets = 0;
  const requests = [];
  const form = {
    dataset: {}, reportValidity: () => true,
    querySelector: (selector) => selector === '.contacto-estado' ? status : submit,
    addEventListener: (type, listener) => { action = listener; },
    setAttribute() {}, removeAttribute() {},
    reset() { resets++; }
  };
  runInNewContext(codigo, {
    document: { querySelector: () => form }, window: { CMS_PREVIEW: preview },
    location: { hostname }, URLSearchParams, AbortSignal,
    FormData: class extends Map { constructor() { super(Object.entries(data)); } },
    fetch: async (url, options) => { requests.push({ url, options }); return await response; },
    console: { error() {} }
  });
  return { form, status, submit, requests, send: () => action({ preventDefault() {} }), resets: () => resets };
}

test('formulario estático registra campos, consentimiento y honeypot en Netlify', () => {
  const nodes = [];
  function walk(node) { nodes.push(node); node.childNodes?.forEach(walk); }
  walk(parse(html));
  const attrs = (node) => Object.fromEntries(node.attrs.map((a) => [a.name, a.value]));
  const form = nodes.find((node) => node.tagName === 'form' && attrs(node).name === 'contacto-institucional');
  assert.equal(attrs(form)['data-netlify'], 'true');
  assert.equal(attrs(form)['netlify-honeypot'], 'sitio-web');
  assert.equal(attrs(form).method, 'post');
  assert.equal(attrs(form).action, '/');
  for (const name of Object.keys(values)) {
    assert.ok(nodes.some((node) => node.attrs && attrs(node).name === name), name);
  }
  assert.ok(nodes.some((node) => node.tagName === 'input' && attrs(node).name === 'privacidad' && 'required' in attrs(node)));
  assert.ok(!html.includes('action="mailto:'));
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
