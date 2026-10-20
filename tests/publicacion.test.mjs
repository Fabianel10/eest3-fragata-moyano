import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat, access, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { validarDocumento, urlSegura } from '../assets/js/cms-modelo.mjs';

const root = new URL('../', import.meta.url);
test('Madera incluye las cinco fotos autorizadas, optimizadas y sin nombres personales', async () => {
  const gallery = JSON.parse(await readFile(new URL('assets/cms/madera-galeria.json', root), 'utf8'));
  const catalog = JSON.parse(await readFile(new URL('assets/cms/catalogo.json', root), 'utf8'));
  assert.equal(gallery.length, 5);
  assert.deepEqual(catalog.madera.defaults.modules.gallery, gallery);
  validarDocumento(catalog.madera.defaults);
  for (const [i, item] of gallery.entries()) {
    assert.equal(item.src, `assets/images/Madera/taller-0${i + 1}.webp`);
    assert.ok(urlSegura(item.src, 'image'));
    assert.equal(item.type, 'image');
    assert.ok(item.title.length > 20);
    assert.ok((await stat(new URL(item.src, root))).size < 250 * 1024);
  }
});
test('el paquete público excluye código de pruebas, fuentes y originales de fotos', async () => {
  execFileSync(process.execPath, ['tools/build.mjs'], { cwd: root });
  for (const file of ['index.html','madera.html','admin.html','comunidad.html','gestion.html','novedades.html','notificaciones.html','assets/js/notificaciones.mjs','assets/js/skynet.mjs','assets/js/skynet-modelo.mjs','assets/css/skynet.css','assets/js/calendario-export.mjs','assets/js/gestion-admin.mjs','assets/cms/catalogo.json','assets/images/Madera/taller-05.webp']) {
    await access(new URL(`dist/${file}`, root));
  }
  for (const file of ['assets/images/skynet.png', 'assets/js/skynet-servicios.mjs']) {
    await access(new URL(`dist/${file}`, root));
  }
  for (const file of ['node_modules','tests','supabase','docs','netlify','.git','.netlify','.vscode','tools','package.json']) {
    await assert.rejects(access(new URL(`dist/${file}`, root)), { code: 'ENOENT' });
  }
  assert.deepEqual((await readdir(new URL('dist/assets/images/Madera/', root))).sort(),
    Array.from({length:5}, (_,i)=>`taller-0${i+1}.webp`));
});
