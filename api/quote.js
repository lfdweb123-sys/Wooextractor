// api/quote.js — Fonction serverless : demande de devis gratuit.
// Reçoit le formulaire de devis, prévient le marchand par e-mail (réponse
// directe possible au client) et envoie un accusé de réception au client.
// Aucune donnée n'est stockée côté serveur.

import { sendBrevoEmail, emailLayout, infoRow, esc } from '../lib/brevo.js';

const RL_WINDOW_MS = 15 * 60 * 1000;
const RL_MAX_PER_IP = 5;
const rlIp = new Map();

function checkRate(key) {
  const now = Date.now();
  const arr = (rlIp.get(key) || []).filter(t => now - t < RL_WINDOW_MS);
  if (arr.length >= RL_MAX_PER_IP) return false;
  arr.push(now);
  rlIp.set(key, arr);
  return true;
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const b = req.body || {};

  // Champ piège pour les robots : un humain ne le remplit jamais.
  if (b.website) return res.status(200).json({ ok: true });

  const q = {
    name: clean(b.name, 100),
    email: clean(b.email, 160),
    phone: clean(b.phone, 30),
    postcode: clean(b.postcode, 12),
    city: clean(b.city, 80),
    product: clean(b.product, 140),
    quantity: clean(b.quantity, 60),
    message: String(b.message == null ? '' : b.message).replace(/\u0000/g, '').trim().slice(0, 2000)
  };

  if (!q.name || !q.phone || !q.product || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q.email)) {
    return res.status(400).json({ message: 'Merci de renseigner votre nom, votre e-mail, votre téléphone et le produit souhaité.' });
  }

  if (!checkRate(clientIp(req))) {
    return res.status(429).json({ message: 'Trop de demandes. Réessayez dans quelques minutes.' });
  }

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  if (!ADMIN_EMAIL) {
    console.error('ADMIN_EMAIL manquant : demande de devis non transmise.');
    return res.status(500).json({ message: "Impossible d'envoyer la demande pour le moment." });
  }

  const rows = `
    ${infoRow('Nom', esc(q.name))}
    ${infoRow('E-mail', esc(q.email))}
    ${infoRow('Téléphone', esc(q.phone))}
    ${infoRow('Livraison', esc([q.postcode, q.city].filter(Boolean).join(' ') || 'Non précisée'))}
    ${infoRow('Produit souhaité', esc(q.product))}
    ${infoRow('Quantité', esc(q.quantity || 'Non précisée'))}
    ${q.message ? infoRow('Message', esc(q.message).replace(/\n/g, '<br>')) : ''}`;

  const adminResult = await sendBrevoEmail({
    to: ADMIN_EMAIL,
    replyTo: q.email,
    subject: `Demande de devis — ${q.name} — ${q.product}`,
    html: emailLayout({
      subtitle: 'Demande de devis gratuit',
      preheader: `${q.name} demande un devis : ${q.product}`,
      body: `
        <h2 class="title" style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#201A15;">Nouvelle demande de devis</h2>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
        <p style="margin:20px 0 0;color:#8A7F72;font-size:13px;">Répondez directement à cet e-mail pour écrire au client.</p>`
    })
  });

  if (!adminResult.ok) {
    return res.status(502).json({ message: "Impossible d'envoyer la demande pour le moment." });
  }

  // Accusé de réception au client (échec non bloquant).
  await sendBrevoEmail({
    to: q.email,
    subject: 'Votre demande de devis — WooExtractor',
    html: emailLayout({
      subtitle: 'Demande de devis gratuit',
      preheader: 'Nous avons bien reçu votre demande de devis.',
      body: `
        <h2 class="title" style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#201A15;">Merci ${esc(q.name)}, nous avons bien reçu votre demande</h2>
        <p style="margin:0 0 16px;">Notre équipe revient vers vous rapidement avec un devis gratuit et sans engagement.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${infoRow('Produit souhaité', esc(q.product))}
          ${infoRow('Quantité', esc(q.quantity || 'Non précisée'))}
        </table>
        <p style="margin:20px 0 0;color:#8A7F72;font-size:13px;line-height:1.5;">Une question ? Répondez simplement à cet e-mail ou écrivez-nous sur WhatsApp au +33 7 59 30 92 00.</p>`
    })
  });

  return res.status(200).json({ ok: true });
}
