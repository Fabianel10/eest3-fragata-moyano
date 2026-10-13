import { escaparHTML } from './cms-modelo.mjs';
export function iniciarReproductor() {
window.CMS_ESCAPE ||= escaparHTML;
const playlist = [
  { title: 'Himno Nacional Argentino', source: 'assets/audio/AUD-20260901-WA0078.mp3' },
  {
    title: 'Argentina Selección, gracias Messi',
    source:
      'assets/audio/Argentina%20%20%20Cancion%20de%20la%20Selecci%C3%B3n%20Argentina%202026.mp3'
  }
];
if (window.CMS_CONTENT) {
  playlist.splice(0, playlist.length, ...window.CMS_CONTENT.playlist.map((item) => ({ title: item.title, source: item.src })));
}
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
        `<button class="tema-lista" type="button" data-track="${index}" aria-current="${index === currentTrackIndex}"><span>${String(index + 1).padStart(2, '0')}</span>${window.CMS_ESCAPE(track.title)}</button>`
    )
    .join('');
};
const loadTrack = (index) => {
  if (!playlist.length) {
    trackTitle.textContent = 'Sin audios publicados.';
    [playButton, previousButton, nextButton].forEach((button) => { button.disabled = true; });
    return;
  }
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
  playButton.setAttribute('aria-label', 'Pausar');
  playerStatus.textContent = 'Reproduciendo';
});
audio.addEventListener('pause', () => {
  playButton.textContent = 'Reproducir';
  playButton.setAttribute('aria-label', 'Reproducir');
  playerStatus.textContent = 'En pausa';
});
audio.addEventListener('loadedmetadata', () => (duration.textContent = formatTime(audio.duration)));
audio.addEventListener('error', () => {
  playerStatus.textContent = 'No se pudo cargar el audio. Probá otro tema.';
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
volumeControl.addEventListener('input', () => (audio.volume = volumeControl.value));
audio.volume = volumeControl.value;
loadTrack(currentTrackIndex);

}
