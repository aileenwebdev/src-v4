// api/webhooks/ghl.js — Inbound GHL webhook listener
// POST /api/webhooks/ghl
// Verifies X-GHL-Signature (HMAC-SHA256 of raw body, key = GHL_WEBHOOK_SECRET)
// Dispatches to internal handlers by event type

const crypto = require('crypto');

function verifySignature(rawBody, signature) {
  const secret = process.env.GHL_WEBHOOK_SECRET;
  if (!secret) return true; // skip in dev if not configured
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ''));
}

async function onContactUpdated(payload) {
  // Placeholder: add side-effects here (cache invalidation, etc.)
  console.log('[webhook] contact.updated', payload.id);
}

async function onAppointmentCreated(payload) {
  console.log('[webhook] appointment.created', payload.id);
}

const HANDLERS = {
  'contact.updated':       onContactUpdated,
  'appointment.created':   onAppointmentCreated,
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  // Express raw body — attach rawBodyMiddleware in server.js before this route
  const rawBody  = req.rawBody || JSON.stringify(req.body);
  const sig      = req.headers['x-ghl-signature'] || '';

  if (!verifySignature(rawBody, sig)) {
    console.warn('[webhook] Invalid signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event   = req.body?.type || req.body?.event || '';
  const payload = req.body?.data || req.body || {};

  const handler = HANDLERS[event];
  if (handler) {
    try {
      await handler(payload);
    } catch (err) {
      console.error(`[webhook] handler error for ${event}:`, err.message);
    }
  } else {
    console.log(`[webhook] unhandled event: ${event}`);
  }

  return res.status(200).json({ received: true });
};
