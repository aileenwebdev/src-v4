export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const pwd = req.query.pwd || '';
  if (!pwd || pwd !== process.env.API_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorised' });
  }

  const token = process.env.GHL_PRIVATE_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID || '0h4aeb2m1HrDJ0coPb31';

  const nowSGT = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const todaySGT = nowSGT.toISOString().split('T')[0];

  try {
    const ghlRes = await fetch(
      `https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&limit=100`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Version': '2021-07-28',
        },
      }
    );

    const rawText = await ghlRes.text();

    if (!ghlRes.ok) {
      return res.status(502).json({ error: `GHL ${ghlRes.status}`, detail: rawText });
    }

    const data = JSON.parse(rawText);
    const all = data.contacts || [];

    const today = all.filter(c => {
      const f = (c.customFields || []).find(x =>
        x.fieldKey === 'contact.slot_date' || x.fieldKey === 'slot_date'
      );
      return f && f.fieldValue === todaySGT;
    });

    return res.status(200).json({
      success: true,
      contacts: today,
      total: today.length,
      date: todaySGT,
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}