// src/components.js - Reusable UI components for Wibiz Dashboard

export const UI = {
  /**
   * Renders a standard booking/activity row
   */
  BookingRow: ({ icon, title, subtitle, rightTitle, rightSubtitle, badge, onClick, style = '' }) => `
    <div class="bk-row" onclick="${onClick}" style="${style}">
      <div class="bk-ico">${icon}</div>
      <div class="bk-inf">
        <div class="bk-t">${title}</div>
        <div class="bk-m">${subtitle}</div>
      </div>
      <div class="bk-r">
        <div class="bk-rt">${rightTitle || ''}</div>
        <div class="bk-rd">${rightSubtitle || ''}</div>
        ${badge ? `<div style="margin-top:4px">${badge}</div>` : ''}
      </div>
    </div>
  `,

  /**
   * Renders a standard panel container
   */
  Panel: ({ title, actionText, onAction, contentId, height }) => `
    <div class="panel" style="${height ? `height:${height}px` : ''}">
      <div class="panel-hd">
        <h3>${title}</h3>
        ${actionText ? `<a onclick="${onAction}">${actionText}</a>` : ''}
      </div>
      <div id="${contentId}"></div>
    </div>
  `,

  /**
   * Renders a stat card (Hero or small)
   */
  StatCard: ({ label, value, icon }) => `
    <div class="hs">
      <div class="hs-n">${value}</div>
      <div class="hs-l">${label}</div>
    </div>
  `,

  /**
   * Renders a "Coming Soon" placeholder
   */
  ComingSoon: (moduleName) => `
    <div style="text-align:center;padding:48px;color:var(--muted)">
      <div style="font-size:48px;margin-bottom:16px">🛠️</div>
      <h4>${moduleName} Under Development</h4>
      <p>This module is part of the next phase of the Wibiz Dashboard rollout.</p>
    </div>
  `
};
