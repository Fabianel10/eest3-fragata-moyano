const PAGINAS = {
  '': 'inicio', 'index.html': 'inicio', 'historia.html': 'historia', 'galeria.html': 'galeria',
  'calendario.html': 'calendario', 'informatica.html': 'informatica', 'madera.html': 'madera',
  'obras.html': 'obras', 'novedades.html': 'novedades', 'comunidad.html': 'comunidad',
  'privacidad.html': 'privacidad', 'buscador.html': 'buscador', '404.html': '404'
};
const clave = (sufijo) => `eest3-metrica:${new Date().toISOString().slice(0, 10)}:${sufijo}`;
const respetarPrivacidad = () =>
  navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true;

function rpc(metrica, destino, carrera = '') {
  if (respetarPrivacidad()) return;
  const config = window.COMUNIDAD_CONFIG;
  if (!config?.supabaseUrl || !config?.supabasePublishableKey) return;
  fetch(`${config.supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/metrics_register`, {
    method: 'POST',
    headers: { apikey: config.supabasePublishableKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_metric: metrica, p_target: destino, p_career: carrera || '' }),
    keepalive: true
  }).catch(() => {});
}

export function iniciarMetricas() {
  const archivo = location.pathname.split('/').pop() || '';
  const pagina = PAGINAS[archivo];
  if (!pagina || respetarPrivacidad()) return;
  try {
    const marca = clave(`pagina:${pagina}`);
    if (sessionStorage.getItem(marca)) return;
    sessionStorage.setItem(marca, '1');
  } catch { /* almacenamiento bloqueado: no se registra */ return; }
  rpc('page_view', pagina);
}

export function iniciarMetricasPublicas() {
  iniciarMetricas();
  window.METRICAS = {
    busqueda(tipo, carrera) {
      const marca = clave(`busqueda:${tipo || 'todos'}:${carrera || 'todas'}`);
      try {
        if (sessionStorage.getItem(marca)) return;
        sessionStorage.setItem(marca, '1');
      } catch { return; }
      rpc('search_used', tipo || '', carrera || '');
    },
    publicacion(id) {
      if (!/^[a-f0-9-]{36}$/i.test(id || '')) return;
      const marca = clave(`post:${id}`);
      try {
        if (sessionStorage.getItem(marca)) return;
        sessionStorage.setItem(marca, '1');
      } catch { return; }
      rpc('post_view', id);
    }
  };
}
