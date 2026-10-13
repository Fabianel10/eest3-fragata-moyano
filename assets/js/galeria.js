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
const gallery = document.querySelector('.slider-galeria');
const pauseButton = document.createElement('button');
pauseButton.type = 'button';
pauseButton.className = 'slider-boton slider-pausa';
document.querySelector('.slider-controles').append(pauseButton);
gallery.setAttribute('aria-roledescription', 'carrusel');

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
  { type: 'image', file: 'IMG-20260917-WA0247.jpg', title: 'Encuentro de la comunidad' },
  { type: 'image', file: 'foto.png', title: 'Encuentro escolar' }
];
if (window.CMS_CONTENT) {
  galleryItems.splice(0, galleryItems.length, ...window.CMS_CONTENT.gallery);
}

let currentSlide = 0;
let slideshowTimer = null;
let isBackgroundMusicEnabled = false;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let isPaused = prefersReducedMotion;
let isHovered = false;
const canAdvance = () => !isPaused && !isHovered && !document.hidden &&
  !gallery.contains(document.activeElement);

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
  if (canAdvance() && galleryItems[currentSlide]?.type === 'image') {
    slideshowTimer = window.setTimeout(() => showSlide(currentSlide + 1), 5500);
  }
};

const renderIndicators = () => {
  sliderIndicators.querySelectorAll('[data-slide]').forEach((button, index) => {
    button.classList.toggle('activo', index === currentSlide);
    button.setAttribute('aria-current', String(index === currentSlide));
  });
};

const syncPlayback = () => {
  const advancing = canAdvance();
  pauseButton.setAttribute('aria-pressed', String(isPaused));
  const label = isPaused ? 'Reanudar galería' : 'Pausar galería';
  pauseButton.setAttribute('aria-label', label);
  pauseButton.title = label;
  pauseButton.textContent = isPaused ? '▶' : 'Ⅱ';
  sliderMedia.setAttribute('aria-live', advancing ? 'off' : 'polite');
  sliderCounter.setAttribute('aria-live', advancing ? 'off' : 'polite');
  sliderStatus.textContent = isPaused
    ? 'Galería en pausa. Podés avanzar con los controles.'
    : advancing
      ? 'Avance automático activo. Usá Pausar para detenerlo.'
      : 'Avance suspendido mientras interactuás con la galería o la pestaña está oculta.';
  const video = sliderMedia.querySelector('video');
  if (advancing) {
    queueNextSlide();
    if (video) video.play().catch(() => {
      sliderStatus.textContent = 'No se pudo iniciar el video. Usá los controles de reproducción.';
    });
  } else {
    stopTimer();
    video?.pause();
    backgroundAudio.pause();
  }
};

const showSlide = (index) => {
  stopTimer();
  stopBackgroundMusic();
  if (!galleryItems.length) {
    sliderMedia.replaceChildren();
    sliderTitle.textContent = 'Sin contenido publicado en la galería.';
    sliderType.textContent = '';
    sliderCounter.textContent = '0 / 0';
    sliderIndicators.replaceChildren();
    previousSlide.disabled = true;
    nextSlide.disabled = true;
    soundButton.hidden = true;
    pauseButton.disabled = true;
    sliderStatus.textContent = 'La galería todavía no tiene imágenes ni videos publicados.';
    return;
  }
  currentSlide = (index + galleryItems.length) % galleryItems.length;
  const item = galleryItems[currentSlide];
  const source = item.src || encodedSource(item.file);

  sliderMedia.innerHTML =
    item.type === 'video'
      ? `<video class="slider-video" src="${window.CMS_ESCAPE(source)}" controls muted playsinline preload="metadata" aria-label="${window.CMS_ESCAPE(item.title)}"></video>`
      : `<img class="slider-imagen" src="${window.CMS_ESCAPE(source)}" alt="${window.CMS_ESCAPE(item.title)}" />`;
  sliderType.textContent = item.type === 'video' ? 'Video institucional' : 'Galería fotográfica';
  sliderTitle.textContent = item.title;
  sliderCounter.textContent = `${String(currentSlide + 1).padStart(2, '0')} / ${String(galleryItems.length).padStart(2, '0')}`;
  updateSoundButton();
  renderIndicators();
  syncPlayback();

  if (item.type === 'video') {
    const video = sliderMedia.querySelector('video');
    if (isBackgroundMusicEnabled && canAdvance()) {
      backgroundAudio.play().catch(() => {
        isBackgroundMusicEnabled = false;
        updateSoundButton();
        sliderStatus.textContent = 'No se pudo iniciar la música de fondo.';
      });
    }
    video.addEventListener('ended', () => {
      if (canAdvance()) showSlide(currentSlide + 1);
    });
    video.addEventListener('error', () => {
      sliderStatus.textContent =
        'No se pudo cargar el video. Usá Siguiente para continuar.';
    });
  } else {
    sliderMedia.querySelector('img').addEventListener('error', () => {
      stopTimer();
      sliderStatus.textContent = 'No se pudo cargar la imagen. Usá Siguiente para continuar.';
    });
  }
};

pauseButton.addEventListener('click', () => {
  isPaused = !isPaused;
  syncPlayback();
});
gallery.addEventListener('mouseenter', () => { isHovered = true; syncPlayback(); });
gallery.addEventListener('mouseleave', () => { isHovered = false; syncPlayback(); });
gallery.addEventListener('focusin', syncPlayback);
gallery.addEventListener('focusout', () => window.setTimeout(syncPlayback, 0));
document.addEventListener('visibilitychange', syncPlayback);
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
  if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
  if (!gallery.contains(document.activeElement)) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    showSlide(currentSlide + (event.key === 'ArrowLeft' ? -1 : 1));
  }
});
sliderIndicators.innerHTML = galleryItems.map((item, index) =>
  `<button type="button" class="indicador-slider" data-slide="${index}" aria-label="Ver ${window.CMS_ESCAPE(item.title)}"></button>`
).join('');
showSlide(0);

if (visitCounter && !window.CMS_PREVIEW) {
  const visitKey = 'eest3-visitas-dispositivo';
  const visits = Number.parseInt(localStorage.getItem(visitKey) || '0', 10) + 1;
  localStorage.setItem(visitKey, String(visits));
  visitCounter.textContent = visits.toLocaleString('es-AR');
}
