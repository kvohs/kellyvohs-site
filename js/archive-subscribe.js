/* archive-subscribe.js — the subscribe modal, shared by every room.
   A small paper sheet over the desk holding Substack's own embed form, so
   subscribing happens in one step, on the page — no redirect, no second
   click. (Substack's /api/v1/free 403s server-side requests, so the embed
   iframe is the only true one-step path.) Any [data-subscribe] opens it. */
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
    if (!frame.src) frame.src = EMBED;   // load the form on first open
    modal.classList.add('submodal--open');
  }
  function close() { modal.classList.remove('submodal--open'); }

  modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  Array.prototype.forEach.call(document.querySelectorAll('[data-subscribe]'), function (el) {
    el.addEventListener('click', function (e) { e.preventDefault(); open(); });
  });
})();
