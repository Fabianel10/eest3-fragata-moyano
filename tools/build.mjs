import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'dist');
await rm(output, { recursive: true, force: true });
await mkdir(output);
for (const file of await readdir(root)) {
  if (file.endsWith('.html')) await cp(resolve(root, file), resolve(output, file));
}
await cp(resolve(root, 'assets'), resolve(output, 'assets'), {
  recursive: true,
  filter: source => !source.startsWith(resolve(root, 'assets/images/Madera/Foto de '))
});
console.log('Sitio público generado en dist/: HTML y assets, sin fuentes, pruebas ni dependencias.');
