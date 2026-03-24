// api/tickets.js — Create and list support tickets stored as contact notes
// GET  ?contactId=xxx            → list tickets for that member
// POST { contactId, subject, body, createdBy } → create ticket
'use strict';
const { GHL } = require('../src/ghl-client.js');

const TICKET_PREFIX = '[TICKET]';

function formatTicket({ subject, body, createdBy, status = 'open' }) {
  return `${TICKET_PREFIX} ${subject}\nStatus: ${status}\nCreated by: ${createdBy}\n\n${body}`;
}

function parseTicket(note) {
  const lines = (note.body || '').split('\n');
  if (!lines[0]?.startsWith(TICKET_PREFIX)) return null;
  const subject    = lines[0].replace(TICKET_PREFIX, '').trim();
  const statusLine = lines.find(l => l.startsWith('Status:')) || '';
  const byLine     = lines.find(l => l.startsWith('Created by:')) || '';
  const body       = lines.slice(3).join('\n').trim();
  return {
    id:        note.id,
    subject,
    status:    statusLine.replace('Status:', '').trim() || 'open',
    createdBy: byLine.replace('Created by:', '').trim(),
    body,
    createdAt: note.dateAdded || note.createdAt || '',
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    const { contactId } = req.query || {};
    if (!contactId) return res.status(400).json({ error: 'contactId required' });
    try {
      const data    = await GHL.getNotes(contactId);
      const tickets = (data.notes || []).map(parseTicket).filter(Boolean);
      return res.status(200).json({ success: true, tickets });
    } catch (e) {
      return res.status(e.status || 500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    const { contactId, subject, body, createdBy } = req.body || {};
    if (!contactId || !subject || !body) {
      return res.status(400).json({ error: 'contactId, subject, and body required' });
    }
    try {
      await GHL.addNote(contactId, formatTicket({ subject, body, createdBy: createdBy || 'Staff' }));
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(e.status || 500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
