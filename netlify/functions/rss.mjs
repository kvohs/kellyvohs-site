// Netlify function — fetches Substack RSS and returns JSON.
// Supports ?feed=photos for vohs.substack.com, defaults to kellyvohs.substack.com

const FEEDS = {
  words: 'https://kellyvohs.substack.com/feed',
  photos: 'https://vohs.substack.com/feed'
};

export const handler = async (event) => {
  const feedKey = event.queryStringParameters?.feed || 'words';
  const FEED_URL = FEEDS[feedKey] || FEEDS.words;

  try {
    const res = await fetch(FEED_URL, {
      headers: { 'User-Agent': 'kellyvohs.com/1.0' }
    });

    if (!res.ok) throw new Error(`Feed returned ${res.status}`);

    const xml = await res.text();
    const items = parseItems(xml);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=900'
      },
      body: JSON.stringify({ status: 'ok', items })
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ status: 'error', message: err.message })
    };
  }
};

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
