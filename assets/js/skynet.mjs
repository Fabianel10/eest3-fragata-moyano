import { SKYNET_TOPICS, skynetAnswer } from './skynet-modelo.mjs';

export function startSkynet() {
  if (document.getElementById('skynet-dialog') || window.CMS_PREVIEW) return;
  const style = document.createElement('link');
  style.rel = 'stylesheet'; style.href = 'assets/css/skynet.css'; document.head.append(style);
  const node = (tag, text) => { const element = document.createElement(tag); if (text) element.textContent = text; return element; };
  const launcher = node('button', 'Skynet · Ayuda');
  launcher.className = 'skynet-launcher'; launcher.type = 'button';
  launcher.setAttribute('aria-haspopup', 'dialog'); launcher.setAttribute('aria-controls', 'skynet-dialog');
  const dialog = node('dialog'); dialog.id = 'skynet-dialog'; dialog.className = 'skynet-dialog';
  dialog.setAttribute('aria-labelledby', 'skynet-title');
  const header = node('div'); header.className = 'skynet-header';
  const title = node('h2', 'Skynet'); title.id = 'skynet-title';
  const close = node('button', 'Cerrar'); close.type = 'button';
  header.append(title, close);
  const description = node('p', 'Asistente de orientación de Técnica 3. Respuestas por temas basadas en el sitio; no es IA generativa ni atención humana. No escribas datos personales.');
  const topics = node('div'); topics.className = 'skynet-topics'; topics.setAttribute('aria-label', 'Temas de ayuda');
  const log = node('div'); log.className = 'skynet-log'; log.setAttribute('role', 'log'); log.setAttribute('aria-live', 'polite'); log.setAttribute('aria-label', 'Conversación de orientación');
  function answer(question) {
    try {
      const result = skynetAnswer(question);
      const turn = node('article');
      turn.append(node('h3', question), node('p', result.text));
      const sources = node('nav'); sources.setAttribute('aria-label', 'Fuentes y próximos pasos');
      result.links.forEach(([href, label]) => { const link = node('a', label); link.href = href; sources.append(link); });
      turn.append(sources); log.append(turn);
      while (log.children.length > 8) log.firstElementChild.remove();
      turn.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    } catch (error) { notice.textContent = error.message; }
  }
  SKYNET_TOPICS.forEach(topic => {
    const button = node('button', topic.label); button.type = 'button';
    button.addEventListener('click', () => answer(topic.label)); topics.append(button);
  });
  const form = node('form');
  const label = node('label', 'Tu consulta (máximo 300 caracteres)');
  const input = node('input'); input.type = 'text'; input.maxLength = 300; input.required = true;
  input.autocomplete = 'off'; input.name = 'consulta'; label.append(input);
  const send = node('button', 'Consultar'); send.type = 'submit';
  const clear = node('button', 'Borrar conversación'); clear.type = 'button';
  const notice = node('p'); notice.setAttribute('role', 'status');
  form.append(label, send, clear, notice);
  form.addEventListener('submit', event => {
    event.preventDefault(); if (!form.reportValidity()) return;
    notice.textContent = ''; answer(input.value.trim()); input.value = ''; input.focus();
  });
  clear.addEventListener('click', () => { log.replaceChildren(); notice.textContent = 'Conversación eliminada de esta página.'; input.value = ''; input.focus(); });
  launcher.addEventListener('click', () => { dialog.showModal(); input.focus(); });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    dialog.close();
  });
  dialog.addEventListener('close', () => launcher.focus());
  dialog.append(header, description, topics, log, form);
  document.body.append(launcher, dialog);
}
