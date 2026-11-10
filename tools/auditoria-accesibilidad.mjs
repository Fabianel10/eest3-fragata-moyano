import { readFile, readdir, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'parse5';

const root = resolve(import.meta.dirname, '..');
const attrs = (node) => Object.fromEntries((node.attrs || []).map((a) => [a.name, a.value]));
const walk = (node, fn) => { fn(node); for (const child of node.childNodes || []) walk(child, fn); };
const text = (node) => (node.childNodes || []).map((child) => child.nodeName === '#text' ? child.value : text(child)).join('').replace(/\s+/g, ' ').trim();
const nameOf = (node) => {
  const a = attrs(node);
  const label = a['aria-label'] || a.title || '';
  const labelledBy = (a['aria-labelledby'] || '').split(/\s+/).filter(Boolean);
  const textName = text(node);
  const img = [];
  walk(node, (child) => { if (child.tagName === 'img' && attrs(child).alt) img.push(attrs(child).alt); });
  return (label || textName || img.join(' ') || (labelledBy.length ? 'aria-labelledby' : '')).trim();
};
const inLabel = (node) => { let parent = node.parentNode; while (parent) { if (parent.tagName === 'label') return true; parent = parent.parentNode; } return false; };
const hidden = (a) => a.hidden !== undefined || a['aria-hidden'] === 'true';
const files = (await readdir(root)).filter((file) => file.endsWith('.html')).sort();
let errors = 0;
for (const file of files) {
  const html = await readFile(resolve(root, file), 'utf8');
  const tree = parse(html);
  const ids = new Map();
  const labels = new Set();
  const problems = [];
  walk(tree, (node) => {
    const a = attrs(node);
    if (a.id) {
      if (ids.has(a.id)) problems.push(`ID duplicado: ${a.id}`);
      ids.set(a.id, node);
    }
    if (node.tagName === 'label' && a.for) labels.add(a.for);
  });
  let h1 = 0;
  walk(tree, (node) => {
    const a = attrs(node);
    if (node.tagName === 'html' && !a.lang) problems.push('Falta lang en <html>');
    if (node.tagName === 'h1') h1 += 1;
    if (node.tagName === 'img' && a.alt === undefined) problems.push(`Imagen sin alt: ${a.src || '(sin src)'}`);
    if (node.tagName === 'iframe' && !a.title) problems.push(`Iframe sin title: ${a.src || ''}`);
    if (node.tagName === 'video' && !html.includes('kind="captions"')) problems.push('Video sin pista de subtítulos');
    if (['input', 'select', 'textarea'].includes(node.tagName) && !hidden(a)) {
      const type = a.type || 'text';
      if (!(node.tagName === 'input' && ['hidden', 'submit', 'button', 'reset'].includes(type))) {
        const labelled = a['aria-label'] || a['aria-labelledby'] || a.title || (a.id && labels.has(a.id)) || inLabel(node);
        if (!labelled) problems.push(`Control sin etiqueta: ${a.name || a.id || node.tagName}`);
      }
    }
    if (node.tagName === 'button' && !nameOf(node)) problems.push('Botón sin nombre accesible');
    if (node.tagName === 'a' && a.href && !nameOf(node)) problems.push(`Enlace sin nombre accesible: ${a.href}`);
    if (a['aria-controls']) for (const id of a['aria-controls'].split(/\s+/)) if (id && !ids.has(id)) problems.push(`aria-controls inexistente: ${id}`);
    if (a['aria-labelledby']) for (const id of a['aria-labelledby'].split(/\s+/)) if (id && !ids.has(id)) problems.push(`aria-labelledby inexistente: ${id}`);
    if (a.tabindex && Number(a.tabindex) > 0) problems.push(`tabindex positivo: ${a.tabindex}`);
  });
  if (h1 !== 1) problems.push(`Cantidad de h1: ${h1}`);
  if (problems.length) {
    errors += problems.length;
    console.log(`\n${file}`);
    for (const problem of [...new Set(problems)]) console.log('  -', problem);
  }
}
try {
  await access(resolve(root, 'assets/captions/recorrido-escuela.vtt'));
  console.log('\nPista de subtítulos: assets/captions/recorrido-escuela.vtt');
} catch { errors += 1; console.log('\nFalta la pista de subtítulos.'); }
console.log(`\n${errors ? `${errors} hallazgo(s) de accesibilidad.` : 'Sin hallazgos automáticos de accesibilidad.'}`);
process.exitCode = errors ? 1 : 0;
