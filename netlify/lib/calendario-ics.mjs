const escapar = (value) => String(value ?? '').replaceAll('\\', '\\\\').replaceAll('\n', '\\n')
  .replaceAll(',', '\\,').replaceAll(';', '\\;');
const fecha = (iso) => String(iso).replaceAll('-', '');
const siguiente = (iso) => {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

export function generarIcs(rows, { site = 'https://eest3sf.netlify.app' } = {}) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const events = (Array.isArray(rows) ? rows : []).map((row, index) => {
    const descripcion = [row.description, row.source && `Fuente: ${row.source}`,
      row.responsible && `Responsable: ${row.responsible}`].filter(Boolean).join(' · ');
    return [
      'BEGIN:VEVENT',
      `UID:${fecha(row.event_date)}-${index}@eest3sf.netlify.app`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${fecha(row.event_date)}`,
      `DTEND;VALUE=DATE:${fecha(siguiente(row.event_date))}`,
      `SUMMARY:${escapar(row.title)}`,
      descripcion ? `DESCRIPTION:${escapar(descripcion)}` : '',
      `URL:${site}/calendario.html`,
      'END:VEVENT'
    ].filter(Boolean);
  });
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//EEST N3//Calendario//ES',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:EEST N°3 Fragata Moyano',
    ...events.flat(), 'END:VCALENDAR', ''
  ].join('\r\n');
}
