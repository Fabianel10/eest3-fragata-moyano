import { crearEnviador } from './correo-proveedor.mjs';

const LOTE = 5;

function rpcUrl(env, nombre) {
  return `${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/${nombre}`;
}

async function llamarRpc(env, nombre, cuerpo, fetcher) {
  const response = await fetcher(rpcUrl(env, nombre), {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(`Cola de correo rechazó ${nombre}: ${data.message || response.status}`);
  }
  return response.json().catch(() => null);
}

export async function procesarCola({ env = process.env, fetcher = fetch, enviar, logger = console } = {}) {
  if (env.EMAIL_ENABLED !== 'true') return { skipped: true, reason: 'disabled', procesados: 0 };
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Falta configurar Supabase para procesar la cola de correo.');
  }
  const sender = enviar || crearEnviador({ env, fetcher });
  const pendientes = await llamarRpc(env, 'email_claim', { batch_size: LOTE }, fetcher);
  if (!Array.isArray(pendientes)) throw new Error('La cola devolvió una respuesta inválida.');
  let enviados = 0;
  let fallidos = 0;
  for (const item of pendientes) {
    try {
      const resultado = await sender({ to: item.recipient, subject: item.subject, text: item.body });
      await llamarRpc(env, 'email_mark_sent', {
        item_id: item.id, provider_id: resultado?.id || 'sin-identificador'
      }, fetcher);
      enviados += 1;
    } catch (error) {
      fallidos += 1;
      logger.error('Cola de correo: fallo de envío.', { id: item.id, name: error.name });
      try {
        await llamarRpc(env, 'email_mark_failed', {
          item_id: item.id, error_detail: String(error.message || error.name).slice(0, 1000)
        }, fetcher);
      } catch (markError) {
        logger.error('Cola de correo: no se pudo registrar el fallo.', { id: item.id, name: markError.name });
      }
    }
  }
  return { skipped: false, procesados: pendientes.length, enviados, fallidos };
}
