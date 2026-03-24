// api/system-config.js — Read / write runtime configuration
// GET  → return current config
// POST { key, value } → update a single key
//
// Config file: DATA_DIR/config.json  (Railway volume)
// Defaults defined below are used when the file doesn't exist.

const fs   = require('fs');
const path = require('path');

const DATA_DIR   = process.env.DATA_DIR || '/data';
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');

const DEFAULTS = {
  ghlLocationId: process.env.GHL_LOCATION_ID || '0h4aeb2m1HrDJ0coPb31',
  quotas: {
    ordinary:  4,
    associate: 2,
    life:      6,
    full:      4,
  },
  facilities: [
    'Swimming Pool',
    'Tennis Court',
    'Squash Court',
    'Gym',
    'Billiards Room',
    'Function Room',
  ],
  workflowIds: {
    bookingConfirmed: '',
    guestPassIssued:  '',
    memberFlagged:    '',
  },
};

function loadConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    try { return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) }; } catch { /* fall through */ }
  }
  return { ...DEFAULTS };
}

function saveConfig(cfg) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    return res.status(200).json({ success: true, config: loadConfig() });
  }

  if (req.method === 'POST') {
    const { key, value } = req.body || {};
    if (!key) return res.status(400).json({ error: 'key required' });

    const cfg = loadConfig();
    // Support dot-notation: "quotas.ordinary"
    const parts = key.split('.');
    let target  = cfg;
    for (let i = 0; i < parts.length - 1; i++) {
      if (typeof target[parts[i]] !== 'object') target[parts[i]] = {};
      target = target[parts[i]];
    }
    target[parts[parts.length - 1]] = value;

    try {
      saveConfig(cfg);
    } catch {
      return res.status(500).json({ error: 'Could not write config (volume not mounted?)' });
    }
    return res.status(200).json({ success: true, config: cfg });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
