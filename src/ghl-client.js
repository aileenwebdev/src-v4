// src/ghl-client.js — Centralised GHL API wrapper (server-side only, CJS)
'use strict';

const BASE    = 'https://services.leadconnectorhq.com';
const VERSION = '2021-07-28';

function makeHeaders() {
  return {
    Authorization:  `Bearer ${process.env.GHL_PRIVATE_TOKEN}`,
    'Content-Type': 'application/json',
    Version:        VERSION,
  };
}

function locationId() {
  return process.env.GHL_LOCATION_ID || '0h4aeb2m1HrDJ0coPb31';
}

async function ghlFetch(path, opts = {}) {
  const res  = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { ...makeHeaders(), ...(opts.headers || {}) },
  });
  const text = await res.text();
  if (!res.ok) {
    const err = Object.assign(new Error(`${res.status}: ${text}`), { status: res.status });
    throw err;
  }
  return text ? JSON.parse(text) : {};
}

const GHL = {
  searchContacts(query, limit = 20) {
    return ghlFetch(
      `/contacts/?locationId=${locationId()}&query=${encodeURIComponent(query)}&limit=${limit}`
    );
  },

  listContacts(limit = 100) {
    return ghlFetch(`/contacts/?locationId=${locationId()}&limit=${limit}`);
  },

  getContact(id) {
    return ghlFetch(`/contacts/${id}`);
  },

  updateContact(id, fields) {
    return ghlFetch(`/contacts/${id}`, {
      method: 'PUT',
      body:   JSON.stringify(fields),
    });
  },

  addNote(contactId, body) {
    return ghlFetch(`/contacts/${contactId}/notes`, {
      method: 'POST',
      body:   JSON.stringify({ body }),
    });
  },

  getNotes(contactId) {
    return ghlFetch(`/contacts/${contactId}/notes`);
  },

  triggerWorkflow(workflowId, contactId) {
    return ghlFetch(`/contacts/${contactId}/workflow/${workflowId}`, {
      method: 'POST',
      body:   '{}',
    });
  },

  listConversations(limit = 50) {
    return ghlFetch(`/conversations/search?locationId=${locationId()}&limit=${limit}`);
  },

  getMessages(conversationId) {
    return ghlFetch(`/conversations/${conversationId}/messages`);
  },
};

module.exports = { GHL };
