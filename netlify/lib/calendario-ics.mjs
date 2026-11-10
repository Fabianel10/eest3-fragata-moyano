const escapar = (value) => String(value ?? '').replaceAll('\\', '\\\\').replaceAll('\n', '\\n')
  .replaceAll(',', '\\,').replaceAll(';', '\\;');
const fecha = (iso) => String(iso).replaceAll('-', '');
function ocurrencias(row) {
  const inicio = new Date(`${row.event_date}T12:00:00Z`);
  const fin = row.recurrence_until ? new Date(`${row.recurrence_until}T12:00:00Z`) : null;
  if (!['weekly', 'monthly', 'yearly'].includes(row.recurrence)) return [row.event_date];
  const salida = [];
  const cursor = new Date(inicio);
  const limite = fin || new Date(`${String(row.event_date).slice(0, 4)}-12-31T12:00:00Z`);
  for (let i = 0; i < 200 && cursor <= limite; i += 1) {
    salida.push(cursor.toISOString().slice(0, 10));
    if (row.recurrence === 'weekly') cursor.setUTCDate(cursor.getUTCDate() + 7);
    else if (row.recurrence === 'monthly') cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    else cursor.setUTCFullYear(cursor.getUTCFullYear() + 1);
  }
  return salida;
}
const siguiente = (iso) => {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

export function generarIcs(rows, { site = 'https://eest3sf.netlify.app' } = {}) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const events = (Array.isArray(rows) ? rows : []).flatMap((row, index) => {
    const descripcion = [row.description, row.source && `Fuente: ${row.source}`,
      row.responsible && `Responsable: ${row.responsible}`].filter(Boolean).join(' · ');
    return ocurrencias(row).map((date, occurrence) => [
      'BEGIN:VEVENT',
      `UID:${fecha(date)}-${index}-${occurrence}@eest3sf.netlify.app`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${fecha(date)}`,
      `DTEND;VALUE=DATE:${fecha(siguiente(date))}`,
      `SUMMARY:${escapar(row.title)}`,
      descripcion ? `DESCRIPTION:${escapar(descripcion)}` : '',
      `URL:${site}/calendario.html`,
      'END:VEVENT'
    ].filter(Boolean));
  });
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//EEST N3//Calendario//ES',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:EEST N°3 Fragata Moyano',
    ...events.flat(), 'END:VCALENDAR', ''
  ].join('\r\n');
}
