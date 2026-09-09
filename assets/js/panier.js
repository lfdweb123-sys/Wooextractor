function cartRowMediaHtml(product){
  if(product.media.type === 'photo'){
    return `<div class="thumb"><img src="${product.media.src}" alt="${product.media.alt}"></div>`;
  }
  return `<div class="thumb">${ICONS[product.media.icon] || ''}</div>`;
}

function renderCartPage(){
  const lines = Cart.lines();
  const empty = document.getElementById('cart-empty');
  const filled = document.getElementById('cart-filled');

  if(lines.length === 0){
    empty.style.display = 'block';
    filled.style.display = 'none';
    hydrateIcons(empty);
    return;
  }
  empty.style.display = 'none';
  filled.style.display = 'grid';

  const list = document.getElementById('cart-list');
  list.innerHTML = lines.map(l => `
    <div class="cart-row" data-id="${l.product.id}">
      ${cartRowMediaHtml(l.product)}
      <div>
        <div class="name">${l.product.name}</div>
        <div class="unit">${formatPrice(l.product.price)} / ${l.product.unit}</div>
      </div>
      <div class="qty-stepper">
        <button type="button" data-step="-1" aria-label="Diminuer la quantité">−</button>
        <input type="text" inputmode="numeric" value="${l.qty}" data-qty-input readonly>
        <button type="button" data-step="1" aria-label="Augmenter la quantité">+</button>
      </div>
      <div class="line-total">${formatPrice(l.lineTotal)}</div>
      <button class="remove-btn" type="button" data-remove>Retirer</button>
    </div>
  `).join('');

  list.querySelectorAll('.cart-row').forEach(row => {
    const id = Number(row.getAttribute('data-id'));
    const line = lines.find(l => l.product.id === id);
    row.querySelector('[data-step="-1"]').addEventListener('click', () => {
      const next = line.qty - 1;
      if(next <= 0){ Cart.remove(id); } else { Cart.setQty(id, next); }
      renderCartPage();
    });
    row.querySelector('[data-step="1"]').addEventListener('click', () => {
      Cart.setQty(id, line.qty + 1);
      renderCartPage();
    });
    row.querySelector('[data-remove]').addEventListener('click', () => {
      Cart.remove(id);
      showToast(`${line.product.name} retiré du panier`);
      renderCartPage();
    });
  });

  document.getElementById('sum-subtotal').textContent = formatPrice(Cart.subtotal());
  const shipping = Cart.shipping();
  document.getElementById('sum-shipping').textContent = shipping === 0 ? 'Offerte' : formatPrice(shipping);
  document.getElementById('sum-total').textContent = formatPrice(Cart.total());

  const hint = document.getElementById('shipping-hint');
  const remaining = FREE_SHIPPING_THRESHOLD - Cart.subtotal();
  hint.textContent = remaining > 0 ? `Plus que ${formatPrice(remaining)} pour la livraison offerte.` : 'Livraison offerte, vous y êtes.';
  hint.style.color = remaining > 0 ? 'var(--ink-soft)' : 'var(--moss)';
}

document.addEventListener('DOMContentLoaded', () => {
  renderCartPage();
  window.addEventListener('dd-cart-updated', renderCartPage);
});
