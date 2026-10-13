import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parse } from 'parse5';
import { planes } from '../tools/carreras-datos.mjs';

const expected = {
  informatica: { totals: [1260,1260,1260,972], counts: [14,13,14,8], total: 4752 },
  madera: { totals: [1152,1152,1152,1080], counts: [13,11,11,8], total: 4536 },
  obras: { totals: [1332,1332,1332,1224], counts: [15,13,13,7], total: 5220 }
};
test('materias, campos y horas respetan las tablas de los documentos aportados', () => {
  for (const [slug, plan] of Object.entries(planes)) {
    assert.deepEqual(plan.years.map(y=>y.number), [4,5,6,7]);
    assert.deepEqual(plan.years.map(y=>y.groups.flatMap(g=>g.subjects).length), expected[slug].counts);
    const totals = plan.years.map(y=>y.groups.flatMap(g=>g.subjects).reduce((sum,[,h])=>sum+h,0));
    assert.deepEqual(totals, expected[slug].totals);
    assert.equal(totals.reduce((sum,h)=>sum+h,0), expected[slug].total);
    assert.equal(plan.total, expected[slug].total);
    assert.equal(plan.years[3].groups.find(g=>g.label==='Prácticas profesionalizantes').subjects[0][1], 216);
  }
  assert.equal(planes.madera.years[0].groups[0].subjects.at(-1)[0], 'Filosofía');
  assert.ok(planes.obras.reference.includes('2018-31695509'));
  assert.ok(!planes.obras.reference.includes('2025'));
});
function nodes(root, predicate) {
  return [...(predicate(root) ? [root] : []), ...(root.childNodes || []).flatMap(n=>nodes(n,predicate))];
}
const text = node => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(text).join('');
test('las páginas incluyen todas las materias, referencias y servicios sin rutas locales rotas', async () => {
  for (const [slug, plan] of Object.entries(planes)) {
    const html = await readFile(new URL(`../${slug}.html`, import.meta.url), 'utf8');
    const tree = parse(html);
    assert.equal(nodes(tree,n=>n.tagName==='table').length, 12);
    const subjects = nodes(tree,n=>n.tagName==='th' && n.attrs.some(a=>a.name==='scope' && a.value==='row')).map(text);
    assert.deepEqual(subjects, plan.years.flatMap(y=>y.groups.flatMap(g=>g.subjects.map(([name])=>name))));
    assert.ok(html.includes(plan.reference));
    assert.ok(html.includes('data-weather-component'));
    assert.ok(html.includes('audio-reproductor'));
    assert.ok(html.includes('numero-visitas'));
    assert.ok(html.includes('redes-sociales'));
    assert.ok(html.includes('Horarios y equipo docente'));
    for (const node of nodes(tree,n=>['img','script','link'].includes(n.tagName))) {
      const src = node.attrs.find(a=>['src','href'].includes(a.name))?.value;
      if (!src || /^(https:|#)/.test(src)) continue;
      await readFile(new URL(`../${decodeURIComponent(src.split('?')[0])}`, import.meta.url));
    }
  }
});
