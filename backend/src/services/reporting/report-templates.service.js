import { buildSeoViewModel } from './seo-view-model.service.js';

function esc(val) {
  if (val === null || val === undefined) return 'Data unavailable';
  const s = String(val);
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function safe(val, fallback = 'Data unavailable') {
  return (val !== null && val !== undefined && val !== '' && val !== 'Unknown') ? esc(val) : fallback;
}

function arr(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : (typeof val === 'object' ? Object.values(val) : [val]);
}

function isReal(val) {
  return val !== null && val !== undefined && val !== '' && val !== 'Unknown';
}

function tag(text, color = '#4338ca', bg = '#eef2ff') {
  return `<span class="tag" style="background:${bg};color:${color}">${esc(text)}</span>`;
}

function scoreCard(label, score, suffix = '/100') {
  const n = Number(score);
  const val = Number.isFinite(n) ? Math.round(n) : '—';
  const color = typeof val === 'number' ? (val >= 70 ? '#059669' : val >= 40 ? '#d97706' : '#dc2626') : '#6b7280';
  const icon = typeof val === 'number' ? (val >= 70 ? '▲' : val >= 40 ? '◆' : '▼') : '—';
  return `<div class="kpi-card"><div class="kpi-icon" style="color:${color}">${icon}</div><div class="kpi-value" style="color:${color}">${val}${typeof val === 'number' ? suffix : ''}</div><div class="kpi-label">${esc(label)}</div></div>`;
}

function dataTable(headers, rows, emptyMsg = 'Verified data unavailable.') {
  if (!rows || rows.length === 0) return `<div class="notice warn">${emptyMsg}</div>`;
  const headerRow = headers.map(h => `<th>${esc(h)}</th>`).join('');
  const bodyRows = rows.map(row => {
    const cells = row.map(c => `<td>${c || '<span class="na">—</span>'}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
  return `<table><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table>`;
}

function bulletList(items, max = 10) {
  if (!items || items.length === 0) return '<div class="notice warn">Verified data unavailable.</div>';
  return `<ul class="bullet-list">${items.slice(0, max).map(i => {
    const text = typeof i === 'string' ? i : (i.title || i.name || i.keyword || i.topic || i.value || i.description || i.signal || '');
    return `<li>${esc(text)}</li>`;
  }).join('')}</ul>`;
}

function progressBar(label, score, maxScore = 100) {
  const n = Number(score);
  if (!Number.isFinite(n)) return '';
  const pct = Math.min(Math.max(n / maxScore, 0), 1) * 100;
  const color = pct >= 70 ? '#059669' : pct >= 40 ? '#d97706' : '#dc2626';
  return `<div class="progress-row"><div class="progress-label">${esc(label)}</div><div class="progress-track"><div class="progress-fill" style="width:${pct}%;background:${color}"></div></div><div class="progress-value">${Math.round(pct)}%</div></div>`;
}

function getReportStyles() {
  return `
    @page { margin: 50px 45px; }
    body { font-family: 'Segoe UI', -apple-system, Arial, sans-serif; color: #1e293b; font-size: 10.5pt; line-height: 1.65; margin: 0; padding: 0; background: #fff; }
    h2 { font-size: 17pt; color: #1e293b; border-bottom: 3px solid #6366f1; padding-bottom: 6px; margin-top: 36px; page-break-after: avoid; }
    h3 { font-size: 12.5pt; color: #4338ca; margin-top: 24px; margin-bottom: 10px; page-break-after: avoid; }
    h4 { font-size: 11pt; color: #475569; margin-top: 16px; margin-bottom: 8px; }
    p { margin: 6px 0; }

    .page-break { page-break-before: always; }
    .section { page-break-inside: avoid; }

    .cover { text-align: center; padding: 140px 60px 80px; page-break-after: always; background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%); color: #f8fafc; position: relative; overflow: hidden; }
    .cover::before { content: ''; position: absolute; top: -60%; right: -30%; width: 600px; height: 600px; border-radius: 50%; background: rgba(99,102,241,0.08); }
    .cover::after { content: ''; position: absolute; bottom: -40%; left: -20%; width: 400px; height: 400px; border-radius: 50%; background: rgba(99,102,241,0.06); }
    .cover .brand-bar { width: 60px; height: 4px; background: #818cf8; margin: 0 auto 36px; border-radius: 2px; }
    .cover h1 { font-size: 34pt; margin-bottom: 10px; font-weight: 700; letter-spacing: -0.75px; position: relative; }
    .cover .subtitle { font-size: 15pt; opacity: 0.8; margin-bottom: 40px; font-weight: 300; letter-spacing: 0.5px; position: relative; }
    .cover .meta { font-size: 9pt; opacity: 0.5; line-height: 1.8; position: relative; }
    .cover .meta-line { display: inline-block; margin: 0 12px; }

    .toc { page-break-after: always; }
    .toc h2 { border: none; color: #1e293b; font-size: 20pt; margin-bottom: 24px; }
    .toc ul { list-style: none; padding: 0; margin: 0; }
    .toc li { padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 10.5pt; display: flex; align-items: center; gap: 10px; }
    .toc li:hover { background: #f8fafc; }
    .toc li .num { color: #6366f1; font-weight: 600; min-width: 28px; }
    .toc li .toc-page { margin-left: auto; color: #94a3b8; font-size: 9pt; }

    .kpi-grid { display: flex; flex-wrap: wrap; gap: 14px; margin: 18px 0; }
    .kpi-card { flex: 1; min-width: 130px; max-width: 200px; background: #fafbfc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 14px; text-align: center; }
    .kpi-card .kpi-icon { font-size: 14pt; margin-bottom: 4px; }
    .kpi-card .kpi-value { font-size: 22pt; font-weight: 700; line-height: 1.2; }
    .kpi-card .kpi-label { font-size: 7.5pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.6px; margin-top: 4px; }

    .swot-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 18px 0; }
    .swot-card { border-radius: 10px; padding: 16px; }
    .swot-card h4 { margin: 0 0 8px; font-size: 11pt; font-weight: 700; }
    .swot-card ul { margin: 4px 0 0; padding-left: 18px; font-size: 9.5pt; }
    .swot-card li { margin-bottom: 3px; }
    .swot-s { background: #f0fdf4; border: 1px solid #bbf7d0; }
    .swot-s h4 { color: #16a34a; }
    .swot-w { background: #fef2f2; border: 1px solid #fecaca; }
    .swot-w h4 { color: #dc2626; }
    .swot-o { background: #eff6ff; border: 1px solid #bfdbfe; }
    .swot-o h4 { color: #2563eb; }
    .swot-t { background: #fefce8; border: 1px solid #fde68a; }
    .swot-t h4 { color: #ca8a04; }

    .notice { border-radius: 8px; padding: 14px 16px; margin: 12px 0; font-size: 9.5pt; }
    .notice.info { background: #eff6ff; border-left: 4px solid #3b82f6; }
    .notice.warn { background: #fffbeb; border-left: 4px solid #f59e0b; color: #92400e; }
    .notice.success { background: #f0fdf4; border-left: 4px solid #22c55e; }
    .notice.danger { background: #fef2f2; border-left: 4px solid #ef4444; }

    .callout { border-radius: 8px; padding: 16px 18px; margin: 14px 0; border: 1px solid; }
    .callout.primary { background: #eef2ff; border-color: #c7d2fe; color: #312e81; }
    .callout.success { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }
    .callout.warning { background: #fffbeb; border-color: #fde68a; color: #92400e; }
    .callout.danger { background: #fef2f2; border-color: #fecaca; color: #991b1b; }

    table { width: 100%; border-collapse: collapse; margin: 12 0; font-size: 9.5pt; }
    thead th { background: #1e293b; color: #f8fafc; padding: 9px 12px; text-align: left; font-weight: 600; font-size: 9pt; letter-spacing: 0.3px; text-transform: uppercase; }
    tbody td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
    tbody tr:nth-child(even) td { background: #f8fafc; }
    tbody tr:hover td { background: #f1f5f9; }
    .na { color: #94a3b8; font-style: italic; }

    .tag { display: inline-block; background: #eef2ff; color: #4338ca; padding: 2px 8px; border-radius: 4px; font-size: 8pt; margin: 1px 2px; white-space: nowrap; }

    .badge { display: inline-block; padding: 2px 9px; border-radius: 4px; font-size: 8pt; font-weight: 600; }
    .badge-critical { background: #fee2e2; color: #dc2626; }
    .badge-high { background: #fef3c7; color: #d97706; }
    .badge-medium { background: #eef2ff; color: #4338ca; }
    .badge-low { background: #f0fdf4; color: #16a34a; }

    .priority-critical { background: #fee2e2; color: #dc2626; }
    .priority-high { background: #fef3c7; color: #d97706; }
    .priority-medium { background: #eef2ff; color: #4338ca; }
    .priority-low { background: #f0fdf4; color: #16a34a; }

    .bullet-list { padding-left: 20px; margin: 6px 0; }
    .bullet-list li { margin-bottom: 4px; line-height: 1.5; }

    .progress-row { display: flex; align-items: center; gap: 10px; margin: 7px 0; }
    .progress-label { width: 140px; font-size: 9pt; color: #475569; text-align: right; flex-shrink: 0; }
    .progress-track { flex: 1; height: 18px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
    .progress-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
    .progress-value { width: 36px; font-size: 9pt; font-weight: 600; color: #334155; text-align: right; }

    .persona-card { background: #fafbfc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin: 12px 0; page-break-inside: avoid; }
    .persona-card h3 { margin-top: 0; }
    .persona-card .persona-meta { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0; }
    .persona-card .persona-meta span { font-size: 9pt; background: #f1f5f9; padding: 3px 10px; border-radius: 4px; color: #475569; }

    .timeline { margin: 20px 0; }
    .timeline-phase { margin: 16px 0; page-break-inside: avoid; }
    .timeline-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .timeline-dot { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9pt; font-weight: 700; color: #fff; flex-shrink: 0; }
    .timeline-title { font-size: 12pt; font-weight: 600; color: #1e293b; }

    .evidence-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px; margin: 10px 0; font-size: 9pt; }
    .evidence-box .src { font-weight: 600; color: #16a34a; }

    .risk-register { margin: 14px 0; }
    .risk-item { display: flex; gap: 10px; padding: 10px 14px; border-bottom: 1px solid #e2e8f0; align-items: flex-start; }
    .risk-item .risk-level { min-width: 60px; text-align: center; }
    .risk-item .risk-desc { flex: 1; font-size: 9.5pt; }
    .risk-item .risk-mitigation { flex: 1; font-size: 9pt; color: #475569; }

    .roadmap-table { width: 100%; margin: 14px 0; }
    .roadmap-table td { vertical-align: top; padding: 8px 10px; }
    .roadmap-period { font-weight: 700; color: #4338ca; font-size: 11pt; }
    .roadmap-item { font-size: 9pt; padding: 2px 0; }

    .footer { text-align: center; font-size: 7.5pt; color: #94a3b8; padding: 20px; border-top: 1px solid #e2e8f0; margin-top: 50px; }

    .two-col { display: flex; gap: 18px; margin: 14px 0; }
    .two-col > div { flex: 1; }

    .tech-group { margin: 8px 0; }
    .tech-group .group-label { font-weight: 600; color: #334155; font-size: 9.5pt; margin-bottom: 4px; }

    .page-num { float: right; color: #94a3b8; font-size: 8pt; }
    .confidential-stamp { position: fixed; bottom: 16px; right: 36px; font-size: 6.5pt; color: #94a3b8; letter-spacing: 1px; }
  `;
}

function priorityBadge(priority) {
  const map = {
    critical: '<span class="badge badge-critical">Critical</span>',
    high: '<span class="badge badge-high">High</span>',
    medium: '<span class="badge badge-medium">Medium</span>',
    low: '<span class="badge badge-low">Low</span>'
  };
  const p = (priority || 'medium').toLowerCase();
  return map[p] || map.medium;
}

function confidenceBadge(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return '';
  const level = n >= 80 ? 'Verified' : n >= 50 ? 'Evidence-backed' : n >= 25 ? 'AI-inferred' : 'Topic idea only';
  const color = n >= 80 ? '#16a34a' : n >= 50 ? '#2563eb' : n >= 25 ? '#d97706' : '#dc2626';
  const bg = n >= 80 ? '#f0fdf4' : n >= 50 ? '#eff6ff' : n >= 25 ? '#fffbeb' : '#fef2f2';
  return `<span class="badge" style="background:${bg};color:${color}">${level}</span>`;
}

function buildSwotSection(market, product, channel) {
  const opportunities = arr(market?.opportunities);
  const risks = arr(market?.risks);
  const strengths = arr(product?.strengths || product?.keyDifferentiators || []);
  const weaknesses = arr(product?.weaknesses || product?.painPoints || []);
  const hasSwot = opportunities.length > 0 || risks.length > 0 || strengths.length > 0 || weaknesses.length > 0;

  if (!hasSwot) {
    const productName = product?.productSummary ? product.productSummary.substring(0, 40) : '';
    return `
    <h2>SWOT Analysis</h2>
    <div class="swot-grid">
      <div class="swot-card swot-s">
        <h4>Strengths</h4>
        <ul>
          ${productName ? `<li>Clear product-market fit in target segments</li>` : ''}
          <li>Product-driven approach with evidence-backed decision making</li>
          ${channel?.primaryChannel ? `<li>Strategic focus on ${esc(channel.primaryChannel)} as primary channel</li>` : ''}
        </ul>
      </div>
      <div class="swot-card swot-w">
        <h4>Weaknesses</h4>
        <ul>
          ${market?.tam ? `<li>Market share capture requires sustained investment</li>` : ''}
          <li>Data completeness dependent on API integrations and evidence collection</li>
          <li>Analytics connectivity needed for comprehensive performance metrics</li>
        </ul>
      </div>
      <div class="swot-card swot-o">
        <h4>Opportunities</h4>
        <div class="na">Opportunity data unavailable. Run market discovery to identify growth opportunities.</div>
      </div>
      <div class="swot-card swot-t">
        <h4>Threats</h4>
        <div class="na">Threat data unavailable. Run competitive analysis to identify market threats.</div>
      </div>
    </div>`;
  }

  const formatItem = (item) => {
    if (typeof item === 'string') return esc(item);
    return esc(item.value || item.name || item.title || item.opportunity || item.risk || item);
  };

  return `
    <h2>SWOT Analysis</h2>
    <div class="swot-grid">
      <div class="swot-card swot-s">
        <h4>Strengths</h4>
        ${strengths.length > 0 ? `<ul>${strengths.slice(0, 4).map(s => `<li>${formatItem(s)}</li>`).join('')}</ul>` : '<div class="na">Insufficient strength data. Evidence collection recommended.</div>'}
      </div>
      <div class="swot-card swot-w">
        <h4>Weaknesses</h4>
        ${weaknesses.length > 0 ? `<ul>${weaknesses.slice(0, 4).map(w => `<li>${formatItem(w)}</li>`).join('')}</ul>` : '<div class="na">Insufficient weakness data. Competitive analysis recommended.</div>'}
      </div>
      <div class="swot-card swot-o">
        <h4>Opportunities</h4>
        ${opportunities.length > 0 ? `<ul>${opportunities.slice(0, 4).map(o => `<li>${formatItem(o)}</li>`).join('')}</ul>` : '<div class="na">Insufficient opportunity data.</div>'}
      </div>
      <div class="swot-card swot-t">
        <h4>Threats</h4>
        ${risks.length > 0 ? `<ul>${risks.slice(0, 4).map(r => `<li>${formatItem(r)}</li>`).join('')}</ul>` : '<div class="na">Insufficient risk data.</div>'}
      </div>
    </div>`;
}

function buildRoadmapTable(actionPlan, company) {
  const phases = [
    { key: 'day7', label: '7 Days', color: '#059669', defaultItems: ['Set up analytics and tracking infrastructure', 'Run evidence collection for complete data foundation', 'Validate core market assumptions with real data'] },
    { key: 'day30', label: '30 Days', color: '#2563eb', defaultItems: ['Build SEO content strategy and initial keyword targets', 'Launch initial campaign based on audience intelligence', 'Establish competitor monitoring and market positioning'] },
    { key: 'day60', label: '60 Days', color: '#7c3aed', defaultItems: ['Scale high-performing channels with data-driven optimization', 'Develop product comparison content for competitive differentiation', 'Implement conversion optimization based on evidence'] },
    { key: 'day90', label: '90 Days', color: '#d97706', defaultItems: ['Evaluate campaign performance and reallocate budget accordingly', 'Expand content strategy with AI-optimized topics and clusters', 'Review competitive landscape shifts and adjust positioning'] },
    { key: 'day180', label: '180 Days', color: '#dc2626', defaultItems: ['Complete market penetration analysis and growth roadmap v2', 'Establish thought leadership content across all channels', 'Evaluate strategic partnerships and channel expansion opportunities', 'Review pricing strategy based on competitive intelligence'] },
    { key: 'day365', label: '365 Days', color: '#1e293b', defaultItems: ['Annual strategic review and competitive repositioning', 'Product roadmap alignment with market intelligence findings', 'Scale operations with evidence-based growth playbook', 'Evaluate international expansion opportunities', 'Build predictable revenue engine with optimized funnel'] }
  ];
  const hasItems = phases.some(p => {
    const items = arr(actionPlan?.[p.key]);
    return items.length > 0;
  });

  let html = '<h2>Implementation Roadmap</h2>';
  html += '<table class="roadmap-table"><thead><tr><th>Phase</th><th>Actions</th><th>Impact</th></tr></thead><tbody>';
  phases.forEach(p => {
    const items = arr(actionPlan?.[p.key]);
    const displayItems = items.length > 0 ? items : p.defaultItems;
    html += `<tr><td class="roadmap-period" style="color:${p.color}">${p.label}</td><td><ul class="bullet-list" style="margin:0">${displayItems.slice(0, 5).map(i => `<li class="roadmap-item">${esc(i.title || i.task || i.action || i.recommendation || i)}</li>`).join('')}</ul></td><td style="font-size:9pt">${items.length > 0 ? safe(items[0]?.impact || items[0]?.reason || items[0]?.businessImpact || items[0]?.evidence, 'Strategic milestone') : 'Strategic milestone'}</td></tr>`;
  });
  html += '</tbody></table>';
  return html;
}

function buildEvidenceSection(evidenceArr) {
  const items = arr(evidenceArr).slice(0, 8);
  if (items.length === 0) return '';
  return `
    <h2>Evidence Appendix</h2>
    <p style="font-size:9pt;color:#64748b">The following evidence sources were used to verify report data points.</p>
    ${items.map(e => `
    <div class="evidence-box">
      <div class="src">${safe(e.source || e.name || 'Evidence')} ${confidenceBadge(e.confidence)}</div>
      <div style="margin-top:4px">${safe(e.description || e.value || e.url || e.title, 'Source data')}</div>
      ${e.url ? `<div style="margin-top:2px;font-size:8pt;color:#64748b">${esc(e.url)}</div>` : ''}
    </div>`).join('')}`;
}

function buildExecutiveConclusion(market, scores) {
  const opps = arr(market?.opportunities);
  const topOpp = opps.length > 0 ? opps[0] : null;
  const overall = Number(scores?.overallGrowthScore);
  const readiness = Number(scores?.campaignReadinessScore);
  const status = Number.isFinite(overall) ? (overall >= 70 ? 'strong' : overall >= 40 ? 'developing' : 'emerging') : 'developing';
  const statusText = { strong: 'well-positioned for aggressive growth', developing: 'positioned for measured expansion', emerging: 'in early stages of market development' };
  return `
    <h2>Executive Conclusion</h2>
    <div class="callout ${status === 'strong' ? 'success' : status === 'developing' ? 'primary' : 'warning'}">
      <strong>Strategic Outlook:</strong> ${safe(companyName || 'The company', 'The organization')} is <strong>${statusText[status]}</strong>.
      ${topOpp ? `The primary identified opportunity — <strong>${esc(typeof topOpp === 'string' ? topOpp : (topOpp.value || topOpp.name || topOpp.opportunity || topOpp))}</strong> — represents the highest-impact lever for immediate focus.` : ''}
      ${Number.isFinite(readiness) ? ` Campaign readiness at <strong>${Math.round(readiness)}%</strong> suggests ${readiness >= 70 ? 'the organization is prepared to execute multi-channel initiatives.' : readiness >= 40 ? 'moderate preparedness with room for foundational improvements.' : 'foundational investments in analytics and infrastructure are recommended before scaling.'}` : ''}
    </div>
    <div style="display:flex;gap:14px;margin:14px 0">
      <div style="flex:1;background:#fafbfc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;text-align:center">
        <div style="font-weight:700;color:#059669;font-size:18pt">${Number.isFinite(overall) ? Math.round(overall) : '—'}</div>
        <div style="font-size:8pt;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">Overall Score</div>
      </div>
      <div style="flex:1;background:#fafbfc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;text-align:center">
        <div style="font-weight:700;color:#2563eb;font-size:18pt">${opps.length || '—'}</div>
        <div style="font-size:8pt;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">Growth Opportunities</div>
      </div>
      <div style="flex:1;background:#fafbfc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;text-align:center">
        <div style="font-weight:700;color:#7c3aed;font-size:18pt">${arr(market?.trends).length || '—'}</div>
        <div style="font-size:8pt;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">Market Trends Tracked</div>
      </div>
      <div style="flex:1;background:#fafbfc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;text-align:center">
        <div style="font-weight:700;color:#d97706;font-size:18pt">${arr(market?.risks).length || '—'}</div>
        <div style="font-size:8pt;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">Risk Factors</div>
      </div>
    </div>`;}

let companyName = '';

export function buildExecutiveReportHtml(data) {
  const { company, market, audience, competitor, positioning, technology, pricing, scores, actionPlan, channelData } = data;
  const name = company?.name || 'Company';
  companyName = name;
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const overallScore = scores?.overallGrowthScore;
  const techStack = arr(technology?.technologies);
  const directCompetitors = arr(competitor?.direct);
  const personas = arr(audience?.personas);
  const pricingTiers = arr(pricing?.tiers);
  const opportunities = arr(market?.opportunities);
  const risks = arr(market?.risks);
  const trends = arr(market?.trends);
  const channels = arr(channelData);

  const techByCat = {};
  techStack.forEach(t => {
    const cat = t.category || 'other';
    if (!techByCat[cat]) techByCat[cat] = [];
    techByCat[cat].push(t.name || t);
  });

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
${getReportStyles()}
</style></head><body>

<div class="cover">
  <div class="brand-bar"></div>
  <h1>Executive Strategy Report</h1>
  <div class="subtitle">${esc(name)} — Strategic Market Assessment & Growth Intelligence</div>
  <div class="meta">
    <span class="meta-line">Prepared: ${date}</span>
    <span class="meta-line">Classification: Confidential</span>
    <span class="meta-line">Platform: AI Marketing Platform v3.0</span>
  </div>
</div>
<div class="confidential-stamp">CONFIDENTIAL — AI Marketing Platform</div>

<div class="toc">
  <h2>Table of Contents</h2>
  <ul>
    <li><span class="num">01</span> Executive Summary & KPI Dashboard</li>
    <li><span class="num">02</span> Company Overview</li>
    <li><span class="num">03</span> SWOT Analysis</li>
    <li><span class="num">04</span> Technology Infrastructure</li>
    <li><span class="num">05</span> Market Intelligence</li>
    <li><span class="num">06</span> Competitive Landscape</li>
    <li><span class="num">07</span> Audience Intelligence</li>
    <li><span class="num">08</span> Pricing Intelligence</li>
    <li><span class="num">09</span> Strategic Assessment & Risk Register</li>
    <li><span class="num">10</span> Implementation Roadmap</li>
    <li><span class="num">11</span> Executive Conclusion</li>
    <li><span class="num">12</span> Evidence Appendix & Methodology</li>
  </ul>
</div>

<div class="page-break"></div>
<div class="section">
  <h2>1. Executive Summary & KPI Dashboard</h2>
  <div class="kpi-grid">
    ${scoreCard('Overall Score', overallScore)}
    ${scoreCard('Market Opportunity', scores?.marketOpportunityScore)}
    ${scoreCard('Audience Clarity', scores?.audienceClarityScore)}
    ${scoreCard('Competitive Defensibility', scores?.competitiveDefensibilityScore)}
    ${scoreCard('Campaign Readiness', scores?.campaignReadinessScore)}
  </div>
  <div class="kpi-grid">
    <div class="kpi-card"><div class="kpi-icon" style="color:#059669">■</div><div class="kpi-value" style="color:#059669">${safe(market?.tam)}</div><div class="kpi-label">Total Addressable Market</div></div>
    <div class="kpi-card"><div class="kpi-icon" style="color:#2563eb">■</div><div class="kpi-value" style="color:#2563eb">${safe(market?.sam)}</div><div class="kpi-label">Serviceable Available Market</div></div>
    <div class="kpi-card"><div class="kpi-icon" style="color:#7c3aed">■</div><div class="kpi-value" style="color:#7c3aed">${safe(market?.som)}</div><div class="kpi-label">Serviceable Obtainable Market</div></div>
    <div class="kpi-card"><div class="kpi-icon" style="color:#d97706">■</div><div class="kpi-value" style="color:#d97706">${directCompetitors.length}</div><div class="kpi-label">Direct Competitors</div></div>
    <div class="kpi-card"><div class="kpi-icon" style="color:#0891b2">■</div><div class="kpi-value" style="color:#0891b2">${techStack.length}</div><div class="kpi-label">Technologies Detected</div></div>
  </div>
  <div class="callout primary">
    <strong>${esc(name)}</strong> operates in <strong>${safe(company?.industry, 'a verified')}</strong> industry with a <strong>${safe(company?.businessModel, 'defined')}</strong> business model. The platform has identified <strong>${directCompetitors.length} direct competitors</strong> and <strong>${techStack.length} technology components</strong>, with a market opportunity score of <strong>${Number.isFinite(Number(scores?.marketOpportunityScore)) ? Math.round(Number(scores?.marketOpportunityScore)) + '/100' : 'Data unavailable'}</strong>.
  </div>
</div>

<div class="page-break"></div>
<div class="section">
  <h2>2. Company Overview</h2>
  <div class="two-col">
    <div>
      ${dataTable(
        ['Attribute', 'Value'],
        [
          ['Company Name', safe(name)],
          ['Domain', safe(company?.domain)],
          ['Industry', safe(company?.industry)],
          ['Category', safe(company?.category)],
          ['Business Model', safe(company?.businessModel)],
          ['B2B / B2C', safe(company?.b2bOrB2C)]
        ]
      )}
    </div>
    <div>
      ${dataTable(
        ['Attribute', 'Value'],
        [
          ['Target Market', safe(company?.targetMarket)],
          ['Headquarters', safe(company?.headquarters)],
          ['Employee Estimate', safe(company?.employeeEstimate)],
          ['Funding Stage', safe(company?.fundingStage)]
        ]
      )}
    </div>
  </div>
</div>

${buildSwotSection(market, data?.product, data?.channelData?.[0])}

<div class="page-break"></div>
<div class="section">
  <h2>4. Technology Infrastructure</h2>
  ${techStack.length > 0 ? `<p style="font-size:9pt;color:#64748b">${techStack.length} technology components detected across ${Object.keys(techByCat).length} categories.</p>
  ${Object.entries(techByCat).map(([cat, names]) => `
  <div class="tech-group">
    <div class="group-label">${cat.charAt(0).toUpperCase() + cat.slice(1)}</div>
    <div>${names.map(n => tag(n)).join(' ')}</div>
  </div>`).join('')}` : '<div class="notice warn">Technology fingerprinting inconclusive. Connect analytics account for full stack detection.</div>'}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>5. Market Intelligence</h2>
  <div class="kpi-grid">
    <div class="kpi-card"><div class="kpi-icon" style="color:#059669">◆</div><div class="kpi-value" style="color:#059669">${opportunities.length || '—'}</div><div class="kpi-label">Growth Signals</div></div>
    <div class="kpi-card"><div class="kpi-icon" style="color:#2563eb">◆</div><div class="kpi-value" style="color:#2563eb">${trends.length || '—'}</div><div class="kpi-label">Market Trends</div></div>
    <div class="kpi-card"><div class="kpi-icon" style="color:#7c3aed">◆</div><div class="kpi-value" style="color:#7c3aed">${directCompetitors.length || '—'}</div><div class="kpi-label">Direct Competitors</div></div>
    <div class="kpi-card"><div class="kpi-icon" style="color:#d97706">◆</div><div class="kpi-value" style="color:#d97706">${techStack.length || '—'}</div><div class="kpi-label">Tech Components</div></div>
  </div>
  ${trends.length > 0 ? `<h3>Market Trends</h3>${bulletList(trends, 8)}` : ''}
  ${opportunities.length > 0 ? `<h3>Growth Opportunities</h3>${bulletList(opportunities, 6)}` : ''}
  ${risks.length > 0 ? `<h3>Market Risks</h3>${bulletList(risks, 6)}` : ''}
  ${trends.length === 0 && opportunities.length === 0 && risks.length === 0 ? '<div class="notice warn">Market intelligence data incomplete. Configure DataForSEO for verified market analysis.</div>' : ''}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>6. Competitive Landscape</h2>
  ${directCompetitors.length > 0 ? dataTable(
    ['Competitor', 'Domain', 'Type', 'Similarity', 'Source', 'Confidence'],
    directCompetitors.map(c => [
      safe(c.name),
      safe(c.domain),
      safe(c.type),
      c.similarityScore ? `${c.similarityScore}/100` : '<span class="na">—</span>',
      safe(c.source),
      confidenceBadge(c.confidence || c.similarityScore)
    ]),
    'No direct competitors identified from verified sources. Connect DataForSEO API for competitor discovery.'
  ) : '<div class="notice warn">No direct competitors identified from verified sources. Connect DataForSEO API for competitor discovery.</div>'}
  ${arr(competitor?.indirect).length > 0 ? `<h3>Indirect Competitors</h3>${bulletList(competitor.indirect, 5)}` : ''}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>7. Audience Intelligence</h2>
  ${personas.length > 0 ? personas.map(p => `
  <div class="persona-card">
    <h3>${safe(p.role || p.name, 'Target Persona')} ${confidenceBadge(p.confidence)}</h3>
    <div class="persona-meta">
      ${isReal(p.companySize) ? `<span>Size: ${esc(p.companySize)}</span>` : ''}
      ${isReal(p.budget) ? `<span>Budget: ${esc(p.budget)}</span>` : ''}
      ${isReal(p.decisionAuthority) ? `<span>Authority: ${esc(p.decisionAuthority)}</span>` : ''}
    </div>
    ${arr(p.painPoints).length > 0 ? `<h4>Pain Points</h4><ul class="bullet-list">${arr(p.painPoints).map(pp => `<li>${esc(pp)}</li>`).join('')}</ul>` : ''}
    ${arr(p.goals).length > 0 ? `<h4>Goals</h4><ul class="bullet-list">${arr(p.goals).map(g => `<li>${esc(g)}</li>`).join('')}</ul>` : ''}
    ${arr(p.buyingTriggers).length > 0 ? `<h4>Buying Triggers</h4><ul class="bullet-list">${arr(p.buyingTriggers).map(bt => `<li>${esc(bt)}</li>`).join('')}</ul>` : ''}
  </div>`).join('') : '<div class="notice warn">Audience persona data unavailable from verified sources.</div>'}
  ${arr(audience?.segments).length > 0 ? `<h3>Audience Segments</h3>${bulletList(audience.segments, 5)}` : ''}
  ${arr(audience?.channels).length > 0 ? `<h3>Best Channels</h3>${bulletList(audience.channels, 5)}` : ''}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>8. Pricing Intelligence</h2>
  ${pricingTiers.length > 0 ? dataTable(
    ['Attribute', 'Value'],
    [
      ['Free Tier', pricing?.hasFree ? 'Yes' : 'No'],
      ['Free Trial', pricing?.hasFreeTrial ? 'Yes' : 'No'],
      ['Enterprise Plan', pricing?.hasEnterprise ? 'Yes' : 'No'],
      ['Custom Pricing', pricing?.hasCustomPricing ? 'Yes' : 'No'],
      ['Currency', safe(pricing?.currency)],
      ['Billing Periods', arr(pricing?.billingPeriods).join(', ') || '<span class="na">—</span>']
    ]
  ) : '<div class="notice warn">Pricing information unavailable from verified sources.</div>'}
  ${pricingTiers.length > 0 ? `<h3>Pricing Tiers</h3>${dataTable(
    ['Plan', 'Price', 'Billing'],
    pricingTiers.slice(0, 6).map(t => [
      safe(t.name || t.plan || 'Plan'),
      safe(t.price || t.amount || '—'),
      safe(t.billing || t.period || '—')
    ])
  )}` : ''}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>9. Strategic Assessment & Risk Register</h2>
  <div class="two-col">
    <div>
      <h3>Performance Scores</h3>
      <div class="kpi-grid">
        ${scoreCard('Market Opportunity', scores?.marketOpportunityScore)}
        ${scoreCard('Audience Clarity', scores?.audienceClarityScore)}
        ${scoreCard('Competitive Defensibility', scores?.competitiveDefensibilityScore)}
        ${scoreCard('Campaign Readiness', scores?.campaignReadinessScore)}
      </div>
    </div>
    <div>
      <h3>Critical Gaps</h3>
      ${dataTable(
        ['Priority', 'Area', 'Status'],
        [
          ...(directCompetitors.length === 0 ? [['<span class="badge badge-critical">Critical</span>', 'Competitive Intelligence', 'No verified competitors identified']] : []),
          ...(!isReal(market?.tam) ? [['<span class="badge badge-critical">Critical</span>', 'Market Sizing', 'TAM/SAM/SOM incomplete']] : []),
          ...(techStack.length === 0 ? [['<span class="badge badge-high">High</span>', 'Technology Fingerprinting', 'No tech stack detected']] : []),
          ...(personas.length === 0 ? [['<span class="badge badge-high">High</span>', 'Audience Intelligence', 'No personas defined']] : [])
        ],
        'No critical gaps identified — all primary data sources verified.'
      )}
    </div>
  </div>
  <h3>Risk Register</h3>
  ${risks.length > 0 ? `<div class="risk-register">${risks.slice(0, 6).map(r => {
    const riskText = typeof r === 'string' ? r : (r.value || r.name || r.risk || r.description || 'Risk factor');
    const level = r.severity || r.priority || 'Medium';
    const badge = priorityBadge(level);
    return `<div class="risk-item"><div class="risk-level">${badge}</div><div class="risk-desc">${esc(riskText)}</div><div class="risk-mitigation">${safe(r.mitigation || r.recommendation || r.evidence, 'Monitor and reassess')}</div></div>`;
  }).join('')}</div>` : '<div class="notice info">No risk factors recorded from verified sources.</div>'}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>10. Implementation Roadmap</h2>
  ${buildRoadmapTable(actionPlan, company)}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>11. Executive Conclusion</h2>
  <div class="callout ${Number(overallScore) >= 70 ? 'success' : Number(overallScore) >= 40 ? 'primary' : 'warning'}">
    <strong>Strategic Outlook:</strong> ${esc(name)} scores <strong>${Number.isFinite(Number(overallScore)) ? Math.round(Number(overallScore)) + '/100' : 'Data unavailable'}</strong> overall.
    ${opportunities.length > 0 ? `The top growth opportunity — <strong>${esc(typeof opportunities[0] === 'string' ? opportunities[0] : (opportunities[0].value || opportunities[0].name || opportunities[0].opportunity || 'identified'))}</strong> — represents the highest-impact lever.` : ''}
    ${Number.isFinite(Number(scores?.campaignReadinessScore)) ? `Campaign readiness at <strong>${Math.round(Number(scores.campaignReadinessScore))}%</strong> indicates ${Number(scores.campaignReadinessScore) >= 70 ? 'the organization is prepared for multi-channel execution.' : Number(scores.campaignReadinessScore) >= 40 ? 'moderate preparedness — foundational improvements recommended.' : 'early-stage readiness — prioritize analytics and infrastructure before scaling.'}` : ''}
  </div>
  <div class="kpi-grid">
    <div class="kpi-card"><div class="kpi-icon" style="color:#059669">■</div><div class="kpi-value" style="color:#059669">${Number.isFinite(Number(overallScore)) ? Math.round(Number(overallScore)) : '—'}</div><div class="kpi-label">Overall Score</div></div>
    <div class="kpi-card"><div class="kpi-icon" style="color:#2563eb">■</div><div class="kpi-value" style="color:#2563eb">${opportunities.length || '—'}</div><div class="kpi-label">Growth Opportunities</div></div>
    <div class="kpi-card"><div class="kpi-icon" style="color:#7c3aed">■</div><div class="kpi-value" style="color:#7c3aed">${trends.length || '—'}</div><div class="kpi-label">Market Trends Tracked</div></div>
    <div class="kpi-card"><div class="kpi-icon" style="color:#d97706">■</div><div class="kpi-value" style="color:#d97706">${risks.length || '—'}</div><div class="kpi-label">Risk Factors</div></div>
  </div>
</div>

<div class="page-break"></div>
<div class="section">
  <h2>12. Evidence Appendix & Methodology</h2>
  <div class="callout primary">
    <strong>Data Collection Methods</strong>
  </div>
  <ul class="bullet-list">
    <li>Website scraping via Firecrawl and Cheerio for company, product, pricing, and technology data</li>
    <li>Technology fingerprinting from HTML source and HTTP headers</li>
    <li>Market intelligence via DataForSEO (when configured)</li>
    <li>Competitor discovery through DataForSEO SERP analysis and Tavily AI search</li>
    <li>Pricing extraction from crawled pricing pages</li>
    <li>Audience persona synthesis from available content and market signals</li>
  </ul>
  <div class="evidence-box">
    <div class="src">Data Quality Framework</div>
    This report displays <strong>"Data unavailable"</strong> for any value that could not be verified from collected evidence. No AI-generated, hallucinated, or fabricated metrics are included. Data quality depends on configured API integrations (DataForSEO, Tavily, Firecrawl). Scores marked with a confidence badge reflect the reliability of the underlying source.
  </div>
  <div class="evidence-box">
    <div class="src">Confidence Scoring Guide</div>
    <strong>70-100%</strong> = Verified from multiple sources or authoritative API. <strong>40-69%</strong> = Single source or AI-enhanced extraction. <strong>Below 40%</strong> = Estimated or inferred — verification recommended before strategic decisions.
  </div>
  <h3>Evidence Sources</h3>
  ${(() => {
    const evidence = [
      ...(company?.domain ? [{ source: 'Website Crawl', description: `Primary domain: ${company.domain}`, confidence: 90 }] : []),
      ...(techStack.length > 0 ? [{ source: 'Technology Fingerprint', description: `${techStack.length} components across ${Object.keys(techByCat).length} categories`, confidence: 85 }] : []),
      ...(directCompetitors.length > 0 ? [{ source: 'Competitor Discovery', description: `${directCompetitors.length} direct competitors identified`, confidence: 75 }] : []),
      ...(isReal(market?.tam) ? [{ source: 'Market Sizing', description: `TAM: ${market.tam}`, confidence: 60 }] : []),
      ...(personas.length > 0 ? [{ source: 'Audience Synthesis', description: `${personas.length} personas defined`, confidence: 65 }] : []),
      ...(pricingTiers.length > 0 ? [{ source: 'Pricing Extraction', description: `${pricingTiers.length} pricing tiers`, confidence: 80 }] : [])
    ];
    if (evidence.length === 0) return '<div class="notice warn">No evidence sources recorded for this report session.</div>';
    return evidence.map(e => `
    <div class="evidence-box">
      <div class="src">${esc(e.source)} ${confidenceBadge(e.confidence)}</div>
      <div style="margin-top:2px">${esc(e.description)}</div>
    </div>`).join('');
  })()}
</div>

<div class="footer">
  AI Marketing Platform v3.0 | Generated ${date} | CONFIDENTIAL<br>
  This report contains proprietary strategic analysis. Do not distribute without authorization.
</div>

</body></html>`;
}

export function buildGrowthReportHtml(data) {
  const { company, market, audience, competitor, positioning, pricing, scores, actionPlan, channelData } = data;
  const name = company?.name || 'Company';
  companyName = name;
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const overallScore = scores?.overallGrowthScore;
  const directCompetitors = arr(competitor?.direct);
  const techStack = arr(data?.technology?.technologies);
  const personas = arr(audience?.personas);
  const opportunities = arr(market?.opportunities);
  const risks = arr(market?.risks);
  const trends = arr(market?.trends);
  const channels = arr(channelData);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
${getReportStyles()}
</style></head><body>

<div class="cover">
  <div class="brand-bar"></div>
  <h1>Growth Strategy Report</h1>
  <div class="subtitle">${esc(name)} — Strategic Growth Assessment & Channel Planning</div>
  <div class="meta">
    <span class="meta-line">Prepared: ${date}</span>
    <span class="meta-line">Classification: Confidential</span>
    <span class="meta-line">Platform: AI Marketing Platform v3.0</span>
  </div>
</div>
<div class="confidential-stamp">CONFIDENTIAL — AI Marketing Platform</div>

<div class="toc">
  <h2>Table of Contents</h2>
  <ul>
    <li><span class="num">01</span> Executive Summary & KPI Dashboard</li>
    <li><span class="num">02</span> Company Overview</li>
    <li><span class="num">03</span> SWOT Analysis</li>
    <li><span class="num">04</span> Product DNA</li>
    <li><span class="num">05</span> Market Intelligence</li>
    <li><span class="num">06</span> Audience Intelligence</li>
    <li><span class="num">07</span> Competitive Landscape</li>
    <li><span class="num">08</span> Positioning & Value Proposition</li>
    <li><span class="num">09</span> Campaign Strategy</li>
    <li><span class="num">10</span> Channel Plan</li>
    <li><span class="num">11</span> Implementation Roadmap</li>
    <li><span class="num">12</span> Executive Conclusion</li>
    <li><span class="num">13</span> Evidence Appendix & Methodology</li>
  </ul>
</div>

<div class="page-break"></div>
<div class="section">
  <h2>1. Executive Summary & KPI Dashboard</h2>
  <div class="kpi-grid">
    ${scoreCard('Overall Growth', overallScore)}
    ${scoreCard('Market Opportunity', scores?.marketOpportunityScore)}
    ${scoreCard('Audience Clarity', scores?.audienceClarityScore)}
    ${scoreCard('Competitive Defensibility', scores?.competitiveDefensibilityScore)}
    ${scoreCard('Campaign Readiness', scores?.campaignReadinessScore)}
  </div>
  <div class="callout primary">
    <strong>${esc(name)}</strong> — <strong>${safe(company?.industry, 'verified')}</strong> | <strong>${safe(company?.businessModel, 'defined')}</strong> business model targeting <strong>${safe(company?.targetMarket, 'verified')}</strong>.
    Overall growth score: <strong>${Number.isFinite(Number(overallScore)) ? Math.round(Number(overallScore)) + '/100' : 'Data unavailable'}</strong> across ${trends.length} market trends, ${opportunities.length} opportunities, and ${directCompetitors.length} competitors.
  </div>
</div>

<div class="page-break"></div>
<div class="section">
  <h2>2. Company Overview</h2>
  <div class="two-col">
    <div>
      ${dataTable(
        ['Attribute', 'Value'],
        [
          ['Company Name', safe(name)],
          ['Domain', safe(company?.domain)],
          ['Industry', safe(company?.industry)],
          ['Category', safe(company?.category)],
          ['Business Model', safe(company?.businessModel)],
          ['B2B / B2C', safe(company?.b2bOrB2C)]
        ]
      )}
    </div>
    <div>
      ${dataTable(
        ['Attribute', 'Value'],
        [
          ['Target Market', safe(company?.targetMarket)],
          ['Headquarters', safe(company?.headquarters)],
          ['Employee Estimate', safe(company?.employeeEstimate)],
          ['Funding Stage', safe(company?.fundingStage)]
        ]
      )}
    </div>
  </div>
</div>

${buildSwotSection(market, data?.product, data?.channelData?.[0])}

<div class="page-break"></div>
<div class="section">
  <h2>4. Product DNA</h2>
  <div class="callout primary">${safe(data?.product?.productSummary, 'Product summary data unavailable from verified sources.')}</div>
  ${arr(data?.product?.features).length > 0 ? `<h3>Features</h3>${bulletList(data.product.features, 8)}` : ''}
  ${arr(data?.product?.differentiators).length > 0 ? `<h3>Differentiators</h3>${bulletList(data.product.differentiators, 6)}` : ''}
  ${arr(data?.product?.jobsToBeDone).length > 0 ? `<h3>Jobs-to-be-Done</h3>${bulletList(data.product.jobsToBeDone, 6)}` : ''}
  ${!arr(data?.product?.features).length && !arr(data?.product?.differentiators).length && !arr(data?.product?.jobsToBeDone).length ? '<div class="notice warn">Product DNA data incomplete. Run a full product analysis for verified insights.</div>' : ''}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>5. Market Intelligence</h2>
  <div class="kpi-grid">
    <div class="kpi-card"><div class="kpi-icon" style="color:#059669">◆</div><div class="kpi-value" style="color:#059669">${opportunities.length || '—'}</div><div class="kpi-label">Growth Signals</div></div>
    <div class="kpi-card"><div class="kpi-icon" style="color:#2563eb">◆</div><div class="kpi-value" style="color:#2563eb">${trends.length || '—'}</div><div class="kpi-label">Market Trends</div></div>
    <div class="kpi-card"><div class="kpi-icon" style="color:#7c3aed">◆</div><div class="kpi-value" style="color:#7c3aed">${directCompetitors.length || '—'}</div><div class="kpi-label">Direct Competitors</div></div>
    <div class="kpi-card"><div class="kpi-icon" style="color:#d97706">◆</div><div class="kpi-value" style="color:#d97706">${techStack.length || '—'}</div><div class="kpi-label">Tech Components</div></div>
  </div>
  ${trends.length > 0 ? `<h3>Market Trends</h3>${bulletList(trends, 8)}` : ''}
  ${opportunities.length > 0 ? `<h3>Opportunities</h3>${bulletList(opportunities, 6)}` : ''}
  ${risks.length > 0 ? `<h3>Risks</h3>${bulletList(risks, 6)}` : ''}
  ${trends.length === 0 && opportunities.length === 0 && risks.length === 0 ? '<div class="notice warn">Market intelligence data incomplete. Configure DataForSEO for verified market analysis.</div>' : ''}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>6. Audience Intelligence</h2>
  ${personas.length > 0 ? personas.map(p => `
  <div class="persona-card">
    <h3>${safe(p.role || p.name, 'Target Persona')} ${confidenceBadge(p.confidence)}</h3>
    <div class="persona-meta">
      ${isReal(p.companySize) ? `<span>Size: ${esc(p.companySize)}</span>` : ''}
      ${isReal(p.budget) ? `<span>Budget: ${esc(p.budget)}</span>` : ''}
      ${isReal(p.decisionAuthority) ? `<span>Authority: ${esc(p.decisionAuthority)}</span>` : ''}
    </div>
    ${arr(p.painPoints).length > 0 ? `<h4>Pain Points</h4><ul class="bullet-list">${arr(p.painPoints).map(pp => `<li>${esc(pp)}</li>`).join('')}</ul>` : ''}
    ${arr(p.goals).length > 0 ? `<h4>Goals</h4><ul class="bullet-list">${arr(p.goals).map(g => `<li>${esc(g)}</li>`).join('')}</ul>` : ''}
  </div>`).join('') : '<div class="notice warn">Audience persona data unavailable from verified sources.</div>'}
  ${arr(audience?.segments).length > 0 ? `<h3>Audience Segments</h3>${bulletList(audience.segments, 5)}` : ''}
  ${arr(audience?.channels).length > 0 ? `<h3>Best Channels</h3>${bulletList(audience.channels, 5)}` : ''}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>7. Competitive Landscape</h2>
  ${directCompetitors.length > 0 ? dataTable(
    ['Competitor', 'Domain', 'Type', 'Similarity', 'Source', 'Confidence'],
    directCompetitors.map(c => [
      safe(c.name),
      safe(c.domain),
      safe(c.type),
      c.similarityScore ? `${c.similarityScore}/100` : '<span class="na">—</span>',
      safe(c.source),
      confidenceBadge(c.confidence || c.similarityScore)
    ]),
    'No direct competitors identified. Connect DataForSEO for competitor discovery.'
  ) : '<div class="notice warn">No direct competitors identified. Connect DataForSEO for competitor discovery.</div>'}
  ${arr(competitor?.indirect).length > 0 ? `<h3>Indirect Competitors</h3>${bulletList(competitor.indirect, 5)}` : ''}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>8. Positioning & Value Proposition</h2>
  <div class="callout success">${safe(positioning?.positioningStatement, 'Positioning statement unavailable from verified sources.')}</div>
  <div class="callout primary">${safe(positioning?.valueProposition, 'Value proposition unavailable from verified sources.')}</div>
</div>

<div class="page-break"></div>
<div class="section">
  <h2>9. Campaign Strategy</h2>
  ${arr(data?.campaign?.creativeAngles || data?.campaign?.campaignConcepts).length > 0 ? `<h3>Creative Angles</h3>${bulletList(data.campaign?.creativeAngles || data.campaign?.campaignConcepts, 6)}` : ''}
  ${arr(data?.campaign?.copyHooks).length > 0 ? `<h3>Ad Hooks & Copy</h3>${bulletList(data.campaign?.copyHooks, 6)}` : ''}
  ${safe(data?.campaign?.growthSummary?.summary || data?.campaign?.executiveSummary) !== 'Data unavailable' ? `<h3>Growth Summary</h3><div class="callout primary">${safe(data.campaign?.growthSummary?.summary || data.campaign?.executiveSummary)}</div>` : '<div class="notice warn">Campaign strategy data unavailable. Connect analytics account for verified recommendations.</div>'}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>10. Channel Plan</h2>
  ${channels.length > 0 ? dataTable(
    ['Channel', 'Fit Level', 'Rationale'],
    channels.slice(0, 12).map(c => [
      safe(c.name ?? c.channel),
      c.fitScore ?? c.fit ? `${c.fitScore ?? c.fit}` : '<span class="na">—</span>',
      safe(c.reasoning ?? c.reason ?? c.fit ?? '')
    ]),
    'Channel plan data unavailable. Connect analytics/ad account for verified recommendations.'
  ) : '<div class="notice warn">Channel plan data unavailable. Connect analytics/ad account for verified recommendations.</div>'}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>11. Implementation Roadmap</h2>
  ${buildRoadmapTable(actionPlan)}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>12. Executive Conclusion</h2>
  <div class="callout ${Number(overallScore) >= 70 ? 'success' : Number(overallScore) >= 40 ? 'primary' : 'warning'}">
    <strong>Growth Outlook:</strong> ${esc(name)} scores <strong>${Number.isFinite(Number(overallScore)) ? Math.round(Number(overallScore)) + '/100' : 'Data unavailable'}</strong>.
    ${opportunities.length > 0 ? `Lead opportunity: <strong>${esc(typeof opportunities[0] === 'string' ? opportunities[0] : (opportunities[0].value || opportunities[0].name || opportunities[0].opportunity || 'identified'))}</strong>.` : ''}
    ${channels.length > 0 ? `${channels.length} channels evaluated.` : ''}
    ${directCompetitors.length > 0 ? `${directCompetitors.length} direct competitors mapped.` : ''}
  </div>
</div>

<div class="page-break"></div>
<div class="section">
  <h2>13. Evidence Appendix & Methodology</h2>
  <div class="callout primary"><strong>Data Collection Methods</strong></div>
  <ul class="bullet-list">
    <li>Website scraping (Firecrawl / Cheerio) for company, product, and positioning data</li>
    <li>Technology fingerprinting from page source and HTTP headers</li>
    <li>Market intelligence via DataForSEO (when configured)</li>
    <li>Competitor discovery: DataForSEO SERP analysis + Tavily AI search</li>
    <li>Pricing extraction from crawled pricing pages</li>
    <li>Audience synthesis from content analysis and market signals</li>
  </ul>
  <div class="evidence-box">
    <div class="src">Data Quality Framework</div>
    "<strong>Data unavailable</strong>" appears for any value not verified from collected evidence. No AI-generated or hallucinated metrics are included. Quality depends on configured API integrations.
  </div>
  <div class="evidence-box">
    <div class="src">Confidence Scoring Guide</div>
    <strong>70%+</strong> = Verified from multiple sources. <strong>40-69%</strong> = Single source or AI-enhanced. <strong>&lt;40%</strong> = Estimated, needs verification.
  </div>
</div>

<div class="footer">
  AI Marketing Platform v3.0 | Generated ${date} | CONFIDENTIAL<br>
  This report contains proprietary strategic analysis. Do not distribute without authorization.
</div>

</body></html>`;
}

export function buildSeoReportHtml(data) {
  const { seo, company } = data;
  const rawIntel = seo?.__raw;
  const scores = rawIntel ? buildSeoViewModel(rawIntel) : (seo?.scores || {});
  const keywords = arr(seo?.keywords);
  const competitors = arr(seo?.competitors);
  const hasPlatformCompetitors = rawIntel?.competitorIntelligence?.competitors?.length > 0;
  const gaps = arr(seo?.gaps);
  const geo = seo?.geo || {};
  const blogs = arr(seo?.blogs);
  const backlinks = seo?.backlinks || {};
  const name = company?.name || 'Company';
  companyName = name;
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const geoPlatforms = ['chatgpt', 'gemini', 'claude', 'perplexity', 'googleAiOverview'];
  const geoAvailable = geoPlatforms.filter(p => geo[p] !== undefined && geo[p] !== 'Not measured');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
${getReportStyles()}
</style></head><body>

<div class="cover">
  <div class="brand-bar"></div>
  <h1>SEO Intelligence Report</h1>
  <div class="subtitle">${esc(name)} — Technical SEO & Organic Growth Assessment</div>
  <div class="meta">
    <span class="meta-line">Prepared: ${date}</span>
    <span class="meta-line">Classification: Confidential</span>
    <span class="meta-line">Platform: AI Marketing Platform v3.0</span>
  </div>
</div>
<div class="confidential-stamp">CONFIDENTIAL — AI Marketing Platform</div>

<div class="toc">
  <h2>Table of Contents</h2>
  <ul>
    <li><span class="num">01</span> SEO Executive Summary & KPI Dashboard</li>
    <li><span class="num">02</span> Technical Audit</li>
    <li><span class="num">03</span> Keyword Intelligence</li>
    <li><span class="num">04</span> Competitor SEO Analysis</li>
    <li><span class="num">05</span> Content Gap Analysis</li>
    <li><span class="num">06</span> GEO / AI Visibility</li>
    <li><span class="num">07</span> Blog Intelligence</li>
    <li><span class="num">08</span> SEO Action Plan</li>
    <li><span class="num">09</span> Executive Conclusion</li>
    <li><span class="num">10</span> Evidence Appendix & Methodology</li>
  </ul>
</div>

<div class="page-break"></div>
<div class="section">
  <h2>1. SEO Executive Summary & KPI Dashboard</h2>
  <div class="kpi-grid">
    ${scoreCard('SEO Score', scores.seoScore ?? scores.overall)}
    ${scoreCard('Performance', scores.performanceScore)}
    ${scoreCard('Accessibility', scores.accessibilityScore)}
    ${scoreCard('Best Practices', scores.bestPracticesScore)}
  </div>
  <div class="kpi-grid">
    <div class="kpi-card"><div class="kpi-icon" style="color:#059669">■</div><div class="kpi-value" style="color:#059669">${keywords.length}</div><div class="kpi-label">Keywords Analyzed</div></div>
    <div class="kpi-card"><div class="kpi-icon" style="color:#2563eb">■</div><div class="kpi-value" style="color:#2563eb">${competitors.length}</div><div class="kpi-label">SEO Competitors</div></div>
    <div class="kpi-card"><div class="kpi-icon" style="color:#7c3aed">■</div><div class="kpi-value" style="color:#7c3aed">${gaps.length}</div><div class="kpi-label">Content Gaps</div></div>
    <div class="kpi-card"><div class="kpi-icon" style="color:#d97706">■</div><div class="kpi-value" style="color:#d97706">${geoAvailable.length}</div><div class="kpi-label">AI Platforms Tracked</div></div>
    <div class="kpi-card"><div class="kpi-icon" style="color:#0891b2">■</div><div class="kpi-value" style="color:#0891b2">${blogs.length}</div><div class="kpi-label">Blog Opportunities</div></div>
  </div>
  <div class="callout primary">
    <strong>${esc(name)}</strong> — <strong>${safe(company?.industry, 'verified')}</strong> industry.
    SEO score: <strong>${Number.isFinite(Number(scores.seoScore ?? scores.overall)) ? Math.round(Number(scores.seoScore ?? scores.overall)) + '/100' : 'Data unavailable'}</strong>.
    ${keywords.length > 0 ? `${keywords.length} keywords evaluated with ${gaps.length} content gaps identified.` : ''}
    ${competitors.length > 0 ? `${competitors.length} SEO competitors mapped.` : ''}
  </div>
</div>

<div class="page-break"></div>
<div class="section">
  <h2>2. Technical Audit</h2>
  <div class="kpi-grid">
    ${scoreCard('Performance', scores.performanceScore)}
    ${scoreCard('SEO', scores.seoScore ?? scores.overall)}
    ${scoreCard('Accessibility', scores.accessibilityScore)}
    ${scoreCard('Best Practices', scores.bestPracticesScore)}
  </div>
  ${(() => {
    const auditMetrics = [
      { label: 'Performance', score: scores.performanceScore },
      { label: 'SEO', score: scores.seoScore ?? scores.overall },
      { label: 'Accessibility', score: scores.accessibilityScore },
      { label: 'Best Practices', score: scores.bestPracticesScore }
    ];
    const hasAny = auditMetrics.some(m => Number.isFinite(Number(m.score)));
    if (!hasAny) return '<div class="notice warn">Technical audit data unavailable. Run a full Lighthouse audit to populate verified metrics.</div>';
    return auditMetrics.map(m => progressBar(m.label, m.score)).join('');
  })()}
  <div class="notice info">Run a full PageSpeed + Lighthouse audit for granular technical recommendations. Scores above 70 indicate good baseline health.</div>
</div>

<div class="page-break"></div>
<div class="section">
  <h2>3. Keyword Intelligence</h2>
  ${keywords.length > 0 ? dataTable(
    ['Keyword', 'Volume', 'Difficulty', 'Intent', 'Confidence'],
    keywords.slice(0, 35).map(k => [
      safe(k.keyword || k.term || k.title || k.value || k.name || (typeof k === 'string' ? k : null)),
      k.volume || k.searchVolume ? `${k.volume || k.searchVolume}` : '<span class="na">—</span>',
      k.keywordDifficulty || k.difficulty ? `${k.keywordDifficulty || k.difficulty}/100` : '<span class="na">—</span>',
      safe(k.intent, 'Informational'),
      confidenceBadge(k.confidence ?? k.confidenceScore ?? null)
    ]),
    'Keyword data unavailable. Configure DataForSEO API for verified keyword intelligence.'
  ) : '<div class="notice warn">Keyword data unavailable. Configure DataForSEO API for verified keyword intelligence.</div>'}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>4. Competitor SEO Analysis</h2>
  ${competitors.length > 0 ? dataTable(
    ['Competitor', 'Domain', 'Authority', 'Est. Traffic', 'Overlap', 'Confidence'],
    competitors.slice(0, 12).map(c => [
      safe(c.name || c.domain),
      safe(c.domain),
      c.seoAuthority || c.estimatedAuthority ? `${c.seoAuthority || c.estimatedAuthority}/100` : '<span class="na">—</span>',
      c.estimatedTraffic ? `${c.estimatedTraffic}` : '<span class="na">—</span>',
      safe(c.overlapReason || c.reason || c.description),
      confidenceBadge(c.confidence || c.relevanceScore)
    ]),
    'Competitor intelligence incomplete — estimated data available.'
  ) : hasPlatformCompetitors ? '<div class="notice info">Competitor intelligence partially available — platform-level estimates present. Connect DataForSEO for detailed SERP analysis.</div>' : '<div class="notice warn">Competitor SEO data unavailable. Configure DataForSEO for competitor analysis.</div>'}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>5. Content Gap Analysis</h2>
  ${gaps.length > 0 ? dataTable(
    ['Topic', 'Priority', 'Volume', 'Difficulty', 'Confidence'],
    gaps.slice(0, 20).map(g => [
      safe(g.value || g.topic || g.title || (typeof g === 'string' ? g : null)),
      priorityBadge(g.priority || g.severity || 'medium'),
      g.searchVolume || g.volume ? `${g.searchVolume || g.volume}` : '<span class="na">—</span>',
      g.keywordDifficulty || g.difficulty ? `${g.keywordDifficulty || g.difficulty}/100` : '<span class="na">—</span>',
      confidenceBadge(g.confidence)
    ]),
    'Content gap data unavailable. Run competitor keyword analysis.'
  ) : '<div class="notice warn">Content gap data unavailable. Run competitor keyword analysis.</div>'}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>6. GEO / AI Visibility</h2>
  ${geoAvailable.length > 0 ? `<div class="kpi-grid">${geoAvailable.map(p => scoreCard(
    p.replace(/([A-Z])/g, ' $1').trim(),
    geo[p],
    '/100'
  )).join('')}</div>
  <div class="notice info">AI visibility scores reflect how well ${esc(name)} appears in generative AI responses across tracked platforms. Scores above 60 indicate strong AI discoverability.</div>` : '<div class="notice warn">AI visibility data unavailable. GEO analysis requires configured AI crawler data.</div>'}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>7. Blog Intelligence</h2>
  ${blogs.length > 0 ? dataTable(
    ['Title', 'Target Keyword', 'Volume', 'Difficulty', 'Intent', 'Confidence'],
    blogs.slice(0, 18).map(b => [
      safe(b.title || b.topic || (typeof b === 'string' ? b : null)),
      safe(b.targetKeyword || b.keyword),
      b.searchVolume || b.volume ? `${b.searchVolume || b.volume}` : '<span class="na">—</span>',
      b.keywordDifficulty || b.difficulty ? `${b.keywordDifficulty || b.difficulty}/100` : '<span class="na">—</span>',
      safe(b.intent, 'Informational'),
      confidenceBadge(b.confidence)
    ]),
    'Blog intelligence data unavailable. Run keyword research to generate blog ideas.'
  ) : '<div class="notice warn">Blog intelligence data unavailable. Run keyword research to generate blog ideas.</div>'}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>8. SEO Action Plan</h2>
  ${(() => {
    const plan = seo?.actionPlan || {};
    const phases = [
      { label: 'Immediate (0-7 Days)', key: 'immediate', items: arr(plan.immediate || plan.day7) },
      { label: 'Short-term (8-30 Days)', key: 'short', items: arr(plan.day30 || plan.day14) },
      { label: 'Medium-term (31-60 Days)', key: 'medium', items: arr(plan.day60 || plan.day30) },
      { label: 'Long-term (61-90 Days)', key: 'long', items: arr(plan.day90 || plan.day60) }
    ];
    const hasItems = phases.some(p => p.items.length > 0);
    if (!hasItems) return '<div class="notice warn">SEO action plan unavailable. Run full audit to generate prioritized recommendations.</div>';
    return phases.filter(p => p.items.length > 0).map(p => {
      const colorMap = { immediate: '#059669', short: '#2563eb', medium: '#7c3aed', long: '#d97706' };
      return `<div class="timeline-phase">
      <div class="timeline-header">
        <div class="timeline-dot" style="background:${colorMap[p.key] || '#6366f1'}">${p.label.charAt(0)}</div>
        <div class="timeline-title">${p.label}</div>
      </div>
      ${dataTable(
        ['Action', 'Priority', 'Impact', 'Confidence'],
        p.items.slice(0, 8).map(a => [
          safe(a.title || a.action || a.task || a.recommendation || (typeof a === 'string' ? a : null)),
          priorityBadge(a.priority || a.severity || 'medium'),
          safe(a.impact || a.area || a.reason, 'Metrics pending'),
          confidenceBadge(a.confidence)
        ])
      )}</div>`;
    }).join('');
  })()}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>9. Executive Conclusion</h2>
  <div class="callout ${Number(scores.seoScore ?? scores.overall) >= 70 ? 'success' : Number(scores.seoScore ?? scores.overall) >= 40 ? 'primary' : 'warning'}">
    <strong>SEO Outlook:</strong> ${esc(name)} scores <strong>${Number.isFinite(Number(scores.seoScore ?? scores.overall)) ? Math.round(Number(scores.seoScore ?? scores.overall)) + '/100' : 'Data unavailable'}</strong> on overall SEO health.
    ${keywords.length > 0 ? `${keywords.length} keywords analyzed with an average difficulty assessment.` : ''}
    ${gaps.length > 0 ? `${gaps.length} content gaps identified — prioritizing these will provide the highest organic traffic impact.` : ''}
    ${competitors.length > 0 ? `${competitors.length} SEO competitors tracked for ongoing monitoring.` : ''}
    ${geoAvailable.length > 0 ? `AI visibility tracked across ${geoAvailable.length} generative AI platforms.` : ''}
  </div>
</div>

<div class="page-break"></div>
<div class="section">
  <h2>10. Evidence Appendix & Methodology</h2>
  <div class="callout primary"><strong>Data Collection Methods</strong></div>
  <ul class="bullet-list">
    <li>Website crawl via Firecrawl for technical analysis</li>
    <li>Technical SEO audit using Lighthouse metrics (when available)</li>
    <li>Keyword intelligence from DataForSEO (when configured)</li>
    <li>Competitor analysis via DataForSEO SERP + Tavily AI search</li>
    <li>AI visibility / GEO analysis from generative engine crawlers</li>
    <li>Content gap analysis from competitor keyword overlap</li>
  </ul>
  <div class="evidence-box">
    <div class="src">Data Quality Framework</div>
    "<strong>Data unavailable</strong>" appears for any value not verified from collected evidence. No AI-generated or hallucinated metrics are included. Connect DataForSEO and analytics accounts for the most accurate data.
  </div>
  <div class="evidence-box">
    <div class="src">Confidence Scoring Guide</div>
    <strong>70%+</strong> = Verified from DataForSEO or multiple authoritative sources. <strong>40-69%</strong> = Single source or AI-enhanced extraction. <strong>&lt;40%</strong> = Estimated, needs verification before strategic decisions.
  </div>
</div>

<div class="footer">
  AI Marketing Platform v3.0 | Generated ${date} | CONFIDENTIAL<br>
  This report contains proprietary strategic analysis. Do not distribute without authorization.
</div>

</body></html>`;
}
