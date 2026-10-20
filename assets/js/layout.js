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
    { href:'/pages/devis', label:'Devis gratuit' },
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

  // Hauteur réelle de l'en-tête : le menu mobile s'y accroche, quel que soit l'écran.
  function syncHeaderHeight(){
    document.documentElement.style.setProperty('--header-h', el.offsetHeight + 'px');
  }
  function setMenu(open){
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    document.body.classList.toggle('menu-open', open);
  }
  toggle.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  nav.addEventListener('click', e => { if(e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape') setMenu(false); });
  window.addEventListener('resize', () => {
    syncHeaderHeight();
    if(window.innerWidth > 860) setMenu(false);
  });
  syncHeaderHeight();

  updateCartBadge();
  window.addEventListener('dd-cart-updated', updateCartBadge);
}

function updateCartBadge(){
  const badge = document.getElementById('cart-badge');
  if(badge) badge.textContent = Cart.count();
}

const WHATSAPP_URL = 'https://wa.me/33759309200';

function renderTrustBadges(){
  const footer = document.getElementById('site-footer');
  if(!footer || document.getElementById('trust-badges')) return;
  const badges = [
    { icon:'truck',   title:'Livraison 48 à 72 h', text:'Expédition rapide vers toute la France métropolitaine' },
    { icon:'shield',  title:'Paiement sécurisé',   text:'Carte bancaire, cryptomonnaie ou virement' },
    { icon:'package', title:'Stock disponible',    text:'Les 24 références prêtes à expédier' },
    { icon:'headset', title:'Service client',      text:'Par WhatsApp ou e-mail, du lundi au vendredi' }
  ];
  const section = document.createElement('section');
  section.id = 'trust-badges';
  section.className = 'trust-badges';
  section.setAttribute('aria-label', 'Nos engagements');
  section.innerHTML = `
    <div class="wrap">
      <div class="trust-grid">
        ${badges.map(b => `
          <div class="trust-item">
            <span class="trust-icon">${ICONS[b.icon]}</span>
            <div>
              <h3>${b.title}</h3>
              <p>${b.text}</p>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
  footer.parentNode.insertBefore(section, footer);
}

function renderWhatsAppChat(){
  if(document.getElementById('wa-chat')) return;
  const a = document.createElement('a');
  a.id = 'wa-chat';
  a.className = 'wa-chat';
  a.href = WHATSAPP_URL;
  a.target = '_blank';
  a.rel = 'noopener';
  a.setAttribute('aria-label', 'Discuter avec nous sur WhatsApp');
  a.innerHTML = `${ICONS.whatsapp}<span class="wa-label">Discuter sur WhatsApp</span>`;
  document.body.appendChild(a);
}

function renderFooter(){
  const el = document.getElementById('site-footer');
  if(!el) return;
  el.innerHTML = `
    <div class="wrap">
      <div class="footer-grid">
        <div>
          <h4>WooExtractor</h4>
          <p>Bois de chauffage, packs d'hiver et allumage sélectionnés pour tenir toute la saison froide.</p>
        </div>
        <div>
          <h4>Boutique</h4>
          <ul>
            <li><a href="/pages/produits">Tous les produits</a></li>
            <li><a href="/pages/produits?cat=packs">Packs &amp; offres</a></li>
            <li><a href="/pages/devis">Devis gratuit</a></li>
            <li><a href="/pages/panier">Mon panier</a></li>
          </ul>
        </div>
        <div>
          <h4>Assistance</h4>
          <ul>
            <li><a href="/pages/suivi">Suivi de commande</a></li>
            <li><a href="/pages/contact">Contact</a></li>
            <li><a href="${WHATSAPP_URL}" target="_blank" rel="noopener">WhatsApp : +33 7 59 30 92 00</a></li>
            <li><a href="/pages/mentions-legales">Mentions légales</a></li>
          </ul>
        </div>
        <div>
          <h4>Paiement sécurisé</h4>
          <ul>
            <li><a href="/pages/paiement-carte-bancaire">Carte bancaire</a></li>
            <li><a href="/pages/paiement-cryptomonnaie">Cryptomonnaie</a></li>
            <li><a href="/pages/paiement-virement-bancaire">Virement bancaire</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-legal">
        <span>© ${new Date().getFullYear()} WooExtractor — exploité par D&amp;D Bois de Chauffage, SARL — SIRET 989 318 472 00010</span>
        <span>TVA FR62989318472</span>
      </div>
    </div>`;
  const path = window.location.pathname;
  if(!/checkout|order-success/.test(path)) renderTrustBadges();
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
  try{ renderHeader(path || '/'); }catch(err){ console.error('Erreur en-tête :', err); }
  try{ renderFooter(); }catch(err){ console.error('Erreur pied de page :', err); }
  try{ renderWhatsAppChat(); }catch(err){ console.error('Erreur WhatsApp :', err); }
});
