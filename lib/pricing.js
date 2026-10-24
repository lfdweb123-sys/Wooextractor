// lib/pricing.js — Recalcule le montant d'une commande CÔTÉ SERVEUR à partir du catalogue et des règles de livraison du site
// (assets/js/products.js et assets/js/cart.js, chargés tels quels). Le prix envoyé par le navigateur n'est JAMAIS cru.
import fs from 'node:fs';
import vm from 'node:vm';

let cache = null;

function load() {
  if (cache) return cache;
  const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
  const ctx = vm.createContext({});
  vm.runInContext(read('../assets/js/products.js'), ctx);
  const products = vm.runInContext('PRODUCTS', ctx);
  const cartSrc = read('../assets/js/cart.js');
  const free = Number(/FREE_SHIPPING_THRESHOLD\s*=\s*([\d.]+)/.exec(cartSrc)?.[1]);
  const flat = Number(/SHIPPING_FLAT\s*=\s*([\d.]+)/.exec(cartSrc)?.[1]);
  if (!Array.isArray(products) || !Number.isFinite(free) || !Number.isFinite(flat)) throw new Error('Catalogue illisible côté serveur.');
  cache = { byId: new Map(products.map((p) => [Number(p.id), p])), free, flat };
  return cache;
}

const round2 = (n) => Math.round(n * 100) / 100;

/** items : [{ id, qty }] -> { items (prix serveur), subtotal, shipping, total } ou lève une erreur. */
export function priceOrder(rawItems) {
  const { byId, free, flat } = load();
  if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 50) throw new Error('Panier invalide.');
  const items = rawItems.map((it) => {
    const p = byId.get(Number(it?.id));
    const qty = Math.floor(Number(it?.qty));
    if (!p || !Number.isFinite(qty) || qty < 1 || qty > (p.stock || 100)) throw new Error('Article ou quantité invalide.');
    return { id: p.id, name: p.name, unit: p.unit, qty, unitPrice: p.price, lineTotal: round2(p.price * qty) };
  });
  const subtotal = round2(items.reduce((s, i) => s + i.lineTotal, 0));
  const shipping = subtotal >= free ? 0 : flat;
  return { items, subtotal, shipping, total: round2(subtotal + shipping) };
}
