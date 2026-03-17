/* ==========================================================
   FEED UTILITIES — kellyvohs.com
   Shared helpers for fetching and paginating Substack posts.
   ========================================================== */

/**
 * Extract slug from a Substack URL.
 */
function getSlug(url) {
  try {
    const parts = new URL(url).pathname.split('/');
    return parts[parts.length - 1] || parts[parts.length - 2];
  } catch { return ''; }
}

/**
 * Strips HTML tags from a string.
 */
function stripHTML(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

/**
 * Extracts first ~charLimit characters of plain text from HTML,
 * ending at a word boundary.
 */
function getPreview(html, charLimit) {
  const spaced = html.replace(/<br\s*\/?>/gi, ' ').replace(/<\/?(p|div|li|h[1-6])[^>]*>/gi, ' ');
  const text = stripHTML(spaced).replace(/\s+/g, ' ').trim();
  if (text.length <= charLimit) return text;
  const cut = text.lastIndexOf(' ', charLimit);
  return text.slice(0, cut > 0 ? cut : charLimit) + '...';
}

/**
 * Fetches posts from the RSS serverless function.
 * @param {string} feedKey - 'words' (default) or 'photos'
 * @returns {Promise<Array|null>}
 */
async function fetchFeed(feedKey) {
  const param = feedKey === 'photos' ? '?feed=photos' : '';
  try {
    const res = await fetch('/api/rss' + param);
    const data = await res.json();
    if (data.status === 'ok') return data.items;
    throw new Error('Feed returned non-ok status');
  } catch (err) {
    console.error(`Feed fetch failed (${feedKey}):`, err);
    // Local dev fallback — try static JSON
    return fetchLocalFeed(feedKey);
  }
}

async function fetchLocalFeed(feedKey) {
  const file = feedKey === 'photos' ? '/data/photos.json' : '/data/posts.json';
  try {
    const res = await fetch(file);
    const data = await res.json();
    if (data.status === 'ok') return data.items;
  } catch (e) {
    console.error('Local feed fallback failed:', e);
  }
  return null;
}

/**
 * Fetches the full catalog: RSS items (with content) merged with
 * API items (all posts, title/date only for older ones).
 * RSS posts keep their full content; API fills in the rest.
 */
async function fetchFullFeed(feedKey) {
  const feedParam = feedKey === 'photos' ? 'feed=photos&' : '';

  let rssItems, apiItems;
  try {
    [rssItems, apiItems] = await Promise.all([
      fetchFeed(feedKey),
      fetch('/api/rss?' + feedParam + 'source=api')
        .then(r => r.json())
        .then(d => d.status === 'ok' ? d.items : [])
        .catch(() => [])
    ]);
  } catch {
    rssItems = null;
    apiItems = [];
  }

  // If both failed, the local fallback in fetchFeed already has all posts
  // (the API data is the same as local JSON), so just use rssItems
  if (!rssItems && !apiItems.length) return null;

  // Index API items by slug for fast lookup
  const apiMap = new Map();
  apiItems.forEach(item => {
    apiMap.set(getSlug(item.link), item);
  });

  // Merge: prefer RSS version (has content), fall back to API version.
  // Enrich RSS items with audioUrl from API when missing (audio added after publish).
  const seen = new Set();
  const merged = [];

  // RSS items first (they have content)
  (rssItems || []).forEach(item => {
    const slug = getSlug(item.link);
    seen.add(slug);

    // Enrich RSS item with API data when missing
    const apiItem = apiMap.get(slug);
    if (apiItem) {
      if (!item.audioUrl && apiItem.audioUrl) {
        item.audioUrl = apiItem.audioUrl;
      }
      if (!item.content && apiItem.content) {
        item.content = apiItem.content;
      }
    }

    merged.push(item);
  });

  // API items that weren't in RSS
  apiItems.forEach(item => {
    const slug = getSlug(item.link);
    if (!seen.has(slug)) {
      seen.add(slug);
      merged.push(item);
    }
  });

  return merged;
}

/**
 * Creates a paginated feed renderer.
 *
 * @param {Object} config
 * @param {string}   config.containerSelector - CSS selector for the post list
 * @param {string}   config.feedKey           - 'words' or 'photos'
 * @param {number}   config.perPage           - posts per batch
 * @param {string}   config.errorLink         - fallback Substack URL
 * @param {string}   config.globalKey         - window key to expose posts (e.g. '__writingPosts')
 * @param {Function} config.mapItem           - transforms a raw feed item into a post object
 * @param {Function} config.createEntry       - builds a DOM element for a single post
 * @param {Array}    [config.placeholders]    - fallback posts for local dev
 * @param {boolean}  [config.fullCatalog]     - if true, merge RSS + API for all posts
 */
function createPaginatedFeed(config) {
  let allPosts = [];
  let shown = 0;

  async function render() {
    const container = document.querySelector(config.containerSelector);
    if (!container) return;

    container.innerHTML = '<div class="loading">Loading...</div>';

    const raw = config.fullCatalog
      ? await fetchFullFeed(config.feedKey)
      : await fetchFeed(config.feedKey);

    if (!raw) {
      if (config.placeholders) {
        // Local dev — render placeholders
        container.innerHTML = '';
        allPosts = config.placeholders;
        shown = 0;
        window[config.globalKey] = allPosts;
        renderBatch(container);
        return;
      }

      container.innerHTML = `
        <div class="feed-error">
          <p class="feed-error__message">Unable to load posts</p>
          <a href="${config.errorLink}" target="_blank" rel="noopener" class="feed-error__link">
            View on Substack
          </a>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    allPosts = raw.map(config.mapItem);
    shown = 0;
    window[config.globalKey] = allPosts;

    renderBatch(container);
  }

  function renderBatch(container) {
    const end = Math.min(shown + config.perPage, allPosts.length);

    for (let i = shown; i < end; i++) {
      container.appendChild(config.createEntry(allPosts[i]));
    }

    shown = end;

    // Remove old "More" button
    const old = container.parentElement.querySelector('.load-more');
    if (old) old.remove();

    // Add new one if needed
    if (shown < allPosts.length) {
      const btn = document.createElement('button');
      btn.className = 'load-more';
      btn.textContent = 'More';
      btn.addEventListener('click', () => renderBatch(container));
      container.parentElement.appendChild(btn);
    }
  }

  return render;
}
