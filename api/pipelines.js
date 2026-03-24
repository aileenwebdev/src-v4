// api/pipelines.js — Fetch GHL pipeline stages + opportunity counts
// GET ?type=guests|bookings|all   (default: all)
// GET ?pipelineId=xxx&stage=true  → full opportunities for one pipeline
'use strict';

const PIPELINES = {
  guests:   'R3ThtbOkmE9wwv7TGpqe',
  bookings: 'K2hrHkm85Olx7mgokPR9',
};

const BASE    = 'https://services.leadconnectorhq.com';
const VERSION = '2021-07-28';

function headers() {
  return {
    Authorization: `Bearer ${process.env.GHL_PRIVATE_TOKEN}`,
    'Content-Type': 'application/json',
    Version: VERSION,
  };
}

function locId() {
  return process.env.GHL_LOCATION_ID || '0h4aeb2m1HrDJ0coPb31';
}

async function ghlGet(path) {
  const res  = await fetch(`${BASE}${path}`, { headers: headers() });
  const text = await res.text();
  if (!res.ok) throw Object.assign(new Error(`${res.status}: ${text}`), { status: res.status });
  return text ? JSON.parse(text) : {};
}

// Fetch pipeline definition (stage names/order)
async function fetchPipelineDef(pipelineId) {
  const data   = await ghlGet(`/opportunities/pipelines?locationId=${locId()}`);
  const pipelines = data.pipelines || [];
  return pipelines.find(p => p.id === pipelineId) || null;
}

// Fetch all opportunities in a pipeline (paged)
async function fetchOpportunities(pipelineId) {
  const all = [];
  let page  = 1;
  while (true) {
    const data = await ghlGet(
      `/opportunities/search?location_id=${locId()}&pipeline_id=${pipelineId}&limit=100&page=${page}`
    );
    const opps = data.opportunities || [];
    all.push(...opps);
    if (opps.length < 100) break;
    page++;
  }
  return all;
}

// Build stage summary: [{ id, name, position, count, opportunities }]
async function buildStageSummary(pipelineId, includeOpps = false) {
  const [def, opps] = await Promise.all([
    fetchPipelineDef(pipelineId),
    fetchOpportunities(pipelineId),
  ]);

  const stages = (def?.stages || []).sort((a, b) => (a.position || 0) - (b.position || 0));

  // Count by stage
  const byStage = {};
  for (const opp of opps) {
    const sid = opp.pipelineStageId;
    if (!byStage[sid]) byStage[sid] = { count: 0, opps: [] };
    byStage[sid].count++;
    if (includeOpps) byStage[sid].opps.push({
      id:          opp.id,
      name:        opp.name,
      status:      opp.status,
      contactName: opp.contact?.name || '',
      contactEmail:opp.contact?.email || '',
      contactId:   opp.contact?.id || '',
      value:       opp.monetaryValue || 0,
      createdAt:   opp.createdAt || '',
      updatedAt:   opp.updatedAt || '',
    });
  }

  // Merge stages with counts
  const summary = stages.map(s => ({
    id:       s.id,
    name:     s.name,
    position: s.position,
    count:    byStage[s.id]?.count || 0,
    ...(includeOpps ? { opportunities: byStage[s.id]?.opps || [] } : {}),
  }));

  // Add catch-all for unmatched stage IDs
  for (const [sid, val] of Object.entries(byStage)) {
    if (!stages.find(s => s.id === sid)) {
      summary.push({ id: sid, name: 'Unknown Stage', position: 999, count: val.count,
        ...(includeOpps ? { opportunities: val.opps } : {}) });
    }
  }

  return {
    pipelineId,
    pipelineName: def?.name || pipelineId,
    total: opps.length,
    stages: summary,
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { type = 'all', pipelineId, detail } = req.query;
  const includeOpps = detail === 'true';

  if (!process.env.GHL_PRIVATE_TOKEN) {
    return res.status(503).json({ error: 'API credentials not configured' });
  }

  try {
    // Single pipeline detail
    if (pipelineId) {
      const summary = await buildStageSummary(pipelineId, includeOpps);
      return res.status(200).json({ success: true, pipeline: summary });
    }

    // Both pipelines
    const keys = type === 'guests'   ? ['guests']
               : type === 'bookings' ? ['bookings']
               : ['guests', 'bookings'];

    const results = await Promise.all(
      keys.map(k => buildStageSummary(PIPELINES[k], includeOpps))
    );

    const out = {};
    keys.forEach((k, i) => { out[k] = results[i]; });

    return res.status(200).json({ success: true, pipelines: out });
  } catch (e) {
    console.error('pipelines error:', e.message);
    return res.status(e.status || 500).json({ error: e.message });
  }
};
