/* share.mjs — the unlisted photo-share system at /share.

   Two commands:
     node scripts/share.mjs add <image> [image2 ...] [caption words...]
       — leading args that are files on disk are the images (one share
         page can hold several, e.g. two frames of the same person);
         everything after them is the caption. Resizes each image
         (2400px long edge, plus a 700px thumb of the first) into
         assets/images/share/, gives the set a short id, records it in
         data/share.json, and rebuilds the pages.
     node scripts/share.mjs build
       — regenerates share/<id>.html for every item plus the
         /share index (pages/share.html) from data/share.json.

   The pages are unlinked from the nav and carry noindex — anyone
   with a link can see them, but nothing points there. Each photo
   page is a dead end on purpose: the person you hand it to sees
   their photos, not everyone else's. */
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const SITE = 'https://kellyvohs.com';
const MANIFEST = 'data/share.json';
const IMG_DIR = 'assets/images/share';
const PAGE_DIR = 'share';
const LONG_EDGE = 2400;
const THUMB_EDGE = 700;

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function loadManifest() {
  try { return JSON.parse(await readFile(MANIFEST, 'utf8')); }
  catch { return { items: [] }; }
}

/* Short, unguessable-enough, never a person's name. */
function newId(taken) {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  for (;;) {
    let id = '';
    const bytes = randomBytes(4);
    for (const b of bytes) id += alphabet[b % alphabet.length];
    if (!taken.has(id)) return id;
  }
}

function sips(args) {
  return execFileSync('/usr/bin/sips', args, { encoding: 'utf8' });
}
function dimensions(path) {
  const out = sips(['-g', 'pixelWidth', '-g', 'pixelHeight', path]);
  const w = Number(out.match(/pixelWidth: (\d+)/)?.[1]);
  const h = Number(out.match(/pixelHeight: (\d+)/)?.[1]);
  if (!w || !h) throw new Error('could not read image dimensions: ' + path);
  return { w, h };
}
function resizeTo(src, dest, longEdge) {
  sips(['-s', 'format', 'jpeg', '-s', 'formatOptions', '82',
        '-Z', String(longEdge), src, '--out', dest]);
}

function dateLong(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US',
    { year: 'numeric', month: 'long', day: 'numeric' });
}

/* ---------- page templates ---------- */

const HEAD_COMMON =
  '<meta charset="UTF-8" />\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n' +
  '<meta name="robots" content="noindex, nofollow" />\n' +
  '<link rel="preconnect" href="https://fonts.googleapis.com" />\n' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n' +
  '<link href="https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />\n';

const STYLE_COMMON =
  'body{margin:0;background:#f3f3f0;color:#0a0a0a;font-family:\'Courier Prime\',\'Courier New\',monospace;}' +
  'a{color:inherit;}' +
  '.crumb{font-size:12px;letter-spacing:0.14em;text-transform:uppercase;text-decoration:none;color:#999;transition:color .2s ease;}' +
  '.crumb:hover{color:#0a0a0a;}';

function imgPath(item, n) { return `/assets/images/share/${item.id}-${n}.jpg`; }

function photoPage(item) {
  const title = item.caption ? esc(item.caption) : 'A photograph';
  const figures = item.images.map((im, i) => {
    const last = i === item.images.length - 1;
    const src = imgPath(item, i + 1);
    return `<figure class="frame">
  <img class="photo" src="${src}" alt="${title}" width="${im.w}" height="${im.h}" />
  <div class="under">
    <p class="caption">${last ? (item.caption ? esc(item.caption) + ' <span class="d">· ' : '<span class="d">') + dateLong(item.date) + '</span>' : ''}</p>
    <div class="acts">
      <a class="crumb" href="${src}" download="kelly-vohs-${item.id}-${i + 1}.jpg">Download</a>
      ${last ? '<a class="crumb" href="/">Kelly Vohs</a>' : ''}
    </div>
  </div>
</figure>`;
  }).join('\n');
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n' + HEAD_COMMON +
`<title>${title} — Kelly Vohs</title>
<meta property="og:type" content="article" />
<meta property="og:title" content="${title} — Kelly Vohs" />
<meta property="og:description" content="${item.images.length > 1 ? 'Photographs' : 'A photograph'} by Kelly Vohs." />
<meta property="og:url" content="${SITE}/share/${item.id}" />
<meta property="og:image" content="${SITE}${imgPath(item, 1)}" />
<meta property="og:image:width" content="${item.images[0].w}" />
<meta property="og:image:height" content="${item.images[0].h}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="${SITE}${imgPath(item, 1)}" />
<style>
${STYLE_COMMON}
.wrap{min-height:100svh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:44px;padding:28px 20px 48px;box-sizing:border-box;}
.frame{display:flex;flex-direction:column;max-width:100%;margin:0;}
.photo{max-width:min(1100px,100%);max-height:82svh;width:auto;height:auto;display:block;box-shadow:0 1px 30px rgba(10,10,10,0.10);}
.under{width:100%;display:flex;justify-content:space-between;align-items:baseline;gap:20px;margin-top:18px;flex-wrap:wrap;box-sizing:border-box;}
.caption{font-size:13px;color:#666;margin:0;}
.caption .d{color:#999;}
.acts{display:flex;gap:22px;white-space:nowrap;}
</style>
</head>
<body>
<div class="wrap">
${figures}
</div>
</body>
</html>
`;
}

function indexPage(items) {
  const cells = items.map(item => {
    const count = item.images.length > 1 ? ` · ×${item.images.length}` : '';
    return `<a class="cell" href="/share/${item.id}"><img src="/assets/images/share/${item.id}-1-thumb.jpg" alt="${esc(item.caption || item.id)}" loading="lazy" />` +
      `<span class="tag">${item.id}${item.caption ? ' · ' + esc(item.caption) : ''}${count}</span></a>`;
  }).join('\n');
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n' + HEAD_COMMON +
`<title>Share — Kelly Vohs</title>
<style>
${STYLE_COMMON}
.page{max-width:1200px;margin:0 auto;padding:40px 24px 80px;}
.head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:36px;}
.head h1{font-size:13px;letter-spacing:0.18em;text-transform:uppercase;font-weight:400;margin:0;color:#666;}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:22px;}
.cell{display:block;text-decoration:none;}
.cell img{width:100%;height:auto;display:block;transition:opacity .2s ease;}
.cell:hover img{opacity:0.85;}
.tag{display:block;margin-top:8px;font-size:11px;letter-spacing:0.08em;color:#999;}
.empty{font-size:13px;color:#999;}
</style>
</head>
<body>
<div class="page">
  <div class="head"><h1>Shared photographs</h1><a class="crumb" href="/">Kelly Vohs</a></div>
  ${items.length ? '<div class="grid">\n' + cells + '\n</div>' : '<p class="empty">Nothing here yet.</p>'}
</div>
</body>
</html>
`;
}

/* ---------- commands ---------- */

async function build() {
  const { items } = await loadManifest();
  await mkdir(PAGE_DIR, { recursive: true });
  for (const item of items) {
    await writeFile(`${PAGE_DIR}/${item.id}.html`, photoPage(item));
  }
  await writeFile('pages/share.html', indexPage(items));
  console.log(`built /share index + ${items.length} photo page(s)`);
}

async function add(args) {
  const srcs = [];
  while (args.length && existsSync(args[0])) srcs.push(args.shift());
  if (!srcs.length) throw new Error('usage: node scripts/share.mjs add <image> [image2 ...] [caption...]');
  const caption = args.join(' ').trim();
  const manifest = await loadManifest();
  const id = newId(new Set(manifest.items.map(i => i.id)));
  await mkdir(IMG_DIR, { recursive: true });
  const images = [];
  for (let i = 0; i < srcs.length; i++) {
    const dest = `${IMG_DIR}/${id}-${i + 1}.jpg`;
    resizeTo(srcs[i], dest, LONG_EDGE);
    if (i === 0) resizeTo(srcs[i], `${IMG_DIR}/${id}-1-thumb.jpg`, THUMB_EDGE);
    images.push(dimensions(dest));
  }
  const date = new Date().toISOString().slice(0, 10);
  manifest.items.unshift({ id, caption, date, images });
  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  await build();
  console.log(`added ${SITE}/share/${id} (${images.length} image${images.length > 1 ? 's' : ''})`);
}

const [, , cmd, ...rest] = process.argv;
if (cmd === 'add') await add(rest);
else if (cmd === 'build') await build();
else { console.error('usage: node scripts/share.mjs add <image> [image2 ...] [caption...] | build'); process.exit(1); }
