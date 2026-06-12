/* ==========================================================
   SUBSCRIBE — kellyvohs.com
   Header link: opens Substack subscribe page.
   End-of-post block: captures email here, hands off to
   Substack's subscribe page pre-filled (their signup API
   403s server-side requests, so this is the honest path).
   ========================================================== */

const SUBSCRIBE_URLS = {
  kellyvohs: 'https://kellyvohs.substack.com/subscribe',
  vohs: 'https://vohs.substack.com/subscribe'
};

const SUBSCRIBE_PITCHES = {
  kellyvohs: 'Sunday letters about getting better.',
  vohs: 'One image. Most weeks.'
};

/**
 * Builds the end-of-post subscribe block.
 * @param {string} publication - 'kellyvohs' or 'vohs'
 */
function buildSubscribeBlock(publication) {
  const url = SUBSCRIBE_URLS[publication] || SUBSCRIBE_URLS.kellyvohs;
  const pitch = SUBSCRIBE_PITCHES[publication] || SUBSCRIBE_PITCHES.kellyvohs;

  const block = document.createElement('div');
  block.className = 'subscribe-block';
  block.innerHTML = `
    <p class="subscribe-block__pitch">${pitch}</p>
    <form class="subscribe-block__form" novalidate>
      <input type="email" class="subscribe-block__input" placeholder="your@email.com"
             autocomplete="email" aria-label="Email address" required />
      <button type="submit" class="subscribe-block__btn">Subscribe</button>
    </form>
    <p class="subscribe-block__meta">Once a week &mdash; unsubscribe anytime</p>
  `;

  block.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = block.querySelector('.subscribe-block__input');
    const email = input.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      input.focus();
      input.style.borderColor = 'var(--color-accent)';
      return;
    }

    window.open(url + '?email=' + encodeURIComponent(email), '_blank', 'noopener');

    block.innerHTML = `
      <p class="subscribe-block__done-title">One more click.</p>
      <p class="subscribe-block__done-note">Finish on the Substack page that just opened &mdash; then you're in.</p>
    `;
  });

  return block;
}

function initSubscribe() {
  const triggers = document.querySelectorAll('.subscribe-trigger');
  if (!triggers.length) return;

  triggers.forEach(trigger => {
    const pub = trigger.dataset.publication;
    const url = SUBSCRIBE_URLS[pub];
    if (url) {
      trigger.href = url;
      trigger.target = '_blank';
      trigger.rel = 'noopener';
    }
  });
}

document.addEventListener('DOMContentLoaded', initSubscribe);
