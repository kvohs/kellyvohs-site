/* ==========================================================
   LIGHTBOX — kellyvohs.com
   Image lightbox with arrow navigation.
   ========================================================== */

let lightboxImages = [];
let lightboxIndex = 0;

function initLightbox() {
  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-label', 'Image viewer');

  lightbox.innerHTML = `
    <button class="lightbox__close" aria-label="Close">&times;</button>
    <button class="lightbox__arrow lightbox__arrow--left" aria-label="Previous">&lsaquo;</button>
    <img class="lightbox__image" src="" alt="" />
    <button class="lightbox__arrow lightbox__arrow--right" aria-label="Next">&rsaquo;</button>
  `;

  document.body.appendChild(lightbox);

  // Close on background click or close button
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target.classList.contains('lightbox__close')) {
      closeLightbox();
    }
  });

  // Arrow buttons
  lightbox.querySelector('.lightbox__arrow--left').addEventListener('click', (e) => {
    e.stopPropagation();
    navigateLightbox(-1);
  });

  lightbox.querySelector('.lightbox__arrow--right').addEventListener('click', (e) => {
    e.stopPropagation();
    navigateLightbox(1);
  });

  // Keyboard: Escape, Left, Right
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('lightbox--open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigateLightbox(-1);
    if (e.key === 'ArrowRight') navigateLightbox(1);
  });
}

function openLightbox(src, alt) {
  const lightbox = document.querySelector('.lightbox');
  if (!lightbox) return;

  // Build image list from all photo-card images on the page
  lightboxImages = Array.from(document.querySelectorAll('.photo-card img')).map(img => ({
    src: img.src,
    alt: img.alt
  }));

  // Find current index
  lightboxIndex = lightboxImages.findIndex(img => img.src === src);
  if (lightboxIndex === -1) lightboxIndex = 0;

  updateLightboxImage();
  lightbox.classList.add('lightbox--open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lightbox = document.querySelector('.lightbox');
  if (!lightbox) return;

  lightbox.classList.remove('lightbox--open');
  document.body.style.overflow = '';
}

function navigateLightbox(direction) {
  if (lightboxImages.length === 0) return;
  lightboxIndex = (lightboxIndex + direction + lightboxImages.length) % lightboxImages.length;
  updateLightboxImage();
}

function updateLightboxImage() {
  const img = document.querySelector('.lightbox__image');
  if (!img || !lightboxImages[lightboxIndex]) return;
  img.src = lightboxImages[lightboxIndex].src;
  img.alt = lightboxImages[lightboxIndex].alt || '';
}
