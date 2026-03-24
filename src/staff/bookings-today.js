// src/staff/bookings-today.js — Today's bookings list with check-in toggle

import { UI } from '../components.js';

export function renderBookingsTodayScreen() {
  return `
    <div class="s-hd">
      <h3>Today's Bookings</h3>
      <p>All members and guests booked for today.</p>
    </div>
    <div class="filter-row" id="facility-filters">
      <button class="fbtn active" onclick="filterTodayBookings('all', this)">All</button>
    </div>
    <div class="panel" id="bookings-today-panel">
      <div style="padding:32px;text-align:center;color:var(--muted)">Loading…</div>
    </div>`;
}

export async function loadTodayBookings(apiPassword) {
  const panel = document.getElementById('bookings-today-panel');
  try {
    const res  = await fetch(`/api/fetch-bookings?pwd=${encodeURIComponent(apiPassword)}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Load failed');

    window.__todayBookings = data.contacts || [];
    buildFacilityFilters(window.__todayBookings);
    renderTodayList(window.__todayBookings, panel);
  } catch (e) {
    if (panel) panel.innerHTML = `<div style="padding:24px;text-align:center;color:var(--danger)">${e.message}</div>`;
  }
}

function cf(c, k) {
  const f = (c.customFields || []).find(x => x.fieldKey === `contact.${k}` || x.fieldKey === k);
  return f ? (f.fieldValue || '') : '';
}

function buildFacilityFilters(bookings) {
  const facilities = [...new Set(bookings.map(b => cf(b, 'facility')).filter(Boolean))];
  const row = document.getElementById('facility-filters');
  if (!row || !facilities.length) return;
  facilities.forEach(fac => {
    const btn = document.createElement('button');
    btn.className = 'fbtn';
    btn.textContent = fac;
    btn.onclick = () => window.filterTodayBookings(fac, btn);
    row.appendChild(btn);
  });
}

function renderTodayList(bookings, container) {
  if (!container) return;
  if (!bookings.length) {
    container.innerHTML = '<div style="padding:32px;text-align:center;color:var(--muted)">No bookings for today.</div>';
    return;
  }

  container.innerHTML = bookings.map(b => {
    const name     = `${b.firstName || ''} ${b.lastName || ''}`.trim() || 'Unknown';
    const facility = cf(b, 'facility') || 'Facility';
    const time     = cf(b, 'slot_time') || '—';
    const type     = cf(b, 'booking_type') === 'guest_pass' ? '🎫 Guest' : '👤 Member';
    const checkedIn = cf(b, 'checked_in') === 'true';
    const badge    = checkedIn
      ? '<span class="badge bg">Checked In</span>'
      : '<span class="badge by">Not Checked In</span>';
    const btnLabel = checkedIn ? 'Undo' : 'Check In';
    const btnClass = checkedIn ? 'btn-o' : 'btn-g';

    return `
      <div class="bk-row" style="align-items:center">
        <div class="bk-ico">🏟️</div>
        <div class="bk-inf">
          <div class="bk-t">${name}</div>
          <div class="bk-m">${facility} · ${time} · ${type}</div>
        </div>
        <div class="bk-r" style="display:flex;align-items:center;gap:10px">
          ${badge}
          <button class="btn ${btnClass} btn-sm" onclick="toggleCheckin('${b.id}', ${checkedIn})">${btnLabel}</button>
        </div>
      </div>`;
  }).join('');
}

window.filterTodayBookings = function(facility, btn) {
  document.querySelectorAll('#facility-filters .fbtn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const all      = window.__todayBookings || [];
  const filtered = facility === 'all' ? all : all.filter(b => cf(b, 'facility') === facility);
  renderTodayList(filtered, document.getElementById('bookings-today-panel'));
};

window.toggleCheckin = async function(contactId, current) {
  try {
    const res = await fetch('/api/checkin', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ contactId, checkedIn: !current }),
    });
    if (!res.ok) throw new Error((await res.json()).error);

    // Update local state and re-render
    const b = (window.__todayBookings || []).find(x => x.id === contactId);
    if (b) {
      const field = (b.customFields || []).find(x => x.fieldKey === 'contact.checked_in' || x.fieldKey === 'checked_in');
      if (field) field.fieldValue = !current ? 'true' : 'false';
      else b.customFields = [...(b.customFields || []), { fieldKey: 'contact.checked_in', fieldValue: !current ? 'true' : 'false' }];
    }

    const activeFilter = document.querySelector('#facility-filters .fbtn.active');
    const facility     = activeFilter?.textContent || 'all';
    window.filterTodayBookings(facility === 'All' ? 'all' : facility, activeFilter || document.querySelector('#facility-filters .fbtn'));
  } catch (e) {
    alert(`Check-in failed: ${e.message}`);
  }
};
