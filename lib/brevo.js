// lib/brevo.js — Envoi d'e-mails de notification de commande via l'API Brevo.
// Utilisé uniquement pour prévenir le marchand (ADMIN_EMAIL) qu'une commande
// vient d'être passée ou payée. Aucun e-mail n'est envoyé au client.
//
// Variables d'environnement requises :
//   BREVO_API_KEY
//   ADMIN_EMAIL        adresse qui doit recevoir les commandes
//   SHOP_EMAIL         adresse expéditrice (doit être validée dans Brevo)

export async function sendBrevoEmail({ to, subject, html }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn('BREVO_API_KEY manquant : e-mail non envoyé.');
    return { skipped: true };
  }
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'WooExtractor', email: process.env.SHOP_EMAIL || 'commandes@wooextractor.com' },
        to: [{ email: to }],
        subject,
        htmlContent: html
      })
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error('Brevo error:', res.status, errBody);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error('Brevo send error:', err);
    return { ok: false, error: err.message };
  }
}

const METHOD_LABEL = {
  card: 'Carte bancaire (Stripe)',
  crypto: 'Cryptomonnaie (NowPayments)',
  transfer: 'Virement bancaire',
  later: 'Commande sans paiement immédiat (lien Payoneer à envoyer)'
};

const STATUS_LABEL = {
  payee: 'Payée',
  en_attente_paiement: 'En attente de paiement',
  attente_virement: 'En attente de virement bancaire',
  en_attente_lien_paiement: 'En attente d\'envoi du lien Payoneer',
  erreur_paiement: 'Paiement échoué'
};

function esc(v) {
  return String(v == null ? '' : v).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
}

export function buildOrderEmailHtml(order, { headline } = {}) {
  const items = (order.items || []).map(it =>
    `<tr><td style="padding:6px 0;color:#4A3F35;">${esc(it.qty)} × ${esc(it.name)}</td><td style="padding:6px 0;text-align:right;color:#201A15;font-weight:600;">${Number(it.lineTotal).toFixed(2)} €</td></tr>`
  ).join('');

  const c = order.customer || {};
  const methodLabel = METHOD_LABEL[order.paymentMethod] || order.paymentMethod || 'Inconnu';
  const statusLabel = STATUS_LABEL[order.status] || order.status;

  const actionNote = order.paymentMethod === 'later'
    ? `<div style="margin-top:18px;background:#FBF0D9;border:1px solid #EAD9A8;border-radius:8px;padding:14px 16px;color:#8A6116;font-size:14px;"><strong>Action requise :</strong> envoyer manuellement un lien de paiement Payoneer à ${esc(c.email)}.</div>`
    : order.paymentMethod === 'transfer'
    ? `<div style="margin-top:18px;background:#FBF0D9;border:1px solid #EAD9A8;border-radius:8px;padding:14px 16px;color:#8A6116;font-size:14px;"><strong>Action requise :</strong> vérifier la réception du virement (réf. ${esc(order.id)}) avant expédition.</div>`
    : '';

  return `
  <!DOCTYPE html><html><head><meta charset="UTF-8"></head>
  <body style="font-family:Arial,Helvetica,sans-serif;background:#F5F1E9;margin:0;padding:0;">
    <div style="max-width:560px;margin:32px auto;background:#FFFFFF;border-radius:10px;overflow:hidden;border:1px solid #E7DFD2;">
      <div style="background:#201A15;padding:24px 28px;">
        <div style="color:#FFFFFF;font-size:18px;font-weight:700;">WooExtractor</div>
        <div style="color:#C9BEB1;font-size:12px;margin-top:2px;">Notification de commande</div>
      </div>
      <div style="padding:28px;">
        <h2 style="margin:0 0 4px;font-size:19px;color:#201A15;">${esc(headline || 'Nouvelle commande')}</h2>
        <p style="color:#8A7F72;font-size:13px;margin:0 0 20px;">Commande ${esc(order.id)} — ${statusLabel}</p>

        <table style="width:100%;font-size:13px;border-collapse:collapse;margin-bottom:18px;">
          <tr><td style="color:#8A7F72;padding:4px 0;width:40%;">Mode de paiement</td><td style="font-weight:600;color:#201A15;">${esc(methodLabel)}</td></tr>
          <tr><td style="color:#8A7F72;padding:4px 0;">Client</td><td style="font-weight:600;color:#201A15;">${esc(c.firstname)} ${esc(c.lastname)}</td></tr>
          <tr><td style="color:#8A7F72;padding:4px 0;">E-mail</td><td style="font-weight:600;color:#201A15;">${esc(c.email)}</td></tr>
          <tr><td style="color:#8A7F72;padding:4px 0;">Téléphone</td><td style="font-weight:600;color:#201A15;">${esc(c.phone)}</td></tr>
          <tr><td style="color:#8A7F72;padding:4px 0;">Adresse</td><td style="font-weight:600;color:#201A15;">${esc(c.address)}, ${esc(c.postcode)} ${esc(c.city)}, ${esc(c.country)}</td></tr>
          ${c.note ? `<tr><td style="color:#8A7F72;padding:4px 0;">Note</td><td style="color:#201A15;">${esc(c.note)}</td></tr>` : ''}
        </table>

        <table style="width:100%;font-size:13px;border-collapse:collapse;border-top:1px solid #E7DFD2;padding-top:8px;">
          ${items}
          <tr><td style="padding-top:10px;color:#8A7F72;">Livraison</td><td style="padding-top:10px;text-align:right;">${Number(order.shipping || 0).toFixed(2)} €</td></tr>
          <tr><td style="padding-top:6px;font-weight:700;color:#201A15;border-top:1px solid #E7DFD2;">Total</td><td style="padding-top:6px;text-align:right;font-weight:700;color:#A8391B;border-top:1px solid #E7DFD2;">${Number(order.total || 0).toFixed(2)} €</td></tr>
        </table>

        ${actionNote}
      </div>
    </div>
  </body></html>`;
}
