export const config = { schedule: '0 3 * * *' };

const TABLAS = ['cms_published', 'institutional_posts', 'calendar_events', 'contact_reply_templates', 'search_static'];

export default async () => {
  const env = process.env;
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return new Response('Respaldo no disponible.', { status: 503 });
  }
  const base = env.SUPABASE_URL.replace(/\/$/, '');
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json'
  };
  try {
    const tables = {};
    for (const table of TABLAS) {
      const response = await fetch(`${base}/rest/v1/${table}?select=*`, { headers, signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`Tabla ${table}: ${response.status}`);
      tables[table] = await response.json();
    }
    const snapshot = {
      version: 1,
      created_at: new Date().toISOString(),
      note: 'Respaldo de contenido. No incluye consultas, perfiles, sesiones, métricas ni historial privado.',
      tables
    };
    const body = JSON.stringify(snapshot, null, 2);
    const path = `content-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const upload = await fetch(`${base}/storage/v1/object/institutional-backups/${path}`, {
      method: 'POST',
      headers: { ...headers, 'x-upsert': 'true' },
      body,
      signal: AbortSignal.timeout(15000)
    });
    if (!upload.ok) throw new Error(`Storage: ${upload.status}`);
    const metadata = await fetch(`${base}/rest/v1/backup_snapshots`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ path, size_bytes: new TextEncoder().encode(body).length, tables: Object.fromEntries(Object.entries(tables).map(([key, value]) => [key, value.length])) }),
      signal: AbortSignal.timeout(10000)
    });
    if (!metadata.ok) throw new Error(`Metadatos: ${metadata.status}`);
    return new Response(JSON.stringify({ ok: true, path, tables: Object.keys(tables) }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    console.error('Respaldo diario:', error.message.slice(0, 200));
    return new Response(JSON.stringify({ ok: false }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
};
