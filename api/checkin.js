// api/checkin.js — Toggle check-in status for a booking contact
// POST body: { contactId, checkedIn: boolean }

import { GHL } from '../src/ghl-client.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { contactId, checkedIn } = req.body || {};
  if (!contactId) return res.status(400).json({ error: 'contactId required' });

  try {
    await GHL.updateContact(contactId, {
      customFields: [
        { key: 'contact.checked_in',    field_value: checkedIn ? 'true' : 'false' },
        { key: 'contact.checked_in_at', field_value: checkedIn ? new Date().toISOString() : '' },
      ],
    });
    return res.status(200).json({ success: true, checkedIn: !!checkedIn });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
}
