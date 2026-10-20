import { SKYNET_TOPICS, careerContext, introducedName, normalize, skynetAnswer, validateAnswer, validateNickname, validateQuestion } from './skynet-modelo.mjs';
import { SKYNET_POLICY, searchPlan, searchPublications, withPublications } from './skynet-servicios.mjs';
import { obtenerCliente, resultado } from './supabase-cliente.mjs';

export function startSkynet() {
  if (document.getElementById('skynet-dialog') || window.CMS_PREVIEW) return;
  const node = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const style = node('link'); style.rel = 'stylesheet'; style.href = 'assets/css/skynet.css'; document.head.append(style);
  const avatar = className => {
    const image = node('img', '', className);
    image.src = 'assets/images/skynet.png'; image.alt = ''; image.width = 96; image.height = 96;
    return image;
  };
  const launcher = node('button', '', 'skynet-launcher'); launcher.type = 'button';
  launcher.append(avatar('skynet-avatar'), node('span', 'Skynet · Ayuda'));
  launcher.setAttribute('aria-haspopup', 'dialog'); launcher.setAttribute('aria-controls', 'skynet-dialog');
  const dialog = node('dialog', '', 'skynet-dialog'); dialog.id = 'skynet-dialog';
  dialog.setAttribute('aria-labelledby', 'skynet-title');
  const header = node('header', '', 'skynet-header');
  const identity = node('div', '', 'skynet-identity');
  const title = node('h2', 'Skynet'); title.id = 'skynet-title';
  const subtitle = node('p', 'Tu guía de Técnica 3');
  const heading = node('div'); heading.append(title, subtitle);
  identity.append(avatar('skynet-portrait'), heading);
  const close = node('button', 'Cerrar'); close.type = 'button'; header.append(identity, close);
  const description = node('p', 'Orientación institucional con fuentes verificables. No soy IA generativa ni atención humana. No escribas datos personales, contraseñas ni documentación sensible.');
  const greeting = node('p', '¡Hola! Soy Skynet. ¿Cómo querés que te llame? Podés elegir un nombre de pila o apodo, o continuar sin nombre.', 'skynet-greeting');
  const nameDetails = node('details', '', 'skynet-privacy');
  nameDetails.append(node('summary', 'Cómo llamarte'));
  const nameForm = node('form');
  const nameLabel = node('label', 'Nombre de pila o apodo (opcional)');
  const nameInput = node('input'); nameInput.type = 'text'; nameInput.maxLength = 40; nameInput.name = 'apodo';
  nameInput.autocomplete = 'off'; nameLabel.append(nameInput);
  const rememberLabel = node('label', '', 'skynet-consent');
  const rememberName = node('input'); rememberName.type = 'checkbox';
  rememberLabel.append(rememberName, node('span', 'Autorizo recordar este nombre en mi cuenta para próximas visitas.'));
  const nameSave = node('button', 'Usar este nombre'); nameSave.type = 'submit';
  const forgetName = node('button', 'Olvidar mi nombre'); forgetName.type = 'button';
  nameForm.append(nameLabel, rememberLabel, nameSave, forgetName,
    node('p', 'Sin autorización se usa solo en esta página. Iniciá sesión para recordarlo; no hace falta indicar tu nombre completo.'));
  nameDetails.append(nameForm);
  const privacy = node('details', '', 'skynet-privacy');
  privacy.append(node('summary', 'Privacidad e historial'));
  const historyState = node('p', 'Sin iniciar: las consultas solo estarán en esta página.');
  const account = node('a', 'Ingresar o crear mi cuenta'); account.href = 'comunidad.html';
  const consentForm = node('form'); consentForm.hidden = true;
  const consentLabel = node('label', '', 'skynet-consent');
  const consent = node('input'); consent.type = 'checkbox';
  consentLabel.append(consent, node('span', 'Autorizo guardar mis próximas consultas y respuestas en mi cuenta de Supabase. Hasta 100 turnos durante 90 días, privados para mi cuenta en el portal.'));
  const saveConsent = node('button', 'Guardar elección'); saveConsent.type = 'submit';
  consentForm.append(consentLabel, saveConsent,
    node('p', 'Desactivar elimina el historial guardado. No se guardan retroactivamente las consultas previas. Administradores del portal no pueden leerlo; operadores del servicio de base de datos pueden acceder para tareas técnicas autorizadas.'));
  const policy = node('a', 'Leer política de privacidad'); policy.href = 'privacidad.html';
  privacy.append(historyState, account, consentForm, policy);
  const topics = node('div', '', 'skynet-topics'); topics.setAttribute('aria-label', 'Temas de ayuda');
  const context = node('p', 'Sin carrera seleccionada.', 'skynet-context');
  const resetContext = node('button', 'Quitar contexto'); resetContext.type = 'button';
  const more = node('button', 'Cargar conversación anterior'); more.type = 'button'; more.hidden = true;
  const log = node('div', '', 'skynet-log'); log.setAttribute('role', 'log');
  log.setAttribute('aria-live', 'polite'); log.setAttribute('aria-label', 'Conversación de orientación');
  const form = node('form', '', 'skynet-question');
  const label = node('label', 'Tu consulta (máximo 300 caracteres)');
  const input = node('input'); input.type = 'text'; input.maxLength = 300; input.required = true;
  input.autocomplete = 'off'; input.name = 'consulta'; label.append(input);
  const send = node('button', 'Consultar'); send.type = 'submit';
  const tools = node('div', '', 'skynet-tools');
  const clear = node('button', 'Borrar historial'); clear.type = 'button';
  const exportButton = node('button', 'Descargar conversación'); exportButton.type = 'button';
  tools.append(clear, exportButton, resetContext);
  const notice = node('p'); notice.setAttribute('role', 'status'); notice.id = 'skynet-status';
  form.append(label, send);
  dialog.append(header, description, greeting, nameDetails, privacy, topics, context, more, log, form, tools, notice);
  document.body.append(launcher, dialog);

  let client;
  let userId;
  let enabled = false;
  let initialized;
  let subscription;
  let sessionKnown = false;
  let nickname = '';
  let revision = 0;
  let busy = false;
  let selectedCareer = '';
  let cursor = null;
  let turns = [];
  let controller;
  function message(text, error = false) {
    notice.textContent = text; notice.dataset.error = String(error);
  }
  function showContext() {
    context.textContent = selectedCareer
      ? `Contexto: ${SKYNET_TOPICS.find(topic => topic.id === selectedCareer).label}. Se usa para buscar horarios y documentos.`
      : 'Sin carrera seleccionada. Podés pedir “Informática” y después “¿y los horarios?”.';
  }
  function reset() {
    turns = []; cursor = null; more.hidden = true; selectedCareer = '';
    log.replaceChildren(); input.value = ''; showContext();
  }
  function historyNotice() {
    historyState.textContent = !userId ? 'Sin sesión: conversación temporal, no se guarda.'
      : enabled ? 'Historial privado activado: hasta 100 turnos y 90 días. Las respuestas guardadas son históricas; verificá las fuentes vigentes.'
        : 'Historial desactivado. Podés conversar sin guardar o autorizar el guardado de las próximas consultas.';
    consent.checked = enabled; consentForm.hidden = !userId; account.hidden = Boolean(userId);
    rememberName.disabled = !userId;
  }
  function greet() {
    greeting.textContent = nickname ? `¡Hola, ${nickname}! ¿Seguimos con tu consulta?`
      : '¡Hola! Soy Skynet. ¿Cómo querés que te llame? Podés elegir un nombre de pila o apodo, o continuar sin nombre.';
  }
  async function request(query, generation = revision) {
    const response = await query;
    if (generation !== revision) throw new DOMException('Session changed', 'AbortError');
    return resultado(response);
  }
  async function action(work) {
    if (busy) return;
    busy = true;
    send.disabled = true; topics.inert = true; tools.inert = true; consentForm.inert = true; nameForm.inert = true; more.disabled = true;
    dialog.setAttribute('aria-busy', 'true');
    const generation = revision;
    try { await work(generation); } catch (error) {
      if (error.name === 'AbortError' && generation !== revision) return;
      console.error('Skynet:', error.code || error.name);
      message(['42P01','PGRST202','PGRST205'].includes(error.code)
        ? 'El historial todavía no está activado en el servidor. Podés usar la orientación sin guardar; no se confirmó ninguna escritura.'
        : error.code ? 'No se pudo completar la operación en tu cuenta. Verificá la sesión y reintentá; no se confirmó ningún cambio.'
          : error.message || 'No se pudo completar la operación. Reintentá.', true);
    } finally {
      busy = false;
      send.disabled = false; topics.inert = false; tools.inert = false; consentForm.inert = false; nameForm.inert = false; more.disabled = false;
      dialog.removeAttribute('aria-busy');
    }
  }
  async function persist(turn, generation) {
    if (!enabled || !userId) return;
    try {
      turn.id = await request(client.rpc('skynet_history_append', {
        turn_id: turn.request_id, question: turn.question, answer: turn.answer
      }).abortSignal(AbortSignal.timeout(12000)), generation);
      turn.saved = true;
    } catch (error) {
      if (generation !== revision) throw error;
      turn.saved = false;
      message('La respuesta está disponible, pero NO se confirmó su guardado. Usá “Reintentar guardado”; no se duplicará.', true);
      console.error('Skynet historial:', error.code || error.name);
    }
  }
  function render() {
    log.replaceChildren();
    for (const turn of turns) {
      const article = node('article');
      article.append(node('h3', turn.question), node('p', turn.answer.text, 'skynet-answer'));
      article.append(node('p', `${new Date(turn.created_at).toLocaleString('es-AR')} · ${turn.saved ? 'Guardada en tu cuenta · verificar vigencia' : 'Solo en esta página'}`, 'skynet-meta'));
      const sources = node('nav'); sources.setAttribute('aria-label', 'Fuentes y próximos pasos');
      for (const [href, text] of turn.answer.links) {
        const link = node('a', text); link.href = href; sources.append(link);
      }
      article.append(sources);
      if (enabled && !turn.saved && turn.persistable !== false) {
        const retry = node('button', 'Reintentar guardado'); retry.type = 'button';
        retry.addEventListener('click', () => action(async generation => {
          await persist(turn, generation);
          if (generation !== revision) return;
          render(); if (turn.saved) message('Consulta guardada sin duplicados.');
        }));
        article.append(retry);
      }
      log.append(article);
    }
  }
  function readRows(rows) {
    if (!Array.isArray(rows) || rows.length > 30) throw new Error('Historial inválido.');
    return rows.map(row => {
      if (typeof row.question !== 'string' || !row.question.trim() || row.question.length > 300 ||
        !Number.isFinite(Date.parse(row.created_at))) throw new Error('Historial inválido.');
      return { ...row, answer: validateAnswer(row.answer), saved: true };
    });
  }
  async function loadHistory(older, generation) {
    const rows = readRows(await request(client.rpc('skynet_history_list', { before_id: older ? cursor : null })
      .abortSignal(AbortSignal.timeout(12000)), generation));
    const existing = older ? turns : [];
    turns = [...rows.reverse(), ...existing].filter((turn, index, all) =>
      all.findIndex(other => other.request_id === turn.request_id) === index).slice(-100);
    cursor = rows[0]?.id ?? cursor; more.hidden = rows.length < 30;
    if (!older) selectedCareer = turns.reduce((career, turn) => careerContext(turn.question, career), '');
    showContext();
    render();
  }
  async function initialize() {
    if (initialized) return initialized;
    initialized = (async () => {
      if (!window.COMUNIDAD_CONFIG) await new Promise((resolve, reject) => {
        const script = node('script'); script.src = 'assets/js/comunidad-config.js';
        script.onload = resolve; script.onerror = () => reject(new Error('No se pudo cargar la configuración de Skynet.'));
        document.head.append(script);
      });
      client = await obtenerCliente();
      if (!subscription) subscription = client.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || event === 'SIGNED_IN' && sessionKnown && session?.user.id !== userId) {
          revision++; controller?.abort(); userId = null; enabled = false; reset(); historyNotice();
          nickname = ''; nameInput.value = ''; rememberName.checked = false; greet();
          message('La sesión cambió. Se limpió la conversación privada. Recargá la página para conectar tu cuenta.');
        }
      });
      const generation = revision;
      const response = await client.auth.getUser();
      if (generation !== revision) throw new DOMException('Session changed', 'AbortError');
      sessionKnown = true;
      if (response.error?.name === 'AuthSessionMissingError') { historyNotice(); return; }
      const { user } = resultado(response); userId = user.id;
      historyNotice();
      const preference = await request(client.from('skynet_preferences').select('enabled,display_name')
        .eq('user_id', userId).maybeSingle().abortSignal(AbortSignal.timeout(12000)), generation);
      enabled = preference?.enabled === true; historyNotice();
      nickname = preference?.display_name ? validateNickname(preference.display_name) : '';
      nameInput.value = nickname; rememberName.checked = Boolean(nickname); greet();
      if (enabled) await loadHistory(false, generation);
    })().catch(error => { initialized = null; throw error; });
    return initialized;
  }
  async function answer(question, generation) {
    validateQuestion(question);
    const proposedName = introducedName(question);
    if (proposedName) {
      nameInput.value = proposedName; nameDetails.open = true;
      message('Confirmá “Usar este nombre”. Marcá la autorización solo si querés recordarlo en tu cuenta. Esta presentación no se guardó en el historial.');
      nameInput.focus(); return;
    }
    if (/^(como me llamo|recordas mi nombre|sabes mi nombre)$/.test(normalize(question))) {
      message(nickname ? `En esta conversación te llamo ${nickname}. Podés cambiarlo u olvidarlo en “Cómo llamarte”.`
        : 'Todavía no elegiste cómo llamarte. Podés indicarlo en “Cómo llamarte” o continuar sin nombre.');
      return;
    }
    message('Consultando orientación y fuentes…');
    let result = skynetAnswer(question, selectedCareer);
    const career = careerContext(question, selectedCareer);
    const plan = searchPlan(question, result, career);
    if (plan) {
      controller = new AbortController();
      try {
        const rows = await searchPublications(window.COMUNIDAD_CONFIG, plan,
          AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]));
        result = withPublications(result, rows, plan);
      } catch (error) {
        if (generation !== revision) return;
        message('No pude consultar el catálogo en este momento. La orientación siguiente no confirma información vigente. Reintentá la consulta o abrí las fuentes.', true);
        console.error('Skynet catálogo:', error.name);
      }
    }
    if (generation !== revision) return;
    selectedCareer = career; showContext();
    const turn = { request_id: crypto.randomUUID(), question, persistable: notice.dataset.error !== 'true', answer: validateAnswer({
      id: result.id, text: result.text, links: result.links
    }), created_at: new Date().toISOString(), saved: false };
    turns.push(turn); turns = turns.slice(-100);
    if (notice.dataset.error !== 'true') message('Respuesta preparada. Verificá las fuentes antes de realizar un trámite.');
    if (turn.persistable) await persist(turn, generation);
    if (generation !== revision) return;
    render(); log.lastElementChild?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }
  for (const topic of SKYNET_TOPICS) {
    const button = node('button', topic.label); button.type = 'button';
    button.addEventListener('click', () => action(generation => answer(topic.label, generation))); topics.append(button);
  }
  form.addEventListener('submit', event => {
    event.preventDefault(); if (!form.reportValidity()) return;
    const question = input.value.trim();
    action(async generation => {
      validateQuestion(question); input.value = '';
      await answer(question, generation); input.focus();
    });
  });
  nameForm.addEventListener('submit', event => {
    event.preventDefault();
    action(async generation => {
      const nextName = validateNickname(nameInput.value);
      if (userId) await request(client.rpc('skynet_name_set', { nickname: rememberName.checked ? nextName : null })
        .abortSignal(AbortSignal.timeout(12000)), generation);
      nickname = nextName; greet();
      message(rememberName.checked && userId ? 'Nombre guardado en tu cuenta con autorización. Podés olvidarlo cuando quieras.'
        : 'Usaré este nombre solo en esta página. No se guardó en tu cuenta.');
    });
  });
  forgetName.addEventListener('click', () => action(async generation => {
    if (userId) await request(client.rpc('skynet_name_set', { nickname: null }).abortSignal(AbortSignal.timeout(12000)), generation);
    nickname = ''; nameInput.value = ''; rememberName.checked = false; greet();
    message('Nombre olvidado. Podés seguir sin identificarte.');
  }));
  consentForm.addEventListener('submit', event => {
    event.preventDefault();
    const next = consent.checked;
    action(async generation => {
      if (!next && !confirm('¿Desactivar y eliminar todas tus consultas y respuestas guardadas? No puede deshacerse.')) {
        consent.checked = enabled; return;
      }
      await request(client.rpc('skynet_consent', { save_history: next, policy_version: SKYNET_POLICY })
        .abortSignal(AbortSignal.timeout(12000)), generation);
      enabled = next; reset(); historyNotice();
      if (enabled) await loadHistory(false, generation);
      message(next ? 'Consentimiento guardado. Se guardarán únicamente las próximas consultas.'
        : 'Historial eliminado y guardado desactivado.');
    });
  });
  more.addEventListener('click', () => action(generation => loadHistory(true, generation)));
  clear.addEventListener('click', () => action(async generation => {
    if (!confirm('¿Eliminar toda esta conversación, incluido el historial guardado de tu cuenta? No puede deshacerse.')) return;
    if (userId) await request(client.rpc('skynet_history_clear').abortSignal(AbortSignal.timeout(12000)), generation);
    reset(); message('Conversación eliminada. La elección de guardado no cambió.'); input.focus();
  }));
  resetContext.addEventListener('click', () => { selectedCareer = ''; showContext(); message('Contexto de carrera eliminado.'); });
  exportButton.addEventListener('click', () => action(async generation => {
    let saved = [];
    if (userId && enabled) {
      let before = null;
      for (let page = 0; page < 4; page++) {
        const rows = readRows(await request(client.rpc('skynet_history_list', { before_id: before })
          .abortSignal(AbortSignal.timeout(12000)), generation));
        saved.push(...rows);
        if (rows.length < 30) break;
        before = rows.at(-1).id;
      }
    }
    const exported = [...saved.reverse(), ...turns].filter((turn, index, all) =>
      all.findIndex(other => other.request_id === turn.request_id) === index).slice(-100);
    if (!exported.length) { message('Todavía no hay conversación para descargar.'); return; }
    const url = URL.createObjectURL(new Blob([JSON.stringify({
      assistant: 'Skynet', exported_at: new Date().toISOString(),
      warning: 'Copia privada. Las respuestas pueden haber perdido vigencia. No compartir datos personales.',
      turns: exported.map(({ question, answer, created_at }) => ({ question, answer, created_at }))
    }, null, 2)], { type: 'application/json' }));
    const link = node('a'); link.href = url; link.download = 'skynet-conversacion.json';
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    message('Conversación descargada. Guardá el archivo en un lugar privado.');
  }));
  launcher.addEventListener('click', () => {
    dialog.showModal(); input.focus();
    action(async () => { await initialize(); });
  });
  function closeDialog() {
    dialog.close();
    launcher.focus();
  }
  close.addEventListener('click', closeDialog);
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    event.preventDefault(); event.stopPropagation(); closeDialog();
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(); });
  dialog.addEventListener('close', () => launcher.focus());
  showContext();
}
