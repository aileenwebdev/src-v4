// api/login-staff.js — Staff and Management login
// POST { username, password }
// Validates against STAFF_USERS env var (JSON array of {username, passwordHash, role})
// passwordHash = hex SHA-256 of the password (use scripts/hash-password.js to generate)

const crypto = require('crypto');
const cookie = require('cookie');

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function loadUsers() {
  try {
    return JSON.parse(process.env.STAFF_USERS || '[]');
  } catch {
    return [];
  }
}

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') return res.status(405).end();

  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const users = loadUsers();
  const user  = users.find(u => (u.username || u.staffId || '').toLowerCase() === username.toLowerCase().trim());

  if (!user || sha256(password) !== user.passwordHash) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const role = user.role === 'management' ? 'management' : 'staff';

  const sessionPayload = {
    staffId:   user.username,
    email:     user.email || '',
    role,
    name:      user.name || user.username,
    issuedAt:  Date.now(),
  };

  const encoded = Buffer.from(JSON.stringify(sessionPayload)).toString('base64');

  res.setHeader('Set-Cookie', cookie.serialize('src_session', encoded, {
    httpOnly: true,
    sameSite: 'strict',
    secure:   process.env.NODE_ENV === 'production',
    path:     '/',
    maxAge:   8 * 60 * 60, // 8 hours
  }));

  return res.status(200).json({
    success: true,
    role,
    name: sessionPayload.name,
  });
};
