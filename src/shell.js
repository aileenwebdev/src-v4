// src/shell.js — Shared sidebar shell using existing CSS variables and class names

/**
 * @param {object} opts
 * @param {'member'|'staff'|'management'} opts.role
 * @param {string}  opts.userName     Display name in sidebar
 * @param {string}  opts.userSub      Subtitle (member number / role label)
 * @param {Array}   opts.navItems     [{ id, icon, label, badge? }]
 * @param {string}  opts.activeId     id of the active nav item
 * @param {string}  opts.logoutFn     JS expression called on logout click
 * @param {string}  [opts.quotaHtml]  Optional quota bar HTML for member portal
 */
export function renderShell({ role, userName, userSub, navItems, activeId, logoutFn, quotaHtml = '' }) {
  const roleLabel = { member: 'MEMBER PORTAL', staff: 'STAFF PORTAL', management: 'MANAGEMENT' }[role] || '';

  const links = navItems.map(item => `
    <div class="sb-lnk${item.id === activeId ? ' active' : ''}" onclick="navigate('${item.id}')">
      <span class="ni">${item.icon}</span>
      ${item.label}
      ${item.badge ? `<span class="sb-badge">${item.badge}</span>` : ''}
    </div>`).join('');

  return `
    <div class="sidebar" id="sidebar">
      <div class="sb-brand">
        <div class="sb-emb">SRC</div>
        <div class="sb-brand-txt">
          <strong>Singapore Recreation Club</strong>
          <span>${roleLabel}</span>
        </div>
      </div>
      <div class="sb-mem">
        <div class="sb-mem-name">${userName}</div>
        <div class="sb-mem-id">${userSub}</div>
      </div>
      <nav class="sb-nav">${links}</nav>
      <div class="sb-ft">
        ${quotaHtml}
        <div class="sb-logout" onclick="${logoutFn}">
          <span>↩</span> Sign Out
        </div>
      </div>
    </div>
    <div class="sb-overlay" id="sb-overlay" onclick="closeSidebar()"></div>`;
}

/**
 * Renders the top bar.
 */
export function renderTopbar({ title, subtitle = '', rightHtml = '' }) {
  return `
    <div class="topbar">
      <div class="tb-left">
        <button class="hamburger" onclick="openSidebar()">☰</button>
        <div>
          <div class="tb-title">${title}</div>
          ${subtitle ? `<div class="tb-date">${subtitle}</div>` : ''}
        </div>
      </div>
      <div class="tb-right">${rightHtml}</div>
    </div>`;
}
