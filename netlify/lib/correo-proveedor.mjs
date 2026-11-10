import nodemailer from 'nodemailer';

const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function limpiar(valor, max) {
  return typeof valor === 'string' ? valor.trim().slice(0, max) : '';
}

export function validarMensaje({ to, subject, text, html, replyTo }) {
  if (!CORREO_RE.test(limpiar(to, 254))) throw new Error('Destinatario inválido.');
  if (!limpiar(subject, 200)) throw new Error('Asunto vacío.');
  if (!limpiar(text, 10000)) throw new Error('Mensaje vacío.');
  if (replyTo && !CORREO_RE.test(limpiar(replyTo, 254))) throw new Error('Reply-to inválido.');
  const bodyHtml = limpiar(html, 60000);
  return {
    to: limpiar(to, 254), subject: limpiar(subject, 200), text: limpiar(text, 10000),
    html: bodyHtml || null, replyTo: replyTo ? limpiar(replyTo, 254) : null
  };
}

export function crearEnviador({ env = process.env, fetcher = fetch, smtpFactory } = {}) {
  const provider = (env.EMAIL_PROVIDER || '').toLowerCase();
  const from = limpiar(env.EMAIL_FROM, 254);
  const fromName = limpiar(env.EMAIL_FROM_NAME, 80) || 'EEST N°3 Fragata Moyano';
  if (!CORREO_RE.test(from)) throw new Error('EMAIL_FROM no está configurado con un correo válido.');
  if (provider === 'brevo' && !env.BREVO_API_KEY) throw new Error('Falta BREVO_API_KEY.');
  if (provider === 'resend' && !env.RESEND_API_KEY) throw new Error('Falta RESEND_API_KEY.');
  if (provider === 'smtp') {
    for (const key of ['EMAIL_SMTP_HOST', 'EMAIL_SMTP_PORT', 'EMAIL_SMTP_USER', 'EMAIL_SMTP_PASS']) {
      if (!env[key]) throw new Error(`Falta ${key}.`);
    }
    if (!/^\d{2,5}$/.test(String(env.EMAIL_SMTP_PORT))) throw new Error('EMAIL_SMTP_PORT inválido.');
  }
  if (!['brevo', 'resend', 'smtp'].includes(provider)) {
    throw new Error('EMAIL_PROVIDER debe ser brevo, resend o smtp.');
  }
  const smtp = provider === 'smtp'
    ? (smtpFactory || ((opciones) => nodemailer.createTransport(opciones)))({
        host: env.EMAIL_SMTP_HOST,
        port: Number(env.EMAIL_SMTP_PORT),
        secure: Number(env.EMAIL_SMTP_PORT) === 465,
        auth: { user: env.EMAIL_SMTP_USER, pass: env.EMAIL_SMTP_PASS },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
      })
    : null;

  return async (mensaje) => {
    const { to, subject, text, html, replyTo } = validarMensaje(mensaje);
    const signal = AbortSignal.timeout(10000);
    if (provider === 'brevo') {
      const response = await fetcher('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: { email: from, name: fromName },
          to: [{ email: to }],
          subject,
          textContent: text,
          ...(html ? { htmlContent: html } : {}),
          ...(replyTo ? { replyTo: { email: replyTo } } : {})
        }),
        signal
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detalle = limpiar(data.message || data.error || '', 200);
        throw new Error(`Brevo rechazó el envío (${response.status})${detalle ? `: ${detalle}` : ''}`);
      }
      return { id: limpiar(data.messageId, 300) || 'brevo-ok' };
    }
    if (provider === 'resend') {
      const response = await fetcher('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: `${fromName} <${from}>`, to: [to], subject, text,
          ...(html ? { html } : {}), ...(replyTo ? { reply_to: replyTo } : {}) }),
        signal
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detalle = limpiar(data.message || data.error || '', 200);
        throw new Error(`Resend rechazó el envío (${response.status})${detalle ? `: ${detalle}` : ''}`);
      }
      return { id: limpiar(data.id, 300) || 'resend-ok' };
    }
    const info = await smtp.sendMail({ from: `${fromName} <${from}>`, to, subject, text,
      ...(html ? { html } : {}), ...(replyTo ? { replyTo } : {}) });
    return { id: limpiar(info?.messageId, 300) || 'smtp-ok' };
  };
}
