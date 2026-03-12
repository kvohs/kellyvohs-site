/* ==========================================================
   WRITING FEED — kellyvohs.com
   Renders writing posts with expand/collapse.
   Depends on: feed.js
   ========================================================== */

let lastRenderedYear = null;

const renderPosts = createPaginatedFeed({
  containerSelector: '.post-list',
  feedKey: 'words',
  perPage: 20,
  fullCatalog: true,
  errorLink: 'https://kellyvohs.substack.com',
  globalKey: '__writingPosts',

  mapItem(item, index, allItems) {
    if (index === 0) lastRenderedYear = null;

    const slug = getSlug(item.link);
    const dateObj = new Date(item.pubDate);

    // Cache full post for the reading page (try/catch for Safari quota limits)
    try {
      sessionStorage.setItem('post_' + slug, JSON.stringify({
        title: item.title,
        date: dateObj.toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        }),
        content: item.content || '',
        link: item.link,
        audioUrl: item.audioUrl || null
      }));
    } catch (e) { /* storage full — skip caching */ }

    return {
      title: item.title,
      slug,
      link: item.link,
      number: allItems.length - index,
      year: dateObj.getFullYear().toString(),
      content: item.content || '',
      image: item.thumbnail || null,
      audioUrl: item.audioUrl || null
    };
  },

  createEntry(post) {
    const fragment = document.createDocumentFragment();

    const article = document.createElement('article');
    article.className = 'post-entry';
    if (post.image) article.dataset.image = post.image;

    const hasContent = post.content && post.content !== 'undefined';

    const audioBtn = post.audioUrl ? `
      <button class="post-entry__play" data-src="${post.audioUrl}" type="button" aria-label="Play audio">
        <svg class="post-entry__play-icon" width="10" height="12" viewBox="0 0 10 12" fill="currentColor"><polygon points="0,0 10,6 0,12"/></svg>
        <span class="post-entry__pause-icon">&#9646;&#9646;</span>
      </button>
    ` : '';

    article.innerHTML = `
      <header class="post-entry__header">
        <div class="post-entry__line">
          <span class="post-entry__number">${post.number}</span>
          <h2 class="post-entry__title">${post.title}</h2>
          ${audioBtn}
        </div>
      </header>
      ${hasContent ? `<div class="post-entry__body">${post.content}</div>` : ''}
    `;

    if (hasContent) {
      article.style.cursor = 'pointer';

      article.addEventListener('click', (e) => {
        if (e.target.closest('.post-entry__play') || e.target.closest('.waveform') || e.target.closest('.post-entry__hero')) return;
        if (e.target.closest('.post-entry__preview') && !e.target.closest('.preview-read')) return;

        if (article.classList.contains('post-entry--open') && e.target.closest('.post-entry__body a')) {
          const link = e.target.closest('.post-entry__body a');
          if (link.querySelector('img')) {
            e.preventDefault();
            return;
          }
          return;
        }
        e.preventDefault();
        article.classList.toggle('post-entry--open');
      });
    }

    if (post.audioUrl) initAudioPlayer(article.querySelector('.post-entry__play'));

    fragment.appendChild(article);
    return fragment;
  },

  placeholders: [
    { title: 'Wake Zones', slug: 'wake-zones', link: 'https://kellyvohs.substack.com/p/wake-zones', date: 'March 8, 2026', shortDate: 'March 8', year: '2026', image: null },
    { title: 'Lost Lesson', slug: 'lost-lesson', link: 'https://kellyvohs.substack.com/p/lost-lesson', date: 'January 25, 2026', shortDate: 'January 25', year: '2026', image: null },
    { title: 'Cold Open', slug: 'cold-open', link: '#', date: 'January 11, 2026', shortDate: 'January 11', year: '2026', image: null },
    { title: 'Year of the Edge', slug: 'year-of-the-edge', link: '#', date: 'December 28, 2025', shortDate: 'December 28', year: '2025', image: null },
    { title: 'Still Life With Dishes', slug: 'still-life-with-dishes', link: '#', date: 'December 14, 2025', shortDate: 'December 14', year: '2025', image: null },
    { title: 'The Long Exposure', slug: 'the-long-exposure', link: '#', date: 'November 30, 2025', shortDate: 'November 30', year: '2025', image: null },
    { title: 'Minimum Viable Morning', slug: 'minimum-viable-morning', link: '#', date: 'November 16, 2025', shortDate: 'November 16', year: '2025', image: null },
    { title: 'Against Optimization', slug: 'against-optimization', link: '#', date: 'November 2, 2025', shortDate: 'November 2', year: '2025', image: null },
    { title: 'What the Lens Sees', slug: 'what-the-lens-sees', link: '#', date: 'October 19, 2025', shortDate: 'October 19', year: '2025', image: null },
    { title: 'Small Fires', slug: 'small-fires', link: '#', date: 'October 5, 2025', shortDate: 'October 5', year: '2025', image: null },
    { title: 'Permission Slip', slug: 'permission-slip', link: '#', date: 'September 21, 2025', shortDate: 'September 21', year: '2025', image: null },
    { title: 'Prime Lens Living', slug: 'prime-lens-living', link: '#', date: 'September 7, 2025', shortDate: 'September 7', year: '2025', image: null },
    { title: 'Holding Pattern', slug: 'holding-pattern', link: '#', date: 'August 24, 2025', shortDate: 'August 24', year: '2025', image: null },
    { title: 'Sunday Proof', slug: 'sunday-proof', link: '#', date: 'August 10, 2025', shortDate: 'August 10', year: '2025', image: null },
    { title: 'Blank Rolls', slug: 'blank-rolls', link: '#', date: 'July 27, 2025', shortDate: 'July 27', year: '2025', image: null }
  ]
});

/* --- Audio player --- */

let currentAudio = null;
let currentPlayer = null;
let currentArticle = null;
let stickyBar = null;
let stickyRaf = null;
let stickyWaveformEl = null;

const MINI_BAR_COUNT = 40;

function buildStickyBar() {
  if (stickyBar) return stickyBar;
  const bar = document.createElement('div');
  bar.className = 'sticky-player';
  bar.innerHTML = `
    <button class="sticky-player__toggle" type="button" aria-label="Pause">
      <span class="sticky-player__play-icon">&#9654;</span>
      <span class="sticky-player__pause-icon">&#9646;&#9646;</span>
    </button>
    <span class="sticky-player__title"></span>
    <div class="sticky-player__wave"></div>
    <button class="sticky-player__speed" type="button">1x</button>
    <span class="sticky-player__time"></span>
    <button class="sticky-player__close" type="button" aria-label="Close">&times;</button>
  `;
  document.body.appendChild(bar);
  stickyBar = bar;

  // Whole pill = play/pause, except waveform (seek), speed, and close
  bar.addEventListener('click', (e) => {
    if (e.target.closest('.sticky-player__wave') || e.target.closest('.sticky-player__speed') || e.target.closest('.sticky-player__close')) return;
    if (currentPlayer) currentPlayer.click();
  });

  // Waveform click = seek
  bar.querySelector('.sticky-player__wave').addEventListener('click', (e) => {
    if (!currentAudio || !currentAudio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    currentAudio.currentTime = ((e.clientX - rect.left) / rect.width) * currentAudio.duration;
  });

  // Speed button syncs with main player
  bar.querySelector('.sticky-player__speed').addEventListener('click', () => {
    const mainSpeed = currentArticle?.querySelector('.waveform__speed');
    if (mainSpeed) mainSpeed.click();
  });

  // Close button — stop audio and hide pill
  bar.querySelector('.sticky-player__close').addEventListener('click', () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    if (currentPlayer) {
      currentPlayer.classList.remove('post-entry__play--active');
      const waveform = currentPlayer.closest('.post-entry')?.querySelector('.waveform');
      if (waveform) waveform.classList.remove('waveform--active');
    }
    stopStickyLoop();
    hideStickyBar();
    currentAudio = null;
    currentPlayer = null;
    currentArticle = null;
  });

  return bar;
}

let stickyWaveTitle = null;

function updateStickyBar(audio, title, speedText) {
  if (!stickyBar) return;
  stickyBar.querySelector('.sticky-player__title').textContent = title;
  stickyBar.querySelector('.sticky-player__speed').textContent = speedText;

  // Build mini waveform bars if title changed
  const waveEl = stickyBar.querySelector('.sticky-player__wave');
  if (stickyWaveTitle !== title) {
    stickyWaveTitle = title;
    const heights = generateWaveform(title, MINI_BAR_COUNT);
    const bars = heights.map(h => `<span class="sticky-player__wave-bar" style="height:${h}%"></span>`).join('');
    waveEl.innerHTML = `
      <div class="sticky-player__wave-base">${bars}</div>
      <div class="sticky-player__wave-fill">${bars}</div>
    `;
  }

  if (audio && audio.duration) {
    const pct = (audio.currentTime / audio.duration) * 100;
    const fill = waveEl.querySelector('.sticky-player__wave-fill');
    if (fill) fill.style.setProperty('--progress', pct + '%');
    const remaining = audio.duration - audio.currentTime;
    stickyBar.querySelector('.sticky-player__time').textContent = '-' + formatTime(remaining);
  }
}

function showStickyBar(playing) {
  if (!stickyBar) buildStickyBar();
  stickyBar.classList.toggle('sticky-player--playing', playing);
  stickyBar.classList.add('sticky-player--visible');
}

function hideStickyBar() {
  if (stickyBar) stickyBar.classList.remove('sticky-player--visible');
}

function startStickyLoop(waveformEl) {
  stickyWaveformEl = waveformEl;
  if (stickyRaf) cancelAnimationFrame(stickyRaf);

  function check() {
    if (!currentAudio) { hideStickyBar(); stickyRaf = null; return; }
    const rect = stickyWaveformEl.getBoundingClientRect();
    const inView = rect.bottom > 0 && rect.top < window.innerHeight;
    if (!inView) showStickyBar(!currentAudio.paused);
    else hideStickyBar();
    stickyRaf = requestAnimationFrame(check);
  }
  check();
}

function stopStickyLoop() {
  if (stickyRaf) { cancelAnimationFrame(stickyRaf); stickyRaf = null; }
  stickyWaveformEl = null;
}

function formatTime(s) {
  if (!s || !isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m + ':' + (sec < 10 ? '0' : '') + sec;
}

const BAR_COUNT = 150;

function generateWaveform(seed, count) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  const bars = [];
  for (let i = 0; i < count; i++) {
    h = (h * 16807 + 12345) & 0x7fffffff;
    bars.push(20 + (h % 80));
  }
  return bars;
}

const SPEED_OPTIONS = [1, 1.25, 1.5, 2];

function buildWaveformEl(title) {
  const heights = generateWaveform(title, BAR_COUNT);
  const bars = heights.map(h => `<span class="waveform__bar" style="height:${h}%"></span>`).join('');

  const waveform = document.createElement('div');
  waveform.className = 'waveform';
  waveform.innerHTML = `
    <div class="waveform__bars">
      <div class="waveform__base">${bars}</div>
      <div class="waveform__progress">${bars}</div>
    </div>
    <button class="waveform__speed" type="button">1x</button>
    <span class="waveform__time">0:00</span>
  `;
  return waveform;
}

function buildPreviewEl(content) {
  const preview = getPreview(content, 140);
  if (!preview) return null;

  const el = document.createElement('p');
  el.className = 'post-entry__preview';

  // Wrap each word in a span for progressive coloring
  const words = preview.split(/\s+/);
  el.innerHTML = words.map(w => `<span class="preview-word">${w}</span>`).join(' ')
    + ' <span class="preview-read">keep reading</span>';

  return el;
}

function initAudioPlayer(el) {
  let audio = null;
  let waveform = null;
  let previewEl = null;
  let wordSpans = [];
  const article = el.closest('.post-entry');
  const title = article.querySelector('.post-entry__title').textContent;

  // Get content from the hidden body
  const body = article.querySelector('.post-entry__body');
  const content = body ? body.innerHTML : '';

  el.addEventListener('click', () => {
    if (!audio) {
      audio = new Audio(el.dataset.src);
      audio.preload = 'metadata';

      waveform = buildWaveformEl(title);
      article.querySelector('.post-entry__header').appendChild(waveform);

      // Speed button
      const speedBtn = waveform.querySelector('.waveform__speed');
      let speedIdx = 0;
      speedBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        speedIdx = (speedIdx + 1) % SPEED_OPTIONS.length;
        audio.playbackRate = SPEED_OPTIONS[speedIdx];
        speedBtn.textContent = SPEED_OPTIONS[speedIdx] + 'x';
      });

      // Build text preview
      previewEl = buildPreviewEl(content);
      if (previewEl) {
        article.querySelector('.post-entry__header').appendChild(previewEl);
        wordSpans = previewEl.querySelectorAll('.preview-word');
      }

      // Show featured image
      const imgUrl = article.dataset.image;
      if (imgUrl) {
        const img = document.createElement('img');
        img.className = 'post-entry__hero';
        img.src = imgUrl;
        img.alt = '';
        img.loading = 'lazy';
        article.querySelector('.post-entry__header').appendChild(img);
      }

      // Seek on waveform click
      waveform.addEventListener('click', (e) => {
        if (!audio.duration) return;
        const rect = waveform.getBoundingClientRect();
        audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
      });

      audio.addEventListener('loadedmetadata', () => {
        waveform.querySelector('.waveform__time').textContent = formatTime(audio.duration);
      });

      audio.addEventListener('timeupdate', () => {
        if (!audio.duration) return;
        const pct = (audio.currentTime / audio.duration) * 100;
        waveform.style.setProperty('--progress', pct + '%');
        const remaining = audio.duration - audio.currentTime;
        waveform.querySelector('.waveform__time').textContent = '-' + formatTime(remaining);

        // Color words over the first 10% of the audio
        if (wordSpans.length) {
          const wordPct = Math.min(audio.currentTime / (audio.duration * 0.10), 1);
          const lit = Math.floor(wordPct * wordSpans.length);
          for (let i = 0; i < wordSpans.length; i++) {
            wordSpans[i].classList.toggle('preview-word--active', i < lit);
          }
        }

        // Sync sticky bar
        const speedText = waveform.querySelector('.waveform__speed').textContent;
        updateStickyBar(audio, title, speedText);
      });

      audio.addEventListener('ended', () => {
        el.classList.remove('post-entry__play--active');
        waveform.classList.remove('waveform--active');
        waveform.style.setProperty('--progress', '0%');
        currentAudio = null;
        currentPlayer = null;
        currentArticle = null;
        hideStickyBar();
        stopStickyLoop();
      });
    }

    // Only one track at a time
    if (currentAudio && currentAudio !== audio) {
      currentAudio.pause();
      currentPlayer.classList.remove('post-entry__play--active');
      const prevWaveform = currentPlayer.closest('.post-entry').querySelector('.waveform');
      if (prevWaveform) prevWaveform.classList.remove('waveform--active');
    }

    if (audio.paused) {
      audio.play();
      el.classList.add('post-entry__play--active');
      waveform.classList.add('waveform--active');
      currentAudio = audio;
      currentPlayer = el;
      currentArticle = article;
      buildStickyBar();
      stickyBar.classList.add('sticky-player--playing');
      stickyBar.classList.remove('sticky-player--visible');
      startStickyLoop(waveform);
    } else {
      audio.pause();
      el.classList.remove('post-entry__play--active');
      if (stickyBar) stickyBar.classList.remove('sticky-player--playing');
    }
  });
}
