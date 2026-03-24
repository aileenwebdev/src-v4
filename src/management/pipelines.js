// src/management/pipelines.js — Full Pipelines screen with rich guest/booking details

let _data = null;

export function renderPipelinesScreen() {
  return `
    <div class="s-hd">
      <h3>Pipelines</h3>
      <p>Live guest and booking pipeline from your sub-account — with full details.</p>
    </div>
    <div style="display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap;align-items:center">
      <button class="fbtn active" id="pipe-tab-both"     onclick="switchPipeTab('both',this)">All Pipelines</button>
      <button class="fbtn"        id="pipe-tab-guests"   onclick="switchPipeTab('guests',this)">Guests Pipeline</button>
      <button class="fbtn"        id="pipe-tab-bookings" onclick="switchPipeTab('bookings',this)">Bookings Pipeline</button>
      <button class="btn btn-o btn-sm" style="margin-left:auto" onclick="refreshPipelines()">↺ Refresh</button>
    </div>
    <div id="pipe-loading" style="padding:40px;text-align:center;color:var(--muted)">Loading pipeline data…</div>
    <div id="pipe-error"   style="display:none;padding:16px;color:var(--danger);font-size:13px"></div>
    <div id="pipe-guests-wrap"   style="display:none;margin-bottom:28px"></div>
    <div id="pipe-bookings-wrap" style="display:none;margin-bottom:28px"></div>`;
}

export async function loadPipelines() {
  const loadEl = document.getElementById('pipe-loading');
  const errEl  = document.getElementById('pipe-error');
  if (loadEl) loadEl.style.display = 'block';
  if (errEl)  errEl.style.display  = 'none';

  try {
    const res  = await fetch('/api/pipelines');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load pipelines');
    _data = data.pipelines;
    if (loadEl) loadEl.style.display = 'none';
    renderPipelineSection('guests',   document.getElementById('pipe-guests-wrap'));
    renderPipelineSection('bookings', document.getElementById('pipe-bookings-wrap'));
    document.getElementById('pipe-guests-wrap').style.display   = 'block';
    document.getElementById('pipe-bookings-wrap').style.display = 'block';
  } catch (e) {
    if (loadEl) loadEl.style.display = 'none';
    if (errEl)  { errEl.textContent = e.message; errEl.style.display = 'block'; }
  }
}

function renderPipelineSection(key, container) {
  if (!container) return;
  const pipeline = _data?.[key];
  if (!pipeline) { container.innerHTML = '<div style="color:var(--muted);padding:16px">No data.</div>'; return; }

  const stages = pipeline.stages || [];
  const COLOURS = ['#1e40af','#7c3aed','#047857','#b45309','#be123c','#0891b2','#65a30d','#dc2626'];

  container.innerHTML = `
    <!-- Stage count summary row -->
    <div class="panel" style="margin-bottom:16px">
      <div class="panel-hd">
        <h3>${esc(pipeline.pipelineName)}</h3>
        <span class="badge bb">${pipeline.total} total</span>
      </div>
      <div style="display:flex;gap:8px;padding:16px;overflow-x:auto">
        ${stages.map((s, i) => `
          <div onclick="scrollToStage('${key}','${s.id}')"
               style="flex:0 0 auto;min-width:100px;background:var(--cream);border:2px solid var(--border);
                      border-radius:10px;padding:12px 14px;text-align:center;cursor:pointer;
                      transition:border-color .15s,box-shadow .15s"
               onmouseover="this.style.borderColor='${COLOURS[i%COLOURS.length]}'"
               onmouseout="this.style.borderColor='var(--border)'">
            <div style="font-size:26px;font-weight:700;color:${COLOURS[i%COLOURS.length]};line-height:1">${s.count}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:4px;line-height:1.3">${esc(s.name)}</div>
          </div>`).join('')}
      </div>
    </div>

    <!-- Per-stage detail tables -->
    ${stages.map((s, i) => s.count === 0 ? '' : `
      <div class="panel" id="stage-${key}-${s.id}" style="margin-bottom:14px">
        <div class="panel-hd">
          <h3 style="display:flex;align-items:center;gap:8px">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${COLOURS[i%COLOURS.length]};flex-shrink:0"></span>
            ${esc(s.name)}
          </h3>
          <span class="badge" style="background:${COLOURS[i%COLOURS.length]}22;color:${COLOURS[i%COLOURS.length]}">${s.count}</span>
        </div>
        ${renderOppTable(s.opportunities || [], key)}
      </div>`).join('')}`;
}

function renderOppTable(opps, pipelineKey) {
  if (!opps.length) return '<div style="padding:16px;color:var(--muted);font-size:13px">No records in this stage.</div>';

  const isGuests = pipelineKey === 'guests';

  return `
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:var(--cream);border-bottom:2px solid var(--border)">
            <th style="padding:10px 16px;text-align:left;font-weight:600;color:var(--navy);white-space:nowrap">
              ${isGuests ? 'Guest Name' : 'Contact Name'}
            </th>
            ${isGuests ? '<th style="padding:10px 16px;text-align:left;font-weight:600;color:var(--navy);white-space:nowrap">Invited By (Member)</th>' : ''}
            <th style="padding:10px 16px;text-align:left;font-weight:600;color:var(--navy);white-space:nowrap">Facility / Venue</th>
            <th style="padding:10px 16px;text-align:left;font-weight:600;color:var(--navy);white-space:nowrap">Date &amp; Time</th>
            <th style="padding:10px 16px;text-align:left;font-weight:600;color:var(--navy);white-space:nowrap">Check-in</th>
            <th style="padding:10px 16px;text-align:left;font-weight:600;color:var(--navy);white-space:nowrap">Booking Ref</th>
            <th style="padding:10px 16px;text-align:left;font-weight:600;color:var(--navy);white-space:nowrap">Status</th>
          </tr>
        </thead>
        <tbody>
          ${opps.map((o, idx) => {
            const guestName    = o.guestName || o.contactName || '—';
            const invitedBy    = o.invitingMember || o.invitingMemberId || '—';
            const facility     = o.facility || '—';
            const slotDate     = o.slotDate || '';
            const slotTime     = o.slotTime ? o.slotTime.slice(11,16) || o.slotTime : '';
            const dateLabel    = slotDate ? `${slotDate}${slotTime ? ' ' + slotTime : ''}` : '—';
            const checkedIn    = o.checkedIn;
            const checkedInAt  = o.checkedInAt ? new Date(o.checkedInAt).toLocaleString('en-SG',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '';
            const checkLabel   = checkedIn
              ? `<span class="badge bg">✓ Checked In${checkedInAt ? '<br><span style="font-weight:400;font-size:10px;opacity:.8">'+checkedInAt+'</span>' : ''}</span>`
              : '<span class="badge by">Pending</span>';
            const ref  = o.bookingRef || '—';
            const stat = o.status || 'open';
            const statBadge = stat === 'won' ? 'bg' : stat === 'lost' ? 'br' : 'bb';
            return `
              <tr style="border-bottom:1px solid var(--border);${idx%2===0?'':'background:#fafaf8'}">
                <td style="padding:10px 16px;font-weight:500;color:var(--navy)">${esc(guestName)}</td>
                ${isGuests ? `<td style="padding:10px 16px;color:var(--muted)">${esc(invitedBy)}</td>` : ''}
                <td style="padding:10px 16px">${esc(facility)}</td>
                <td style="padding:10px 16px;white-space:nowrap;color:var(--muted)">${esc(dateLabel)}</td>
                <td style="padding:10px 16px">${checkLabel}</td>
                <td style="padding:10px 16px;font-family:monospace;font-size:12px;color:var(--muted)">${esc(ref)}</td>
                <td style="padding:10px 16px"><span class="badge ${statBadge}">${esc(stat)}</span></td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

window.scrollToStage = (key, stageId) => {
  const el = document.getElementById(`stage-${key}-${stageId}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.switchPipeTab = (tab, btn) => {
  document.querySelectorAll('[id^="pipe-tab-"]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const gw = document.getElementById('pipe-guests-wrap');
  const bw = document.getElementById('pipe-bookings-wrap');
  if (gw) gw.style.display = (tab === 'bookings') ? 'none' : 'block';
  if (bw) bw.style.display = (tab === 'guests')   ? 'none' : 'block';
};

window.refreshPipelines = () => {
  _data = null;
  ['guests','bookings'].forEach(k => {
    const el = document.getElementById(`pipe-${k}-wrap`);
    if (el) { el.style.display = 'none'; el.innerHTML = ''; }
  });
  loadPipelines();
};

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
