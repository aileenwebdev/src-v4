// src/member/quota-widget.js — Reusable quota bar for the member sidebar

/**
 * @param {{ quotaUsed: number, quotaTotal: number }} member
 * @returns {string} HTML for the quota widget in the sidebar footer
 */
export function renderQuota(member) {
  const used    = member.quotaUsed  || 0;
  const total   = member.quotaTotal || 4;
  const pct     = Math.min(Math.round((used / total) * 100), 100);
  const barColor = pct >= 100
    ? 'background:var(--danger)'
    : pct >= 75
      ? 'background:var(--gold)'
      : '';

  return `
    <div class="sb-quota">
      <div class="sb-quota-lbl">Guest Passes</div>
      <div class="sb-quota-bar">
        <div class="sb-quota-fill" style="width:${pct}%;${barColor}"></div>
      </div>
      <div class="sb-quota-txt">${used} / ${total} used this month</div>
    </div>`;
}

/**
 * Update the quota widget in place without re-rendering the full sidebar.
 * @param {{ quotaUsed: number, quotaTotal: number }} member
 * @param {string} containerId  id of the element containing the .sb-quota div
 */
export function updateQuota(member, containerId = 'quota-widget') {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = renderQuota(member);
}
