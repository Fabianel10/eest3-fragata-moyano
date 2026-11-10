import { execFileSync } from 'node:child_process';
import nodemailer from 'nodemailer';

const usarNetlify = process.argv.includes('--netlify');
const env = usarNetlify
  ? JSON.parse(execFileSync('netlify', ['env:list', '--context', 'production', '--json'], {
      encoding: 'utf8', maxBuffer: 10 * 1024 * 1024
    }))
  : process.env;
const provider = (env.EMAIL_PROVIDER || '').toLowerCase();
const enabled = env.EMAIL_ENABLED === 'true';
const from = env.EMAIL_FROM || '';
console.log('origen:', usarNetlify ? 'Netlify producción' : 'entorno local');
console.log('EMAIL_ENABLED:', enabled);
console.log('EMAIL_PROVIDER:', provider || '(sin definir)');
console.log('EMAIL_FROM configurado:', Boolean(from));
if (!enabled) console.log('Aviso: la cola no enviará hasta que EMAIL_ENABLED=true.');

async function brevo() {
  if (!env.BREVO_API_KEY) throw new Error('Falta BREVO_API_KEY.');
  const headers = { 'api-key': env.BREVO_API_KEY };
  const response = await fetch('https://api.brevo.com/v3/account', { headers, signal: AbortSignal.timeout(10000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const mensaje = String(data.message || '').slice(0, 240);
    if (/unrecognised IP|unauthorized IP|IP address/i.test(mensaje)) {
      throw new Error('Brevo bloquea la IP de salida. Desactivá la restricción de IP para la API o autorizá la IP en https://app.brevo.com/security/auth');
    }
    throw new Error(`Brevo respondió ${response.status}${mensaje ? `: ${mensaje}` : ''}`);
  }
  const senders = await fetch('https://api.brevo.com/v3/senders', { headers, signal: AbortSignal.timeout(10000) });
  const senderData = await senders.json().catch(() => ({}));
  const list = Array.isArray(senderData.senders) ? senderData.senders : [];
  const verificado = list.some((item) => String(item.email || '').toLowerCase() === from.toLowerCase() &&
    item.active !== false);
  console.log('Brevo: clave válida y cuenta accesible.');
  console.log('Remitente verificado en Brevo:', verificado);
  if (!verificado) console.log('Aviso: verificá EMAIL_FROM en Brevo antes de enviar.');
}

async function resend() {
  if (!env.RESEND_API_KEY) throw new Error('Falta RESEND_API_KEY.');
  const response = await fetch('https://api.resend.com/domains', {
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` }, signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`Resend respondió ${response.status}.`);
  console.log('Resend: clave válida y API accesible.');
}

async function smtp() {
  for (const key of ['EMAIL_SMTP_HOST', 'EMAIL_SMTP_PORT', 'EMAIL_SMTP_USER', 'EMAIL_SMTP_PASS']) {
    if (!env[key]) throw new Error(`Falta ${key}.`);
  }
  const transport = nodemailer.createTransport({
    host: env.EMAIL_SMTP_HOST,
    port: Number(env.EMAIL_SMTP_PORT),
    secure: Number(env.EMAIL_SMTP_PORT) === 465,
    auth: { user: env.EMAIL_SMTP_USER, pass: env.EMAIL_SMTP_PASS },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
  await transport.verify();
  console.log('SMTP: conexión y autenticación correctas.');
}

try {
  if (provider === 'brevo') await brevo();
  else if (provider === 'resend') await resend();
  else if (provider === 'smtp') await smtp();
  else throw new Error('EMAIL_PROVIDER debe ser brevo, resend o smtp.');
} catch (error) {
  console.error('Verificación fallida:', error.message);
  process.exitCode = 1;
}
