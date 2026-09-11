// api/otp-verify.js — Vercel Serverless Function
// Vérifie le code à 4 chiffres renvoyé par le client contre le token signé
// émis par otp-send.js. Aucun stockage serveur.

import crypto from 'crypto';

const TTL_MS = 10 * 60 * 1000;

function sign(code, ts) {
  const secret = process.env.OTP_SECRET;
  if (!secret) throw new Error('OTP_SECRET manquant');
  return crypto.createHmac('sha256', secret).update(`${code}.${ts}`).digest('hex');
}

function timingSafeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { token, code } = req.body || {};
  if (!token || !code) {
    return res.status(400).json({ ok: false, message: 'Token ou code manquant.' });
  }

  const parts = String(token).split('.');
  if (parts.length !== 3) {
    return res.status(400).json({ ok: false, message: 'Token invalide.' });
  }
  const [tokenCode, tokenSig, tokenTs] = parts;
  const ts = Number(tokenTs);
  if (!Number.isFinite(ts)) {
    return res.status(400).json({ ok: false, message: 'Token invalide.' });
  }

  if (Date.now() - ts > TTL_MS) {
    return res.status(400).json({ ok: false, message: 'Code expiré, demandez-en un nouveau.' });
  }

  let expectedSig;
  try {
    expectedSig = sign(tokenCode, ts);
  } catch {
    return res.status(500).json({ ok: false, message: 'Configuration serveur incomplète.' });
  }

  if (!timingSafeEqual(tokenSig, expectedSig)) {
    return res.status(400).json({ ok: false, message: 'Token altéré.' });
  }

  if (!timingSafeEqual(String(code).trim(), tokenCode)) {
    return res.status(400).json({ ok: false, message: 'Code incorrect.' });
  }

  return res.status(200).json({ ok: true });
}
