/* ==========================================================
   FOOTER COMPONENT — kellyvohs.com
   Builds the site footer. Edit links/text here.
   ========================================================== */

function buildFooter() {
  const year = new Date().getFullYear();

  const footer = document.createElement('footer');
  footer.className = 'footer';
  footer.setAttribute('role', 'contentinfo');

  const path = window.location.pathname;
  const pagelistHref = path.includes('/pages/') ? 'pagelist.html' : 'pages/pagelist.html';

  footer.innerHTML = `
    <div class="footer__inner">
      <a href="${pagelistHref}" class="footer__text" style="text-decoration:none;color:inherit;">&copy; ${year} Kelly Vohs</a>
      <span class="footer__text" style="margin-left:8px;opacity:0.4;font-size:0.7em;">v1.0.4</span>
    </div>
  `;

  document.body.appendChild(footer);
}
