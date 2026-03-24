// api/conversations.js — Fetch conversations from the sub-account inbox
// GET ?limit=50  → list conversations
// GET ?id=xxx    → get messages in a specific conversation
'use strict';
const { GHL } = require('../src/ghl-client.js');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id, limit = '50' } = req.query || {};

  try {
    if (id) {
      const data = await GHL.getMessages(id);
      return res.status(200).json({ success: true, messages: data.messages || [] });
    }

    const data = await GHL.listConversations(Math.min(parseInt(limit, 10), 100));
    return res.status(200).json({
      success:       true,
      conversations: data.conversations || [],
    });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
};
