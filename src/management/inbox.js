// src/management/inbox.js — Unified Inbox panel (reads conversations from sub-account)

export function renderInboxScreen() {
  return `
    <div class="s-hd">
      <h3>Unified Inbox</h3>
      <p>All conversations from facilities, dining, guest arrivals, and pipelines.</p>
    </div>
    <div style="display:flex;gap:20px;height:calc(100vh - 200px);min-height:400px">
      <!-- Conversation list -->
      <div class="panel" style="width:340px;flex-shrink:0;display:flex;flex-direction:column;overflow:hidden">
        <div class="panel-hd" style="flex-shrink:0">
          <h3>Conversations</h3>
          <span class="act" onclick="loadInbox()">↺ Refresh</span>
        </div>
        <div style="padding:10px 12px;border-bottom:1px solid var(--border);flex-shrink:0">
          <input id="inbox-search" class="form-input" style="padding:8px 12px;font-size:13px" placeholder="Search by name or email…" oninput="filterInbox(this.value)">
        </div>
        <div id="inbox-list" style="flex:1;overflow-y:auto">
          <div style="padding:32px;text-align:center;color:var(--muted)">Loading conversations…</div>
        </div>
      </div>

      <!-- Message thread -->
      <div class="panel" style="flex:1;display:flex;flex-direction:column;overflow:hidden">
        <div class="panel-hd" id="inbox-thread-hdr" style="flex-shrink:0">
          <h3>Select a conversation</h3>
        </div>
        <div id="inbox-thread" style="flex:1;overflow-y:auto;padding:16px">
          <div style="text-align:center;color:var(--muted);padding:40px 20px">
            <div style="font-size:36px;margin-bottom:12px">💬</div>
            <div>Select a conversation to view messages</div>
          </div>
        </div>
      </div>
    </div>`;
}

let _allConversations = [];

export async function loadInbox() {
  const listEl = document.getElementById('inbox-list');
  if (listEl) listEl.innerHTML = '<div style="padding:32px;text-align:center;color:var(--muted)">Loading…</div>';

  try {
    const res  = await fetch('/api/conversations?limit=50');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load conversations');
    _allConversations = data.conversations || [];
    renderConversationList(_allConversations);
  } catch (e) {
    if (listEl) listEl.innerHTML = `<div style="padding:24px;color:var(--danger);font-size:13px">${e.message}</div>`;
  }
}

export function filterInbox(query) {
  const q = query.toLowerCase();
  const filtered = q
    ? _allConversations.filter(c =>
        (c.fullName || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q)
      )
    : _allConversations;
  renderConversationList(filtered);
}

function renderConversationList(convos) {
  const listEl = document.getElementById('inbox-list');
  if (!listEl) return;

  if (!convos.length) {
    listEl.innerHTML = '<div style="padding:32px;text-align:center;color:var(--muted)">No conversations found.</div>';
    return;
  }

  listEl.innerHTML = convos.map(c => {
    const name    = c.fullName || c.contactName || c.email || 'Unknown';
    const last    = c.lastMessageBody ? c.lastMessageBody.slice(0, 60) : '—';
    const ts      = c.lastMessageDate ? formatRelTime(c.lastMessageDate) : '';
    const unread  = c.unreadCount > 0;
    const channel = channelIcon(c.type || c.channel || '');
    return `
      <div class="bk-row" onclick="openConversation('${c.id}', \`${escHtml(name)}\`, \`${escHtml(c.email||'')}\`)"
           style="align-items:flex-start;${unread ? 'background:#fdfbf7' : ''}">
        <div class="bk-ico" style="font-size:15px">${channel}</div>
        <div class="bk-inf" style="min-width:0">
          <div class="bk-t" style="${unread ? 'font-weight:700' : ''}">${escHtml(name)}</div>
          <div class="bk-m" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(last)}</div>
        </div>
        <div class="bk-r" style="white-space:nowrap">
          <div style="font-size:11px;color:var(--muted)">${ts}</div>
          ${unread ? `<span class="badge bb" style="margin-top:4px">${c.unreadCount}</span>` : ''}
        </div>
      </div>`;
  }).join('');
}

window.openConversation = async (id, name, email) => {
  const threadEl  = document.getElementById('inbox-thread');
  const hdrEl     = document.getElementById('inbox-thread-hdr');

  if (hdrEl) hdrEl.innerHTML = `
    <div>
      <h3 style="margin-bottom:2px">${escHtml(name)}</h3>
      ${email ? `<div style="font-size:12px;color:var(--muted)">${escHtml(email)}</div>` : ''}
    </div>`;

  if (threadEl) threadEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted)">Loading messages…</div>';

  try {
    const res  = await fetch(`/api/conversations?id=${id}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load messages');

    const msgs = data.messages || [];
    if (!msgs.length) {
      threadEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted)">No messages in this conversation.</div>';
      return;
    }

    threadEl.innerHTML = msgs.map(m => {
      const isOutbound = m.direction === 'outbound' || m.type === 'outbound';
      const time       = m.dateAdded ? new Date(m.dateAdded).toLocaleString('en-SG', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : '';
      return `
        <div style="display:flex;justify-content:${isOutbound ? 'flex-end' : 'flex-start'};margin-bottom:12px">
          <div style="max-width:72%;background:${isOutbound ? 'var(--navy)' : 'var(--cream2)'};
                color:${isOutbound ? 'white' : 'var(--text)'};border-radius:${isOutbound ? '14px 14px 4px 14px' : '14px 14px 14px 4px'};
                padding:10px 14px;font-size:13.5px;line-height:1.5">
            <div>${escHtml(m.body || m.message || '')}</div>
            <div style="font-size:11px;opacity:.55;margin-top:5px;text-align:right">${time}</div>
          </div>
        </div>`;
    }).join('');

    // Auto-scroll to bottom
    threadEl.scrollTop = threadEl.scrollHeight;
  } catch (e) {
    if (threadEl) threadEl.innerHTML = `<div style="padding:20px;color:var(--danger)">${e.message}</div>`;
  }
};

function channelIcon(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('sms') || t.includes('phone')) return '📱';
  if (t.includes('email')) return '📧';
  if (t.includes('fb') || t.includes('facebook')) return '💬';
  if (t.includes('whatsapp')) return '💚';
  if (t.includes('instagram')) return '📸';
  if (t.includes('web') || t.includes('live')) return '🌐';
  return '💬';
}

function formatRelTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-SG', { day:'numeric', month:'short' });
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
