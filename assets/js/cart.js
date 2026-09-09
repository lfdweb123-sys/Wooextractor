/* ==========================================================================
   Panier — 100% stockage local (localStorage), aucun envoi serveur.
   ========================================================================== */
const CART_KEY = 'dd_cart_v1';
const FREE_SHIPPING_THRESHOLD = 150;
const SHIPPING_FLAT = 9.90;

const Cart = {
  _read(){
    try{
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    }catch(e){
      console.warn('Panier illisible, réinitialisation.', e);
      return [];
    }
  },
  _write(items){
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('dd-cart-updated'));
  },
  lines(){
    const items = this._read();
    return items
      .map(it => {
        const product = getProductById(it.id);
        if(!product) return null;
        const qty = Math.min(Math.max(1, it.qty), product.stock);
        return { product, qty, lineTotal: Math.round(product.price * qty * 100) / 100 };
      })
      .filter(Boolean);
  },
  add(id, qty = 1){
    const product = getProductById(id);
    if(!product) return;
    const items = this._read();
    const existing = items.find(it => it.id === id);
    if(existing){
      existing.qty = Math.min(existing.qty + qty, product.stock);
    }else{
      items.push({ id, qty: Math.min(qty, product.stock) });
    }
    this._write(items);
  },
  setQty(id, qty){
    const product = getProductById(id);
    if(!product) return;
    let items = this._read();
    qty = Math.max(1, Math.min(qty, product.stock));
    const existing = items.find(it => it.id === id);
    if(existing){ existing.qty = qty; }
    this._write(items);
  },
  remove(id){
    const items = this._read().filter(it => it.id !== id);
    this._write(items);
  },
  clear(){
    this._write([]);
  },
  count(){
    return this._read().reduce((sum, it) => sum + it.qty, 0);
  },
  subtotal(){
    return this.lines().reduce((sum, l) => sum + l.lineTotal, 0);
  },
  shipping(){
    const sub = this.subtotal();
    if(sub === 0) return 0;
    return sub >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT;
  },
  total(){
    return Math.round((this.subtotal() + this.shipping()) * 100) / 100;
  }
};

/* ---------------- Commandes locales (suivi client, sans base de données) --------------- */
const ORDERS_KEY = 'dd_orders_v1';
const PENDING_ORDER_KEY = 'dd_pending_order_v1';

const Orders = {
  _read(){
    try{
      const raw = localStorage.getItem(ORDERS_KEY);
      return raw ? JSON.parse(raw) : {};
    }catch(e){ return {}; }
  },
  _write(all){
    localStorage.setItem(ORDERS_KEY, JSON.stringify(all));
  },
  create(order){
    const all = this._read();
    all[order.id] = order;
    this._write(all);
    localStorage.setItem(PENDING_ORDER_KEY, order.id);
    return order;
  },
  update(id, patch){
    const all = this._read();
    if(!all[id]) return null;
    all[id] = Object.assign({}, all[id], patch);
    this._write(all);
    return all[id];
  },
  get(id){
    return this._read()[id] || null;
  },
  all(){
    return Object.values(this._read()).sort((a,b) => b.createdAt - a.createdAt);
  },
  pendingId(){
    return localStorage.getItem(PENDING_ORDER_KEY);
  },
  clearPending(){
    localStorage.removeItem(PENDING_ORDER_KEY);
  }
};

function generateOrderId(){
  const d = new Date();
  const stamp = d.getFullYear().toString().slice(2) + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');
  const rand = Math.random().toString(36).slice(2,7).toUpperCase();
  return `DD-${stamp}-${rand}`;
}
