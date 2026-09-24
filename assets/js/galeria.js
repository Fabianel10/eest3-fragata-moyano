const themeButton = document.querySelector('.interruptor-tema');
const sliderMedia = document.querySelector('.slider-medio');
const sliderType = document.querySelector('.slider-tipo');
const sliderTitle = document.querySelector('.slider-titulo');
const sliderCounter = document.querySelector('.slider-contador');
const sliderStatus = document.querySelector('.slider-estado');
const sliderIndicators = document.querySelector('.slider-indicadores');
const previousSlide = document.querySelector('.slider-anterior');
const nextSlide = document.querySelector('.slider-siguiente');
const soundButton = document.querySelector('.slider-sonido');
const backgroundAudio = document.querySelector('.audio-fondo-video');
const visitCounter = document.querySelector('.numero-visitas');

backgroundAudio.src =
  'assets/audio/Argentina%20%20%20Cancion%20de%20la%20Selecci%C3%B3n%20Argentina%202026.mp3';
backgroundAudio.volume = 0.35;

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

const mediaPath = 'assets/images/imagenes nuevas/';
const galleryItems = [
  { type: 'video', file: 'VID_20260915_113715685.mp4', title: 'Recorrido por la escuela' },
  { type: 'image', file: 'IMG_20260915_111543434_MFNR.jpg', title: 'Comunidad educativa' },
  { type: 'image', file: 'IMG_20260915_111659673_MFNR.jpg', title: 'Aprendizaje en acción' },
  { type: 'image', file: 'IMG_20260915_111756248_MFNR.jpg', title: 'Talleres y proyectos' },
  { type: 'image', file: 'IMG_20260915_111814985_MFNR.jpg', title: 'Experiencias compartidas' },
  { type: 'image', file: 'IMG_20260915_111956061_MFNR.jpg', title: 'Vida institucional' },
  { type: 'image', file: 'IMG_20260915_112437492_MFNR.jpg', title: 'Construir conocimiento' },
  { type: 'image', file: 'IMG_20260915_112714067_MFNR.jpg', title: 'Trabajo en equipo' },
  { type: 'image', file: 'IMG_20260915_113032759_MFNR.jpg', title: 'Espacios de formación' },
  { type: 'image', file: 'IMG_20260915_113525040_MFNR.jpg', title: 'Momentos de la jornada' },
  { type: 'image', file: 'IMG_20260915_113803235.jpg', title: 'La escuela hoy' },
  { type: 'image', file: 'IMG_20260915_125852415_MFNR.jpg', title: 'Proyectos de la comunidad' },
  {
    type: 'image',
    file: 'WhatsApp Image 2026-09-17 at 1.14.50 PM (1).jpeg',
    title: 'Actividades institucionales'
  },
  {
    type: 'image',
    file: 'WhatsApp Image 2026-09-17 at 1.14.50 PM.jpeg',
    title: 'Aprender haciendo'
  },
  { type: 'image', file: 'foto.png', title: 'Encuentro escolar' }
];

let currentSlide = 0;
let slideshowTimer = null;
let isBackgroundMusicEnabled = false;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const encodedSource = (file) => `${mediaPath}${encodeURIComponent(file)}`;

const stopTimer = () => {
  window.clearTimeout(slideshowTimer);
  slideshowTimer = null;
};

const stopBackgroundMusic = () => {
  backgroundAudio.pause();
  backgroundAudio.currentTime = 0;
};

const updateSoundButton = () => {
  soundButton.hidden = galleryItems[currentSlide].type !== 'video';
  soundButton.setAttribute('aria-pressed', String(isBackgroundMusicEnabled));
  soundButton.setAttribute(
    'aria-label',
    isBackgroundMusicEnabled ? 'Silenciar música de fondo' : 'Activar música de fondo'
  );
  soundButton.title = soundButton.getAttribute('aria-label');
  soundButton.textContent = isBackgroundMusicEnabled ? '♪' : '♫';
};

const queueNextSlide = () => {
  stopTimer();
  if (!prefersReducedMotion && galleryItems[currentSlide].type === 'image') {
    slideshowTimer = window.setTimeout(() => showSlide(currentSlide + 1), 5500);
  }
};

const renderIndicators = () => {
  sliderIndicators.innerHTML = galleryItems
    .map(
      (item, index) =>
        `<button type="button" class="indicador-slider ${index === currentSlide ? 'activo' : ''}" data-slide="${index}" aria-label="Ver ${item.title}" aria-current="${index === currentSlide}"></button>`
    )
    .join('');
};

const showSlide = (index) => {
  stopTimer();
  stopBackgroundMusic();
  currentSlide = (index + galleryItems.length) % galleryItems.length;
  const item = galleryItems[currentSlide];
  const source = encodedSource(item.file);

  sliderMedia.innerHTML =
    item.type === 'video'
      ? `<video class="slider-video" src="${source}" autoplay muted playsinline preload="metadata" aria-label="${item.title}"></video>`
      : `<img class="slider-imagen" src="${source}" alt="${item.title}" />`;
  sliderType.textContent = item.type === 'video' ? 'Video institucional' : 'Galería fotográfica';
  sliderTitle.textContent = item.title;
  sliderCounter.textContent = `${String(currentSlide + 1).padStart(2, '0')} / ${String(galleryItems.length).padStart(2, '0')}`;
  sliderStatus.textContent =
    item.type === 'video'
      ? 'El video inicia automáticamente. Activá música con el botón de nota.'
      : 'Las imágenes avanzan automáticamente.';
  updateSoundButton();
  renderIndicators();

  if (item.type === 'video') {
    const video = sliderMedia.querySelector('video');
    if (isBackgroundMusicEnabled) {
      backgroundAudio.play().catch(() => {
        isBackgroundMusicEnabled = false;
        updateSoundButton();
      });
    }
    video.addEventListener('ended', () => showSlide(currentSlide + 1), { once: true });
    video.addEventListener('error', () => {
      sliderStatus.textContent =
        'No se pudo cargar el video. Continuamos con la galería fotográfica.';
      window.setTimeout(() => showSlide(currentSlide + 1), 1000);
    });
    video.play().catch(() => {
      sliderStatus.textContent = 'El video está listo para reproducirse.';
    });
  } else {
    queueNextSlide();
  }
};

previousSlide.addEventListener('click', () => showSlide(currentSlide - 1));
nextSlide.addEventListener('click', () => showSlide(currentSlide + 1));
soundButton.addEventListener('click', async () => {
  isBackgroundMusicEnabled = !isBackgroundMusicEnabled;
  updateSoundButton();
  if (!isBackgroundMusicEnabled) {
    stopBackgroundMusic();
    sliderStatus.textContent = 'Música de fondo desactivada.';
    return;
  }

  try {
    await backgroundAudio.play();
    sliderStatus.textContent = 'Música de fondo activada durante el video.';
  } catch {
    isBackgroundMusicEnabled = false;
    updateSoundButton();
    sliderStatus.textContent = 'No se pudo iniciar la música de fondo.';
  }
});
sliderIndicators.addEventListener('click', (event) => {
  const button = event.target.closest('[data-slide]');
  if (button) showSlide(Number(button.dataset.slide));
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') showSlide(currentSlide - 1);
  if (event.key === 'ArrowRight') showSlide(currentSlide + 1);
});
showSlide(0);

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
audio.addEventListener('loadedmetadata', () => (duration.textContent = formatTime(audio.duration)));
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
