/* share.mjs — the unlisted photo-share system at /share.

   Two commands:
     node scripts/share.mjs add [--loc "SOHO, NYC"] [--gps lat,lon] <image> [image2 ...] [caption words...]
       — leading args that are files on disk are the images (one share
         page can hold several, e.g. two frames of the same person);
         everything after them is the caption (stored, shown on the
         index only). EXIF (focal / aperture / shutter / ISO) is read
         from each file via mdls; --gps computes the MGRS printed in
         the caption line, home-page style. Resizes each image (2400px
         long edge, plus a 700px thumb of the first) into
         assets/images/share/, gives the set a short id, records it in
         data/share.json, and rebuilds the pages.
     node scripts/share.mjs build
       — regenerates share/<id>.html for every item plus the
         /share index (pages/share.html) from data/share.json.

   The photo pages use the same framed-print treatment as the home
   page (.print--framed from styles/archive.css): white mat, typed
   label inside the mat — location · MGRS, then frame · exif, then a
   DOWNLOAD line. Pages are unlinked from the nav and carry noindex —
   anyone with a link can see them, but nothing points there. Each
   photo page is a dead end on purpose: the person you hand it to
   sees their photos, not everyone else's. */
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, extname } from 'node:path';
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

/* EXIF straight from the file's Spotlight metadata — values stay as
   the camera wrote them (source fidelity; render-side formatting only). */
function exifOf(path) {
  const out = execFileSync('/usr/bin/mdls', [
    '-name', 'kMDItemFocalLength', '-name', 'kMDItemFNumber',
    '-name', 'kMDItemExposureTimeSeconds', '-name', 'kMDItemISOSpeed', path,
  ], { encoding: 'utf8' });
  const num = (k) => {
    const m = out.match(new RegExp(k + '\\s*=\\s*([\\d.]+)'));
    return m ? Number(m[1]) : null;
  };
  const secs = num('kMDItemExposureTimeSeconds');
  return {
    frame: basename(path, extname(path)).toUpperCase(),
    focal: num('kMDItemFocalLength'),
    fnum: num('kMDItemFNumber'),
    shutter: secs ? (secs >= 1 ? String(secs) : '1/' + Math.round(1 / secs)) : null,
    iso: num('kMDItemISOSpeed'),
  };
}

/* WGS84 lat/lon → MGRS, same convention as the home-page labels
   (verified against MAUKATIA BAY = 60HTE7048720306). */
function mgrsOf(lat, lon) {
  const a = 6378137.0, f = 1 / 298.257223563, k0 = 0.9996;
  const e2 = f * (2 - f), ep2 = e2 / (1 - e2);
  const zone = Math.floor((lon + 180) / 6) + 1;
  const lam0 = ((zone - 1) * 6 - 180 + 3) * Math.PI / 180;
  const phi = lat * Math.PI / 180, lam = lon * Math.PI / 180;
  const sp = Math.sin(phi), cp = Math.cos(phi), tp = Math.tan(phi);
  const N = a / Math.sqrt(1 - e2 * sp * sp);
  const T = tp * tp, C = ep2 * cp * cp, A = cp * (lam - lam0);
  const M = a * ((1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 ** 3 / 256) * phi
    - (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2 ** 3 / 1024) * Math.sin(2 * phi)
    + (15 * e2 * e2 / 256 + 45 * e2 ** 3 / 1024) * Math.sin(4 * phi)
    - (35 * e2 ** 3 / 3072) * Math.sin(6 * phi));
  const x = k0 * N * (A + (1 - T + C) * A ** 3 / 6
    + (5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5 / 120) + 500000;
  const y = k0 * (M + N * tp * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A ** 4 / 24
    + (61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6 / 720));
  const band = 'CDEFGHJKLMNPQRSTUVWX'[Math.min(19, Math.floor((lat + 80) / 8))];
  const cols = ['ABCDEFGH', 'JKLMNPQR', 'STUVWXYZ'][(zone - 1) % 3];
  const col = cols[Math.floor(x / 100000) - 1];
  let r = Math.floor(y / 100000) % 20;
  if (zone % 2 === 0) r = (r + 5) % 20;
  const row = 'ABCDEFGHJKLMNPQRSTUV'[r];
  const pad = (v) => String(Math.floor(v % 100000)).padStart(5, '0');
  return `${zone}${band}${col}${row}${pad(x)}${pad(y)}`;
}

/* ---------- page templates ---------- */

const HEAD_COMMON =
  '<meta charset="UTF-8" />\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n' +
  '<meta name="robots" content="noindex, nofollow" />\n' +
  '<link rel="preconnect" href="https://fonts.googleapis.com" />\n' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n' +
  '<link href="https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />\n' +
  '<link rel="stylesheet" href="/styles/archive.css?v=14" />\n';

function imgPath(item, n) { return `/assets/images/share/${item.id}-${n}.jpg`; }

function exifLine(ex) {
  const bits = [`<span class="frame">${esc(ex.frame)}</span>`];
  if (ex.focal) bits.push(`${ex.focal}mm`);
  if (ex.fnum) bits.push(`f/${ex.fnum}`);
  if (ex.shutter) bits.push(esc(ex.shutter));
  if (ex.iso) bits.push(`ISO ${ex.iso}`);
  return bits.join(' &middot; ');
}

function photoPage(item) {
  const title = item.caption ? esc(item.caption) : 'A photograph';
  const locLabel = item.gps
    ? `<a class="geo" href="https://www.google.com/maps?q=${item.gps[0]},${item.gps[1]}" target="_blank" rel="noopener">${esc(item.loc)}</a>`
    : esc(item.loc || '');
  const locLine = item.loc ? locLabel + (item.mgrs ? ' &middot; ' + item.mgrs : '') : '';
  const figures = item.images.map((im, i) => {
    const src = imgPath(item, i + 1);
    return `<figure class="print print--framed">
  <img src="${src}" alt="${title}" width="${im.w}" height="${im.h}" />
  <figcaption>${locLine}<span class="exif">${exifLine(im)}</span><span class="dl"><a href="${src}" download="${esc(im.frame.toLowerCase())}.jpg">Download</a></span></figcaption>
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
  .wordmark{display:block;text-align:center;padding:34px 0 60px;font-family:var(--mono);font-size:14px;letter-spacing:0.32em;text-transform:uppercase;color:var(--ink,#0a0a0a);text-decoration:none;}
  .strip{padding-bottom:8px;}
  .strip .print{margin:0 auto 110px;}
  .print figcaption .dl{display:block;margin-top:12px;}
  .print figcaption .dl a{color:var(--muted);text-decoration:none;border-bottom:1px solid transparent;transition:color .2s ease,border-color .2s ease;}
  .print figcaption .dl a:hover{color:var(--accent);border-bottom-color:var(--accent);}
</style>
</head>
<body>
<a class="wordmark" href="/">Kelly Vohs</a>
<div class="strip">
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
  .page{max-width:1200px;margin:0 auto;padding:40px 24px 80px;font-family:var(--mono);}
  .head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:36px;}
  .head h1{font-size:13px;letter-spacing:0.18em;text-transform:uppercase;font-weight:400;margin:0;color:var(--muted);}
  .head a{font-size:12px;letter-spacing:0.14em;text-transform:uppercase;text-decoration:none;color:var(--faint);}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:22px;}
  .cell{display:block;text-decoration:none;}
  .cell img{width:100%;height:auto;display:block;transition:opacity .2s ease;}
  .cell:hover img{opacity:0.85;}
  .tag{display:block;margin-top:8px;font-size:11px;letter-spacing:0.08em;color:var(--faint);}
  .empty{font-size:13px;color:var(--faint);}
</style>
</head>
<body>
<div class="page">
  <div class="head"><h1>Shared photographs</h1><a href="/">Kelly Vohs</a></div>
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
  let loc = null, gps = null;
  for (let i = 0; i < args.length;) {
    if (args[i] === '--loc') { loc = args[i + 1]; args.splice(i, 2); }
    else if (args[i] === '--gps') {
      gps = args[i + 1].split(',').map(Number);
      if (gps.length !== 2 || gps.some(isNaN)) throw new Error('--gps expects lat,lon');
      args.splice(i, 2);
    } else i++;
  }
  const srcs = [];
  while (args.length && existsSync(args[0])) srcs.push(args.shift());
  if (!srcs.length) throw new Error('usage: node scripts/share.mjs add [--loc "SOHO, NYC"] [--gps lat,lon] <image> [image2 ...] [caption...]');
  const caption = args.join(' ').trim();
  const manifest = await loadManifest();
  const id = newId(new Set(manifest.items.map(i => i.id)));
  await mkdir(IMG_DIR, { recursive: true });
  const images = [];
  for (let i = 0; i < srcs.length; i++) {
    const dest = `${IMG_DIR}/${id}-${i + 1}.jpg`;
    resizeTo(srcs[i], dest, LONG_EDGE);
    if (i === 0) resizeTo(srcs[i], `${IMG_DIR}/${id}-1-thumb.jpg`, THUMB_EDGE);
    images.push({ ...dimensions(dest), ...exifOf(srcs[i]) });
  }
  const date = new Date().toISOString().slice(0, 10);
  const item = { id, caption, date, loc, gps, mgrs: gps ? mgrsOf(gps[0], gps[1]) : null, images };
  manifest.items.unshift(item);
  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  await build();
  console.log(`added ${SITE}/share/${id} (${images.length} image${images.length > 1 ? 's' : ''})`);
}

const [, , cmd, ...rest] = process.argv;
if (cmd === 'add') await add(rest);
else if (cmd === 'build') await build();
else { console.error('usage: node scripts/share.mjs add [--loc ...] [--gps lat,lon] <image> [image2 ...] [caption...] | build'); process.exit(1); }
