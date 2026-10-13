import { readFile, writeFile } from 'node:fs/promises';
import { validarDocumento } from '../assets/js/cms-modelo.mjs';

const path = new URL('../assets/cms/catalogo.json', import.meta.url);
const catalog = JSON.parse(await readFile(path, 'utf8'));
catalog.madera.defaults.modules.gallery = JSON.parse(
  await readFile(new URL('../assets/cms/madera-galeria.json', import.meta.url), 'utf8')
);
validarDocumento(catalog.madera.defaults);
const galleryBlock = catalog.madera.defaults.blocks.find(block =>
  catalog.madera.descriptors.blocks[block.source]?.selector === 'main > section:nth-child(11)'
);
if (!galleryBlock) throw new Error('No se encontró la sección original de galería de Madera.');
const intro = Object.values(galleryBlock.fields).find(field =>
  field.kind === 'text' && field.value.startsWith('Recorrido institucional de referencia.')
);
if (intro) intro.value = 'Conocé el taller de Industrialización de la Madera y el Mueble: bancos, herramientas, equipos y piezas en elaboración. Cinco fotografías aportadas para esta entrega, con difusión autorizada.';
await writeFile(path, `${JSON.stringify(catalog, null, 2)}\n`);
console.log('Galería de Madera actualizada; manifiestos y demás páginas conservados.');
