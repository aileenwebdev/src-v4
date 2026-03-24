// src/staff/tickets.js — Ticket list and creation panel

import { UI } from '../components.js';

export function renderTicketsScreen() {
  return `
    <div class="s-hd">
      <h3>Support Tickets</h3>
      <p>Raise and track member issues.</p>
    </div>

    <!-- New ticket form -->
    <div class="panel" style="margin-bottom:20px;padding:20px 20px 24px">
      <div class="panel-hd" style="padding:0 0 14px"><h3>New Ticket</h3></div>
      <div class="form-group">
        <label class="form-label">Member Contact ID (GHL)</label>
        <input id="ticket-contact-id" class="form-input" placeholder="GHL contact ID…">
      </div>
      <div class="form-group">
        <label class="form-label">Subject</label>
        <input id="ticket-subject" class="form-input" placeholder="Brief description…">
      </div>
      <div class="form-group">
        <label class="form-label">Details</label>
        <textarea id="ticket-body" class="form-textarea" placeholder="Describe the issue…"></textarea>
      </div>
      <div id="ticket-err" style="display:none;color:var(--danger);font-size:13px;margin-bottom:10px"></div>
      <button class="btn btn-p btn-sm" onclick="submitTicket()">Submit Ticket</button>
    </div>

    <!-- Ticket list for a member -->
    <div class="panel" style="padding:20px 20px 8px;margin-bottom:20px">
      <div style="display:flex;gap:10px;margin-bottom:14px">
        <input id="ticket-lookup-id" class="form-input" placeholder="Contact ID to view tickets…" style="flex:1"
          onkeydown="if(event.key==='Enter')loadTickets()">
        <button class="btn btn-o btn-sm" onclick="loadTickets()">Load</button>
      </div>
      <div id="ticket-list">
        <div style="padding:8px 0 16px;color:var(--muted);font-size:13px">Enter a contact ID above to view their tickets.</div>
      </div>
    </div>`;
}

export function bindTickets(staffName) {
  window.submitTicket = async () => {
    const contactId = document.getElementById('ticket-contact-id')?.value?.trim();
    const subject   = document.getElementById('ticket-subject')?.value?.trim();
    const body      = document.getElementById('ticket-body')?.value?.trim();
    const errEl     = document.getElementById('ticket-err');

    if (!contactId || !subject || !body) {
      if (errEl) { errEl.textContent = 'All fields required.'; errEl.style.display = 'block'; }
      return;
    }
    if (errEl) errEl.style.display = 'none';

    try {
      const res = await fetch('/api/tickets', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ contactId, subject, body, createdBy: staffName || 'Staff' }),
      });
      if (!res.ok) throw new Error((await res.json()).error);

      document.getElementById('ticket-contact-id').value = '';
      document.getElementById('ticket-subject').value    = '';
      document.getElementById('ticket-body').value       = '';

      // If ticket list is open for the same contact, refresh
      const lookupId = document.getElementById('ticket-lookup-id')?.value?.trim();
      if (lookupId === contactId) loadTickets();
    } catch (e) {
      if (errEl) { errEl.textContent = e.message; errEl.style.display = 'block'; }
    }
  };

  window.loadTickets = async () => {
    const contactId = document.getElementById('ticket-lookup-id')?.value?.trim();
    const listEl    = document.getElementById('ticket-list');
    if (!contactId) return;
    if (listEl) listEl.innerHTML = '<div style="color:var(--muted);font-size:13px">Loading…</div>';

    try {
      const res  = await fetch(`/api/tickets?contactId=${encodeURIComponent(contactId)}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      renderTicketList(data.tickets || [], listEl);
    } catch (e) {
      if (listEl) listEl.innerHTML = `<div style="color:var(--danger);font-size:13px">${e.message}</div>`;
    }
  };
}

function renderTicketList(tickets, container) {
  if (!container) return;
  if (!tickets.length) {
    container.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:8px 0 16px">No tickets found.</div>';
    return;
  }

  container.innerHTML = tickets.map(t => `
    <div class="bk-row" style="cursor:default;padding:14px 0;border-bottom:1px solid var(--border)">
      <div class="bk-ico">${t.status === 'open' ? '🔴' : '✅'}</div>
      <div class="bk-inf">
        <div class="bk-t">${t.subject}</div>
        <div class="bk-m">${t.body?.slice(0, 80)}${t.body?.length > 80 ? '…' : ''}</div>
      </div>
      <div class="bk-r">
        <span class="badge ${t.status === 'open' ? 'br' : 'bg'}">${t.status}</span>
        <div class="bk-rd" style="margin-top:4px">${t.createdBy || ''}</div>
      </div>
    </div>`).join('');
}
