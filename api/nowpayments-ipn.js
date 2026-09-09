// api/nowpayments-ipn.js — Vercel Serverless Function
// Webhook NowPayments. Vérifie la signature HMAC puis, si le paiement est
// confirmé, envoie un court e-mail de confirmation au marchand via Brevo
// (le détail complet de la commande a déjà été envoyé au moment de la
// création de la facture, voir /api/notify-order.js appelé par checkout.js).
// Aucune base de données.

import crypto from 'crypto';
import { sendBrevoEmail } from '../lib/brevo.js';

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
      html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#F5F1E9;padding:32px;">
        <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #E7DFD2;border-radius:10px;padding:24px;">
          <h2 style="color:#201A15;margin:0 0 12px;">Paiement crypto confirmé</h2>
          <p style="color:#4A3F35;font-size:14px;">Commande <strong>${order_id || '—'}</strong></p>
          <p style="color:#4A3F35;font-size:14px;">Montant payé : ${pay_amount} ${String(pay_currency).toUpperCase()} (≈ ${sym}${Number(price_amount).toFixed(2)})</p>
          <p style="color:#8A7F72;font-size:12px;margin-top:16px;">Réf. paiement NowPayments : ${payment_id}</p>
        </div>
      </body></html>`
    });
  }

  return res.status(200).json({ received: true });
}

