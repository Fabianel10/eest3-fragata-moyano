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
const selectedDateLabel = document.querySelector('.fecha-seleccionada');
const visitCounter = document.querySelector('.numero-visitas');

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
  ['2026-11-23', 'Día de la Soberanía Nacional', 'feriado'],
  ['2026-12-07', 'Día no laborable con fines turísticos', 'turistico'],
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
    'Una fecha para visibilizar proyectos, talleres y aprendizajes de la formación técnico-profesional.',
  turistico:
    'Día no laborable con fines turísticos. Consultá con Secretaría la organización de actividades y la asistencia.'
};

const eventImages = {
  feriado: 'assets/images/ecolra.jpg',
  local: 'assets/images/ecuela.jpg',
  docente: 'assets/images/aura.png',
  turistico: 'assets/images/constructores.jpg',
  efemeride: 'assets/images/cartel.png',
  tecnica: 'assets/images/informatica.jpg'
};
const eventTypeLabels = {
  feriado: 'Feriado nacional',
  local: 'Asueto local',
  docente: 'Jornada docente',
  turistico: 'Puente turístico',
  efemeride: 'Efeméride educativa',
  tecnica: 'Formación técnica'
};

let selectedDate = null;
let activeMonthEvents = [];
const calendarYear = 2026;
const today = new Date();
const isCurrentCalendarYear = today.getFullYear() === calendarYear;
const currentMonth = isCurrentCalendarYear ? today.getMonth() : 8;
const currentDate = isCurrentCalendarYear
  ? `${calendarYear}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  : null;

const formatDate = (date) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

const selectDate = (date, monthEvents) => {
  selectedDate = date;
  const event = monthEvents.find(([eventDate]) => eventDate === date);

  if (event) {
    const [, title, type] = event;
    featuredImage.src = eventImages[type];
    featuredImage.alt = title;
    featuredType.textContent = eventTypeLabels[type];
    featuredTitle.textContent = title;
    featuredDescription.textContent = eventDescriptions[type];
  } else {
    featuredImage.src = 'assets/images/ecuela.jpg';
    featuredImage.alt = 'Espacio educativo';
    featuredType.textContent = 'Agenda institucional';
    featuredTitle.textContent = 'Sin actividad destacada';
    featuredDescription.textContent =
      'No hay una fecha institucional cargada para este día. Consultá las comunicaciones de la escuela ante actividades de curso o taller.';
  }

  if (selectedDateLabel) selectedDateLabel.textContent = formatDate(date);
  calendarGrid.querySelectorAll('.dia-calendario').forEach((button) => {
    button.classList.toggle('seleccionado', button.dataset.date === date);
    button.setAttribute('aria-pressed', String(button.dataset.date === date));
  });
  calendarDetails.querySelectorAll('.detalle-fecha').forEach((item) => {
    item.classList.toggle('seleccionada', item.dataset.date === date);
  });
};

const renderCalendar = (month) => {
  const monthEvents = calendarEvents2026.filter(([date]) => Number(date.slice(5, 7)) === month + 1);
  activeMonthEvents = monthEvents;
  calendarMonthTitle.textContent = monthNames[month];
  calendarMonthNumber.textContent = String(month + 1).padStart(2, '0');
  const firstDay = (new Date(calendarYear, month, 1).getDay() + 6) % 7;
  const days = new Date(calendarYear, month + 1, 0).getDate();
  calendarGrid.innerHTML = Array.from({ length: firstDay }, () => '<span class="dia-vacio"></span>')
    .concat(
      Array.from({ length: days }, (_, index) => {
        const day = index + 1;
        const event = monthEvents.find(([date]) => Number(date.slice(8, 10)) === day);
        const date = `${calendarYear}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return `<button class="dia-calendario ${event ? `tiene-evento ${event[2]}` : ''}" type="button" data-date="${date}" aria-pressed="false" aria-label="${event ? `${day}: ${event[1]}` : `${day} de ${monthNames[month]}`}">${day}</button>`;
      })
    )
    .join('');
  calendarDetails.innerHTML = monthEvents.length
    ? monthEvents
        .map(
          ([date, description, type]) =>
            `<button class="detalle-fecha ${type}" type="button" data-date="${date}"><time>${date.slice(8, 10)}</time><span>${description}</span></button>`
        )
        .join('')
    : '<p class="sin-fechas">Sin fechas destacadas para este mes.</p>';
  const initialDate =
    currentDate && month === currentMonth
      ? currentDate
      : monthEvents[0]?.[0] || `${calendarYear}-${String(month + 1).padStart(2, '0')}-01`;
  selectDate(initialDate, monthEvents);
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
calendarGrid.addEventListener('click', (event) => {
  const button = event.target.closest('.dia-calendario');
  if (button) selectDate(button.dataset.date, activeMonthEvents);
});
calendarDetails.addEventListener('click', (event) => {
  const button = event.target.closest('.detalle-fecha');
  if (button) selectDate(button.dataset.date, activeMonthEvents);
});
renderCalendar(currentMonth);

if (visitCounter) {
  const visitKey = 'eest3-visitas-dispositivo';
  const visits = Number.parseInt(localStorage.getItem(visitKey) || '0', 10) + 1;
  localStorage.setItem(visitKey, String(visits));
  visitCounter.textContent = visits.toLocaleString('es-AR');
}

const playlist = [
  { title: 'Himno Nacional Argentino', source: 'assets/audio/AUD-20260901-WA0078.mp3' },
  {
    title: 'Argentina Selección, gracias Messi',
    source:
      'assets/audio/Argentina%20%20%20Cancion%20de%20la%20Selecci%C3%B3n%20Argentina%202026.mp3'
  }
];
const audio = document.querySelector('.audio-reproductor');
const playButton = document.querySelector('.boton-reproducir');
const previousButton = document.querySelector('.anterior');
const nextButton = document.querySelector('.siguiente');
const trackTitle = document.querySelector('.reproductor-tema');
const playerStatus = document.querySelector('.reproductor-estado');
const progressControl = document.querySelector('.control-progreso');
const currentTime = document.querySelector('.tiempo-actual');
const duration = document.querySelector('.duracion-tema');
const volumeControl = document.querySelector('.control-volumen input');
const playlistContainer = document.querySelector('.lista-reproduccion');
let currentTrackIndex = 0;

const formatTime = (seconds) =>
  Number.isFinite(seconds)
    ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
    : '0:00';

if (
  audio &&
  playButton &&
  previousButton &&
  nextButton &&
  trackTitle &&
  playerStatus &&
  progressControl &&
  currentTime &&
  duration &&
  volumeControl &&
  playlistContainer
) {
  const renderPlaylist = () => {
    playlistContainer.innerHTML = playlist
      .map(
        (track, index) =>
          `<button class="tema-lista" type="button" data-track="${index}" aria-current="${index === currentTrackIndex}"><span>${String(index + 1).padStart(2, '0')}</span>${track.title}</button>`
      )
      .join('');
  };
  const loadTrack = (index) => {
    currentTrackIndex = (index + playlist.length) % playlist.length;
    audio.src = playlist[currentTrackIndex].source;
    trackTitle.textContent = playlist[currentTrackIndex].title;
    progressControl.value = 0;
    currentTime.textContent = '0:00';
    duration.textContent = '0:00';
    renderPlaylist();
  };
  const playCurrentTrack = async () => {
    try {
      await audio.play();
    } catch {
      playerStatus.textContent = 'No se pudo reproducir';
    }
  };

  playButton.addEventListener('click', () => (audio.paused ? playCurrentTrack() : audio.pause()));
  previousButton.addEventListener('click', () => loadTrack(currentTrackIndex - 1));
  nextButton.addEventListener('click', () => loadTrack(currentTrackIndex + 1));
  playlistContainer.addEventListener('click', (event) => {
    const button = event.target.closest('[data-track]');
    if (button) {
      loadTrack(Number(button.dataset.track));
      playCurrentTrack();
    }
  });
  audio.addEventListener('play', () => {
    playButton.textContent = 'Pausar';
    playerStatus.textContent = 'Reproduciendo';
  });
  audio.addEventListener('pause', () => {
    playButton.textContent = 'Reproducir';
    playerStatus.textContent = 'En pausa';
  });
  audio.addEventListener(
    'loadedmetadata',
    () => (duration.textContent = formatTime(audio.duration))
  );
  audio.addEventListener('timeupdate', () => {
    progressControl.value = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    currentTime.textContent = formatTime(audio.currentTime);
  });
  audio.addEventListener('ended', () => {
    loadTrack(currentTrackIndex + 1);
    playCurrentTrack();
  });
  progressControl.addEventListener('input', () => {
    if (audio.duration) audio.currentTime = (progressControl.value / 100) * audio.duration;
  });
  volumeControl.addEventListener('input', () => (audio.volume = volumeControl.value));
  audio.volume = volumeControl.value;
  loadTrack(currentTrackIndex);
}
