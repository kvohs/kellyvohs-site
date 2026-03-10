/* ==========================================================
   PHOTO GRID COMPONENT — kellyvohs.com
   Generates placeholder images for the photo grids.
   Replace placeholder URLs with real image paths when ready.
   ========================================================== */

/**
 * Renders a grid of photo cards into a container.
 * @param {string} containerSelector - CSS selector for the grid container
 * @param {Array} images - Array of { src, alt } objects
 * @param {Object} options - { clickable: bool, cardClass: string }
 */
function renderPhotoGrid(containerSelector, images, options = {}) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const { clickable = false, cardClass = '' } = options;

  images.forEach(({ src, alt }) => {
    const card = document.createElement('div');
    card.className = `photo-card ${cardClass}`.trim();

    const img = document.createElement('img');
    img.src = src;
    img.alt = alt || '';
    img.loading = 'lazy';

    card.appendChild(img);

    // If clickable, open lightbox on click
    if (clickable) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => openLightbox(src, alt));
    }

    container.appendChild(card);
  });
}

/**
 * Generates placeholder image URLs.
 * These use a simple SVG data URI — no external service needed.
 * Replace with real image paths when you have photos ready.
 */
function generatePlaceholders(count, width = 800, height = 800) {
  const placeholders = [];
  // Different gray tones for visual variety
  const tones = ['1a1a1a', '222', '2a2a2a', '1e1e1e', '262626', '303030'];

  for (let i = 0; i < count; i++) {
    const tone = tones[i % tones.length];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect fill="#${tone}" width="${width}" height="${height}"/>
      <text fill="#444" font-family="sans-serif" font-size="14" x="50%" y="50%" text-anchor="middle" dy=".3em">${width} × ${height}</text>
    </svg>`;
    const encoded = btoa(svg);
    placeholders.push({
      src: `data:image/svg+xml;base64,${encoded}`,
      alt: `Photograph ${i + 1}`
    });
  }
  return placeholders;
}
