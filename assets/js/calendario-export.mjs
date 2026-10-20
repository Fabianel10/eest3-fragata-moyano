const encoder = new TextEncoder();
const escapeText = value => String(value).replaceAll('\\', '\\\\').replace(/\r\n|\r|\n/g, '\\n').replaceAll(';', '\\;').replaceAll(',', '\\,');
function fold(line) {
  const parts = [];
  let current = '';
  for (const character of line) {
    if (encoder.encode(current + character).length > 75) { parts.push(current); current = ' '; }
    current += character;
  }
  parts.push(current);
  return parts.join('\r\n');
}
export function createCalendar(events, year, now = new Date()) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new Error('Año inválido.');
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//EEST3//Agenda institucional//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  const dates = new Set();
  events.filter(event => Number(event.date.slice(0, 4)) === year).forEach(event => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date)) throw new Error('Fecha inválida.');
    if (dates.has(event.date)) throw new Error('Fecha duplicada.');
    dates.add(event.date);
    const start = new Date(`${event.date}T00:00:00Z`);
    if (!Number.isFinite(start.getTime()) || start.toISOString().slice(0, 10) !== event.date) throw new Error('Fecha inválida.');
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    lines.push('BEGIN:VEVENT', `UID:${event.date}@eest3sf.netlify.app`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${event.date.replaceAll('-', '')}`,
      `DTEND;VALUE=DATE:${end.toISOString().slice(0, 10).replaceAll('-', '')}`,
      `SUMMARY:${escapeText(event.title)}`, `DESCRIPTION:${escapeText(event.description || '')}`, 'END:VEVENT');
  });
  return [...lines, 'END:VCALENDAR'].map(fold).join('\r\n') + '\r\n';
}
