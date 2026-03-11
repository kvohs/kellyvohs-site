/* ==========================================================
   LIGHTBOX — kellyvohs.com
   Image lightbox with arrow navigation + slideshow mode.
   ========================================================== */

let lightboxImages = [];
let lightboxIndex = 0;

/* Slideshow state */
let slideshowTimer = null;
let slideshowPaused = false;
let fadeTimeout = null;
const SLIDESHOW_INTERVAL = 4500;
const FADE_DURATION = 600;

function initLightbox() {
  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-label', 'Image viewer');

  lightbox.innerHTML = `
    <button class="lightbox__close" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    <div class="lightbox__nav">
      <button class="lightbox__arrow lightbox__arrow--left" aria-label="Previous"><svg width="24" height="40" viewBox="0 0 24 40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20,2 4,20 20,38" /></svg></button>
      <div class="lightbox__dots"></div>
      <button class="lightbox__arrow lightbox__arrow--right" aria-label="Next"><svg width="24" height="40" viewBox="0 0 24 40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4,2 20,20 4,38" /></svg></button>
    </div>
    <button class="lightbox__close lightbox__close--bottom" aria-label="Close"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    <img class="lightbox__image" src="" alt="" />
    <div class="lightbox__progress"><div class="lightbox__progress-bar"></div></div>
  `;

  document.body.appendChild(lightbox);

  /* Click — slideshow: pause/resume; regular: close */
  lightbox.addEventListener('click', (e) => {
    if (e.target.closest('.lightbox__close')) {
      closeLightbox();
      return;
    }
    if (e.target.closest('.lightbox__arrow')) return;

    if (lightbox.classList.contains('lightbox--slideshow')) {
      toggleSlideshowPause();
    } else {
      closeLightbox();
    }
  });

  /* Arrow buttons */
  lightbox.querySelector('.lightbox__arrow--left').addEventListener('click', (e) => {
    e.stopPropagation();
    navigateLightbox(-1);
  });

  lightbox.querySelector('.lightbox__arrow--right').addEventListener('click', (e) => {
    e.stopPropagation();
    navigateLightbox(1);
  });

  /* Keyboard: Escape, Left, Right, Space */
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('lightbox--open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigateLightbox(-1);
    if (e.key === 'ArrowRight') navigateLightbox(1);
    if (e.key === ' ' && lightbox.classList.contains('lightbox--slideshow')) {
      e.preventDefault();
      toggleSlideshowPause();
    }
  });
}

/* ==========================================================
   Standard lightbox (click a photo)
   ========================================================== */

function openLightbox(src, alt) {
  const lightbox = document.querySelector('.lightbox');
  if (!lightbox) return;

  lightboxImages = Array.from(document.querySelectorAll('.photo-card img')).map(img => ({
    src: img.src,
    alt: img.alt
  }));

  lightboxIndex = lightboxImages.findIndex(img => img.src === src);
  if (lightboxIndex === -1) lightboxIndex = 0;

  updateLightboxImage();
  lightbox.classList.add('lightbox--open');
  document.body.style.overflow = 'hidden';
}

/* ==========================================================
   Slideshow mode (full-bleed auto-play)
   ========================================================== */

function openSlideshow(images, startIndex) {
  const lightbox = document.querySelector('.lightbox');
  if (!lightbox) return;

  lightboxImages = images.map(img => ({ src: img.src, alt: img.alt || '' }));
  lightboxIndex = startIndex || 0;
  slideshowPaused = false;

  buildDots();
  updateLightboxImage();
  lightbox.classList.add('lightbox--open', 'lightbox--slideshow');
  document.body.style.overflow = 'hidden';

  startSlideshowTimer();
  resetProgressBar();
}

function startSlideshowTimer() {
  stopSlideshowTimer();
  slideshowTimer = setTimeout(advanceSlideshow, SLIDESHOW_INTERVAL);
}

function stopSlideshowTimer() {
  if (slideshowTimer) {
    clearTimeout(slideshowTimer);
    slideshowTimer = null;
  }
}

function clearFadeTimeout() {
  if (fadeTimeout) {
    clearTimeout(fadeTimeout);
    fadeTimeout = null;
  }
}

function advanceSlideshow() {
  const img = document.querySelector('.lightbox__image');
  if (!img || slideshowPaused) return;

  /* Lock current dimensions so the border doesn't jump during crossfade */
  const rect = img.getBoundingClientRect();
  img.style.width = rect.width + 'px';
  img.style.height = rect.height + 'px';

  img.classList.add('lightbox__image--fading');

  fadeTimeout = setTimeout(() => {
    fadeTimeout = null;
    lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
    img.src = lightboxImages[lightboxIndex].src;
    img.alt = lightboxImages[lightboxIndex].alt || '';

    const fadeIn = () => {
      /* Unlock dimensions so the image can resize naturally */
      img.style.width = '';
      img.style.height = '';
      img.classList.remove('lightbox__image--fading');
      resetProgressBar();
      startSlideshowTimer();
    };

    if (img.complete) {
      fadeIn();
    } else {
      img.addEventListener('load', fadeIn, { once: true });
    }
  }, FADE_DURATION);
}

function buildDots() {
  const container = document.querySelector('.lightbox__dots');
  if (!container) return;
  container.innerHTML = lightboxImages.map((_, i) =>
    `<span class="lightbox__dot${i === lightboxIndex ? ' lightbox__dot--active' : ''}"></span>`
  ).join('');
}

function updateDots() {
  const dots = document.querySelectorAll('.lightbox__dot');
  dots.forEach((dot, i) => {
    dot.classList.toggle('lightbox__dot--active', i === lightboxIndex);
  });
}

function resetProgressBar() {
  const bar = document.querySelector('.lightbox__progress-bar');
  if (!bar) return;
  bar.style.animation = 'none';
  bar.offsetHeight;
  bar.style.animation = `slideshow-progress ${SLIDESHOW_INTERVAL}ms linear forwards`;
}

function toggleSlideshowPause() {
  slideshowPaused = !slideshowPaused;
  const lightbox = document.querySelector('.lightbox');
  const bar = document.querySelector('.lightbox__progress-bar');
  const img = document.querySelector('.lightbox__image');

  if (slideshowPaused) {
    stopSlideshowTimer();
    clearFadeTimeout();
    if (img) img.classList.remove('lightbox__image--fading');
    if (bar) bar.style.animationPlayState = 'paused';
    lightbox?.classList.add('lightbox--paused');
  } else {
    lightbox?.classList.remove('lightbox--paused');
    resetProgressBar();
    startSlideshowTimer();
  }
}

/* ==========================================================
   Shared
   ========================================================== */

function closeLightbox() {
  const lightbox = document.querySelector('.lightbox');
  if (!lightbox) return;

  lightbox.classList.remove('lightbox--open', 'lightbox--slideshow', 'lightbox--paused');
  document.body.style.overflow = '';

  stopSlideshowTimer();
  clearFadeTimeout();
  slideshowPaused = false;

  const img = document.querySelector('.lightbox__image');
  if (img) img.classList.remove('lightbox__image--fading');
}

function navigateLightbox(direction) {
  if (lightboxImages.length === 0) return;

  clearFadeTimeout();
  stopSlideshowTimer();

  const img = document.querySelector('.lightbox__image');
  if (img) img.classList.remove('lightbox__image--fading');

  lightboxIndex = (lightboxIndex + direction + lightboxImages.length) % lightboxImages.length;
  updateLightboxImage();

  const lightbox = document.querySelector('.lightbox');
  if (lightbox?.classList.contains('lightbox--slideshow') && !slideshowPaused) {
    resetProgressBar();
    startSlideshowTimer();
  }
}

function updateLightboxImage() {
  const img = document.querySelector('.lightbox__image');
  if (!img || !lightboxImages[lightboxIndex]) return;
  img.src = lightboxImages[lightboxIndex].src;
  img.alt = lightboxImages[lightboxIndex].alt || '';
  updateDots();
}
