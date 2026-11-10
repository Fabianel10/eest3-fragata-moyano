const json = (status, data) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});

export default async (request) => {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  const env = process.env;
  const token = new URL(request.url).searchParams.get('token') || '';
  if (!env.EMAIL_WEBHOOK_SECRET || token !== env.EMAIL_WEBHOOK_SECRET) {
    return json(401, { error: 'No autorizado.' });
  }
  let payload;
  try { payload = await request.json(); }
  catch { return json(400, { error: 'JSON inválido.' }); }
  try {
    const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/email_webhook_event`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ payload }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) return json(503, { error: 'No se pudo registrar el evento.' });
    return json(200, { ok: true });
  } catch {
    return json(503, { error: 'No se pudo registrar el evento.' });
  }
};
