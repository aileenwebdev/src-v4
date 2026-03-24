// api/fetch-bookings.js — Today's bookings for staff/management
// Auth: valid API_PASSWORD query param OR active staff/management session cookie
// GET ?all=true → return all dates, not just today (management use)
'use strict';
const cookie = require('cookie');

function isAuthorized(req) {
  const pwd = (req.query.pwd || '').trim();
  if (pwd && process.env.API_PASSWORD && pwd === process.env.API_PASSWORD) return true;
  try {
    const cookies = cookie.parse(req.headers.cookie || '');
    const raw = cookies['src_session'];
    if (!raw) return false;
    const session = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    return !!(session && session.staffId && session.role);
  } catch { return false; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')  return res.status(405).json({ error: 'Method not allowed' });

  if (!isAuthorized(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorised' });
  }

  const token      = process.env.GHL_PRIVATE_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID || '0h4aeb2m1HrDJ0coPb31';
  const fetchAll   = req.query.all === 'true';

  const nowSGT   = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const todaySGT = nowSGT.toISOString().split('T')[0];

  try {
    const ghlRes = await fetch(
      `https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&limit=200`,
      { headers: { 'Authorization': `Bearer ${token}`, 'Version': '2021-07-28' } }
    );
    if (!ghlRes.ok) {
      const detail = await ghlRes.text();
      return res.status(502).json({ success: false, error: `API error ${ghlRes.status}`, detail });
    }

    const { contacts: all = [] } = await ghlRes.json();

    const cf = (c, k) => {
      const f = (c.customFields || []).find(x => x.fieldKey === `contact.${k}` || x.fieldKey === k);
      return f ? (f.fieldValue || '') : '';
    };

    // Filter: contacts that have a slot_date (are bookings)
    const bookings = all.filter(c => {
      const slotDate = cf(c, 'slot_date');
      if (!slotDate) return false;
      return fetchAll ? true : slotDate === todaySGT;
    });

    // Enrich with parsed custom fields
    const enriched = bookings.map(c => ({
      id:              c.id,
      firstName:       c.firstName || '',
      lastName:        c.lastName  || '',
      name:            `${c.firstName || ''} ${c.lastName || ''}`.trim(),
      email:           c.email || '',
      phone:           c.phone || '',
      customFields:    c.customFields || [],
      // Pre-parsed fields for convenience
      slotDate:        cf(c, 'slot_date'),
      slotStartTime:   cf(c, 'slot_start_time') || cf(c, 'slot_time'),
      slotEndTime:     cf(c, 'slot_end_time'),
      facility:        cf(c, 'facility_or_venue') || cf(c, 'facility'),
      bookingType:     cf(c, 'booking_type') || 'advance',
      bookingRef:      cf(c, 'booking_reference'),
      bookingShift:    cf(c, 'booking_shift'),
      pax:             cf(c, 'outlet_pax') || '1',
      checkedIn:       cf(c, 'checked_in') === 'true',
      checkedInAt:     cf(c, 'checked_in_at'),
      membershipNumber:cf(c, 'membership_number'),
      invitingMember:  cf(c, 'member_owner_name'),
      invitingMemberId:cf(c, 'inviting_member_id') || cf(c, 'member_owner_cid'),
      bookingStatus:   cf(c, 'booking_status') || 'confirmed',
      guestRole:       cf(c, 'guest_role'),
    }));

    // Sort by slotDate desc, then slotStartTime
    enriched.sort((a, b) => {
      const d = b.slotDate.localeCompare(a.slotDate);
      return d !== 0 ? d : (a.slotStartTime || '').localeCompare(b.slotStartTime || '');
    });

    return res.status(200).json({
      success:  true,
      contacts: enriched,
      total:    enriched.length,
      date:     fetchAll ? 'all' : todaySGT,
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};
