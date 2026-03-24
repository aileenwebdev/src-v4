// api/login.js
// REPLACES the direct browser call to /api/auth-member?pwd=...
// The browser now calls /api/login (no password needed from browser side)
// This file lives on the server, so API_PASSWORD never reaches the browser.
const cookie = require('cookie');

module.exports = async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Parse body if not already parsed
  if (typeof req.body === 'undefined') {
    return res.status(400).json({ success: false, error: 'Request body missing.' });
  }

  // Parse body manually if needed
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const { membershipNumber, email } = body;

  if (!membershipNumber || !email) {
    return res.status(400).json({ success: false, error: 'Membership number and email are required.' });
  }

  const id = membershipNumber.toString().toUpperCase().replace(/[-\s]/g, '');

  try {
    if (!process.env.API_PASSWORD) {
      console.warn('API_PASSWORD not set, falling back to mock authentication.');
      const known = [
        { membershipNumber: 'SRC0102', email: 'benjamin.ong@src-demo.local', name: 'Benjamin Ong', firstName: 'Benjamin', lastName: 'Ong', quotaTotal: 4, quotaUsed: 0, tier: 'Full Member' },
        { membershipNumber: 'SRC0123', email: 'cheryl.lee@src-demo.local', name: 'Cheryl Lee', firstName: 'Cheryl', lastName: 'Lee', quotaTotal: 4, quotaUsed: 0, tier: 'Full Member' }
      ].find(m => m.membershipNumber === id && m.email === email.toString().toLowerCase());

      if (known) {
        return res.status(200).json({ success: true, member: known });
      }
      return res.status(401).json({ success: false, error: 'Invalid credentials (Mock Mode)' });
    }

    const authRes = await fetch(
      `https://src-poc-v2.vercel.app/api/auth-member?pwd=${encodeURIComponent(process.env.API_PASSWORD)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membershipNumber: id, email: email.toString().toLowerCase() }),
      }
    );

    const data = await authRes.json();

    if (!authRes.ok || !data.success) {
      return res.status(401).json({
        success: false,
        error: 'Invalid membership number or email. Please try again.',
      });
    }

    const isProd = process.env.NODE_ENV === 'production';
    const sessionValue = Buffer.from(
      JSON.stringify({ memberId: data.member.membershipNumber, email: data.member.email })
    ).toString('base64');

    res.setHeader('Set-Cookie', cookie.serialize('src_session', sessionValue, {
      httpOnly: true,
      secure:   isProd,
      sameSite: 'strict',
      maxAge:   30 * 60,
      path:     '/',
    }));

    return res.status(200).json({ success: true, member: data.member });

  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ success: false, error: 'Login service unavailable. Please try again.' });
  }
};
