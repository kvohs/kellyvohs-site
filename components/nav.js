/* ==========================================================
   NAV COMPONENT — kellyvohs.com
   Builds the site navigation. Highlights the current page.
   ========================================================== */

function buildNav() {
  // Determine which page is active based on the URL
  const path = window.location.pathname;
  const isHome = path === '/' || path.endsWith('index.html');
  const isPhotography = path.includes('photography');
  const isWriting = path.includes('writing');

  // Path prefix — works from root or /pages/ subdirectory
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
    <button class="nav__toggle" aria-label="Toggle menu" aria-expanded="false">
      <span></span>
      <span></span>
      <span></span>
    </button>
    <div class="nav__links">
      <a href="${photoHref}" class="nav__link ${isPhotography ? 'nav__link--active' : ''}">Photography</a>
      <a href="${writeHref}" class="nav__link ${isWriting ? 'nav__link--active' : ''}">Writing</a>
    </div>
  `;

  document.body.prepend(nav);

  // Mobile menu toggle
  const toggle = nav.querySelector('.nav__toggle');
  const links = nav.querySelector('.nav__links');

  toggle.addEventListener('click', () => {
    const isOpen = toggle.classList.toggle('nav__toggle--open');
    links.classList.toggle('nav__links--open');
    toggle.setAttribute('aria-expanded', isOpen);
  });

  // Close mobile menu when a link is clicked
  links.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('nav__toggle--open');
      links.classList.remove('nav__links--open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });

  // Background on scroll
  window.addEventListener('scroll', () => {
    nav.classList.toggle('nav--scrolled', window.scrollY > 60);
  }, { passive: true });
}
