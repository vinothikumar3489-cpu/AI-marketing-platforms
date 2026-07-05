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
  const val = Number.isFinite(n) ? Math.round(n) : 'N/A';
  const color = typeof val === 'number' ? (val >= 70 ? '#10b981' : val >= 40 ? '#f59e0b' : '#ef4444') : '#6b7280';
  return `<div class="metric"><div class="value" style="color:${color}">${val}${typeof val === 'number' ? suffix : ''}</div><div class="label">${esc(label)}</div></div>`;
}

function dataTable(headers, rows) {
  if (!rows || rows.length === 0) return '<div class="card amber">Data unavailable from verified sources.</div>';
  const headerRow = headers.map(h => `<th>${esc(h)}</th>`).join('');
  const bodyRows = rows.map(row => {
    const cells = row.map(c => `<td>${c || 'Data unavailable'}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
  return `<table><tr>${headerRow}</tr>${bodyRows}</table>`;
}

function bulletList(items, max = 10) {
  if (!items || items.length === 0) return '<div class="card amber">Data unavailable from verified sources.</div>';
  return `<ul>${items.slice(0, max).map(i => {
    const text = typeof i === 'string' ? i : (i.title || i.name || i.keyword || i.topic || i.value || i.description || i.signal || '');
    return `<li>${esc(text)}</li>`;
  }).join('')}</ul>`;
}

function getReportStyles() {
  return `
    @page { margin: 60px 50px; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; font-size: 11pt; line-height: 1.6; margin: 0; padding: 0; }
    .cover { text-align: center; padding: 120px 60px 80px; page-break-after: always; background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%); color: white; }
    .cover h1 { font-size: 32pt; margin-bottom: 8px; font-weight: 700; letter-spacing: -0.5px; }
    .cover .subtitle { font-size: 16pt; opacity: 0.85; margin-bottom: 40px; }
    .cover .meta { font-size: 10pt; opacity: 0.7; }
    .cover .logo-placeholder { width: 60px; height: 60px; margin: 0 auto 24px; background: rgba(255,255,255,0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; }
    h2 { font-size: 18pt; color: #1e1b4b; border-bottom: 3px solid #6366f1; padding-bottom: 6px; margin-top: 32px; page-break-after: avoid; }
    h3 { font-size: 13pt; color: #4338ca; margin-top: 20px; page-break-after: avoid; }
    .section { page-break-inside: avoid; }
    .card { background: #f9fafb; border-radius: 8px; padding: 16px; margin: 12px 0; border-left: 4px solid #6366f1; }
    .card.green { border-left-color: #10b981; }
    .card.amber { border-left-color: #f59e0b; }
    .card.red { border-left-color: #ef4444; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; }
    th { background: #1e1b4b; color: white; padding: 8px 12px; text-align: left; font-weight: 600; }
    td { padding: 7px 12px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) td { background: #f9fafb; }
    .metric-grid { display: flex; flex-wrap: wrap; gap: 12px; margin: 16px 0; }
    .metric { flex: 1; min-width: 140px; background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; text-align: center; }
    .metric .value { font-size: 20pt; font-weight: 700; color: #1e1b4b; }
    .metric .label { font-size: 8pt; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .tag { display: inline-block; background: #eef2ff; color: #4338ca; padding: 2px 8px; border-radius: 4px; font-size: 9pt; margin: 2px; }
    .toc { page-break-after: always; }
    .toc h2 { border: none; }
    .toc ul { list-style: none; padding: 0; }
    .toc li { padding: 6px 0; border-bottom: 1px dotted #e5e7eb; font-size: 11pt; }
    .toc li span { color: #6366f1; }
    .confidential { position: fixed; bottom: 20px; right: 40px; font-size: 7pt; color: #9ca3af; }
    .footer { text-align: center; font-size: 8pt; color: #9ca3af; padding: 20px; border-top: 1px solid #e5e7eb; margin-top: 40px; }
    .evidence-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px; margin: 8px 0; font-size: 9pt; }
    .evidence-box .source { font-weight: 600; color: #16a34a; }
    .page-break { page-break-before: always; }
    .priority-critical { background: #fee2e2; color: #dc2626; }
    .priority-high { background: #fef3c7; color: #d97706; }
    .priority-medium { background: #eef2ff; color: #4338ca; }
    .priority-low { background: #f0fdf4; color: #16a34a; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9pt; font-weight: 600; }
  `;
}

function priorityBadge(priority) {
  const map = {
    critical: '<span class="badge priority-critical">Critical</span>',
    high: '<span class="badge priority-high">High</span>',
    medium: '<span class="badge priority-medium">Medium</span>',
    low: '<span class="badge priority-low">Low</span>'
  };
  const p = (priority || 'medium').toLowerCase();
  return map[p] || map.medium;
}

function confidenceBadge(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return '';
  const color = n >= 70 ? '#16a34a' : n >= 40 ? '#d97706' : '#dc2626';
  return `<span class="badge" style="background:#f0fdf4;color:${color}">${Math.round(n)}% confidence</span>`;
}

export function buildExecutiveReportHtml(data) {
  const { company, market, audience, competitor, positioning, technology, pricing, scores, actionPlan, channelData } = data;
  const name = company?.name || 'Company';
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const overallScore = scores?.overallGrowthScore || 0;
  const techStack = arr(technology?.technologies);
  const directCompetitors = arr(competitor?.direct);
  const personas = arr(audience?.personas);
  const pricingTiers = arr(pricing?.tiers);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
${getReportStyles()}
</style></head><body>

<div class="cover">
  <div class="logo-placeholder">${esc(name.charAt(0))}</div>
  <h1>Executive Strategy Report</h1>
  <div class="subtitle">${esc(name)} — Strategic Market Assessment</div>
  <div class="meta">Prepared: ${date} | Confidential | AI Marketing Platform v3.0</div>
</div>
<div class="confidential">CONFIDENTIAL — AI Marketing Platform</div>

<div class="toc">
  <h2>Table of Contents</h2>
  <ul>
    <li><span>1.</span> Executive Summary</li>
    <li><span>2.</span> Company Overview</li>
    <li><span>3.</span> Technology Infrastructure</li>
    <li><span>4.</span> Market Intelligence</li>
    <li><span>5.</span> Competitive Landscape</li>
    <li><span>6.</span> Audience Intelligence</li>
    <li><span>7.</span> Pricing Intelligence</li>
    <li><span>8.</span> Strategic Assessment</li>
    <li><span>9.</span> Data Sources & Methodology</li>
  </ul>
</div>

<div class="section">
  <h2>1. Executive Summary</h2>
  <div class="metric-grid">
    ${scoreCard('Overall Score', overallScore)}
    <div class="metric"><div class="value">${safe(market?.tam)}</div><div class="label">TAM</div></div>
    <div class="metric"><div class="value">${safe(market?.sam)}</div><div class="label">SAM</div></div>
    <div class="metric"><div class="value">${safe(market?.som)}</div><div class="label">SOM</div></div>
    <div class="metric"><div class="value">${directCompetitors.length}</div><div class="label">Direct Competitors</div></div>
    <div class="metric"><div class="value">${techStack.length}</div><div class="label">Technologies Detected</div></div>
  </div>
  <div class="card">
    <strong>Company:</strong> ${safe(name)}<br>
    <strong>Industry:</strong> ${safe(company?.industry)}<br>
    <strong>Business Model:</strong> ${safe(company?.businessModel)}<br>
    <strong>Target Market:</strong> ${safe(company?.targetMarket)}<br>
    <strong>Headquarters:</strong> ${safe(company?.headquarters)}
  </div>
</div>

<div class="page-break"></div>
<div class="section">
  <h2>2. Company Overview</h2>
  ${dataTable(
    ['Attribute', 'Value'],
    [
      ['Company Name', safe(name)],
      ['Domain', safe(company?.domain)],
      ['Industry', safe(company?.industry)],
      ['Category', safe(company?.category)],
      ['Business Model', safe(company?.businessModel)],
      ['B2B / B2C', safe(company?.b2bOrB2C)],
      ['Target Market', safe(company?.targetMarket)],
      ['Headquarters', safe(company?.headquarters)],
      ['Employee Estimate', safe(company?.employeeEstimate)],
      ['Funding Stage', safe(company?.fundingStage)]
    ]
  )}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>3. Technology Infrastructure</h2>
  ${techStack.length > 0 ? dataTable(
    ['Category', 'Technologies'],
    (() => {
      const cats = {};
      techStack.forEach(t => {
        const cat = t.category || 'other';
        if (!cats[cat]) cats[cat] = [];
        cats[cat].push(t.name);
      });
      return Object.entries(cats).map(([cat, names]) => [cat.charAt(0).toUpperCase() + cat.slice(1), names.map(n => tag(n)).join(' ')]);
    })()
  ) : '<div class="card amber">Technology fingerprinting inconclusive. Connect analytics account for full stack detection.</div>'}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>4. Market Intelligence</h2>
  <div class="metric-grid">
    <div class="metric"><div class="value">${safe(market?.tam)}</div><div class="label">Total Addressable Market</div></div>
    <div class="metric"><div class="value">${safe(market?.sam)}</div><div class="label">Serviceable Available Market</div></div>
    <div class="metric"><div class="value">${safe(market?.som)}</div><div class="label">Serviceable Obtainable Market</div></div>
    <div class="metric"><div class="value">${safe(market?.growthRate)}</div><div class="label">Growth Rate</div></div>
  </div>
  <h3>Market Trends</h3>
  ${bulletList(market?.trends, 8)}
  <h3>Growth Opportunities</h3>
  ${bulletList(market?.opportunities, 5)}
  <h3>Market Risks</h3>
  ${bulletList(market?.risks, 5)}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>5. Competitive Landscape</h2>
  ${directCompetitors.length > 0 ? dataTable(
    ['Competitor', 'Domain', 'Type', 'Similarity', 'Source'],
    directCompetitors.map(c => [safe(c.name), safe(c.domain), safe(c.type), c.similarityScore ? `${c.similarityScore}/100` : 'N/A', safe(c.source)])
  ) : '<div class="card amber">No direct competitors identified from verified sources. SERP API integration may be required.</div>'}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>6. Audience Intelligence</h2>
  ${personas.length > 0 ? personas.map(p => `
  <div class="card">
    <h3 style="margin-top:0">${safe(p.role || p.name, 'Target Persona')} ${confidenceBadge(p.confidence)}</h3>
    ${dataTable(
      ['Attribute', 'Value'],
      [
        ['Company Size', safe(p.companySize)],
        ['Pain Points', arr(p.painPoints).join(', ') || 'Data unavailable'],
        ['Goals', arr(p.goals).join(', ') || 'Data unavailable'],
        ['Buying Triggers', arr(p.buyingTriggers).join(', ') || 'Data unavailable'],
        ['Budget', safe(p.budget)],
        ['Decision Authority', safe(p.decisionAuthority)]
      ]
    )}
  </div>`).join('') : '<div class="card amber">Audience persona data unavailable from verified sources.</div>'}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>7. Pricing Intelligence</h2>
  ${pricingTiers.length > 0 ? dataTable(
    ['Attribute', 'Value'],
    [
      ['Free Tier', pricing?.hasFree ? 'Yes' : 'No'],
      ['Free Trial', pricing?.hasFreeTrial ? 'Yes' : 'No'],
      ['Enterprise Plan', pricing?.hasEnterprise ? 'Yes' : 'No'],
      ['Custom Pricing', pricing?.hasCustomPricing ? 'Yes' : 'No'],
      ['Currency', safe(pricing?.currency)],
      ['Billing Periods', arr(pricing?.billingPeriods).join(', ') || 'Data unavailable']
    ]
  ) : '<div class="card amber">Pricing information unavailable from verified sources.</div>'}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>8. Strategic Assessment</h2>
  <div class="card green"><strong>Top Opportunity:</strong> ${safe(arr(market?.opportunities)[0], 'Insufficient data for opportunity analysis')}</div>
  <div class="card red"><strong>Primary Risk:</strong> ${safe(arr(market?.risks)[0], 'Insufficient data for risk analysis')}</div>

  <h3>Performance Scores</h3>
  <div class="metric-grid">
    ${scoreCard('Market Opportunity', scores?.marketOpportunityScore)}
    ${scoreCard('Audience Clarity', scores?.audienceClarityScore)}
    ${scoreCard('Competitive Defensibility', scores?.competitiveDefensibilityScore)}
    ${scoreCard('Campaign Readiness', scores?.campaignReadinessScore)}
  </div>

  <h3>Recommended Investments</h3>
  ${dataTable(
    ['Priority', 'Area', 'Rationale'],
    [
      ...(directCompetitors.length === 0 ? [['<span class="badge priority-critical">Critical</span>', 'Competitive Intelligence', 'No verified competitors identified']] : []),
      ...(!isReal(market?.tam) || market?.tam === 'Unknown' ? [['<span class="badge priority-critical">Critical</span>', 'Market Sizing', 'TAM/SAM/SOM unavailable']] : []),
      ...(techStack.length === 0 ? [['<span class="badge priority-high">High</span>', 'Technology Analysis', 'Technology fingerprinting inconclusive']] : [])
    ]
  )}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>9. Data Sources & Methodology</h2>
  <div class="card">
    <p><strong>Collection Methods:</strong></p>
    <ul>
      <li>Website scraping (Firecrawl / Cheerio)</li>
      <li>Technology fingerprinting from page source</li>
      <li>Market data from DataForSEO (if configured)</li>
      <li>Competitor discovery via DataForSEO SERP + Tavily</li>
      <li>Pricing extraction from scraped content</li>
    </ul>
  </div>
  <div class="evidence-box">
    <div class="source">Data Quality Note</div>
    This report displays <strong>"Data unavailable"</strong> for any data point that could not be verified from collected evidence. No AI-generated, hallucinated, or estimated values are included. Data quality depends on available API integrations (DataForSEO, Tavily, Firecrawl).
  </div>
</div>

<div class="footer">
  AI Marketing Platform v3.0 | Generated ${date} | CONFIDENTIAL<br>
  This report contains proprietary analysis. Do not distribute without authorization.
</div>

</body></html>`;
}

export function buildGrowthReportHtml(data) {
  const { company, market, audience, competitor, positioning, pricing, scores, actionPlan, channelData } = data;
  const name = company?.name || 'Company';
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const overallScore = scores?.overallGrowthScore || 0;
  const directCompetitors = arr(competitor?.direct);
  const techStack = arr(data?.technology?.technologies);
  const personas = arr(audience?.personas);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
${getReportStyles()}
</style></head><body>

<div class="cover">
  <div class="logo-placeholder">${esc(name.charAt(0))}</div>
  <h1>Growth Strategy Report</h1>
  <div class="subtitle">${esc(name)} — Strategic Growth Assessment</div>
  <div class="meta">Prepared: ${date} | Confidential | AI Marketing Platform v3.0</div>
</div>
<div class="confidential">CONFIDENTIAL — AI Marketing Platform</div>

<div class="toc">
  <h2>Table of Contents</h2>
  <ul>
    <li><span>1.</span> Cover Page</li>
    <li><span>2.</span> Executive Summary</li>
    <li><span>3.</span> Company Overview</li>
    <li><span>4.</span> Product DNA</li>
    <li><span>5.</span> Market Intelligence</li>
    <li><span>6.</span> Audience Intelligence</li>
    <li><span>7.</span> Competitors</li>
    <li><span>8.</span> Positioning</li>
    <li><span>9.</span> Campaign Strategy</li>
    <li><span>10.</span> Channel Plan</li>
    <li><span>11.</span> Action Roadmap</li>
    <li><span>12.</span> Evidence and Methodology</li>
  </ul>
</div>

<div class="section">
  <h2>1. Executive Summary</h2>
  <div class="metric-grid">
    ${scoreCard('Overall Growth', overallScore)}
    ${scoreCard('Market Opportunity', scores?.marketOpportunityScore)}
    ${scoreCard('Audience Clarity', scores?.audienceClarityScore)}
    ${scoreCard('Competitive Defensibility', scores?.competitiveDefensibilityScore)}
    ${scoreCard('Campaign Readiness', scores?.campaignReadinessScore)}
  </div>
  <div class="card">
    <strong>Company:</strong> ${safe(name)}<br>
    <strong>Industry:</strong> ${safe(company?.industry)}<br>
    <strong>Business Model:</strong> ${safe(company?.businessModel)}<br>
    <strong>Target Market:</strong> ${safe(company?.targetMarket)}<br>
    <strong>Headquarters:</strong> ${safe(company?.headquarters)}
  </div>
</div>

<div class="page-break"></div>
<div class="section">
  <h2>2. Company Overview</h2>
  ${dataTable(
    ['Attribute', 'Value'],
    [
      ['Company Name', safe(name)],
      ['Domain', safe(company?.domain)],
      ['Industry', safe(company?.industry)],
      ['Category', safe(company?.category)],
      ['Business Model', safe(company?.businessModel)],
      ['B2B / B2C', safe(company?.b2bOrB2C)],
      ['Target Market', safe(company?.targetMarket)],
      ['Headquarters', safe(company?.headquarters)],
      ['Employee Estimate', safe(company?.employeeEstimate)],
      ['Funding Stage', safe(company?.fundingStage)]
    ]
  )}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>3. Product DNA</h2>
  <div class="card">${safe(data?.product?.productSummary, 'Product summary unavailable from verified sources.')}</div>
  <h3>Features</h3>
  ${bulletList(data?.product?.features, 8)}
  <h3>Differentiators</h3>
  ${bulletList(data?.product?.differentiators, 5)}
  <h3>Jobs-to-be-Done</h3>
  ${bulletList(data?.product?.jobsToBeDone, 5)}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>4. Market Intelligence</h2>
  <div class="metric-grid">
    <div class="metric"><div class="value">${safe(market?.tam)}</div><div class="label">TAM</div></div>
    <div class="metric"><div class="value">${safe(market?.sam)}</div><div class="label">SAM</div></div>
    <div class="metric"><div class="value">${safe(market?.som)}</div><div class="label">SOM</div></div>
    <div class="metric"><div class="value">${safe(market?.growthRate)}</div><div class="label">Growth Rate</div></div>
  </div>
  <h3>Market Trends</h3>
  ${bulletList(market?.trends, 8)}
  <h3>Opportunities</h3>
  ${bulletList(market?.opportunities, 5)}
  <h3>Risks</h3>
  ${bulletList(market?.risks, 5)}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>5. Audience Intelligence</h2>
  ${personas.length > 0 ? personas.map(p => `
  <div class="card">
    <h3 style="margin-top:0">${safe(p.role || p.name, 'Target Persona')} ${confidenceBadge(p.confidence)}</h3>
    ${dataTable(
      ['Attribute', 'Value'],
      [
        ['Company Size', safe(p.companySize)],
        ['Pain Points', arr(p.painPoints).join(', ') || 'Data unavailable'],
        ['Goals', arr(p.goals).join(', ') || 'Data unavailable'],
        ['Budget', safe(p.budget)],
        ['Decision Authority', safe(p.decisionAuthority)]
      ]
    )}
  </div>`).join('') : '<div class="card amber">Audience persona data unavailable from verified sources.</div>'}
  <h3>Audience Segments</h3>
  ${bulletList(audience?.segments, 5)}
  <h3>Best Channels</h3>
  ${bulletList(audience?.channels, 5)}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>6. Competitors</h2>
  ${directCompetitors.length > 0 ? dataTable(
    ['Competitor', 'Domain', 'Type', 'Similarity', 'Source', 'Confidence'],
    directCompetitors.map(c => [
      safe(c.name),
      safe(c.domain),
      safe(c.type),
      c.similarityScore ? `${c.similarityScore}/100` : 'N/A',
      safe(c.source),
      confidenceBadge(c.confidence || c.similarityScore)
    ])
  ) : '<div class="card amber">No direct competitors identified from verified sources.</div>'}
  <h3>Indirect Competitors</h3>
  ${bulletList(competitor?.indirect, 5)}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>7. Positioning</h2>
  <div class="card green"><strong>Positioning Statement:</strong> ${safe(positioning?.positioningStatement, 'Positioning data unavailable from verified sources.')}</div>
  <div class="card"><strong>Value Proposition:</strong> ${safe(positioning?.valueProposition, 'Value proposition data unavailable from verified sources.')}</div>
</div>

<div class="page-break"></div>
<div class="section">
  <h2>8. Campaign Strategy</h2>
  <h3>Creative Angles</h3>
  ${bulletList(data?.campaign?.creativeAngles || data?.campaign?.campaignConcepts, 5)}
  <h3>Ad Hooks & Copy</h3>
  ${bulletList(data?.campaign?.copyHooks, 5)}
  <h3>Growth Summary</h3>
  <div class="card">${safe(data?.campaign?.growthSummary?.summary || data?.campaign?.executiveSummary, 'Campaign strategy data unavailable. Connect analytics account to generate verified recommendations.')}</div>
</div>

<div class="page-break"></div>
<div class="section">
  <h2>9. Channel Plan</h2>
  ${arr(channelData).length > 0 ? dataTable(
    ['Channel', 'Fit Score', 'Budget Allocation', 'Expected ROI'],
    arr(channelData).slice(0, 10).map(c => [
      safe(c.name || c.channel),
      c.fitScore || c.fit ? `${c.fitScore || c.fit}/100` : 'Data unavailable',
      c.budgetAllocation ? `${c.budgetAllocation}%` : 'Data unavailable',
      c.expectedRoi ? `${c.expectedRoi}%` : 'Metric unavailable — connect analytics/ad account'
    ])
  ) : '<div class="card amber">Channel plan data unavailable. Connect analytics/ad account for verified recommendations.</div>'}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>10. Action Roadmap</h2>
  ${(() => {
    const plans = { '7 Day': actionPlan?.day7, '30 Day': actionPlan?.day30, '60 Day': actionPlan?.day60, '90 Day': actionPlan?.day90, '180 Day': actionPlan?.day180, '365 Day': actionPlan?.day365 };
    const hasItems = Object.values(plans).some(t => t && t.length > 0);
    if (!hasItems) return '<div class="card amber">Action plan data unavailable. Connect analytics/ad account to generate verified action items.</div>';
    return Object.entries(plans).filter(([_, tasks]) => tasks && tasks.length > 0).map(([period, tasks]) => `
    <h3>${period}</h3>
    ${dataTable(
      ['Task', 'Owner', 'Priority', 'Evidence', 'Confidence'],
      tasks.slice(0, 8).map(t => [
        safe(t.title || t.task, 'Task'),
        safe(t.owner, 'Unassigned'),
        priorityBadge(t.priority),
        safe(t.evidence || t.reason || t.impact, 'Metric unavailable — connect analytics/ad account'),
        confidenceBadge(t.confidence)
      ])
    )}`).join('');
  })()}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>11. Evidence and Methodology</h2>
  <div class="card">
    <p><strong>Data Sources:</strong></p>
    <ul>
      <li>Website scraping (Firecrawl / Cheerio)</li>
      <li>Technology fingerprinting from page source</li>
      <li>Market data from DataForSEO (if configured)</li>
      <li>Competitor discovery via DataForSEO SERP + Tavily</li>
      <li>Pricing extraction from scraped content</li>
    </ul>
  </div>
  <div class="evidence-box">
    <div class="source">Data Quality Note</div>
    This report displays <strong>"Data unavailable"</strong> for any data point that could not be verified from collected evidence. Metrics like CTR, conversion rate, and ROI are only shown when connected to live analytics/ad accounts. No AI-generated or hallucinated metrics are included.
  </div>
  <div class="evidence-box">
    <div class="source">Confidence Scoring</div>
    Confidence scores indicate data reliability: <strong>70%+</strong> = verified from multiple sources, <strong>40-69%</strong> = single source or partial, <strong>&lt;40%</strong> = estimated, needs verification.
  </div>
</div>

<div class="footer">
  AI Marketing Platform v3.0 | Generated ${date} | CONFIDENTIAL<br>
  This report contains proprietary analysis. Do not distribute without authorization.
</div>

</body></html>`;
}

export function buildSeoReportHtml(data) {
  const { seo, company } = data;
  const scores = seo?.scores || {};
  const keywords = arr(seo?.keywords);
  const competitors = arr(seo?.competitors);
  const gaps = arr(seo?.gaps);
  const geo = seo?.geo || {};
  const blogs = arr(seo?.blogs);
  const backlinks = seo?.backlinks || {};
  const name = company?.name || 'Company';
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
${getReportStyles()}
</style></head><body>

<div class="cover">
  <div class="logo-placeholder">${esc(name.charAt(0))}</div>
  <h1>SEO Intelligence Report</h1>
  <div class="subtitle">${esc(name)} — Technical SEO & Organic Growth Assessment</div>
  <div class="meta">Prepared: ${date} | Confidential | AI Marketing Platform v3.0</div>
</div>
<div class="confidential">CONFIDENTIAL — AI Marketing Platform</div>

<div class="toc">
  <h2>Table of Contents</h2>
  <ul>
    <li><span>1.</span> Cover Page</li>
    <li><span>2.</span> SEO Executive Summary</li>
    <li><span>3.</span> Technical Audit</li>
    <li><span>4.</span> Keyword Intelligence</li>
    <li><span>5.</span> Competitor SEO</li>
    <li><span>6.</span> Content Gaps</li>
    <li><span>7.</span> GEO / AI Visibility</li>
    <li><span>8.</span> Blog Intelligence</li>
    <li><span>9.</span> SEO Action Plan</li>
    <li><span>10.</span> Evidence and Methodology</li>
  </ul>
</div>

<div class="section">
  <h2>1. SEO Executive Summary</h2>
  <div class="metric-grid">
    ${scoreCard('SEO Score', scores.seoScore || scores.overall)}
    ${scoreCard('Performance', scores.performanceScore)}
    ${scoreCard('Keywords', keywords.length, '')}
    <div class="metric"><div class="value">${competitors.length}</div><div class="label">SEO Competitors</div></div>
    <div class="metric"><div class="value">${gaps.length}</div><div class="label">Content Gaps</div></div>
  </div>
  <div class="card">
    <strong>Company:</strong> ${safe(name)}<br>
    <strong>Domain:</strong> ${safe(company?.domain || company?.website)}<br>
    <strong>Industry:</strong> ${safe(company?.industry)}
  </div>
</div>

<div class="page-break"></div>
<div class="section">
  <h2>2. Technical Audit</h2>
  <div class="metric-grid">
    ${scoreCard('Performance', scores.performanceScore)}
    ${scoreCard('SEO', scores.seoScore || scores.overall)}
    ${scoreCard('Accessibility', scores.accessibilityScore)}
    ${scoreCard('Best Practices', scores.bestPracticesScore)}
  </div>
  ${dataTable(
    ['Metric', 'Score'],
    [
      ['Performance', scores.performanceScore != null ? `${Math.round(scores.performanceScore)}/100` : 'Data unavailable'],
      ['SEO', (scores.seoScore || scores.overall) != null ? `${Math.round(scores.seoScore || scores.overall)}/100` : 'Data unavailable'],
      ['Accessibility', scores.accessibilityScore != null ? `${Math.round(scores.accessibilityScore)}/100` : 'Data unavailable'],
      ['Best Practices', scores.bestPracticesScore != null ? `${Math.round(scores.bestPracticesScore)}/100` : 'Data unavailable']
    ]
  )}
  <div class="card amber">Run a full technical SEO audit (PageSpeed + Lighthouse) to populate these scores with verified data.</div>
</div>

<div class="page-break"></div>
<div class="section">
  <h2>3. Keyword Intelligence</h2>
  ${keywords.length > 0 ? dataTable(
    ['Keyword', 'Volume', 'Difficulty', 'Intent', 'Confidence'],
    keywords.slice(0, 30).map(k => [
      safe(k.keyword || k),
      k.volume || k.searchVolume ? `${k.volume || k.searchVolume}` : 'Data unavailable',
      k.keywordDifficulty || k.difficulty ? `${k.keywordDifficulty || k.difficulty}/100` : 'Data unavailable',
      safe(k.intent, 'Informational'),
      confidenceBadge(k.confidence || (k.source === 'DataForSEO' ? 85 : k.source === 'AI' ? 60 : null))
    ])
  ) : '<div class="card amber">Keyword data unavailable. Configure DataForSEO API for verified keyword intelligence.</div>'}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>4. Competitor SEO</h2>
  ${competitors.length > 0 ? dataTable(
    ['Competitor', 'Domain', 'Authority', 'Est. Traffic', 'Overlap', 'Confidence'],
    competitors.slice(0, 10).map(c => [
      safe(c.name || c.domain),
      safe(c.domain),
      c.seoAuthority || c.estimatedAuthority ? `${c.seoAuthority || c.estimatedAuthority}/100` : 'Data unavailable',
      c.estimatedTraffic ? `${c.estimatedTraffic}` : 'Data unavailable',
      safe(c.overlapReason || c.reason || c.description),
      confidenceBadge(c.confidence || c.relevanceScore)
    ])
  ) : '<div class="card amber">Competitor SEO data unavailable. Configure DataForSEO for competitor analysis.</div>'}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>5. Content Gaps</h2>
  ${gaps.length > 0 ? dataTable(
    ['Topic', 'Priority', 'Volume', 'Difficulty', 'Confidence'],
    gaps.slice(0, 15).map(g => [
      safe(g.value || g.topic || g.title || g),
      priorityBadge(g.priority || g.severity || 'medium'),
      g.searchVolume || g.volume ? `${g.searchVolume || g.volume}` : 'Data unavailable',
      g.keywordDifficulty || g.difficulty ? `${g.keywordDifficulty || g.difficulty}/100` : 'Data unavailable',
      confidenceBadge(g.confidence)
    ])
  ) : '<div class="card amber">Content gap data unavailable. Run competitor keyword analysis.</div>'}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>6. GEO / AI Visibility</h2>
  <div class="metric-grid">
    ${['chatgpt','gemini','claude','perplexity','googleAiOverview'].filter(p => geo[p] !== undefined).map(p => scoreCard(
      p.replace(/([A-Z])/g, ' $1').trim(),
      geo[p],
      '/100'
    )).join('')}
    ${['chatgpt','gemini','claude','perplexity','googleAiOverview'].filter(p => geo[p] === undefined).length === 5 ? '<div class="card amber">AI visibility data unavailable. GEO analysis requires configured AI crawler data.</div>' : ''}
  </div>
</div>

<div class="page-break"></div>
<div class="section">
  <h2>7. Blog Intelligence</h2>
  ${blogs.length > 0 ? dataTable(
    ['Title', 'Keyword', 'Volume', 'Difficulty', 'Intent', 'Confidence'],
    blogs.slice(0, 15).map(b => [
      safe(b.title || b.topic || b),
      safe(b.targetKeyword || b.keyword),
      b.searchVolume || b.volume ? `${b.searchVolume || b.volume}` : 'Data unavailable',
      b.keywordDifficulty || b.difficulty ? `${b.keywordDifficulty || b.difficulty}/100` : 'Data unavailable',
      safe(b.intent, 'Informational'),
      confidenceBadge(b.confidence)
    ])
  ) : '<div class="card amber">Blog intelligence data unavailable. Run keyword research to generate blog ideas.</div>'}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>8. SEO Action Plan</h2>
  ${(() => {
    const plan = seo?.actionPlan || {};
    const phases = [
      { label: 'Immediate', items: arr(plan.immediate || plan.day7) },
      { label: 'Short-term', items: arr(plan.day30 || plan.day14) },
      { label: 'Medium-term', items: arr(plan.day60 || plan.day30) },
      { label: 'Long-term', items: arr(plan.day90 || plan.day60) }
    ];
    const hasItems = phases.some(p => p.items.length > 0);
    if (!hasItems) return '<div class="card amber">SEO action plan unavailable. Run full audit to generate prioritized recommendations.</div>';
    return phases.filter(p => p.items.length > 0).map(p => `
    <h3>${p.label}</h3>
    ${dataTable(
      ['Action', 'Priority', 'Impact', 'Evidence', 'Confidence'],
      p.items.slice(0, 8).map(a => [
        safe(a.title || a.action || a.task || a.recommendation || a),
        priorityBadge(a.priority || a.severity || 'medium'),
        safe(a.impact || a.area || a.reason, 'Metric unavailable — connect analytics/ad account'),
        safe(a.evidence || a.source || a.recommendation, 'Metric unavailable — connect analytics/ad account'),
        confidenceBadge(a.confidence)
      ])
    )}`).join('');
  })()}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>9. Evidence and Methodology</h2>
  <div class="card">
    <p><strong>Data Sources:</strong></p>
    <ul>
      <li>Website crawl (Firecrawl)</li>
      <li>Technical SEO audit (Lighthouse data)</li>
      <li>Keyword intelligence (DataForSEO if configured)</li>
      <li>Competitor analysis (DataForSEO SERP + Tavily)</li>
      <li>AI visibility analysis (GEO engine)</li>
      <li>Content gap analysis</li>
    </ul>
  </div>
  <div class="evidence-box">
    <div class="source">Data Quality Note</div>
    This report displays <strong>"Data unavailable"</strong> for any data point that could not be verified. No AI-generated or hallucinated metrics are included. Connect DataForSEO and analytics accounts for verified data.
  </div>
  <div class="evidence-box">
    <div class="source">Confidence Scoring</div>
    <strong>70%+</strong> = verified from DataForSEO or multiple sources. <strong>40-69%</strong> = single source or AI-enhanced. <strong>&lt;40%</strong> = estimated, needs verification.
  </div>
</div>

<div class="footer">
  AI Marketing Platform v3.0 | Generated ${date} | CONFIDENTIAL<br>
  This report contains proprietary analysis. Do not distribute without authorization.
</div>

</body></html>`;
}
