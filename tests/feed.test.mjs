import test from 'node:test';
import assert from 'node:assert/strict';
import { generarRss, escaparXml } from '../netlify/lib/feed.mjs';

test('RSS: XML válido, escape y enlaces de publicaciones', () => {
  assert.equal(escaparXml('<a & "b">'), '&lt;a &amp; &quot;b&quot;&gt;');
  const rss = generarRss([{
    id: '00000000-0000-4000-8000-000000000001',
    title: 'Aviso <importante>',
    body: 'Texto & más',
    published_at: '2026-11-10T12:00:00Z'
  }], { site: 'https://eest3sf.netlify.app' });
  assert.match(rss, /^<\?xml version="1.0"/);
  assert.match(rss, /<title>Aviso &lt;importante&gt;<\/title>/);
  assert.match(rss, /novedades\.html\?post=00000000-0000-4000-8000-000000000001/);
  assert.match(rss, /Texto &amp; más/);
  assert.doesNotMatch(rss, /<importante>/);
});
