/* snapshot-letters.mjs — freeze every Sunday letter into data/letters.json.
   The site reads that owned copy first, so the archive does not depend on
   Substack's (unofficial) API at runtime. Run weekly by GitHub Actions, or
   by hand:  node scripts/snapshot-letters.mjs

   We pull through our own /api/rss proxy rather than Substack directly:
   Substack's Cloudflare 403s datacenter IPs (e.g. GitHub Actions), but our
   Vercel proxy reaches Substack fine and already paginates all posts.
   Captures full body HTML (image URLs included) and the audio URL per letter. */
import { writeFile, mkdir } from 'node:fs/promises';

const FEED = process.env.SNAPSHOT_FEED_URL || 'https://kellyvohs.com/api/rss?source=api';

const res = await fetch(FEED, { headers: { 'User-Agent': 'kellyvohs.com snapshot/1.0' } });
if (!res.ok) throw new Error(`Feed proxy ${res.status} at ${FEED}`);
const data = await res.json();
if (data.status !== 'ok' || !Array.isArray(data.items)) throw new Error('Feed proxy returned no items');

const items = data.items.map((it) => {
  let slug = '';
  try {
    const parts = new URL(it.link).pathname.split('/');
    slug = parts[parts.length - 1] || parts[parts.length - 2] || '';
  } catch { /* leave slug empty */ }
  return {
    title: it.title || '',
    slug,
    link: it.link || '',
    pubDate: it.pubDate || '',
    description: it.description || '',
    content: it.content || '',
    thumbnail: it.thumbnail || null,
    audioUrl: it.audioUrl || null
  };
});

if (items.length < 50) throw new Error(`Refusing to write a thin snapshot (${items.length} letters)`);

const withContent = items.filter((i) => i.content && i.content.length > 40).length;
const withAudio = items.filter((i) => i.audioUrl).length;

await mkdir('data', { recursive: true });
await writeFile(
  'data/letters.json',
  JSON.stringify({ status: 'ok', count: items.length, items }, null, 0) + '\n'
);

console.log(`Wrote data/letters.json — ${items.length} letters, ${withContent} with content, ${withAudio} with audio.`);
