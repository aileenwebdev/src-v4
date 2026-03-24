// src/staff/member-search.js — Staff member search + flag panel

import { UI } from '../components.js';

export function renderMemberSearchScreen() {
  return `
    <div class="s-hd">
      <h3>Member Search</h3>
      <p>Look up members by membership number or email.</p>
    </div>
    <div class="panel" style="margin-bottom:20px;padding:20px 20px 24px">
      <div style="display:flex;gap:10px">
        <input id="member-search-input" class="form-input" placeholder="Membership No. or email…" style="flex:1"
          onkeydown="if(event.key==='Enter')searchMember()">
        <button class="btn btn-p" onclick="searchMember()">Search</button>
      </div>
      <div id="member-search-err" style="display:none;color:var(--danger);font-size:13px;margin-top:8px"></div>
    </div>
    <div id="member-search-result"></div>`;
}

export function bindMemberSearch() {
  window.searchMember = async () => {
    const q      = document.getElementById('member-search-input')?.value?.trim();
    const errEl  = document.getElementById('member-search-err');
    const resEl  = document.getElementById('member-search-result');

    if (!q) { if (errEl) { errEl.textContent = 'Enter a membership number or email.'; errEl.style.display = 'block'; } return; }
    if (errEl) errEl.style.display = 'none';
    if (resEl) resEl.innerHTML = '<div style="padding:24px;text-align:center;color:var(--muted)">Searching…</div>';

    try {
      const res  = await fetch(`/api/lookup-member?query=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Not found');
      renderMemberCard(data.member, resEl);
    } catch (e) {
      if (resEl) resEl.innerHTML = `<div style="padding:24px;text-align:center;color:var(--danger)">${e.message}</div>`;
    }
  };

  window.flagMember = async (contactId, currentlyFlagged) => {
    const newState = !currentlyFlagged;
    try {
      const res = await fetch('/api/update-member-profile', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ contactId, fields: { flagged: newState } }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      // Re-search to refresh card
      window.searchMember();
    } catch (e) {
      alert(`Flag failed: ${e.message}`);
    }
  };
}

function renderMemberCard(member, container) {
  if (!container) return;
  const flagLabel  = member.flagged ? 'Remove Flag' : 'Flag Member';
  const flagClass  = member.flagged ? 'btn-d' : 'btn-o';
  const flagIcon   = member.flagged ? '🚩' : '⚑';
  const quotaPct   = Math.min(Math.round(((member.quotaUsed || 0) / (member.quotaTotal || 4)) * 100), 100);

  container.innerHTML = `
    <div class="panel">
      <div class="panel-hd">
        <h3>${member.name}</h3>
        ${member.flagged ? '<span class="badge br">Flagged</span>' : '<span class="badge bg">Active</span>'}
      </div>
      <div style="padding:20px">
        <div class="field-grid" style="margin-bottom:18px">
          <div class="info-card" style="padding:16px">
            <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Membership No.</div>
            <div style="font-size:18px;font-weight:700;color:var(--navy);font-family:monospace">${member.membershipNumber || member.membershipNumber}</div>
          </div>
          <div class="info-card" style="padding:16px">
            <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Tier</div>
            <div style="font-size:16px;font-weight:600;color:var(--navy)">${member.tier || '—'}</div>
          </div>
        </div>
        <div class="d-row"><span class="dr-l">Email</span><span class="dr-v">${member.email || '—'}</span></div>
        <div class="d-row"><span class="dr-l">Phone</span><span class="dr-v">${member.phone || '—'}</span></div>
        <div class="d-row">
          <span class="dr-l">Guest Quota</span>
          <span class="dr-v">
            ${member.quotaUsed || 0} / ${member.quotaTotal || 4} used
            <div style="width:80px;height:4px;background:var(--border);border-radius:4px;margin-top:4px;margin-left:auto">
              <div style="width:${quotaPct}%;height:100%;background:var(--gold);border-radius:4px"></div>
            </div>
          </span>
        </div>
        <div style="margin-top:20px;display:flex;gap:10px">
          <button class="btn ${flagClass} btn-sm" onclick="flagMember('${member.id || ''}', ${!!member.flagged})">
            ${flagIcon} ${flagLabel}
          </button>
        </div>
      </div>
    </div>`;
}
