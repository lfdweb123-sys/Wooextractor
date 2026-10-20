/* Formulaire de demande de devis gratuit (page d'accueil et page /pages/devis). */
(function(){
  const form = document.getElementById('quote-form');
  if(!form) return;

  const select = document.getElementById('q-product');
  const msg = document.getElementById('quote-msg');
  const submitBtn = document.getElementById('quote-submit');

  /* Liste des produits, regroupés par catégorie */
  if(select && typeof PRODUCTS !== 'undefined'){
    let html = '<option value="">Choisir un produit</option>';
    (typeof CATEGORIES !== 'undefined' ? CATEGORIES : []).forEach(cat => {
      const items = PRODUCTS.filter(p => p.category === cat.key);
      if(!items.length) return;
      html += `<optgroup label="${cat.label}">` + items.map(p => `<option value="${p.name.replace(/"/g,'&quot;')}">${p.name}</option>`).join('') + '</optgroup>';
    });
    html += '<option value="Plusieurs produits">Plusieurs produits (précisez dans le message)</option>';
    select.innerHTML = html;
    const wanted = new URLSearchParams(window.location.search).get('produit');
    if(wanted){
      const p = PRODUCTS.find(x => String(x.id) === wanted);
      if(p) select.value = p.name;
    }
  }

  function setMsg(text, type){
    msg.textContent = text;
    msg.className = 'form-msg show ' + type;
  }

  function validate(){
    let ok = true;
    form.querySelectorAll('.form-field[data-required]').forEach(field => {
      const input = field.querySelector('input,select,textarea');
      let valid = !!input.value.trim();
      if(valid && input.type === 'email') valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
      if(valid && input.type === 'tel') valid = input.value.replace(/[^\d]/g,'').length >= 8;
      field.classList.toggle('invalid', !valid);
      if(!valid) ok = false;
    });
    return ok;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.className = 'form-msg';
    if(!validate()){
      setMsg('Merci de compléter les champs indiqués.', 'error');
      return;
    }
    const data = Object.fromEntries(new FormData(form).entries());
    submitBtn.disabled = true;
    const label = submitBtn.textContent;
    submitBtn.textContent = 'Envoi en cours…';
    try{
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const out = await res.json().catch(() => ({}));
      if(!res.ok) throw new Error(out.message || "Impossible d'envoyer la demande pour le moment.");
      const holder = form.parentElement;
      holder.innerHTML = `
        <div class="quote-success" role="status">
          <div class="check">${ICONS.check}</div>
          <h3 class="font-display" style="font-size:1.3rem;margin-bottom:8px;">Demande envoyée</h3>
          <p>Merci, nous revenons vers vous très rapidement avec votre devis gratuit. Un e-mail de confirmation vient de vous être envoyé.</p>
        </div>`;
      if(typeof gtag === 'function') gtag('event', 'generate_lead', { currency: 'EUR' });
    }catch(err){
      setMsg(err.message + ' Vous pouvez aussi nous écrire sur WhatsApp au +33 7 59 30 92 00.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = label;
    }
  });

  form.addEventListener('input', e => {
    const field = e.target.closest('.form-field');
    if(field) field.classList.remove('invalid');
  });
})();
