// api/stripe-config.js — Vercel Serverless Function
// Renvoie la clé publiable Stripe au navigateur (la clé publiable n'est pas
// secrète, mais elle est chargée dynamiquement pour éviter de la coder en dur
// dans le dépôt et faciliter le passage du mode test au mode live).

export default async function handler(req, res) {
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || '';
  if (!publishableKey) {
    return res.status(500).json({ message: 'STRIPE_PUBLISHABLE_KEY manquant côté serveur.' });
  }
  return res.status(200).json({ publishableKey });
}
