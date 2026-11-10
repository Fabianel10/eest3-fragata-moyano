const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const pagina = (titulo, detalle) => new Response(`<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${titulo} | EEST N°3</title>
<link rel="icon" href="/assets/images/logo.png"><link rel="stylesheet" href="/assets/css/estilo.css?v=20260925-19"></head>
<body><main class="container-seccion"><p class="eyebrow">Comunicaciones institucionales</p>
<h1>${titulo}</h1><p>${detalle}</p><p><a class="btn-principal" href="/index.html">Volver al inicio</a></p></main></body></html>`, {
  status: 200,
  headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }
});

export default async (request) => {
  if (request.method !== 'GET') return new Response(null, { status: 405, headers: { Allow: 'GET' } });
  const env = process.env;
  const token = new URL(request.url).searchParams.get('token') || '';
  if (!UUID.test(token) || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return pagina('Enlace no válido', 'El enlace de baja está incompleto o venció. Si querés dejar de recibir avisos, escribí a Secretaría.');
  }
  try {
    const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/email_optout`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ unsubscribe_token: token }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
      return pagina('Enlace no válido', 'No pudimos reconocer este enlace de baja. Es posible que ya haya sido utilizado o que haya vencido.');
    }
    return pagina('Baja registrada', 'No recibirás más avisos de recepción de consultas en este correo. Las respuestas a consultas que ya enviaste no se ven afectadas.');
  } catch {
    return pagina('No se pudo procesar la baja', 'Hubo un problema de conexión. Volvé a intentarlo más tarde o comunicate con Secretaría.');
  }
};
