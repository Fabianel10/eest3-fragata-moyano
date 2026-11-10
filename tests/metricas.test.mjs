import test from 'node:test';
import assert from 'node:assert/strict';

test('métricas del navegador: una página por sesión, búsqueda agregada y Do Not Track', async () => {
  const llamadas = [];
  const storage = new Map();
  const definiciones = {
    window: {
      COMUNIDAD_CONFIG: { supabaseUrl: 'https://project.supabase.co', supabasePublishableKey: 'public' },
      doNotTrack: null
    },
    navigator: { doNotTrack: null, globalPrivacyControl: false },
    location: { pathname: '/buscador.html' },
    sessionStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value)
    },
    fetch: async (url, options) => {
      llamadas.push({ url, body: JSON.parse(options.body) });
      return new Response('null', { status: 200 });
    }
  };
  const anteriores = {};
  for (const [key, value] of Object.entries(definiciones)) {
    anteriores[key] = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  try {
    const { iniciarMetricasPublicas } = await import(`../assets/js/metricas.mjs?prueba=${Date.now()}`);
    iniciarMetricasPublicas();
    assert.equal(llamadas.length, 1);
    assert.deepEqual(llamadas[0].body, { p_metric: 'page_view', p_target: 'buscador', p_career: '' });
    iniciarMetricasPublicas();
    assert.equal(llamadas.length, 1, 'la página no se registra dos veces en la misma sesión');
    window.METRICAS.busqueda('carrera', 'madera');
    window.METRICAS.busqueda('carrera', 'madera');
    assert.equal(llamadas.length, 2);
    assert.deepEqual(llamadas[1].body, { p_metric: 'search_used', p_target: 'carrera', p_career: 'madera' });
    window.METRICAS.publicacion('00000000-0000-4000-8000-000000000001');
    window.METRICAS.publicacion('no-es-uuid');
    assert.equal(llamadas.length, 3);
    assert.equal(llamadas[2].body.p_metric, 'post_view');

    navigator.doNotTrack = '1';
    window.METRICAS.busqueda('documento', '');
    assert.equal(llamadas.length, 3, 'Do Not Track debe impedir el registro');

    storage.clear();
    location.pathname = '/admin.html';
    iniciarMetricasPublicas();
    assert.equal(llamadas.length, 3, 'las páginas privadas no se registran');
  } finally {
    for (const key of Object.keys(definiciones)) {
      if (anteriores[key]) Object.defineProperty(globalThis, key, anteriores[key]);
      else delete globalThis[key];
    }
  }
});
