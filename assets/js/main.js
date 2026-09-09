document.addEventListener('DOMContentLoaded', () => {
  renderCategoryStrip('cat-strip');

  const featuredIds = [2, 5, 9, 14, 17, 28, 38, 24];
  const grid = document.getElementById('featured-grid');
  if(grid){
    grid.innerHTML = featuredIds.map(id => productCardHtml(getProductById(id))).join('');
    attachAddToCartHandlers(grid);
  }

  hydrateIcons();
});
