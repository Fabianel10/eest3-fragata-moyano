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
        `<button type="button" class="indicador-slider ${index === currentSlide ? 'activo' : ''}" data-slide="${index}" aria-label="Ver ${window.CMS_ESCAPE(item.title)}" aria-current="${index === currentSlide}"></button>`
    )
    .join('');
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
    return;
  }
  currentSlide = (index + galleryItems.length) % galleryItems.length;
  const item = galleryItems[currentSlide];
  const source = item.src || encodedSource(item.file);

  sliderMedia.innerHTML =
    item.type === 'video'
      ? `<video class="slider-video" src="${window.CMS_ESCAPE(source)}" autoplay muted playsinline preload="metadata" aria-label="${window.CMS_ESCAPE(item.title)}"></video>`
      : `<img class="slider-imagen" src="${window.CMS_ESCAPE(source)}" alt="${window.CMS_ESCAPE(item.title)}" />`;
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
  if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
  if (!document.querySelector('.slider-galeria').contains(document.activeElement)) return;
  if (event.key === 'ArrowLeft') showSlide(currentSlide - 1);
  if (event.key === 'ArrowRight') showSlide(currentSlide + 1);
});
showSlide(0);

if (visitCounter && !window.CMS_PREVIEW) {
  const visitKey = 'eest3-visitas-dispositivo';
  const visits = Number.parseInt(localStorage.getItem(visitKey) || '0', 10) + 1;
  localStorage.setItem(visitKey, String(visits));
  visitCounter.textContent = visits.toLocaleString('es-AR');
}
