/* sitebar.js — the one site header, injected.
   Stamps the archive "bar" (KELLYVOHS · Photos / Sundays / Catalog / Made /
   Subscribe), the mobile thumb bar, the scroll carriage, and the footer into
   any page, so every room shares one letterhead. Styling lives in archive.css.
   Load BEFORE archive-menu.js + archive-subscribe.js (they wire the markup
   this injects). Replaces the legacy components/nav.js + footer.js. */
(function () {
  var ROOMS = [
    { href: '/', label: 'Photos' },
    { href: '/sundays', label: 'Sundays' },
    { href: '/made', label: 'Made' }
  ];

  function isHere(href) {
    var p = location.pathname.replace(/\/$/, '') || '/';
    if (href === '/') return p === '/' || p === '/index.html';
    return p === href || p === href + '.html' || p.indexOf(href) === 0;
  }
  function hereCls(href) { return 'bar__link' + (isHere(href) ? ' bar__link--here' : ''); }

  /* scroll carriage */
  if (!document.getElementById('carriage')) {
    var carriage = document.createElement('div');
    carriage.className = 'carriage';
    carriage.id = 'carriage';
    document.body.insertBefore(carriage, document.body.firstChild);
  }

  /* the bar */
  var bar = document.createElement('header');
  bar.className = 'bar';
  bar.id = 'bar';
  bar.innerHTML =
    '<div class="bar__row">' +
      '<a class="bar__home" href="/">KELLYVOHS</a>' +
      '<nav class="bar__links">' +
        '<span class="bar__search" id="barSearch">' +
          '<input class="bar__searchinput" id="barSearchInput" type="text" placeholder="find" aria-label="Find" />' +
          '<button class="bar__mag" aria-label="Search the letters"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><circle cx="7" cy="7" r="4.5"></circle><line x1="10.4" y1="10.4" x2="14" y2="14"></line></svg></button>' +
        '</span>' +
        '<a class="' + hereCls('/') + '" href="/">Photos</a>' +
        '<a class="' + hereCls('/sundays') + '" href="/sundays">Sundays</a>' +
        '<button class="bar__link" data-search>Catalog</button>' +
        '<a class="' + hereCls('/made') + '" href="/made">Made</a>' +
        '<button class="bar__link" data-subscribe>Subscribe</button>' +
      '</nav>' +
    '</div>';
  document.body.insertBefore(bar, document.getElementById('carriage').nextSibling);

  /* the mobile thumb bar */
  var thumb = document.createElement('nav');
  thumb.className = 'thumb';
  thumb.innerHTML =
    '<button class="thumb__search" data-search><span class="thumb__caret"></span>find</button>' +
    '<button class="thumb__more" data-more aria-label="Menu"><i></i><i></i><i></i></button>';
  document.body.insertBefore(thumb, bar.nextSibling);

  /* the footer */
  if (!document.querySelector('.foot')) {
    var foot = document.createElement('footer');
    foot.className = 'foot';
    foot.innerHTML = '<p><a href="/">PHOTOS</a> · <a href="/sundays">SUNDAYS</a> · <a href="/made">MADE</a></p>';
    document.body.appendChild(foot);
  }

  /* carriage width + bar hairline on scroll */
  function onScroll() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    var c = document.getElementById('carriage');
    if (c) c.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
    bar.classList.toggle('bar--scrolled', window.scrollY > 20);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
