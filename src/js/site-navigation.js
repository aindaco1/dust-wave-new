(() => {
  const toggle = document.querySelector('[data-site-nav-toggle]');
  const menu = document.getElementById(toggle?.getAttribute('aria-controls') || '');
  if (!toggle || !menu) return;

  const subnav = menu.querySelector('[data-site-subnav]');
  const subnavToggle = subnav?.querySelector('[data-site-subnav-toggle]');
  const subnavLabel = subnavToggle?.querySelector('[data-site-subnav-label]');

  const setSubnavOpen = (open) => {
    if (!subnav || !subnavToggle) return;
    subnav.classList.toggle('is-open', open);
    subnavToggle.setAttribute('aria-expanded', String(open));
    if (subnavLabel) {
      subnavLabel.textContent = open
        ? subnavToggle.dataset.labelClose
        : subnavToggle.dataset.labelOpen;
    }
  };

  const setOpen = (open) => {
    menu.classList.toggle('show', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (!open) setSubnavOpen(false);
  };

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  subnavToggle?.addEventListener('click', () => {
    setSubnavOpen(subnavToggle.getAttribute('aria-expanded') !== 'true');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (subnavToggle?.getAttribute('aria-expanded') === 'true') {
      setSubnavOpen(false);
      subnavToggle.focus();
      return;
    }
    if (toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });

  document.addEventListener('click', (event) => {
    if (!subnav?.contains(event.target)) setSubnavOpen(false);
  });

  window.addEventListener('resize', () => {
    if (window.matchMedia('(min-width: 992px)').matches) {
      setOpen(false);
      setSubnavOpen(false);
    }
  });
})();
