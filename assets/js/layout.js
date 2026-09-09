/* ==========================================================================
   Layout commun : en-tête, pied de page, navigation mobile, badge panier, toast.
   ========================================================================== */

function renderHeader(activePath){
  const el = document.getElementById('site-header');
  if(!el) return;
  const links = [
    { href:'/', label:'Accueil' },
    { href:'/pages/produits', label:'Tous les produits' },
    { href:'/pages/produits?cat=packs', label:'Packs hiver' },
    { href:'/pages/suivi', label:'Suivi de commande' },
    { href:'/pages/contact', label:'Contact' }
  ];
  const navHtml = links.map(l => {
    const isActive = activePath === l.href.split('?')[0];
    return `<a href="${l.href}"${isActive ? ' class="active" aria-current="page"' : ''}>${l.label}</a>`;
  }).join('');

  el.innerHTML = `
    <div class="header-bar">
      <a href="/" class="brand">
        <span class="brand-name">WooExtractor</span>
        <span class="brand-tag">Bois de chauffage &amp; accessoires</span>
      </a>
      <nav class="main-nav" id="main-nav">${navHtml}</nav>
      <div class="header-actions">
        <a href="/pages/panier" class="cart-link" aria-label="Voir le panier">
          ${ICONS.cart}
          <span class="cart-badge" id="cart-badge">0</span>
        </a>
        <button class="nav-toggle" id="nav-toggle" aria-label="Ouvrir le menu" aria-expanded="false"><span></span></button>
      </div>
    </div>`;

  const toggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('main-nav');
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  updateCartBadge();
  window.addEventListener('dd-cart-updated', updateCartBadge);
}

function updateCartBadge(){
  const badge = document.getElementById('cart-badge');
  if(badge) badge.textContent = Cart.count();
}

function renderFooter(){
  const el = document.getElementById('site-footer');
  if(!el) return;
  el.innerHTML = `
    <div class="wrap">
      <div class="footer-grid">
        <div>
          <h4>WooExtractor</h4>
          <p>Bois de chauffage, packs d'hiver et accessoires de cheminée sélectionnés pour tenir toute la saison froide.</p>
        </div>
        <div>
          <h4>Boutique</h4>
          <ul>
            <li><a href="/pages/produits">Tous les produits</a></li>
            <li><a href="/pages/produits?cat=packs">Packs &amp; offres</a></li>
            <li><a href="/pages/produits?cat=accessoires">Accessoires</a></li>
            <li><a href="/pages/panier">Mon panier</a></li>
          </ul>
        </div>
        <div>
          <h4>Assistance</h4>
          <ul>
            <li><a href="/pages/suivi">Suivi de commande</a></li>
            <li><a href="/pages/contact">Contact</a></li>
            <li><a href="/pages/mentions-legales">Mentions légales</a></li>
          </ul>
        </div>
        <div>
          <h4>Paiement sécurisé</h4>
          <ul>
            <li>Carte bancaire — Stripe</li>
            <li>Cryptomonnaie — NowPayments</li>
            <li>Virement bancaire</li>
          </ul>
          <p style="margin-top:14px;">16 rue Suzanne Lanoy<br>59870 Vred, France</p>
        </div>
      </div>
      <div class="footer-legal">
        <span>© ${new Date().getFullYear()} WooExtractor — exploité par D&amp;D Bois de Chauffage, SARL — SIRET 989 318 472 00010</span>
        <span>TVA FR62989318472</span>
      </div>
    </div>`;
}

function showToast(message){
  let toast = document.getElementById('dd-toast');
  if(!toast){
    toast = document.createElement('div');
    toast.id = 'dd-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

document.addEventListener('DOMContentLoaded', () => {
  let path = window.location.pathname;
  if(path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  if(path.endsWith('.html')) path = path.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
  renderHeader(path || '/');
  renderFooter();
});
