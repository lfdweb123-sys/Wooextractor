// lib/brevo.js — Envoi d'e-mails transactionnels et gabarit d'e-mail responsive.
//
// Variables d'environnement requises :
//   BREVO_API_KEY
//   ADMIN_EMAIL        adresse qui doit recevoir les commandes et les demandes de devis
//   SHOP_EMAIL         adresse expéditrice (doit être validée côté service d'envoi)

export async function sendBrevoEmail({ to, subject, html, replyTo }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn('BREVO_API_KEY manquant : e-mail non envoyé.');
    return { skipped: true };
  }
  try {
    const payload = {
      sender: { name: 'WooExtractor', email: process.env.SHOP_EMAIL || 'commandes@wooextractor.com' },
      to: [{ email: to }],
      subject,
      htmlContent: html
    };
    if (replyTo) payload.replyTo = { email: replyTo };
    const res = await fetch(process.env.BREVO_API_URL || 'https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
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

export function esc(v) {
  return String(v == null ? '' : v).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
}

/* --------------------------------------------------------------------------
   Gabarit commun à tous les e-mails : hybride fluide (tableaux 100 % de large,
   600 px maximum), lisible sur mobile même sans media queries, avec des
   ajustements supplémentaires pour les clients e-mail qui les supportent.
   -------------------------------------------------------------------------- */
export function emailLayout({ subtitle = '', preheader = '', body = '' }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
<title>WooExtractor</title>
<style>
  body,table,td,p,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
  img{border:0;max-width:100%;height:auto;}
  @media only screen and (max-width:480px){
    .outer{padding:0 !important;}
    .card{border-radius:0 !important;border-left:0 !important;border-right:0 !important;}
    .px{padding-left:18px !important;padding-right:18px !important;}
    .title{font-size:18px !important;}
    .code{font-size:28px !important;letter-spacing:6px !important;}
    .btn a{display:block !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;width:100%;background:#F5F1E9;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#F5F1E9;font-size:1px;line-height:1px;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F1E9;">
  <tr><td class="outer" align="center" style="padding:24px 12px;">
    <table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;border:1px solid #E7DFD2;border-radius:10px;overflow:hidden;">
      <tr><td class="px" style="background:#201A15;padding:22px 28px;">
        <div style="color:#FFFFFF;font-size:18px;font-weight:700;line-height:1.3;">WooExtractor</div>
        ${subtitle ? `<div style="color:#C9BEB1;font-size:12px;margin-top:2px;line-height:1.4;">${esc(subtitle)}</div>` : ''}
      </td></tr>
      <tr><td class="px" style="padding:28px;color:#4A3F35;font-size:15px;line-height:1.55;">
        ${body}
      </td></tr>
      <tr><td class="px" style="padding:16px 28px;background:#F5F1E9;color:#8A7F72;font-size:12px;line-height:1.5;text-align:center;">
        WooExtractor — contact@wooextractor.com
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/* Ligne "libellé / valeur" empilée : fiable sur écran étroit. */
export function infoRow(label, value) {
  return `<tr><td style="padding:8px 0;border-bottom:1px solid #F0EADF;">
    <div style="font-size:12px;color:#8A7F72;line-height:1.3;">${esc(label)}</div>
    <div style="font-size:14px;color:#201A15;font-weight:600;line-height:1.45;word-break:break-word;">${value}</div>
  </td></tr>`;
}

const METHOD_LABEL = {
  card: 'Carte bancaire',
  crypto: 'Cryptomonnaie',
  transfer: 'Virement bancaire',
  later: 'Commande sans paiement immédiat (lien de paiement à envoyer)'
};

const STATUS_LABEL = {
  payee: 'Payée',
  en_attente_paiement: 'En attente de paiement',
  attente_virement: 'En attente de virement bancaire',
  en_attente_lien_paiement: 'En attente d\'envoi du lien de paiement',
  erreur_paiement: 'Paiement échoué'
};

export function buildOrderEmailHtml(order, { headline } = {}) {
  const items = (order.items || []).map(it =>
    `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #F0EADF;color:#4A3F35;font-size:14px;line-height:1.4;word-break:break-word;">${esc(it.qty)} × ${esc(it.name)}</td>
      <td align="right" style="padding:8px 0 8px 12px;border-bottom:1px solid #F0EADF;color:#201A15;font-weight:600;font-size:14px;white-space:nowrap;">${Number(it.lineTotal).toFixed(2)} €</td>
    </tr>`
  ).join('');

  const c = order.customer || {};
  const methodLabel = METHOD_LABEL[order.paymentMethod] || order.paymentMethod || 'Inconnu';
  const statusLabel = STATUS_LABEL[order.status] || order.status;

  const note = (text) => `<div style="margin-top:20px;background:#FBF0D9;border:1px solid #EAD9A8;border-radius:8px;padding:14px 16px;color:#8A6116;font-size:14px;line-height:1.5;">${text}</div>`;
  const actionNote = order.paymentMethod === 'later'
    ? note(`<strong>Action requise :</strong> envoyer manuellement un lien de paiement à ${esc(c.email)}.`)
    : order.paymentMethod === 'transfer'
    ? note(`<strong>Action requise :</strong> vérifier la réception du virement (réf. ${esc(order.id)}) avant expédition.`)
    : '';

  const body = `
    <h2 class="title" style="margin:0 0 4px;font-size:20px;line-height:1.3;color:#201A15;">${esc(headline || 'Nouvelle commande')}</h2>
    <p style="margin:0 0 20px;color:#8A7F72;font-size:13px;">Commande ${esc(order.id)} — ${esc(statusLabel)}</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${infoRow('Mode de paiement', esc(methodLabel))}
      ${infoRow('Client', `${esc(c.firstname)} ${esc(c.lastname)}`)}
      ${infoRow('E-mail', esc(c.email))}
      ${infoRow('Téléphone', esc(c.phone))}
      ${infoRow('Adresse', `${esc(c.address)}, ${esc(c.postcode)} ${esc(c.city)}, ${esc(c.country)}`)}
      ${c.note ? infoRow('Note', esc(c.note)) : ''}
    </table>

    <h3 style="margin:24px 0 8px;font-size:15px;color:#201A15;">Articles</h3>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${items}
      <tr><td style="padding:10px 0 4px;color:#8A7F72;font-size:14px;">Livraison</td><td align="right" style="padding:10px 0 4px 12px;font-size:14px;white-space:nowrap;">${Number(order.shipping || 0).toFixed(2)} €</td></tr>
      <tr><td style="padding:8px 0 0;font-weight:700;color:#201A15;font-size:16px;">Total</td><td align="right" style="padding:8px 0 0 12px;font-weight:700;color:#A8391B;font-size:16px;white-space:nowrap;">${Number(order.total || 0).toFixed(2)} €</td></tr>
    </table>
    ${actionNote}`;

  return emailLayout({
    subtitle: 'Notification de commande',
    preheader: `${headline || 'Nouvelle commande'} — ${order.id}`,
    body
  });
}
