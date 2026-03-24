// api/analytics.js — Aggregate booking and membership analytics from GHL
// GET ?days=30  (default 30)

import { GHL }        from '../src/ghl-client.js';
import { cf, mapBooking } from '../src/ghl-mappers.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const days = Math.min(parseInt(req.query.days || '30', 10), 90);

  try {
    const data     = await GHL.listContacts(200);
    const contacts = data.contacts || [];

    const now      = new Date();
    const cutoff   = new Date(now - days * 86400000).toISOString().split('T')[0];

    const bookings = contacts
      .filter(c => cf(c, 'slot_date') >= cutoff)
      .map(mapBooking);

    // Bookings by day
    const byDay = {};
    for (const b of bookings) {
      byDay[b.slotDate] = (byDay[b.slotDate] || 0) + 1;
    }

    // Bookings by facility
    const byFacility = {};
    for (const b of bookings) {
      const fac = b.facility || 'Unspecified';
      byFacility[fac] = (byFacility[fac] || 0) + 1;
    }

    // Guest pass usage
    const guestBookings = bookings.filter(b => b.bookingType === 'guest_pass');

    // Membership tier breakdown
    const tierCount = {};
    for (const c of contacts) {
      const tier = cf(c, 'membership_tier') || cf(c, 'member_tier') || 'ordinary';
      tierCount[tier] = (tierCount[tier] || 0) + 1;
    }

    // Check-in rate
    const checkedIn = bookings.filter(b => b.checkedIn).length;

    return res.status(200).json({
      success: true,
      period:  `Last ${days} days`,
      summary: {
        totalBookings:   bookings.length,
        guestBookings:   guestBookings.length,
        checkedInCount:  checkedIn,
        checkInRate:     bookings.length ? Math.round((checkedIn / bookings.length) * 100) : 0,
        totalMembers:    contacts.length,
      },
      byDay,
      byFacility,
      tierBreakdown: tierCount,
    });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
}
