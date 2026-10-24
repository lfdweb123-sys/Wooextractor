// api/countries.js — Pays proposés à la commande (Europe et Amériques, France en premier), synchronisés automatiquement
// depuis la passerelle de paiement ; repli sur une liste locale si elle est indisponible.
import { loadCountries, FALLBACK_COUNTRIES } from '../lib/verzapay.js';

export default async function handler(req, res) {
  const live = await loadCountries();
  const countries = (live.length ? live : FALLBACK_COUNTRIES).map(({ code, name, currency }) => ({ code, name, currency }));
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).json({ countries, source: live.length ? 'live' : 'fallback' });
}
