// src/management/pipelines.js — Full Pipelines screen for management portal
import { renderPipelineBoard, renderStageDetail } from '../shared/pipelines-ui.js';

let _pipelineData = null;

export function renderPipelinesScreen() {
  return `
    <div class="s-hd">
      <h3>Pipelines</h3>
      <p>Live view of Guest and Bookings pipelines from your sub-account.</p>
    </div>

    <div style="display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap;align-items:center">
      <button class="fbtn active" id="pipe-tab-both"     onclick="switchPipeTab('both',this)">All Pipelines</button>
      <button class="fbtn"        id="pipe-tab-guests"   onclick="switchPipeTab('guests',this)">Guests Pipeline</button>
      <button class="fbtn"        id="pipe-tab-bookings" onclick="switchPipeTab('bookings',this)">Bookings Pipeline</button>
      <button class="btn btn-o btn-sm" style="margin-left:auto" onclick="refreshPipelines()">↺ Refresh</button>
    </div>

    <div id="pipe-loading" style="padding:40px;text-align:center;color:var(--muted)">Loading pipeline data…</div>
    <div id="pipe-error"   style="display:none;padding:16px;color:var(--danger);font-size:13px"></div>

    <!-- Guests pipeline -->
    <div id="pipe-guests-wrap" style="display:none;margin-bottom:24px">
      <div class="panel">
        <div class="panel-hd">
          <h3 id="pipe-guests-title">Guests Pipeline</h3>
          <span class="act" onclick="loadPipelineDetail('guests')">View details</span>
        </div>
        <div id="pipe-guests-board" style="padding:16px"></div>
      </div>
      <div class="panel" id="pipe-guests-detail-panel" style="display:none;margin-top:16px">
        <div class="panel-hd">
          <h3 id="pipe-guests-detail-title">Stage Detail</h3>
          <span class="act" onclick="document.getElementById('pipe-guests-detail-panel').style.display='none'">✕ Close</span>
        </div>
        <div id="pipe-guests-detail" style="padding:0"></div>
      </div>
    </div>

    <!-- Bookings pipeline -->
    <div id="pipe-bookings-wrap" style="display:none;margin-bottom:24px">
      <div class="panel">
        <div class="panel-hd">
          <h3 id="pipe-bookings-title">Bookings Pipeline</h3>
          <span class="act" onclick="loadPipelineDetail('bookings')">View details</span>
        </div>
        <div id="pipe-bookings-board" style="padding:16px"></div>
      </div>
      <div class="panel" id="pipe-bookings-detail-panel" style="display:none;margin-top:16px">
        <div class="panel-hd">
          <h3 id="pipe-bookings-detail-title">Stage Detail</h3>
          <span class="act" onclick="document.getElementById('pipe-bookings-detail-panel').style.display='none'">✕ Close</span>
        </div>
        <div id="pipe-bookings-detail" style="padding:0"></div>
      </div>
    </div>`;
}

export async function loadPipelines() {
  const loadEl  = document.getElementById('pipe-loading');
  const errEl   = document.getElementById('pipe-error');
  if (loadEl) loadEl.style.display = 'block';
  if (errEl)  errEl.style.display  = 'none';

  try {
    const res  = await fetch('/api/pipelines?detail=true');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load pipelines');

    _pipelineData = data.pipelines;
    if (loadEl) loadEl.style.display = 'none';
    renderAll();
  } catch (e) {
    if (loadEl) loadEl.style.display = 'none';
    if (errEl)  { errEl.textContent = e.message; errEl.style.display = 'block'; }
  }
}

function renderAll() {
  renderOne('guests');
  renderOne('bookings');
  document.getElementById('pipe-guests-wrap').style.display   = 'block';
  document.getElementById('pipe-bookings-wrap').style.display = 'block';
}

function renderOne(key) {
  const pipeline  = _pipelineData?.[key];
  const boardEl   = document.getElementById(`pipe-${key}-board`);
  const titleEl   = document.getElementById(`pipe-${key}-title`);
  if (!boardEl) return;
  if (titleEl && pipeline) titleEl.textContent = pipeline.pipelineName;

  boardEl.innerHTML = renderPipelineBoard(pipeline, {
    onStageClick: (sid, sname) => showStageDetail(key, sid, sname),
  });
}

function showStageDetail(key, stageId, stageName) {
  const pipeline  = _pipelineData?.[key];
  const detailEl  = document.getElementById(`pipe-${key}-detail`);
  const titleEl   = document.getElementById(`pipe-${key}-detail-title`);
  const panelEl   = document.getElementById(`pipe-${key}-detail-panel`);
  if (!detailEl || !pipeline) return;
  if (titleEl) titleEl.textContent = stageName;
  detailEl.innerHTML = renderStageDetail(pipeline, stageId);
  if (panelEl) panelEl.style.display = 'block';
  panelEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Full detail fetch for a specific pipeline (with opportunities)
window.loadPipelineDetail = async (key) => {
  const PIPELINE_IDS = { guests: 'R3ThtbOkmE9wwv7TGpqe', bookings: 'K2hrHkm85Olx7mgokPR9' };
  const pid = PIPELINE_IDS[key];
  if (!pid) return;
  try {
    const res  = await fetch(`/api/pipelines?pipelineId=${pid}&detail=true`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    if (_pipelineData) _pipelineData[key] = data.pipeline;
    renderOne(key);
  } catch (e) {
    alert(`Failed to load ${key} detail: ${e.message}`);
  }
};

window.switchPipeTab = (tab, btn) => {
  document.querySelectorAll('[id^="pipe-tab-"]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const gw = document.getElementById('pipe-guests-wrap');
  const bw = document.getElementById('pipe-bookings-wrap');
  if (gw) gw.style.display = (tab === 'bookings') ? 'none' : 'block';
  if (bw) bw.style.display = (tab === 'guests')   ? 'none' : 'block';
};

window.refreshPipelines = () => {
  _pipelineData = null;
  ['guests','bookings'].forEach(k => {
    const bd = document.getElementById(`pipe-${k}-board`);
    if (bd) bd.innerHTML = '<div style="color:var(--muted);padding:10px;font-size:13px">Refreshing…</div>';
    const dp = document.getElementById(`pipe-${k}-detail-panel`);
    if (dp) dp.style.display = 'none';
  });
  loadPipelines();
};
