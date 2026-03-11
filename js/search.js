/* ==========================================================
   SEARCH — kellyvohs.com
   Typeahead search: always searches both feeds.
   On subpages, also includes local on-page matches.
   ========================================================== */

function initSearch() {
  const input = document.querySelector('.search-dialog__input');
  const resultsEl = document.querySelector('.search-dialog__results');
  if (!input || !resultsEl) return;

  const path = window.location.pathname;
  const isWriting = path.includes('writing');
  const isPhotography = path.includes('photography');

  let debounceTimer;
  let feedCache = null;

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const query = input.value.trim().toLowerCase();

      if (!query) {
        clearResults();
        return;
      }

      searchAll(query);
    }, 150);
  });

  function clearResults() {
    resultsEl.innerHTML = '';
    resultsEl.classList.remove('search-dialog__results--open');
  }

  function getSnippet(text, query, len) {
    const lower = text.toLowerCase();
    const idx = lower.indexOf(query);
    if (idx === -1) return escapeHtml(text.slice(0, len)) + (text.length > len ? '...' : '');
    const start = Math.max(0, idx - 40);
    const end = Math.min(text.length, idx + query.length + (len - 40));
    let snippet = text.slice(start, end).trim();
    let prefix = start > 0 ? '...' : '';
    let suffix = end < text.length ? '...' : '';
    // Highlight matched text
    const matchStart = idx - start;
    const matchEnd = matchStart + query.length;
    const before = escapeHtml(snippet.slice(0, matchStart));
    const match = escapeHtml(snippet.slice(matchStart, matchEnd));
    const after = escapeHtml(snippet.slice(matchEnd));
    return prefix + before + '<mark class="search-highlight">' + match + '</mark>' + after + suffix;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function highlightMatch(text, query) {
    const idx = text.toLowerCase().indexOf(query);
    if (idx === -1) return escapeHtml(text);
    const before = escapeHtml(text.slice(0, idx));
    const match = escapeHtml(text.slice(idx, idx + query.length));
    const after = escapeHtml(text.slice(idx + query.length));
    return before + '<mark class="search-highlight">' + match + '</mark>' + after;
  }

  /* --- Combined search --- */

  async function searchAll(query) {
    if (!feedCache) {
      feedCache = await fetchBothFeeds();
    }

    // Local on-page matches (subpages only)
    const localMatches = getLocalMatches(query);

    // Feed matches
    const feedMatches = feedCache.filter(post => {
      return post.title.toLowerCase().includes(query) || post.text.toLowerCase().includes(query);
    });

    // Dedupe: if a local match title appears in feed results, skip the feed version
    const localTitles = new Set(localMatches.map(m => m.title.toLowerCase()));
    const uniqueFeed = feedMatches.filter(m => !localTitles.has(m.title.toLowerCase()));

    showCombinedResults(localMatches, uniqueFeed.slice(0, 8 - localMatches.length), query);
  }

  function getLocalMatches(query) {
    const matches = [];
    const selector = isWriting ? '.post-entry' : isPhotography ? '.photo-post' : null;
    if (!selector) return matches;

    const titleClass = isWriting ? '.post-entry__title' : '.photo-post__title';
    const bodyClass = isWriting ? '.post-entry__body' : '.photo-post__body';

    document.querySelectorAll(selector).forEach(article => {
      const title = (article.querySelector(titleClass)?.textContent || '');
      const body = (article.querySelector(bodyClass)?.textContent || '').trim();
      if (title.toLowerCase().includes(query) || body.toLowerCase().includes(query)) {
        matches.push({ title, snippet: getSnippet(body || title, query, 120), el: article, local: true });
      }
    });

    return matches.slice(0, 4);
  }

  function showCombinedResults(local, feed, query) {
    if (local.length === 0 && feed.length === 0) {
      resultsEl.innerHTML = '<div class="search-dialog__empty">No matches</div>';
      resultsEl.classList.add('search-dialog__results--open');
      return;
    }

    let html = '';

    // Local results (scroll-to buttons)
    html += local.map((m, i) => `
      <button class="search-dialog__result" data-local="${i}">
        <span class="search-dialog__result-title">${highlightMatch(m.title, query)}</span>
        <span class="search-dialog__result-snippet">${m.snippet}</span>
        <span class="search-dialog__result-meta">This page</span>
      </button>
    `).join('');

    // Feed results (links)
    html += feed.map(post => `
      <a href="${post.link}" target="_blank" rel="noopener" class="search-dialog__result">
        <span class="search-dialog__result-title">${highlightMatch(post.title, query)}</span>
        <span class="search-dialog__result-snippet">${getSnippet(post.text, query, 120)}</span>
        <span class="search-dialog__result-meta">${post.section} &mdash; ${post.date}</span>
      </a>
    `).join('');

    resultsEl.innerHTML = html;
    resultsEl.classList.add('search-dialog__results--open');

    // Bind local scroll clicks
    resultsEl.querySelectorAll('[data-local]').forEach(btn => {
      const idx = parseInt(btn.dataset.local, 10);
      btn.addEventListener('click', () => {
        const el = local[idx].el;
        document.querySelector('.search-dialog').classList.remove('search-dialog--open');
        document.body.style.overflow = '';
        input.value = '';
        clearResults();
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  /* --- Feed fetching --- */

  async function fetchBothFeeds() {
    const results = [];
    try {
      const [wordsRes, photosRes] = await Promise.all([
        fetch('/.netlify/functions/rss?source=api').then(r => r.json()),
        fetch('/.netlify/functions/rss?feed=photos&source=api').then(r => r.json())
      ]);

      if (wordsRes.status === 'ok') {
        wordsRes.items.forEach(item => {
          results.push({
            title: item.title,
            link: item.link,
            date: new Date(item.pubDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
            section: 'Words',
            text: stripHTML(item.content || item.description || '')
          });
        });
      }

      if (photosRes.status === 'ok') {
        photosRes.items.forEach(item => {
          results.push({
            title: item.title,
            link: item.link,
            date: new Date(item.pubDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
            section: 'Photos',
            text: stripHTML(item.content || item.description || '')
          });
        });
      }
    } catch (err) {
      console.error('Search feed fetch failed:', err);
    }
    return results;
  }

  // Uses shared stripHTML() from feed.js
}
