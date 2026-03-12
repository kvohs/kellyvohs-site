// Serverless function — fetches Substack posts and returns JSON.
// Uses Substack API with pagination to get ALL posts (RSS only returns ~20).
// Supports ?feed=photos for vohs.substack.com, defaults to kellyvohs.substack.com

const PUBLICATIONS = {
  words: 'https://kellyvohs.substack.com',
  photos: 'https://vohs.substack.com'
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=900'
};

export default async function handler(req, res) {
  const { feed = 'words', source = 'rss' } = req.query;
  const baseUrl = PUBLICATIONS[feed] || PUBLICATIONS.words;

  try {
    const items = source === 'api'
      ? await fetchAllPosts(baseUrl)
      : await fetchFromRSS(baseUrl + '/feed');

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=900');
    res.status(200).json({ status: 'ok', items });
  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(502).json({ status: 'error', message: err.message });
  }
}

/* --- Substack API (paginated, gets all posts) --- */

async function fetchAllPosts(baseUrl) {
  const items = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const url = `${baseUrl}/api/v1/posts?limit=${limit}&offset=${offset}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'kellyvohs.com/1.0' }
    });

    if (!response.ok) throw new Error(`API returned ${response.status}`);

    const posts = await response.json();
    if (!Array.isArray(posts) || posts.length === 0) break;

    for (const post of posts) {
      items.push({
        title: post.title || '',
        link: post.canonical_url || `${baseUrl}/p/${post.slug}`,
        pubDate: post.post_date || '',
        description: post.description || post.subtitle || '',
        content: post.body_html || post.truncated_body_html || '',
        thumbnail: post.cover_image || null,
        audioUrl: post.podcast_url || null
      });
    }

    if (posts.length < limit) break;
    offset += limit;
  }

  return items;
}

/* --- RSS fallback (only returns ~20 most recent) --- */

async function fetchFromRSS(feedUrl) {
  const response = await fetch(feedUrl, {
    headers: { 'User-Agent': 'kellyvohs.com/1.0' }
  });

  if (!response.ok) throw new Error(`Feed returned ${response.status}`);

  const xml = await response.text();
  return parseItems(xml);
}

function parseItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const encType = getEnclosureType(block);
    const isAudioEnclosure = encType && encType.startsWith('audio/');
    items.push({
      title: getTag(block, 'title'),
      link: getTag(block, 'link'),
      pubDate: getTag(block, 'pubDate'),
      description: getTag(block, 'description'),
      content: getTag(block, 'content:encoded'),
      thumbnail: getTag(block, 'media:content', 'url') || (isAudioEnclosure ? null : getEnclosureUrl(block)),
      audioUrl: isAudioEnclosure ? getEnclosureUrl(block) : null
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

function getEnclosureType(xml) {
  const m = xml.match(/<enclosure[^>]*type="([^"]*)"[^>]*>/i);
  return m ? m[1] : null;
}
