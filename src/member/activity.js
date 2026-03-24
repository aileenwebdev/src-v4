// src/member/activity.js — Member activity history view

import { UI } from '../components.js';

const FACILITY_ICONS = {
  'Swimming Pool':   '🏊',
  'Tennis Court':    '🎾',
  'Squash Court':    '🏸',
  'Gym':             '🏋️',
  'Billiards Room':  '🎱',
  'Function Room':   '🎉',
};

function facilityIcon(facility) {
  return FACILITY_ICONS[facility] || '📅';
}

function statusBadge(status) {
  const map = {
    confirmed: '<span class="badge bg">Confirmed</span>',
    pending:   '<span class="badge by">Pending</span>',
    cancelled: '<span class="badge br">Cancelled</span>',
    completed: '<span class="badge bgr">Completed</span>',
  };
  return map[status] || `<span class="badge bgr">${status}</span>`;
}

/**
 * Render the activity screen skeleton (container only).
 */
export function renderActivityScreen() {
  return `
    <div class="s-hd">
      <h3>Activity History</h3>
      <p>Your past and upcoming bookings.</p>
    </div>
    <div class="filter-row">
      <button class="fbtn active" onclick="filterActivity('all', this)">All</button>
      <button class="fbtn" onclick="filterActivity('member', this)">Member</button>
      <button class="fbtn" onclick="filterActivity('guest_pass', this)">Guest Pass</button>
    </div>
    <div class="panel" id="activity-panel">
      <div style="padding:32px;text-align:center;color:var(--muted)">Loading activity…</div>
    </div>`;
}

/**
 * Load and render bookings for a member.
 * @param {string} membershipNumber
 * @param {string} apiPassword
 */
export async function loadActivity(membershipNumber, apiPassword) {
  const panel = document.getElementById('activity-panel');
  try {
    const res  = await fetch(`/api/fetch-bookings?pwd=${encodeURIComponent(apiPassword)}&memberId=${encodeURIComponent(membershipNumber)}`);
    const data = await res.json();

    if (!data.success) throw new Error(data.error || 'Load failed');

    const bookings = data.contacts || [];
    window.__activityAll = bookings;
    renderActivityList(bookings, panel);
  } catch (e) {
    if (panel) panel.innerHTML = `<div style="padding:24px;text-align:center;color:var(--danger)">${e.message}</div>`;
  }
}

function renderActivityList(bookings, container) {
  if (!container) return;
  if (!bookings.length) {
    container.innerHTML = '<div style="padding:32px;text-align:center;color:var(--muted)">No bookings found.</div>';
    return;
  }

  const cf = (c, k) => {
    const f = (c.customFields || []).find(x => x.fieldKey === `contact.${k}` || x.fieldKey === k);
    return f ? (f.fieldValue || '') : '';
  };

  container.innerHTML = bookings.map(b => {
    const facility = cf(b, 'facility') || 'Facility';
    const date     = cf(b, 'slot_date') || '';
    const time     = cf(b, 'slot_time') || '';
    const type     = cf(b, 'booking_type') || 'member';
    const status   = cf(b, 'booking_status') || 'confirmed';
    const guest    = cf(b, 'guest_name');
    const subtitle = type === 'guest_pass' ? `Guest: ${guest || 'Unknown'}` : 'Member booking';

    return UI.BookingRow({
      icon:         facilityIcon(facility),
      title:        facility,
      subtitle:     `${date}${time ? ' · ' + time : ''} — ${subtitle}`,
      rightTitle:   statusBadge(status),
      rightSubtitle: type === 'guest_pass' ? '🎫 Guest' : '👤 Member',
      onClick:      '',
    });
  }).join('');
}

/**
 * Filter handler — called from onclick in renderActivityScreen.
 */
window.filterActivity = function(type, btn) {
  document.querySelectorAll('.filter-row .fbtn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const all     = window.__activityAll || [];
  const cf = (c, k) => {
    const f = (c.customFields || []).find(x => x.fieldKey === `contact.${k}` || x.fieldKey === k);
    return f ? (f.fieldValue || '') : '';
  };
  const filtered = type === 'all' ? all : all.filter(b => cf(b, 'booking_type') === type);
  renderActivityList(filtered, document.getElementById('activity-panel'));
};
