// Netlify function — fetches Substack posts and returns JSON.
// Uses Substack API with pagination to get ALL posts (RSS only returns ~20).
// Supports ?feed=photos for vohs.substack.com, defaults to kellyvohs.substack.com

const PUBLICATIONS = {
  words: 'https://kellyvohs.substack.com',
  photos: 'https://vohs.substack.com'
};

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=900'
};

export const handler = async (event) => {
  const feedKey = event.queryStringParameters?.feed || 'words';
  const source = event.queryStringParameters?.source || 'rss';
  const baseUrl = PUBLICATIONS[feedKey] || PUBLICATIONS.words;

  try {
    // source=api  → paginated API (all posts, no body — for search)
    // source=rss  → RSS feed (recent posts with full content — for page rendering)
    const items = source === 'api'
      ? await fetchAllPosts(baseUrl)
      : await fetchFromRSS(baseUrl + '/feed');

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ status: 'ok', items })
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: HEADERS,
      body: JSON.stringify({ status: 'error', message: err.message })
    };
  }
};

/* --- Substack API (paginated, gets all posts) --- */

async function fetchAllPosts(baseUrl) {
  const items = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const url = `${baseUrl}/api/v1/posts?limit=${limit}&offset=${offset}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'kellyvohs.com/1.0' }
    });

    if (!res.ok) throw new Error(`API returned ${res.status}`);

    const posts = await res.json();
    if (!Array.isArray(posts) || posts.length === 0) break;

    for (const post of posts) {
      items.push({
        title: post.title || '',
        link: post.canonical_url || `${baseUrl}/p/${post.slug}`,
        pubDate: post.post_date || '',
        description: post.description || post.subtitle || '',
        content: post.body_html || post.truncated_body_html || '',
        thumbnail: post.cover_image || null
      });
    }

    if (posts.length < limit) break;
    offset += limit;
  }

  return items;
}

/* --- RSS fallback (only returns ~20 most recent) --- */

async function fetchFromRSS(feedUrl) {
  const res = await fetch(feedUrl, {
    headers: { 'User-Agent': 'kellyvohs.com/1.0' }
  });

  if (!res.ok) throw new Error(`Feed returned ${res.status}`);

  const xml = await res.text();
  return parseItems(xml);
}

function parseItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    items.push({
      title: getTag(block, 'title'),
      link: getTag(block, 'link'),
      pubDate: getTag(block, 'pubDate'),
      description: getTag(block, 'description'),
      content: getTag(block, 'content:encoded'),
      thumbnail: getTag(block, 'media:content', 'url') || getEnclosureUrl(block)
    });
  }

  return items;
}

function getTag(xml, tag, attr) {
  if (attr) {
    const re = new RegExp(`<${tag}[^>]*?${attr}="([^"]*)"`, 'i');
    const m = xml.match(re);
    return m ? m[1] : null;
  }

  const cdataRe = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i');
  const cdataMatch = xml.match(cdataRe);
  if (cdataMatch) return cdataMatch[1].trim();

  const plainRe = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const plainMatch = xml.match(plainRe);
  return plainMatch ? plainMatch[1].trim() : '';
}

function getEnclosureUrl(xml) {
  const m = xml.match(/<enclosure[^>]*url="([^"]*)"[^>]*>/i);
  return m ? m[1] : null;
}
