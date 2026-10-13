import { ARCHIVOS, escaparHTML } from './cms-modelo.mjs';
import { prepararRenderer } from './cms-render.mjs';
import { configurado } from './supabase-cliente.mjs';

const file = location.pathname.split('/').pop() || 'index.html';
const slug = Object.keys(ARCHIVOS).find((key) => ARCHIVOS[key] === file);
window.CMS_ESCAPE = escaparHTML;
const scripts = {
  inicio: ['tema.js', 'script.js'],
  historia: ['navegacion.js', 'historia.js'],
  galeria: ['navegacion.js', 'clima.js', 'galeria.js'],
  calendario: ['navegacion.js', 'clima.js', 'calendario.js'],
  informatica: ['navegacion.js', 'clima.js', 'galeria.js'],
  madera: ['navegacion.js', 'clima.js', 'galeria.js'],
  obras: ['navegacion.js', 'clima.js', 'galeria.js']
};
function aviso(message) {
  console.error('CMS:', message);
  const node = document.createElement('p');
  node.className = 'cms-public-error';
  node.setAttribute('role', 'status');
  node.textContent = message;
  document.querySelector('main').prepend(node);
}
async function activarScripts() {
  for (const file of scripts[slug]) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `assets/js/${file}?v=20261006-cms1`;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`No se pudo cargar la interacción ${file}.`));
      document.body.append(script);
    });
  }
}
async function iniciar() {
  try {
    const preview = new URLSearchParams(location.search).get('preview') === '1' && parent !== window;
    window.CMS_PREVIEW = preview;
    if (preview) document.addEventListener('click', (event) => {
      const link = event.target.closest('a');
      if (link && !link.getAttribute('href')?.startsWith('#')) event.preventDefault();
    });
    {
      const response = await fetch('assets/cms/catalogo.json', { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error('No se pudo cargar el catálogo de contenido.');
      const catalog = (await response.json())[slug];
      const aplicar = prepararRenderer(catalog);
      window.CMS_CONTENT = catalog.defaults.modules;
      if (preview) {
        await new Promise((resolve) => {
          const recibir = (event) => {
            if (event.origin !== location.origin || event.source !== parent || event.data?.type !== 'cms:preview') return;
            try {
              window.CMS_CONTENT = aplicar(event.data.content);
              parent.postMessage({ type: 'cms:rendered' }, location.origin);
            } catch (error) {
              aviso(['TimeoutError', 'AbortError'].includes(error.name)
                ? 'El servicio de contenido no respondió a tiempo. Se muestra la versión incluida en el sitio.'
                : error instanceof TypeError
                  ? 'No se pudo conectar con el contenido publicado. Revisá tu conexión; se muestra la versión incluida en el sitio.'
                  : error.message);
              parent.postMessage({ type: 'cms:error', message: error.message }, location.origin);
            }
            window.removeEventListener('message', recibir);
            resolve();
          };
          window.addEventListener('message', recibir);
          parent.postMessage({ type: 'cms:ready', slug }, location.origin);
        });
      } else if (configurado()) {
        const config = window.COMUNIDAD_CONFIG;
        const response = await fetch(`${config.supabaseUrl.replace(/\/$/, '')}/rest/v1/cms_published?slug=eq.${slug}&select=content`, {
          headers: { apikey: config.supabasePublishableKey },
          signal: AbortSignal.timeout(8000)
        });
        if (!response.ok) throw new Error('No se pudo consultar el contenido publicado. Se muestra la versión incluida en el sitio.');
        const rows = await response.json();
        if (rows[0]) window.CMS_CONTENT = aplicar(rows[0].content);
      }
    }
  } catch (error) {
    aviso(error.message);
  }
  try {
    await activarScripts();
    const { completarSitio } = await import('./sitio-compartido.mjs');
    await completarSitio();
  } catch (error) { aviso(error.message); }
}
iniciar();
