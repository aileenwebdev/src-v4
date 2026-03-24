// api/analytics.js — Aggregate booking and membership analytics
// GET ?days=30  (default 30)
'use strict';
const { GHL }              = require('../src/ghl-client.js');
const { cf, mapBooking }   = require('../src/ghl-mappers.js');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const days = Math.min(parseInt(req.query.days || '30', 10), 90);

  try {
    const data     = await GHL.listContacts(200);
    const contacts = data.contacts || [];

    const now    = new Date();
    const cutoff = new Date(now - days * 86400000).toISOString().split('T')[0];

    const bookings     = contacts.filter(c => cf(c, 'slot_date') >= cutoff).map(mapBooking);
    const guestBookings = bookings.filter(b => b.bookingType === 'guest_pass');
    const checkedIn    = bookings.filter(b => b.checkedIn).length;

    // Bookings by day
    const byDay = {};
    for (const b of bookings) byDay[b.slotDate] = (byDay[b.slotDate] || 0) + 1;

    // Bookings by facility
    const byFacility = {};
    for (const b of bookings) {
      const fac = b.facility || 'Unspecified';
      byFacility[fac] = (byFacility[fac] || 0) + 1;
    }

    // Bookings by type
    const byType = {};
    for (const b of bookings) byType[b.bookingType] = (byType[b.bookingType] || 0) + 1;

    // Membership tier breakdown
    const tierCount = {};
    for (const c of contacts) {
      const tier = cf(c, 'membership_tier') || cf(c, 'member_tier') || 'ordinary';
      tierCount[tier] = (tierCount[tier] || 0) + 1;
    }

    // Pipeline: guests per member
    const guestsByMember = {};
    for (const b of guestBookings) {
      const key = b.invitingMemberId || b.membershipNumber || b.email;
      if (!guestsByMember[key]) guestsByMember[key] = { memberName: b.memberName || key, count: 0, bookings: [] };
      guestsByMember[key].count++;
      guestsByMember[key].bookings.push(b);
    }

    // Check-in pipeline stages
    const pipeline = {
      confirmed:   bookings.filter(b => !b.checkedIn && b.slotDate >= now.toISOString().split('T')[0]).length,
      checkedIn:   checkedIn,
      noShow:      bookings.filter(b => !b.checkedIn && b.slotDate < now.toISOString().split('T')[0]).length,
    };

    return res.status(200).json({
      success: true,
      period:  `Last ${days} days`,
      summary: {
        totalBookings:  bookings.length,
        guestBookings:  guestBookings.length,
        checkedInCount: checkedIn,
        checkInRate:    bookings.length ? Math.round((checkedIn / bookings.length) * 100) : 0,
        totalMembers:   contacts.length,
      },
      byDay,
      byFacility,
      byType,
      tierBreakdown:   tierCount,
      guestsByMember,
      pipeline,
      recentBookings:  bookings.sort((a, b) => b.slotDate.localeCompare(a.slotDate)).slice(0, 20),
    });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
};
