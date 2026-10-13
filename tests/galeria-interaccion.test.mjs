import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const codigo = await readFile(new URL('../assets/js/galeria.js', import.meta.url), 'utf8');

function galeria({ reduced = false, items = [{ type: 'image', src: 'foto.webp', title: 'Taller' }, { type: 'image', src: 'otra.webp', title: 'Proyecto' }] } = {}) {
  const nodes = new Map();
  const timers = new Map();
  const listeners = new Map();
  let nextTimer = 0;
  function node() {
    const attrs = {};
    const events = new Map();
    let html = '';
    const result = {
      attrs, events, dataset: {}, children: [], textContent: '', disabled: false,
      classList: { toggle() {}, contains: () => false },
      setAttribute(key, value) { attrs[key] = value; },
      getAttribute(key) { return attrs[key]; },
      addEventListener(key, action) { events.set(key, action); },
      append(child) { this.children.push(child); },
      replaceChildren() { this.children = []; },
      contains(target) { return Boolean(target?.inGallery); },
      pause() { this.pauses = (this.pauses || 0) + 1; },
      play() { this.plays = (this.plays || 0) + 1; return Promise.resolve(); },
      querySelector(selector) {
        if (selector === 'video') return html.includes('<video') ? this.media : null;
        if (selector === 'img') return html.includes('<img') ? this.media : null;
      },
      querySelectorAll() { return this.children; },
      set innerHTML(value) {
        html = value;
        this.media = node();
        this.children = [...value.matchAll(/data-slide="(\d+)"/g)].map((m) => {
          const button = node(); button.dataset.slide = m[1]; button.inGallery = true; return button;
        });
      },
      get innerHTML() { return html; }
    };
    return result;
  }
  const get = (selector) => {
    if (!nodes.has(selector)) nodes.set(selector, node());
    return nodes.get(selector);
  };
  const doc = {
    hidden: false, activeElement: null,
    querySelector: get, createElement: node,
    addEventListener: (key, action) => listeners.set(key, action),
    body: node(), documentElement: node()
  };
  runInNewContext(codigo, {
    document: doc,
    window: {
      CMS_CONTENT: { gallery: items }, CMS_ESCAPE: (s) => s, CMS_PREVIEW: true,
      matchMedia: () => ({ matches: reduced }),
      clearTimeout: (id) => timers.delete(id),
      setTimeout: (fn, delay) => { timers.set(++nextTimer, { fn, delay }); return nextTimer; }
    },
    localStorage: { getItem: () => 'claro', setItem() {} }
  });
  return {
    get, doc, listeners, timers,
    pause: get('.slider-controles').children[0],
    emit: (selector, type, event) => get(selector).events.get(type)(event),
    advance: () => {
      const [id, timer] = [...timers].find(([, timer]) => timer.delay === 5500);
      timers.delete(id); timer.fn();
    }
  };
}

test('pausa manual detiene el avance y conserva controles e indicadores', () => {
  const g = galeria();
  const indicators = g.get('.slider-indicadores').children;
  assert.equal(g.timers.size, 1);
  g.pause.events.get('click')();
  assert.equal(g.timers.size, 0);
  assert.equal(g.pause.attrs['aria-label'], 'Reanudar galería');
  g.emit('.slider-siguiente', 'click');
  assert.match(g.get('.slider-contador').textContent, /02 \/ 02/);
  assert.equal(g.timers.size, 0);
  assert.equal(g.get('.slider-indicadores').children, indicators);
  g.pause.events.get('click')();
  g.advance();
  assert.match(g.get('.slider-contador').textContent, /01 \/ 02/);
});

test('movimiento reducido no inicia ni avanza imágenes o videos automáticamente', () => {
  const images = galeria({ reduced: true });
  assert.equal(images.timers.size, 0);
  const video = galeria({ reduced: true, items: [{ type: 'video', src: 'video.mp4', title: 'Recorrido' }] });
  assert.equal(video.get('.slider-medio').media.plays || 0, 0);
  assert.ok(video.get('.slider-medio').innerHTML.includes(' controls '));
  video.get('.slider-medio').media.events.get('ended')();
  assert.equal(video.timers.size, 0);
});

test('foco, puntero y pestaña oculta suspenden el carrusel sin anular la pausa manual', () => {
  const g = galeria();
  g.emit('.slider-galeria', 'mouseenter');
  assert.equal(g.timers.size, 0);
  g.emit('.slider-galeria', 'mouseleave');
  assert.equal(g.timers.size, 1);
  g.doc.activeElement = { inGallery: true };
  g.emit('.slider-galeria', 'focusin');
  assert.equal(g.timers.size, 0);
  g.doc.activeElement = null;
  g.doc.hidden = true;
  g.listeners.get('visibilitychange')();
  assert.equal(g.timers.size, 0);
  g.pause.events.get('click')();
  g.doc.hidden = false;
  g.listeners.get('visibilitychange')();
  assert.equal(g.timers.size, 0);
});

test('flechas solo actúan dentro de la galería y no interfieren con formularios', () => {
  const g = galeria();
  let prevented = false;
  const event = { key: 'ArrowRight', target: { closest: () => null }, preventDefault: () => { prevented = true; } };
  g.listeners.get('keydown')(event);
  assert.equal(prevented, false);
  g.doc.activeElement = { inGallery: true };
  g.listeners.get('keydown')(event);
  assert.equal(prevented, true);
  assert.match(g.get('.slider-contador').textContent, /02 \/ 02/);
  event.target.closest = () => ({});
  g.listeners.get('keydown')(event);
  assert.match(g.get('.slider-contador').textContent, /02 \/ 02/);
});

test('galería vacía y errores de medios muestran estados explícitos', () => {
  const empty = galeria({ items: [] });
  assert.equal(empty.pause.disabled, true);
  assert.equal(empty.timers.size, 0);
  assert.match(empty.get('.slider-estado').textContent, /todavía no tiene/);
  const g = galeria();
  g.get('.slider-medio').media.events.get('error')();
  assert.equal(g.timers.size, 0);
  assert.match(g.get('.slider-estado').textContent, /No se pudo cargar/);
});
