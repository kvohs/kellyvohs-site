/* archive-subscribe.js — subscribe, in our own type, in one step.
   Substack's /embed form is a plain no-JS POST to /api/v1/free?nojs=true
   with no CSRF token — just email + tracking fields. So we post our own
   Courier form straight to it, targeting a hidden relay iframe (a cross-
   origin form POST is a navigation, not a blocked CORS fetch). No redirect,
   no second click, no Substack chrome. Confirmation is optimistic (the
   relay response is cross-origin and unreadable, same as any embed).
   Shared by every room; opens the modal from any [data-subscribe]. Also
   wires any in-page form with class .ssub-form (the end-of-letter block). */
(function () {
  var ACTION = 'https://kellyvohs.substack.com/api/v1/free?nojs=true';

  // one hidden relay iframe catches the POST response so the page stays put
  var relay = document.createElement('iframe');
  relay.name = 'ssub_relay';
  relay.className = 'ssub-relay';
  relay.setAttribute('aria-hidden', 'true');
  relay.tabIndex = -1;
  document.body.appendChild(relay);

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function fields() {
    // mirror the embed's no-js payload; email is filled by the visible input
    return '<input type="hidden" name="source" value="embed" />' +
           '<input type="hidden" name="first_url" value="-" />' +
           '<input type="hidden" name="current_url" value="-" />';
  }

  function wire(form, onDone) {
    form.setAttribute('action', ACTION);
    form.setAttribute('method', 'post');
    form.setAttribute('target', 'ssub_relay');
    form.addEventListener('submit', function (e) {
      var email = form.querySelector('input[type="email"]');
      if (!EMAIL_RE.test((email.value || '').trim())) { e.preventDefault(); email.focus(); return; }
      // let the native POST proceed into the relay, then confirm
      setTimeout(onDone, 60);
    });
  }

  /* --- the modal --- */
  var modal = document.createElement('div');
  modal.className = 'submodal';
  modal.innerHTML =
    '<div class="submodal__sheet" role="dialog" aria-label="Subscribe">' +
      '<p class="submodal__pitch">Sunday letters about getting better.</p>' +
      '<form class="submodal__form ssub-form" novalidate>' +
        '<input type="email" name="email" class="submodal__input" placeholder="your@email.com" aria-label="Email address" />' +
        fields() +
        '<button type="submit" class="submodal__btn">Subscribe</button>' +
      '</form>' +
      '<p class="submodal__meta">ONCE A WEEK &mdash; UNSUBSCRIBE ANYTIME</p>' +
    '</div>';
  document.body.appendChild(modal);

  var sheet = modal.querySelector('.submodal__sheet');
  wire(modal.querySelector('.ssub-form'), function () {
    sheet.innerHTML =
      '<p class="submodal__pitch">You&#39;re in.</p>' +
      '<p class="submodal__meta" style="text-transform:none;letter-spacing:0.03em;font-size:13px;line-height:1.7;">' +
      'The next letter lands Sunday. Check your inbox for a hello from Substack.</p>';
  });

  function open() { modal.classList.add('submodal--open'); }
  function close() { modal.classList.remove('submodal--open'); }
  modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  Array.prototype.forEach.call(document.querySelectorAll('[data-subscribe]'), function (el) {
    el.addEventListener('click', function (e) { e.preventDefault(); open(); });
  });

  /* --- any in-page subscribe form (the end-of-letter block) --- */
  Array.prototype.forEach.call(document.querySelectorAll('.ssub-form'), function (form) {
    if (form.closest('.submodal')) return; // modal already wired
    var host = form.parentNode;
    wire(form, function () {
      host.innerHTML =
        '<p class="subscribe__pitch">You&#39;re in.</p>' +
        '<p class="subscribe__meta" style="text-transform:none;letter-spacing:0.03em;font-size:13px;">' +
        'The next letter lands Sunday. Check your inbox for a hello from Substack.</p>';
    });
  });
})();
