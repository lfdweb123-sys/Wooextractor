document.addEventListener('DOMContentLoaded', () => {
  // Chaque bloc est indépendant : si l'un échoue, les autres (dont les
  // icônes) continuent quand même à s'afficher.

  try{
    renderCategoryStrip('cat-strip');
  }catch(err){
    console.error('Erreur bandeau catégories :', err);
  }

  try{
    const featuredIds = [2, 5, 9, 14, 17, 20, 21, 24];
    const grid = document.getElementById('featured-grid');
    if(grid){
      const cards = featuredIds
        .map(id => getProductById(id))
        .filter(Boolean) // ignore silencieusement un id qui n'existerait plus
        .map(productCardHtml)
        .join('');
      grid.innerHTML = cards;
      attachAddToCartHandlers(grid);
    }
  }catch(err){
    console.error('Erreur produits vedettes :', err);
  }

  try{
    hydrateIcons();
  }catch(err){
    console.error('Erreur icônes :', err);
  }
});
