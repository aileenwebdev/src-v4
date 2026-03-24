const express = require('express');
const path    = require('path');
const { pathToFileURL } = require('url');
const app  = express();
const port = process.env.PORT || 3000;

app.use(express.json());

/**
 * Load a handler from either a CJS or ESM module.
 * If require() fails (e.g. ESM syntax), falls back to dynamic import() at request time.
 */
function loadHandler(filePath) {
  const absPath = path.resolve(__dirname, filePath);
  try {
    const mod = require(absPath);
    return mod.default || mod;
  } catch {
    // require() failed — likely ESM syntax. Try dynamic import() at request time.
    return async (req, res) => {
      try {
        const { default: handler } = await import(pathToFileURL(absPath).href);
        return handler(req, res);
      } catch (err) {
        console.error(`Handler unavailable [${filePath}]:`, err.message);
        return res.status(503).json({ success: false, error: 'Service unavailable — API credentials may be required' });
      }
    };
  }
}

// ── Member auth ────────────────────────────────────────────────────────────
app.post('/api/login',            loadHandler('./api/login.js'));
app.post('/api/logout',           loadHandler('./api/logout.js'));
app.get('/api/validate-session',  loadHandler('./api/validate-session.js'));
app.post('/api/auth-member',      loadHandler('./api/auth-member.js'));
app.post('/api/submit-booking',   loadHandler('./api/submit-booking.js'));

// ── Staff / management auth ────────────────────────────────────────────────
app.post('/api/login-staff',      loadHandler('./api/login-staff.js'));

// ── Data endpoints ─────────────────────────────────────────────────────────
app.get('/api/fetch-data',        loadHandler('./api/fetch-data.js'));
app.get('/api/fetch-bookings',    loadHandler('./api/fetch-bookings.js'));
app.get('/api/lookup-member',     loadHandler('./api/lookup-member.js'));
app.post('/api/checkin',          loadHandler('./api/checkin.js'));
app.patch('/api/update-member-profile', loadHandler('./api/update-member-profile.js'));
app.get('/api/analytics',         loadHandler('./api/analytics.js'));

// ── Admin endpoints ────────────────────────────────────────────────────────
app.all('/api/admin-staff',       loadHandler('./api/admin-staff.js'));
app.all('/api/system-config',     loadHandler('./api/system-config.js'));
app.all('/api/tickets',           loadHandler('./api/tickets.js'));
app.post('/api/trigger-workflow', loadHandler('./api/trigger-workflow.js'));
app.all('/api/wibiz-proxy',       loadHandler('./api/wibiz-proxy.js'));
app.post('/api/webhooks/ghl',     loadHandler('./api/webhooks/ghl.js'));

// ── Static files (Vite build output) ──────────────────────────────────────
app.use(express.static(path.join(__dirname, 'dist')));

// ── Portal routes ──────────────────────────────────────────────────────────
app.get('/member',     (req, res) => res.sendFile(path.join(__dirname, 'dist', 'portal.html')));
app.get('/staff',      (req, res) => res.sendFile(path.join(__dirname, 'dist', 'portal-staff.html')));
app.get('/management', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'portal-management.html')));

// ── Fallback ───────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
