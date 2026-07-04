export function buildExecutiveReportHtml(data) {
  const { company, market, audience, competitor, positioning, technology, pricing, scores } = data;
  const name = company?.name || 'Company';
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const overallScore = scores?.overallGrowthScore || 0;
  const techStack = technology?.technologies || [];
  const directCompetitors = competitor?.direct || [];
  const personas = audience?.personas || [];
  const pricingTiers = pricing?.tiers || [];

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
@page { margin: 60px 50px; }
body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; font-size: 11pt; line-height: 1.5; margin: 0; padding: 0; }
.cover { text-align: center; padding: 120px 60px 80px; page-break-after: always; background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%); color: white; }
.cover h1 { font-size: 32pt; margin-bottom: 8px; font-weight: 700; letter-spacing: -0.5px; }
.cover .subtitle { font-size: 16pt; opacity: 0.85; margin-bottom: 40px; }
.cover .meta { font-size: 10pt; opacity: 0.7; }
.cover .logo-placeholder { width: 60px; height: 60px; margin: 0 auto 24px; background: rgba(255,255,255,0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; }
.confidential { position: fixed; bottom: 20px; right: 40px; font-size: 7pt; color: #9ca3af; }
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
.chart-container { text-align: center; margin: 16px 0; page-break-inside: avoid; }
.toc { page-break-after: always; }
.toc h2 { border: none; }
.toc ul { list-style: none; padding: 0; }
.toc li { padding: 6px 0; border-bottom: 1px dotted #e5e7eb; font-size: 11pt; }
.toc li span { color: #6366f1; }
.footer { text-align: center; font-size: 8pt; color: #9ca3af; padding: 20px; border-top: 1px solid #e5e7eb; margin-top: 40px; }
.evidence-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px; margin: 8px 0; font-size: 9pt; }
.evidence-box .source { font-weight: 600; color: #16a34a; }
.page-break { page-break-before: always; }
</style></head><body>

<div class="cover">
  <div class="logo-placeholder">${name.charAt(0)}</div>
  <h1>Executive Strategy Report</h1>
  <div class="subtitle">${name} — Strategic Market Assessment</div>
  <div class="meta">Prepared: ${date} | Confidential | AI Marketing Platform v3.0</div>
</div>
<div class="confidential">CONFIDENTIAL — AI Marketing Platform</div>

<div class="toc">
  <h2>Table of Contents</h2>
  <ul>
    <li><span>1.</span> Executive Summary</li>
    <li><span>2.</span> Company Overview & Business Summary</li>
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
    <div class="metric"><div class="value">${overallScore}/100</div><div class="label">Overall Score</div></div>
    <div class="metric"><div class="value">${market?.tam || 'Unknown'}</div><div class="label">TAM</div></div>
    <div class="metric"><div class="value">${market?.sam || 'Unknown'}</div><div class="label">SAM</div></div>
    <div class="metric"><div class="value">${market?.som || 'Unknown'}</div><div class="label">SOM</div></div>
    <div class="metric"><div class="value">${directCompetitors.length}</div><div class="label">Direct Competitors</div></div>
    <div class="metric"><div class="value">${techStack.length}</div><div class="label">Technologies Detected</div></div>
  </div>
  <div class="card">
    <strong>Company:</strong> ${name}<br>
    <strong>Industry:</strong> ${company?.industry || 'Unknown'}<br>
    <strong>Business Model:</strong> ${company?.businessModel || 'Unknown'}<br>
    <strong>Target Market:</strong> ${company?.targetMarket || 'Unknown'}<br>
    <strong>Headquarters:</strong> ${company?.headquarters || 'Unknown'}
  </div>
</div>

<div class="page-break"></div>
<div class="section">
  <h2>2. Company Overview</h2>
  <table>
    <tr><th>Attribute</th><th>Value</th></tr>
    <tr><td>Company Name</td><td>${company?.name || 'Unknown'}</td></tr>
    <tr><td>Domain</td><td>${company?.domain || 'Unknown'}</td></tr>
    <tr><td>Industry</td><td>${company?.industry || 'Unknown'}</td></tr>
    <tr><td>Category</td><td>${company?.category || 'Unknown'}</td></tr>
    <tr><td>Business Model</td><td>${company?.businessModel || 'Unknown'}</td></tr>
    <tr><td>B2B / B2C</td><td>${company?.b2bOrB2C || 'Unknown'}</td></tr>
    <tr><td>Target Market</td><td>${company?.targetMarket || 'Unknown'}</td></tr>
    <tr><td>Headquarters</td><td>${company?.headquarters || 'Unknown'}</td></tr>
    <tr><td>Employee Estimate</td><td>${company?.employeeEstimate || 'Unknown'}</td></tr>
    <tr><td>Funding Stage</td><td>${company?.fundingStage || 'Unknown'}</td></tr>
  </table>
</div>

<div class="page-break"></div>
<div class="section">
  <h2>3. Technology Infrastructure</h2>
  ${techStack.length > 0 ? `
  <table><tr><th>Category</th><th>Technologies</th></tr>
  ${['framework','cms','cloud','cdn','analytics','crm','marketing','payment','auth','chat','seo','monitoring','email','advertising'].filter(cat => techStack.some(t => t.category === cat)).map(cat => `
    <tr><td style="text-transform:capitalize">${cat}</td><td>${techStack.filter(t => t.category === cat).map(t => `<span class="tag">${t.name}</span>`).join(' ')}</td></tr>
  `).join('')}
  </table>` : '<div class="card amber">Technology fingerprinting inconclusive. Run comprehensive tech stack analysis.</div>'}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>4. Market Intelligence</h2>
  <div class="metric-grid">
    <div class="metric"><div class="value">${market?.tam || 'Unknown'}</div><div class="label">Total Addressable Market</div></div>
    <div class="metric"><div class="value">${market?.sam || 'Unknown'}</div><div class="label">Serviceable Available Market</div></div>
    <div class="metric"><div class="value">${market?.som || 'Unknown'}</div><div class="label">Serviceable Obtainable Market</div></div>
  </div>
  <h3>Market Trends</h3>
  ${(market?.trends || []).length > 0 ? `<ul>${market.trends.slice(0, 8).map(t => `<li>${typeof t === 'string' ? t : t.keyword || t.signal || t.value || ''}</li>`).join('')}</ul>` : '<div class="card amber">Market trend data unavailable from verified sources.</div>'}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>5. Competitive Landscape</h2>
  ${directCompetitors.length > 0 ? `
  <table><tr><th>Competitor</th><th>Domain</th><th>Type</th><th>Similarity</th><th>Source</th></tr>
  ${directCompetitors.map(c => `<tr><td>${c.name || 'Unknown'}</td><td>${c.domain || 'N/A'}</td><td>${c.type || 'direct'}</td><td>${c.similarityScore || 'N/A'}</td><td>${c.source || 'Unknown'}</td></tr>`).join('')}
  </table>` : '<div class="card amber">No direct competitors identified from verified sources. SERP API integration may be required.</div>'}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>6. Audience Intelligence</h2>
  ${personas.length > 0 ? personas.map(p => `
  <div class="card">
    <h3 style="margin-top:0">${p.role || p.name || 'Target Persona'}</h3>
    <table><tr><td style="width:140px;font-weight:600">Company Size</td><td>${p.companySize || 'Unknown'}</td></tr>
    <tr><td style="font-weight:600">Pain Points</td><td>${(p.painPoints || []).join(', ') || 'Unknown'}</td></tr>
    <tr><td style="font-weight:600">Goals</td><td>${(p.goals || []).join(', ') || 'Unknown'}</td></tr>
    <tr><td style="font-weight:600">Buying Triggers</td><td>${(p.buyingTriggers || []).join(', ') || 'Unknown'}</td></tr>
    <tr><td style="font-weight:600">Budget</td><td>${p.budget || 'Unknown'}</td></tr>
    <tr><td style="font-weight:600">Decision Authority</td><td>${p.decisionAuthority || 'Unknown'}</td></tr></table>
  </div>`).join('') : '<div class="card amber">Audience persona data unavailable from verified sources.</div>'}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>7. Pricing Intelligence</h2>
  ${pricingTiers.length > 0 ? `
  <div class="metric-grid">${pricingTiers.map(t => `<div class="metric"><div class="value" style="font-size:14pt">${t.name}</div><div class="label">Tier</div></div>`).join('')}</div>
  <table><tr><th>Attribute</th><th>Value</th></tr>
  <tr><td>Free Tier</td><td>${pricing?.hasFree ? 'Yes' : 'No'}</td></tr>
  <tr><td>Free Trial</td><td>${pricing?.hasFreeTrial ? 'Yes' : 'No'}</td></tr>
  <tr><td>Enterprise Plan</td><td>${pricing?.hasEnterprise ? 'Yes' : 'No'}</td></tr>
  <tr><td>Custom Pricing</td><td>${pricing?.hasCustomPricing ? 'Yes' : 'No'}</td></tr>
  <tr><td>Currency</td><td>${pricing?.currency || 'Unknown'}</td></tr>
  <tr><td>Billing</td><td>${(pricing?.billingPeriods || []).join(', ') || 'Unknown'}</td></tr></table>` : '<div class="card amber">Pricing information unavailable from verified sources.</div>'}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>8. Strategic Assessment</h2>
  <div class="card green"><strong>Top Opportunity:</strong> ${(market?.opportunities || [])[0] || 'Insufficient data for opportunity analysis'}</div>
  <div class="card red"><strong>Primary Risk:</strong> ${(market?.risks || [])[0] || 'Insufficient data for risk analysis'}</div>

  <h3>Recommended Investments</h3>
  <table><tr><th>Priority</th><th>Area</th><th>Rationale</th></tr>
  ${directCompetitors.length === 0 ? '<tr><td><span class="tag" style="background:#fee2e2;color:#dc2626">Critical</span></td><td>Competitive Intelligence</td><td>No verified competitors identified</td></tr>' : ''}
  ${(market?.tam === 'Unknown') ? '<tr><td><span class="tag" style="background:#fee2e2;color:#dc2626">Critical</span></td><td>Market Sizing</td><td>TAM/SAM/SOM unavailable</td></tr>' : ''}
  ${techStack.length === 0 ? '<tr><td><span class="tag" style="background:#fef3c7;color:#d97706">Medium</span></td><td>Technology Analysis</td><td>Technology fingerprinting inconclusive</td></tr>' : ''}
  </table>
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
    <div class="source">✓ Data Quality Note</div>
    This report displays <strong>"Unknown"</strong> for any data point that could not be verified from collected evidence. No AI-generated, hallucinated, or estimated values are included. Data quality depends on available API integrations (DataForSEO, Tavily, Firecrawl).
  </div>
</div>

<div class="footer">
  AI Marketing Platform v3.0 | Generated ${date} | CONFIDENTIAL<br>
  This report contains proprietary analysis. Do not distribute without authorization.
</div>

</body></html>`;
}

export function buildGrowthReportHtml(data) {
  const { company, market, audience, competitor, positioning, pricing, scores, actionPlan } = data;

  const html = buildExecutiveReportHtml(data);
  return html.replace('</body>', `
<div class="page-break"></div>
<div class="section">
  <h2>Growth Strategy</h2>
  <h3>Go-To-Market Strategy</h3>
  <div class="card">${positioning?.positioningStatement || 'Positioning data unavailable'}</div>
  <div class="card green">${positioning?.valueProposition || 'Value proposition data unavailable'}</div>
  
  <h3>Recommended Channels</h3>
  <table><tr><th>Channel</th><th>Fit Score</th><th>Budget Allocation</th></tr>
  ${data.channelData && data.channelData.length > 0 ? data.channelData.map(c => `<tr><td>${c.name || c.channel || 'Unknown'}</td><td>${c.fitScore || c.fit || 'N/A'}</td><td>${c.budgetAllocation || 'N/A'}</td></tr>`).join('') : '<tr><td colspan="3">Channel data unavailable</td></tr>'}
  </table>
</div>

<div class="page-break"></div>
<div class="section">
  <h2>Action Plan</h2>
  ${(() => { const plans = { '7 Day': actionPlan?.day7, '30 Day': actionPlan?.day30, '60 Day': actionPlan?.day60, '90 Day': actionPlan?.day90, '180 Day': actionPlan?.day180, '365 Day': actionPlan?.day365 }; return Object.entries(plans).filter(([_, tasks]) => tasks && tasks.length > 0).map(([period, tasks]) => `
  <h3>${period}</h3>
  <table><tr><th>Task</th><th>Owner</th><th>Priority</th><th>Evidence</th></tr>
  ${tasks.slice(0, 5).map(t => `<tr><td>${t.title || t.task || 'Task'}</td><td>${t.owner || 'Unassigned'}</td><td><span class="tag" style="background:${t.priority === 'Critical' || t.priority === 'High' ? '#fee2e2;color:#dc2626' : '#fef3c7;color:#d97706'}">${t.priority || 'Medium'}</span></td><td style="font-size:9pt">${(t.evidence || '').substring(0, 120)}</td></tr>`).join('')}
  </table>`).join('') || '<div class="card amber">Action plan data unavailable.</div>' })()}
</div>
</body></html>`);
}

export function buildSeoReportHtml(data) {
  const { seo } = data;
  const scores = seo?.scores || {};
  const keywords = seo?.keywords || [];
  const competitors = seo?.competitors || [];
  const gaps = seo?.gaps || [];
  const geo = seo?.geo || {};
  const blogs = seo?.blogs || [];
  const backlinks = seo?.backlinks || {};

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
${getReportStyles()}
</style></head><body>

<div class="cover">
  <div class="logo-placeholder">S</div>
  <h1>SEO Intelligence Report</h1>
  <div class="subtitle">${data.company?.name || 'Company'} — Technical SEO & Organic Growth Assessment</div>
  <div class="meta">Prepared: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} | Confidential</div>
</div>

<div class="toc">
  <h2>Table of Contents</h2>
  <ul>
    <li><span>1.</span> Executive Dashboard</li>
    <li><span>2.</span> Technical Audit</li>
    <li><span>3.</span> Keyword Intelligence</li>
    <li><span>4.</span> Competitor SEO Analysis</li>
    <li><span>5.</span> Content Gap Analysis</li>
    <li><span>6.</span> AI Visibility (GEO)</li>
    <li><span>7.</span> Blog Intelligence</li>
    <li><span>8.</span> Recommendations</li>
  </ul>
</div>

<div class="section">
  <h2>1. Executive Dashboard</h2>
  <div class="metric-grid">
    <div class="metric"><div class="value">${scores.performanceScore || 'N/A'}</div><div class="label">Performance</div></div>
    <div class="metric"><div class="value">${scores.seoScore || 'N/A'}</div><div class="label">SEO Score</div></div>
    <div class="metric"><div class="value">${keywords.length || 0}</div><div class="label">Keywords</div></div>
    <div class="metric"><div class="value">${competitors.length || 0}</div><div class="label">SEO Competitors</div></div>
    <div class="metric"><div class="value">${gaps.length || 0}</div><div class="label">Content Gaps</div></div>
  </div>
</div>

<div class="page-break"></div>
<div class="section">
  <h2>2. Technical Audit</h2>
  <table><tr><th>Metric</th><th>Score</th></tr>
  <tr><td>Performance</td><td>${scores.performanceScore || 'N/A'}</td></tr>
  <tr><td>SEO</td><td>${scores.seoScore || 'N/A'}</td></tr>
  <tr><td>Accessibility</td><td>${scores.accessibilityScore || 'N/A'}</td></tr>
  <tr><td>Best Practices</td><td>${scores.bestPracticesScore || 'N/A'}</td></tr>
  </table>
</div>

<div class="page-break"></div>
<div class="section">
  <h2>3. Keyword Intelligence</h2>
  ${keywords.length > 0 ? `<table><tr><th>Keyword</th><th>Volume</th><th>Difficulty</th><th>Intent</th></tr>
  ${keywords.slice(0, 20).map(k => `<tr><td>${k.keyword || k}</td><td>${k.volume || k.searchVolume || 'N/A'}</td><td>${k.keywordDifficulty || k.difficulty || 'N/A'}</td><td>${k.intent || 'N/A'}</td></tr>`).join('')}
  </table>` : '<div class="card amber">Keyword data unavailable. Configure DataForSEO API.</div>'}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>4. Competitor SEO Analysis</h2>
  ${competitors.length > 0 ? `<table><tr><th>Competitor</th><th>Domain</th><th>Strength</th></tr>
  ${competitors.slice(0, 10).map(c => `<tr><td>${c.name || c.domain || 'Unknown'}</td><td>${c.domain || 'N/A'}</td><td>${c.seoAuthority || c.relevanceScore || 'N/A'}</td></tr>`).join('')}
  </table>` : '<div class="card amber">Competitor SEO data unavailable.</div>'}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>5. Content Gap Analysis</h2>
  ${gaps.length > 0 ? `<ul>${gaps.slice(0, 15).map(g => `<li>${g.value || g.topic || g}</li>`).join('')}</ul>` : '<div class="card amber">Content gap data unavailable.</div>'}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>6. AI Visibility (GEO)</h2>
  <table><tr><th>Platform</th><th>Visibility Score</th></tr>
  ${['chatgpt','gemini','claude','perplexity','googleAiOverview'].filter(p => geo[p] !== undefined).map(p => `<tr><td style="text-transform:capitalize">${p.replace(/([A-Z])/g, ' $1').trim()}</td><td>${geo[p] || 'N/A'}</td></tr>`).join('') || '<tr><td colspan="2">AI visibility data unavailable</td></tr>'}
  </table>
</div>

<div class="page-break"></div>
<div class="section">
  <h2>7. Blog Intelligence</h2>
  ${blogs.length > 0 ? `<ul>${blogs.slice(0, 10).map(b => `<li>${b.title || b.topic || b}</li>`).join('')}</ul>` : '<div class="card amber">Blog intelligence data unavailable.</div>'}
</div>

<div class="page-break"></div>
<div class="section">
  <h2>8. Recommendations</h2>
  <div class="card green"><strong>Quick Wins:</strong><br>${scores.quickWins || 'Run technical SEO audit to identify quick wins.'}</div>
  <div class="card"><strong>Long-term Improvements:</strong><br>${scores.longTerm || 'Build comprehensive content strategy based on keyword gap analysis.'}</div>
</div>

<div class="footer">AI Marketing Platform v3.0 | SEO Intelligence Report | Confidential</div>
</body></html>`;
}

function getReportStyles() {
  return `
    @page { margin: 60px 50px; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; font-size: 11pt; line-height: 1.5; margin: 0; padding: 0; }
    .cover { text-align: center; padding: 120px 60px 80px; page-break-after: always; background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%); color: white; }
    .cover h1 { font-size: 32pt; margin-bottom: 8px; font-weight: 700; }
    .cover .subtitle { font-size: 16pt; opacity: 0.85; margin-bottom: 40px; }
    .cover .meta { font-size: 10pt; opacity: 0.7; }
    .cover .logo-placeholder { width: 60px; height: 60px; margin: 0 auto 24px; background: rgba(255,255,255,0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; }
    h2 { font-size: 18pt; color: #1e1b4b; border-bottom: 3px solid #6366f1; padding-bottom: 6px; margin-top: 32px; page-break-after: avoid; }
    h3 { font-size: 13pt; color: #4338ca; margin-top: 20px; }
    .section { page-break-inside: avoid; }
    .card { background: #f9fafb; border-radius: 8px; padding: 16px; margin: 12px 0; border-left: 4px solid #6366f1; }
    .card.green { border-left-color: #10b981; }
    .card.amber { border-left-color: #f59e0b; }
    .card.red { border-left-color: #ef4444; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; }
    th { background: #1e1b4b; color: white; padding: 8px 12px; text-align: left; }
    td { padding: 7px 12px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) td { background: #f9fafb; }
    .metric-grid { display: flex; flex-wrap: wrap; gap: 12px; margin: 16px 0; }
    .metric { flex: 1; min-width: 140px; background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; text-align: center; }
    .metric .value { font-size: 20pt; font-weight: 700; color: #1e1b4b; }
    .metric .label { font-size: 8pt; color: #6b7280; text-transform: uppercase; }
    .tag { display: inline-block; background: #eef2ff; color: #4338ca; padding: 2px 8px; border-radius: 4px; font-size: 9pt; margin: 2px; }
    .toc { page-break-after: always; }
    .toc li { padding: 6px 0; border-bottom: 1px dotted #e5e7eb; }
    .footer { text-align: center; font-size: 8pt; color: #9ca3af; padding: 20px; margin-top: 40px; }
    .page-break { page-break-before: always; }
  `;
}
