/* ==========================================================================
   Layout commun : en-tête, pied de page, navigation mobile, badge panier, toast.
   ========================================================================== */

function normalizedPath(){
  let path = window.location.pathname;
  if(path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  if(path.endsWith('.html')) path = path.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
  return path || '/';
}

// Une seule entrée du menu est active à la fois.
// Sur /pages/produits, l'entrée dépend de la catégorie (?cat=) :
//   packs  -> Packs hiver ; autres ou catégorie « autre » -> Autres catégories ; sinon -> Bois de chauffage.
function currentNavKey(){
  const path = normalizedPath();
  if(path === '/pages/produits'){
    const cat = new URLSearchParams(window.location.search).get('cat');
    if(cat === 'packs') return 'packs';
    if(cat === 'autres' || (typeof isOtherCategory === 'function' && isOtherCategory(cat))) return 'autres';
    return 'bois';
  }
  return path;
}

function updateNavActive(){
  const key = currentNavKey();
  document.querySelectorAll('#main-nav a[data-nav]').forEach(a => {
    const on = a.getAttribute('data-nav') === key;
    a.classList.toggle('active', on);
    if(on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

function renderHeader(){
  const el = document.getElementById('site-header');
  if(!el) return;
  const hasOther = typeof PRODUCTS !== 'undefined' && typeof isOtherProduct === 'function' && PRODUCTS.some(isOtherProduct);
  const links = [
    { key:'/', href:'/', label:'Accueil' },
    { key:'bois', href:'/pages/produits', label:'Bois de chauffage' },
    { key:'packs', href:'/pages/produits?cat=packs', label:'Packs hiver' },
    ...(hasOther ? [{ key:'autres', href:'/pages/produits?cat=autres', label:'Autres catégories' }] : []),
    { key:'/pages/devis', href:'/pages/devis', label:'Devis gratuit' },
    { key:'/pages/suivi', href:'/pages/suivi', label:'Suivi de commande' },
    { key:'/pages/contact', href:'/pages/contact', label:'Contact' }
  ];
  const navHtml = links.map(l => `<a href="${l.href}" data-nav="${l.key}">${l.label}</a>`).join('');

  el.innerHTML = `
    <div class="header-bar">
      <a href="/" class="brand" aria-label="WooExtractor — accueil">
        <img src="/assets/img/logo.png" alt="WooExtractor — Bois de chauffage, tracteurs, produits agricoles" class="brand-logo" width="64" height="59">
      </a>
      <nav class="main-nav" id="main-nav">${navHtml}</nav>
      <div class="header-actions">
        <button class="nav-toggle" id="nav-toggle" aria-label="Ouvrir le menu" aria-expanded="false"><span></span></button>
        <a href="/pages/panier" class="cart-link" aria-label="Voir le panier">
          ${ICONS.cart}
          <span class="cart-badge" id="cart-badge">0</span>
        </a>
      </div>
    </div>`;
  updateNavActive();
  window.addEventListener('dd-route-changed', updateNavActive);
  window.addEventListener('popstate', updateNavActive);

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
  const hasOther = typeof PRODUCTS !== 'undefined' && typeof isOtherProduct === 'function' && PRODUCTS.some(isOtherProduct);
  el.innerHTML = `
    <div class="wrap">
      <div class="footer-grid">
        <div>
          <a href="/" class="footer-brand" aria-label="WooExtractor — accueil"><img src="/assets/img/logo.png" alt="WooExtractor" class="footer-logo" width="110" height="102" loading="lazy"></a>
          <p>Bois de chauffage, packs d'hiver et allumage sélectionnés pour tenir toute la saison froide.</p>
        </div>
        <div>
          <h4>Boutique</h4>
          <ul>
            <li><a href="/pages/produits">Bois de chauffage</a></li>
            <li><a href="/pages/produits?cat=packs">Packs &amp; offres</a></li>
            ${hasOther ? '<li><a href="/pages/produits?cat=autres">Autres catégories</a></li>' : ''}
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
  try{ renderHeader(); }catch(err){ console.error('Erreur en-tête :', err); }
  try{ renderFooter(); }catch(err){ console.error('Erreur pied de page :', err); }
  try{ renderWhatsAppChat(); }catch(err){ console.error('Erreur WhatsApp :', err); }
});
