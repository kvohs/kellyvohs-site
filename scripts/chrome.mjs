/* chrome.mjs — THE site header + footer, in one place.

   This is the single source of truth for the bar (KELLY VOHS · Photos /
   Sundays / Catalog / Made / Subscribe), the mobile thumb bar, and the
   footer. Everything else derives from here at build time:
     - scripts/generate-posts.mjs   imports bar()/FOOT for the /p/* posts
     - scripts/build-chrome.mjs     stamps index/letters/made + writes sitebar.js

   Edit the markup HERE, then run:  npm run build
   (which runs build-chrome + generate-posts and commits the stamped output).

   bar(active): active is the room to mark --here — 'photos' | 'sundays' |
   'made' | null (legacy pages mark nothing). */

const MAG =
  '<button class="bar__mag" aria-label="Search the letters">' +
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">' +
  '<circle cx="7" cy="7" r="4.5"></circle><line x1="10.4" y1="10.4" x2="14" y2="14"></line></svg></button>';

export function bar(active) {
  const room = (href, label, key) =>
    '<a class="bar__link' + (active === key ? ' bar__link--here' : '') + '" href="' + href + '">' + label + '</a>';
  return '<header class="bar" id="bar">' +
      '<div class="bar__row">' +
        '<a class="bar__home" href="/">KELLY VOHS</a>' +
        '<nav class="bar__links">' +
          '<span class="bar__search" id="barSearch">' +
            '<input class="bar__searchinput" id="barSearchInput" type="text" placeholder="find" aria-label="Find" />' +
            MAG +
          '</span>' +
          room('/', 'Photos', 'photos') +
          room('/sundays', 'Sundays', 'sundays') +
          '<button class="bar__link" data-search>Catalog</button>' +
          room('/made', 'Made', 'made') +
          '<button class="bar__link" data-subscribe>Subscribe</button>' +
        '</nav>' +
      '</div>' +
    '</header>' +
    '<nav class="thumb">' +
      '<button class="thumb__search" data-search><span class="thumb__caret"></span>find</button>' +
      '<button class="thumb__more" data-more aria-label="Menu"><i></i><i></i><i></i></button>' +
    '</nav>';
}

export const FOOT =
  '<footer class="foot">' +
    '<p><a href="/">PHOTOS</a> · <a href="/sundays">SUNDAYS</a> · <a href="/made">MADE</a></p>' +
  '</footer>';
