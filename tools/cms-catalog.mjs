import { parse } from 'parse5';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { ARCHIVOS, validarDocumento } from '../assets/js/cms-modelo.mjs';

const root = new URL('../', import.meta.url);
const catalogo = {};
const soloCarreras = process.argv.includes('--carreras');
if (soloCarreras) Object.assign(catalogo, JSON.parse(await readFile(new URL('assets/cms/catalogo.json', root), 'utf8')));
const carreras = ['informatica', 'madera', 'obras'];
const omitidos = new Set(['script', 'style', 'audio', 'video', 'input', 'textarea', 'select', 'option']);
const dinamicos = [
  'clima-hoy', 'clima-compacto', 'contador-visitas', 'fecha-actual', 'slider-medio', 'slider-tipo',
  'slider-titulo', 'slider-contador', 'slider-estado', 'slider-indicadores', 'reproductor-tema',
  'reproductor-estado', 'reproductor-controles', 'reproductor-progreso', 'lista-reproduccion',
  'calendario-proximas', 'selector-meses', 'grilla-dias', 'detalle-fechas', 'destacado-calendario',
  'calendario-mes-titulo', 'interruptor-tema', 'boton-menu'
];
const attr = (node, name) => node?.attrs?.find((item) => item.name === name)?.value || '';
const hijos = (node) => (node.childNodes || []).filter((item) => item.tagName);
function encontrar(node, tag) {
  if (node.tagName === tag) return node;
  for (const child of node.childNodes || []) {
    const found = encontrar(child, tag);
    if (found) return found;
  }
}
function selector(node) {
  if (['header', 'main', 'footer'].includes(node.tagName)) return node.tagName;
  const siblings = hijos(node.parentNode);
  return `${selector(node.parentNode)} > ${node.tagName}:nth-child(${siblings.indexOf(node) + 1})`;
}
function texto(node) {
  return (node.childNodes || []).map((child) => child.nodeName === '#text' ? child.value : texto(child)).join('').replace(/\s+/g, ' ').trim();
}
function literal(source, name) {
  const match = source.match(new RegExp(`const ${name} = (\\[[\\s\\S]*?\\n\\]);`));
  if (!match) throw new Error(`No se encontró ${name}`);
  return runInNewContext(match[1], {}, { timeout: 1000 });
}
const calendarSource = await readFile(new URL('assets/js/calendario.js', root), 'utf8');
const gallerySource = await readFile(new URL('assets/js/galeria.js', root), 'utf8');
const homeSource = await readFile(new URL('assets/js/script.js', root), 'utf8');
const eventos = literal(calendarSource, 'calendarEvents').map(([date, title, type]) => ({
  date, title, type, description: '', image: ''
}));
const galeria = literal(gallerySource, 'galleryItems').map(({ type, file, title }) => ({
  type, src: `assets/images/imagenes%20nuevas/${encodeURIComponent(file)}`, title
}));
const playlist = literal(homeSource, 'playlist').map(({ title, source }) => ({ title, src: source }));
const maderaGallery = JSON.parse(await readFile(new URL('assets/cms/madera-galeria.json', root), 'utf8'));

for (const [slug, filename] of Object.entries(ARCHIVOS)) {
  if (soloCarreras && !carreras.includes(slug)) continue;
  const tree = parse(await readFile(new URL(filename, root), 'utf8'));
  const main = encontrar(tree, 'main');
  const defaults = {
    version: 1, title: texto(encontrar(tree, 'title')), description: '',
    chrome: {}, blocks: [],
    modules: {
      year: 2026, gallery: slug === 'madera' ? maderaGallery : slug === 'galeria' ? galeria : carreras.includes(slug) ? galeria.slice(0, 2) : [],
      events: ['inicio', 'calendario'].includes(slug) ? eventos : [],
      playlist
    }
  };
  const head = encontrar(tree, 'head');
  defaults.description = attr(hijos(head).find((n) => attr(n, 'name') === 'description'), 'content');
  const descriptors = { chrome: {}, blocks: {} };
  let counter = 0;
  function recorrer(node, fields, fieldsDescriptors) {
    if (!node.tagName || omitidos.has(node.tagName) ||
      attr(node, 'class').split(' ').some((clase) => dinamicos.includes(clase))) return;
    const path = selector(node);
    const agregar = (campo, descriptor) => {
      const key = `f${++counter}`;
      fields[key] = campo;
      fieldsDescriptors[key] = { selector: path, label: texto(node).slice(0, 70) || attr(node, 'alt') || node.tagName, ...descriptor };
    };
    if (node.tagName === 'img' && attr(node, 'src')) {
      agregar({ kind: 'image', value: attr(node, 'src').replaceAll(' ', '%20'), alt: attr(node, 'alt') }, { kind: 'image' });
    }
    if (node.tagName === 'a' && attr(node, 'href')) {
      agregar({ kind: 'link', value: attr(node, 'href').replaceAll(' ', '%20') }, { kind: 'link' });
    }
    (node.childNodes || []).forEach((child, index) => {
      if (child.nodeName === '#text' && child.value.trim()) {
        agregar({ kind: 'text', value: child.value.replace(/\s+/g, ' ').trim() }, { kind: 'text', textIndex: index });
      } else if (child.tagName) recorrer(child, fields, fieldsDescriptors);
    });
  }
  recorrer(encontrar(tree, 'header'), defaults.chrome, descriptors.chrome);
  recorrer(encontrar(tree, 'footer'), defaults.chrome, descriptors.chrome);
  hijos(main).forEach((section, index) => {
    const id = `b${index}`;
    const block = { id, source: id, kind: 'original', label: texto(section).slice(0, 65),
      hidden: false, theme: 'claro', layout: 'derecha', fields: {}, cards: [] };
    const descriptor = { selector: selector(section), fields: {} };
    recorrer(section, block.fields, descriptor.fields);
    if (slug === 'inicio' && index === 0 || slug === 'historia' && index === 0) {
      const key = `f${++counter}`;
      const path = slug === 'inicio' ? '.hero' : '.historia-hero-imagen';
      block.fields[key] = { kind: 'background', value: slug === 'inicio' ? 'assets/images/ecuela.jpg' : 'assets/images/IMG-20260917-WA0151.jpg' };
      descriptor.fields[key] = { selector: path, kind: 'background', label: 'Imagen de portada' };
    }
    defaults.blocks.push(block);
    descriptors.blocks[id] = descriptor;
  });
  validarDocumento(defaults);
  catalogo[slug] = { filename, defaults, descriptors };
}
await mkdir(new URL('assets/cms/', root), { recursive: true });
await writeFile(new URL('assets/cms/catalogo.json', root), `${JSON.stringify(catalogo, null, 2)}\n`);
const manifest = (fields) => Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value.kind]));
const templates = Object.entries(catalogo).filter(([slug]) => !soloCarreras || carreras.includes(slug)).map(([slug, page]) => {
  const data = {
    chrome: manifest(page.defaults.chrome),
    blocks: Object.fromEntries(page.defaults.blocks.map((block) => [block.source, manifest(block.fields)]))
  };
  return `insert into public.cms_templates(slug, manifest) values ('${slug}', '${JSON.stringify(data)}'::jsonb)\non conflict (slug) do update set manifest = excluded.manifest;`;
});
if (soloCarreras) {
  const editorial = await readFile(new URL('supabase/migrations/202610060002_editorial.sql', root), 'utf8');
  const start = editorial.indexOf('create function public.cms_save_draft(');
  const end = editorial.indexOf('create function public.cms_publish(', start);
  if (start < 0 || end < 0) throw new Error('No se encontró la función editorial original.');
  const allowed = "'inicio', 'historia', 'galeria', 'calendario', 'informatica', 'madera', 'obras'";
  const fn = editorial.slice(start, end).replace('create function', 'create or replace function')
    .replace("'inicio', 'historia', 'galeria', 'calendario'", allowed);
  await writeFile(new URL('supabase/migrations/202610060004_carreras.sql', root),
    `-- Incremental migration: preserves existing templates, drafts and publications.\nbegin;\nalter table public.cms_pages drop constraint cms_pages_slug_check;\nalter table public.cms_pages add constraint cms_pages_slug_check check (slug in (${allowed}));\n${fn}\n${templates.join('\n\n')}\ncommit;\n`);
} else {
  await writeFile(new URL('supabase/migrations/202610060003_catalogo.sql', root),
    `-- Generated by npm run cms:catalog. Apply after the editorial migration.\nbegin;\n${templates.join('\n\n')}\ncommit;\n`);
}
console.log(`Catálogo editorial generado (${soloCarreras ? 'tres nuevas carreras; plantillas anteriores conservadas' : 'todas las páginas'}).`);
