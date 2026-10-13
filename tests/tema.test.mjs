import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const codigo = await readFile(new URL('../assets/js/tema.js', import.meta.url), 'utf8');

function ejecutarTema(guardado, preferencia) {
  const atributos = {};
  const clases = new Set();
  const storage = new Map(guardado ? [['tema-eest3', guardado]] : []);
  let click;
  const button = {
    setAttribute: (key, value) => { atributos[key] = value; },
    addEventListener: (evento, accion) => { click = accion; }
  };
  const classList = {
    toggle: (key, active) => active ? clases.add(key) : clases.delete(key),
    contains: (key) => clases.has(key)
  };
  runInNewContext(codigo, {
    document: { querySelector: () => button, body: { classList }, documentElement: { classList } },
    localStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    window: { matchMedia: () => ({ matches: preferencia }) }
  });
  return { atributos, clases, storage, click };
}

test('tema conserva preferencia, estado accesible y alternancia del inicio', () => {
  const tema = ejecutarTema('claro', true);
  assert.equal(tema.atributos['aria-pressed'], 'false');
  assert.equal(tema.storage.get('tema-eest3'), 'claro');
  tema.click();
  assert.ok(tema.clases.has('tema-oscuro'));
  assert.equal(tema.atributos['aria-label'], 'Activar modo claro');
  assert.equal(tema.storage.get('tema-eest3'), 'oscuro');
  tema.click();
  assert.equal(tema.atributos['aria-label'], 'Activar modo oscuro');
});

test('sin preferencia almacenada se respeta el tema del sistema', () => {
  assert.ok(ejecutarTema(null, true).clases.has('tema-oscuro'));
  assert.equal(ejecutarTema(null, false).clases.has('tema-oscuro'), false);
});
