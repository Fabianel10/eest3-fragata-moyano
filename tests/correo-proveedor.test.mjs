import test from 'node:test';
import assert from 'node:assert/strict';
import { crearEnviador, validarMensaje } from '../netlify/lib/correo-proveedor.mjs';
import { procesarCola } from '../netlify/lib/correo-cola.mjs';
import procesarCorreo from '../netlify/functions/procesar-correo.mjs';
import procesarCorreoManual from '../netlify/functions/procesar-correo-manual.mjs';

const base = {
  EMAIL_PROVIDER: 'brevo',
  EMAIL_FROM: 'no-reply@example.test',
  EMAIL_FROM_NAME: 'EEST N°3',
  BREVO_API_KEY: 'clave-simulada'
};

test('proveedor de correo: validación, Brevo, Resend y errores sin filtrar claves', async () => {
  assert.throws(() => validarMensaje({ to: 'invalido', subject: 'Asunto', text: 'Mensaje' }), /Destinatario/);
  assert.throws(() => validarMensaje({ to: 'a@b.test', subject: '', text: 'Mensaje' }), /Asunto/);
  assert.throws(() => validarMensaje({ to: 'a@b.test', subject: 'Asunto', text: '' }), /Mensaje/);
  assert.throws(() => validarMensaje({ to: 'a@b.test', subject: 'Asunto', text: 'Mensaje', replyTo: 'invalido' }), /Reply-to/);
  assert.throws(() => crearEnviador({ env: {}, fetcher: fetch }), /EMAIL_FROM/);
  assert.throws(() => crearEnviador({ env: { ...base, EMAIL_PROVIDER: 'otro' }, fetcher: fetch }), /brevo, resend o smtp/);
  assert.throws(() => crearEnviador({ env: { ...base, EMAIL_PROVIDER: 'smtp' }, fetcher: fetch }), /EMAIL_SMTP_HOST/);

  let capturado;
  const brevo = crearEnviador({
    env: base,
    fetcher: async (url, options) => {
      capturado = { url, options };
      return new Response(JSON.stringify({ messageId: 'brevo-123' }), { status: 201 });
    }
  });
  assert.deepEqual(await brevo({ to: 'persona@example.test', subject: 'Hola', text: 'Mensaje', html: '<p>Hola</p>', replyTo: 'reply@example.test' }), { id: 'brevo-123' });
  assert.equal(capturado.url, 'https://api.brevo.com/v3/smtp/email');
  assert.equal(capturado.options.headers['api-key'], 'clave-simulada');
  const payload = JSON.parse(capturado.options.body);
  assert.deepEqual(payload.to, [{ email: 'persona@example.test' }]);
  assert.equal(payload.textContent, 'Mensaje');
  assert.equal(payload.htmlContent, '<p>Hola</p>');
  assert.deepEqual(payload.replyTo, { email: 'reply@example.test' });

  const resend = crearEnviador({
    env: { ...base, EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'resend-simulada' },
    fetcher: async (url, options) => {
      capturado = { url, options };
      return new Response(JSON.stringify({ id: 'resend-123' }), { status: 200 });
    }
  });
  assert.deepEqual(await resend({ to: 'persona@example.test', subject: 'Hola', text: 'Mensaje' }), { id: 'resend-123' });
  assert.equal(capturado.url, 'https://api.resend.com/emails');
  assert.equal(capturado.options.headers.Authorization, 'Bearer resend-simulada');

  const falla = crearEnviador({
    env: base,
    fetcher: async () => new Response(JSON.stringify({ message: 'rechazado' }), { status: 500 })
  });
  await assert.rejects(falla({ to: 'persona@example.test', subject: 'Hola', text: 'Mensaje' }), /Brevo rechazó/);

  let smtpMensaje;
  let smtpConfig;
  const smtp = crearEnviador({
    env: { ...base, EMAIL_PROVIDER: 'smtp', EMAIL_SMTP_HOST: 'smtp.example.test',
      EMAIL_SMTP_PORT: '587', EMAIL_SMTP_USER: 'usuario', EMAIL_SMTP_PASS: 'clave' },
    smtpFactory: (config) => {
      smtpConfig = config;
      return { sendMail: async (mensaje) => { smtpMensaje = mensaje; return { messageId: 'smtp-1' }; } };
    }
  });
  assert.deepEqual(await smtp({ to: 'persona@example.test', subject: 'Hola', text: 'Mensaje', html: '<p>Hola</p>', replyTo: 'reply@example.test' }), { id: 'smtp-1' });
  assert.equal(smtpConfig.port, 587);
  assert.equal(smtpConfig.secure, false);
  assert.equal(smtpMensaje.text, 'Mensaje');
  assert.equal(smtpMensaje.html, '<p>Hola</p>');
  assert.equal(smtpMensaje.replyTo, 'reply@example.test');
  assert.match(smtpMensaje.from, /EEST N°3/);
});

test('procesador de cola: deshabilitado, lote, envío y registro de fallos', async () => {
  assert.deepEqual(await procesarCola({ env: { EMAIL_ENABLED: 'false' } }),
    { skipped: true, reason: 'disabled', procesados: 0 });

  const llamadas = [];
  const items = [
    { id: '00000000-0000-4000-8000-000000000001', recipient: 'ok@example.test', subject: 'Uno', body: 'Texto uno' },
    { id: '00000000-0000-4000-8000-000000000002', recipient: 'falla@example.test', subject: 'Dos', body: 'Texto dos' }
  ];
  const fetcher = async (url, options) => {
    const nombre = url.split('/').pop();
    llamadas.push({ nombre, body: JSON.parse(options.body) });
    if (nombre === 'email_claim') return new Response(JSON.stringify(items), { status: 200 });
    return new Response('null', { status: 200 });
  };
  const resultado = await procesarCola({
    env: { EMAIL_ENABLED: 'true', SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service' },
    fetcher,
    enviar: async ({ to }) => {
      if (to.startsWith('falla')) throw new Error('SMTP caído');
      return { id: 'provider-ok' };
    },
    logger: { error() {} }
  });
  assert.deepEqual(resultado, { skipped: false, procesados: 2, enviados: 1, fallidos: 1 });
  assert.deepEqual(llamadas.map((l) => l.nombre), ['email_claim', 'email_mark_sent', 'email_mark_failed']);
  assert.equal(llamadas[2].body.error_detail, 'SMTP caído');
  assert.equal(llamadas[1].body.provider_id, 'provider-ok');
});

test('endpoint de cola: invocación programada, secreto manual y rechazo anónimo', async () => {
  const previo = { ...process.env };
  try {
    process.env.EMAIL_ENABLED = 'false';
    delete process.env.EMAIL_QUEUE_SECRET;
    const programado = await procesarCorreo(new Request('https://portal.test/.netlify/functions/procesar-correo', {
      method: 'POST', body: JSON.stringify({ next_run: '2026-11-10T12:00:00Z' })
    }), {});
    assert.equal(programado.status, 200);
    assert.deepEqual(await programado.json(), { skipped: true, reason: 'disabled', procesados: 0 });

    const anonimo = await procesarCorreo(new Request('https://portal.test/.netlify/functions/procesar-correo', {
      method: 'POST', body: '{}'
    }), {});
    assert.equal(anonimo.status, 401);

    process.env.EMAIL_QUEUE_SECRET = 'secreto-prueba';
    const manual = await procesarCorreoManual(new Request('https://portal.test/.netlify/functions/procesar-correo-manual', {
      method: 'POST', body: '{}', headers: { 'x-queue-secret': 'secreto-prueba' }
    }));
    assert.equal(manual.status, 200);
    const manualSinSecreto = await procesarCorreoManual(new Request('https://portal.test/.netlify/functions/procesar-correo-manual', {
      method: 'POST', body: '{}'
    }));
    assert.equal(manualSinSecreto.status, 401);
  } finally {
    process.env = previo;
  }
});
