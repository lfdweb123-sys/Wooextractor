// api/otp-send.js — Vercel Serverless Function
// Envoie un code à 4 chiffres par e-mail pour vérifier l'adresse du client
// avant d'enregistrer une commande "sans paiement immédiat" ou "virement".
// Aucun stockage : le code est signé (HMAC) et renvoyé au client sous forme
// de token. Rate limit en mémoire par IP et par e-mail.

import crypto from 'crypto';
import { sendBrevoEmail, emailLayout } from '../lib/brevo.js';

const TTL_MS = 10 * 60 * 1000;      // validité du code : 10 minutes
const RL_WINDOW_MS = 15 * 60 * 1000; // fenêtre de rate limit : 15 minutes
const RL_MAX_PER_IP = 5;             // max d'envois par IP sur la fenêtre
const RL_MAX_PER_EMAIL = 3;          // max d'envois par e-mail sur la fenêtre

// Rate limit en mémoire (par instance Vercel). Suffisant pour un petit volume.
const rlIp = new Map();
const rlEmail = new Map();

function checkRate(map, key, max) {
  const now = Date.now();
  const arr = (map.get(key) || []).filter(t => now - t < RL_WINDOW_MS);
  if (arr.length >= max) return false;
  arr.push(now);
  map.set(key, arr);
  return true;
}

function sign(code, ts) {
  const secret = process.env.OTP_SECRET;
  if (!secret) throw new Error('OTP_SECRET manquant');
  return crypto.createHmac('sha256', secret).update(`${code}.${ts}`).digest('hex');
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
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

  const ip = clientIp(req);
  const emailKey = email.trim().toLowerCase();

  if (!checkRate(rlIp, ip, RL_MAX_PER_IP)) {
    return res.status(429).json({ message: 'Trop de demandes. Réessayez dans quelques minutes.' });
  }
  if (!checkRate(rlEmail, emailKey, RL_MAX_PER_EMAIL)) {
    return res.status(429).json({ message: 'Trop de codes envoyés à cette adresse. Réessayez plus tard.' });
  }

  const code = String(crypto.randomInt(0, 10000)).padStart(4, '0');
  const ts = Date.now();
  const token = `${code}.${sign(code, ts)}.${ts}`;

  const html = emailLayout({
    subtitle: 'Vérification de votre adresse e-mail',
    preheader: `Votre code de confirmation : ${code}`,
    body: `
      <h2 class="title" style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#201A15;">Vérification de votre e-mail</h2>
      <p style="margin:0;color:#4A3F35;font-size:15px;">Voici votre code de confirmation :</p>
      <p class="code" style="font-size:34px;font-weight:700;letter-spacing:8px;color:#A8391B;margin:22px 0;text-align:center;">${code}</p>
      <p style="margin:0;color:#8A7F72;font-size:13px;line-height:1.5;">Ce code est valable 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>`
  });

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
