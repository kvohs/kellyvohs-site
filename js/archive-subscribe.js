/* archive-subscribe.js — subscribe overlay, shared by every room.
   Any [data-subscribe] element (a nav link, a button at the end of a
   letter, anywhere) opens a full-screen overlay in our own type that holds
   Substack's embed form — the only thing that actually subscribes. The
   reader never leaves the site. Closes on submit (best effort, by watching
   the iframe reload) and always via the ✕, the backdrop, or Esc.
   The embed's own input + button keep Substack's look (cross-origin iframe,
   not ours to style); everything around them is the archive. */
(function () {
  var EMBED = 'https://kellyvohs.substack.com/embed';

  var modal = document.createElement('div');
  modal.className = 'submodal';
  modal.innerHTML =
    '<div class="submodal__sheet" role="dialog" aria-label="Subscribe">' +
      '<button class="submodal__close" aria-label="Close">&#10005;</button>' +
      '<p class="submodal__pitch">Sunday letters about getting better.</p>' +
      '<iframe class="submodal__embed" title="Subscribe" loading="lazy"></iframe>' +
      '<p class="submodal__meta">ONCE A WEEK &mdash; UNSUBSCRIBE ANYTIME</p>' +
    '</div>';
  document.body.appendChild(modal);

  var frame = modal.querySelector('.submodal__embed');
  var loads = 0;

  // The embed reloads itself when it submits the no-JS form; second load = sent.
  frame.addEventListener('load', function () {
    loads++;
    if (loads >= 2) {
      var sheet = modal.querySelector('.submodal__sheet');
      sheet.innerHTML =
        '<button class="submodal__close" aria-label="Close">&#10005;</button>' +
        '<p class="submodal__pitch">You&#39;re in.</p>' +
        '<p class="submodal__meta" style="text-transform:none;letter-spacing:0.03em;font-size:13px;line-height:1.7;">' +
        'The next letter lands Sunday. Watch your inbox for a hello from Substack.</p>';
      sheet.querySelector('.submodal__close').addEventListener('click', close);
      setTimeout(close, 2600);
    }
  });

  function open() {
    if (!frame.src) frame.src = EMBED;
    modal.classList.add('submodal--open');
  }
  function close() { modal.classList.remove('submodal--open'); }

  modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
  modal.querySelector('.submodal__close').addEventListener('click', close);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('submodal--open')) close();
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-subscribe]'), function (el) {
    el.addEventListener('click', function (e) { e.preventDefault(); open(); });
  });
})();
