# SRC Dashboard — Build Plan

**Stack:** Express 4 · Vite 5 · Vanilla JS · GHL API (LeadConnectorHQ) · Railway
**Constraint:** Existing routes (`/api/login`, `/api/logout`, `/api/validate-session`, `/api/auth-member`, `/api/submit-booking`, `/api/fetch-data`) and the `src/components.js` UI pattern (`UI.Panel`, `UI.BookingRow`, `UI.StatCard`) are not to be refactored. New work builds on top of them.

---

## 1. Core Architecture

Shared foundations consumed by all three portals. Complete this group before any portal work.

### 1-A · Session & RBAC middleware (≤ 1.5 h)
- Extend `api/validate-session.js` response to include `role` field (`member | staff | management`).
- Add `src/auth.js`: `requireRole(role)` guard function used by portal JS modules — reads the `src_session` cookie, calls `/api/validate-session`, redirects to `/` on mismatch.
- Document the three cookie shapes: member session (existing `memberId`, `email`) + staff/management sessions (add `staffId`, `role`).
- **Depends on:** nothing.

### 1-B · Staff & Management login API (≤ 2 h)
- Add `api/login-staff.js`: POST `{ username, password }` — validates against `STAFF_USERS` env var (JSON array) or a flat credentials store; issues `src_session` cookie with `role: 'staff'` or `role: 'management'`.
- Register route in `server.js`: `app.post('/api/login-staff', ...)` — append only, leave existing routes untouched.
- **Depends on:** 1-A (cookie shape defined).

### 1-C · Shared UI shell & nav factory (≤ 1.5 h)
- Add `src/shell.js`: `renderShell({ role, userName, navItems })` — emits the existing sidebar HTML pattern (`.sidebar`, `.sb-nav`, `.sb-lnk`) using the same CSS variables already in `member-portal.html`.
- Add `src/nav-configs.js`: three nav-item arrays (member / staff / management) consumed by `renderShell`.
- **Depends on:** nothing (pure UI, no API calls).

### 1-D · Portal entry-point routing (≤ 1 h)
- Add `portal-staff.html` and `portal-management.html` alongside the existing `portal.html`.
- Register both in `vite.config.js` `rollupOptions.input` — append only.
- Add routes in `server.js`: `app.get(['/staff', '/management'], ...)` pointing to new HTML files — replace the current single-file rewrite for those two paths.
- **Depends on:** 1-C.

---

## 2. Member Portal

Builds on the existing `member-portal.html` login + booking flow. Add new sections only.

### 2-A · Profile page module (≤ 2 h)
- Add `src/member/profile.js`: renders a panel using `UI.Panel` showing name, membership number, tier badge, email, phone pulled from the session-stored member object.
- Include editable preferred contact field; PATCH via a new `api/update-member-profile.js` that calls `PUT /contacts/{id}` on GHL.
- **Depends on:** 1-A (session provides member data).

### 2-B · Activity history view (≤ 2 h)
- Add `src/member/activity.js`: fetches `/api/fetch-bookings?memberId=X` (new query param added to existing `fetch-bookings.js` handler — filter only, no structural change) and renders rows with `UI.BookingRow`.
- Show booking type, slot date, guest name, status badge.
- **Depends on:** existing `fetch-bookings.js`; 1-A.

### 2-C · Guest-pass quota widget (≤ 1 h)
- Extract the quota display block already present in `member-portal.html` into `src/member/quota-widget.js` so it can be re-rendered on navigation without a full page reload.
- Wire into the new profile and activity pages via a shared `renderQuota(member)` call.
- **Depends on:** 2-A.

---

## 3. Staff Portal

### 3-A · Staff login page (≤ 1.5 h)
- Build `portal-staff.html` login screen using the same two-column layout (`.login-left` / `.login-right`) and CSS variables as `member-portal.html` — no new styles needed.
- On success call `/api/login-staff` and redirect to `/staff/dashboard`.
- **Depends on:** 1-B, 1-D.

### 3-B · Member search & oversight panel (≤ 2 h)
- Add `src/staff/member-search.js`: search box → calls `api/lookup-member.js` (existing) → renders result card with tier, quota used, recent bookings using `UI.BookingRow`.
- Add a "Flag member" action that sets a GHL custom field `flagged: true` via `api/update-member-profile.js` (from 2-A).
- **Depends on:** 2-A (reuses `update-member-profile.js`); 3-A.

### 3-C · Today's bookings view (≤ 1.5 h)
- Add `src/staff/bookings-today.js`: calls existing `/api/fetch-bookings` (no changes to handler), renders a filterable table by facility/time with `UI.BookingRow`.
- Add check-in toggle: POST to `api/checkin.js` (new, single GHL field update `checked_in: true`).
- **Depends on:** 3-A; existing `fetch-bookings.js`.

### 3-D · Ticket / issue handling (≤ 2 h)
- Add `api/tickets.js`: GET list + POST new ticket — stores as GHL notes (`POST /contacts/{id}/notes`) attached to member contact.
- Add `src/staff/tickets.js`: renders open tickets using `UI.Panel` + `UI.BookingRow` pattern; form to create/close tickets.
- **Depends on:** 3-A; 5-A (GHL API client).

---

## 4. Management Portal

### 4-A · Management login page (≤ 1 h)
- Same approach as 3-A but `portal-management.html`; `login-staff.js` issues `role: 'management'`.
- **Depends on:** 1-B, 1-D.

### 4-B · Analytics dashboard (≤ 2 h)
- Add `src/management/analytics.js`: calls a new `api/analytics.js` that aggregates GHL contact data (bookings by day, guest-pass usage, facility utilisation) and returns summary JSON.
- Render with `UI.StatCard` grid + a simple SVG sparkline (no chart library dependency).
- **Depends on:** 4-A; 5-A.

### 4-C · Staff management panel (≤ 2 h)
- Add `src/management/staff-mgmt.js`: reads `STAFF_USERS` env, renders a list with add/deactivate controls.
- Add `api/admin-staff.js`: GET/POST/DELETE staff entries — mutates `STAFF_USERS` env via Railway's Variables API or a local JSON store (Railway volume mount).
- **Depends on:** 4-A; 1-B (same credentials store).

### 4-D · System configuration panel (≤ 2 h)
- Add `src/management/system-config.js`: form to view/edit runtime config: GHL location ID, booking quotas per tier, facility list.
- Backed by `api/system-config.js`: GET/POST reads/writes a `config.json` on the Railway volume mount or as GHL custom values.
- **Depends on:** 4-A.

---

## 5. GHL Integration Layer

Centralise all GoHighLevel API calls. Complete 5-A before any task in sections 2–4 that touches GHL directly.

### 5-A · GHL API client module (≤ 2 h)
- Add `src/ghl-client.js` (server-side, required by API handlers): thin wrapper around `https://services.leadconnectorhq.com` — `getContact(id)`, `searchContacts(query)`, `updateContact(id, fields)`, `addNote(contactId, body)`, `triggerWorkflow(workflowId, contactId)`.
- Centralises `GHL_PRIVATE_TOKEN` and `GHL_LOCATION_ID` reads; eliminates duplicated fetch boilerplate currently in `auth-member.js` and `fetch-bookings.js`.
- Does **not** modify existing handlers — they continue to work as-is; new handlers import from `ghl-client.js`.
- **Depends on:** nothing.

### 5-B · Webhook listener (≤ 2 h)
- Add `api/webhooks/ghl.js`: POST endpoint that verifies an `X-GHL-Signature` header (HMAC-SHA256, secret in `GHL_WEBHOOK_SECRET` env) and dispatches to internal handlers by event type (`contact.updated`, `appointment.created`, etc.).
- Register route `app.post('/api/webhooks/ghl', ...)` in `server.js` — append only.
- **Depends on:** 5-A.

### 5-C · Data mapping & normalisation (≤ 1.5 h)
- Add `src/ghl-mappers.js`: pure functions `mapContact(raw) → MemberDTO`, `mapBooking(raw) → BookingDTO` that translate GHL custom field arrays (e.g. `contact.membership_number`) into typed objects.
- Used by all API handlers that return data to the frontend, replacing ad-hoc `customFields.find(...)` inline logic.
- **Depends on:** 5-A.

### 5-D · Workflow trigger integration (≤ 1 h)
- Wire existing `api/trigger-workflow.js` through `ghl-client.js`'s `triggerWorkflow()` so callers use a consistent interface.
- Add `workflowIds` config object in `system-config.json` (from 4-D) mapping event names to GHL workflow IDs.
- **Depends on:** 5-A; 4-D.

---

## 6. Deployment

### 6-A · Nixpacks / Dockerfile config (≤ 1 h)
- Add `nixpacks.toml` at project root:
  ```toml
  [phases.build]
  cmds = ["npm ci", "npm run build"]
  [start]
  cmd = "node server.js"
  ```
- Alternatively add a `Dockerfile` (Node 20 slim): `COPY`, `npm ci --omit=dev`, `npm run build`, `EXPOSE 3000`, `CMD ["node","server.js"]`.
- Verify `dist/` is produced and served by `express.static` — no change to `server.js` static path.
- **Depends on:** 1-D (all HTML entry points registered in Vite build).

### 6-B · Environment variable inventory (≤ 1 h)
- Document all required env vars in `docs/env-vars.md`:

  | Variable | Required | Description |
  |---|---|---|
  | `GHL_PRIVATE_TOKEN` | Yes | GHL bearer token |
  | `GHL_LOCATION_ID` | Yes | GHL location (default in code) |
  | `GHL_WEBHOOK_SECRET` | Yes | Webhook HMAC secret |
  | `API_PASSWORD` | Yes | Internal API auth shared secret |
  | `STAFF_USERS` | Yes | JSON array of `{username,passwordHash,role}` |
  | `PORT` | No | HTTP port (default 3000) |

- Configure matching Railway Variables via dashboard or `railway variables set`.
- **Depends on:** 5-B, 1-B.

### 6-C · Railway service setup (≤ 1 h)
- Connect repo to Railway project; set root directory, build command (`npm run build`), start command (`node server.js`).
- Add a Railway volume mount at `/data` for `config.json` and staff credentials store (required by 4-C, 4-D).
- Set custom domain if applicable; verify health endpoint `GET /api/validate-session` returns `{"valid":false}` (no auth) as a liveness check.
- **Depends on:** 6-A, 6-B.

### 6-D · CI/CD pipeline (≤ 1.5 h)
- Add `.github/workflows/deploy.yml`:
  - Trigger: push to `main`.
  - Steps: `npm ci` → `npm run build` → Railway deploy via `railway up --detach` using `RAILWAY_TOKEN` secret.
  - Add a smoke-test step: `curl -f $RAILWAY_URL/api/validate-session`.
- **Depends on:** 6-C.

---

## Dependency Summary

```
1-A → 1-B
1-C → 1-D
5-A → 5-B, 5-C, 5-D
1-A, 5-A → 2-A → 2-B, 2-C
1-B, 1-D → 3-A → 3-B, 3-C, 3-D
1-B, 1-D → 4-A → 4-B, 4-C, 4-D
1-D → 6-A → 6-C → 6-D
5-B, 1-B → 6-B → 6-C
```

**Critical path:** 1-A → 1-B → 3-A/4-A → portals → 6-A → 6-C → 6-D
**Parallelisable once 5-A is done:** all GHL-dependent API tasks (2-A, 2-B, 3-C, 3-D, 4-B, 5-B, 5-C).
