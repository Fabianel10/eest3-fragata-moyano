const themeButton = document.querySelector('.interruptor-tema');

const setTheme = (isDark) => {
  document.body.classList.toggle('tema-oscuro', isDark);
  document.documentElement.classList.toggle('tema-oscuro', isDark);
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
