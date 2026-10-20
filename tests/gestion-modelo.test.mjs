import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePost, safeAttachment, searchPattern } from '../assets/js/gestion-modelo.mjs';
import { createCalendar } from '../assets/js/calendario-export.mjs';
const post = { kind: 'documento', title: 'Documento vigente', body: 'Descripción del documento publicado.',
  career: 'informatica', audience: 'familias', attachment_url: 'https://example.invalid/formulario.pdf',
  attachment_label: 'Formulario v1', published_at: null, expires_at: null };
test('publicaciones validan límites y enlaces sin credenciales', () => {
  assert.doesNotThrow(() => validatePost(post));
  for (const data of [
    { title: 'xx' }, { title: 'x'.repeat(201) }, { body: 'x'.repeat(20001) }, { kind: 'constructor' },
    { career: '__proto__' }, { audience: 'todos' }, { attachment_url: 'javascript:alert(1)' },
    { attachment_url: 'https://user:password@example.invalid/' }, { attachment_label: '' },
    { published_at: '2026-10-21', expires_at: '2026-10-20' }, { published_at: 'invalid' }
  ]) assert.throws(() => validatePost({ ...post, ...data }));
  assert.equal(safeAttachment('https://example.invalid/documento.pdf'), true);
  for (const url of ['javascript:alert(1)', 'data:text/html,test', '//example.invalid', 'https://user:pass@example.invalid']) assert.equal(safeAttachment(url), false);
  assert.equal(searchPattern('100%_\\'), '%100\\%\\_\\\\%');
});
test('exportación iCalendar: año seleccionado, fin exclusivo, escape y UTF-8 plegado', () => {
  const events = [
    { date: '2026-12-31', title: 'Título, con; puntuación\nBEGIN:BAD', description: 'ñ'.repeat(100) },
    { date: '2027-01-01', title: 'Otro ciclo' }
  ];
  const ics = createCalendar(events, 2026, new Date('2026-10-20T12:00:00Z'));
  assert.ok(ics.includes('DTEND;VALUE=DATE:20270101\r\n'));
  assert.ok(!ics.includes('Otro ciclo'));
  assert.ok(!ics.includes('\r\nBEGIN:BAD'));
  assert.ok(ics.includes('SUMMARY:Título\\, con\\; puntuación\\nBEGIN:BAD'));
  assert.ok(ics.split('\r\n').every(line => new TextEncoder().encode(line).length <= 75));
  assert.throws(() => createCalendar([{ date: '2026-02-30', title: 'Inválida' }], 2026), /Fecha/);
  const leap = createCalendar([{ date: '2028-02-29', title: 'Bisiesto' }], 2028);
  assert.match(leap, /DTEND;VALUE=DATE:20280301/);
  assert.throws(() => createCalendar([], 2101), /Año/);
  assert.throws(() => createCalendar([{ date: '2026-01-01', title: 'Una' }, { date: '2026-01-01', title: 'Otra' }], 2026), /duplicada/);
});
