// api/auth-member.js
// Authenticates SRC members against GHL contacts
// POST body: { membershipNumber, email }
// Returns: member data + quota counts on success, 401 on fail

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { membershipNumber, email } = req.body || {};

  if (!membershipNumber || !email) {
    return res.status(400).json({ error: 'Membership number and email required' });
  }

  const token = process.env.GHL_PRIVATE_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID || '0h4aeb2m1HrDJ0coPb31';
  const apiPwd = req.query.pwd || '';

  if (!apiPwd || apiPwd !== process.env.API_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorised' });
  }

  try {
    // Search GHL contacts by email
    const searchRes = await fetch(
      `https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&query=${encodeURIComponent(email.toLowerCase())}&limit=10`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Version': '2021-07-28',
        },
      }
    );

    if (!searchRes.ok) {
      const err = await searchRes.text();
      return res.status(502).json({ error: `GHL search failed: ${searchRes.status}`, detail: err });
    }

    const data = await searchRes.json();
    const contacts = data.contacts || [];

    // Find contact where email matches AND membership_number matches
    const cf = (contact, key) => {
      const f = (contact.customFields || []).find(x =>
        x.fieldKey === `contact.${key}` || x.fieldKey === key
      );
      return f ? (f.fieldValue || '') : '';
    };

    const match = contacts.find(c => {
      const contactEmail = (c.email || '').toLowerCase();
      const contactMbrNum = cf(c, 'membership_number').toUpperCase();
      return contactEmail === email.toLowerCase() &&
             contactMbrNum === membershipNumber.toUpperCase();
    });

    if (!match) {
      return res.status(401).json({ error: 'Invalid membership number or email' });
    }

    // Get member tier
    const tierMap = {
      'ordinary':  { label: 'Ordinary Member', quota: 4 },
      'associate': { label: 'Associate Member', quota: 2 },
      'life':      { label: 'Life Member',      quota: 6 },
    };
    const rawTier = cf(match, 'membership_tier') || cf(match, 'member_tier') || 'ordinary';
    const tier = tierMap[rawTier.toLowerCase()] || tierMap['ordinary'];

    // Count guest passes used this month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString().split('T')[0];

    const guestRes = await fetch(
      `https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&limit=100`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Version': '2021-07-28',
        },
      }
    );

    let quotaUsed = 0;
    if (guestRes.ok) {
      const guestData = await guestRes.json();
      const allContacts = guestData.contacts || [];
      quotaUsed = allContacts.filter(c => {
        const bkType    = cf(c, 'booking_type');
        const mbrId     = cf(c, 'inviting_member_id') || cf(c, 'membership_number');
        const slotDate  = cf(c, 'slot_date');
        return bkType === 'guest_pass' &&
               mbrId.toUpperCase() === membershipNumber.toUpperCase() &&
               slotDate >= monthStart;
      }).length;
    }

    // Return member data
    return res.status(200).json({
      success: true,
      member: {
        id:               match.id,
        firstName:        match.firstName || '',
        lastName:         match.lastName  || '',
        name:             `${match.firstName || ''} ${match.lastName || ''}`.trim(),
        email:            match.email || email,
        phone:            match.phone || '',
        membershipNumber: membershipNumber.toUpperCase(),
        tier:             rawTier.toLowerCase(),
        tierLabel:        tier.label,
        quotaTotal:       tier.quota,
        quotaUsed:        quotaUsed,
      }
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}