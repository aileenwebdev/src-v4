// src/shared/pipelines-ui.js — Pipeline board renderer (used by both staff and management portals)

const STAGE_COLOURS = [
  '#1e40af','#1d4ed8','#2563eb','#3b82f6','#60a5fa',
  '#7c3aed','#8b5cf6','#a78bfa',
  '#047857','#059669','#10b981','#34d399',
  '#b45309','#d97706','#f59e0b',
  '#be123c','#e11d48','#f43f5e',
];

function stageColour(index) {
  return STAGE_COLOURS[index % STAGE_COLOURS.length];
}

// Render a two-panel pipeline summary (stages as horizontal funnel)
export function renderPipelineBoard(pipeline, opts = {}) {
  if (!pipeline) return '<div style="color:var(--muted);padding:16px;font-size:13px">Pipeline data unavailable.</div>';

  const { stages = [], pipelineName = '', total = 0 } = pipeline;
  const showDetail = opts.detail !== false;
  const onStageClick = opts.onStageClick || null; // fn(stageId, stageName)

  return `
    <div style="margin-bottom:6px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">${pipelineName}</span>
      <span class="badge bb">${total} total</span>
    </div>
    <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:4px">
      ${stages.map((s, i) => {
        const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
        const col = stageColour(i);
        return `
          <div onclick="${onStageClick ? `(${onStageClick.toString()})('${s.id}','${escJs(s.name)}')` : ''}"
               style="flex:1;min-width:90px;background:white;border:1.5px solid var(--border);border-radius:10px;
                      padding:12px 10px;text-align:center;cursor:${onStageClick ? 'pointer' : 'default'};
                      transition:box-shadow .15s,border-color .15s"
               onmouseover="this.style.borderColor='${col}';this.style.boxShadow='0 2px 10px rgba(0,0,0,.08)'"
               onmouseout="this.style.borderColor='var(--border)';this.style.boxShadow='none'">
            <div style="font-size:22px;font-weight:700;color:${col};line-height:1">${s.count}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:4px;line-height:1.3">${escHtml(s.name)}</div>
            ${showDetail ? `<div style="font-size:10px;color:${col};margin-top:3px;opacity:.75">${pct}%</div>` : ''}
          </div>`;
      }).join('')}
    </div>`;
}

// Render detail table for a single stage's opportunities
export function renderStageDetail(pipeline, stageId) {
  if (!pipeline?.stages) return '';
  const stage = pipeline.stages.find(s => s.id === stageId);
  if (!stage) return '';
  const opps = stage.opportunities || [];
  if (!opps.length) return '<div style="padding:16px;color:var(--muted);font-size:13px">No records in this stage.</div>';

  return `
    <div style="margin-bottom:10px;font-size:13px;font-weight:600;color:var(--navy)">${escHtml(stage.name)} — ${opps.length} record${opps.length !== 1 ? 's' : ''}</div>
    ${opps.map(o => `
      <div class="bk-row" style="cursor:default">
        <div class="bk-ico">👤</div>
        <div class="bk-inf">
          <div class="bk-t">${escHtml(o.contactName || o.name)}</div>
          <div class="bk-m">${escHtml(o.contactEmail)} ${o.updatedAt ? '· ' + formatDate(o.updatedAt) : ''}</div>
        </div>
        <div class="bk-r">
          <span class="badge ${statusBadge(o.status)}">${o.status || 'open'}</span>
        </div>
      </div>`).join('')}`;
}

function statusBadge(status) {
  if (!status) return 'bgr';
  const s = status.toLowerCase();
  if (s === 'won')    return 'bg';
  if (s === 'lost')   return 'br';
  if (s === 'open')   return 'bb';
  return 'bgr';
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('en-SG', { day:'numeric', month:'short' });
  } catch { return ''; }
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function escJs(str) {
  return String(str || '').replace(/'/g,"\\'").replace(/\n/g,' ');
}
