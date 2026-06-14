/* archive-menu.js — mobile MORE sheet + search-the-drawer behavior, shared by
   every room. Load BEFORE archive-subscribe.js so the sheet's Subscribe row
   gets bound. Production routes: / (Photos), /letters, /made. */
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

  var sheet = document.createElement('div');
  sheet.className = 'moresheet';
  var rows = '';
  rows += rowFor(ROOMS[0]);
  rows += rowFor(ROOMS[1]);
  rows += '<a class="moresheet__row" href="/sundays#catalog">Find a letter</a>';
  rows += rowFor(ROOMS[2]);
  rows += '<button class="moresheet__row" data-subscribe>Subscribe</button>';
  sheet.innerHTML = '<div class="moresheet__panel">' + rows + '</div>';
  document.body.appendChild(sheet);

  function rowFor(room) {
    var cls = 'moresheet__row' + (isHere(room.href) ? ' moresheet__row--here' : '');
    return '<a class="' + cls + '" href="' + room.href + '">' + room.label + '</a>';
  }

  function open() { sheet.classList.add('moresheet--open'); }
  function close() { sheet.classList.remove('moresheet--open'); }

  sheet.addEventListener('click', function (e) { if (e.target === sheet) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  Array.prototype.forEach.call(sheet.querySelectorAll('a, button'), function (el) {
    el.addEventListener('click', close);
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-more]'), function (el) {
    el.addEventListener('click', function (e) { e.preventDefault(); open(); });
  });

  /* search = filter the drawer */
  Array.prototype.forEach.call(document.querySelectorAll('[data-search]'), function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      if (typeof window.openCatalog === 'function') window.openCatalog();
      else location.href = '/sundays#catalog';
    });
  });

  /* the magnifier: expand left, then carry the query into the drawer */
  var search = document.getElementById('barSearch');
  if (search) {
    var sInput = document.getElementById('barSearchInput');
    var mag = search.querySelector('.bar__mag');
    function submitSearch() {
      var q = sInput.value.trim();
      if (typeof window.openCatalog === 'function') window.openCatalog(q);
      else location.href = '/sundays#catalog' + (q ? '=' + encodeURIComponent(q) : '');
    }
    mag.addEventListener('click', function () {
      if (!search.classList.contains('bar__search--open')) {
        search.classList.add('bar__search--open');
        setTimeout(function () { sInput.focus(); }, 120);
      } else {
        submitSearch();
      }
    });
    sInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') submitSearch();
      if (e.key === 'Escape') {
        sInput.value = '';
        search.classList.remove('bar__search--open');
        sInput.blur();
      }
    });
  }
})();
