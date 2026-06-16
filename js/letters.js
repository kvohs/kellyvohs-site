/* ============================================================================
   LETTERS — kellyvohs.com /letters
   The reading room: the latest letter on the top sheet, fed by the live
   Substack proxy. Card catalog, continue-reading, real audio.
   Depends on: feed.js (fetchFullFeed, getSlug, stripHTML)
   ========================================================================== */
(function () {
  var letters = [];     // newest first
  var current = 0;
  var audio = null;
  var canHover = window.matchMedia('(hover: hover)').matches;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var sheetEl = document.getElementById('letter');
  var passageEl = document.getElementById('passage');
  var continueEl = document.getElementById('continue');
  var continueRowEl = document.getElementById('continueRow');
  var drawer = document.getElementById('catalogDrawer');
  var rowsEl = document.getElementById('catalogRows');
  var filterEl = document.getElementById('catalogFilter');
  var cardEl = document.getElementById('card');

  function num(i) { return letters.length - i; }

  function dateLong(d) {
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  function dateShort(d) {
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }).toUpperCase();
  }
  function fmtTime(s) {
    if (!s || !isFinite(s)) return '';
    var m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function plainText(item) {
    if (item._text !== undefined) return item._text;
    var spaced = (item.content || item.description || '')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/?(p|div|li|h[1-6]|blockquote)[^>]*>/gi, ' ');
    var div = document.createElement('div');
    div.innerHTML = spaced;
    item._text = (div.textContent || '').replace(/\s+/g, ' ').trim();
    return item._text;
  }
  function excerptOf(item) {
    var t = plainText(item);
    var cut = t.lastIndexOf(' ', 200);
    return t.slice(0, cut > 120 ? cut : 200);
  }
  function wordCount(item) {
    var t = plainText(item);
    return t ? t.split(/\s+/).length : 0;
  }

  /* Read our owned snapshot first (data/letters.json — frozen, no Substack
     dependency); fall back to the live feed only if the snapshot is missing. */
  function loadLetters() {
    return fetch('/data/letters.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('no snapshot'); return r.json(); })
      .then(function (d) { return (d && d.items && d.items.length) ? d.items : Promise.reject(new Error('empty snapshot')); })
      .catch(function () { return fetchFullFeed('words'); });
  }

  /* ── boot ─────────────────────────────────────────────────────────── */
  function init() {
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    bindStaticControls();

    loadLetters().then(function (items) {
      if (!items || !items.length) {
        sheetEl.innerHTML = '<p class="letter__loading">Unable to load letters &mdash; ' +
          '<a href="https://kellyvohs.substack.com" target="_blank" rel="noopener">read on Substack</a>.</p>';
        return;
      }
      letters = items;
      buildPeek();

      var hash = location.hash.slice(1);
      if (hash.indexOf('catalog') === 0) {
        current = 0;
        renderLetter(true);
        buildCatalog();
        var q = decodeURIComponent((hash.split('=')[1] || ''));
        setTimeout(function () { openCatalog(q); }, 150);
        return;
      }
      var n = parseInt(hash, 10);
      if (n) {
        // old fragment permalink (/sundays#73) → canonical /p/<slug>
        var idx = Math.min(Math.max(letters.length - n, 0), letters.length - 1);
        location.replace('/p/' + slugOf(letters[idx]));
        return;
      }
      current = 0;
      renderLetter(true);
      buildCatalog();
    });
  }

  /* ── render a letter ──────────────────────────────────────────────── */
  function renderLetter(typeTitle) {
    stopAudio();
    var item = letters[current];
    var slug = getSlug(item.link);
    document.title = 'No. ' + num(current) + ' — ' + item.title + ' — Kelly Vohs';

    try {
      sessionStorage.setItem('post_' + slug, JSON.stringify({
        title: item.title, date: dateLong(item.pubDate),
        content: item.content || '', link: item.link,
        audioUrl: item.audioUrl || null, number: num(current)
      }));
    } catch (e) { /* storage full — skip */ }

    var words = wordCount(item);
    var mins = Math.max(1, Math.round(words / 220));

    sheetEl.innerHTML =
      '<p class="dateline">Sunday Letter — <span class="no">No. ' + num(current) + '</span> — ' + dateLong(item.pubDate) + '</p>' +
      '<h1 class="typedtitle" id="typedTitle"></h1>' +
      (item.audioUrl ?
        '<div class="audio" id="audioWrap">' +
          '<button class="audio__btn" id="audioBtn">&#9654; LISTEN</button>' +
          '<div class="audio__wave" id="audioWave"></div>' +
          '<span class="audio__time" id="audioTime"></span>' +
          '<button class="audio__speed" id="audioSpeed">1x</button>' +
        '</div>' : '') +
      '<div class="typedbody">' + (item.content || '') + '</div>' +
      '<p class="letter__wordcount">No. ' + num(current) + ' — ' + words + ' words — about ' + mins + ' min</p>';

    processBodyMedia(item);
    renderPassage();
    renderContinue();
    bindAudio(item);

    var titleEl = document.getElementById('typedTitle');
    if (typeTitle && !reduceMotion) typeInto(titleEl, item.title);
    else titleEl.textContent = item.title;

    window.scrollTo({ top: 0, behavior: 'instant' });
    onScroll();
  }

  /* Substack ships native videos as empty <div class="native-video-embed">
     placeholders (no playable URL in the feed). Turn them into a typed link
     to the letter on Substack, where the video plays. */
  function processBodyMedia(item) {
    var body = document.querySelector('.typedbody');
    if (!body) return;
    Array.prototype.forEach.call(body.querySelectorAll('.native-video-embed'), function (ph) {
      var a = document.createElement('a');
      a.className = 'video-link';
      a.href = item.link;
      a.target = '_blank';
      a.rel = 'noopener';
      a.innerHTML = '&#9654;&ensp;Watch the video on Substack &rarr;';
      ph.replaceWith(a);
    });
  }

  function renderPassage() {
    var hasPrev = current < letters.length - 1;  // older
    var hasNext = current > 0;                    // newer
    passageEl.innerHTML =
      '<button class="passage__link" id="prevBtn" ' + (hasPrev ? '' : 'disabled') + '>' +
        (hasPrev ? '&larr; No. ' + num(current + 1) + '<br />' + letters[current + 1].title.toUpperCase() : '') +
      '</button>' +
      '<span class="passage__counter">' + num(current) + ' OF ' + letters.length + '</span>' +
      '<button class="passage__link passage__link--next" id="nextBtn" ' + (hasNext ? '' : 'disabled') + '>' +
        (hasNext ? 'No. ' + num(current - 1) + ' &rarr;<br />' + letters[current - 1].title.toUpperCase() : '') +
      '</button>';
    var prev = document.getElementById('prevBtn');
    var next = document.getElementById('nextBtn');
    if (hasPrev) prev.addEventListener('click', function () { go(current + 1); });
    if (hasNext) next.addEventListener('click', function () { go(current - 1); });
  }

  function renderContinue() {
    var picks = [];
    for (var k = 1; k <= 3 && current + k < letters.length; k++) picks.push(current + k);
    if (!picks.length) { continueEl.hidden = true; return; }
    continueEl.hidden = false;
    continueRowEl.innerHTML = picks.map(function (i) {
      var it = letters[i];
      return '<button class="mini" data-i="' + i + '">' +
        '<p class="mini__no"><span class="n">No. ' + num(i) + '</span> — ' + dateShort(it.pubDate) + '</p>' +
        '<p class="mini__title">' + it.title + '</p>' +
        '<p class="mini__ex">' + excerptOf(it) + '</p>' +
        '<p class="mini__read">READ &rarr;</p>' +
      '</button>';
    }).join('');
    Array.prototype.forEach.call(continueRowEl.querySelectorAll('.mini'), function (m) {
      m.addEventListener('click', function () { go(parseInt(m.dataset.i, 10)); });
    });
  }

  function slugOf(it) { return it.slug || getSlug(it.link); }

  /* Every letter is now a real page — navigate there instead of rendering
     in place. (catalog rows, peek, continue cards, passage all call go.) */
  function go(i) {
    if (i < 0 || i >= letters.length) return;
    location.href = '/p/' + slugOf(letters[i]);
  }

  /* ── typewriter title ─────────────────────────────────────────────── */
  function typeInto(el, text) {
    var caret = '<span class="caret"></span>';
    var i = 0;
    el.innerHTML = caret;
    (function tick() {
      if (i < text.length) {
        el.innerHTML = text.slice(0, ++i) + caret;
        setTimeout(tick, 55);
      } else {
        setTimeout(function () { el.textContent = text; }, 1400);
      }
    })();
  }

  /* ── audio ────────────────────────────────────────────────────────── */
  var SPEEDS = [1, 1.25, 1.5, 2];

  function stopAudio() { if (audio) { audio.pause(); audio = null; } }

  function seededBars(seed) {
    var h = 0, bars = [], i;
    for (i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
    for (i = 0; i < 72; i++) { h = (h * 16807 + 12345) & 0x7fffffff; bars.push(20 + (h % 80)); }
    return bars;
  }

  function bindAudio(item) {
    var wrap = document.getElementById('audioWrap');
    if (!wrap) return;
    var btn = document.getElementById('audioBtn');
    var wave = document.getElementById('audioWave');
    var timeEl = document.getElementById('audioTime');
    var speedBtn = document.getElementById('audioSpeed');
    var speedIdx = 0;
    var bars = [];

    speedBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      speedIdx = (speedIdx + 1) % SPEEDS.length;
      if (audio) audio.playbackRate = SPEEDS[speedIdx];
      speedBtn.textContent = SPEEDS[speedIdx] + 'x';
    });

    btn.addEventListener('click', function () {
      if (!audio) {
        audio = new Audio(item.audioUrl);
        audio.playbackRate = SPEEDS[speedIdx];
        wave.innerHTML = seededBars(item.title)
          .map(function (v) { return '<span class="audio__bar" style="height:' + Math.round(v * 0.26) + 'px"></span>'; })
          .join('');
        bars = Array.prototype.slice.call(wave.children);

        audio.addEventListener('loadedmetadata', function () {
          timeEl.textContent = '-' + fmtTime(audio.duration);
        });
        audio.addEventListener('timeupdate', function () {
          if (!audio || !audio.duration) return;
          var lit = Math.floor((audio.currentTime / audio.duration) * bars.length);
          bars.forEach(function (b, i) { b.classList.toggle('audio__bar--played', i < lit); });
          timeEl.textContent = '-' + fmtTime(audio.duration - audio.currentTime);
        });
        audio.addEventListener('ended', function () {
          wrap.classList.remove('audio--playing');
          btn.innerHTML = '&#9654; LISTEN';
          bars.forEach(function (b) { b.classList.remove('audio__bar--played'); });
          timeEl.textContent = '-' + fmtTime(audio.duration);
        });
        wave.addEventListener('click', function (e) {
          if (!audio || !audio.duration) return;
          var rect = wave.getBoundingClientRect();
          audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
        });
      }
      wrap.classList.add('audio--open');
      if (audio.paused) {
        audio.play();
        wrap.classList.add('audio--playing');
        btn.innerHTML = '&#9646;&#9646;';
      } else {
        audio.pause();
        wrap.classList.remove('audio--playing');
        btn.innerHTML = '&#9654;';
      }
    });
  }

  /* ── catalog peek: a paper preview of recent letters on hover ─────── */
  function buildPeek() {
    var btn = document.querySelector('.bar__links [data-search]');   // the Catalog link
    if (!btn || !window.matchMedia('(hover: hover)').matches) return;

    var peek = document.createElement('div');
    peek.className = 'peek';
    peek.innerHTML =
      '<input class="peek__search" type="text" placeholder="find a letter&hellip;" aria-label="Find a letter" />' +
      '<div class="peek__list"></div>' +
      '<button class="peek__all">All ' + letters.length + ' letters &rarr;</button>';
    document.body.appendChild(peek);

    var listEl = peek.querySelector('.peek__list');
    var searchEl = peek.querySelector('.peek__search');
    var hideT;

    function rows(q) {
      var query = (q || '').toLowerCase();
      var matched = letters.map(function (it, i) { return { it: it, i: i }; })
        .filter(function (o) { return !query || o.it.title.toLowerCase().indexOf(query) !== -1; })
        .slice(0, 10);
      if (!matched.length) { listEl.innerHTML = '<p class="peek__empty">no letters match.</p>'; return; }
      listEl.innerHTML = matched.map(function (o) {
        return '<button class="peek__row" data-i="' + o.i + '">' +
          '<span class="peek__num">' + num(o.i) + '</span>' +
          '<span class="peek__title">' + o.it.title + '</span></button>';
      }).join('');
      Array.prototype.forEach.call(listEl.querySelectorAll('.peek__row'), function (r) {
        r.addEventListener('click', function () { hide(); go(parseInt(r.dataset.i, 10)); });
      });
    }
    rows('');

    function position() {
      var r = btn.getBoundingClientRect();
      peek.style.top = (r.bottom + 8) + 'px';
      peek.style.left = Math.max(12, Math.min(r.right - 340, innerWidth - 352)) + 'px';
    }
    function show() { clearTimeout(hideT); position(); peek.classList.add('peek--show'); }
    function scheduleHide() { hideT = setTimeout(function () { peek.classList.remove('peek--show'); }, 200); }
    function hide() { clearTimeout(hideT); peek.classList.remove('peek--show'); searchEl.value = ''; rows(''); }

    btn.addEventListener('mouseenter', show);
    btn.addEventListener('mouseleave', scheduleHide);
    btn.addEventListener('click', hide);          // click opens the full drawer
    peek.addEventListener('mouseenter', function () { clearTimeout(hideT); });
    peek.addEventListener('mouseleave', scheduleHide);
    searchEl.addEventListener('input', function () { rows(searchEl.value.trim()); });
    searchEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { var q = searchEl.value.trim(); hide(); openCatalog(q); }
      if (e.key === 'Escape') { hide(); }
    });
    peek.querySelector('.peek__all').addEventListener('click', function () { hide(); openCatalog(); });
    window.addEventListener('scroll', function () { if (peek.classList.contains('peek--show')) position(); }, { passive: true });
  }

  /* ── card catalog ─────────────────────────────────────────────────── */
  function buildCatalog() {
    document.getElementById('catalogLabel').textContent = 'CARD CATALOG — ' + letters.length + ' LETTERS';
    drawRows('');
    filterEl.addEventListener('input', function () { drawRows(filterEl.value.trim()); });
    document.getElementById('catalogClose').addEventListener('click', closeCatalog);
    drawer.addEventListener('click', function (e) { if (e.target === drawer) closeCatalog(); });
    drawer.addEventListener('scroll', hideCard);
  }

  function drawRows(q) {
    var query = (q || '').toLowerCase();
    rowsEl.innerHTML = letters
      .map(function (it, i) { return { it: it, i: i }; })
      .filter(function (o) { return !query || o.it.title.toLowerCase().indexOf(query) !== -1; })
      .map(function (o) {
        return '<button class="catalog__row' + (o.i === current ? ' catalog__row--current' : '') + '" data-i="' + o.i + '">' +
          '<span class="catalog__num">' + num(o.i) + '</span>' +
          '<span class="catalog__title">' + o.it.title + '</span>' +
          '<span class="catalog__date">' + dateShort(o.it.pubDate) + '</span>' +
        '</button>';
      }).join('');

    Array.prototype.forEach.call(rowsEl.querySelectorAll('.catalog__row'), function (row) {
      var i = parseInt(row.dataset.i, 10);
      row.addEventListener('click', function () { hideCard(); closeCatalog(); go(i); });
      row.addEventListener('mouseenter', function () { showCard(i); });
      row.addEventListener('mousemove', moveCard);
      row.addEventListener('mouseleave', hideCard);
    });
  }

  function showCard(i) {
    if (!canHover) return;
    var it = letters[i];
    document.getElementById('cardTitle').textContent = it.title;
    document.getElementById('cardMeta').textContent = 'NO. ' + num(i) + ' — ' + dateLong(it.pubDate).toUpperCase();
    document.getElementById('cardExcerpt').textContent = excerptOf(it) + '…';
    cardEl.classList.add('card--show');
  }
  function moveCard(e) {
    if (!canHover) return;
    var w = 312, x = e.clientX + 26, y = e.clientY + 18;
    if (x + w + 20 > innerWidth) x = e.clientX - w - 26;
    if (y + 190 > innerHeight) y = e.clientY - 190;
    cardEl.style.left = x + 'px';
    cardEl.style.top = y + 'px';
  }
  function hideCard() { cardEl.classList.remove('card--show'); }

  function openCatalog(prefill) {
    if (!letters.length) return;
    drawer.classList.add('catalog--open');
    filterEl.value = prefill || '';
    drawRows(prefill || '');
    setTimeout(function () { filterEl.focus(); }, 100);
    document.documentElement.style.overflow = 'hidden';
  }
  function closeCatalog() {
    drawer.classList.remove('catalog--open');
    if (drawer.contains(document.activeElement)) document.activeElement.blur();
    hideCard();
    document.documentElement.style.overflow = '';
  }
  window.openCatalog = openCatalog;

  /* ── static controls: keys, scroll ────────────────────────────────── */
  function bindStaticControls() {
    document.addEventListener('keydown', function (e) {
      var typing = document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA';
      if (e.key === 'Escape') { closeCatalog(); return; }
      if (typing) return;
      if (e.key === 'c' || e.key === 'i' || e.key === '/') { e.preventDefault(); openCatalog(); }
    });
  }

  function onScroll() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    document.getElementById('carriage').style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
    document.getElementById('bar').classList.toggle('bar--scrolled', window.scrollY > 20);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
