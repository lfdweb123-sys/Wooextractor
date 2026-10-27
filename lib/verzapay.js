// lib/verzapay.js — Paiement par carte via l'API Verzapay (montant en EUR, conversion automatique vers la devise du pays du client).
//
// Variables d'environnement :
//   VERZAPAY_API_KEY          clé secrète (vpz_sk_...)
//   VERZAPAY_WEBHOOK_TOKEN    jeton secret (>= 24 caractères) ajouté à l'URL du webhook : /api/verzapay-webhook?k=...
//   VERZAPAY_API_URL / VERZAPAY_SITE_URL   (facultatif, tests)

const api = () => (process.env.VERZAPAY_API_URL || 'https://www.verzapay.com/api/v1').replace(/\/$/, '');
const site = () => (process.env.VERZAPAY_SITE_URL || 'https://www.verzapay.com').replace(/\/$/, '');

function authHeaders() {
  const key = process.env.VERZAPAY_API_KEY;
  if (!key) throw new Error('VERZAPAY_API_KEY manquant.');
  return { Authorization: `Bearer ${key}` };
}

function hostAllowed(url) {
  if (process.env.VERZAPAY_API_URL) return true; // tests locaux
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && ['verzapay.com', 'joonapay.com'].some((d) => u.hostname === d || u.hostname.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

/**
 * Crée un paiement en EUR. Garde-fou : la réponse doit confirmer un débit de EXACTEMENT ce montant en EUR
 * (charged_amount / charged_currency). Sinon on refuse : on ne présente jamais au client un montant non vérifié.
 */
export async function createVerzaPayment({ amountEur, merchantReference, description, name, phoneDigits, email, metadata }) {
  const amount = Math.round(Number(amountEur) * 100) / 100;
  const res = await fetch(`${api()}/payments`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // Le client paie EXACTEMENT le prix affiché : la commission de la passerelle est à la charge du marchand
      // (sinon la passerelle l'ajoute au montant du client et le garde-fou ci-dessous refuse le paiement).
      amount, currency: 'EUR', fee_bearer: 'merchant', description, merchant_reference: merchantReference,
      customer_name: name, customer_phone: `+${phoneDigits}`,
      ...(email ? { customer_email: email } : {}), ...(metadata ? { metadata } : {}),
    }),
  });
  const d = await res.json().catch(() => null);
  if (!res.ok || !d?.id || !d.checkout_url) {
    throw new Error(`Verzapay ${res.status} ${typeof d?.error === 'string' ? d.error : typeof d?.message === 'string' ? d.message : ''}`.trim());
  }
  if (!hostAllowed(d.checkout_url)) throw new Error('URL de paiement inattendue.');
  if (d.charged_currency !== 'EUR' || typeof d.charged_amount !== 'number' || Math.abs(d.charged_amount - amount) > 0.005) {
    throw new Error(`Montant débité non confirmé en EUR (reçu : ${d.charged_amount ?? '?'} ${d.charged_currency ?? '?'}, attendu : ${amount} EUR).`);
  }
  // Garde-fou : la commande ne voyage QUE dans les métadonnées. Si la passerelle ne les confirme pas (ancienne version de l'API),
  // on refuse : un client pourrait payer sans que nous puissions retrouver sa commande.
  if (metadata && JSON.stringify(d.metadata || null) !== JSON.stringify(metadata)) {
    throw new Error('Métadonnées de commande non confirmées par la passerelle (API à mettre à jour).');
  }
  return { reference: d.id, paymentUrl: d.checkout_url };
}

/** Relit un paiement auprès de l'API (la notification webhook seule ne prouve rien). */
export async function getVerzaPayment(id) {
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(String(id))) throw new Error('Identifiant invalide.');
  const res = await fetch(`${api()}/payments/${encodeURIComponent(id)}`, { headers: authHeaders() });
  const d = await res.json().catch(() => null);
  if (!res.ok || !d?.status) {
    const e = new Error(`Verzapay statut ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return { id: d.id || id, status: String(d.status), amount: Number(d.amount) || 0, currency: String(d.currency || ''), merchantReference: d.merchant_reference || '', description: d.description || '', customerEmail: d.customer_email || '', metadata: d.metadata || null };
}

// ---- Pays synchronisés automatiquement depuis la passerelle (liste publique alimentée par JoonaPay) ----
const EUROPE = new Set('AL AD AT BY BE BA BG HR CY CZ DK EE FI FR DE GR HU IS IE IT XK LV LI LT LU MT MD MC ME NL MK NO PL PT RO RU SM RS SK SI ES SE CH UA GB VA TR'.split(' '));
const AMERICAS = new Set('AG AR BS BB BZ BO BR CA CL CO CR CU DM DO EC SV GD GT GY HT HN JM MX NI PA PY PE KN LC VC SR TT US UY VE'.split(' '));

let memo = null;
export async function loadCountries() {
  if (memo && Date.now() - memo.at < 3600_000) return memo.list;
  try {
    const res = await fetch(`${site()}/api/public/countries`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    const list = (d.countries || [])
      .filter((c) => c && c.paymentEnabled !== false && (EUROPE.has(c.code) || AMERICAS.has(c.code)))
      .map((c) => ({ code: c.code, name: c.name, currency: c.currency, dial: String(c.indicator || '').replace(/\D/g, '') }))
      .filter((c) => c.dial);
    list.sort((a, b) => (a.code === 'FR' ? -1 : b.code === 'FR' ? 1 : a.name.localeCompare(b.name, 'fr')));
    if (list.length) memo = { at: Date.now(), list };
    return list;
  } catch (e) {
    console.warn('Pays Verzapay indisponibles :', e.message);
    return memo ? memo.list : [];
  }
}

/** Repli si la liste synchronisée est indisponible : pays les plus courants (France en premier). */
export const FALLBACK_COUNTRIES = [
  { code: 'FR', name: 'France', currency: 'EUR', dial: '33' }, { code: 'BE', name: 'Belgique', currency: 'EUR', dial: '32' },
  { code: 'DE', name: 'Allemagne', currency: 'EUR', dial: '49' }, { code: 'ES', name: 'Espagne', currency: 'EUR', dial: '34' },
  { code: 'IT', name: 'Italie', currency: 'EUR', dial: '39' }, { code: 'PT', name: 'Portugal', currency: 'EUR', dial: '351' },
  { code: 'NL', name: 'Pays-Bas', currency: 'EUR', dial: '31' }, { code: 'CH', name: 'Suisse', currency: 'CHF', dial: '41' },
  { code: 'GB', name: 'Royaume-Uni', currency: 'GBP', dial: '44' }, { code: 'CA', name: 'Canada', currency: 'CAD', dial: '1' },
  { code: 'US', name: 'États-Unis', currency: 'USD', dial: '1' },
];

/** Numéro avec indicatif (chiffres) cohérent avec le pays ; '' si invalide. */
export function normalizePhone(raw, dial) {
  let d = String(raw || '').replace(/[^\d+]/g, '');
  const plus = d.startsWith('+');
  d = d.replace(/\D/g, '');
  if (!plus) {
    if (d.startsWith('00')) d = d.slice(2);
    else if (d.startsWith('0')) d = dial + d.slice(1);
    else if (!d.startsWith(dial) && dial === '1' && d.length === 10) d = `1${d}`; // Amérique du Nord : 10 chiffres
  }
  return d.startsWith(dial) && d.length >= 9 && d.length <= 15 ? d : '';
}
