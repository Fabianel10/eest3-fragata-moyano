const revealElements = document.querySelectorAll(
  '.institucional, .container-seccion, .mapa-contacto-wrapper, .tarjeta, .galeria-item, footer'
);
const header = document.querySelector('header');
const navLinks = document.querySelectorAll('header nav a[href^="#"]');
const navigation = document.querySelector('.navegacion-principal');
const menuButton = document.querySelector('.boton-menu');
const themeButton = document.querySelector('.interruptor-tema');
const navigationGroups = document.querySelectorAll('.grupo-navegacion');
const navigationTriggers = document.querySelectorAll('.desplegador-navegacion');
const sections = document.querySelectorAll('section[id]');
const hero = document.querySelector('.hero');
const heroContent = document.querySelector('.hero-content');
const cards = document.querySelectorAll('.tarjeta');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const setTheme = (isDark) => {
  document.body.classList.toggle('tema-oscuro', isDark);
  themeButton?.setAttribute('aria-pressed', String(isDark));
  themeButton?.setAttribute('aria-label', isDark ? 'Activar modo claro' : 'Activar modo oscuro');
  localStorage.setItem('tema-eest3', isDark ? 'oscuro' : 'claro');
};

if (themeButton) {
  const savedTheme = localStorage.getItem('tema-eest3');
  const useDarkTheme = savedTheme
    ? savedTheme === 'oscuro'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(useDarkTheme);
  themeButton.addEventListener('click', () => {
    setTheme(!document.body.classList.contains('tema-oscuro'));
  });
}

const closeMenu = () => {
  if (!navigation || !menuButton) return;
  navigation.classList.remove('menu-abierto');
  menuButton.setAttribute('aria-expanded', 'false');
};

const closeSubmenus = (exceptGroup = null) => {
  navigationGroups.forEach((group) => {
    if (group === exceptGroup) return;
    group.classList.remove('submenu-abierto');
    group.querySelector('.desplegador-navegacion')?.setAttribute('aria-expanded', 'false');
  });
};

navigationTriggers.forEach((trigger) => {
  trigger.addEventListener('click', (event) => {
    event.stopPropagation();
    const group = trigger.closest('.grupo-navegacion');
    const isOpen = group.classList.toggle('submenu-abierto');
    trigger.setAttribute('aria-expanded', String(isOpen));
    closeSubmenus(isOpen ? group : null);
    if (isOpen) closeMenu();
  });
});

if (navigation && menuButton) {
  menuButton.addEventListener('click', (event) => {
    event.stopPropagation();
    const isOpen = navigation.classList.toggle('menu-abierto');
    menuButton.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) closeSubmenus();
  });

  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a[href^="#"]')) {
      closeMenu();
      closeSubmenus();
    }
  });

  document.addEventListener('click', (event) => {
    if (!navigation.contains(event.target)) {
      closeMenu();
      closeSubmenus();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu();
      closeSubmenus();
      menuButton.focus();
    }
  });
}

revealElements.forEach((element) => {
  element.classList.add('reveal');
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.14,
    rootMargin: '0px 0px -40px 0px'
  }
);

revealElements.forEach((element, index) => {
  element.style.transitionDelay = `${Math.min(index * 70, 420)}ms`;
  observer.observe(element);
});

const footer = document.querySelector('footer');
const footerObserver = new IntersectionObserver(
  (entries) => {
    if (entries[0].isIntersecting) {
      footer.classList.add('is-visible');
      footerObserver.disconnect();
    }
  },
  { rootMargin: '0px 0px 180px 0px' }
);

footerObserver.observe(footer);

const updateScrollState = () => {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

  document.documentElement.style.setProperty('--scroll-progress', `${progress}%`);
  header.classList.toggle('scrolled', scrollTop > 24);

  sections.forEach((section) => {
    const rect = section.getBoundingClientRect();
    const id = section.getAttribute('id');

    if (rect.top <= 140 && rect.bottom >= 180) {
      navLinks.forEach((link) => {
        const isCurrent = link.getAttribute('href') === `#${id}`;
        link.classList.toggle('active', isCurrent);
      });
    }
  });
};

window.addEventListener('scroll', updateScrollState, { passive: true });
updateScrollState();

if (!prefersReducedMotion && hero && heroContent) {
  let rafId = null;
  let pointerX = 0;
  let pointerY = 0;

  const renderParallax = () => {
    const offsetX = (pointerX - 0.5) * 14;
    const offsetY = (pointerY - 0.5) * 10;

    heroContent.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
    hero.style.backgroundPosition = `${50 + offsetX * 0.22}% ${70 + offsetY * 0.4}%`;
    rafId = null;
  };

  hero.addEventListener('mousemove', (event) => {
    const rect = hero.getBoundingClientRect();
    pointerX = (event.clientX - rect.left) / rect.width;
    pointerY = (event.clientY - rect.top) / rect.height;

    if (!rafId) {
      rafId = requestAnimationFrame(renderParallax);
    }
  });

  hero.addEventListener('mouseleave', () => {
    heroContent.style.transform = 'translate3d(0, 0, 0)';
    hero.style.backgroundPosition = 'center 70%';
  });
}

if (!prefersReducedMotion) {
  cards.forEach((card) => {
    card.addEventListener('mousemove', (event) => {
      const rect = card.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      const rotateY = (px - 0.5) * 10;
      const rotateX = (0.5 - py) * 10;

      card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

const playlist = [
  {
    title: 'Himno Nacional Argentino',
    source: 'assets/audio/AUD-20260901-WA0078.mp3'
  },
  {
    title: 'Argentina Selección, gracias Messi',
    source:
      'assets/audio/Argentina%20%20%20Cancion%20de%20la%20Selecci%C3%B3n%20Argentina%202026.mp3'
  },
  {
    title: 'Enganchado Rock Nacional Argentino #2',
    source: 'assets/audio/Enganchado%20Rock%20Nacional%20Argentino%20%232.mp3'
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

const playCurrentTrack = async () => {
  try {
    await audio.play();
  } catch {
    playerStatus.textContent = 'No se pudo reproducir';
  }
};

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return '0:00';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
};

const loadTrack = (index) => {
  currentTrackIndex = (index + playlist.length) % playlist.length;
  const track = playlist[currentTrackIndex];
  audio.src = track.source;
  trackTitle.textContent = track.title;
  progressControl.value = 0;
  currentTime.textContent = '0:00';
  duration.textContent = '0:00';
  renderPlaylist();
};

const renderPlaylist = () => {
  playlistContainer.innerHTML = '';
  playlist.forEach((track, index) => {
    const trackButton = document.createElement('button');
    const isCurrentTrack = index === currentTrackIndex;
    trackButton.className = 'tema-lista';
    trackButton.type = 'button';
    trackButton.setAttribute('aria-current', isCurrentTrack ? 'true' : 'false');
    trackButton.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span>${track.title}`;
    trackButton.addEventListener('click', () => {
      loadTrack(index);
      playCurrentTrack();
    });
    playlistContainer.append(trackButton);
  });
};

const updatePlayerState = () => {
  const isPlaying = !audio.paused;
  playButton.textContent = isPlaying ? 'Pausar' : 'Reproducir';
  playerStatus.textContent = isPlaying ? 'Reproduciendo' : 'En pausa';
};

playButton.addEventListener('click', () => {
  if (audio.paused) playCurrentTrack();
  else audio.pause();
});
previousButton.addEventListener('click', () => {
  const wasPlaying = !audio.paused;
  loadTrack(currentTrackIndex - 1);
  if (wasPlaying) playCurrentTrack();
});
nextButton.addEventListener('click', () => {
  const wasPlaying = !audio.paused;
  loadTrack(currentTrackIndex + 1);
  if (wasPlaying) playCurrentTrack();
});
audio.addEventListener('play', updatePlayerState);
audio.addEventListener('pause', updatePlayerState);
audio.addEventListener('loadedmetadata', () => {
  duration.textContent = formatTime(audio.duration);
});
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
volumeControl.addEventListener('input', () => {
  audio.volume = volumeControl.value;
});

audio.volume = volumeControl.value;
loadTrack(currentTrackIndex);
