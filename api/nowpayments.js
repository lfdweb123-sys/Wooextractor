// api/nowpayments.js — Vercel Serverless Function
// Crée une facture NowPayments (paiement en cryptomonnaie) et renvoie l'URL
// de paiement. Aucune base de données : la commande vit dans le localStorage
// du client, voir /assets/js/cart.js.
//
// Variables d'environnement requises :
//   NOWPAYMENTS_API_KEY
//   NEXT_PUBLIC_BASE_URL   ex. https://wooextractor.com

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { amount, currency, pay_currency, order_id, order_description, customer } = req.body || {};
  if (!amount || !currency || !pay_currency || !order_id) {
    return res.status(400).json({ message: 'Champs requis manquants (amount, currency, pay_currency, order_id).' });
  }

  const NP_API_KEY = process.env.NOWPAYMENTS_API_KEY;
  if (!NP_API_KEY) {
    return res.status(500).json({ message: 'Configuration NowPayments manquante côté serveur.' });
  }

  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || `https://${req.headers.host}`;
  const SUCCESS_URL = `${BASE_URL}/pages/order-success?order_id=${encodeURIComponent(order_id)}`;
  const CANCEL_URL = `${BASE_URL}/pages/checkout?status=cancelled`;
  const IPN_URL = `${BASE_URL}/api/nowpayments-ipn`;

  try {
    const npRes = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'x-api-key': NP_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        price_amount: parseFloat(amount).toFixed(2),
        price_currency: currency.toLowerCase(),
        pay_currency: pay_currency.toLowerCase(),
        order_id,
        order_description: order_description || `Commande ${order_id} — WooExtractor`,
        ipn_callback_url: IPN_URL,
        success_url: SUCCESS_URL,
        cancel_url: CANCEL_URL,
        is_fixed_rate: true,
        is_fee_paid_by_user: false,
        customer_email: customer?.email || undefined
      })
    });

    const data = await npRes.json();
    if (!npRes.ok) {
      console.error('NowPayments error:', data);
      return res.status(502).json({ message: data.message || 'Erreur NowPayments.' });
    }

    return res.status(200).json({
      invoice_id: data.id,
      invoice_url: data.invoice_url,
      payment_status: data.payment_status
    });

  } catch (err) {
    console.error('NowPayments handler error:', err);
    return res.status(500).json({ message: 'Erreur interne lors de l\'appel à NowPayments.' });
  }
}
