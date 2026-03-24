// src/staff/bookings-today.js — Today's bookings list with check-in toggle

import { UI } from '../components.js';

export function renderBookingsTodayScreen(opts = {}) {
  const title = opts.all ? 'All Bookings' : "Today's Bookings";
  const sub   = opts.all ? 'All facility and dining bookings across all dates.' : 'All members and guests booked for today.';
  return `
    <div class="s-hd">
      <h3>${title}</h3>
      <p>${sub}</p>
    </div>
    <div class="filter-row" id="facility-filters">
      <button class="fbtn active" onclick="filterTodayBookings('all', this)">All</button>
    </div>
    <div class="panel" id="bookings-today-panel">
      <div style="padding:32px;text-align:center;color:var(--muted)">Loading…</div>
    </div>`;
}

// apiPassword: optional (falls back to session cookie); all: fetch all dates
export async function loadTodayBookings(apiPassword, opts = {}) {
  const panel = document.getElementById('bookings-today-panel');
  try {
    const params = new URLSearchParams();
    if (apiPassword) params.set('pwd', apiPassword);
    if (opts.all)    params.set('all', 'true');

    const res  = await fetch(`/api/fetch-bookings?${params}`, { credentials: 'include' });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Load failed');

    window.__todayBookings = data.contacts || [];
    buildFacilityFilters(window.__todayBookings, opts.all);
    renderBookingsList(window.__todayBookings, panel, opts.all);
  } catch (e) {
    if (panel) panel.innerHTML = `<div style="padding:24px;text-align:center;color:var(--danger)">${e.message}</div>`;
  }
}

function getField(b, key) {
  // Use pre-parsed field if available, fallback to customFields scan
  if (b[key] !== undefined) return b[key] || '';
  const f = (b.customFields || []).find(x => x.fieldKey === `contact.${key}` || x.fieldKey === key);
  return f ? (f.fieldValue || '') : '';
}

function buildFacilityFilters(bookings, showAll) {
  const facilities = [...new Set(bookings.map(b => b.facility || getField(b, 'facility_or_venue') || getField(b, 'facility')).filter(Boolean))];
  const row = document.getElementById('facility-filters');
  if (!row) return;
  // Clear existing except "All" button
  [...row.querySelectorAll('.fbtn:not(:first-child)')].forEach(b => b.remove());
  if (showAll) {
    // Date filter buttons for "all" mode
    const dates = [...new Set(bookings.map(b => b.slotDate || getField(b, 'slot_date')).filter(Boolean))].sort().reverse().slice(0, 7);
    dates.forEach(date => {
      const btn = document.createElement('button');
      btn.className = 'fbtn';
      btn.textContent = date;
      btn.onclick = () => window.filterTodayBookings(date, btn, 'date');
      row.appendChild(btn);
    });
  }
  facilities.forEach(fac => {
    const btn = document.createElement('button');
    btn.className = 'fbtn';
    btn.textContent = fac;
    btn.onclick = () => window.filterTodayBookings(fac, btn, 'facility');
    row.appendChild(btn);
  });
}

function renderBookingsList(bookings, container, showAll) {
  if (!container) return;
  if (!bookings.length) {
    container.innerHTML = `<div style="padding:32px;text-align:center;color:var(--muted)">${showAll ? 'No bookings found.' : 'No bookings for today.'}</div>`;
    return;
  }

  container.innerHTML = bookings.map(b => {
    const name       = b.name || `${b.firstName||''} ${b.lastName||''}`.trim() || 'Unknown';
    const facility   = b.facility || getField(b, 'facility_or_venue') || getField(b, 'facility') || '—';
    const slotTime   = b.slotStartTime || getField(b, 'slot_start_time') || getField(b, 'slot_time') || '';
    const slotDate   = b.slotDate || getField(b, 'slot_date') || '';
    const dateLabel  = showAll && slotDate ? ` · ${slotDate}` : '';
    const timeLabel  = slotTime ? ` · ${slotTime.length > 10 ? slotTime.slice(11,16) : slotTime}` : '';
    const btype      = b.bookingType || getField(b, 'booking_type') || '';
    const isGuest    = btype === 'guest_pass';
    const invitedBy  = b.invitingMember || getField(b, 'member_owner_name') || '';
    const type       = isGuest ? `🎫 Guest${invitedBy ? ' · via ' + invitedBy : ''}` : '👤 Member';
    const pax        = b.pax || getField(b, 'outlet_pax') || '1';
    const checkedIn  = b.checkedIn !== undefined ? b.checkedIn : getField(b, 'checked_in') === 'true';
    const badge      = checkedIn ? '<span class="badge bg">Checked In</span>' : '<span class="badge by">Pending</span>';
    const ref        = b.bookingRef || getField(b, 'booking_reference') || '';

    return `
      <div class="bk-row" style="align-items:center" id="bkrow-${b.id}">
        <div class="bk-ico">${isGuest ? '🎫' : '🏟️'}</div>
        <div class="bk-inf">
          <div class="bk-t">${escHtml(name)}</div>
          <div class="bk-m">${escHtml(facility)}${timeLabel}${dateLabel} · ${escHtml(type)} · ${pax} pax${ref ? ' · ' + ref : ''}</div>
        </div>
        <div class="bk-r" style="display:flex;align-items:center;gap:10px">
          ${badge}
          <button class="btn ${checkedIn ? 'btn-o' : 'btn-g'} btn-sm"
            onclick="toggleCheckin('${b.id}', ${checkedIn})">${checkedIn ? 'Undo' : 'Check In'}</button>
        </div>
      </div>`;
  }).join('');
}

function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

window.filterTodayBookings = function(val, btn, filterType) {
  document.querySelectorAll('#facility-filters .fbtn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const all      = window.__todayBookings || [];
  let filtered   = all;
  if (val !== 'all') {
    if (filterType === 'date') {
      filtered = all.filter(b => (b.slotDate || getField(b, 'slot_date')) === val);
    } else {
      filtered = all.filter(b => (b.facility || getField(b, 'facility_or_venue') || getField(b, 'facility')) === val);
    }
  }
  renderBookingsList(filtered, document.getElementById('bookings-today-panel'), true);
};

window.toggleCheckin = async function(contactId, current) {
  try {
    const res = await fetch('/api/checkin', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body:    JSON.stringify({ contactId, checkedIn: !current }),
    });
    if (!res.ok) throw new Error((await res.json()).error);

    const b = (window.__todayBookings || []).find(x => x.id === contactId);
    if (b) {
      b.checkedIn = !current;
      const field = (b.customFields || []).find(x => x.fieldKey === 'contact.checked_in' || x.fieldKey === 'checked_in');
      if (field) field.fieldValue = !current ? 'true' : 'false';
    }

    const activeBtn = document.querySelector('#facility-filters .fbtn.active');
    const activeVal = activeBtn?.textContent || 'All';
    window.filterTodayBookings(activeVal === 'All' ? 'all' : activeVal, activeBtn);
  } catch (e) {
    alert(`Check-in failed: ${e.message}`);
  }
};
