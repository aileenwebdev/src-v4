// src/management/system-config.js — System configuration panel

export function renderSystemConfigScreen() {
  return `
    <div class="s-hd">
      <h3>System Configuration</h3>
      <p>Runtime settings — changes take effect immediately.</p>
    </div>

    <div id="config-load-msg" style="padding:32px;text-align:center;color:var(--muted)">Loading configuration…</div>

    <div id="config-body" style="display:none">
      <!-- Quotas -->
      <div class="panel" style="margin-bottom:20px;padding:20px 20px 24px">
        <div class="panel-hd" style="padding:0 0 14px"><h3>Guest Pass Quotas (per month)</h3></div>
        <div class="field-grid">
          ${['ordinary','associate','life','full'].map(tier => `
            <div class="form-group">
              <label class="form-label" style="text-transform:capitalize">${tier}</label>
              <input id="cfg-quota-${tier}" class="form-input" type="number" min="0" max="20">
            </div>`).join('')}
        </div>
        <button class="btn btn-p btn-sm" onclick="saveConfigSection('quotas')">Save Quotas</button>
      </div>

      <!-- Facilities -->
      <div class="panel" style="margin-bottom:20px;padding:20px 20px 24px">
        <div class="panel-hd" style="padding:0 0 14px"><h3>Facilities</h3></div>
        <div class="form-group">
          <label class="form-label">Facility list <span>(one per line)</span></label>
          <textarea id="cfg-facilities" class="form-textarea" rows="6"></textarea>
        </div>
        <button class="btn btn-p btn-sm" onclick="saveConfigSection('facilities')">Save Facilities</button>
      </div>

      <!-- Automation Workflow IDs -->
      <div class="panel" style="margin-bottom:20px;padding:20px 20px 24px">
        <div class="panel-hd" style="padding:0 0 14px"><h3>Automation Workflow IDs</h3></div>
        ${[['bookingConfirmed','Booking Confirmed'],['guestPassIssued','Guest Pass Issued'],['memberFlagged','Member Flagged']].map(([k, label]) => `
          <div class="form-group">
            <label class="form-label">${label}</label>
            <input id="cfg-wf-${k}" class="form-input" placeholder="Workflow ID…">
          </div>`).join('')}
        <button class="btn btn-p btn-sm" onclick="saveConfigSection('workflowIds')">Save Workflows</button>
      </div>

      <div id="cfg-save-ok" style="display:none" class="alert-strip">✓ Saved successfully.</div>
      <div id="cfg-save-err" style="display:none;color:var(--danger);font-size:13px;margin-top:8px"></div>
    </div>`;
}

export async function loadSystemConfig() {
  const loadMsg = document.getElementById('config-load-msg');
  const body    = document.getElementById('config-body');
  const errEl   = document.getElementById('cfg-save-err');

  try {
    const res  = await fetch('/api/system-config');
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    const cfg = data.config;

    // Quotas
    for (const tier of ['ordinary','associate','life','full']) {
      const el = document.getElementById(`cfg-quota-${tier}`);
      if (el) el.value = cfg.quotas?.[tier] ?? '';
    }

    // Facilities
    const facEl = document.getElementById('cfg-facilities');
    if (facEl) facEl.value = (cfg.facilities || []).join('\n');

    // Workflows
    for (const k of ['bookingConfirmed','guestPassIssued','memberFlagged']) {
      const el = document.getElementById(`cfg-wf-${k}`);
      if (el) el.value = cfg.workflowIds?.[k] || '';
    }

    if (loadMsg) loadMsg.style.display = 'none';
    if (body) body.style.display = 'block';
  } catch (e) {
    if (loadMsg) loadMsg.textContent = `Failed to load config: ${e.message}`;
  }

  window.saveConfigSection = async (section) => {
    const okEl  = document.getElementById('cfg-save-ok');
    if (errEl) errEl.style.display = 'none';

    const updates = [];

    if (section === 'quotas') {
      for (const tier of ['ordinary','associate','life','full']) {
        const val = parseInt(document.getElementById(`cfg-quota-${tier}`)?.value, 10);
        if (!isNaN(val)) updates.push([`quotas.${tier}`, val]);
      }
    } else if (section === 'facilities') {
      const lines = (document.getElementById('cfg-facilities')?.value || '').split('\n').map(l => l.trim()).filter(Boolean);
      updates.push(['facilities', lines]);
    } else if (section === 'workflowIds') {
      for (const k of ['bookingConfirmed','guestPassIssued','memberFlagged']) {
        updates.push([`workflowIds.${k}`, document.getElementById(`cfg-wf-${k}`)?.value || '']);
      }
    }

    try {
      for (const [key, value] of updates) {
        const res = await fetch('/api/system-config', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ key, value }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      }
      if (okEl) { okEl.style.display = 'flex'; setTimeout(() => { okEl.style.display = 'none'; }, 3000); }
    } catch (e) {
      if (errEl) { errEl.textContent = e.message; errEl.style.display = 'block'; }
    }
  };
}
