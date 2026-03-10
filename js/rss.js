/* ==========================================================
   RSS FEED — kellyvohs.com
   Fetches and displays posts from Substack.
   Posts open on the site (post.html), not Substack.
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
 * Fetches posts from the RSS feed via our Netlify function.
 */
async function fetchPosts() {
  try {
    const response = await fetch('/.netlify/functions/rss');
    const data = await response.json();

    if (data.status === 'ok') {
      return data.items.map(item => {
        const slug = getSlug(item.link);
        const post = {
          title: item.title,
          slug: slug,
          link: item.link,
          date: new Date(item.pubDate).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
          }),
          excerpt: item.description || stripHTML(item.content || '').slice(0, 200) + '...',
          content: item.content || '',
          image: item.thumbnail || null
        };

        // Cache full post for the reading page
        sessionStorage.setItem('post_' + slug, JSON.stringify({
          title: post.title,
          date: post.date,
          content: post.content,
          link: post.link
        }));

        return post;
      });
    }

    throw new Error('Feed returned non-ok status');
  } catch (error) {
    console.error('RSS fetch failed (expected locally, works on Netlify):', error);
    return getPlaceholderPosts();
  }
}

/**
 * Placeholder posts for local preview.
 */
function getPlaceholderPosts() {
  return [
    {
      title: 'Wake Zones',
      slug: 'wake-zones',
      link: 'https://kellyvohs.substack.com/p/wake-zones',
      date: 'March 8, 2026',
      excerpt: 'No. 190',
      image: null
    },
    {
      title: 'Lost Lesson',
      slug: 'lost-lesson',
      link: 'https://kellyvohs.substack.com/p/lost-lesson',
      date: 'January 25, 2026',
      excerpt: 'No. 189',
      image: null
    },
    {
      title: 'What the Light Does',
      slug: 'what-the-light-does',
      link: 'https://kellyvohs.substack.com',
      date: 'January 2026',
      excerpt: 'On early mornings, the way a city empties, and how photographs hold time.',
      image: null
    },
    {
      title: 'On Editing',
      slug: 'on-editing',
      link: 'https://kellyvohs.substack.com',
      date: 'December 2025',
      excerpt: 'The hardest part of any creative practice is deciding what to leave out.',
      image: null
    },
    {
      title: 'A Year of Weeks',
      slug: 'a-year-of-weeks',
      link: 'https://kellyvohs.substack.com',
      date: 'November 2025',
      excerpt: 'What changes when you commit to a rhythm. What stays the same.',
      image: null
    }
  ];
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
 * Extracts first ~charLimit characters of plain text from HTML content,
 * ending at a word boundary.
 */
function getPreview(html, charLimit) {
  // Replace block/break tags with spaces before stripping
  const spaced = html.replace(/<br\s*\/?>/gi, ' ').replace(/<\/?(p|div|li|h[1-6])[^>]*>/gi, ' ');
  const text = stripHTML(spaced).replace(/\s+/g, ' ').trim();
  if (text.length <= charLimit) return text;
  const cut = text.lastIndexOf(' ', charLimit);
  return text.slice(0, cut > 0 ? cut : charLimit) + '...';
}

/**
 * Renders posts with excerpt preview and expandable full content.
 */
async function renderPosts() {
  const container = document.querySelector('.post-list');
  if (!container) return;

  container.innerHTML = '<div class="loading">Loading...</div>';

  const posts = await fetchPosts();

  if (!posts) {
    container.innerHTML = `
      <div class="feed-error">
        <p class="feed-error__message">Unable to load posts</p>
        <a href="https://kellyvohs.substack.com" target="_blank" rel="noopener" class="feed-error__link">
          Read on Substack
        </a>
      </div>
    `;
    return;
  }

  container.innerHTML = '';

  posts.forEach(post => {
    const article = document.createElement('article');
    article.className = 'post-entry';

    const hasContent = post.content && post.content !== 'undefined';

    // Extract first few lines of plain text as preview
    const previewText = hasContent ? getPreview(post.content, 200) : (post.excerpt || '');

    article.innerHTML = `
      <header class="post-entry__header">
        <span class="post-entry__date">${post.date}</span>
        <h2 class="post-entry__title">${post.title}</h2>
      </header>
      ${hasContent ? `
        <p class="post-entry__preview">${previewText}<span class="post-entry__arrow" role="button" aria-label="Expand post"> &#8599;</span></p>
        <div class="post-entry__body">${post.content}</div>
      ` : `
        <p class="post-entry__preview">${previewText}</p>
      `}
    `;

    // Toggle expand/collapse on arrow click
    const arrow = article.querySelector('.post-entry__arrow');
    if (arrow) {
      arrow.addEventListener('click', () => {
        const isOpen = article.classList.toggle('post-entry--open');
        arrow.innerHTML = isOpen ? ' &#8601;' : ' &#8599;';
      });
    }

    container.appendChild(article);
  });
}
