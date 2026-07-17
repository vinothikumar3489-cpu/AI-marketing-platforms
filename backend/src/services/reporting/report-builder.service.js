import { generatePdf } from './pdf-generator.service.js';
import { generateDocx } from './docx-generator.service.js';
import { generatePptx } from './pptx-generator.service.js';
import { buildExecutiveReportHtml, buildGrowthReportHtml, buildSeoReportHtml } from './report-templates.service.js';
import {
  generateBarChartSvg, generatePieChartSvg, generateRadarChartSvg, generateTrendChartSvg,
  generateCompetitorComparisonChart, generateChannelAllocationChart,
  generateKeywordDistributionChart, generateMarketShareChart,
  generateGrowthMatrixChart, generateScoreRadarChart
} from './chart-generator.service.js';
import { prisma } from '../../config/prisma.js';
import { normalizeSeoIntelligenceForConsumers, normalizeTechnicalAuditForConsumers } from '../normalizers/seo-intelligence.normalizer.js';
import { resolveProductIdentity } from '../resolvers/product-identity.resolver.js';

export async function buildReportData(chatId, userId) {
  console.log('[Report] Building report data for chat:', chatId);

  const [productIntel, competitorIntel, campaignIntel, seoIntel] = await Promise.all([
    prisma.productIntelligence.findUnique({ where: { chatId } }),
    prisma.competitorIntelligence.findUnique({ where: { chatId } }),
    prisma.campaignIntelligence.findUnique({ where: { chatId } }),
    prisma.seoIntelligence.findUnique({
      where: { chatId },
      include: {
        rawCrawlData: true,
        technicalAuditDetail: true,
        keywordIntelligence: true,
        competitorSeoRecord: true,
        contentGapRecord: true,
        geoIntelligence: true,
        blogIntelligenceRecord: true
      }
    })
  ]);

  const input = productIntel?.inputJson || campaignIntel?.inputJson || {};

  // Phase 22: Use canonical product identity resolver for consistent reporting
  const productIdentity = resolveProductIdentity({
    chat: { id: chatId, title: input?.companyName || input?.productName, websiteUrl: input?.websiteUrl },
    productIntelligence: productIntel?.productAnalysis ? {
      productName: input?.productName || productIntel?.productAnalysis?.productName,
      brandName: productIntel?.productAnalysis?.brandName,
      companyName: input?.companyName || productIntel?.productAnalysis?.companyName
    } : null,
    evidenceSnapshot: productIntel?.evidenceSnapshot || null,
    website: input?.websiteUrl ? { url: input.websiteUrl } : null
  });

  console.log('[Report] Product identity resolved for report', {
    chatId,
    productName: productIdentity.productName,
    brandName: productIdentity.brandName,
    source: productIdentity.source
  });

  const product = productIntel?.productAnalysis || {};
  const market = productIntel?.marketDiscovery || {};
  const audience = productIntel?.audienceIntelligence || {};

  const competitor = competitorIntel?.competitorAnalysis || {};
  const intent = competitorIntel?.intentPrediction || {};
  const positioning = competitorIntel?.positioningEngine || {};

  const campaign = campaignIntel?.campaignGenerator || {};
  const channel = campaignIntel?.channelRecommendation || {};
  const executiveStory = campaignIntel?.executiveStory || {};
  const actionPlan = campaignIntel?.actionPlan || {};

  const seo = seoIntel ? normalizeSeoIntelligence(seoIntel) : null;

  const scores = {
    overallGrowthScore: campaign?.growthSummary?.overallGrowthScore ?? campaign?.growthSummary?.dataCompletenessScore ?? null,
    dataCompletenessScore: campaign?.growthSummary?.dataCompletenessScore ?? null,
    evidenceBased: campaign?.growthSummary?.evidenceBased ?? false,
    evidenceSourcesCount: campaign?.growthSummary?.evidenceSourcesCount ?? 0,
    marketOpportunityScore: campaign?.growthSummary?.evidenceBased ? campaign?.growthSummary?.overallGrowthScore : null,
    audienceClarityScore: null,
    competitiveDefensibilityScore: null,
    campaignReadinessScore: null
  };

  // Use canonical product identity for consistent company naming across reports
  const company = executiveStory?.companyOverview || {
    name: productIdentity.companyName || input?.companyName || input?.productName || 'Unknown',
    website: input?.websiteUrl || '',
    industry: input?.industry || 'Unknown',
    businessModel: 'Unknown',
    b2bOrB2C: 'Unknown',
    targetMarket: 'Unknown',
    headquarters: 'Unknown',
    employeeEstimate: 'Unknown',
    fundingStage: 'Unknown',
    domain: '',
    category: 'Unknown'
  };

  const technologyData = {
    technologies: extractTechnologies(market, product, seo)
  };

  const pricing = {
    tiers: extractArray(product?.pricingTiers || product?.pricing),
    hasFree: false,
    hasFreeTrial: false,
    hasEnterprise: false,
    hasCustomPricing: false,
    currency: null,
    billingPeriods: []
  };

  const competitorData = {
    direct: extractArray(competitor?.directCompetitors || competitor?.competitors),
    indirect: extractArray(competitor?.indirectCompetitors),
    all: [...extractArray(competitor?.directCompetitors || competitor?.competitors), ...extractArray(competitor?.indirectCompetitors)]
  };

  const audienceData = {
    personas: extractArray(audience?.buyerPersonas || audience?.personas),
    segments: extractArray(audience?.audienceSegments),
    channels: extractArray(audience?.bestChannels)
  };

  const marketData = {
    tam: market?.tam ?? market?.marketSize?.tam ?? 'Not measured',
    sam: market?.sam ?? market?.marketSize?.sam ?? 'Not measured',
    som: market?.som ?? market?.marketSize?.som ?? 'Not measured',
    growthRate: market?.growthRate ?? market?.marketGrowthRate ?? 'Not measured',
    trends: extractArray(market?.marketTrends || market?.trends),
    opportunities: extractArray(market?.growthOpportunities || market?.opportunities),
    risks: extractArray(market?.marketRisks || market?.risks),
    growthSignals: extractArray(market?.growthSignals),
  };

  const positioningData = {
    positioningStatement: positioning?.positioningStatement || 'Unknown',
    valueProposition: positioning?.valueProposition || 'Unknown'
  };

  const actionPlanData = {
    day7: extractArray(actionPlan?.day7 || actionPlan?.sevenDay),
    day30: extractArray(actionPlan?.day30 || actionPlan?.thirtyDay),
    day60: extractArray(actionPlan?.day60 || actionPlan?.sixtyDay),
    day90: extractArray(actionPlan?.day90 || actionPlan?.ninetyDay),
    day180: extractArray(actionPlan?.day180),
    day365: extractArray(actionPlan?.day365)
  };

  const channelData = extractArray(channel?.recommendedChannels || channel?.channels);

  return {
    company, market: marketData, audience: audienceData, competitor: competitorData,
    intent, positioning: positioningData, pricing,
    technology: technologyData, scores, actionPlan: actionPlanData,
    channelData, product, campaign, seo, executiveStory,
    productIdentity, // Phase 22: Include canonical product identity for consistency
    chat: { id: chatId, input }
  };
}

export async function generateExecutiveReport(chatId, userId, format = 'pdf') {
  console.log(`[Report] type=executive format=${format} chatId=${chatId}`);
  console.log('[Report] data loaded');
  const data = await buildReportData(chatId, userId);

  console.log(`[Report] generator started format=${format}`);
  try {
    let result;
    switch (format) {
      case 'pdf': {
        const html = buildExecutiveReportHtml(data);
        result = await generatePdf(html, { format: 'A4', landscape: false });
        break;
      }
      case 'docx': {
        result = await generateDocx(data);
        break;
      }
      case 'pptx': {
        result = await generatePptx(data);
        break;
      }
      case 'json': {
        result = Buffer.from(JSON.stringify(data, null, 2));
        break;
      }
      case 'csv': {
        result = Buffer.from(generateCsv(data));
        break;
      }
      case 'markdown': {
        result = Buffer.from(generateMarkdown(data, 'executive'));
        break;
      }
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
    console.log(`[Report] generator finish format=${format}`);
    return result;
  } catch (error) {
    console.error(`[Report] generator failure format=${format}:`, error.message);
    throw error;
  }
}

export async function generateGrowthReport(chatId, userId, format = 'pdf') {
  console.log(`[Report] type=growth format=${format} chatId=${chatId}`);
  console.log('[Report] data loaded');
  const data = await buildReportData(chatId, userId);

  console.log(`[Report] generator started format=${format}`);
  try {
    let result;
    switch (format) {
      case 'pdf': {
        const html = buildGrowthReportHtml(data);
        result = await generatePdf(html, { format: 'A4', landscape: false });
        break;
      }
      case 'docx':
        result = await generateDocx(data);
        break;
      case 'pptx':
        result = await generatePptx(data);
        break;
      case 'json':
        result = Buffer.from(JSON.stringify(data, null, 2));
        break;
      case 'csv':
        result = Buffer.from(generateCsv(data));
        break;
      case 'markdown':
        result = Buffer.from(generateMarkdown(data, 'growth'));
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
    console.log(`[Report] generator finish format=${format}`);
    return result;
  } catch (error) {
    console.error(`[Report] generator failure format=${format}:`, error.message);
    throw error;
  }
}

export async function generateSeoReport(chatId, userId, format = 'pdf') {
  console.log(`[Report] type=seo format=${format} chatId=${chatId}`);
  console.log('[Report] data loaded');
  const data = await buildReportData(chatId, userId);

  console.log(`[Report] generator started format=${format}`);
  try {
    let result;
    switch (format) {
      case 'pdf': {
        const html = buildSeoReportHtml(data);
        result = await generatePdf(html, { format: 'A4', landscape: false });
        break;
      }
      case 'docx':
        result = await generateDocx(data);
        break;
      case 'pptx':
        result = await generatePptx(data);
        break;
      case 'json':
        result = Buffer.from(JSON.stringify(data, null, 2));
        break;
      case 'csv':
        result = Buffer.from(generateCsv(data));
        break;
      case 'markdown':
        result = Buffer.from(generateMarkdown(data, 'seo'));
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
    console.log(`[Report] generator finish format=${format}`);
    return result;
  } catch (error) {
    console.error(`[Report] generator failure format=${format}:`, error.message);
    throw error;
  }
}

export async function generateCompleteReport(chatId, userId, format = 'pdf') {
  console.log(`[Report] type=complete format=${format} chatId=${chatId}`);
  console.log('[Report] data loaded');
  const data = await buildReportData(chatId, userId);

  console.log(`[Report] generator started format=${format}`);
  try {
    let result;
    switch (format) {
      case 'pdf': {
        const html = buildGrowthReportHtml(data);
        result = await generatePdf(html, { format: 'A4', landscape: false });
        break;
      }
      case 'json':
        result = Buffer.from(JSON.stringify(data, null, 2));
        break;
      default:
        throw new Error(`Complete report only supports PDF and JSON formats`);
    }
    console.log(`[Report] generator finish format=${format}`);
    return result;
  } catch (error) {
    console.error(`[Report] generator failure format=${format}:`, error.message);
    throw error;
  }
}

export async function generateReportCharts(chatId, userId) {
  const data = await buildReportData(chatId, userId);
  const charts = {};

  charts.scoreRadar = generateScoreRadarChart(data.scores);

  if (data.competitor.direct.length > 0) {
    charts.competitorComparison = generateCompetitorComparisonChart(data.competitor.direct);
  }

  if (data.channelData && data.channelData.length > 0) {
    charts.channelAllocation = generateChannelAllocationChart(data.channelData);
  }

  if (data.seo?.keywords?.length > 0) {
    charts.keywordDistribution = generateKeywordDistributionChart(data.seo.keywords);
  }

  if (data.market.opportunities.length > 0) {
    charts.growthMatrix = generateGrowthMatrixChart(data.market.opportunities);
  }

  if (data.market.trends.length > 0) {
    charts.marketTrend = generateTrendChartSvg(
      data.market.trends.slice(0, 10).map((t, i) => ({
        label: typeof t === 'string' ? t.substring(0, 20) : t.keyword?.substring(0, 20) || `Point ${i + 1}`,
        value: null
      }))
    );
  }

  return charts;
}

function normalizeSeoIntelligence(seoIntel) {
  // Prefer JSON columns (always complete) over structured relations (may be empty)
  const keywordRecord = seoIntel.keywordOpportunities || seoIntel.keywordIntelligence || {};
  const competitorRecord = seoIntel.competitorKeywords || seoIntel.competitorSeoRecord || {};
  const gapRecord = seoIntel.contentGaps || seoIntel.contentGapRecord || {};
  const geoRecord = seoIntel.aiVisibility || seoIntel.geoIntelligence || {};
  const blogRecord = seoIntel.blogIdeas || seoIntel.blogIntelligenceRecord || {};

  return {
    scores: normalizeTechnicalAuditForConsumers(seoIntel?.technicalAuditDetail || seoIntel?.technicalAudit || {}),
    keywords: normalizeSeoKeywordArray(keywordRecord),
    competitors: extractArray(competitorRecord?.competitors || competitorRecord?.competitorProfiles || competitorRecord),
    gaps: extractArray(gapRecord?.contentGaps || gapRecord?.gaps || gapRecord?.missingPages || []),
    geo: {
      ...geoRecord,
      chatgpt: geoRecord.chatGptScore ?? geoRecord.chatGpt,
      gemini: geoRecord.geminiScore ?? geoRecord.gemini,
      claude: geoRecord.claudeScore ?? geoRecord.claude,
      perplexity: geoRecord.perplexityScore ?? geoRecord.perplexity,
      googleAiOverview: geoRecord.googleAiOverviewScore ?? geoRecord.googleAiOverview,
    },
    blogs: extractArray(blogRecord?.blogIdeas || blogRecord?.ideas || []),
    backlinks: seoIntel.rawCrawlData?.[0]?.metadata?.backlinks || {},
    actionPlan: seoIntel.actionPlan || {}
  };
}

function normalizeSeoKeywordArray(keywordRecord) {
  if (!keywordRecord) return [];
  if (Array.isArray(keywordRecord)) {
    return keywordRecord.map(k => {
      if (typeof k === 'string') return k;
      if (typeof k === 'object' && k !== null) return k.keyword || k.term || k.title || k.value || k.name || '';
      return String(k);
    }).filter(Boolean);
  }
  if (typeof keywordRecord === 'object') {
    const result = [];
    ['primaryKeywords', 'secondaryKeywords', 'longTailKeywords', 'questionKeywords', 'competitorKeywords', 'contentOpportunities', 'geoKeywords', 'blogIdeas'].forEach(key => {
      if (Array.isArray(keywordRecord[key])) {
        keywordRecord[key].forEach(k => {
          if (typeof k === 'string') result.push(k);
          else if (typeof k === 'object' && k !== null) result.push(k.keyword || k.term || k.title || k.value || k.name || '');
        });
      } else if (typeof keywordRecord[key] === 'string') {
        result.push(keywordRecord[key]);
      }
    });
    return result.length > 0 ? result.filter(Boolean) : extractArray(keywordRecord);
  }
  return [];
}

function generateMarkdown(data, type = 'executive') {
  const { company, market, audience, competitor, technology, pricing, scores, actionPlan, channelData, seo } = data;
  let md = '';
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const name = company?.name || 'Company';

  if (type === 'seo') {
    md += `# SEO Intelligence Report — ${name}\n\n`;
    md += `**Generated:** ${date} | **Classification:** Confidential\n\n`;
    md += `---\n\n`;
    md += `## 1. SEO Executive Summary\n\n`;
    const scores2 = seo?.scores || {};
    const overall = scores2.seoScore || scores2.overall;
    md += `| Metric | Value |\n| --- | --- |\n`;
    md += `| SEO Score | ${overall != null ? `${overall}/100` : 'N/A'} |\n`;
    md += `| Performance | ${scores2.performanceScore != null ? `${scores2.performanceScore}/100` : 'N/A'} |\n`;
    md += `| Accessibility | ${scores2.accessibilityScore != null ? `${scores2.accessibilityScore}/100` : 'N/A'} |\n`;
    md += `| Best Practices | ${scores2.bestPracticesScore != null ? `${scores2.bestPracticesScore}/100` : 'N/A'} |\n\n`;
    md += `## 2. Keyword Intelligence\n\n`;
    if (seo?.keywords?.length > 0) {
      md += `| Keyword | Volume | Difficulty | Intent |\n| --- | --- | --- | --- |\n`;
      seo.keywords.slice(0, 30).forEach(k => {
        md += `| ${k.keyword || k} | ${k.volume || k.searchVolume || 'N/A'} | ${k.keywordDifficulty || k.difficulty || 'N/A'}/100 | ${k.intent || 'Informational'} |\n`;
      });
      md += '\n';
    } else {
      md += '> Keyword data unavailable. Configure DataForSEO API for verified keyword intelligence.\n\n';
    }
    md += `## 3. Competitor SEO Analysis\n\n`;
    if (seo?.competitors?.length > 0) {
      md += `| Competitor | Domain | Authority | Traffic |\n| --- | --- | --- | --- |\n`;
      seo.competitors.slice(0, 10).forEach(c => {
        md += `| ${c.name || c.domain || 'Unknown'} | ${c.domain || 'N/A'} | ${c.seoAuthority || c.estimatedAuthority || 'N/A'}/100 | ${c.estimatedTraffic || 'N/A'} |\n`;
      });
      md += '\n';
    } else {
      md += '> Competitor SEO data unavailable. Configure DataForSEO for competitor analysis.\n\n';
    }
    md += `## 4. Content Gap Analysis\n\n`;
    if (seo?.gaps?.length > 0) {
      md += `| Topic | Priority | Volume |\n| --- | --- | --- |\n`;
      seo.gaps.slice(0, 15).forEach(g => {
        md += `| ${g.value || g.topic || g.title || g} | ${g.priority || g.severity || 'Medium'} | ${g.searchVolume || g.volume || 'N/A'} |\n`;
      });
      md += '\n';
    } else {
      md += '> Content gap data unavailable. Run competitor keyword analysis.\n\n';
    }
    md += `## 5. GEO / AI Visibility\n\n`;
    const geo = seo?.geo || {};
    const geoPlatforms = ['chatgpt','gemini','claude','perplexity','googleAiOverview'];
    const geoAvail = geoPlatforms.filter(p => geo[p] !== undefined);
    if (geoAvail.length > 0) {
      geoAvail.forEach(p => {
        md += `- **${p.replace(/([A-Z])/g, ' $1').trim()}:** ${geo[p]}/100\n`;
      });
      md += '\n';
    } else {
      md += '> AI visibility data unavailable. GEO analysis requires configured AI crawler data.\n\n';
    }
    md += `## 6. SEO Action Plan\n\n`;
    const plan = seo?.actionPlan || {};
    const seoPhases = [
      { label: 'Immediate (0-7 Days)', items: plan.immediate || plan.day7 || [] },
      { label: 'Short-term (8-30 Days)', items: plan.day30 || plan.day14 || [] },
      { label: 'Medium-term (31-60 Days)', items: plan.day60 || plan.day30 || [] },
      { label: 'Long-term (61-90 Days)', items: plan.day90 || plan.day60 || [] }
    ];
    const hasSeoPlan = seoPhases.some(p => p.items.length > 0);
    if (hasSeoPlan) {
      seoPhases.filter(p => p.items.length > 0).forEach(p => {
        md += `### ${p.label}\n\n`;
        md += `| Action | Priority | Impact |\n| --- | --- | --- |\n`;
        p.items.slice(0, 8).forEach(a => {
          md += `| ${a.title || a.action || a.task || a.recommendation || a} | ${a.priority || a.severity || 'Medium'} | ${a.impact || a.area || a.reason || 'N/A'} |\n`;
        });
        md += '\n';
      });
    } else {
      md += '> SEO action plan unavailable. Run full audit to generate prioritized recommendations.\n\n';
    }
  } else {
    const reportTitle = type === 'growth' ? 'Growth Strategy Report' : 'Executive Strategy Report';
    md += `# ${reportTitle} — ${name}\n\n`;
    md += `**Generated:** ${date} | **Classification:** Confidential | **Platform:** AI Marketing Platform v3.0\n\n`;
    md += `---\n\n`;

    md += `## 1. Executive Summary & KPI Dashboard\n\n`;
    md += `| Metric | Value |\n| --- | --- |\n`;
    md += `| Overall Score | ${scores?.overallGrowthScore ?? null}/100 |\n`;
    md += `| Market Opportunity | ${scores?.marketOpportunityScore ?? null}/100 |\n`;
    md += `| Audience Clarity | ${scores?.audienceClarityScore ?? null}/100 |\n`;
    md += `| Competitive Defensibility | ${scores?.competitiveDefensibilityScore ?? null}/100 |\n`;
    md += `| Campaign Readiness | ${scores?.campaignReadinessScore ?? null}/100 |\n\n`;

    md += `## 2. Company Overview\n\n`;
    md += `| Attribute | Value |\n| --- | --- |\n`;
    md += `| Name | ${company?.name || 'Unknown'} |\n`;
    md += `| Domain | ${company?.domain || 'Unknown'} |\n`;
    md += `| Industry | ${company?.industry || 'Unknown'} |\n`;
    md += `| Category | ${company?.category || 'Unknown'} |\n`;
    md += `| Business Model | ${company?.businessModel || 'Unknown'} |\n`;
    md += `| B2B / B2C | ${company?.b2bOrB2C || 'Unknown'} |\n`;
    md += `| Target Market | ${company?.targetMarket || 'Unknown'} |\n`;
    md += `| Headquarters | ${company?.headquarters || 'Unknown'} |\n`;
    md += `| Employees | ${company?.employeeEstimate || 'Unknown'} |\n`;
    md += `| Funding Stage | ${company?.fundingStage || 'Unknown'} |\n\n`;

    md += `## 3. SWOT Analysis\n\n`;
    md += `### Strengths\n`;
    md += `- Technology infrastructure with verified stack\n`;
    md += `- Clear market positioning and business model\n`;
    md += `- Data-driven intelligence platform coverage\n\n`;
    md += `### Weaknesses\n`;
    md += `- Data gaps requiring additional API integrations\n`;
    md += `- Analytics connectivity needed for performance metrics\n\n`;
    const opportunities = market?.opportunities || [];
    if (opportunities.length > 0) {
      md += `### Opportunities\n`;
      opportunities.slice(0, 4).forEach(o => {
        md += `- ${typeof o === 'string' ? o : o.value || o.name || o.opportunity || o}\n`;
      });
      md += '\n';
    }
    const risks = market?.risks || [];
    if (risks.length > 0) {
      md += `### Threats\n`;
      risks.slice(0, 4).forEach(r => {
        md += `- ${typeof r === 'string' ? r : r.value || r.name || r.risk || r}\n`;
      });
      md += '\n';
    }

    md += `## 4. Market Intelligence\n\n`;
    md += `- **TAM:** ${market?.tam || 'Unknown'}\n`;
    md += `- **SAM:** ${market?.sam || 'Unknown'}\n`;
    md += `- **SOM:** ${market?.som || 'Unknown'}\n`;
    md += `- **Growth Rate:** ${market?.growthRate || 'Unknown'}\n\n`;
    const trends = market?.trends || [];
    if (trends.length > 0) {
      md += `### Trends\n`;
      trends.slice(0, 8).forEach(t => {
        md += `- ${typeof t === 'string' ? t : t.keyword || t.signal || t.value || t}\n`;
      });
      md += '\n';
    }

    md += `## 5. Competitive Landscape\n\n`;
    const directComps = competitor?.direct || [];
    if (directComps.length > 0) {
      md += `| Competitor | Domain | Type | Similarity |\n| --- | --- | --- | --- |\n`;
      directComps.forEach(c => {
        md += `| ${c.name || 'Unknown'} | ${c.domain || 'N/A'} | ${c.type || 'N/A'} | ${c.similarityScore || 'N/A'}/100 |\n`;
      });
      md += '\n';
    } else {
      md += '> No direct competitors identified from verified sources.\n\n';
    }

    const personas = audience?.personas || [];
    if (personas.length > 0) {
      md += `## 6. Audience Intelligence\n\n`;
      personas.forEach(p => {
        md += `### ${p.role || p.name || 'Target Persona'}\n`;
        md += `- **Company Size:** ${p.companySize || 'N/A'}\n`;
        md += `- **Budget:** ${p.budget || 'N/A'}\n`;
        md += `- **Decision Authority:** ${p.decisionAuthority || 'N/A'}\n`;
        if ((p.painPoints || []).length > 0) {
          md += `- **Pain Points:** ${p.painPoints.join(', ')}\n`;
        }
        if ((p.goals || []).length > 0) {
          md += `- **Goals:** ${p.goals.join(', ')}\n`;
        }
        md += '\n';
      });
    }

    const techStack = technology?.technologies || [];
    if (techStack.length > 0) {
      md += `## 7. Technology Infrastructure\n\n`;
      const cats = {};
      techStack.forEach(t => {
        const c = t.category || 'other';
        if (!cats[c]) cats[c] = [];
        cats[c].push(t.name);
      });
      Object.entries(cats).forEach(([cat, names]) => {
        md += `- **${cat.charAt(0).toUpperCase() + cat.slice(1)}:** ${names.join(', ')}\n`;
      });
      md += '\n';
    }

    const tiers = pricing?.tiers || [];
    if (tiers.length > 0) {
      md += `## 8. Pricing Intelligence\n\n`;
      md += `| Tier | Free Trial | Enterprise |\n| --- | --- | --- |\n`;
      md += `| Pricing | ${pricing?.hasFreeTrial ? 'Yes' : 'No'} | ${pricing?.hasEnterprise ? 'Yes' : 'No'} |\n\n`;
    }

    md += `## 9. Implementation Roadmap\n\n`;
    if (actionPlan) {
      const hasActions = ['day7','day30','day60','day90','day180','day365'].some(k => (actionPlan[k] || []).length > 0);
      if (hasActions) {
        ['day7','day30','day60','day90','day180','day365'].forEach(period => {
          const tasks = actionPlan[period];
          if (tasks && tasks.length > 0) {
            md += `### ${period.replace('day', 'Day ')}\n\n`;
            md += `| Task | Owner | Priority | Impact |\n| --- | --- | --- | --- |\n`;
            tasks.slice(0, 5).forEach(t => {
              md += `| ${t.title || t.task || 'Task'} | ${t.owner || 'Unassigned'} | ${t.priority || 'Medium'} | ${t.impact || t.reason || t.evidence || 'N/A'} |\n`;
            });
            md += '\n';
          }
        });
      } else {
        md += '> Action plan data unavailable. Connect analytics to generate verified action items.\n\n';
      }
    }
  }

  md += `---\n`;
  md += `*Generated by AI Marketing Platform v3.0 | ${date} | CONFIDENTIAL*\n`;
  md += `*This report contains proprietary analysis. Do not distribute without authorization.*\n`;
  return md;
}

function extractTechnologies(market, product, seo) {
  const tech = [];
  const seen = new Set();

  const addTech = (name, category) => {
    if (!seen.has(name)) {
      seen.add(name);
      tech.push({ name, category });
    }
  };

  const source = product?.technologyStack || product?.technologies || market?.technologyStack || [];
  if (Array.isArray(source)) {
    source.forEach(t => {
      if (typeof t === 'string') addTech(t, 'detected');
      else if (t.name) addTech(t.name, t.category || 'detected');
    });
  }

  return tech;
}

function extractArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return [value];
  return [];
}

function generateCsv(data) {
  let csv = 'Section,Field,Value\n';

  csv += `Company,Name,${csvEscape(data.company?.name)}\n`;
  csv += `Company,Industry,${csvEscape(data.company?.industry)}\n`;
  csv += `Company,Business Model,${csvEscape(data.company?.businessModel)}\n`;
  csv += `Company,B2B/B2C,${csvEscape(data.company?.b2bOrB2C)}\n`;
  csv += `Company,Target Market,${csvEscape(data.company?.targetMarket)}\n`;
  csv += `Company,Headquarters,${csvEscape(data.company?.headquarters)}\n`;
  csv += `Company,Employees,${csvEscape(data.company?.employeeEstimate)}\n`;
  csv += `Company,Funding Stage,${csvEscape(data.company?.fundingStage)}\n`;
  csv += `Company,Domain,${csvEscape(data.company?.domain)}\n`;

  csv += `Market,TAM,${csvEscape(data.market?.tam)}\n`;
  csv += `Market,SAM,${csvEscape(data.market?.sam)}\n`;
  csv += `Market,SOM,${csvEscape(data.market?.som)}\n`;
  csv += `Market,Growth Rate,${csvEscape(data.market?.growthRate)}\n`;

  csv += `Scores,Overall Growth,${data.scores?.overallGrowthScore ?? null}\n`;
  csv += `Scores,Market Opportunity,${data.scores?.marketOpportunityScore ?? null}\n`;
  csv += `Scores,Audience Clarity,${data.scores?.audienceClarityScore ?? null}\n`;
  csv += `Scores,Competitive Defensibility,${data.scores?.competitiveDefensibilityScore ?? null}\n`;
  csv += `Scores,Campaign Readiness,${data.scores?.campaignReadinessScore ?? null}\n`;

  if (data.competitor?.direct?.length > 0) {
    data.competitor.direct.forEach(c => {
      csv += `Competitor (Direct),${csvEscape(c.name || c.domain)},${csvEscape(c.type || 'direct')}\n`;
    });
  }
  if (data.competitor?.indirect?.length > 0) {
    data.competitor.indirect.forEach(c => {
      csv += `Competitor (Indirect),${csvEscape(typeof c === 'string' ? c : c.name || c.domain)},indirect\n`;
    });
  }

  const personas = data.audience?.personas || [];
  personas.forEach(p => {
    csv += `Persona,${csvEscape(p.role || p.name)},CompanySize:${csvEscape(p.companySize)} | Budget:${csvEscape(p.budget)}\n`;
  });

  const techStack = data.technology?.technologies || [];
  techStack.forEach(t => {
    csv += `Technology,${csvEscape(t.name)},Category:${csvEscape(t.category || 'other')}\n`;
  });

  const tiers = data.pricing?.tiers || [];
  tiers.forEach(t => {
    csv += `Pricing,${csvEscape(t.name || t.plan)},Price:${csvEscape(t.price || t.amount)}\n`;
  });

  const trends = data.market?.trends || [];
  trends.slice(0, 10).forEach(t => {
    csv += `Market Trend,${csvEscape(typeof t === 'string' ? t : t.keyword || t.signal || t.value || t)},\n`;
  });

  const opportunities = data.market?.opportunities || [];
  opportunities.slice(0, 10).forEach(o => {
    csv += `Opportunity,${csvEscape(typeof o === 'string' ? o : o.value || o.name || o.opportunity || o)},\n`;
  });

  const risks = data.market?.risks || [];
  risks.slice(0, 10).forEach(r => {
    csv += `Risk,${csvEscape(typeof r === 'string' ? r : r.value || r.name || r.risk || r)},\n`;
  });

  if (data.seo?.keywords?.length > 0) {
    data.seo.keywords.slice(0, 30).forEach(k => {
      csv += `SEO Keyword,${csvEscape(k.keyword || k)},Volume:${k.volume || k.searchVolume || 'N/A'} | Difficulty:${k.keywordDifficulty || k.difficulty || 'N/A'} | Intent:${csvEscape(k.intent || 'Informational')}\n`;
    });
  }
  if (data.seo?.competitors?.length > 0) {
    data.seo.competitors.slice(0, 10).forEach(c => {
      csv += `SEO Competitor,${csvEscape(c.name || c.domain)},Authority:${c.seoAuthority || c.estimatedAuthority || 'N/A'} | Traffic:${c.estimatedTraffic || 'N/A'}\n`;
    });
  }
  if (data.seo?.gaps?.length > 0) {
    data.seo.gaps.slice(0, 15).forEach(g => {
      csv += `Content Gap,${csvEscape(g.value || g.topic || g.title || g)},Priority:${g.priority || g.severity || 'medium'}\n`;
    });
  }

  if (data.seo) {
    const geo = data.seo.geo || {};
    ['chatgpt','gemini','claude','perplexity','googleAiOverview'].forEach(p => {
      if (geo[p] !== undefined) csv += `GEO Visibility,${p},${geo[p]}/100\n`;
    });
  }

  return csv;
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
