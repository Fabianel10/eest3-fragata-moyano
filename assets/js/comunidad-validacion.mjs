export const PERFILES = Object.freeze({
  comunidad: 'Comunidad',
  alumno: 'Alumno/a',
  profesor: 'Profesor/a',
  administrador: 'Administrador/a'
});

export function validarRegistro({ nombre, perfil, password, confirmacion, privacidad }) {
  if (nombre.trim().length < 2 || nombre.trim().length > 100) {
    throw new Error('Ingresá un nombre de entre 2 y 100 caracteres.');
  }
  if (!['comunidad', 'alumno', 'profesor'].includes(perfil)) {
    throw new Error('Seleccioná un perfil público válido.');
  }
  validarPassword(password, confirmacion);
  if (!privacidad) throw new Error('Necesitás aceptar la información sobre tus datos.');
}

export function validarPassword(password, confirmacion) {
  if (password.length < 12 || password.length > 128) {
    throw new Error('La contraseña debe tener entre 12 y 128 caracteres.');
  }
  if (password !== confirmacion) throw new Error('Las contraseñas no coinciden.');
}

export function fuerzaPassword(password) {
  if (!password) return { porcentaje: 0, texto: 'aún sin contraseña' };
  if (password.length < 12) return { porcentaje: 25, texto: 'demasiado corta' };
  const variedad = [/[a-z]/i, /[0-9]/, /[^a-z0-9]/i].filter((regla) => regla.test(password)).length;
  if (password.length >= 20 || (password.length >= 16 && variedad >= 2)) {
    return { porcentaje: 100, texto: 'robusta; usala solo en este sitio' };
  }
  return { porcentaje: 65, texto: 'longitud válida; una frase más larga es mejor' };
}

export function mensajeError(error) {
  const mensajes = {
    invalid_credentials: 'El correo o la contraseña no son correctos.',
    email_not_confirmed: 'Primero confirmá tu correo desde el enlace que te enviamos.',
    user_already_exists: 'No pudimos crear la cuenta. Probá iniciar sesión o recuperar tu contraseña.',
    email_exists: 'No pudimos crear la cuenta. Probá iniciar sesión o recuperar tu contraseña.',
    over_email_send_rate_limit: 'Se enviaron demasiados correos. Esperá unos minutos antes de intentar de nuevo.',
    over_request_rate_limit: 'Hay demasiados intentos. Esperá unos minutos.',
    weak_password: 'Elegí una contraseña más segura y que no hayas usado antes.',
    session_not_found: 'La sesión venció. Volvé a iniciar sesión.',
    otp_expired: 'El enlace venció o ya fue usado. Solicitá uno nuevo.',
    validation_failed: 'Revisá los datos ingresados.',
    signup_disabled: 'El registro está deshabilitado. Contactá a la escuela.'
  };
  if (error.code && mensajes[error.code]) return mensajes[error.code];
  if (error instanceof TypeError) return 'No pudimos conectar. Revisá tu conexión e intentá de nuevo.';
  if (error.name === 'AuthApiError' || error.code) {
    return 'No pudimos completar la operación. Intentá de nuevo; si continúa, contactá a la escuela.';
  }
  return error.message || 'Ocurrió un error inesperado. Intentá de nuevo.';
}
