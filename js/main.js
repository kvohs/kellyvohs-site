/* ==========================================================
   MAIN JS — kellyvohs.com
   Initializes shared components on every page.
   ========================================================== */

document.addEventListener('DOMContentLoaded', () => {
  buildNav();
  buildFooter();

  // Scroll hint: fade on scroll, click to open slideshow
  const hint = document.querySelector('.hero__scroll-hint');
  if (hint) {
    window.addEventListener('scroll', () => {
      hint.classList.toggle('hero__scroll-hint--hidden', window.scrollY > 50);
    }, { passive: true });

    hint.style.cursor = 'pointer';

    hint.addEventListener('click', () => {
      const images = Array.from(document.querySelectorAll('.photo-card img')).map(img => ({
        src: img.src,
        alt: img.alt
      }));
      if (images.length) openSlideshow(images);
    });
  }
});
