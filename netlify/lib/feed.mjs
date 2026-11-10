export function escaparXml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

export function generarRss(rows, { site = 'https://eest3sf.netlify.app' } = {}) {
  const items = (Array.isArray(rows) ? rows : []).slice(0, 30).map((row) => {
    const link = `${site}/novedades.html?post=${encodeURIComponent(row.id)}`;
    return `    <item>
      <title>${escaparXml(row.title)}</title>
      <link>${escaparXml(link)}</link>
      <guid isPermaLink="true">${escaparXml(link)}</guid>
      <pubDate>${new Date(row.published_at).toUTCString()}</pubDate>
      <description>${escaparXml(String(row.body || '').slice(0, 500))}</description>
    </item>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Comunicados · EEST N°3 Fragata Moyano</title>
    <link>${escaparXml(site)}/novedades.html</link>
    <description>Comunicados, documentos y proyectos de la EEST N°3 de San Fernando.</description>
    <language>es-ar</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;
}
