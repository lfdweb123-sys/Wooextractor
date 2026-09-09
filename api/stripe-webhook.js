// api/stripe-webhook.js — Vercel Serverless Function
// Reçoit les évènements Stripe. C'est la seule source fiable (vérifiée par
// signature) confirmant qu'un paiement carte a réellement abouti : c'est
// donc ce webhook, et non le navigateur du client, qui envoie l'e-mail de
// notification de commande au marchand via Brevo. Aucune base de données.

import Stripe from 'stripe';
import { sendBrevoEmail, buildOrderEmailHtml } from '../lib/brevo.js';

export const config = {
  api: { bodyParser: false }
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function orderFromMetadata(meta, paymentIntentId) {
  const items = (meta.items || '').split(';').map(s => s.trim()).filter(Boolean).map(entry => {
    const match = entry.match(/^(\d+)\s*[x×]\s*(.+)$/i);
    return match
      ? { qty: Number(match[1]), name: match[2], lineTotal: 0 }
      : { qty: 1, name: entry, lineTotal: 0 };
  });
  const [firstname, ...rest] = (meta.customer_name || '').split(' ');
  return {
    id: meta.order_id || paymentIntentId,
    status: 'payee',
    paymentMethod: 'card',
    items,
    subtotal: Number(meta.subtotal || 0),
    shipping: Number(meta.shipping || 0),
    total: Number(meta.total || 0),
    customer: {
      firstname: firstname || '',
      lastname: rest.join(' '),
      email: meta.customer_email || '',
      phone: meta.customer_phone || '',
      address: meta.customer_address || '',
      postcode: '', city: '', country: ''
    }
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
  if (!STRIPE_SECRET_KEY || !WEBHOOK_SECRET) {
    console.error('Configuration Stripe webhook manquante.');
    return res.status(500).end();
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  const sig = req.headers['stripe-signature'];
  const rawBody = await readRawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.warn('Signature Stripe invalide :', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    const order = orderFromMetadata(pi.metadata || {}, pi.id);
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
    if (ADMIN_EMAIL) {
      await sendBrevoEmail({
        to: ADMIN_EMAIL,
        subject: `Paiement carte confirmé — ${order.id}`,
        html: buildOrderEmailHtml(order, { headline: 'Paiement carte confirmé' })
      });
    } else {
      console.warn('ADMIN_EMAIL manquant : notification non envoyée.');
    }
  }

  return res.status(200).json({ received: true });
}
