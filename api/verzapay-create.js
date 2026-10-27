// api/verzapay-create.js — Crée le paiement par carte (page de paiement hébergée, 3D Secure) et renvoie l'URL de redirection.
//  AUCUN e-mail n'est envoyé ici : le détail de la commande voyage dans les métadonnées du paiement et n'est transmis par e-mail
//  qu'à la confirmation du paiement (api/verzapay-webhook.js).
//  - Le montant est recalculé ici à partir du catalogue : le prix envoyé par le navigateur est ignoré.
import { encodeOrder } from '../lib/order-codec.js';
import { createVerzaPayment, loadCountries, normalizePhone, FALLBACK_COUNTRIES } from '../lib/verzapay.js';
import { priceOrder } from '../lib/pricing.js';

const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { order } = req.body || {};
  const c = order?.customer || {};
  const orderId = clean(order?.id, 40);
  const email = clean(c.email, 200).toLowerCase();
  if (!/^DD-[A-Z0-9-]{4,30}$/.test(orderId) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Commande invalide.' });
  }

  let priced;
  try {
    priced = priceOrder((order.items || []).map((i) => ({ id: i.id, qty: i.qty })));
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }

  // Pays : liste synchronisée (Europe et Amériques) ; le téléphone doit correspondre à l'indicatif du pays.
  const countries = (await loadCountries()).length ? await loadCountries() : FALLBACK_COUNTRIES;
  const country = countries.find((x) => x.code === String(c.countryCode || '').toUpperCase());
  if (!country) return res.status(400).json({ message: 'Pays non pris en charge pour le paiement par carte.' });
  const phone = normalizePhone(c.phone, country.dial);
  if (!phone) return res.status(400).json({ message: `Numéro de téléphone invalide : saisissez un numéro ${country.name} (indicatif +${country.dial}).` });

  const customer = {
    firstname: clean(c.firstname, 80), lastname: clean(c.lastname, 80), email, phone: `+${phone}`,
    address: clean(c.address, 200), postcode: clean(c.postcode, 20), city: clean(c.city, 80), country: country.name, note: clean(c.note, 500),
  };
  if (!customer.firstname || !customer.lastname || !customer.address || !customer.postcode || !customer.city) {
    return res.status(400).json({ message: 'Informations de livraison incomplètes.' });
  }

  let metadata;
  try {
    metadata = encodeOrder({
      id: orderId, fn: customer.firstname, ln: customer.lastname, e: email, p: customer.phone,
      a: customer.address, pc: customer.postcode, ci: customer.city, co: customer.country, n: customer.note,
      i: priced.items.map((i) => [i.id, i.qty]),
    });
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }

  let pay;
  try {
    pay = await createVerzaPayment({
      amountEur: priced.total, merchantReference: orderId, description: 'Commande',
      name: `${customer.firstname} ${customer.lastname}`, phoneDigits: phone, email, metadata,
    });
  } catch (e) {
    console.error('verzapay-create : échec paiement', orderId, e.message);
    // PAYMENT_DEBUG=1 (temporaire) : renvoie la cause technique pour le diagnostic ; ne jamais le laisser actif en production.
    return res.status(502).json({ message: 'Le paiement par carte n\'a pas pu être initialisé. Réessayez ou choisissez un autre mode de paiement.', ...(process.env.PAYMENT_DEBUG === '1' ? { detail: e.message } : {}) });
  }

  return res.status(200).json({ payment_url: pay.paymentUrl, reference: pay.reference, total: priced.total, items: priced.items, subtotal: priced.subtotal, shipping: priced.shipping });
}
