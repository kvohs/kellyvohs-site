/* generate-posts.mjs — bake a real page per Sunday letter at /p/<slug>.
   Reads data/letters.json (produced by snapshot-letters.mjs — NOT modified
   here) and writes p/<slug>.html for every letter, plus sitemap.xml. The
   pages carry their own <title>, meta, and Open Graph / Twitter tags in the
   served HTML, so they unfurl in Slack / LinkedIn / iMessage and are
   crawlable. Run after the snapshot:  node scripts/generate-posts.mjs
   The weekly GitHub Action runs this so new letters get pages automatically. */
import { writeFile, mkdir, readFile, rm } from 'node:fs/promises';

const SITE = 'https://kellyvohs.com';
const FALLBACK_OG = SITE + '/assets/images/hero/hero.jpg';

const data = JSON.parse(await readFile('data/letters.json', 'utf8'));
const items = data.items || [];
if (items.length < 50) throw new Error(`Refusing to generate from a thin feed (${items.length})`);

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function plain(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?(p|div|li|h[1-6]|blockquote)[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#8217;|&#8216;/g, "'").replace(/&#8220;|&#8221;/g, '"')
    .replace(/&amp;/g, '&').replace(/&#8230;|&hellip;/g, '...').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
function dateLong(d) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
function descOf(item) {
  if (item.description && item.description.trim()) return item.description.trim();
  const t = plain(item.content);
  if (t.length <= 155) return t;
  const cut = t.lastIndexOf(' ', 155);
  return t.slice(0, cut > 80 ? cut : 155) + '…';
}
// Substack ships native videos as empty placeholders — turn them into a link.
function bodyHtml(item) {
  return String(item.content || '').replace(
    /<div class="native-video-embed"[^>]*><\/div>/g,
    '<a class="video-link" href="' + esc(item.link) + '" target="_blank" rel="noopener">&#9654;&ensp;Watch the video on Substack &rarr;</a>'
  );
}

const NAV =
  '<header class="bar" id="bar">' +
    '<div class="bar__row">' +
      '<a class="bar__home" href="/">KELLYVOHS</a>' +
      '<nav class="bar__links">' +
        '<span class="bar__search" id="barSearch">' +
          '<input class="bar__searchinput" id="barSearchInput" type="text" placeholder="find a letter&hellip;" aria-label="Find a letter" />' +
          '<button class="bar__mag" aria-label="Search the letters"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><circle cx="7" cy="7" r="4.5"></circle><line x1="10.4" y1="10.4" x2="14" y2="14"></line></svg></button>' +
        '</span>' +
        '<a class="bar__link" href="/">Photos</a>' +
        '<a class="bar__link bar__link--here" href="/sundays">Sundays</a>' +
        '<button class="bar__link" data-search>Catalog</button>' +
        '<a class="bar__link" href="/made">Made</a>' +
        '<button class="bar__link" data-subscribe>Subscribe</button>' +
      '</nav>' +
    '</div>' +
  '</header>' +
  '<nav class="thumb">' +
    '<button class="thumb__search" data-search><span class="thumb__caret"></span>type to find a letter&hellip;</button>' +
    '<button class="thumb__more" data-more aria-label="Menu"><i></i><i></i><i></i></button>' +
  '</nav>';

const FOOT =
  '<footer class="foot">' +
    '<p><a href="/">PHOTOS</a> · <a href="/sundays">SUNDAYS</a> · <a href="/made">MADE</a></p>' +
    '<p>NOTHING DIGITAL SURVIVES A CENTURY. THESE ARE TYPED ANYWAY.</p>' +
    '<p><a href="https://kellyvohs.substack.com">SUBSTACK</a> · <a href="mailto:hello@kellyvohs.com">SAY HELLO</a></p>' +
  '</footer>';

const STYLE =
  '<style>' +
  '.post-listen{margin-top:18px;}' +
  '.post-listen button{font-family:var(--mono);font-size:12px;letter-spacing:0.08em;color:var(--muted);background:none;border:none;cursor:pointer;padding:0;transition:color .2s ease;}' +
  '.post-listen button:hover,.post-listen.is-playing button{color:var(--accent);}' +
  '.post-listen .t{margin-left:12px;font-size:11px;color:var(--faint);}' +
  '.letter__wordcount{margin-top:40px;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:var(--faint);}' +
  '.pnav{max-width:816px;margin:28px auto 0;padding:0 8px;display:flex;justify-content:space-between;align-items:baseline;gap:20px;}' +
  '.pnav a{font-family:var(--mono);font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:var(--muted);text-decoration:none;max-width:42%;line-height:1.6;transition:color .2s ease;}' +
  '.pnav a:hover{color:var(--accent);}' +
  '.pnav .next{text-align:right;}' +
  '.pback{max-width:816px;margin:34px auto 0;padding:0 8px;text-align:center;}' +
  '.pback a{font-family:var(--mono);font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:var(--faint);text-decoration:none;transition:color .2s ease;}' +
  '.pback a:hover{color:var(--accent);}' +
  '.subsheet{margin-top:120px;}' +
  '.subsheet .sheet{padding-top:72px;padding-bottom:72px;text-align:center;}' +
  '.subscribe__pitch{font-style:italic;font-size:17px;margin-bottom:20px;}' +
  '.subscribe__btn{font-family:var(--mono);font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:var(--paper);background:var(--fg);border:none;padding:11px 22px;cursor:pointer;}' +
  '.subscribe__meta{font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:var(--faint);margin-top:14px;}' +
  '@media (max-width:760px){.pnav{padding:0 26px;}.pback{padding:0 26px;}}' +
  '</style>';

function page(item, i) {
  const N = items.length;
  const no = N - i;
  const slug = item.slug;
  const url = SITE + '/p/' + slug;
  const title = item.title || 'Untitled';
  const desc = descOf(item);
  const ogimg = item.thumbnail || FALLBACK_OG;
  const words = plain(item.content).split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.round(words / 220));
  const older = items[i + 1];   // higher index = older
  const newer = items[i - 1];

  const out = [];
  out.push('<!DOCTYPE html>');
  out.push('<html lang="en">');
  out.push('<head>');
  out.push('<meta charset="UTF-8" />');
  out.push('<meta name="viewport" content="width=device-width, initial-scale=1.0" />');
  out.push('<title>' + esc(title) + ' — Kelly Vohs</title>');
  out.push('<meta name="description" content="' + esc(desc) + '" />');
  out.push('<link rel="canonical" href="' + url + '" />');
  out.push('<meta property="og:type" content="article" />');
  out.push('<meta property="og:site_name" content="Kelly Vohs" />');
  out.push('<meta property="og:title" content="' + esc(title) + '" />');
  out.push('<meta property="og:description" content="' + esc(desc) + '" />');
  out.push('<meta property="og:url" content="' + url + '" />');
  out.push('<meta property="og:image" content="' + esc(ogimg) + '" />');
  out.push('<meta property="article:published_time" content="' + esc(item.pubDate) + '" />');
  out.push('<meta name="twitter:card" content="summary_large_image" />');
  out.push('<meta name="twitter:title" content="' + esc(title) + '" />');
  out.push('<meta name="twitter:description" content="' + esc(desc) + '" />');
  out.push('<meta name="twitter:image" content="' + esc(ogimg) + '" />');
  out.push('<link rel="preconnect" href="https://fonts.googleapis.com" />');
  out.push('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />');
  out.push('<link href="https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />');
  out.push('<link rel="stylesheet" href="/styles/archive.css?v=11" />');
  out.push(STYLE);
  out.push('</head>');
  out.push('<body>');
  out.push('<div class="carriage" id="carriage"></div>');
  out.push(NAV);
  out.push('<div class="desk">');
  out.push('<article class="sheet">');
  out.push('<p class="dateline">Sunday Letter — <span class="no">No. ' + no + '</span> — ' + esc(dateLong(item.pubDate)) + '</p>');
  out.push('<h1 class="typedtitle">' + esc(title) + '</h1>');
  if (item.audioUrl) {
    out.push('<div class="post-listen" id="listen" data-src="' + esc(item.audioUrl) + '">' +
      '<button type="button" id="listenBtn">&#9654; LISTEN</button><span class="t" id="listenT"></span></div>');
  }
  out.push('<div class="typedbody">' + bodyHtml(item) + '</div>');
  out.push('<p class="letter__wordcount">No. ' + no + ' — ' + words + ' words — about ' + mins + ' min</p>');
  out.push('</article>');
  out.push('<nav class="pnav">');
  out.push(older
    ? '<a href="/p/' + esc(older.slug) + '">&larr; No. ' + (no - 1) + '<br />' + esc((older.title || '').toUpperCase()) + '</a>'
    : '<span></span>');
  out.push(newer
    ? '<a class="next" href="/p/' + esc(newer.slug) + '">No. ' + (no + 1) + ' &rarr;<br />' + esc((newer.title || '').toUpperCase()) + '</a>'
    : '<span></span>');
  out.push('</nav>');
  out.push('<p class="pback"><a href="/sundays">&larr; All the letters</a></p>');
  out.push('<section class="subsheet"><div class="sheet">' +
    '<p class="subscribe__pitch">Sunday letters about getting better.</p>' +
    '<button class="subscribe__btn" data-subscribe>Subscribe</button>' +
    '<p class="subscribe__meta">Once a week — unsubscribe anytime</p>' +
    '</div></section>');
  out.push(FOOT);
  out.push('</div>');
  out.push('<script>(function(){function s(){var h=document.documentElement,m=h.scrollHeight-h.clientHeight;document.getElementById("carriage").style.width=(m>0?(h.scrollTop/m)*100:0)+"%";document.getElementById("bar").classList.toggle("bar--scrolled",window.scrollY>20);}window.addEventListener("scroll",s,{passive:true});s();' +
    'var L=document.getElementById("listen");if(L){var a=null,b=document.getElementById("listenBtn"),t=document.getElementById("listenT");function fmt(x){if(!x||!isFinite(x))return"";var m=Math.floor(x/60),s=Math.floor(x%60);return m+":"+(s<10?"0":"")+s;}b.addEventListener("click",function(){if(!a){a=new Audio(L.dataset.src);a.addEventListener("timeupdate",function(){t.textContent="-"+fmt(a.duration-a.currentTime);});a.addEventListener("ended",function(){L.classList.remove("is-playing");b.innerHTML="&#9654; LISTEN";});}if(a.paused){a.play();L.classList.add("is-playing");b.innerHTML="&#9646;&#9646;";}else{a.pause();L.classList.remove("is-playing");b.innerHTML="&#9654;";}});}})();</scr' + 'ipt>');
  out.push('<script src="/js/archive-menu.js?v=2"></scr' + 'ipt>');
  out.push('<script src="/js/archive-subscribe.js?v=5"></scr' + 'ipt>');
  out.push('</body>');
  out.push('</html>');
  return out.join('\n');
}

// ── write pages ───────────────────────────────────────────────────────────
await rm('p', { recursive: true, force: true });
await mkdir('p', { recursive: true });
let n = 0;
for (let i = 0; i < items.length; i++) {
  if (!items[i].slug) continue;
  await writeFile('p/' + items[i].slug + '.html', page(items[i], i));
  n++;
}

// ── sitemap ─────────────────────────────────────────────────────────────────
const today = new Date(data.items[0]?.pubDate || Date.now()).toISOString().slice(0, 10);
const routes = ['/', '/sundays', '/made', '/photography', '/type', '/coffee', '/resume'];
const urls = [];
for (const r of routes) urls.push('  <url><loc>' + SITE + r + '</loc></url>');
for (const it of items) {
  if (!it.slug) continue;
  urls.push('  <url><loc>' + SITE + '/p/' + it.slug + '</loc><lastmod>' +
    new Date(it.pubDate).toISOString().slice(0, 10) + '</lastmod></url>');
}
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.join('\n') + '\n</urlset>\n';
await writeFile('sitemap.xml', sitemap);

console.log('Generated ' + n + ' /p pages + sitemap.xml (' + (routes.length + n) + ' urls). Snapshot date ' + today + '.');
