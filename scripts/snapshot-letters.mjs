/* snapshot-letters.mjs — freeze every Sunday letter into data/letters.json.
   The site reads that owned copy first, so the archive does not depend on
   Substack's (unofficial) API at runtime. Run weekly by GitHub Actions, or
   by hand:  node scripts/snapshot-letters.mjs
   Captures full body HTML (image URLs included) and the audio URL per letter. */
import { writeFile, mkdir } from 'node:fs/promises';

const BASE = 'https://kellyvohs.substack.com';
const UA = 'kellyvohs.com snapshot/1.0';

function extractAudioFromHTML(html) {
  if (!html) return null;
  const a = html.match(/<audio[^>]*\bsrc="([^"]*)"[^>]*>/i);
  if (a) return a[1];
  const s = html.match(/<source[^>]*\bsrc="([^"]*(?:\.mp3|\.m4a|\.ogg|\.wav)[^"]*)"[^>]*>/i);
  if (s) return s[1];
  const m = html.match(/https:\/\/[^"'\s]*?\.(?:mp3|m4a|ogg|wav)(?:\?[^"'\s]*)?/i);
  return m ? m[0] : null;
}

async function fetchAll() {
  const items = [];
  let offset = 0;
  const limit = 50;
  for (;;) {
    const url = `${BASE}/api/v1/posts?limit=${limit}&offset=${offset}`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`Substack API ${res.status} at offset ${offset}`);
    const posts = await res.json();
    if (!Array.isArray(posts) || posts.length === 0) break;
    for (const p of posts) {
      const content = p.body_html || p.truncated_body_html || '';
      items.push({
        title: p.title || '',
        slug: p.slug || '',
        link: p.canonical_url || `${BASE}/p/${p.slug}`,
        pubDate: p.post_date || '',
        description: p.description || p.subtitle || '',
        content,
        thumbnail: p.cover_image || null,
        audioUrl:
          p.podcast_url ||
          (p.voiceover_upload_id
            ? `https://api.substack.com/api/v1/audio/upload/${p.voiceover_upload_id}/src`
            : null) ||
          extractAudioFromHTML(content) ||
          null
      });
    }
    if (posts.length < limit) break;
    offset += limit;
  }
  return items;
}

const items = await fetchAll();
if (items.length < 50) throw new Error(`Refusing to write a thin snapshot (${items.length} letters)`);

const withContent = items.filter((i) => i.content && i.content.length > 40).length;
const withAudio = items.filter((i) => i.audioUrl).length;

await mkdir('data', { recursive: true });
await writeFile(
  'data/letters.json',
  JSON.stringify({ status: 'ok', count: items.length, items }, null, 0) + '\n'
);

console.log(`Wrote data/letters.json — ${items.length} letters, ${withContent} with content, ${withAudio} with audio.`);
