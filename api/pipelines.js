// api/pipelines.js — GHL pipeline stages + enriched opportunity details
// GET ?type=guests|bookings|all
// GET ?pipelineId=xxx  → single pipeline
'use strict';

const PIPELINES = {
  guests:   'R3ThtbOkmE9wwv7TGpqe',
  bookings: 'K2hrHkm85Olx7mgokPR9',
};

const BASE    = 'https://services.leadconnectorhq.com';
const VERSION = '2021-07-28';

function hdrs() {
  return { Authorization: `Bearer ${process.env.GHL_PRIVATE_TOKEN}`, 'Content-Type': 'application/json', Version: VERSION };
}
function locId() { return process.env.GHL_LOCATION_ID || '0h4aeb2m1HrDJ0coPb31'; }

async function ghlGet(path) {
  const res  = await fetch(`${BASE}${path}`, { headers: hdrs() });
  const text = await res.text();
  if (!res.ok) throw Object.assign(new Error(`${res.status}: ${text}`), { status: res.status });
  return text ? JSON.parse(text) : {};
}

function cf(contact, key) {
  const f = (contact?.customFields || []).find(x => x.fieldKey === `contact.${key}` || x.fieldKey === key);
  return f ? (f.fieldValue || '') : '';
}

// Fetch all opportunities in a pipeline (paged)
async function fetchOpportunities(pipelineId) {
  const all = [];
  let page  = 1;
  while (true) {
    const data = await ghlGet(`/opportunities/search?location_id=${locId()}&pipeline_id=${pipelineId}&limit=100&page=${page}`);
    const opps = data.opportunities || [];
    all.push(...opps);
    if (opps.length < 100) break;
    page++;
  }
  return all;
}

// Fetch pipeline definition (stage names + order)
async function fetchPipelineDef(pipelineId) {
  const data = await ghlGet(`/opportunities/pipelines?locationId=${locId()}`);
  return (data.pipelines || []).find(p => p.id === pipelineId) || null;
}

// Fetch all contacts (paginated) and build a contactId → contact map
async function buildContactMap() {
  const map  = {};
  let   page = 1;
  while (true) {
    const data     = await ghlGet(`/contacts/?locationId=${locId()}&limit=100&page=${page}`);
    const contacts = data.contacts || [];
    for (const c of contacts) map[c.id] = c;
    if (contacts.length < 100) break;
    page++;
  }
  return map;
}

// Enrich an opportunity with contact custom fields
function enrichOpp(opp, contactMap) {
  const c   = contactMap[opp.contact?.id] || null;
  const get = (key) => c ? cf(c, key) : '';
  return {
    id:              opp.id,
    name:            opp.name || opp.contact?.name || '',
    status:          opp.status || 'open',
    contactId:       opp.contact?.id || '',
    contactName:     opp.contact?.name || `${c?.firstName||''} ${c?.lastName||''}`.trim() || '',
    contactEmail:    opp.contact?.email || c?.email || '',
    contactPhone:    opp.contact?.phone || c?.phone || '',
    createdAt:       opp.createdAt || '',
    updatedAt:       opp.updatedAt || '',
    // Booking / guest custom fields from contact
    guestName:       get('guest_name') || opp.contact?.name || '',
    invitingMember:  get('member_owner_name'),
    invitingMemberId:get('inviting_member_id') || get('member_owner_cid'),
    facility:        get('facility_or_venue') || get('facility'),
    bookingType:     get('booking_type'),
    bookingRef:      get('booking_reference'),
    slotDate:        get('slot_date'),
    slotTime:        get('slot_start_time') || get('slot_time'),
    slotEndTime:     get('slot_end_time'),
    pax:             get('outlet_pax') || '1',
    checkedIn:       get('checked_in') === 'true',
    checkedInAt:     get('checked_in_at'),
    membershipNumber:get('membership_number'),
    bookingStatus:   get('booking_status') || 'confirmed',
    guestRole:       get('guest_role'),
  };
}

async function buildPipelineSummary(pipelineId, contactMap) {
  const [def, opps] = await Promise.all([
    fetchPipelineDef(pipelineId),
    fetchOpportunities(pipelineId),
  ]);

  const stages = (def?.stages || []).sort((a, b) => (a.position || 0) - (b.position || 0));

  // Group enriched opportunities by stage
  const byStage = {};
  for (const opp of opps) {
    const sid = opp.pipelineStageId;
    if (!byStage[sid]) byStage[sid] = [];
    byStage[sid].push(enrichOpp(opp, contactMap));
  }

  const stageSummary = stages.map(s => ({
    id:            s.id,
    name:          s.name,
    position:      s.position,
    count:         byStage[s.id]?.length || 0,
    opportunities: byStage[s.id] || [],
  }));

  // Catch-all for opps assigned to unknown/deleted stages
  for (const [sid, arr] of Object.entries(byStage)) {
    if (!stages.find(s => s.id === sid)) {
      stageSummary.push({ id: sid, name: 'Other', position: 999, count: arr.length, opportunities: arr });
    }
  }

  return {
    pipelineId,
    pipelineName: def?.name || pipelineId,
    total:        opps.length,
    stages:       stageSummary,
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.GHL_PRIVATE_TOKEN) {
    return res.status(503).json({ error: 'API credentials not configured' });
  }

  const { type = 'all', pipelineId } = req.query;

  try {
    // Fetch contact map once (shared across both pipelines)
    const contactMap = await buildContactMap();

    if (pipelineId) {
      const summary = await buildPipelineSummary(pipelineId, contactMap);
      return res.status(200).json({ success: true, pipeline: summary });
    }

    const keys   = type === 'guests' ? ['guests'] : type === 'bookings' ? ['bookings'] : ['guests', 'bookings'];
    const results = await Promise.all(keys.map(k => buildPipelineSummary(PIPELINES[k], contactMap)));
    const out    = {};
    keys.forEach((k, i) => { out[k] = results[i]; });

    return res.status(200).json({ success: true, pipelines: out });
  } catch (e) {
    console.error('pipelines error:', e.message);
    return res.status(e.status || 500).json({ error: e.message });
  }
};
