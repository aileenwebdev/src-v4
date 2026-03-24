// api/lookup-member.js
// Staff-only endpoint — looks up a member by ID or email for check-in / guest pass

const TEST_MEMBERS = [
  {
    membershipNumber: 'SRC0102',
    email: 'benjamin.ong@src-demo.local',
    name: 'Benjamin Ong',
    firstName: 'Benjamin',
    lastName: 'Ong',
    tier: 'Full Member',
    quotaTotal: 4,
    quotaUsed: 0,
    phone: '+65 9100 0102',
  },
  {
    membershipNumber: 'SRC0123',
    email: 'cheryl.lee@src-demo.local',
    name: 'Cheryl Lee',
    firstName: 'Cheryl',
    lastName: 'Lee',
    tier: 'Full Member',
    quotaTotal: 4,
    quotaUsed: 0,
    phone: '+65 9100 0123',
  },
  {
    membershipNumber: 'SRC2847',
    email: 'david.tan@email.com',
    name: 'David Tan',
    firstName: 'David',
    lastName: 'Tan',
    tier: 'Full Member',
    quotaTotal: 4,
    quotaUsed: 0,
    phone: '+65 9128 4700',
  },
];

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query } = req.query || {};
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query parameter required.' });
    }

    const q = query.trim().toUpperCase().replace(/[-\s]/g, '');
    const match = TEST_MEMBERS.find(
      m =>
        m.membershipNumber.replace(/[-\s]/g, '').toUpperCase() === q ||
        m.email.toLowerCase() === query.trim().toLowerCase()
    );

    if (!match) {
      return res.status(404).json({ success: false, error: 'Member not found.' });
    }

    return res.status(200).json({ success: true, member: match });
  } catch (err) {
    console.error('[lookup-member] Error:', err.message);
    return res.status(500).json({ success: false, error: 'Lookup failed. Please try again.' });
  }
};