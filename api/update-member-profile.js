// api/update-member-profile.js — PATCH a member's editable fields in GHL
// PATCH body: { contactId, fields: { preferredContact?, phone? } }

import { GHL } from '../src/ghl-client.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  const { contactId, fields } = req.body || {};
  if (!contactId || !fields || typeof fields !== 'object') {
    return res.status(400).json({ error: 'contactId and fields required' });
  }

  // Only allow a safe subset of fields to be updated via this endpoint
  const ALLOWED = ['phone', 'preferredContact', 'flagged'];
  const custom  = [];
  const top     = {};

  for (const [key, val] of Object.entries(fields)) {
    if (!ALLOWED.includes(key)) continue;
    if (key === 'phone') {
      top.phone = val;
    } else if (key === 'flagged') {
      // Manage via tags
      // handled below
    } else {
      custom.push({ key: `contact.${key}`, field_value: String(val) });
    }
  }

  try {
    const payload = { ...top };
    if (custom.length) payload.customFields = custom;

    // Handle flagging via tags
    if (fields.flagged !== undefined) {
      const contact = await GHL.getContact(contactId);
      const tags    = new Set(contact.contact?.tags || []);
      if (fields.flagged) tags.add('flagged'); else tags.delete('flagged');
      payload.tags = [...tags];
    }

    await GHL.updateContact(contactId, payload);
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
}
