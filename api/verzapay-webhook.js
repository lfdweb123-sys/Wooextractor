// api/verzapay-webhook.js — Notification de paiement (event "payment.completed").
// Sécurité : la passerelle ne signe pas ses webhooks et n'a pas de clé de webhook, donc :
//   1) jeton secret dans l'URL (VERZAPAY_WEBHOOK_TOKEN) comparé à temps constant ;
//   2) le contenu reçu n'est JAMAIS cru : statut, montant et référence sont relus via GET /payments/{id} avec notre clé secrète ;
//   3) déduplication en mémoire d'instance (best effort, aucune base de données).
import crypto from 'node:crypto';
import { sendBrevoEmail, emailLayout, infoRow, esc } from '../lib/brevo.js';
import { getVerzaPayment } from '../lib/verzapay.js';

const done = new Set();

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = process.env.VERZAPAY_WEBHOOK_TOKEN || '';
  const given = new URL(req.url, 'http://x').searchParams.get('k') || '';
  if (token.length < 24 || !safeEqual(given, token)) return res.status(401).json({ error: 'Non autorisé.' });

  const ev = req.body || {};
  if (ev.type !== 'payment.completed') return res.status(200).json({ received: true });
  const paymentId = typeof ev.paymentId === 'string' ? ev.paymentId : '';
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(paymentId)) return res.status(400).json({ error: 'paymentId absent.' });
  if (done.has(paymentId)) return res.status(200).json({ received: true, duplicate: true });

  try {
    const pay = await getVerzaPayment(paymentId);
    if (pay.status !== 'completed') return res.status(200).json({ received: true, status: pay.status });
    if (pay.currency !== 'EUR') return res.status(200).json({ received: true, ignored: 'devise inattendue' });

    const orderId = /DD-[A-Z0-9-]{4,30}/.exec(pay.merchantReference)?.[0] || '';
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
    if (ADMIN_EMAIL) {
      const r = await sendBrevoEmail({
        to: ADMIN_EMAIL,
        subject: `Paiement carte confirmé — ${orderId || paymentId}`,
        html: emailLayout({
          subtitle: 'Notification de paiement',
          preheader: `Paiement carte confirmé — ${orderId || paymentId}`,
          body: `
          <h2 class="title" style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#201A15;">Paiement carte confirmé</h2>
          <p style="margin:0 0 12px;font-size:13px;color:#6B5D4F;">Statut « completed » vérifié auprès de l'API de la passerelle.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${infoRow('Commande', esc(orderId || 'non retrouvée — rapprocher par référence'))}
            ${infoRow('Montant payé', `${esc(pay.amount.toFixed(2))} EUR`)}
            ${infoRow('Réf. paiement', esc(paymentId))}
          </table>`,
        }),
      });
      if (!r.ok) throw new Error('E-mail marchand non envoyé');
    } else {
      console.warn('ADMIN_EMAIL manquant : notification non envoyée.');
    }
    done.add(paymentId);
  } catch (e) {
    // Paiement inconnu de notre compte (notification forgée) : 200 sans effet, inutile de rejouer.
    if (e.status === 404) return res.status(200).json({ received: true, ignored: 'paiement inconnu' });
    console.error('verzapay-webhook : échec', paymentId, e.message);
    return res.status(500).json({ error: 'Traitement impossible.' });
  }
  return res.status(200).json({ received: true });
}
