import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'parse5';

const root = new URL('../', import.meta.url);
const publicas = [
  'index.html', 'historia.html', 'galeria.html', 'calendario.html',
  'informatica.html', 'madera.html', 'obras.html', 'novedades.html',
  'comunidad.html', 'privacidad.html', 'buscador.html'
];
const privadas = ['admin.html', 'gestion.html', 'notificaciones.html'];
const attrs = (node) => Object.fromEntries((node.attrs || []).map((attr) => [attr.name, attr.value]));
const walk = (node, fn) => {
  fn(node);
  for (const child of node.childNodes || []) walk(child, fn);
};

test('las páginas públicas declaran descripción, canonical y Open Graph', async () => {
  for (const file of publicas) {
    const html = await readFile(new URL(file, root), 'utf8');
    assert.match(html, /<meta\s+name="description"\s+content="[^"]+"/, `${file}: falta description`);
    assert.match(html, /rel="canonical"\s+href="https:\/\/eest3sf\.netlify\.app\//, `${file}: falta canonical`);
    assert.match(html, /property="og:title"/, `${file}: falta og:title`);
    assert.match(html, /property="og:image"/, `${file}: falta og:image`);
  }
  for (const file of privadas) {
    const html = await readFile(new URL(file, root), 'utf8');
    assert.match(html, /name="robots" content="noindex/i, `${file}: debe seguir fuera de buscadores`);
  }
});

test('todos los recursos locales referenciados existen', async () => {
  const files = [...publicas, ...privadas];
  for (const file of files) {
    const tree = parse(await readFile(new URL(file, root), 'utf8'));
    const referencias = [];
    walk(tree, (node) => {
      const values = attrs(node);
      for (const name of ['src', 'href']) {
        const value = values[name];
        if (!value || /^(#|https?:|mailto:|tel:|data:|javascript:)/i.test(value)) continue;
        if (['/feed.xml', '/calendario.ics'].includes(value.split(/[?#]/)[0])) continue;
        if (name === 'href' && node.tagName === 'a') continue;
        referencias.push(value.split(/[?#]/)[0]);
      }
    });
    for (const value of referencias) {
      const limpio = decodeURIComponent(value);
      const path = resolve(root.pathname, limpio);
      const publicPath = resolve(root.pathname, 'public', limpio.replace(/^\.?\//, ''));
      assert.ok(existsSync(path) || existsSync(publicPath), `${file}: recurso inexistente ${value}`);
    }
  }
});

test('no quedan imágenes de terceros ni contenido de ejemplo en la portada', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.doesNotMatch(html, /images\.unsplash\.com/);
  const catalogo = await readFile(new URL('assets/cms/catalogo.json', root), 'utf8');
  assert.doesNotMatch(catalogo, /images\.unsplash\.com/);
});

test('el sitio incluye robots, sitemap, 404 y presupuesto de medios', async () => {
  for (const file of ['public/robots.txt', 'public/sitemap.xml', 'public/404.html']) {
    await assert.doesNotReject(stat(new URL(file, root)), `${file} no existe`);
  }
  const robots = await readFile(new URL('public/robots.txt', root), 'utf8');
  assert.match(robots, /Sitemap:/);
  assert.match(robots, /Disallow: \/admin\.html/);
  const sitemap = await readFile(new URL('public/sitemap.xml', root), 'utf8');
  assert.match(sitemap, /https:\/\/eest3sf\.netlify\.app\/madera\.html/);
  assert.match(sitemap, /https:\/\/eest3sf\.netlify\.app\/buscador\.html/);
  assert.doesNotMatch(sitemap, /admin\.html|gestion\.html|notificaciones\.html/);

  const galeria = await readFile(new URL('assets/js/galeria.js', root), 'utf8');
  for (const match of galeria.matchAll(/file: '([^']+)'/g)) {
    const file = new URL(`assets/images/imagenes nuevas/${match[1]}`, root);
    const info = await stat(file);
    assert.ok(info.size < 1.5 * 1024 * 1024, `${match[1]} supera 1,5 MB`);
  }
  const video = await stat(new URL('assets/images/imagenes nuevas/VID_20260915_113715685.mp4', root));
  assert.ok(video.size < 3 * 1024 * 1024, 'el video institucional supera 3 MB');
  const audio = await stat(new URL('assets/audio/AUD-20260901-WA0078.mp3', root));
  assert.ok(audio.size < 5 * 1024 * 1024, 'el audio principal supera 5 MB');
  const logo = await stat(new URL('assets/images/logo.png', root));
  assert.ok(logo.size < 100 * 1024, 'el logo supera 100 KB');
});

test('las referencias a imágenes y audio del código y el catálogo existen', async () => {
  const archivos = [
    ...(await readdir(new URL('assets/js/', root))).filter((f) => /\.(m?js)$/.test(f)).map((f) => `assets/js/${f}`),
    ...(await readdir(new URL('assets/cms/', root))).filter((f) => f.endsWith('.json')).map((f) => `assets/cms/${f}`),
    ...[...publicas, ...privadas]
  ];
  for (const file of archivos) {
    const text = await readFile(new URL(file, root), 'utf8');
    for (const match of text.matchAll(/assets\/(?:images|audio)\/[^"'`<>\n]+/g)) {
      if (match[0].includes('${')) continue;
      const limpio = match[0].split(/[?#]/)[0].replace(/[.,;:\\]+$/, '');
      let path;
      try { path = decodeURIComponent(limpio); } catch { continue; }
      assert.ok(existsSync(resolve(root.pathname, path)), `${file}: recurso inexistente ${limpio}`);
    }
  }
});

test('no hay identificadores duplicados ni anclas internas rotas', async () => {
  for (const file of [...publicas, ...privadas]) {
    const tree = parse(await readFile(new URL(file, root), 'utf8'));
    const ids = new Set();
    const duplicados = [];
    const anclas = [];
    walk(tree, (node) => {
      const values = attrs(node);
      if (values.id) {
        if (ids.has(values.id)) duplicados.push(values.id);
        ids.add(values.id);
      }
    });
    walk(tree, (node) => {
      const values = attrs(node);
      if (node.tagName === 'a' && values.href?.startsWith('#')) {
        const id = values.href.slice(1);
        if (id && !ids.has(id)) anclas.push(values.href);
      }
    });
    assert.deepEqual(duplicados, [], `${file}: IDs duplicados`);
    assert.deepEqual(anclas, [], `${file}: anclas internas sin destino`);
  }
});

test('la configuración de Netlify declara seguridad y caché', async () => {
  const config = await readFile(new URL('netlify.toml', root), 'utf8');
  assert.match(config, /Content-Security-Policy/);
  assert.match(config, /X-Content-Type-Options/);
  assert.match(config, /Cache-Control = "public, max-age=604800/);
  assert.match(config, /publish = "dist"/);
  assert.match(config, /directory = "netlify\/functions"/);
  assert.match(config, /application\/manifest\+json/);
  assert.match(config, /Service-Worker-Allowed/);
});

test('las páginas del CMS cargan un único módulo de tema', async () => {
  const cms = await readFile(new URL('assets/js/cms-publico.mjs', root), 'utf8');
  assert.equal((cms.match(/'tema\.js'/g) || []).length, 7);
  for (const file of ['assets/js/galeria.js', 'assets/js/calendario.js', 'assets/js/historia.js']) {
    const code = await readFile(new URL(file, root), 'utf8');
    assert.doesNotMatch(code, /tema-eest3/, `${file}: todavía duplica la lógica de tema`);
  }
});

test('los archivos de la raíz no publican originales ni material sin referencia', async () => {
  const archivos = await readdir(new URL('public/', root));
  assert.deepEqual(archivos.sort(), ['404.html', 'icons', 'manifest.webmanifest', 'offline.html', 'robots.txt', 'sitemap.xml', 'sw.js']);
});
