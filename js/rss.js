/* ==========================================================
   WRITING FEED — kellyvohs.com
   Renders writing posts with expand/collapse.
   Depends on: feed.js
   ========================================================== */

const renderPosts = createPaginatedFeed({
  containerSelector: '.post-list',
  feedKey: 'words',
  perPage: 20,
  fullCatalog: true,
  errorLink: 'https://kellyvohs.substack.com',
  globalKey: '__writingPosts',

  mapItem(item) {
    const slug = getSlug(item.link);

    // Cache full post for the reading page (try/catch for Safari quota limits)
    try {
      sessionStorage.setItem('post_' + slug, JSON.stringify({
        title: item.title,
        date: new Date(item.pubDate).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        }),
        content: item.content || '',
        link: item.link
      }));
    } catch (e) { /* storage full — skip caching */ }

    return {
      title: item.title,
      slug,
      link: item.link,
      date: new Date(item.pubDate).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      }),
      excerpt: item.description || stripHTML(item.content || '').slice(0, 200) + '...',
      content: item.content || '',
      image: item.thumbnail || null
    };
  },

  createEntry(post) {
    const article = document.createElement('article');
    article.className = 'post-entry';

    const hasContent = post.content && post.content !== 'undefined';

    article.innerHTML = `
      <header class="post-entry__header">
        <span class="post-entry__date">${post.date}</span>
        <h2 class="post-entry__title">${post.title}</h2>
      </header>
      ${hasContent ? `
        <div class="post-entry__preview">${post.content}</div>
        <div class="post-entry__body">${post.content}</div>
      ` : ''}
    `;

    if (hasContent) {
      article.style.cursor = 'pointer';

      article.querySelector('.post-entry__preview').addEventListener('click', (e) => {
        e.preventDefault();
      });

      article.addEventListener('click', (e) => {
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

    return article;
  },

  placeholders: [
    { title: 'Wake Zones', slug: 'wake-zones', link: 'https://kellyvohs.substack.com/p/wake-zones', date: 'March 8, 2026', excerpt: 'No. 190', image: null },
    { title: 'Lost Lesson', slug: 'lost-lesson', link: 'https://kellyvohs.substack.com/p/lost-lesson', date: 'January 25, 2026', excerpt: 'No. 189', image: null }
  ]
});
