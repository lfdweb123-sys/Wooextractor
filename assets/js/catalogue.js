document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const hasOther = PRODUCTS.some(isOtherProduct);

  // 'all'    = Bois de chauffage (toutes ses catégories, en sections)
  // 'autres' = Autres catégories (toutes, en sections)
  // sinon    = une catégorie précise
  let initial = params.get('cat') || 'all';
  const known = [...CATEGORIES, ...OTHER_CATEGORIES].map(c => c.key);
  if(initial !== 'all' && initial !== 'autres' && !known.includes(initial)) initial = 'all';
  if(!hasOther && (initial === 'autres' || isOtherCategory(initial))) initial = 'all';

  const state = { category: initial, query: '', sort: 'default' };

  const filterRow = document.getElementById('filter-row');
  const sectionsEl = document.getElementById('catalogue-sections');
  const emptyState = document.getElementById('empty-state');
  const resultCount = document.getElementById('result-count');
  const searchInput = document.getElementById('search-input');
  const sortSelect = document.getElementById('sort-select');
  const pageTitle = document.getElementById('page-title');
  const pageIntro = document.getElementById('page-intro');

  const inOtherGroup = () => state.category === 'autres' || isOtherCategory(state.category);
  const groupCategories = () => inOtherGroup()
    ? OTHER_CATEGORIES.filter(c => PRODUCTS.some(p => p.category === c.key))
    : CATEGORIES;

  function renderHeading(){
    let title = 'Bois de chauffage';
    let intro = 'Bûches, packs d\'hiver, allumage et accessoires : chaque catégorie a sa section. Ajoutez au panier en un clic.';
    if(state.category === 'autres'){
      title = 'Autres catégories';
      intro = 'Notre sélection hors bois de chauffage, classée par catégorie.';
    } else if(state.category !== 'all'){
      title = getCategoryLabel(state.category);
      intro = '';
    }
    pageTitle.textContent = title;
    pageIntro.textContent = intro;
    pageIntro.style.display = intro ? '' : 'none';
    document.title = `${title} — WooExtractor`;
  }

  function renderChips(){
    const first = inOtherGroup() ? { key:'autres', label:'Toutes les catégories' } : { key:'all', label:'Toutes les catégories' };
    const chips = [first, ...groupCategories().map(c => ({ key:c.key, label:c.label }))];
    filterRow.innerHTML = chips.map(c =>
      `<button type="button" class="filter-chip${state.category === c.key ? ' active' : ''}" data-cat="${c.key}">${c.label}</button>`
    ).join('');
    filterRow.querySelectorAll('.filter-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        state.category = btn.getAttribute('data-cat');
        const url = new URL(window.location);
        if(state.category === 'all'){ url.searchParams.delete('cat'); } else { url.searchParams.set('cat', state.category); }
        history.replaceState({}, '', url);
        window.dispatchEvent(new Event('dd-route-changed'));
        renderAll();
      });
    });
  }

  function sortList(list){
    if(state.sort === 'price-asc') return [...list].sort((a,b) => a.price - b.price);
    if(state.sort === 'price-desc') return [...list].sort((a,b) => b.price - a.price);
    if(state.sort === 'name-asc') return [...list].sort((a,b) => a.name.localeCompare(b.name, 'fr'));
    return list;
  }

  function matchesQuery(p){
    const q = state.query.trim().toLowerCase();
    if(!q) return true;
    return p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q);
  }

  function renderSections(){
    const cats = (state.category === 'all' || state.category === 'autres')
      ? groupCategories()
      : [...CATEGORIES, ...OTHER_CATEGORIES].filter(c => c.key === state.category);

    let total = 0;
    const html = cats.map(cat => {
      const list = sortList(PRODUCTS.filter(p => p.category === cat.key && matchesQuery(p)));
      if(!list.length) return '';
      total += list.length;
      const isSingle = cats.length === 1;
      return `
      <section class="cat-section" id="cat-${cat.key}">
        <div class="cat-section-head">
          <div>
            <h2>${cat.label}</h2>
            ${cat.short ? `<p>${cat.short}</p>` : ''}
          </div>
          <span class="cat-section-count">${list.length} produit${list.length > 1 ? 's' : ''}</span>
        </div>
        <div class="product-grid">${list.map(productCardHtml).join('')}</div>
      </section>`;
    }).join('');

    resultCount.textContent = `${total} produit${total > 1 ? 's' : ''}`;
    sectionsEl.innerHTML = html;
    emptyState.style.display = total === 0 ? 'block' : 'none';
    attachAddToCartHandlers(sectionsEl);
  }

  function renderAll(){
    renderHeading();
    renderChips();
    renderSections();
  }

  searchInput.addEventListener('input', () => { state.query = searchInput.value; renderSections(); });
  sortSelect.addEventListener('change', () => { state.sort = sortSelect.value; renderSections(); });

  renderAll();
});
