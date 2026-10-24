// api/verzapay-create.js — Crée le paiement par carte (page de paiement hébergée, 3D Secure) et renvoie l'URL de redirection.
//  - Le montant est recalculé ici à partir du catalogue : le prix envoyé par le navigateur est ignoré.
//  - Le détail complet de la commande est envoyé par e-mail au marchand AVANT la redirection (aucune base de données :
//    c'est la seule trace côté serveur). Si cet e-mail échoue, la commande est refusée.
import { sendBrevoEmail, buildOrderEmailHtml } from '../lib/brevo.js';
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

  let pay;
  try {
    pay = await createVerzaPayment({
      amountEur: priced.total, merchantReference: orderId, description: `Commande ${orderId}`,
      name: `${customer.firstname} ${customer.lastname}`, phoneDigits: phone,
    });
  } catch (e) {
    console.error('verzapay-create : échec paiement', orderId, e.message);
    return res.status(502).json({ message: 'Le paiement par carte n\'a pas pu être initialisé. Réessayez ou choisissez un autre mode de paiement.' });
  }

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  const full = { ...order, id: orderId, paymentMethod: 'card', customer, ...priced, paymentRef: pay.reference };
  if (!ADMIN_EMAIL) {
    console.error('ADMIN_EMAIL manquant : commande carte refusée (aucune trace possible).');
    return res.status(500).json({ message: 'Configuration serveur incomplète.' });
  }
  const mail = await sendBrevoEmail({
    to: ADMIN_EMAIL, replyTo: email,
    subject: `Commande ${orderId} — paiement carte en cours (réf. ${pay.reference})`,
    html: buildOrderEmailHtml(full, { headline: `Paiement carte en cours — réf. ${pay.reference}` }),
  });
  if (!mail.ok) {
    return res.status(502).json({ message: 'Votre commande n\'a pas pu être enregistrée (envoi e-mail impossible). Vous n\'avez pas été débité, réessayez.' });
  }

  return res.status(200).json({ payment_url: pay.paymentUrl, reference: pay.reference, total: priced.total, items: priced.items, subtotal: priced.subtotal, shipping: priced.shipping });
}
