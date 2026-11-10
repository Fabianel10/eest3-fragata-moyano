import { procesarCola } from '../lib/correo-cola.mjs';

const json = (status, data) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});

export default async (request) => {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  if (!process.env.EMAIL_QUEUE_SECRET || request.headers.get('x-queue-secret') !== process.env.EMAIL_QUEUE_SECRET) {
    return json(401, { error: 'No autorizado.' });
  }
  try {
    return json(200, await procesarCola({ env: process.env }));
  } catch (error) {
    console.error('Procesamiento manual de correo:', error.name);
    return json(503, { error: 'No se pudo procesar la cola.' });
  }
};
