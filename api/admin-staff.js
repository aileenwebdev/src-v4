// api/admin-staff.js — Manage staff user records
// GET              → list staff (passwords redacted)
// POST  { username, password, role, name, email } → create staff user
// DELETE ?username → deactivate (sets active: false)
//
// Store: DATA_DIR/staff-users.json (Railway volume at /data) or falls back to STAFF_USERS env

const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR  = process.env.DATA_DIR || '/data';
const STORE_PATH = path.join(DATA_DIR, 'staff-users.json');

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function loadStore() {
  if (fs.existsSync(STORE_PATH)) {
    try { return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')); } catch { /* fall through */ }
  }
  // Bootstrap from env
  try { return JSON.parse(process.env.STAFF_USERS || '[]'); } catch { return []; }
}

function saveStore(users) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(users, null, 2));
  } catch { /* volume may not be mounted in dev */ }
}

function redact(users) {
  return users.map(({ passwordHash: _p, ...rest }) => rest);
}

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    return res.status(200).json({ success: true, staff: redact(loadStore()) });
  }

  if (req.method === 'POST') {
    const { username, password, role, name, email } = req.body || {};
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'username, password, and role required' });
    }
    const users = loadStore();
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    users.push({
      username,
      passwordHash: sha256(password),
      role:   role === 'management' ? 'management' : 'staff',
      name:   name || username,
      email:  email || '',
      active: true,
    });
    saveStore(users);
    return res.status(201).json({ success: true });
  }

  if (req.method === 'DELETE') {
    const { username } = req.query || {};
    if (!username) return res.status(400).json({ error: 'username required' });
    const users   = loadStore();
    const idx     = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    users[idx].active = false;
    saveStore(users);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
