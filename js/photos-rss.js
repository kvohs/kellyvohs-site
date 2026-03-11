/* ==========================================================
   PHOTOGRAPHY FEED — kellyvohs.com
   Renders photo posts with lead image + expandable story.
   Depends on: feed.js
   ========================================================== */

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
  containerSelector: '.photo-posts',
  feedKey: 'photos',
  perPage: 12,
  fullCatalog: true,
  errorLink: 'https://vohs.substack.com',
  globalKey: '__photoPosts',

  mapItem(item) {
    return {
      title: item.title,
      slug: getSlug(item.link),
      link: item.link,
      date: new Date(item.pubDate).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      }),
      description: item.description || '',
      content: item.content || '',
      thumbnail: item.thumbnail || null
    };
  },

  placeholders: [
    { title: 'Still Moving No. 52', slug: 'still-moving-52', link: 'https://vohs.substack.com/p/still-moving-52', date: 'March 1, 2026', description: '', content: '', thumbnail: null },
    { title: 'Still Moving No. 51', slug: 'still-moving-51', link: 'https://vohs.substack.com/p/still-moving-51', date: 'February 22, 2026', description: '', content: '', thumbnail: null }
  ],

  createEntry(post) {
    const article = document.createElement('article');
    article.className = 'photo-post';

    const hasContent = post.content && post.content !== 'undefined';
    const leadImage = hasContent ? getLeadImage(post.content) : (post.thumbnail || null);
    const bodyContent = hasContent ? stripFirstImage(post.content) : '';

    article.innerHTML = `
      ${leadImage ? `<img class="photo-post__image" src="${leadImage}" alt="${post.title}" loading="lazy" />` : ''}
      <div class="photo-post__caption">
        <span class="photo-post__date">${post.date}</span>
        <span class="photo-post__sep">&mdash;</span>
        <span class="photo-post__title">${post.title}</span>
      </div>
      ${hasContent ? `
        <div class="photo-post__preview">${post.content}</div>
        <div class="photo-post__body">${bodyContent}</div>
      ` : ''}
    `;

    if (hasContent) {
      article.style.cursor = 'pointer';

      article.querySelector('.photo-post__preview').addEventListener('click', (e) => {
        e.preventDefault();
      });

      article.addEventListener('click', (e) => {
        if (article.classList.contains('photo-post--open') && e.target.closest('.photo-post__body a')) {
          const link = e.target.closest('.photo-post__body a');
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

    return article;
  }
});
