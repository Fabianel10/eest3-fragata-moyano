let promesa;
export function configurado() {
  const config = window.COMUNIDAD_CONFIG;
  return Boolean(config && /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(config.supabaseUrl) &&
    config.supabasePublishableKey);
}
export function obtenerCliente() {
  if (!configurado()) throw new Error('Falta configurar Supabase. Consultá la guía de activación.');
  if (!promesa) {
    promesa = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm')
      .then(({ createClient }) => createClient(window.COMUNIDAD_CONFIG.supabaseUrl, window.COMUNIDAD_CONFIG.supabasePublishableKey))
      .catch((error) => { promesa = null; throw error; });
  }
  return promesa;
}
export function resultado(respuesta) {
  if (respuesta.error) throw respuesta.error;
  return respuesta.data;
}
