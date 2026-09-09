document.addEventListener('DOMContentLoaded', () => {
  hydrateIcons();

  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('order_id') || Orders.pendingId();
  const order = orderId ? Orders.get(orderId) : null;

  const found = document.getElementById('confirm-found');
  const fallback = document.getElementById('confirm-fallback');

  if(!order){
    found.style.display = 'none';
    fallback.style.display = 'block';
    return;
  }

  /* Seule la cryptomonnaie redirige vers un prestataire externe : c'est donc
     le seul cas où le statut doit être déduit du retour de redirection. Pour
     carte / virement / commande sans paiement, le statut a déjà été fixé par
     checkout.js avant la redirection interne. */
  if(order.paymentMethod === 'crypto'){
    const failureIndicators = ['failed', 'cancelled', 'canceled', 'expired'];
    const statusParam = (params.get('status') || params.get('payment_status') || '').toLowerCase();
    const failed = failureIndicators.includes(statusParam);
    Orders.update(order.id, { status: failed ? 'erreur_paiement' : 'payee' });
    if(!failed){ Cart.clear(); }
  }
  Orders.clearPending();

  const refreshed = Orders.get(order.id);
  fallback.style.display = 'none';
  found.style.display = 'block';
  document.getElementById('order-summary').innerHTML = orderCardHtml(refreshed);

  const title = found.querySelector('h1');
  const intro = found.querySelector('.confirm-hero p');
  const noteBox = document.getElementById('confirm-note');

  if(refreshed.status === 'erreur_paiement'){
    title.textContent = 'Le paiement n\'a pas abouti';
    intro.textContent = 'Votre commande reste enregistrée sur cet appareil. Vous pouvez réessayer le paiement depuis votre panier.';
  }else if(refreshed.paymentMethod === 'transfer'){
    title.textContent = 'Commande enregistrée — virement à effectuer';
    intro.textContent = 'Votre commande sera préparée dès réception du virement. Utilisez les coordonnées bancaires ci-dessous.';
    noteBox.style.display = 'block';
    noteBox.innerHTML = `
      <h3 style="font-size:1rem;margin-bottom:10px;">Coordonnées bancaires</h3>
      <table class="legal-table">
        <tr><td>Bénéficiaire</td><td>Bridge Building Sp. Z.o.o.</td></tr>
        <tr><td>Banque</td><td>Banking Circle S.A.</td></tr>
        <tr><td>IBAN</td><td>LU034080000029652683</td></tr>
        <tr><td>BIC / SWIFT</td><td>BCIRLULL</td></tr>
      </table>
      <p style="font-size:0.82rem;margin-top:10px;">Merci d'indiquer le numéro <strong>${refreshed.id}</strong> en référence du virement.</p>`;
  }else if(refreshed.paymentMethod === 'later'){
    title.textContent = 'Commande enregistrée';
    intro.textContent = 'Aucun paiement n\'a été demandé pour le moment.';
    noteBox.style.display = 'block';
    noteBox.innerHTML = `<p>Nous allons vous envoyer un lien de paiement sécurisé Payoneer par e-mail à <strong>${refreshed.customer.email}</strong> afin de finaliser le règlement de votre commande.</p>`;
  }
});
