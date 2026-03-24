// src/member/profile.js — Member profile view + editable preferred contact

import { UI } from '../components.js';

/**
 * Render the full profile screen HTML.
 * @param {object} member  Session member object
 * @returns {string}
 */
export function renderProfileScreen(member) {
  const initials = `${(member.firstName || '?')[0]}${(member.lastName || '')[0] || ''}`.toUpperCase();

  return `
    <div class="s-hd">
      <h3>My Profile</h3>
      <p>Your membership details and contact preferences.</p>
    </div>

    <div class="profile-grid">
      <!-- Left card -->
      <div class="p-card">
        <div class="p-av">${initials}</div>
        <div class="p-name">${member.name || 'Member'}</div>
        <div class="p-id">${member.membershipNumber || ''}</div>
        <div style="margin-top:8px">
          <span class="badge bg">${member.tierLabel || 'Member'}</span>
        </div>
        <div class="p-stats">
          <div class="ps"><div class="ps-n">${member.quotaTotal || 4}</div><div class="ps-l">Quota</div></div>
          <div class="ps"><div class="ps-n">${member.quotaUsed || 0}</div><div class="ps-l">Used</div></div>
          <div class="ps"><div class="ps-n">${(member.quotaTotal || 4) - (member.quotaUsed || 0)}</div><div class="ps-l">Remaining</div></div>
        </div>
        <div class="p-meta">
          <div class="p-mr">📧 ${member.email || '—'}</div>
          <div class="p-mr">📱 <span id="profile-phone-display">${member.phone || '—'}</span></div>
        </div>
      </div>

      <!-- Right: editable fields -->
      <div>
        <div class="info-card" style="margin-bottom:16px">
          <h4>Contact Preferences</h4>
          <div class="form-group">
            <label class="form-label">Mobile Number</label>
            <input id="profile-phone" class="form-input" type="tel" value="${member.phone || ''}" placeholder="+65 XXXX XXXX">
          </div>
          <div class="form-group">
            <label class="form-label">Preferred Contact Method</label>
            <select id="profile-contact-pref" class="form-select">
              <option value="email"${member.preferredContact === 'email' ? ' selected' : ''}>Email</option>
              <option value="sms"${member.preferredContact === 'sms' ? ' selected' : ''}>SMS</option>
              <option value="whatsapp"${member.preferredContact === 'whatsapp' ? ' selected' : ''}>WhatsApp</option>
            </select>
          </div>
          <div id="profile-save-msg" style="display:none;margin-bottom:12px" class="alert-strip">✓ Saved successfully</div>
          <button class="btn btn-p btn-sm" onclick="saveProfile('${member.id}')">Save Changes</button>
        </div>

        <div class="info-card">
          <h4>Membership Information</h4>
          <div class="d-row"><span class="dr-l">Full Name</span><span class="dr-v">${member.name || '—'}</span></div>
          <div class="d-row"><span class="dr-l">Membership No.</span><span class="dr-v">${member.membershipNumber || '—'}</span></div>
          <div class="d-row"><span class="dr-l">Tier</span><span class="dr-v">${member.tierLabel || '—'}</span></div>
          <div class="d-row"><span class="dr-l">Email</span><span class="dr-v">${member.email || '—'}</span></div>
        </div>
      </div>
    </div>`;
}

/**
 * Wire up the Save button logic. Call after renderProfileScreen is in the DOM.
 * @param {string} apiPassword  The API_PASSWORD query param
 */
export function bindProfileSave(apiPassword) {
  window.saveProfile = async (contactId) => {
    const phone   = document.getElementById('profile-phone')?.value?.trim() || '';
    const pref    = document.getElementById('profile-contact-pref')?.value || 'email';
    const msgEl   = document.getElementById('profile-save-msg');

    try {
      const res = await fetch('/api/update-member-profile', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          contactId,
          fields: { phone, preferredContact: pref },
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);

      // Reflect phone change in sidebar display
      const disp = document.getElementById('profile-phone-display');
      if (disp) disp.textContent = phone || '—';

      if (msgEl) { msgEl.style.display = 'flex'; setTimeout(() => { msgEl.style.display = 'none'; }, 3000); }
    } catch (e) {
      alert(`Save failed: ${e.message}`);
    }
  };
}
