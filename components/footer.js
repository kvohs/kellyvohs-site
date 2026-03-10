/* ==========================================================
   FOOTER COMPONENT — kellyvohs.com
   Builds the site footer. Edit links/text here.
   ========================================================== */

function buildFooter() {
  const year = new Date().getFullYear();

  const footer = document.createElement('footer');
  footer.className = 'footer';
  footer.setAttribute('role', 'contentinfo');

  footer.innerHTML = `
    <div class="footer__inner">
      <span class="footer__text">&copy; ${year} Kelly Vohs</span>
      <div class="footer__links">
        <a href="https://kellyvohs.substack.com" target="_blank" rel="noopener" class="footer__link">Substack</a>
        <a href="https://instagram.com/kellyvohs" target="_blank" rel="noopener" class="footer__link">Instagram</a>
      </div>
    </div>
  `;

  document.body.appendChild(footer);
}
