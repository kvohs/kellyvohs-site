/* ==========================================================
   SUBSCRIBE — kellyvohs.com
   Click "Subscribe" → opens Substack subscribe page.
   ========================================================== */

const SUBSCRIBE_URLS = {
  kellyvohs: 'https://kellyvohs.substack.com/subscribe',
  vohs: 'https://vohs.substack.com/subscribe'
};

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
