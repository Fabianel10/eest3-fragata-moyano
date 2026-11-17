import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat, access } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const gallery = JSON.parse(await readFile(new URL('assets/cms/obras-galeria.json', root), 'utf8'));
const catalog = JSON.parse(await readFile(new URL('assets/cms/catalogo.json', root), 'utf8'));

test('Obras: galería MMO optimizada, portadas específicas y sin nombres personales', async () => {
  assert.equal(gallery.length, 7);
  assert.deepEqual(catalog.obras.defaults.modules.gallery, gallery);
  assert.equal(gallery.filter((item) => item.type === 'video').length, 1);
  for (const item of gallery) {
    assert.match(item.src, /^assets\/images\/MMO\/obras-(0[1-6]\.webp|recorrido\.mp4)$/);
    assert.doesNotMatch(item.title, /Jorge|Siles|Guzmán/);
    const info = await stat(new URL(item.src, root));
    if (item.type === 'video') assert.ok(info.size < 1024 * 1024);
    else assert.ok(info.size < 300 * 1024);
  }
  const obras = await readFile(new URL('obras.html', root), 'utf8');
  const informatica = await readFile(new URL('informatica.html', root), 'utf8');
  const madera = await readFile(new URL('madera.html', root), 'utf8');
  assert.match(obras, /assets\/images\/MMO\/obras-02\.webp/);
  assert.match(informatica, /IMG_20260915_111543434_MFNR\.jpg/);
  assert.match(madera, /assets\/images\/Madera\/taller-01\.webp/);
  assert.doesNotMatch(obras, /IMG-20260917-WA0151\.jpg/);
  assert.equal(catalog.informatica.defaults.blocks[0].fields.f101.value,
    'assets/images/imagenes%20nuevas/IMG_20260915_111543434_MFNR.jpg');
  assert.equal(catalog.madera.defaults.blocks[0].fields.f101.value, 'assets/images/Madera/taller-01.webp');
  assert.equal(catalog.obras.defaults.blocks[0].fields.f101.value, 'assets/images/MMO/obras-02.webp');
  for (const file of ['assets/images/MMO/obras-01.webp', 'assets/images/MMO/obras-06.webp',
    'assets/images/MMO/obras-recorrido.mp4', 'assets/cms/obras-galeria.json']) {
    await access(new URL(file, root));
  }
  await assert.rejects(access(new URL('assets/images/MMO/Foto de Jorge Fabián Siles Guzmán.jpg', root)), { code: 'ENOENT' });
});
