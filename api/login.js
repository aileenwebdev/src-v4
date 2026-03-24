// api/login.js
// Authenticates SRC members against GHL contacts, sets session cookie
const cookie = require('cookie');

const MOCK_MEMBERS = [
  { membershipNumber: 'SRC0102', email: 'benjamin.ong@src-demo.local',  name: 'Benjamin Ong',  firstName: 'Benjamin', lastName: 'Ong',  tier: 'ordinary', tierLabel: 'Ordinary Member', quotaTotal: 4, quotaUsed: 0 },
  { membershipNumber: 'SRC0123', email: 'cheryl.lee@src-demo.local',    name: 'Cheryl Lee',    firstName: 'Cheryl',   lastName: 'Lee',  tier: 'ordinary', tierLabel: 'Ordinary Member', quotaTotal: 4, quotaUsed: 0 },
  { membershipNumber: 'SRC0196', email: 'felicity.wong@src-demo.local', name: 'Felicity Wong', firstName: 'Felicity', lastName: 'Wong', tier: 'ordinary', tierLabel: 'Ordinary Member', quotaTotal: 4, quotaUsed: 0 },
];

module.exports = async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  const { membershipNumber, email } = body;
  if (!membershipNumber || !email) {
    return res.status(400).json({ success: false, error: 'Membership number and email are required.' });
  }

  const id    = membershipNumber.toString().toUpperCase().trim();
  const em    = email.toString().toLowerCase().trim();
  const token = process.env.GHL_PRIVATE_TOKEN;
  const locId = process.env.GHL_LOCATION_ID || '0h4aeb2m1HrDJ0coPb31';

  // ── Mock mode (no GHL token configured) ─────────────────────────────────
  if (!token) {
    console.warn('GHL_PRIVATE_TOKEN not set — using mock authentication.');
    const mock = MOCK_MEMBERS.find(m => m.membershipNumber === id && m.email === em);
    if (!mock) return res.status(401).json({ success: false, error: 'Invalid membership number or email. Please try again.' });
    return issueSession(res, mock);
  }

  // ── Live GHL lookup ───────────────────────────────────────────────────────
  try {
    const searchRes = await fetch(
      `https://services.leadconnectorhq.com/contacts/?locationId=${locId}&query=${encodeURIComponent(em)}&limit=20`,
      { headers: { 'Authorization': `Bearer ${token}`, 'Version': '2021-07-28' } }
    );

    if (!searchRes.ok) {
      const detail = await searchRes.text();
      console.error('GHL contact search failed:', searchRes.status, detail);
      return res.status(502).json({ success: false, error: 'Member lookup unavailable. Please try again later.' });
    }

    const { contacts = [] } = await searchRes.json();

    // Helper to read a custom field value
    const cf = (contact, key) => {
      const f = (contact.customFields || []).find(x =>
        x.fieldKey === `contact.${key}` || x.fieldKey === key
      );
      return f ? (f.fieldValue || '') : '';
    };

    // Match on email + membership_number custom field
    const match = contacts.find(c =>
      (c.email || '').toLowerCase() === em &&
      cf(c, 'membership_number').toUpperCase() === id
    );

    if (!match) {
      return res.status(401).json({ success: false, error: 'Invalid membership number or email. Please try again.' });
    }

    const tierMap = {
      ordinary:  { label: 'Ordinary Member',  quota: 4 },
      associate: { label: 'Associate Member', quota: 2 },
      life:      { label: 'Life Member',       quota: 6 },
    };
    const rawTier = (cf(match, 'membership_tier') || cf(match, 'member_tier') || 'ordinary').toLowerCase();
    const tier    = tierMap[rawTier] || tierMap.ordinary;

    const member = {
      id:               match.id,
      firstName:        match.firstName || '',
      lastName:         match.lastName  || '',
      name:             `${match.firstName || ''} ${match.lastName || ''}`.trim(),
      email:            match.email || em,
      phone:            match.phone || '',
      membershipNumber: id,
      tier:             rawTier,
      tierLabel:        tier.label,
      quotaTotal:       tier.quota,
      quotaUsed:        0,   // quota counted separately if needed
    };

    return issueSession(res, member);

  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ success: false, error: 'Login service unavailable. Please try again.' });
  }
};

function issueSession(res, member) {
  const isProd      = process.env.NODE_ENV === 'production';
  const sessionValue = Buffer.from(
    JSON.stringify({ memberId: member.membershipNumber, email: member.email })
  ).toString('base64');

  res.setHeader('Set-Cookie', require('cookie').serialize('src_session', sessionValue, {
    httpOnly: true,
    secure:   isProd,
    sameSite: 'strict',
    maxAge:   30 * 60,
    path:     '/',
  }));

  return res.status(200).json({ success: true, member });
}
