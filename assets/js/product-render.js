/* ==========================================================================
   Rendu partagé : icônes, carte produit, ajout au panier.
   Utilisé par la page d'accueil et le catalogue.
   ========================================================================== */

function hydrateIcons(root = document){
  root.querySelectorAll('[data-icon]').forEach(el => {
    const key = el.getAttribute('data-icon');
    if(ICONS[key]) el.outerHTML = ICONS[key];
  });
}

function productMediaHtml(product){
  if(product.media.type === 'photo'){
    const gallery = product.media.gallery;
    if(gallery && gallery.length > 1){
      return `<div class="product-media has-gallery" data-index="0">
        <img src="${gallery[0]}" alt="${product.media.alt}" loading="lazy">
        <button class="gal-btn gal-prev" type="button" aria-label="Photo précédente">‹</button>
        <button class="gal-btn gal-next" type="button" aria-label="Photo suivante">›</button>
        <span class="gal-count">1 / ${gallery.length}</span>
      </div>`;
    }
    return `<div class="product-media"><img src="${product.media.src}" alt="${product.media.alt}" loading="lazy"></div>`;
  }
  return `<div class="product-media icon-media">${ICONS[product.media.icon] || ''}</div>`;
}

function productCardHtml(product){
  return `
  <article class="product-card" data-id="${product.id}">
    ${productMediaHtml(product)}
    <div class="product-body">
      ${product.badge ? `<span class="product-badge" style="position:static;display:inline-block;width:max-content;margin-bottom:2px;">${product.badge}</span>` : ''}
      <span class="product-cat">${getCategoryLabel(product.category)}</span>
      <h3 class="product-name">${product.name}</h3>
      <p class="product-desc">${product.desc}</p>
      <span class="product-stock">En stock — ${product.stock} disponibles</span>
      <div class="product-foot">
        <span class="product-price">${formatPrice(product.price)}<br><small>/ ${product.unit}</small></span>
        <button class="add-btn" type="button" data-add="${product.id}">Ajouter au panier</button>
      </div>
    </div>
  </article>`;
}

function attachAddToCartHandlers(root = document){
  root.querySelectorAll('[data-add]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-add'));
      const product = getProductById(id);
      Cart.add(id, 1);
      btn.textContent = 'Ajouté';
      btn.classList.add('added');
      showToast(`${product.name} ajouté au panier`);
      setTimeout(() => { btn.textContent = 'Ajouter au panier'; btn.classList.remove('added'); }, 1400);
    });
  });
}

function renderCategoryStrip(containerId){
  const el = document.getElementById(containerId);
  if(!el) return;
  el.innerHTML = CATEGORIES.map(cat => {
    const img = cat.img || 'https://images.pexels.com/photos/6089/wood-forest-stem-logger.jpg?auto=compress&cs=tinysrgb&w=700';
    return `
    <a class="cat-tile" href="/pages/produits?cat=${cat.key}">
      <img src="${img}" alt="${cat.label}" loading="lazy">
      <span class="cat-tile-label"><span>${cat.label}</span><small>${cat.short}</small></span>
    </a>`;
  }).join('');
}

// Galerie photo des cartes produit (produits avec media.gallery)
document.addEventListener('click', e => {
  const btn = e.target.closest('.gal-btn');
  if(!btn) return;
  const media = btn.closest('.product-media');
  const card = btn.closest('.product-card');
  const product = card && getProductById(card.getAttribute('data-id'));
  const gallery = product && product.media.gallery;
  if(!gallery) return;
  const step = btn.classList.contains('gal-next') ? 1 : -1;
  const index = (Number(media.getAttribute('data-index')) + step + gallery.length) % gallery.length;
  media.setAttribute('data-index', index);
  media.querySelector('img').src = gallery[index];
  media.querySelector('.gal-count').textContent = `${index + 1} / ${gallery.length}`;
});
