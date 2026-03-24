const cookie = require('cookie');

module.exports = (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    res.setHeader('Set-Cookie', cookie.serialize('src_session', '', {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge:   0,
      path:     '/',
    }));
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(200).json({ success: true });
  }
};