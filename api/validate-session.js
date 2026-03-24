const cookie = require('cookie');

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const cookies = cookie.parse(req.headers.cookie || '');
    const raw = cookies['src_session'];
    if (!raw) return res.status(200).json({ valid: false });

    const session = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    if (!session) return res.status(200).json({ valid: false });

    // Staff / management session: { staffId, email, role, name, issuedAt }
    if (session.staffId && session.role) {
      return res.status(200).json({
        valid:   true,
        role:    session.role,
        staffId: session.staffId,
        email:   session.email  || '',
        name:    session.name   || session.staffId,
      });
    }

    // Member session: { memberId, email }
    if (session.memberId && session.email) {
      return res.status(200).json({
        valid:    true,
        role:     'member',
        memberId: session.memberId,
        email:    session.email,
      });
    }

    return res.status(200).json({ valid: false });
  } catch {
    return res.status(200).json({ valid: false });
  }
};
