import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';

test('guías vigentes enlazan archivos existentes y el workflow real de verificación', async () => {
  const root = new URL('../', import.meta.url);
  const files = ['README.md', 'CONTRIBUTING.md', 'CHANGELOG.md',
    ...(await readdir(new URL('docs/', root))).filter(file => file.endsWith('.md')).map(file => `docs/${file}`)];
  for (const file of files) {
    const url = new URL(file, root);
    const markdown = await readFile(url, 'utf8');
    for (const match of markdown.matchAll(/\]\(([^()\s]+)\)/g)) {
      const target = match[1].split('#')[0];
      if (!target || /^[a-z]+:\/\//i.test(target)) continue;
      await assert.doesNotReject(access(new URL(target, url)), `${file}: enlace roto a ${target}`);
    }
  }
  const readme = await readFile(new URL('README.md', root), 'utf8');
  assert.ok(readme.includes('actions/workflows/verificar.yml/badge.svg'));
  await access(new URL('.github/workflows/verificar.yml', root));
});
