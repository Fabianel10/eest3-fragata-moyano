import test from 'node:test';
import assert from 'node:assert/strict';
import { validarRegistro, validarPassword, fuerzaPassword, mensajeError } from '../assets/js/comunidad-validacion.mjs';

const registro = {
  nombre: 'Persona de prueba', perfil: 'comunidad', password: 'una frase de prueba larga',
  confirmacion: 'una frase de prueba larga', privacidad: true
};

test('registro admite solo los tres perfiles públicos y aceptación explícita', () => {
  for (const perfil of ['comunidad', 'alumno', 'profesor']) {
    assert.doesNotThrow(() => validarRegistro({ ...registro, perfil }));
  }
  for (const perfil of ['administrador', '', 'admin']) {
    assert.throws(() => validarRegistro({ ...registro, perfil }), /perfil/);
  }
  assert.throws(() => validarRegistro({ ...registro, privacidad: false }), /aceptar/);
});

test('nombre y contraseña validan límites exactos y coincidencia', () => {
  assert.throws(() => validarRegistro({ ...registro, nombre: '  ' }), /nombre/);
  assert.throws(() => validarRegistro({ ...registro, nombre: 'n'.repeat(101) }), /nombre/);
  assert.doesNotThrow(() => validarRegistro({ ...registro, nombre: ' n '.repeat(30) }));
  for (const longitud of [0, 11, 129]) {
    assert.throws(() => validarPassword('x'.repeat(longitud), 'x'.repeat(longitud)), /12 y 128/);
  }
  for (const longitud of [12, 128]) {
    assert.doesNotThrow(() => validarPassword('x'.repeat(longitud), 'x'.repeat(longitud)));
  }
  assert.throws(() => validarPassword(registro.password, 'otra contraseña larga'), /no coinciden/);
});

test('medidor informa longitud sin prometer seguridad absoluta', () => {
  assert.equal(fuerzaPassword('').porcentaje, 0);
  assert.equal(fuerzaPassword('corta').porcentaje, 25);
  assert.equal(fuerzaPassword('abcdefghijkl').porcentaje, 65);
  assert.equal(fuerzaPassword('una frase larga de ejemplo').porcentaje, 100);
});

test('errores de Auth y conexión se muestran en español sin revelar mensajes internos', () => {
  assert.match(mensajeError({ code: 'invalid_credentials' }), /correo o la contraseña/);
  assert.match(mensajeError({ code: 'email_not_confirmed' }), /confirmá/);
  assert.match(mensajeError({ code: 'otp_expired' }), /venció/);
  assert.match(mensajeError({ code: 'over_email_send_rate_limit' }), /no pudo enviar/);
  assert.match(mensajeError({ code: 'email_address_not_authorized' }), /configurar el servicio/);
  assert.match(mensajeError(new TypeError('Failed to fetch')), /conexión/);
  assert.doesNotMatch(mensajeError({ code: '42501', message: 'private database details' }), /private/);
});
