// api/notify-order.js — Vercel Serverless Function
// Appelée directement par le navigateur du client pour le virement bancaire
// et la commande sans paiement immédiat (aucune passerelle de paiement ne
// peut confirmer ces deux modes automatiquement). Envoie un e-mail au
// marchand via Brevo avec le détail de la commande. Aucune donnée n'est
// stockée côté serveur.

import { sendBrevoEmail, buildOrderEmailHtml } from '../lib/brevo.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { order } = req.body || {};
  if (!order || !order.id || !order.customer || !order.customer.email) {
    return res.status(400).json({ message: 'Commande invalide.' });
  }

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  if (!ADMIN_EMAIL) {
    console.warn('ADMIN_EMAIL manquant : notification non envoyée.');
    return res.status(200).json({ notified: false });
  }

  const headline = order.paymentMethod === 'transfer'
    ? 'Nouvelle commande — virement bancaire attendu'
    : 'Nouvelle commande — lien de paiement à envoyer';

  const result = await sendBrevoEmail({
    to: ADMIN_EMAIL,
    subject: `Commande ${order.id} — ${order.paymentMethod === 'transfer' ? 'virement à recevoir' : 'lien de paiement à envoyer'}`,
    html: buildOrderEmailHtml(order, { headline })
  });

  return res.status(200).json({ notified: !!result.ok });
}
