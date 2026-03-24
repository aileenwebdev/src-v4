// src/management/analytics.js — Analytics dashboard for the management portal

import { UI } from '../components.js';

export function renderAnalyticsScreen() {
  return `
    <div class="s-hd">
      <h3>Analytics</h3>
      <p>Booking activity and membership insights.</p>
    </div>
    <div class="filter-row">
      <button class="fbtn active" onclick="loadAnalytics(7, this)">7 days</button>
      <button class="fbtn" onclick="loadAnalytics(30, this)">30 days</button>
      <button class="fbtn" onclick="loadAnalytics(90, this)">90 days</button>
    </div>
    <div id="analytics-summary" class="hero" style="margin-bottom:24px">
      <div style="text-align:center;padding:24px;color:rgba(255,255,255,.5)">Loading analytics…</div>
    </div>
    <div class="two-col">
      <div class="panel">
        <div class="panel-hd"><h3>Bookings by Facility</h3></div>
        <div id="analytics-by-facility" style="padding:16px"></div>
      </div>
      <div class="panel">
        <div class="panel-hd"><h3>Membership Tiers</h3></div>
        <div id="analytics-tiers" style="padding:16px"></div>
      </div>
    </div>
    <div class="panel" style="margin-bottom:24px">
      <div class="panel-hd"><h3>Daily Booking Volume</h3></div>
      <div id="analytics-by-day" style="padding:20px 20px 16px"></div>
    </div>`;
}

export async function loadAnalytics(days, btn) {
  if (btn) {
    document.querySelectorAll('.filter-row .fbtn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }

  const summaryEl   = document.getElementById('analytics-summary');
  const facilityEl  = document.getElementById('analytics-by-facility');
  const tiersEl     = document.getElementById('analytics-tiers');
  const byDayEl     = document.getElementById('analytics-by-day');

  if (summaryEl) summaryEl.innerHTML = '<div style="text-align:center;padding:24px;color:rgba(255,255,255,.5)">Loading…</div>';

  try {
    const res  = await fetch(`/api/analytics?days=${days}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    const s = data.summary;

    if (summaryEl) summaryEl.innerHTML = `
      <h2 style="font-family:\'Playfair Display\',serif;font-size:20px;color:white;margin-bottom:16px">
        ${data.period}
      </h2>
      <div class="hero-stats">
        ${UI.StatCard({ label: 'Total Bookings',    value: s.totalBookings })}
        ${UI.StatCard({ label: 'Guest Bookings',    value: s.guestBookings })}
        ${UI.StatCard({ label: 'Check-In Rate',     value: s.checkInRate + '%' })}
        ${UI.StatCard({ label: 'Total Members',     value: s.totalMembers })}
      </div>`;

    if (facilityEl) {
      const entries = Object.entries(data.byFacility).sort((a, b) => b[1] - a[1]);
      const max     = entries[0]?.[1] || 1;
      facilityEl.innerHTML = entries.map(([fac, count]) => `
        <div style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
            <span>${fac}</span><span style="font-weight:600;color:var(--navy)">${count}</span>
          </div>
          <div style="background:var(--border);height:6px;border-radius:4px">
            <div style="width:${Math.round((count/max)*100)}%;height:100%;background:var(--gold);border-radius:4px"></div>
          </div>
        </div>`).join('') || '<div style="color:var(--muted)">No data.</div>';
    }

    if (tiersEl) {
      const entries = Object.entries(data.tierBreakdown).sort((a, b) => b[1] - a[1]);
      tiersEl.innerHTML = entries.map(([tier, count]) => `
        <div class="d-row"><span class="dr-l" style="text-transform:capitalize">${tier}</span>
          <span class="dr-v">${count} member${count !== 1 ? 's' : ''}</span></div>`).join('') || '<div style="color:var(--muted)">No data.</div>';
    }

    if (byDayEl) {
      const entries = Object.entries(data.byDay).sort(([a], [b]) => a.localeCompare(b));
      if (!entries.length) {
        byDayEl.innerHTML = '<div style="color:var(--muted)">No booking data in this period.</div>';
      } else {
        const max = Math.max(...entries.map(([, v]) => v), 1);
        byDayEl.innerHTML = `
          <div style="display:flex;align-items:flex-end;gap:4px;height:80px">
            ${entries.map(([date, count]) => `
              <div title="${date}: ${count}" style="flex:1;background:var(--gold);opacity:.8;border-radius:3px 3px 0 0;
                height:${Math.max(Math.round((count / max) * 80), 4)}px;cursor:default"></div>`).join('')}
          </div>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-top:4px">
            <span>${entries[0]?.[0] || ''}</span><span>${entries[entries.length-1]?.[0] || ''}</span>
          </div>`;
      }
    }
  } catch (e) {
    if (summaryEl) summaryEl.innerHTML = `<div style="color:var(--danger-bg);padding:16px">${e.message}</div>`;
  }
}
