// api/fetch-bookings.js
// Edge Runtime — reads GHL contacts for today SGT
// Auth: ?pwd= must match process.env.API_PASSWORD
// CORS: open (staff + management portals call this cross-origin)

export const config = {
  runtime: 'edge',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// api/fetch-data.js
// Export both for Edge and for Node.js
export default async function handler(req, res) {
  // Check if we are in an environment that uses Response (Edge) or res (Node)
  const isNode = res && typeof res.status === 'function';

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS, status: 200 });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const { searchParams } = new URL(req.url);
  const pwd = searchParams.get('pwd') || '';
  if (!pwd || pwd !== process.env.API_PASSWORD) {
    return new Response(JSON.stringify({ error: 'Unauthorised' }), {
      status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // Today SGT (UTC+8)
  const nowSGT = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const todaySGT = nowSGT.toISOString().split('T')[0];

  const token = process.env.GHL_PRIVATE_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID || '0h4aeb2m1HrDJ0coPb31';

  if (!token) {
    return new Response(JSON.stringify({ error: 'GHL_PRIVATE_TOKEN not configured' }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    // GHL Contacts API v2 — same base URL as fetch-data.js
    const ghlRes = await fetch(
      `https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&limit=100`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
        },
      }
    );

    if (!ghlRes.ok) {
      const errText = await ghlRes.text();
      return new Response(JSON.stringify({ error: `GHL API error ${ghlRes.status}`, detail: errText }), {
        status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const ghlData = await ghlRes.json();
    const allContacts = ghlData.contacts || [];

    // Filter to today's slot_date
    const todayContacts = allContacts.filter(contact => {
      const fields = contact.customFields || [];
      const slotDateField = fields.find(f =>
        f.fieldKey === 'contact.slot_date' ||
        f.fieldKey === 'slot_date' ||
        f.id === 'slot_date'
      );
      return slotDateField && slotDateField.fieldValue === todaySGT;
    });

    return new Response(JSON.stringify({
      contacts: todayContacts,
      total: todayContacts.length,
      date: todaySGT,
      fetchedAt: new Date().toISOString(),
    }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: 'Internal server error', detail: e.message }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}