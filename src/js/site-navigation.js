(() => {
  const toggle = document.querySelector('[data-site-nav-toggle]');
  const menu = document.getElementById(toggle?.getAttribute('aria-controls') || '');
  if (!toggle || !menu) return;

  const setOpen = (open) => {
    menu.classList.toggle('show', open);
    toggle.setAttribute('aria-expanded', String(open));
  };

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || toggle.getAttribute('aria-expanded') !== 'true') return;
    setOpen(false);
    toggle.focus();
  });

  window.addEventListener('resize', () => {
    if (window.matchMedia('(min-width: 992px)').matches) setOpen(false);
  });
})();
