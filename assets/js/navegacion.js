const navigation = document.querySelector('.navegacion-principal');
const menuButton = document.querySelector('.boton-menu');
const navigationGroups = document.querySelectorAll('.grupo-navegacion');
const navigationTriggers = document.querySelectorAll('.desplegador-navegacion');

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
  trigger.addEventListener('click', () => {
    const group = trigger.closest('.grupo-navegacion');
    const isOpen = group.classList.toggle('submenu-abierto');
    trigger.setAttribute('aria-expanded', String(isOpen));
    closeSubmenus(isOpen ? group : null);
    if (isOpen) closeMenu();
  });
});

if (navigation && menuButton) {
  menuButton.addEventListener('click', () => {
    const isOpen = navigation.classList.toggle('menu-abierto');
    menuButton.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) closeSubmenus();
  });

  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) {
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
    if (event.key !== 'Escape') return;
    closeMenu();
    closeSubmenus();
    menuButton.focus();
  });
}
