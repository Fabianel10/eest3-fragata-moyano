import { procesarCola } from '../lib/correo-cola.mjs';

export const config = { schedule: '*/5 * * * *' };

const json = (status, data) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});

export default async (request, context) => {
  const env = process.env;
  let programado = request.headers.get('x-nf-event') === 'schedule' ||
    request.headers.get('x-nf-scheduled-function') === 'true';
  if (request.method === 'POST') {
    try {
      const body = await request.clone().json();
      if (typeof body?.next_run === 'string') programado = true;
    } catch { /* una invocación externa no necesita cuerpo JSON */ }
  }
  if (!programado) return json(401, { error: 'No autorizado.' });
  try {
    const resultado = await procesarCola({ env });
    return json(200, resultado);
  } catch (error) {
    console.error('Procesamiento de correo:', error.name);
    return json(503, { error: 'No se pudo procesar la cola.' });
  }
};
