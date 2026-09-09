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
