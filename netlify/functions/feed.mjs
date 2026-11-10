import { generarRss } from '../lib/feed.mjs';

export default async () => {
  const env = process.env;
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return new Response('Feed no disponible.', { status: 503 });
  }
  try {
    const now = new Date().toISOString();
    const params = new URLSearchParams({
      select: 'id,title,body,published_at',
      published_at: `lte.${now}`,
      or: `(expires_at.is.null,expires_at.gt.${now})`,
      order: 'published_at.desc',
      limit: '30'
    });
    const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/institutional_posts?${params}`, {
      headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) return new Response('Feed no disponible.', { status: 503 });
    const rows = await response.json();
    return new Response(generarRss(rows, { site: env.URL || 'https://eest3sf.netlify.app' }), {
      headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=600' }
    });
  } catch {
    return new Response('Feed no disponible.', { status: 503 });
  }
};
