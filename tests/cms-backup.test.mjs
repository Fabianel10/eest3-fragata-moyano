import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createCmsBackup, parseCmsBackup, backupFilename } from '../assets/js/cms-backup.mjs';

const catalogo = JSON.parse(await readFile(new URL('../assets/cms/catalogo.json', import.meta.url), 'utf8'));

test('respaldo exporta metadatos y conserva un documento válido', () => {
  const backup = createCmsBackup('madera', catalogo.madera.defaults, {
    draftVersion: 3, publishedVersion: 2, exportedAt: '2026-10-13T15:15:00.000Z'
  });
  assert.equal(backup.slug, 'madera');
  assert.equal(backup.page, 'Industrialización de la Madera y el Mueble');
  assert.equal(backup.server.draft_version, 3);
  assert.equal(backup.server.published_version, 2);
  assert.equal(backup.document.title, catalogo.madera.defaults.title);
});

test('respaldo importado valida formato y slug permitidos', () => {
  const backup = JSON.stringify(createCmsBackup('inicio', catalogo.inicio.defaults));
  const parsed = parseCmsBackup(backup);
  assert.equal(parsed.slug, 'inicio');
  assert.equal(parsed.page, 'Inicio');
  assert.throws(() => parseCmsBackup('{"version":1,"slug":"inventada","exported_at":"2026-10-13T15:15:00Z","document":{}}'), /conocida/);
  assert.throws(() => parseCmsBackup('{"slug":"inicio"}'), /formato/);
});

test('nombre de respaldo usa slug y fecha seguras', () => {
  assert.equal(backupFilename('galeria', '2026-10-13T15:15:00.000Z'), 'cms-galeria-2026-10-13T15-15-00Z.json');
});
