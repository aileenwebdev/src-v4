// src/staff/pipelines.js — Compact pipeline summary for staff dashboard
import { renderPipelineBoard } from '../shared/pipelines-ui.js';

// Renders compact pipeline summary cards into the given element IDs
export async function loadStaffPipelines(guestElId, bookingsElId) {
  const guestEl    = document.getElementById(guestElId);
  const bookingsEl = document.getElementById(bookingsElId);

  const setLoading = el => { if (el) el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:10px">Loading…</div>'; };
  setLoading(guestEl);
  setLoading(bookingsEl);

  try {
    const res  = await fetch('/api/pipelines');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed');

    if (guestEl)    guestEl.innerHTML    = renderPipelineBoard(data.pipelines?.guests,   { detail: false });
    if (bookingsEl) bookingsEl.innerHTML = renderPipelineBoard(data.pipelines?.bookings, { detail: false });
  } catch (e) {
    const msg = `<div style="color:var(--danger);font-size:13px;padding:8px">${e.message}</div>`;
    if (guestEl)    guestEl.innerHTML    = msg;
    if (bookingsEl) bookingsEl.innerHTML = msg;
  }
}
