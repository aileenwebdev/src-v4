// src/management/staff-mgmt.js — Staff user management panel

export function renderStaffMgmtScreen() {
  return `
    <div class="s-hd">
      <h3>Staff Management</h3>
      <p>Add, view, and deactivate staff accounts.</p>
    </div>

    <!-- Add staff form -->
    <div class="panel" style="margin-bottom:20px;padding:20px 20px 24px">
      <div class="panel-hd" style="padding:0 0 14px"><h3>Add Staff Account</h3></div>
      <div class="field-grid">
        <div class="form-group">
          <label class="form-label">Username</label>
          <input id="staff-username" class="form-input" placeholder="username">
        </div>
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input id="staff-name" class="form-input" placeholder="Display name">
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input id="staff-email" class="form-input" type="email" placeholder="staff@src.org.sg">
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input id="staff-password" class="form-input" type="password" placeholder="Temporary password">
        </div>
        <div class="form-group">
          <label class="form-label">Role</label>
          <select id="staff-role" class="form-select">
            <option value="staff">Staff</option>
            <option value="management">Management</option>
          </select>
        </div>
      </div>
      <div id="staff-add-err" style="display:none;color:var(--danger);font-size:13px;margin-bottom:10px"></div>
      <div id="staff-add-ok" style="display:none;margin-bottom:10px" class="alert-strip">✓ Staff account created.</div>
      <button class="btn btn-p btn-sm" onclick="addStaff()">Create Account</button>
    </div>

    <!-- Staff list -->
    <div class="panel">
      <div class="panel-hd">
        <h3>Staff Accounts</h3>
        <a onclick="loadStaffList()">Refresh</a>
      </div>
      <div id="staff-list">
        <div style="padding:32px;text-align:center;color:var(--muted)">Loading…</div>
      </div>
    </div>`;
}

export function bindStaffMgmt() {
  window.addStaff = async () => {
    const username = document.getElementById('staff-username')?.value?.trim();
    const name     = document.getElementById('staff-name')?.value?.trim();
    const email    = document.getElementById('staff-email')?.value?.trim();
    const password = document.getElementById('staff-password')?.value;
    const role     = document.getElementById('staff-role')?.value;
    const errEl    = document.getElementById('staff-add-err');
    const okEl     = document.getElementById('staff-add-ok');

    if (!username || !password || !role) {
      if (errEl) { errEl.textContent = 'Username, password, and role are required.'; errEl.style.display = 'block'; }
      return;
    }
    if (errEl) errEl.style.display = 'none';

    try {
      const res = await fetch('/api/admin-staff', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, name, email, password, role }),
      });
      if (!res.ok) throw new Error((await res.json()).error);

      document.getElementById('staff-username').value = '';
      document.getElementById('staff-name').value     = '';
      document.getElementById('staff-email').value    = '';
      document.getElementById('staff-password').value = '';

      if (okEl) { okEl.style.display = 'flex'; setTimeout(() => { okEl.style.display = 'none'; }, 3000); }
      window.loadStaffList();
    } catch (e) {
      if (errEl) { errEl.textContent = e.message; errEl.style.display = 'block'; }
    }
  };

  window.deactivateStaff = async (username) => {
    if (!confirm(`Deactivate "${username}"?`)) return;
    try {
      const res = await fetch(`/api/admin-staff?username=${encodeURIComponent(username)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      window.loadStaffList();
    } catch (e) {
      alert(`Failed: ${e.message}`);
    }
  };

  window.loadStaffList = async () => {
    const listEl = document.getElementById('staff-list');
    try {
      const res  = await fetch('/api/admin-staff');
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      renderStaffList(data.staff || [], listEl);
    } catch (e) {
      if (listEl) listEl.innerHTML = `<div style="padding:24px;color:var(--danger)">${e.message}</div>`;
    }
  };

  // Auto-load on mount
  window.loadStaffList();
}

function renderStaffList(staff, container) {
  if (!container) return;
  if (!staff.length) {
    container.innerHTML = '<div style="padding:24px;text-align:center;color:var(--muted)">No staff accounts found.</div>';
    return;
  }
  container.innerHTML = staff.map(u => `
    <div class="bk-row" style="cursor:default">
      <div class="bk-ico">${u.role === 'management' ? '👔' : '👤'}</div>
      <div class="bk-inf">
        <div class="bk-t">${u.name || u.username}</div>
        <div class="bk-m">${u.email || ''} · ${u.username}</div>
      </div>
      <div class="bk-r" style="display:flex;align-items:center;gap:10px">
        <span class="badge ${u.role === 'management' ? 'bb' : 'bgr'}">${u.role}</span>
        <span class="badge ${u.active !== false ? 'bg' : 'br'}">${u.active !== false ? 'Active' : 'Inactive'}</span>
        ${u.active !== false ? `<button class="btn btn-d btn-sm" onclick="deactivateStaff('${u.username}')">Deactivate</button>` : ''}
      </div>
    </div>`).join('');
}
