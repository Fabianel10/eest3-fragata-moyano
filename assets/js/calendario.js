const themeButton = document.querySelector('.interruptor-tema');
const monthSelector = document.querySelector('.selector-meses');
const calendarGrid = document.querySelector('.grilla-dias');
const calendarMonthTitle = document.querySelector('.calendario-mes-titulo h3');
const calendarMonthNumber = document.querySelector('.numero-mes');
const calendarDetails = document.querySelector('.detalle-fechas');
const featuredImage = document.querySelector('.imagen-destacada-calendario');
const featuredType = document.querySelector('.tipo-destacado');
const featuredTitle = document.querySelector('.titulo-destacado');
const featuredDescription = document.querySelector('.descripcion-destacada');

const setTheme = (isDark) => {
  document.body.classList.toggle('tema-oscuro', isDark);
  document.documentElement.classList.toggle('tema-oscuro', isDark);
  themeButton?.setAttribute('aria-pressed', String(isDark));
  themeButton?.setAttribute('aria-label', isDark ? 'Activar modo claro' : 'Activar modo oscuro');
  localStorage.setItem('tema-eest3', isDark ? 'oscuro' : 'claro');
};

const savedTheme = localStorage.getItem('tema-eest3');
setTheme(
  savedTheme ? savedTheme === 'oscuro' : window.matchMedia('(prefers-color-scheme: dark)').matches
);
themeButton?.addEventListener('click', () =>
  setTheme(!document.body.classList.contains('tema-oscuro'))
);

const calendarEvents2026 = [
  ['2026-01-01', 'Año Nuevo', 'feriado'],
  ['2026-02-16', 'Carnaval', 'feriado'],
  ['2026-02-17', 'Carnaval', 'feriado'],
  ['2026-02-18', 'Jornada institucional docente', 'docente'],
  ['2026-03-02', 'Inicio de clases', 'docente'],
  ['2026-03-08', 'Día Internacional de las Mujeres', 'efemeride'],
  ['2026-03-24', 'Día Nacional de la Memoria por la Verdad y la Justicia', 'feriado'],
  ['2026-04-02', 'Día del Veterano y de los Caídos en la Guerra de Malvinas', 'feriado'],
  ['2026-04-03', 'Viernes Santo', 'feriado'],
  ['2026-05-01', 'Día del Trabajador', 'feriado'],
  ['2026-05-25', 'Revolución de Mayo', 'feriado'],
  ['2026-06-05', 'Día Mundial del Ambiente', 'efemeride'],
  ['2026-06-15', 'Paso a la Inmortalidad de Martín Miguel de Güemes', 'feriado'],
  ['2026-06-20', 'Paso a la Inmortalidad de Manuel Belgrano', 'feriado'],
  ['2026-07-09', 'Día de la Independencia', 'feriado'],
  ['2026-07-20', 'Receso escolar de invierno', 'docente'],
  ['2026-08-17', 'Paso a la Inmortalidad de José de San Martín', 'feriado'],
  ['2026-09-07', 'Semana de proyectos de Educación Técnica', 'tecnica'],
  ['2026-09-11', 'Día del Maestro', 'docente'],
  ['2026-09-16', 'Día de los Derechos de los Estudiantes Secundarios', 'efemeride'],
  ['2026-09-21', 'Día del Estudiante', 'local'],
  ['2026-10-12', 'Día del Respeto a la Diversidad Cultural', 'feriado'],
  ['2026-10-16', 'Día Mundial de la Alimentación', 'efemeride'],
  ['2026-11-10', 'Día de la Tradición', 'efemeride'],
  ['2026-11-15', 'Día de la Educación Técnica', 'tecnica'],
  ['2026-11-20', 'Día de la Soberanía Nacional', 'feriado'],
  ['2026-12-08', 'Inmaculada Concepción de María', 'feriado'],
  ['2026-12-10', 'Día de los Derechos Humanos', 'efemeride'],
  ['2026-12-18', 'Asueto municipal de San Fernando', 'local'],
  ['2026-12-22', 'Finalización del ciclo lectivo', 'docente'],
  ['2026-12-25', 'Navidad', 'feriado']
];

const monthNames = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
];

const eventDescriptions = {
  feriado:
    'Fecha nacional sin actividad escolar regular. Consultá las comunicaciones institucionales ante propuestas especiales.',
  local:
    'Fecha prevista para la comunidad local. La escuela puede informar horarios o actividades específicas.',
  docente:
    'Jornada vinculada al calendario escolar. Consultá a preceptoría o Secretaría por la organización de cada curso.',
  efemeride:
    'Una oportunidad para trabajar ciudadanía, memoria y compromiso comunitario desde aulas y talleres.',
  tecnica:
    'Una fecha para visibilizar proyectos, talleres y aprendizajes de la formación técnico-profesional.'
};

const eventImages = {
  feriado:
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=900&q=80',
  local:
    'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=900&q=80',
  docente:
    'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=80',
  efemeride:
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=900&q=80',
  tecnica:
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80'
};
const renderCalendar = (month) => {
  const monthEvents = calendarEvents2026.filter(([date]) => Number(date.slice(5, 7)) === month + 1);
  calendarMonthTitle.textContent = monthNames[month];
  calendarMonthNumber.textContent = String(month + 1).padStart(2, '0');
  const firstDay = (new Date(2026, month, 1).getDay() + 6) % 7;
  const days = new Date(2026, month + 1, 0).getDate();
  const featuredEvent = monthEvents[0];
  if (featuredEvent) {
    const [, description, type] = featuredEvent;
    featuredImage.src = eventImages[type];
    featuredImage.alt = description;
    featuredType.textContent =
      type === 'tecnica'
        ? 'Formación técnica'
        : type === 'efemeride'
          ? 'Efeméride educativa'
          : type === 'local'
            ? 'Asueto local'
            : type === 'docente'
              ? 'Jornada docente'
              : 'Feriado nacional';
    featuredTitle.textContent = description;
    featuredDescription.textContent = eventDescriptions[type];
  } else {
    featuredImage.src =
      'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=900&q=80';
    featuredImage.alt = 'Espacio educativo';
    featuredType.textContent = 'Agenda institucional';
    featuredTitle.textContent = `Planificación de ${monthNames[month]}`;
    featuredDescription.textContent =
      'Mes disponible para programar proyectos, evaluaciones, reuniones y actividades de taller.';
  }
  calendarGrid.innerHTML = Array.from({ length: firstDay }, () => '<span class="dia-vacio"></span>')
    .concat(
      Array.from({ length: days }, (_, index) => {
        const day = index + 1;
        const event = monthEvents.find(([date]) => Number(date.slice(8, 10)) === day);
        return `<button class="dia-calendario ${event ? `tiene-evento ${event[2]}` : ''}" type="button" aria-label="${event ? `${day}: ${event[1]}` : `${day} de ${monthNames[month]}`}">${day}</button>`;
      })
    )
    .join('');
  calendarDetails.innerHTML = monthEvents.length
    ? monthEvents
        .map(
          ([date, description, type]) =>
            `<article class="detalle-fecha ${type}"><time>${date.slice(8, 10)}</time><span>${description}</span></article>`
        )
        .join('')
    : '<p class="sin-fechas">Sin fechas destacadas para este mes.</p>';
  [...monthSelector.children].forEach((button, index) =>
    button.classList.toggle('activo', index === month)
  );
};

monthSelector.innerHTML = monthNames
  .map((name) => `<button type="button" aria-label="Ver ${name}">${name.slice(0, 3)}</button>`)
  .join('');
monthSelector.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (button) renderCalendar([...monthSelector.children].indexOf(button));
});
renderCalendar(8);
