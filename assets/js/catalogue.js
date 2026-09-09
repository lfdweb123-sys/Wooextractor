document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const state = {
    category: params.get('cat') || 'all',
    query: '',
    sort: 'default'
  };

  const filterRow = document.getElementById('filter-row');
  const grid = document.getElementById('product-grid');
  const emptyState = document.getElementById('empty-state');
  const resultCount = document.getElementById('result-count');
  const searchInput = document.getElementById('search-input');
  const sortSelect = document.getElementById('sort-select');

  function renderChips(){
    const chips = [{ key:'all', label:'Tous les produits' }, ...CATEGORIES.map(c => ({ key:c.key, label:c.label }))];
    filterRow.innerHTML = chips.map(c =>
      `<button type="button" class="filter-chip${state.category === c.key ? ' active' : ''}" data-cat="${c.key}">${c.label}</button>`
    ).join('');
    filterRow.querySelectorAll('.filter-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        state.category = btn.getAttribute('data-cat');
        const url = new URL(window.location);
        if(state.category === 'all'){ url.searchParams.delete('cat'); } else { url.searchParams.set('cat', state.category); }
        history.replaceState({}, '', url);
        renderChips();
        renderGrid();
      });
    });
  }

  function getFiltered(){
    let list = PRODUCTS.filter(p => state.category === 'all' || p.category === state.category);
    if(state.query.trim()){
      const q = state.query.trim().toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q));
    }
    if(state.sort === 'price-asc') list = [...list].sort((a,b) => a.price - b.price);
    if(state.sort === 'price-desc') list = [...list].sort((a,b) => b.price - a.price);
    if(state.sort === 'name-asc') list = [...list].sort((a,b) => a.name.localeCompare(b.name, 'fr'));
    return list;
  }

  function renderGrid(){
    const list = getFiltered();
    resultCount.textContent = `${list.length} produit${list.length > 1 ? 's' : ''}`;
    if(list.length === 0){
      grid.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';
    grid.innerHTML = list.map(productCardHtml).join('');
    attachAddToCartHandlers(grid);
  }

  searchInput.addEventListener('input', () => { state.query = searchInput.value; renderGrid(); });
  sortSelect.addEventListener('change', () => { state.sort = sortSelect.value; renderGrid(); });

  renderChips();
  renderGrid();
});
