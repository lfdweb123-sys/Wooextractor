// api/stripe-create-intent.js — Vercel Serverless Function
// Crée un PaymentIntent Stripe pour le paiement par carte bancaire, saisi
// directement dans le champ carte (Stripe Elements) sur la page de commande.
// Le détail de la commande est placé dans les métadonnées du PaymentIntent :
// c'est la seule trace côté serveur, exploitée uniquement par le webhook
// pour notifier le marchand par e-mail (aucune base de données).

import Stripe from 'stripe';

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET_KEY) {
    return res.status(500).json({ message: 'Configuration Stripe manquante côté serveur.' });
  }

  const { amount, currency, order_id, customer, items, subtotal, shipping, total } = req.body || {};
  if (!amount || !currency || !order_id || !customer?.email) {
    return res.status(400).json({ message: 'Champs requis manquants.' });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(amount) * 100),
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: false },
      payment_method_types: ['card'],
      receipt_email: customer.email,
      metadata: {
        order_id,
        customer_name: truncate(`${customer.firstname || ''} ${customer.lastname || ''}`.trim(), 200),
        customer_email: truncate(customer.email, 200),
        customer_phone: truncate(customer.phone || '', 60),
        customer_address: truncate(`${customer.address || ''}, ${customer.postcode || ''} ${customer.city || ''}, ${customer.country || ''}`, 300),
        items: truncate(items || '', 450),
        subtotal: String(subtotal ?? ''),
        shipping: String(shipping ?? ''),
        total: String(total ?? amount)
      }
    });

    return res.status(200).json({ clientSecret: paymentIntent.client_secret });

  } catch (err) {
    console.error('Stripe create intent error:', err);
    return res.status(500).json({ message: err.message || 'Erreur lors de la création du paiement Stripe.' });
  }
}
