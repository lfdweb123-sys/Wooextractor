const COUNTRY_ISO = { France: 'FR', Belgique: 'BE', Suisse: 'CH', Luxembourg: 'LU' };

document.addEventListener('DOMContentLoaded', () => {
  hydrateIcons();

  const lines = Cart.lines();
  const emptyEl = document.getElementById('checkout-empty');
  const form = document.getElementById('checkout-form');

  if(lines.length === 0){
    emptyEl.style.display = 'block';
    form.style.display = 'none';
    return;
  }
  emptyEl.style.display = 'none';
  form.style.display = 'grid';

  document.getElementById('checkout-items').innerHTML = lines.map(l => `
    <div class="summary-row"><span>${l.qty} × ${l.product.name}</span><span>${formatPrice(l.lineTotal)}</span></div>
  `).join('');
  document.getElementById('co-subtotal').textContent = formatPrice(Cart.subtotal());
  const shippingCost = Cart.shipping();
  document.getElementById('co-shipping').textContent = shippingCost === 0 ? 'Offerte' : formatPrice(shippingCost);
  document.getElementById('co-total').textContent = formatPrice(Cart.total());

  /* ---- Sélection du mode de paiement ---- */
  const payOptions = document.querySelectorAll('.pay-option');
  const cryptoSelect = document.getElementById('crypto-select');
  const bankDetails = document.getElementById('bank-details');
  const submitBtn = document.getElementById('submit-btn');

  function currentMethod(){
    return document.querySelector('input[name=payment]:checked').value;
  }
  function syncPayOptions(){
    payOptions.forEach(opt => opt.classList.toggle('selected', opt.querySelector('input[type=radio]').checked));
    const method = currentMethod();
    cryptoSelect.style.display = method === 'crypto' ? 'block' : 'none';
    bankDetails.style.display = method === 'transfer' ? 'block' : 'none';
    submitBtn.textContent = (method === 'transfer' || method === 'later') ? 'Confirmer la commande' : 'Payer maintenant';
  }
  payOptions.forEach(opt => opt.addEventListener('click', () => {
    opt.querySelector('input[type=radio]').checked = true;
    syncPayOptions();
  }));
  syncPayOptions();

  /* ---- Champ carte Stripe ---- */
  let stripe = null, cardElement = null;
  (async function setupStripe(){
    try{
      const res = await fetch('/api/stripe-config');
      const data = await res.json();
      if(!res.ok || !data.publishableKey) throw new Error('missing key');
      stripe = Stripe(data.publishableKey);
      const elements = stripe.elements();
      cardElement = elements.create('card', {
        style: {
          base: { fontFamily: 'Inter, Arial, sans-serif', fontSize: '16px', color: '#201A15', '::placeholder': { color: '#8A7F72' } },
          invalid: { color: '#A8391B' }
        }
      });
      cardElement.mount('#card-element');
      cardElement.on('change', (event) => {
        document.getElementById('card-errors').textContent = event.error ? event.error.message : '';
      });
    }catch(err){
      console.error('Stripe indisponible :', err);
      const box = document.getElementById('card-element');
      if(box) box.innerHTML = '';
      document.getElementById('card-errors').textContent = 'Le paiement par carte est momentanément indisponible. Choisissez un autre mode de paiement.';
    }
  })();

  /* ---- Validation ---- */
  const requiredFields = ['firstname','lastname','email','phone','address','postcode','city'];
  function validate(){
    let valid = true;
    requiredFields.forEach(name => {
      const input = document.getElementById(name);
      const field = input.closest('.form-field');
      const filled = input.value.trim().length > 0;
      const okEmail = name !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
      const ok = filled && okEmail;
      field.classList.toggle('invalid', !ok);
      if(!ok) valid = false;
    });
    return valid;
  }

  const formMsg = document.getElementById('form-msg');
  function setMsg(text, type){ formMsg.textContent = text; formMsg.className = `form-msg show ${type}`; }
  function clearMsg(){ formMsg.className = 'form-msg'; }

  function resetSubmitButton(){
    submitBtn.disabled = false;
    syncPayOptions();
  }

  function notifyMerchant(order){
    fetch('/api/notify-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order })
    }).catch(err => console.warn('Notification marchand non envoyée :', err));
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMsg();

    if(!validate()){
      setMsg('Merci de compléter les champs de livraison en surbrillance avant de continuer.', 'error');
      return;
    }

    const customer = {
      firstname: document.getElementById('firstname').value.trim(),
      lastname: document.getElementById('lastname').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      address: document.getElementById('address').value.trim(),
      postcode: document.getElementById('postcode').value.trim(),
      city: document.getElementById('city').value.trim(),
      country: document.getElementById('country').value,
      note: document.getElementById('note').value.trim()
    };
    const paymentMethod = currentMethod();
    const cryptoCurrency = document.getElementById('crypto-currency').value;

    const order = {
      id: generateOrderId(),
      createdAt: Date.now(),
      status: 'en_attente_paiement',
      paymentMethod,
      cryptoCurrency: paymentMethod === 'crypto' ? cryptoCurrency : null,
      customer,
      items: lines.map(l => ({ id:l.product.id, name:l.product.name, unit:l.product.unit, qty:l.qty, unitPrice:l.product.price, lineTotal:l.lineTotal })),
      subtotal: Cart.subtotal(),
      shipping: Cart.shipping(),
      total: Cart.total()
    };

    submitBtn.disabled = true;

    /* ---- Carte bancaire (Stripe) ---- */
    if(paymentMethod === 'card'){
      if(!stripe || !cardElement){
        setMsg('Le paiement par carte est momentanément indisponible. Choisissez un autre mode de paiement.', 'error');
        resetSubmitButton();
        return;
      }
      submitBtn.textContent = 'Paiement en cours…';
      try{
        const itemsSummary = order.items.map(it => `${it.qty} x ${it.name}`).join('; ');
        const intentRes = await fetch('/api/stripe-create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: order.total, currency: 'EUR', order_id: order.id, customer,
            items: itemsSummary, subtotal: order.subtotal, shipping: order.shipping, total: order.total
          })
        });
        const intentData = await intentRes.json();
        if(!intentRes.ok || !intentData.clientSecret){
          throw new Error(intentData.message || 'Impossible d\'initialiser le paiement par carte.');
        }

        const result = await stripe.confirmCardPayment(intentData.clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: `${customer.firstname} ${customer.lastname}`,
              email: customer.email,
              phone: customer.phone,
              address: {
                line1: customer.address,
                postal_code: customer.postcode,
                city: customer.city,
                country: COUNTRY_ISO[customer.country] || 'FR'
              }
            }
          }
        });

        if(result.error) throw new Error(result.error.message);
        if(!result.paymentIntent || result.paymentIntent.status !== 'succeeded'){
          throw new Error('Le paiement n\'a pas pu être confirmé.');
        }

        order.status = 'payee';
        Orders.create(order);
        Cart.clear();
        window.location.href = `/pages/order-success?order_id=${encodeURIComponent(order.id)}`;

      }catch(err){
        console.error('Erreur de paiement carte :', err);
        setMsg(err.message || 'Le paiement par carte a échoué. Vérifiez vos informations ou réessayez.', 'error');
        resetSubmitButton();
      }
      return;
    }

    /* ---- Cryptomonnaie (NowPayments) ---- */
    if(paymentMethod === 'crypto'){
      submitBtn.textContent = 'Redirection vers le paiement…';
      Orders.create(order);
      try{
        const res = await fetch('/api/nowpayments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: order.total, currency: 'EUR', pay_currency: cryptoCurrency,
            order_id: order.id, order_description: `Commande ${order.id} — WooExtractor`, customer
          })
        });
        const data = await res.json();
        if(!res.ok || !data.invoice_url) throw new Error(data.message || 'Le service de paiement crypto n\'a pas répondu correctement.');

        notifyMerchant(order);
        window.location.href = data.invoice_url;

      }catch(err){
        console.error('Erreur de paiement crypto :', err);
        Orders.update(order.id, { status: 'erreur_paiement' });
        setMsg('Le paiement en cryptomonnaie n\'a pas pu être initié. Vérifiez votre connexion et réessayez, ou choisissez un autre mode de paiement.', 'error');
        resetSubmitButton();
      }
      return;
    }

    /* ---- Virement bancaire / commande sans paiement immédiat ---- */
    order.status = paymentMethod === 'transfer' ? 'attente_virement' : 'en_attente_lien_paiement';
    Orders.create(order);
    Cart.clear();
    notifyMerchant(order);
    window.location.href = `/pages/order-success?order_id=${encodeURIComponent(order.id)}`;
  });
});
