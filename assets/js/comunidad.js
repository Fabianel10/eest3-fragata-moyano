import { PERFILES, validarRegistro, validarPassword, fuerzaPassword, mensajeError } from './comunidad-validacion.mjs';
import { obtenerCliente, configurado } from './supabase-cliente.mjs';

const estado = document.querySelector('#portal-estado');
const publico = document.querySelector('#acceso-publico');
const cuenta = document.querySelector('#cuenta-panel');
const panelAdmin = document.querySelector('#admin-panel');
const formularios = [...document.querySelectorAll('.portal-form')];
let cliente;
let usuarioActual = null;
let revisionSesion = 0;
let mfaFactorId = null;
let mfaEnrolamientoId = null;
let sesionActualId = null;
let perfilActual = null;
let recuperando = new URLSearchParams(location.search).get('recuperacion') === '1' ||
  new URLSearchParams(location.hash.slice(1)).get('type') === 'recovery';

function notificar(texto, tipo = 'info') {
  estado.textContent = texto;
  estado.dataset.tipo = tipo;
  estado.hidden = false;
  estado.focus();
}

function mostrarVista(vista, enfocar = false) {
  const opciones = ['login', 'registro', 'recuperar', 'nueva-password', 'mfa'];
  if (!opciones.includes(vista)) vista = 'login';
  if (vista === 'nueva-password' && !recuperando) vista = 'recuperar';
  publico.hidden = false;
  cuenta.hidden = true;
  document.querySelectorAll('[data-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.panel !== vista;
  });
  document.querySelectorAll('[data-vista]').forEach((enlace) => {
    if (enlace.dataset.vista === vista) enlace.setAttribute('aria-current', 'page');
    else enlace.removeAttribute('aria-current');
  });
  if (enfocar) document.querySelector(`[data-panel="${vista}"] h3`).focus();
}

window.addEventListener('hashchange', () => {
  if (!usuarioActual || recuperando) mostrarVista(location.hash.slice(1), true);
});
mostrarVista(location.hash.slice(1));

document.querySelectorAll('[data-password]').forEach((boton) => {
  boton.addEventListener('click', () => {
    const input = document.getElementById(boton.dataset.password);
    const visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    boton.textContent = visible ? 'Ocultar' : 'Ver';
    boton.setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
    boton.setAttribute('aria-pressed', String(visible));
  });
});
document.querySelector('#registro-password').addEventListener('input', (evento) => {
  const fuerza = fuerzaPassword(evento.target.value);
  document.querySelector('#password-barra').style.width = `${fuerza.porcentaje}%`;
  document.querySelector('#password-fuerza').textContent = `Seguridad: ${fuerza.texto}.`;
});

function enlazarFormulario(id, accion) {
  const form = document.getElementById(id);
  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (form.dataset.ocupado === 'true') return;
    if (!cliente) {
      notificar('El acceso no está disponible todavía. Revisá el aviso de configuración.', 'error');
      return;
    }
    const controles = [...form.elements];
    const deshabilitados = controles.map((control) => control.disabled);
    const datos = new FormData(form);
    form.dataset.ocupado = 'true';
    form.setAttribute('aria-busy', 'true');
    controles.forEach((control) => { control.disabled = true; });
    estado.hidden = true;
    try {
      await accion(datos, form);
    } catch (error) {
      console.error('Error del portal de comunidad:', error.name, error.code || '');
      notificar(mensajeError(error), 'error');
    } finally {
      controles.forEach((control, indice) => { control.disabled = deshabilitados[indice]; });
      delete form.dataset.ocupado;
      form.removeAttribute('aria-busy');
    }
  });
}

const correo = (datos) => datos.get('email').trim();
const destino = (recovery = false) => {
  const url = new URL('comunidad.html', location.href);
  if (recovery) url.searchParams.set('recuperacion', '1');
  return url.href;
};
function comprobar(resultado) {
  if (resultado.error) throw resultado.error;
  return resultado.data;
}

enlazarFormulario('form-login', async (datos, form) => {
  comprobar(await cliente.auth.signInWithPassword({
    email: correo(datos), password: datos.get('password')
  }));
  form.reset();
});
enlazarFormulario('form-registro', async (datos, form) => {
  const nombre = datos.get('nombre').trim();
  const perfil = datos.get('perfil');
  validarRegistro({
    nombre, perfil, password: datos.get('password'),
    confirmacion: datos.get('confirmacion'), privacidad: datos.has('privacidad')
  });
  const data = comprobar(await cliente.auth.signUp({
    email: correo(datos), password: datos.get('password'),
    options: {
      emailRedirectTo: destino(),
      data: {
        full_name: nombre, requested_role: perfil, email_notifications: datos.has('avisos'),
        privacy_version: '2026-10-06'
      }
    }
  }));
  form.reset();
  document.querySelector('#password-barra').style.width = '0%';
  document.querySelector('#password-fuerza').textContent = 'Seguridad: aún sin contraseña.';
  if (!data.session) {
    location.hash = 'login';
    notificar('Revisá tu correo para confirmar la cuenta. Si ya estaba registrada, podés iniciar sesión o recuperar tu contraseña.');
  }
});
enlazarFormulario('form-recuperar', async (datos, form) => {
  comprobar(await cliente.auth.resetPasswordForEmail(correo(datos), { redirectTo: destino(true) }));
  form.reset();
  notificar('Si existe una cuenta con ese correo, recibirás un enlace de recuperación. Revisá también el correo no deseado.');
});
enlazarFormulario('form-nueva-password', async (datos, form) => {
  validarPassword(datos.get('password'), datos.get('confirmacion'));
  comprobar(await cliente.auth.updateUser({ password: datos.get('password') }));
  form.reset();
  recuperando = false;
  history.replaceState(null, '', location.pathname);
  await sincronizarSesion();
  notificar('Tu contraseña se actualizó correctamente.');
});

enlazarFormulario('form-mfa-login', async (datos, form) => {
  const factors = comprobar(await cliente.auth.mfa.listFactors());
  const lista = [...(factors.totp || []), ...(factors.all || [])]
    .filter((factor) => factor.status === 'verified' && (factor.factor_type === 'totp' || factor.type === 'totp'));
  if (!lista.length) throw new Error('No hay un factor de verificación configurado.');
  const challenge = comprobar(await cliente.auth.mfa.challenge({ factorId: lista[0].id }));
  comprobar(await cliente.auth.mfa.verify({
    factorId: lista[0].id, challengeId: challenge.id, code: datos.get('code').trim()
  }));
  form.reset();
  await sincronizarSesion();
  notificar('Verificación en dos pasos completada.');
});

enlazarFormulario('form-mfa-verificar', async (datos, form) => {
  if (!mfaEnrolamientoId) throw new Error('Iniciá la activación de 2FA primero.');
  const challenge = comprobar(await cliente.auth.mfa.challenge({ factorId: mfaEnrolamientoId }));
  comprobar(await cliente.auth.mfa.verify({
    factorId: mfaEnrolamientoId, challengeId: challenge.id, code: datos.get('code').trim()
  }));
  mfaEnrolamientoId = null;
  form.reset();
  await sincronizarSesion();
  notificar('Verificación en dos pasos activada.');
});
enlazarFormulario('form-preferencias', async (datos) => {
  if (!usuarioActual) throw new Error('Iniciá sesión para guardar tus preferencias.');
  const nombre = datos.get('nombre').trim();
  if (nombre.length < 2 || nombre.length > 100) throw new Error('Revisá tu nombre y apellido.');
  comprobar(await cliente.from('profiles').update({
    full_name: nombre,
    email_notifications: datos.has('avisos'),
    topics: datos.getAll('temas')
  }).eq('id', usuarioActual.id).select('id').single());
  await sincronizarSesion();
  notificar('Tus preferencias quedaron guardadas.');
});

async function pintarPerfil(perfil, usuario) {
  perfilActual = perfil;
  publico.hidden = true;
  cuenta.hidden = false;
  document.querySelector('#titulo-cuenta').textContent = `Hola, ${perfil.full_name.split(' ')[0]}.`;
  document.querySelector('#cuenta-avatar').textContent = perfil.full_name.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  document.querySelector('#cuenta-email').textContent = usuario.email;
  document.querySelector('#cuenta-rol').textContent = PERFILES[perfil.role];
  const solicitud = document.querySelector('#cuenta-solicitud');
  solicitud.hidden = perfil.requested_role === perfil.role || ['administrador', 'editor', 'revisor'].includes(perfil.role);
  solicitud.textContent = `Tu solicitud de perfil ${PERFILES[perfil.requested_role]} está pendiente de revisión. Mientras tanto, podés usar tu cuenta de comunidad.`;
  const form = document.querySelector('#form-preferencias');
  form.hidden = false;
  form.elements.nombre.value = perfil.full_name;
  form.elements.avisos.checked = perfil.email_notifications;
  form.querySelectorAll('[name="temas"]').forEach((input) => {
    input.checked = perfil.topics.includes(input.value);
  });
  panelAdmin.hidden = perfil.role !== 'administrador';
  await Promise.all([cargarMfa(perfil), cargarSesiones()]);
}

async function cargarMfa(perfil) {
  const estado = document.querySelector('#mfa-estado');
  const factors = comprobar(await cliente.auth.mfa.listFactors());
  const lista = [...(factors.totp || []), ...(factors.all || [])]
    .filter((factor) => factor.status === 'verified' && (factor.factor_type === 'totp' || factor.type === 'totp'));
  mfaFactorId = lista[0]?.id || null;
  document.querySelector('#mfa-activar').hidden = Boolean(mfaFactorId);
  document.querySelector('#mfa-desactivar').hidden = !mfaFactorId;
  document.querySelector('#mfa-enrolamiento').hidden = true;
  document.querySelector('#mfa-exigir').checked = Boolean(perfil.mfa_required);
  document.querySelector('#mfa-exigir').disabled = !mfaFactorId;
  estado.textContent = mfaFactorId
    ? '2FA activa. La cuenta puede exigir el código al iniciar sesión.'
    : '2FA no configurada. Activá un factor TOTP para proteger la cuenta.';
}

async function cargarSesiones() {
  const lista = document.querySelector('#sesiones-lista');
  lista.replaceChildren();
  const rows = comprobar(await cliente.rpc('auth_sessions_list'));
  sesionActualId = rows.find((row) => row.current)?.id || null;
  if (!rows.length) { const item = document.createElement('li'); item.textContent = 'No hay sesiones visibles.'; lista.append(item); return; }
  for (const row of rows) {
    const item = document.createElement('li');
    const agente = row.user_agent || 'Dispositivo sin datos';
    item.append(document.createTextNode(`${agente.slice(0, 120)} · ${new Date(row.updated_at).toLocaleString('es-AR')}${row.current ? ' · Esta sesión' : ''}`));
    if (!row.current) {
      const cerrar = document.createElement('button');
      cerrar.type = 'button'; cerrar.className = 'portal-secondary'; cerrar.textContent = 'Cerrar sesión';
      cerrar.addEventListener('click', async () => {
        if (!confirm('¿Cerrar esta sesión? El dispositivo tendrá que volver a iniciar sesión.')) return;
        try { comprobar(await cliente.rpc('auth_session_revoke', { p_session_id: row.id })); await cargarSesiones(); notificar('Sesión cerrada.'); }
        catch (error) { notificar(mensajeError(error), 'error'); }
      });
      item.append(cerrar);
    }
    lista.append(item);
  }
}

document.querySelector('#mfa-activar').addEventListener('click', async () => {
  try {
    const data = comprobar(await cliente.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Portal EEST N°3' }));
    mfaEnrolamientoId = data.id;
    const totp = data.totp || data;
    document.querySelector('#mfa-qr').src = totp.qr_code || totp.qrCode || '';
    document.querySelector('#mfa-secreto').textContent = totp.secret || '';
    document.querySelector('#mfa-enrolamiento').hidden = false;
    document.querySelector('#mfa-activar').hidden = true;
    document.querySelector('#mfa-estado').textContent = 'Escaneá el QR e ingresá el código para confirmar.';
  } catch (error) { notificar(mensajeError(error), 'error'); }
});
document.querySelector('#mfa-desactivar').addEventListener('click', async () => {
  if (!mfaFactorId || !confirm('¿Desactivar la verificación en dos pasos? La cuenta quedará protegida solo por contraseña.')) return;
  try {
    if (document.querySelector('#mfa-exigir').checked) {
      comprobar(await cliente.rpc('profile_mfa_require', { p_required: false }));
    }
    comprobar(await cliente.auth.mfa.unenroll({ factorId: mfaFactorId }));
    await sincronizarSesion();
    notificar('Verificación en dos pasos desactivada.');
  } catch (error) { notificar(mensajeError(error), 'error'); }
});
document.querySelector('#mfa-exigir').addEventListener('change', async (evento) => {
  evento.target.disabled = true;
  try {
    comprobar(await cliente.rpc('profile_mfa_require', { p_required: evento.target.checked }));
    notificar(evento.target.checked ? 'Se exigirá 2FA en el próximo acceso.' : 'La exigencia de 2FA quedó desactivada.');
  } catch (error) {
    evento.target.checked = !evento.target.checked;
    notificar(mensajeError(error), 'error');
  } finally { evento.target.disabled = false; }
});
document.querySelector('#sesiones-otras').addEventListener('click', async () => {
  if (!sesionActualId || !confirm('¿Cerrar todas las demás sesiones de tu cuenta?')) return;
  try {
    const cantidad = comprobar(await cliente.rpc('auth_sessions_revoke_others', { p_current_session: sesionActualId }));
    await cargarSesiones();
    notificar(`Se cerraron ${cantidad} sesiones.`);
  } catch (error) { notificar(mensajeError(error), 'error'); }
});

async function cargarSolicitudes() {
  const lista = document.querySelector('#admin-solicitudes');
  lista.replaceChildren();
  lista.setAttribute('aria-busy', 'true');
  try {
    const perfiles = comprobar(await cliente.from('profiles')
      .select('id,full_name,requested_role,created_at')
      .eq('role', 'comunidad').in('requested_role', ['alumno', 'profesor'])
      .order('created_at', { ascending: true }).limit(50));
    if (!perfiles.length) {
      const item = document.createElement('li');
      item.textContent = 'No hay solicitudes pendientes.';
      lista.append(item);
    }
    for (const perfil of perfiles) {
      const item = document.createElement('li');
      const nombre = document.createElement('strong');
      nombre.textContent = perfil.full_name;
      const detalle = document.createElement('small');
      detalle.textContent = `${PERFILES[perfil.requested_role]} · ${new Date(perfil.created_at).toLocaleDateString('es-AR')} · ID: ${perfil.id}`;
      const aprobar = document.createElement('button');
      aprobar.type = 'button';
      aprobar.className = 'portal-secondary';
      aprobar.textContent = `Aprobar ${PERFILES[perfil.requested_role]}`;
      aprobar.addEventListener('click', async () => {
        aprobar.disabled = true;
        try {
          comprobar(await cliente.rpc('approve_profile', { target_id: perfil.id }));
          await cargarSolicitudes();
          notificar('Perfil aprobado. Los permisos se actualizarán al volver a cargar la cuenta.');
        } catch (error) {
          notificar(mensajeError(error), 'error');
        } finally {
          aprobar.disabled = false;
        }
      });
      item.append(nombre, detalle, aprobar);
      lista.append(item);
    }
  } finally {
    lista.removeAttribute('aria-busy');
  }
}

async function sincronizarSesion() {
  const revision = ++revisionSesion;
  panelAdmin.hidden = true;
  const { session } = comprobar(await cliente.auth.getSession());
  if (revision !== revisionSesion) return;
  usuarioActual = session?.user || null;
  if (!usuarioActual) {
    const enlaceRecuperacion = recuperando;
    recuperando = false;
    mostrarVista(location.hash.slice(1));
    if (enlaceRecuperacion) {
      mostrarVista('recuperar');
      notificar('El enlace de recuperación no es válido o venció. Solicitá uno nuevo.', 'error');
    }
    return;
  }
  if (recuperando) {
    mostrarVista('nueva-password', true);
    return;
  }
  const assurance = comprobar(await cliente.auth.mfa.getAuthenticatorAssuranceLevel());
  if (assurance.nextLevel === 'aal2' && assurance.currentLevel !== 'aal2') {
    publico.hidden = false;
    cuenta.hidden = true;
    mostrarVista('mfa', true);
    notificar('Ingresá el código de tu aplicación autenticadora para completar el acceso.');
    return;
  }
  // El servidor verifica la identidad y RLS decide qué perfil se puede leer.
  const { user } = comprobar(await cliente.auth.getUser());
  const perfil = comprobar(await cliente.from('profiles').select('*').eq('id', user.id).single());
  if (revision !== revisionSesion) return;
  await pintarPerfil(perfil, user);
  if (perfil.role === 'administrador') await cargarSolicitudes();
}

function errorSesion(error) {
  if (usuarioActual && !recuperando) {
    publico.hidden = true;
    cuenta.hidden = false;
    document.querySelector('#form-preferencias').hidden = true;
    panelAdmin.hidden = true;
  }
  notificar(mensajeError(error), 'error');
}
document.querySelector('#cerrar-sesion').addEventListener('click', async (evento) => {
  evento.target.disabled = true;
  try {
    comprobar(await cliente.auth.signOut());
    usuarioActual = null;
    recuperando = false;
    formularios.forEach((form) => form.reset());
    location.hash = 'login';
    mostrarVista('login');
    notificar('Cerraste sesión en este dispositivo.');
  } catch (error) {
    notificar(mensajeError(error), 'error');
  } finally {
    evento.target.disabled = false;
  }
});
document.querySelector('#admin-actualizar').addEventListener('click', async (evento) => {
  evento.target.disabled = true;
  try { await cargarSolicitudes(); }
  catch (error) { notificar(mensajeError(error), 'error'); }
  finally { evento.target.disabled = false; }
});

async function iniciar() {
  const aviso = document.querySelector('#configuracion-aviso');
  if (!configurado()) {
    aviso.textContent = 'Portal en preparación. Falta conectar Supabase; todavía no se pueden crear cuentas ni iniciar sesión. No se guardan datos de estos formularios.';
    aviso.hidden = false;
    formularios.forEach((form) => { form.querySelector('[type="submit"]').disabled = true; });
    return;
  }
  const errorEnlace = new URLSearchParams(location.hash.slice(1)).get('error_description');
  if (errorEnlace) {
    history.replaceState(null, '', location.pathname);
    notificar('No pudimos verificar el enlace. Puede haber vencido o ya estar usado. Solicitá uno nuevo.', 'error');
  }
  try {
    cliente = await obtenerCliente();
    cliente.auth.onAuthStateChange((evento) => {
      if (evento === 'INITIAL_SESSION') return;
      if (evento === 'PASSWORD_RECOVERY') recuperando = true;
      // Fuera del callback de Auth para no bloquear el mutex del SDK.
      setTimeout(() => {
        document.querySelector('#form-preferencias').hidden = false;
        sincronizarSesion().catch(errorSesion);
      }, 0);
    });
    await sincronizarSesion();
  } catch (error) {
    errorSesion(error);
    if (!cliente) {
      aviso.textContent = 'No se pudo cargar el servicio de acceso. Revisá la conexión y recargá la página.';
      aviso.hidden = false;
    }
  }
}

iniciar();
