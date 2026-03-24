// src/staff/pipelines.js — Pipeline summary for staff and management dashboards

export async function loadStaffPipelines(guestElId, bookingsElId) {
  const guestEl    = document.getElementById(guestElId);
  const bookingsEl = document.getElementById(bookingsElId);
  const setLoad = el => { if (el) el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:12px">Loading…</div>'; };
  setLoad(guestEl);
  setLoad(bookingsEl);

  try {
    const res  = await fetch('/api/pipelines');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load pipelines');

    if (guestEl)    guestEl.innerHTML    = renderCompactPipeline(data.pipelines?.guests,   'guests');
    if (bookingsEl) bookingsEl.innerHTML = renderCompactPipeline(data.pipelines?.bookings, 'bookings');
  } catch (e) {
    const msg = `<div style="color:var(--danger);font-size:13px;padding:8px">${e.message}</div>`;
    if (guestEl)    guestEl.innerHTML    = msg;
    if (bookingsEl) bookingsEl.innerHTML = msg;
  }
}

function renderCompactPipeline(pipeline, key) {
  if (!pipeline) return '<div style="color:var(--muted);padding:12px;font-size:13px">No data.</div>';
  const stages  = pipeline.stages || [];
  const COLOURS = ['#1e40af','#7c3aed','#047857','#b45309','#be123c','#0891b2','#65a30d','#dc2626'];
  const isGuests = key === 'guests';

  // Stage count bubbles
  const bubbles = stages.map((s, i) => `
    <div style="flex:1;min-width:80px;background:var(--cream);border:1.5px solid var(--border);
                border-radius:10px;padding:10px 8px;text-align:center">
      <div style="font-size:20px;font-weight:700;color:${COLOURS[i%COLOURS.length]};line-height:1">${s.count}</div>
      <div style="font-size:10px;color:var(--muted);margin-top:3px;line-height:1.3">${esc(s.name)}</div>
    </div>`).join('');

  // Latest 5 records across all stages
  const allOpps = stages.flatMap(s => s.opportunities || [])
    .sort((a,b) => (b.slotDate||'').localeCompare(a.slotDate||''))
    .slice(0, 5);

  const rows = allOpps.map(o => {
    const name      = o.guestName || o.contactName || '—';
    const invBy     = o.invitingMember || '';
    const facility  = o.facility || '—';
    const slotDate  = o.slotDate || '';
    const slotTime  = o.slotTime ? (o.slotTime.length > 10 ? o.slotTime.slice(11,16) : o.slotTime) : '';
    const checkedIn = o.checkedIn;
    return `
      <div class="bk-row" style="cursor:default;padding:10px 16px">
        <div class="bk-ico" style="font-size:14px">${checkedIn ? '✅' : '⏳'}</div>
        <div class="bk-inf">
          <div class="bk-t" style="font-size:13px">${esc(name)}</div>
          <div class="bk-m" style="font-size:12px">${esc(facility)}${slotDate?' · '+slotDate:''}${slotTime?' '+slotTime:''}${isGuests&&invBy?' · via '+esc(invBy):''}</div>
        </div>
        <div class="bk-r">
          <span class="badge ${checkedIn?'bg':'by'}" style="font-size:10px">${checkedIn?'In':'Pending'}</span>
        </div>
      </div>`;
  }).join('') || '<div style="padding:14px 16px;color:var(--muted);font-size:13px">No records.</div>';

  return `
    <div style="display:flex;gap:6px;padding:14px 16px 10px;overflow-x:auto">${bubbles}</div>
    <div style="border-top:1px solid var(--border);padding:6px 0">${rows}</div>`;
}

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
