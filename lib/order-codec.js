// lib/order-codec.js — Transporte la commande dans le champ `metadata` du paiement (aucune base de données).
// La commande n'est JAMAIS envoyée par e-mail avant le paiement : le détail revient avec la confirmation (webhook).
const CHUNK = 900;
const MAX_CHARS = 7000;

export function encodeOrder(o) {
  const json = JSON.stringify(o);
  if (json.length > MAX_CHARS) throw new Error('Commande trop volumineuse pour le paiement.');
  const meta = {};
  for (let i = 0; i * CHUNK < json.length; i++) meta[`d${i}`] = json.slice(i * CHUNK, (i + 1) * CHUNK);
  return meta;
}

export function decodeOrder(meta) {
  if (!meta || typeof meta !== 'object') return null;
  let json = '';
  for (let i = 0; i < 12 && typeof meta[`d${i}`] === 'string'; i++) json += meta[`d${i}`];
  try {
    const o = JSON.parse(json);
    return o && typeof o === 'object' ? o : null;
  } catch {
    return null;
  }
}
