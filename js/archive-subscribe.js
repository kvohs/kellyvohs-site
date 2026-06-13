/* archive-subscribe.js — the subscribe modal, shared by every room.
   One small sheet over the desk; one push on the gray closes it.
   Any element with [data-subscribe] opens it. */
(function () {
  var modal = document.createElement('div');
  modal.className = 'submodal';
  modal.innerHTML =
    '<div class="submodal__sheet" role="dialog" aria-label="Subscribe">' +
      '<p class="submodal__pitch">Sunday letters about getting better.</p>' +
      '<form class="submodal__form" novalidate>' +
        '<input type="email" class="submodal__input" placeholder="your@email.com" aria-label="Email address" />' +
        '<button type="submit" class="submodal__btn">Subscribe</button>' +
      '</form>' +
      '<p class="submodal__meta">ONCE A WEEK &mdash; UNSUBSCRIBE ANYTIME</p>' +
    '</div>';
  document.body.appendChild(modal);

  var input = modal.querySelector('.submodal__input');
  var form = modal.querySelector('.submodal__form');

  function open() {
    modal.classList.add('submodal--open');
    setTimeout(function () { input.focus(); }, 100);
  }
  function close() {
    modal.classList.remove('submodal--open');
    if (modal.contains(document.activeElement)) document.activeElement.blur();
  }

  modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  Array.prototype.forEach.call(document.querySelectorAll('[data-subscribe]'), function (el) {
    el.addEventListener('click', function (e) { e.preventDefault(); open(); });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { input.focus(); return; }
    window.open('https://kellyvohs.substack.com/subscribe?email=' + encodeURIComponent(email), '_blank', 'noopener');
    modal.querySelector('.submodal__sheet').innerHTML =
      '<p class="submodal__pitch">One more click.</p>' +
      '<p class="submodal__meta" style="text-transform:none;letter-spacing:0.04em;font-size:13px;">' +
      'Finish on the Substack page that just opened &mdash; then you&#39;re in.</p>';
  });
})();
