// api/submit-booking.js — Server-side booking submission to GHL inbound webhook
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const webhookUrl = process.env.GHL_INBOUND_WEBHOOK_URL;
  if (!webhookUrl) return res.status(503).json({ error: 'Booking webhook not configured' });

  try {
    const {
      email, phone, name, membership_number,
      facility_or_venue, booking_shift, slot_date,
      slot_start_time, slot_end_time, outlet_pax,
      booking_reference, booking_type,
    } = req.body || {};

    if (!email || !slot_date || !facility_or_venue || !booking_reference) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Compute scheduled timestamps
    function isoAddMins(isoStart, mins) {
      const d = new Date(isoStart);
      d.setMinutes(d.getMinutes() + mins);
      return d.toISOString().slice(0, 19);
    }

    const startISO = slot_start_time || (slot_date + 'T00:00:00');

    const payload = {
      email,
      phone:                 phone || '',
      name:                  name  || '',
      membership_number:     membership_number || '',
      facility_or_venue,
      booking_shift:         booking_shift || '',
      slot_date,
      slot_start_time:       startISO,
      slot_end_time:         slot_end_time || isoAddMins(startISO, 60),
      outlet_pax:            String(outlet_pax || 1),
      booking_reference,
      booking_type:          booking_type || 'advance',
      cancellation_deadline: isoAddMins(startISO, -1440),
      overdue_check_at:      isoAddMins(startISO, 15),
      no_show_check_at:      isoAddMins(startISO, 30),
      feedback_send_at:      isoAddMins(startISO, 180),
    };

    const response = await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`GHL webhook responded ${response.status}`);

    return res.status(200).json({ success: true, booking_reference });
  } catch (error) {
    console.error('submit-booking error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}
