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

  /* ============================================================
     Vérification e-mail par code OTP (4 chiffres)
     Utilisée pour les modes "transfer" et "later".
     ============================================================ */
  const otpBlock = document.getElementById('otp-block');
  const otpCodeInput = document.getElementById('otp-code');
  const otpResendBtn = document.getElementById('otp-resend');
  const otpHint = document.getElementById('otp-hint');
  const otpError = document.getElementById('otp-error');

  let otpToken = null;
  let otpEmail = null;
  let otpResendTimer = null;

  function resetOtpUi(){
    if(otpBlock) otpBlock.style.display = 'none';
    if(otpCodeInput) otpCodeInput.value = '';
    if(otpError){ otpError.textContent = ''; otpError.style.display = 'none'; }
    if(otpResendBtn){ otpResendBtn.disabled = false; otpResendBtn.textContent = 'Renvoyer le code'; }
    if(otpResendTimer){ clearInterval(otpResendTimer); otpResendTimer = null; }
    otpToken = null;
    otpEmail = null;
  }

  function startResendCooldown(seconds){
    let remaining = seconds;
    otpResendBtn.disabled = true;
    otpResendBtn.textContent = `Renvoyer le code (${remaining}s)`;
    otpResendTimer = setInterval(() => {
      remaining -= 1;
      if(remaining <= 0){
        clearInterval(otpResendTimer);
        otpResendTimer = null;
        otpResendBtn.disabled = false;
        otpResendBtn.textContent = 'Renvoyer le code';
      } else {
        otpResendBtn.textContent = `Renvoyer le code (${remaining}s)`;
      }
    }, 1000);
  }

  async function sendOtpCode(email){
    const res = await fetch('/api/otp-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json().catch(() => ({}));
    if(!res.ok || !data.token){
      throw new Error(data.message || "Impossible d'envoyer le code de vérification.");
    }
    otpToken = data.token;
    otpEmail = email;
    return data.token;
  }

  async function verifyOtpCode(code){
    const res = await fetch('/api/otp-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: otpToken, code })
    });
    const data = await res.json().catch(() => ({}));
    if(!res.ok || !data.ok){
      throw new Error(data.message || 'Code incorrect.');
    }
    return true;
  }

  /**
   * Demande l'envoi d'un code, affiche le bloc OTP et attend la saisie.
   * Retourne une promesse résolue quand le code est vérifié.
   * Rejette en cas d'erreur ou d'annulation.
   */
  async function requestEmailVerification(email){
    await sendOtpCode(email);

    if(otpBlock){
      otpBlock.style.display = 'block';
      otpHint.textContent = `Un code à 4 chiffres a été envoyé à ${email}. Il est valable 10 minutes.`;
      otpError.style.display = 'none';
      otpCodeInput.value = '';
      otpCodeInput.focus();
    }
    startResendCooldown(30);

    // Le code est validé via le bouton dédié dans le bloc OTP.
    // On retourne une promesse qui sera résolue par le handler du bouton.
    return new Promise((resolve, reject) => {
      const validateBtn = document.getElementById('otp-validate');
      const onValidate = async () => {
        const code = (otpCodeInput.value || '').trim();
        if(!/^\d{4}$/.test(code)){
          otpError.textContent = 'Saisissez les 4 chiffres du code.';
          otpError.style.display = 'block';
          return;
        }
        validateBtn.disabled = true;
        validateBtn.textContent = 'Vérification…';
        try{
          await verifyOtpCode(code);
          cleanup();
          resolve(true);
        }catch(err){
          otpError.textContent = err.message;
          otpError.style.display = 'block';
          validateBtn.disabled = false;
          validateBtn.textContent = 'Valider le code';
        }
      };
      const onResend = async () => {
        try{
          await sendOtpCode(otpEmail);
          otpHint.textContent = `Un nouveau code a été envoyé à ${otpEmail}.`;
          otpError.style.display = 'none';
          otpCodeInput.value = '';
          otpCodeInput.focus();
          startResendCooldown(30);
        }catch(err){
          otpError.textContent = err.message;
          otpError.style.display = 'block';
        }
      };
      const onCancel = () => {
        cleanup();
        reject(new Error('Vérification annulée.'));
      };
      function cleanup(){
        validateBtn.removeEventListener('click', onValidate);
        otpResendBtn.removeEventListener('click', onResend);
      }
      document.getElementById('otp-validate').addEventListener('click', onValidate);
      otpResendBtn.addEventListener('click', onResend);
      // Pas de bouton annuler dédié, mais on peut en ajouter un si besoin
    });
  }

  /* ============================================================
     Soumission du formulaire
     ============================================================ */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMsg();
    resetOtpUi();

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
    // Vérification de l'e-mail par code OTP avant d'enregistrer la commande.
    submitBtn.textContent = 'Vérification de l\'e-mail…';
    try{
      await requestEmailVerification(customer.email);
    }catch(err){
      setMsg(err.message || 'La vérification de l\'e-mail a échoué.', 'error');
      resetSubmitButton();
      return;
    }

    // À ce stade, l'e-mail est vérifié : on enregistre la commande.
    order.status = paymentMethod === 'transfer' ? 'attente_virement' : 'en_attente_lien_paiement';
    Orders.create(order);
    Cart.clear();
    notifyMerchant(order);
    window.location.href = `/pages/order-success?order_id=${encodeURIComponent(order.id)}`;
  });

  // Reset du bloc OTP quand on change de mode de paiement
  payOptions.forEach(opt => opt.addEventListener('click', resetOtpUi));
});
