// api/spam.js — Vercel Serverless Function
// Proxy ke Flox SpamOTP API (bypass CORS)

const FLOX_API    = 'https://flox-spamotp.vercel.app/api';
const FLOX_ORIGIN = 'https://flox-spamotp.vercel.app';
const FLOX_TOKEN  = 'PARADOX_SUPER_SECRET_998877';

export default async function handler(req, res) {
  // CORS headers biar frontend bisa akses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, phone, email, link } = req.body || {};

  // Tentukan payload berdasarkan action
  let payload;
  if (action === 'free_alight_send') {
    payload = { action: 'free_alight_send', email };
  } else if (action === 'free_alight_verify') {
    payload = { action: 'free_alight_verify', email, link };
  } else {
    // Default: spam OTP
    const nomor = phone || req.body?.nomor;
    if (!nomor) return res.status(400).json({ error: 'Nomor kosong' });
    payload = { action: 'request_otp', phone: nomor };
  }

  try {
    const upstream = await fetch(FLOX_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Origin': FLOX_ORIGIN,
        'Referer': FLOX_ORIGIN + '/',
        'x-paradox-token': FLOX_TOKEN,
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'
      },
      body: JSON.stringify(payload)
    });

    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
