/* ==========================================================
   PHOTOGRAPHY FEED — kellyvohs.com
   Master-detail layout with sidebar + reader panel.
   Depends on: feed.js
   ========================================================== */

const isDesktopPhotoReader = () => window.matchMedia('(min-width: 900px)').matches;
let photoReaderCurrentSlug = null;

/**
 * Extracts the first <img> src from HTML content.
 */
function getLeadImage(html) {
  const match = html.match(/<img[^>]+src="([^"]+)"/i);
  return match ? match[1] : null;
}

/**
 * Removes the first image container from content.
 */
function stripFirstImage(html) {
  return html.replace(/<div class="captioned-image-container">[\s\S]*?<\/figure><\/div>/i, '');
}

/**
 * Strips image containers and widgets, returns just text HTML.
 */
function getStoryText(html) {
  let cleaned = html;
  cleaned = cleaned.replace(/<div class="captioned-image-container">[\s\S]*?<\/figure><\/div>/gi, '');
  cleaned = cleaned.replace(/<a[^>]*class="image-link[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');
  cleaned = cleaned.replace(/<div class="subscription-widget-wrap[\s\S]*?<\/div>/gi, '');
  cleaned = cleaned.replace(/<div class="subscribe-widget[\s\S]*?<\/div>/gi, '');
  cleaned = cleaned.replace(/<div class="captioned-button-wrap[\s\S]*?<\/div>/gi, '');
  cleaned = cleaned.replace(/<div class="button-wrapper[\s\S]*?<\/div>/gi, '');
  cleaned = cleaned.replace(/<p>\s*<\/p>/gi, '');
  return cleaned.trim();
}

const renderPhotoPosts = createPaginatedFeed({
  containerSelector: '.photo-list',
  feedKey: 'photos',
  perPage: 12,
  fullCatalog: true,
  errorLink: 'https://vohs.substack.com',
  globalKey: '__photoPosts',

  mapItem(item, index, allItems) {
    const slug = getSlug(item.link);
    const hasContent = item.content && item.content !== 'undefined';
    const leadImage = hasContent ? getLeadImage(item.content) : (item.thumbnail || null);

    // Cache first post to localStorage for instant desktop loading
    if (index === 0) {
      try {
        localStorage.setItem('__photoFirstPost', JSON.stringify({
          title: item.title,
          slug,
          content: item.content || '',
          leadImage: leadImage || null
        }));
      } catch (e) { /* storage full */ }
    }

    return {
      title: item.title,
      slug,
      link: item.link,
      number: allItems.length - index,
      date: new Date(item.pubDate).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      }),
      description: item.description || '',
      content: item.content || '',
      leadImage,
      thumbnail: item.thumbnail || null
    };
  },

  placeholders: [
    { title: 'Still Moving No. 52', slug: 'still-moving-52', link: 'https://vohs.substack.com/p/still-moving-52', number: 52, date: 'March 1, 2026', description: '', content: '', thumbnail: null },
    { title: 'Still Moving No. 51', slug: 'still-moving-51', link: 'https://vohs.substack.com/p/still-moving-51', number: 51, date: 'February 22, 2026', description: '', content: '', thumbnail: null }
  ],

  createEntry(post) {
    const article = document.createElement('article');
    article.className = 'photo-entry';
    article._postData = post;

    const hasContent = post.content && post.content !== 'undefined';
    const bodyContent = hasContent ? stripFirstImage(post.content) : '';

    article.innerHTML = `
      <header class="photo-entry__header">
        <div class="photo-entry__line">
          <span class="photo-entry__number">${post.number || ''}</span>
          <h2 class="photo-entry__title">${post.title}</h2>
        </div>
      </header>
      ${hasContent ? `<div class="photo-entry__body">${post.leadImage ? `<div class="photo-entry__hero"><img class="photo-entry__hero-img" src="${post.leadImage}" alt="${post.title}" /></div>` : ''}${bodyContent}</div>` : ''}
    `;

    if (hasContent) {
      article.style.cursor = 'pointer';

      article.addEventListener('click', (e) => {
        if (isDesktopPhotoReader()) {
          // Desktop: load content into reader panel
          e.preventDefault();
          loadPhotoIntoReader(article, post);
        } else {
          // Mobile: accordion toggle
          if (article.classList.contains('photo-entry--open') && e.target.closest('.photo-entry__body a')) {
            const link = e.target.closest('.photo-entry__body a');
            if (link.querySelector('img')) {
              e.preventDefault();
              return;
            }
            return;
          }
          e.preventDefault();
          article.classList.toggle('photo-entry--open');
        }
      });
    }

    return article;
  }
});

/* --- Desktop reader panel --- */

function loadPhotoIntoReader(article, post, typeTitle = false) {
  const reader = document.getElementById('photoReaderPanel');
  if (!reader) return;

  // Same post already loaded — skip
  if (post.slug === photoReaderCurrentSlug) return;

  photoReaderCurrentSlug = post.slug;

  // Ensure reader panel is visible
  const layout = document.querySelector('.photo-layout');
  if (layout && !layout.classList.contains('photo-layout--reading')) {
    layout.classList.add('photo-layout--reading');
  }

  const hasContent = post.content && post.content !== 'undefined';
  const leadImage = post.leadImage || (hasContent ? getLeadImage(post.content) : null);
  const bodyHTML = article ? (article.querySelector('.photo-entry__body')?.innerHTML || '') : (hasContent ? stripFirstImage(post.content) : '');

  const enterClass = typeTitle ? ' photo-reader__content--entering' : '';

  reader.innerHTML = `
    ${leadImage ? `<div class="photo-reader__hero"><img class="photo-reader__image" src="${leadImage}" alt="${post.title}" /></div>` : ''}
    <h2 class="photo-reader__title${typeTitle ? ' photo-reader__title--typing' : ''}">${typeTitle ? '' : post.title}</h2>
    <div class="photo-reader__content${enterClass}">${bodyHTML}</div>
  `;
  reader.scrollTop = 0;

  // Typewriter effect + delayed content fade (first load only)
  if (typeTitle) {
    const titleEl = reader.querySelector('.photo-reader__title');
    const contentEl = reader.querySelector('.photo-reader__content');
    const word = post.title;
    let ti = 0;
    const tDelay = 500;
    const tSpeed = 65;

    setTimeout(() => {
      const typeChar = () => {
        if (ti < word.length) {
          titleEl.textContent += word[ti];
          ti++;
          setTimeout(typeChar, tSpeed);
        } else {
          setTimeout(() => titleEl.classList.add('typing-done'), 800);
        }
      };
      typeChar();
    }, tDelay);

    // Fade in content after title starts typing
    setTimeout(() => {
      if (contentEl) contentEl.classList.remove('photo-reader__content--entering');
    }, tDelay + 400);
  }

  // Update active state in list
  document.querySelectorAll('.photo-entry--active').forEach(activeEl =>
    activeEl.classList.remove('photo-entry--active')
  );
  if (article) article.classList.add('photo-entry--active');
}

// Load cached first post instantly (before feed loads)
function loadCachedFirstPhoto() {
  if (!isDesktopPhotoReader()) return;
  try {
    const cached = localStorage.getItem('__photoFirstPost');
    if (!cached) return;
    const post = JSON.parse(cached);
    if (!post || !post.title) return;
    loadPhotoIntoReader(null, post, true);
  } catch (e) { /* bad cache — ignore */ }
}

// After feed loads, sync sidebar or load first post if no cache
function autoLoadFirstPhoto() {
  if (!isDesktopPhotoReader()) return;

  const layout = document.querySelector('.photo-layout');
  if (layout) layout.classList.add('photo-layout--reading');

  const first = document.querySelector('.photo-entry');
  if (!first || !first._postData) return;

  // If reader already loaded this post from cache, just mark sidebar active
  if (photoReaderCurrentSlug === first._postData.slug) {
    first.classList.add('photo-entry--active');
    return;
  }

  // No cache or stale cache — load the first post
  const useTypewriter = photoReaderCurrentSlug === null;
  loadPhotoIntoReader(first, first._postData, useTypewriter);
}
