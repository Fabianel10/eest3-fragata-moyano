const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function limpiar(valor, max) {
  return typeof valor === 'string' ? valor.trim().slice(0, max) : '';
}

export function validarMensaje({ to, subject, text }) {
  if (!CORREO_RE.test(limpiar(to, 254))) throw new Error('Destinatario inválido.');
  if (!limpiar(subject, 200)) throw new Error('Asunto vacío.');
  if (!limpiar(text, 10000)) throw new Error('Mensaje vacío.');
  return { to: limpiar(to, 254), subject: limpiar(subject, 200), text: limpiar(text, 10000) };
}

export function crearEnviador({ env = process.env, fetcher = fetch } = {}) {
  const provider = (env.EMAIL_PROVIDER || '').toLowerCase();
  const from = limpiar(env.EMAIL_FROM, 254);
  const fromName = limpiar(env.EMAIL_FROM_NAME, 80) || 'EEST N°3 Fragata Moyano';
  if (!CORREO_RE.test(from)) throw new Error('EMAIL_FROM no está configurado con un correo válido.');
  if (provider === 'brevo' && !env.BREVO_API_KEY) throw new Error('Falta BREVO_API_KEY.');
  if (provider === 'resend' && !env.RESEND_API_KEY) throw new Error('Falta RESEND_API_KEY.');
  if (!['brevo', 'resend'].includes(provider)) throw new Error('EMAIL_PROVIDER debe ser brevo o resend.');

  return async (mensaje) => {
    const { to, subject, text } = validarMensaje(mensaje);
    const signal = AbortSignal.timeout(10000);
    if (provider === 'brevo') {
      const response = await fetcher('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: { email: from, name: fromName },
          to: [{ email: to }],
          subject,
          textContent: text
        }),
        signal
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`Brevo rechazó el envío (${response.status}).`);
      return { id: limpiar(data.messageId, 300) || 'brevo-ok' };
    }
    const response = await fetcher('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${fromName} <${from}>`, to: [to], subject, text }),
      signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Resend rechazó el envío (${response.status}).`);
    return { id: limpiar(data.id, 300) || 'resend-ok' };
  };
}
