// api/nowpayments-ipn.js — Vercel Serverless Function
// Webhook NowPayments. Vérifie la signature HMAC puis, si le paiement est
// confirmé, envoie un court e-mail de confirmation au marchand via Brevo
// (le détail complet de la commande a déjà été envoyé au moment de la
// création de la facture, voir /api/notify-order.js appelé par checkout.js).
// Aucune base de données.

import crypto from 'crypto';
import { sendBrevoEmail, emailLayout, infoRow, esc } from '../lib/brevo.js';

function sortObject(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sortObject);
  return Object.keys(obj).sort().reduce((acc, key) => {
    acc[key] = sortObject(obj[key]);
    return acc;
  }, {});
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const signature = req.headers['x-nowpayments-sig'];
  const sortedBody = JSON.stringify(sortObject(req.body));
  const hmac = crypto
    .createHmac('sha512', process.env.NOWPAYMENTS_IPN_SECRET || '')
    .update(sortedBody)
    .digest('hex');

  if (signature && hmac !== signature) {
    console.warn('Signature NowPayments IPN invalide.');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { payment_id, payment_status, order_id, price_amount, price_currency, pay_amount, pay_currency } = req.body || {};
  console.log(`NowPayments IPN reçu : order_id=${order_id}, payment_id=${payment_id}, status=${payment_status}`);

  const isPaid = ['finished', 'confirmed'].includes(payment_status);
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

  if (isPaid && ADMIN_EMAIL) {
    const sym = { EUR: '€', USD: '$', GBP: '£' }[String(price_currency).toUpperCase()] || '€';
    await sendBrevoEmail({
      to: ADMIN_EMAIL,
      subject: `Paiement crypto confirmé — ${order_id || payment_id}`,
      html: emailLayout({
        subtitle: 'Notification de paiement',
        preheader: `Paiement crypto confirmé — ${order_id || payment_id}`,
        body: `
          <h2 class="title" style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#201A15;">Paiement crypto confirmé</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${infoRow('Commande', esc(order_id || '—'))}
            ${infoRow('Montant payé', `${esc(pay_amount)} ${esc(String(pay_currency).toUpperCase())} (≈ ${sym}${Number(price_amount).toFixed(2)})`)}
            ${infoRow('Réf. paiement', esc(payment_id))}
          </table>`
      })
    });
  }

  return res.status(200).json({ received: true });
}

