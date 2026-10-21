/* ==========================================================================
   Page détail produit : /pages/produit?id=N
   Galerie, zoom (lightbox), ajout au panier, badges de confiance, recommandations.
   ========================================================================== */

function esc(s){
  return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ---------- Lightbox avec zoom ---------- */
const Zoom = {
  el:null, img:null, list:[], index:0, alt:'',
  scale:1, tx:0, ty:0, pointers:new Map(), startDist:0, startScale:1, drag:null, lastTap:0,

  open(list, index, alt){
    this.list = list; this.index = index; this.alt = alt;
    if(!this.el) this.build();
    this.el.hidden = false;
    document.body.style.overflow = 'hidden';
    this.show();
    this.el.querySelector('.zoom-close').focus();
  },
  close(){
    if(!this.el) return;
    this.el.hidden = true;
    document.body.style.overflow = '';
  },
  build(){
    const el = document.createElement('div');
    el.className = 'zoom-overlay';
    el.hidden = true;
    el.setAttribute('role','dialog');
    el.setAttribute('aria-modal','true');
    el.setAttribute('aria-label','Zoom sur la photo du produit');
    el.innerHTML = `
      <div class="zoom-stage"><img class="zoom-img" alt="" draggable="false"></div>
      <div class="zoom-bar">
        <button type="button" class="zoom-btn zoom-out" aria-label="Dézoomer">−</button>
        <button type="button" class="zoom-btn zoom-in" aria-label="Zoomer">+</button>
        <button type="button" class="zoom-btn zoom-reset" aria-label="Taille d'origine">1:1</button>
      </div>
      <button type="button" class="zoom-btn zoom-close" aria-label="Fermer">×</button>
      <button type="button" class="zoom-btn zoom-nav zoom-prev" aria-label="Photo précédente">‹</button>
      <button type="button" class="zoom-btn zoom-nav zoom-next" aria-label="Photo suivante">›</button>
      <span class="zoom-count"></span>`;
    document.body.appendChild(el);
    this.el = el; this.img = el.querySelector('.zoom-img');
    const stage = el.querySelector('.zoom-stage');

    el.querySelector('.zoom-close').addEventListener('click', () => this.close());
    el.querySelector('.zoom-in').addEventListener('click', () => this.setScale(this.scale * 1.5));
    el.querySelector('.zoom-out').addEventListener('click', () => this.setScale(this.scale / 1.5));
    el.querySelector('.zoom-reset').addEventListener('click', () => this.setScale(1));
    el.querySelector('.zoom-prev').addEventListener('click', () => this.go(-1));
    el.querySelector('.zoom-next').addEventListener('click', () => this.go(1));
    stage.addEventListener('click', e => { if(e.target === stage) this.close(); });
    stage.addEventListener('wheel', e => { e.preventDefault(); this.setScale(this.scale * (e.deltaY < 0 ? 1.2 : 1/1.2)); }, { passive:false });
    stage.addEventListener('dblclick', () => this.setScale(this.scale > 1 ? 1 : 2.5));

    stage.addEventListener('pointerdown', e => {
      stage.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x:e.clientX, y:e.clientY });
      if(this.pointers.size === 2){
        const [a,b] = [...this.pointers.values()];
        this.startDist = Math.hypot(a.x-b.x, a.y-b.y); this.startScale = this.scale; this.drag = null;
      } else {
        this.drag = { x:e.clientX, y:e.clientY, tx:this.tx, ty:this.ty };
        const now = Date.now();
        if(e.pointerType === 'touch' && now - this.lastTap < 300) this.setScale(this.scale > 1 ? 1 : 2.5);
        this.lastTap = now;
      }
    });
    stage.addEventListener('pointermove', e => {
      if(!this.pointers.has(e.pointerId)) return;
      this.pointers.set(e.pointerId, { x:e.clientX, y:e.clientY });
      if(this.pointers.size === 2){
        const [a,b] = [...this.pointers.values()];
        this.setScale(this.startScale * Math.hypot(a.x-b.x, a.y-b.y) / this.startDist);
      } else if(this.drag && this.scale > 1){
        this.tx = this.drag.tx + (e.clientX - this.drag.x);
        this.ty = this.drag.ty + (e.clientY - this.drag.y);
        this.apply();
      }
    });
    const end = e => { this.pointers.delete(e.pointerId); this.drag = null; };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);

    document.addEventListener('keydown', e => {
      if(this.el.hidden) return;
      if(e.key === 'Escape') this.close();
      else if(e.key === 'ArrowRight') this.go(1);
      else if(e.key === 'ArrowLeft') this.go(-1);
      else if(e.key === '+' || e.key === '=') this.setScale(this.scale * 1.5);
      else if(e.key === '-') this.setScale(this.scale / 1.5);
    });
  },
  go(step){
    if(this.list.length < 2) return;
    this.index = (this.index + step + this.list.length) % this.list.length;
    this.show();
  },
  show(){
    this.scale = 1; this.tx = 0; this.ty = 0;
    this.img.src = this.list[this.index];
    this.img.alt = this.alt;
    const multi = this.list.length > 1;
    this.el.querySelectorAll('.zoom-nav').forEach(b => b.hidden = !multi);
    this.el.querySelector('.zoom-count').textContent = multi ? `${this.index + 1} / ${this.list.length}` : '';
    this.apply();
  },
  setScale(s){
    this.scale = Math.min(5, Math.max(1, s));
    if(this.scale === 1){ this.tx = 0; this.ty = 0; }
    this.apply();
  },
  apply(){
    const w = this.img.clientWidth, h = this.img.clientHeight;
    const maxX = Math.max(0, (w * this.scale - w) / 2), maxY = Math.max(0, (h * this.scale - h) / 2);
    this.tx = Math.min(maxX, Math.max(-maxX, this.tx));
    this.ty = Math.min(maxY, Math.max(-maxY, this.ty));
    this.img.style.transform = `translate(${this.tx}px, ${this.ty}px) scale(${this.scale})`;
    this.img.classList.toggle('zoomed', this.scale > 1);
  }
};

/* ---------- Page ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('product-detail');
  if(!root) return;
  const p = getProductById(new URLSearchParams(window.location.search).get('id'));

  if(!p){
    document.title = 'Produit introuvable — WooExtractor';
    root.innerHTML = `<div class="empty-state" style="margin:48px 0;">
      <h2>Produit introuvable</h2>
      <p style="margin:10px 0 20px;">Ce produit n'existe pas ou n'est plus disponible.</p>
      <a class="btn btn-primary" href="/pages/produits">Voir les produits</a></div>`;
    return;
  }

  const other = isOtherProduct(p);
  const photos = p.media.type === 'photo' ? (p.media.gallery && p.media.gallery.length ? p.media.gallery : [p.media.src]) : [];
  const catLabel = getCategoryLabel(p.category);
  const groupHref = other ? '/pages/produits?cat=autres' : '/pages/produits';
  const groupLabel = other ? 'Autres catégories' : 'Bois de chauffage';
  const stockText = `En stock — ${p.stock} disponible${p.stock > 1 ? 's' : ''}`;
  const isUsed = p.badge === 'Occasion';
  const absUrl = u => /^https?:\/\//i.test(u) ? u : 'https://wooextractor.com' + u;

  // --- SEO
  document.title = `${p.name} — WooExtractor`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if(metaDesc) metaDesc.setAttribute('content', p.desc.slice(0, 155));
  const canonical = document.querySelector('link[rel="canonical"]');
  if(canonical) canonical.setAttribute('href', `https://wooextractor.com/pages/produit?id=${p.id}`);
  const ld = document.createElement('script');
  ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({
    '@context':'https://schema.org', '@type':'Product', name:p.name, description:p.desc,
    sku:String(p.id),
    brand:{ '@type':'Brand', name:p.brand || 'WooExtractor' },
    category:catLabel,
    ...(photos.length ? { image: photos.map(absUrl) } : {}),
    offers:{ '@type':'Offer', priceCurrency:'EUR', price:p.price.toFixed(2),
      availability:'https://schema.org/InStock',
      itemCondition: isUsed ? 'https://schema.org/UsedCondition' : 'https://schema.org/NewCondition',
      url:`https://wooextractor.com/pages/produit?id=${p.id}` }
  });
  document.head.appendChild(ld);

  // --- Galerie
  let galleryHtml;
  if(photos.length){
    galleryHtml = `
      <div class="pd-gallery">
        <button type="button" class="pd-main" id="pd-main" aria-label="Agrandir la photo">
          <img src="${photos[0]}" alt="${esc(p.media.alt)}" id="pd-main-img">
          <span class="pd-zoom-hint">${ICONS.search || ''}<span>Agrandir</span></span>
        </button>
        ${photos.length > 1 ? `<div class="pd-thumbs">${photos.map((u,i) =>
          `<button type="button" class="pd-thumb${i === 0 ? ' active' : ''}" data-i="${i}" aria-label="Voir la photo ${i+1}"><img src="${u}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
      </div>`;
  } else {
    galleryHtml = `<div class="pd-gallery"><div class="pd-main pd-icon">${ICONS[p.media.icon] || ''}</div></div>`;
  }

  // --- Badges de confiance (uniquement des engagements déjà affichés sur le site)
  const trust = [
    { icon:'truck',   t:'Livraison en France métropolitaine', s:`Offerte dès ${formatPrice(FREE_SHIPPING_THRESHOLD)}, ${formatPrice(SHIPPING_FLAT)} sinon` },
    { icon:'shield',  t:'Paiement sécurisé', s:'Carte bancaire, virement ou cryptomonnaie' },
    { icon:'headset', t:'Service client réactif', s:'Du lundi au vendredi, 9h – 18h' },
    { icon:'pin',     t:'Vendeur basé en France', s:'WooExtractor — Vred (59)' }
  ];
  const trustHtml = trust.map(b => `
    <li><span class="pd-trust-icon">${ICONS[b.icon] || ''}</span><span><strong>${b.t}</strong><small>${b.s}</small></span></li>`).join('');

  root.innerHTML = `
    <nav class="pd-crumbs" aria-label="Fil d'Ariane">
      <a href="/">Accueil</a><span>/</span><a href="${groupHref}">${groupLabel}</a><span>/</span>
      <a href="/pages/produits?cat=${p.category}">${catLabel}</a><span>/</span><span aria-current="page">${p.name}</span>
    </nav>
    <div class="pd-grid">
      ${galleryHtml}
      <div class="pd-info">
        ${p.badge ? `<span class="product-badge" style="position:static;display:inline-block;width:max-content;">${p.badge}</span>` : ''}
        <span class="product-cat">${catLabel}</span>
        <h1 class="pd-title">${p.name}</h1>
        <div class="pd-price">${formatPrice(p.price)} <small>/ ${p.unit}</small></div>
        <span class="product-stock">${stockText}</span>
        <p class="pd-desc">${p.desc}</p>
        <div class="pd-buy">
          <div class="qty-stepper">
            <button type="button" id="pd-minus" aria-label="Diminuer la quantité">−</button>
            <input type="number" id="pd-qty" value="1" min="1" max="${p.stock}" aria-label="Quantité">
            <button type="button" id="pd-plus" aria-label="Augmenter la quantité">+</button>
          </div>
          <button type="button" class="btn btn-primary pd-add" id="pd-add">Ajouter au panier</button>
        </div>
        <ul class="pd-trust">${trustHtml}</ul>
        <table class="legal-table pd-specs">
          <tr><td>Catégorie</td><td>${catLabel}</td></tr>
          <tr><td>Vendu par</td><td>${p.unit}</td></tr>
          <tr><td>Disponibilité</td><td>${stockText}</td></tr>
        </table>
      </div>
    </div>
    <section class="pd-reco" id="pd-reco"></section>`;

  // --- Zoom + miniatures
  const mainBtn = document.getElementById('pd-main');
  if(mainBtn){
    let current = 0;
    const mainImg = document.getElementById('pd-main-img');
    mainBtn.addEventListener('click', () => Zoom.open(photos, current, p.media.alt));
    root.querySelectorAll('.pd-thumb').forEach(t => t.addEventListener('click', () => {
      current = Number(t.getAttribute('data-i'));
      mainImg.src = photos[current];
      root.querySelectorAll('.pd-thumb').forEach(x => x.classList.toggle('active', x === t));
    }));
  }

  // --- Quantité + panier
  const qty = document.getElementById('pd-qty');
  const clamp = () => { qty.value = Math.min(p.stock, Math.max(1, parseInt(qty.value, 10) || 1)); };
  document.getElementById('pd-minus').addEventListener('click', () => { qty.value = Number(qty.value) - 1; clamp(); });
  document.getElementById('pd-plus').addEventListener('click', () => { qty.value = Number(qty.value) + 1; clamp(); });
  qty.addEventListener('change', clamp);
  const addBtn = document.getElementById('pd-add');
  addBtn.addEventListener('click', () => {
    clamp();
    Cart.add(p.id, Number(qty.value));
    addBtn.textContent = 'Ajouté';
    showToast(`${p.name} ajouté au panier`);
    setTimeout(() => { addBtn.textContent = 'Ajouter au panier'; }, 1400);
  });

  // --- Produits recommandés : même univers (bois / autres), même catégorie d'abord, puis prix proche
  const reco = PRODUCTS
    .filter(q => q.id !== p.id && isOtherProduct(q) === other)
    .sort((a, b) => ((b.category === p.category) - (a.category === p.category)) || (Math.abs(a.price - p.price) - Math.abs(b.price - p.price)))
    .slice(0, 4);
  const recoEl = document.getElementById('pd-reco');
  if(reco.length){
    recoEl.innerHTML = `<h2>Produits recommandés</h2><div class="product-grid">${reco.map(productCardHtml).join('')}</div>`;
    attachAddToCartHandlers(recoEl);
  }
});
