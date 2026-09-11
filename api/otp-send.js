// api/otp-send.js — Vercel Serverless Function
// Envoie un code à 4 chiffres par e-mail au client pour vérifier son adresse
// avant d'enregistrer une commande "sans paiement immédiat".
// Aucun stockage : le code est signé (HMAC) et renvoyé au client sous forme
// de token, que le client renverra à la vérification.

import crypto from 'crypto';
import { sendBrevoEmail } from '../lib/brevo.js';

const TTL_MS = 10 * 60 * 1000; // 10 minutes

function sign(code, ts) {
  const secret = process.env.OTP_SECRET;
  if (!secret) throw new Error('OTP_SECRET manquant');
  return crypto.createHmac('sha256', secret).update(`${code}.${ts}`).digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email } = req.body || {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'E-mail invalide.' });
  }

  if (!process.env.OTP_SECRET) {
    console.error('OTP_SECRET manquant.');
    return res.status(500).json({ message: 'Configuration serveur incomplète.' });
  }

  // Code à 4 chiffres, avec leading zeros possibles (0000–9999)
  const code = String(crypto.randomInt(0, 10000)).padStart(4, '0');
  const ts = Date.now();
  const token = `${code}.${sign(code, ts)}.${ts}`;

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;">
      <h2 style="color:#201A15;">Vérification de votre e-mail</h2>
      <p style="color:#4A3F35;">Voici votre code de confirmation :</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#A8391B;margin:24px 0;">${code}</p>
      <p style="color:#8A7F72;font-size:13px;">Ce code est valable 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>
    </div>`;

  const result = await sendBrevoEmail({
    to: email,
    subject: 'Votre code de confirmation — WooExtractor',
    html
  });

  if (!result.ok) {
    return res.status(502).json({ message: "Impossible d'envoyer l'e-mail pour le moment." });
  }

  return res.status(200).json({ token });
}
