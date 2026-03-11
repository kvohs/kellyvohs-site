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
    </div>
  `;

  document.body.appendChild(footer);
}
