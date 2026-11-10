import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'dist');

// Archivos que viven en el repositorio como fuente de trabajo, pero no deben
// publicarse: originales pesados de fotos y material sin referencias.
const noPublicar = [
  resolve(root, 'assets/images/Madera/Foto de '),
  resolve(root, 'assets/images/image.png')
];

await rm(output, { recursive: true, force: true });
await mkdir(output);

for (const file of await readdir(root)) {
  if (file.endsWith('.html')) await cp(resolve(root, file), resolve(output, file));
}

await cp(resolve(root, 'assets'), resolve(output, 'assets'), {
  recursive: true,
  filter: source => !noPublicar.some(prefix => source.startsWith(prefix))
});

// Archivos estáticos que no son HTML ni assets (robots, sitemap, 404, etc.).
try {
  await cp(resolve(root, 'public'), output, { recursive: true });
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

console.log('Sitio público generado en dist/: HTML, assets optimizados y archivos de public/ sin fuentes, pruebas ni dependencias.');
