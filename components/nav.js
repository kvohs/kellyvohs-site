/* ==========================================================
   NAV COMPONENT — kellyvohs.com
   Builds the site navigation. Highlights the current page.
   ========================================================== */

function buildNav() {
  const path = window.location.pathname;
  const isHome = path === '/' || path.endsWith('index.html');
  const isPhotography = path.includes('photography');
  const isWriting = path.includes('writing');

  const homeHref = isHome ? '#' : (path.includes('/pages/') ? '../index.html' : 'index.html');
  const photoHref = isHome ? 'pages/photography.html' : (path.includes('photography') ? '#' : 'photography.html');
  const writeHref = isHome ? 'pages/writing.html' : (path.includes('writing') ? '#' : 'writing.html');

  const nav = document.createElement('nav');
  nav.className = isHome ? 'nav nav--hero' : 'nav';
  nav.setAttribute('role', 'navigation');
  nav.setAttribute('aria-label', 'Main navigation');

  nav.innerHTML = `
    <div class="nav__name">
      <a href="${homeHref}">Kelly Vohs</a>
    </div>
    <div class="nav__right">
      <button class="nav__search-btn" aria-label="Search">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </button>
      <a href="${photoHref}" class="nav__link ${isPhotography ? 'nav__link--active' : ''}">Photography</a>
      <a href="${writeHref}" class="nav__link ${isWriting ? 'nav__link--active' : ''}">Writing</a>
    </div>
  `;

  // Search dialog
  const dialog = document.createElement('div');
  dialog.className = 'search-dialog';
  dialog.innerHTML = `
    <div class="search-dialog__backdrop"></div>
    <div class="search-dialog__box">
      <input type="search" class="search-dialog__input" placeholder="Search" autocomplete="off" />
      <div class="search-dialog__results"></div>
    </div>
  `;

  document.body.prepend(nav);
  document.body.appendChild(dialog);

  // Open / close
  const searchBtn = nav.querySelector('.nav__search-btn');
  const backdrop = dialog.querySelector('.search-dialog__backdrop');
  const input = dialog.querySelector('.search-dialog__input');

  function openSearch() {
    dialog.classList.add('search-dialog--open');
    document.body.style.overflow = 'hidden';
    input.focus();
  }

  function closeSearch() {
    dialog.classList.remove('search-dialog--open');
    document.body.style.overflow = '';
    input.value = '';
    input.dispatchEvent(new Event('input'));
  }

  searchBtn.addEventListener('click', openSearch);
  backdrop.addEventListener('click', closeSearch);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dialog.classList.contains('search-dialog--open')) {
      closeSearch();
    }
  });

  // Background on scroll
  window.addEventListener('scroll', () => {
    nav.classList.toggle('nav--scrolled', window.scrollY > 60);
  }, { passive: true });

  // Init search after dialog is in the DOM
  if (typeof initSearch === 'function') initSearch();
}
