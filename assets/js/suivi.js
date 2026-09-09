document.addEventListener('DOMContentLoaded', () => {
  const list = Orders.all();
  const listEl = document.getElementById('orders-list');
  const emptyEl = document.getElementById('orders-empty');

  if(list.length === 0){
    emptyEl.style.display = 'block';
  }else{
    listEl.innerHTML = list.map(orderCardHtml).join('');
  }

  const input = document.getElementById('track-input');
  const btn = document.getElementById('track-btn');
  const result = document.getElementById('track-result');

  function search(){
    const id = input.value.trim().toUpperCase();
    if(!id){ result.innerHTML = ''; return; }
    const order = Orders.get(id);
    if(order){
      result.innerHTML = `<div style="margin-bottom:32px;">${orderCardHtml(order)}</div>`;
    }else{
      result.innerHTML = `<div class="form-msg show info" style="margin-bottom:32px;">Aucune commande ${id} trouvée sur cet appareil. Vérifiez le numéro ou consultez la liste ci-dessous.</div>`;
    }
  }

  btn.addEventListener('click', search);
  input.addEventListener('keydown', (e) => { if(e.key === 'Enter') search(); });
});
