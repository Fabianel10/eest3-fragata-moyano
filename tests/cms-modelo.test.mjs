import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  validarDocumento, urlSegura, nuevoBloque, validarArchivo, MAX_ARCHIVO, escaparHTML
} from '../assets/js/cms-modelo.mjs';

const catalogo = JSON.parse(await readFile(new URL('../assets/cms/catalogo.json', import.meta.url), 'utf8'));
test('las siete páginas existentes satisfacen el contrato editorial', () => {
  assert.equal(Object.keys(catalogo).length, 7);
  for (const page of Object.values(catalogo)) assert.doesNotThrow(() => validarDocumento(page.defaults));
});
test('fixtures públicos mantienen correspondencia con el catálogo de plantillas', async () => {
  const [{ content }] = JSON.parse(await readFile(new URL('fixtures/cms-publico-inicio.json', import.meta.url), 'utf8'));
  validarDocumento(content);
  for (const block of content.blocks) {
    const descriptors = catalogo.inicio.descriptors.blocks[block.source].fields;
    for (const [id, field] of Object.entries(block.fields)) assert.equal(descriptors[id].kind, field.kind);
  }
  const [{ content: empty }] = JSON.parse(await readFile(new URL('fixtures/cms-publico-vacio.json', import.meta.url), 'utf8'));
  assert.doesNotThrow(() => validarDocumento(empty));
});
test('URLs descartan código, protocolos peligrosos, controles y escape de rutas', () => {
  for (const value of ['javascript:alert(1)', 'data:image/svg+xml,test', '//evil.test', 'https://user@evil.test', 'http://evil.test',
    '../private', 'assets/../secret', 'assets/%2e%2e/private', 'assets/images%2Fprivate',
    'https://example.test/x" onclick="bad', 'https://example.test/\\a', 'https://example.test/a b']) {
    assert.equal(urlSegura(value), false, value);
  }
  for (const value of ['https://example.test/image.jpg', 'assets/images/test%20file.jpg', 'index.html#inicio', '#contacto', 'mailto:info@example.test', 'tel:+541142526784']) {
    assert.equal(urlSegura(value), true, value);
  }
  assert.equal(urlSegura('', 'image'), true);
  assert.equal(urlSegura('', 'link'), false);
  assert.equal(escaparHTML('<img alt="test">'), '&lt;img alt=&quot;test&quot;&gt;');
});
test('bloques nuevos, fechas y contenidos rechazan estructuras inválidas', () => {
  for (const kind of ['texto', 'imagen', 'llamada', 'tarjetas']) {
    const doc = structuredClone(catalogo.inicio.defaults);
    doc.blocks.push(nuevoBloque(kind));
    assert.doesNotThrow(() => validarDocumento(doc));
  }
  const invalid = (change, pattern) => {
    const doc = structuredClone(catalogo.inicio.defaults);
    change(doc);
    assert.throws(() => validarDocumento(doc), pattern);
  };
  invalid((d) => d.blocks.push(d.blocks[0]), /duplicado/);
  invalid((d) => { d.blocks = []; }, /1 y 60/);
  invalid((d) => { d.title = 'x'.repeat(201); }, /título/);
  invalid((d) => { d.modules.events[0].date = '2026-02-31'; }, /Fecha/);
  invalid((d) => { d.modules.events[0].date = '2026-99-99'; }, /Fecha/);
  invalid((d) => { d.modules.events.push(d.modules.events[0]); }, /Fecha/);
  invalid((d) => {
    const b = nuevoBloque('llamada'); b.fields.link = { kind: 'text', value: 'javascript:alert(1)' }; d.blocks.push(b);
  }, /no permitido/);
});
test('archivos respetan exactamente el límite y excluyen SVG, HTML y documentos', () => {
  assert.doesNotThrow(() => validarArchivo({ type: 'image/png', size: MAX_ARCHIVO }));
  assert.throws(() => validarArchivo({ type: 'image/png', size: MAX_ARCHIVO + 1 }), /20 MB/);
  assert.throws(() => validarArchivo({ type: 'image/png', size: 0 }), /20 MB/);
  for (const type of ['image/svg+xml', 'text/html', 'application/pdf']) {
    assert.throws(() => validarArchivo({ type, size: 100 }), /Formato/);
  }
});
