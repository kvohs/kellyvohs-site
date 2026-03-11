/* ==========================================================
   SUBSCRIBE DIALOG — kellyvohs.com
   Click "Subscribe" → centered dialog with email input.
   ========================================================== */

function initSubscribe() {
  const triggers = document.querySelectorAll('.subscribe-trigger');
  if (!triggers.length) return;

  // Build dialog (one shared instance)
  const dialog = document.createElement('div');
  dialog.className = 'subscribe-dialog';
  dialog.innerHTML = `
    <div class="subscribe-dialog__backdrop"></div>
    <div class="subscribe-dialog__box">
      <form class="subscribe-dialog__form">
        <input type="email" class="subscribe-dialog__input" placeholder="Your email" required autocomplete="email" />
        <button type="submit" class="subscribe-dialog__btn">Subscribe</button>
      </form>
      <div class="subscribe-dialog__msg"></div>
    </div>
  `;
  document.body.appendChild(dialog);

  const backdrop = dialog.querySelector('.subscribe-dialog__backdrop');
  const form = dialog.querySelector('.subscribe-dialog__form');
  const input = dialog.querySelector('.subscribe-dialog__input');
  const btn = dialog.querySelector('.subscribe-dialog__btn');
  const msg = dialog.querySelector('.subscribe-dialog__msg');

  let currentPublication = '';

  function open(publication) {
    currentPublication = publication;
    dialog.classList.add('subscribe-dialog--open');
    document.body.style.overflow = 'hidden';
    input.focus();
  }

  function close() {
    dialog.classList.remove('subscribe-dialog--open');
    document.body.style.overflow = '';
    input.value = '';
    msg.textContent = '';
    msg.className = 'subscribe-dialog__msg';
    form.style.display = '';
    btn.textContent = 'Subscribe';
    btn.disabled = false;
  }

  triggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      open(trigger.dataset.publication);
    });
  });

  backdrop.addEventListener('click', close);

  // Safari skips buttons on Tab — force focus to submit
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      btn.focus();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dialog.classList.contains('subscribe-dialog--open')) {
      close();
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = input.value.trim();
    if (!email) return;

    btn.textContent = '...';
    btn.disabled = true;

    try {
      const res = await fetch('/.netlify/functions/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, publication: currentPublication })
      });

      const data = await res.json();

      if (data.status === 'ok') {
        form.style.display = 'none';
        msg.textContent = 'Check your inbox.';
        msg.className = 'subscribe-dialog__msg subscribe-dialog__msg--success';
      } else {
        throw new Error(data.message);
      }
    } catch {
      btn.textContent = 'Subscribe';
      btn.disabled = false;
      msg.textContent = 'Something went wrong.';
      msg.className = 'subscribe-dialog__msg subscribe-dialog__msg--error';
      setTimeout(() => { msg.textContent = ''; }, 3000);
    }
  });
}

document.addEventListener('DOMContentLoaded', initSubscribe);
