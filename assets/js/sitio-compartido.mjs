import { iniciarReproductor } from './reproductor-compartido.mjs';
import { startSkynet } from './skynet.mjs';

const carreras = [
  ['informatica.html', 'Informática Personal y Profesional'],
  ['madera.html', 'Industrialización de la Madera y el Mueble'],
  ['obras.html', 'Maestro Mayor de Obras']
];
export async function completarSitio() {
  startSkynet();
  if (document.querySelector('[data-sitio-completo]')) return;
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = 'assets/css/carreras.css';
  document.head.append(style);
  const institutional = document.createElement('link');
  institutional.rel = 'stylesheet';
  institutional.href = 'assets/css/estilo.css?v=20260925-19';
  if (!document.querySelector('link[href*="estilo.css"]')) document.head.append(institutional);
  const links = () => {
    const nav = document.createElement('nav');
    nav.className = 'sitio-carreras';
    nav.setAttribute('aria-label', 'Carreras técnicas');
    carreras.forEach(([href, title]) => {
      const a = document.createElement('a');
      a.href = href;
      a.textContent = title;
      if (location.pathname.endsWith(`/${href}`)) a.setAttribute('aria-current', 'page');
      nav.append(a);
    });
    return nav;
  };
  document.querySelectorAll('a[href$="#especialidades"]').forEach(a => {
    const label = a.textContent.trim();
    const career = label.startsWith('Informática') ? carreras[0] :
      label.startsWith('Madera') ? carreras[1] : label.startsWith('Maestro') ? carreras[2] : null;
    if (career) a.href = career[0];
  });
  const menu = document.querySelector('.enlaces-navegacion');
  if (menu && !menu.querySelector('[href="informatica.html"]')) {
    const group = document.createElement('div');
    group.className = 'grupo-navegacion';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'desplegador-navegacion';
    button.textContent = 'Carreras ⌄';
    button.setAttribute('aria-expanded', 'false');
    const submenu = links();
    submenu.className = 'submenu-navegacion';
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(open));
      group.classList.toggle('submenu-abierto', open);
    });
    const close = () => {
      button.setAttribute('aria-expanded', 'false');
      group.classList.remove('submenu-abierto');
    };
    document.addEventListener('click', event => { if (!group.contains(event.target)) close(); });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
        close();
        button.focus();
      }
    });
    group.append(button, submenu);
    menu.append(group);
  }
  document.querySelectorAll('#especialidades .tarjeta').forEach(card => {
    const title = card.querySelector('h4')?.textContent || '';
    const career = title.includes('Informática') ? carreras[0] :
      title.includes('Madera') ? carreras[1] : title.includes('Maestro') ? carreras[2] : null;
    if (career && !card.querySelector('a')) {
      const a = document.createElement('a');
      a.href = career[0];
      a.className = 'btn-principal';
      a.textContent = 'Conocer la carrera →';
      (card.querySelector('.tarjeta-body') || card).append(a);
    }
  });
  const response = await fetch('assets/cms/componentes.json');
  if (!response.ok) throw new Error('No se pudieron cargar los componentes institucionales.');
  const components = await response.json();
  const wrapper = document.createElement('aside');
  wrapper.className = 'sitio-complementos';
  wrapper.dataset.sitioCompleto = 'true';
  wrapper.setAttribute('aria-label', 'Carreras y servicios de la comunidad');
  wrapper.append(links());
  const resources = document.createElement('nav');
  resources.className = 'sitio-carreras';
  resources.setAttribute('aria-label', 'Comunicados y recursos');
  for (const [href, text] of [
    ['novedades.html', 'Comunicados y recursos'],
    ['novedades.html?kind=documento', 'Documentos'],
    ['novedades.html?kind=proyecto', 'Proyectos estudiantiles'],
    ['novedades.html?kind=horario', 'Horarios y equipo docente'],
    ['notificaciones.html', 'Mis notificaciones']
  ]) {
    const link = document.createElement('a'); link.href = href; link.textContent = text; resources.append(link);
  }
  wrapper.append(resources);
  const insertar = html => {
    const template = document.createElement('template');
    template.innerHTML = html;
    wrapper.append(template.content);
  };
  const needsWeather = !document.querySelector('[data-weather-component]');
  const needsPlayer = !document.querySelector('.audio-reproductor');
  if (needsWeather) insertar(components.weather);
  if (needsPlayer) insertar(components.player);
  const hasCounter = Boolean(document.querySelector('.numero-visitas'));
  if (!document.querySelector('.redes-sociales')) {
    const template = document.createElement('template');
    template.innerHTML = components.footer;
    wrapper.append(template.content.querySelector('.contador-visitas'), template.content.querySelector('.redes-sociales'));
  }
  document.querySelector('main').after(wrapper);
  if (!hasCounter && !window.CMS_PREVIEW) {
    const key = 'eest3-visitas-dispositivo';
    const visits = (Number.parseInt(localStorage.getItem(key) || '0', 10) || 0) + 1;
    localStorage.setItem(key, String(visits));
    wrapper.querySelector('.numero-visitas').textContent = visits.toLocaleString('es-AR');
  }
  if (needsWeather) await import('./clima.js');
  if (needsPlayer || ['galeria.html','informatica.html','madera.html','obras.html'].some(file => location.pathname.endsWith(`/${file}`))) iniciarReproductor();
}
if (!document.querySelector('script[src*="cms-publico.mjs"]')) {
  completarSitio().catch(error => {
    console.error(error);
    const message = document.createElement('p');
    message.setAttribute('role', 'status');
    message.textContent = error.message;
    document.querySelector('main').after(message);
  });
}
