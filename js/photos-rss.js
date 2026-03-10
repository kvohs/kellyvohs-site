/* ==========================================================
   PHOTOS RSS — kellyvohs.com
   Fetches and displays photo posts from vohs.substack.com.
   ========================================================== */

/**
 * Fetches photo posts from the RSS feed via our Netlify function.
 */
async function fetchPhotoPosts() {
  try {
    const response = await fetch('/.netlify/functions/rss?feed=photos');
    const data = await response.json();

    if (data.status === 'ok') {
      return data.items.map(item => {
        const slug = getPhotoSlug(item.link);
        return {
          title: item.title,
          slug: slug,
          link: item.link,
          date: new Date(item.pubDate).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
          }),
          description: item.description || '',
          content: item.content || '',
          thumbnail: item.thumbnail || null
        };
      });
    }

    throw new Error('Feed returned non-ok status');
  } catch (error) {
    console.error('Photos RSS fetch failed:', error);
    return null;
  }
}

function getPhotoSlug(url) {
  try {
    const parts = new URL(url).pathname.split('/');
    return parts[parts.length - 1] || parts[parts.length - 2];
  } catch { return ''; }
}

/**
 * Extracts the first <img> src from HTML content.
 */
function getLeadImage(html) {
  const match = html.match(/<img[^>]+src="([^"]+)"/i);
  return match ? match[1] : null;
}

/**
 * Strips all image containers and returns just the text content HTML.
 */
function getStoryText(html) {
  // Remove captioned-image-container divs (Substack image blocks)
  let cleaned = html.replace(/<div class="captioned-image-container">[\s\S]*?<\/figure><\/div>/gi, '');
  // Remove any remaining standalone images wrapped in links
  cleaned = cleaned.replace(/<a[^>]*class="image-link[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');
  // Remove subscription widgets
  cleaned = cleaned.replace(/<div class="subscription-widget-wrap[\s\S]*?<\/div>/gi, '');
  cleaned = cleaned.replace(/<div class="subscribe-widget[\s\S]*?<\/div>/gi, '');
  cleaned = cleaned.replace(/<div class="captioned-button-wrap[\s\S]*?<\/div>/gi, '');
  cleaned = cleaned.replace(/<div class="button-wrapper[\s\S]*?<\/div>/gi, '');
  // Remove empty paragraphs
  cleaned = cleaned.replace(/<p>\s*<\/p>/gi, '');
  return cleaned.trim();
}

/**
 * Renders photo posts: lead image + title, expandable story.
 */
async function renderPhotoPosts() {
  const container = document.querySelector('.photo-posts');
  if (!container) return;

  container.innerHTML = '<div class="loading">Loading...</div>';

  const posts = await fetchPhotoPosts();

  if (!posts) {
    container.innerHTML = `
      <div class="feed-error">
        <p class="feed-error__message">Unable to load posts</p>
        <a href="https://vohs.substack.com" target="_blank" rel="noopener" class="feed-error__link">
          View on Substack
        </a>
      </div>
    `;
    return;
  }

  container.innerHTML = '';

  posts.forEach(post => {
    const article = document.createElement('article');
    article.className = 'photo-post';

    const hasContent = post.content && post.content !== 'undefined';
    const leadImage = hasContent ? getLeadImage(post.content) : (post.thumbnail || null);
    const storyHTML = hasContent ? getStoryText(post.content) : '';

    article.innerHTML = `
      ${leadImage ? `<img class="photo-post__image" src="${leadImage}" alt="${post.title}" loading="lazy" />` : ''}
      <div class="photo-post__info">
        <h2 class="photo-post__title">${post.title}</h2>
        <span class="photo-post__date">${post.date}</span>
      </div>
      ${storyHTML ? `<div class="photo-post__story">${storyHTML}</div>` : ''}
    `;

    // Click to expand/collapse story
    if (storyHTML) {
      article.style.cursor = 'pointer';
      article.addEventListener('click', (e) => {
        // Allow text link clicks when expanded
        if (article.classList.contains('photo-post--open') && e.target.closest('.photo-post__story a')) {
          const link = e.target.closest('.photo-post__story a');
          if (link.querySelector('img')) {
            e.preventDefault();
            return;
          }
          return;
        }
        e.preventDefault();
        article.classList.toggle('photo-post--open');
      });
    }

    container.appendChild(article);
  });
}
