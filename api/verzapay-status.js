// api/verzapay-status.js — Statut d'un paiement carte (utilisé par la page de confirmation et le suivi de commande).
// Le statut est toujours lu auprès de la passerelle : le retour du navigateur ne prouve rien.
import { getVerzaPayment } from '../lib/verzapay.js';

export default async function handler(req, res) {
  const id = new URL(req.url, 'http://x').searchParams.get('id') || '';
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(id)) return res.status(400).json({ message: 'Identifiant invalide.' });
  try {
    const p = await getVerzaPayment(id);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ status: p.status });
  } catch (e) {
    if (e.status === 404) return res.status(404).json({ message: 'Paiement introuvable.' });
    return res.status(502).json({ message: 'Statut indisponible.' });
  }
}
