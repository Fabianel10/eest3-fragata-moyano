import test from 'node:test';
import assert from 'node:assert/strict';
import { generarIcs } from '../netlify/lib/calendario-ics.mjs';

test('suscripción ICS: evento de día completo, escape y fin exclusivo', () => {
  const ics = generarIcs([{
    event_date: '2026-11-20', title: 'Jornada; técnica, con acentos',
    description: 'Actividad', source: 'Resolución 1', responsible: 'Equipo'
  }]);
  assert.match(ics, /^BEGIN:VCALENDAR\r\nVERSION:2.0/);
  assert.match(ics, /DTSTART;VALUE=DATE:20261120/);
  assert.match(ics, /DTEND;VALUE=DATE:20261121/);
  assert.match(ics, /SUMMARY:Jornada\\; técnica\\, con acentos/);
  assert.match(ics, /Fuente: Resolución 1 · Responsable: Equipo/);
  assert.match(ics, /END:VCALENDAR/);
});
