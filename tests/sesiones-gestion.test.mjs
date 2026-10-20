import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

function element() {
  return {
    children: [], dataset: {}, hidden: true, textContent: '', inert: false,
    addEventListener() {}, focus() {}, reset() {}, querySelectorAll: () => [],
    replaceChildren(...children) { this.children = children; },
    append(...children) { this.children.push(...children); }
  };
}

for (const module of ['gestion-admin', 'notificaciones']) {
  test(`${module}: cerrar sesión descarta respuestas privadas en vuelo`, async () => {
    const source = await readFile(new URL(`../assets/js/${module}.mjs`, import.meta.url), 'utf8');
    const nodes = new Map();
    const get = id => {
      if (!nodes.has(id)) nodes.set(id, element());
      return nodes.get(id);
    };
    let signOut;
    let resolveQuery;
    let queryStarted;
    const started = new Promise(resolve => { queryStarted = resolve; });
    const delayed = new Promise(resolve => { resolveQuery = resolve; });
    const response = data => ({ data, error: null });
    function query(table) {
      let single = false;
      const builder = new Proxy({}, {
        get(_, property) {
          if (property === 'then') {
            const result = table === 'contact_requests' || table === 'notifications_list'
              ? (queryStarted(), delayed)
              : Promise.resolve(response(table === 'profiles'
                ? single ? { role: 'administrador' } : [] : null));
            return result.then.bind(result);
          }
          return () => { if (property === 'single') single = true; return builder; };
        }
      });
      return builder;
    }
    const client = {
      auth: {
        getUser: async () => response({ user: { id: 'user-1' } }),
        onAuthStateChange(callback) { signOut = callback; }
      },
      from: query,
      rpc: query
    };
    const context = {
      document: { getElementById: get, createElement: element },
      window: { addEventListener() {} },
      obtenerCliente: async () => client,
      resultado: result => { if (result.error) throw result.error; return result.data; },
      FormData: class extends Map { constructor() { super([['status', ''], ['search', '']]); } },
      crypto: { randomUUID: () => 'new-post-id' },
      AbortSignal, DOMException,
      console: { error() { assert.fail('No debe registrar un fallo de acceso después de cerrar sesión.'); } }
    };
    runInNewContext(source.replace(/^import .*;\n/gm, '').replace(/\nstart\(\);\s*$/, '\nglobalThis.testStart = start;'), context);
    const running = context.testStart();
    await started;
    signOut('SIGNED_OUT');
    resolveQuery(module === 'gestion-admin'
      ? { ...response([{ id: 'private-id', subject: 'Consulta privada' }]), count: 1 }
      : response([{ id: 1, title: 'Aviso privado', link: 'novedades.html' }]));
    await running;
    const prefix = module === 'gestion-admin' ? 'gestion' : 'notifications';
    assert.equal(get(`${prefix}-workspace`).hidden, true);
    assert.match(get(`${prefix}-status`).textContent, /Sesión cerrada/);
    assert.equal(get(module === 'gestion-admin' ? 'contact-list' : 'notifications-list').children.length, 0);
    assert.equal(get(module === 'gestion-admin' ? 'post-history' : 'notifications-admin-list').children.length, 0);
  });
}
