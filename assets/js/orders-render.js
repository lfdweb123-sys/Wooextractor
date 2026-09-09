function statusMeta(status){
  switch(status){
    case 'payee': return { label:'Paiement confirmé', cls:'status-paid' };
    case 'erreur_paiement': return { label:'Paiement échoué', cls:'status-failed' };
    case 'attente_virement': return { label:'En attente de virement', cls:'status-pending' };
    case 'en_attente_lien_paiement': return { label:'Lien de paiement à venir', cls:'status-pending' };
    default: return { label:'En attente de paiement', cls:'status-pending' };
  }
}

function orderCardHtml(order){
  const meta = statusMeta(order.status);
  const date = new Date(order.createdAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' });
  return `
  <div class="order-card">
    <div class="order-card-head">
      <div>
        <div class="order-id">${order.id}</div>
        <div class="order-date">Commande passée le ${date}</div>
      </div>
      <span class="status-pill ${meta.cls}">${meta.label}</span>
    </div>
    <div class="order-items">
      ${order.items.map(it => `<div class="order-item-row"><span>${it.qty} × ${it.name}</span><span>${formatPrice(it.lineTotal)}</span></div>`).join('')}
      <div class="order-item-row"><span>Livraison</span><span>${order.shipping === 0 ? 'Offerte' : formatPrice(order.shipping)}</span></div>
      <div class="order-item-row" style="font-weight:700;color:var(--ink);"><span>Total</span><span>${formatPrice(order.total)}</span></div>
    </div>
    <p style="font-size:0.82rem;margin-top:12px;">Livraison à : ${order.customer.firstname} ${order.customer.lastname}, ${order.customer.address}, ${order.customer.postcode} ${order.customer.city}</p>
  </div>`;
}
