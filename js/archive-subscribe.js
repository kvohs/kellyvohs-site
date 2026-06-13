/* archive-subscribe.js — the subscribe modal, shared by every room.
   Substack blocks cross-origin POSTs to /api/v1/free (403), so the only
   path that actually subscribes in one step is Substack's own /embed
   iframe: it GETs substack.com (clearing Cloudflare), then submits the
   form same-origin inside the frame. We can't CSS the frame's insides
   (cross-origin); its button colour comes from the Substack publication
   theme (Settings → Branding), not from us. Any [data-subscribe] opens it. */
(function () {
  var EMBED = 'https://kellyvohs.substack.com/embed';

  var modal = document.createElement('div');
  modal.className = 'submodal';
  modal.innerHTML =
    '<div class="submodal__sheet" role="dialog" aria-label="Subscribe">' +
      '<p class="submodal__pitch">Sunday letters about getting better.</p>' +
      '<iframe class="submodal__embed" title="Subscribe" loading="lazy"></iframe>' +
      '<p class="submodal__meta">ONCE A WEEK &mdash; UNSUBSCRIBE ANYTIME</p>' +
    '</div>';
  document.body.appendChild(modal);

  var frame = modal.querySelector('.submodal__embed');

  function open() {
    if (!frame.src) frame.src = EMBED;   // load the real form on first open
    modal.classList.add('submodal--open');
  }
  function close() { modal.classList.remove('submodal--open'); }

  modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  Array.prototype.forEach.call(document.querySelectorAll('[data-subscribe]'), function (el) {
    el.addEventListener('click', function (e) { e.preventDefault(); open(); });
  });
})();
