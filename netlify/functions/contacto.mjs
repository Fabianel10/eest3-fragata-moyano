import { createHmac } from 'node:crypto';

const reply = (status, data) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});
export function validateContact(input) {
  if (!input || typeof input !== 'object') throw new Error('Datos inválidos.');
  const limits = { nombre: [2, 100], correo: [3, 254], asunto: [1, 200], mensaje: [10, 5000] };
  const value = {};
  for (const [key, [min, max]] of Object.entries(limits)) {
    if (typeof input[key] !== 'string') throw new Error('Completá todos los campos.');
    value[key] = input[key].trim();
    if (value[key].length < min || value[key].length > max || value[key].includes('\0')) {
      throw new Error('Revisá la longitud de los campos.');
    }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.correo) || input.privacidad !== 'aceptada' ||
    !['general', 'inscripciones', 'carreras', 'documentacion'].includes(input.categoria) ||
    !['', 'informatica', 'madera', 'obras'].includes(input.carrera) ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input.request_id)) {
    throw new Error('Revisá el correo, categoría y consentimiento.');
  }
  return { ...value, categoria: input.categoria, carrera: input.carrera, privacidad: 'aceptada' };
}

export function createContactHandler({ env = process.env, fetcher = fetch, logger = console } = {}) {
  return async (request, context) => {
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
    if (env.CONTACT_ENABLED !== 'true') return reply(503, { error: 'La recepción en base de datos todavía no está habilitada.' });
    if (!env.URL || request.headers.get('origin') !== new URL(env.URL).origin) return reply(403, { error: 'Origen no permitido.' });
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.CONTACT_HASH_SECRET ||
        env.CONTACT_HASH_SECRET.length < 64 || !context.ip) {
      logger.error('Contacto: configuración del servidor incompleta.');
      return reply(503, { error: 'Servicio no disponible. Avisá a la institución.' });
    }
    if (!request.headers.get('content-type')?.startsWith('application/json')) return reply(415, { error: 'Formato no admitido.' });
    let input;
    try {
      const reader = request.body?.getReader();
      if (!reader) return reply(400, { error: 'Faltan los datos.' });
      let size = 0;
      const chunks = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 24000) { await reader.cancel(); return reply(413, { error: 'El mensaje es demasiado grande.' }); }
        chunks.push(value);
      }
      input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      return reply(400, { error: 'No se pudieron interpretar los datos.' });
    }
    let payload;
    try {
      if (input?.['sitio-web']) return reply(400, { error: 'No se pudo validar la consulta.' });
      payload = validateContact(input);
    } catch (error) { return reply(400, { error: error.message }); }
    const sourceHash = createHmac('sha256', env.CONTACT_HASH_SECRET).update(context.ip).digest('hex');
    try {
      const response = await fetcher(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/contact_submit`, {
        method: 'POST',
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ request_id: input.request_id, payload, source_hash: sourceHash }),
        signal: AbortSignal.timeout(10000)
      });
      const data = await response.json();
      if (!response.ok) {
        logger.error('Contacto: rechazo de base de datos.', { code: data.code, status: response.status });
        if (data.code === 'P0001') return reply(429, { error: 'Alcanzaste el límite de consultas. Intentá dentro de una hora.' });
        if (data.code === '23505') return reply(409, { error: 'El identificador corresponde a otra consulta. Recargá antes de enviar una nueva.' });
        return reply(503, { error: 'No pudimos confirmar la recepción. Conservá el mensaje para reintentar.' });
      }
      if (data !== input.request_id) throw new Error('Invalid receipt');
      return reply(201, { id: data });
    } catch (error) {
      logger.error('Contacto: fallo de conexión.', { name: error.name });
      return reply(503, { error: 'No pudimos confirmar la recepción. Reintentá sin cambiar los datos para evitar duplicados.' });
    }
  };
}
export default createContactHandler();
