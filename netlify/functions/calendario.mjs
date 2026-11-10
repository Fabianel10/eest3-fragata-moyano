import { generarIcs } from '../lib/calendario-ics.mjs';

export default async () => {
  const env = process.env;
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return new Response('Calendario no disponible.', { status: 503 });
  }
  try {
    const params = new URLSearchParams({
      select: 'event_date,title,description,source,responsible,recurrence,recurrence_until',
      published: 'eq.true',
      order: 'event_date.asc'
    });
    const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/calendar_events?${params}`, {
      headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) return new Response('Calendario no disponible.', { status: 503 });
    const rows = await response.json();
    return new Response(generarIcs(rows, { site: env.URL || 'https://eest3sf.netlify.app' }), {
      headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'public, max-age=600' }
    });
  } catch {
    return new Response('Calendario no disponible.', { status: 503 });
  }
};
