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
    overallGrowthScore: campaign?.growthSummary?.overallGrowthScore || 0,
    marketOpportunityScore: campaign?.growthSummary?.marketOpportunityScore || 0,
    audienceClarityScore: campaign?.growthSummary?.audienceClarityScore || 0,
    competitiveDefensibilityScore: campaign?.growthSummary?.competitiveDefensibilityScore || 0,
    campaignReadinessScore: campaign?.growthSummary?.campaignReadinessScore || 0
  };

  const company = executiveStory?.companyOverview || {
    name: input?.companyName || input?.productName || 'Unknown',
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
    tam: market?.tam || 'Unknown',
    sam: market?.sam || 'Unknown',
    som: market?.som || 'Unknown',
    growthRate: market?.cagr || 'Unknown',
    trends: extractArray(market?.marketTrends || market?.trends),
    opportunities: extractArray(market?.growthOpportunities || market?.opportunities),
    risks: extractArray(market?.marketRisks || market?.risks)
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
    // Use index-based deterministic values since no actual trend numbers exist
    charts.marketTrend = generateTrendChartSvg(
      data.market.trends.slice(0, 10).map((t, i) => ({
        label: typeof t === 'string' ? t.substring(0, 20) : t.keyword?.substring(0, 20) || `Point ${i + 1}`,
        value: 30 + (i * 7) % 60
      }))
    );
  }

  return charts;
}

function normalizeSeoIntelligence(seoIntel) {
  const keywordRecord = seoIntel.keywordIntelligence || seoIntel.keywordOpportunities || {};
  const competitorRecord = seoIntel.competitorSeoRecord || seoIntel.competitorKeywords || {};
  const gapRecord = seoIntel.contentGapRecord || { contentGaps: seoIntel.contentGaps || [] };
  const geoRecord = seoIntel.geoIntelligence || seoIntel.aiVisibility || {};
  const blogRecord = seoIntel.blogIntelligenceRecord || { blogIdeas: seoIntel.blogIdeas || [] };

  return {
    scores: seoIntel.technicalAuditDetail || seoIntel.technicalAudit || {},
    keywords: normalizeSeoKeywordArray(keywordRecord),
    competitors: extractArray(competitorRecord?.competitors || competitorRecord?.competitorProfiles || competitorRecord),
    gaps: extractArray(gapRecord?.contentGaps || seoIntel.contentGaps),
    geo: {
      chatgpt: geoRecord.chatGptScore ?? geoRecord.chatGpt ?? geoRecord.chatGptScore ?? geoRecord.chatGptScore,
      gemini: geoRecord.geminiScore ?? geoRecord.gemini,
      claude: geoRecord.claudeScore ?? geoRecord.claude,
      perplexity: geoRecord.perplexityScore ?? geoRecord.perplexity,
      googleAiOverview: geoRecord.googleAiOverviewScore ?? geoRecord.googleAiOverview,
      ...geoRecord
    },
    blogs: extractArray(blogRecord?.blogIdeas || seoIntel.blogIdeas),
    backlinks: seoIntel.rawCrawlData?.[0]?.metadata?.backlinks || seoIntel.rawCrawlData?.metadata?.backlinks || {},
    actionPlan: seoIntel.actionPlan || {}
  };
}

function normalizeSeoKeywordArray(keywordRecord) {
  if (!keywordRecord) return [];
  if (Array.isArray(keywordRecord)) return keywordRecord;
  if (typeof keywordRecord === 'object') {
    const result = [];
    ['primaryKeywords', 'secondaryKeywords', 'longTailKeywords', 'questionKeywords', 'competitorKeywords', 'contentOpportunities', 'geoKeywords', 'blogIdeas'].forEach(key => {
      if (Array.isArray(keywordRecord[key])) {
        result.push(...keywordRecord[key]);
      } else if (typeof keywordRecord[key] === 'string') {
        result.push(keywordRecord[key]);
      }
    });
    return result.length > 0 ? result : extractArray(keywordRecord);
  }
  return [];
}

function generateMarkdown(data, type = 'executive') {
  const { company, market, audience, competitor, technology, scores, actionPlan, seo } = data;
  let md = '';
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  if (type === 'seo') {
    md += `# SEO Intelligence Report — ${company?.name || 'Company'}\n\n`;
    md += `**Generated:** ${date}\n\n`;
    md += `## SEO Scores\n\n`;
    if (seo?.scores) {
      Object.entries(seo.scores).forEach(([k, v]) => {
        md += `- **${k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}:** ${v || 'N/A'}\n`;
      });
    }
    md += '\n';
    if (seo?.keywords?.length > 0) {
      md += `## Keywords (${seo.keywords.length})\n\n`;
      seo.keywords.slice(0, 20).forEach(k => {
        md += `- ${k.keyword || k} (Volume: ${k.volume || k.searchVolume || 'N/A'}, Difficulty: ${k.keywordDifficulty || k.difficulty || 'N/A'})\n`;
      });
      md += '\n';
    }
    if (seo?.competitors?.length > 0) {
      md += `## SEO Competitors (${seo.competitors.length})\n\n`;
      seo.competitors.slice(0, 10).forEach(c => {
        md += `- ${c.name || c.domain || 'Unknown'}\n`;
      });
      md += '\n';
    }
  } else {
    md += `# ${company?.name || 'Company'} — ${type === 'growth' ? 'Growth Strategy Report' : 'Executive Report'}\n\n`;
    md += `**Generated:** ${date}\n\n`;
    md += `## Company Overview\n\n`;
    md += `| Attribute | Value |\n| --- | --- |\n`;
    md += `| Name | ${company?.name || 'Unknown'} |\n`;
    md += `| Industry | ${company?.industry || 'Unknown'} |\n`;
    md += `| Business Model | ${company?.businessModel || 'Unknown'} |\n`;
    md += `| Target Market | ${company?.targetMarket || 'Unknown'} |\n`;
    md += `| B2B / B2C | ${company?.b2bOrB2C || 'Unknown'} |\n`;
    md += `| Headquarters | ${company?.headquarters || 'Unknown'} |\n\n`;
    md += `## Market Intelligence\n\n`;
    md += `- **TAM:** ${market?.tam || 'Unknown'}\n`;
    md += `- **SAM:** ${market?.sam || 'Unknown'}\n`;
    md += `- **SOM:** ${market?.som || 'Unknown'}\n`;
    md += `- **Growth Rate (CAGR):** ${market?.growthRate || 'Unknown'}\n\n`;
    md += `## Performance Scores\n\n`;
    md += `| Score | Value |\n| --- | --- |\n`;
    md += `| Overall Growth | ${scores?.overallGrowthScore || 0}/100 |\n`;
    md += `| Market Opportunity | ${scores?.marketOpportunityScore || 0}/100 |\n`;
    md += `| Audience Clarity | ${scores?.audienceClarityScore || 0}/100 |\n`;
    md += `| Competitive Defensibility | ${scores?.competitiveDefensibilityScore || 0}/100 |\n`;
    md += `| Campaign Readiness | ${scores?.campaignReadinessScore || 0}/100 |\n\n`;
    if (competitor?.direct?.length > 0) {
      md += `## Direct Competitors (${competitor.direct.length})\n\n`;
      competitor.direct.forEach(c => {
        md += `- **${c.name || c.domain}** (Similarity: ${c.similarityScore || 'N/A'})\n`;
      });
      md += '\n';
    }
    if (audience?.personas?.length > 0) {
      md += `## Audience Personas (${audience.personas.length})\n\n`;
      audience.personas.forEach(p => {
        md += `- **${p.role || p.name || 'Persona'}** — ${(p.painPoints || []).slice(0, 3).join(', ') || 'N/A'}\n`;
      });
      md += '\n';
    }
    if (market?.trends?.length > 0) {
      md += `## Market Trends\n\n`;
      market.trends.slice(0, 8).forEach(t => {
        md += `- ${typeof t === 'string' ? t : t.keyword || t.signal || 'Trend'}\n`;
      });
      md += '\n';
    }
    if (actionPlan) {
      md += `## Action Plan\n\n`;
      ['day7', 'day30', 'day60', 'day90'].forEach(period => {
        const tasks = actionPlan[period];
        if (tasks && tasks.length > 0) {
          md += `### ${period.replace('day', 'Day ')}\n\n`;
          tasks.slice(0, 5).forEach(t => {
            md += `- **${t.title || t.task || 'Task'}** (${t.priority || 'Medium'}) — ${t.owner || 'Unassigned'}\n`;
          });
          md += '\n';
        }
      });
    }
  }

  md += `---\n*Generated by AI Marketing Platform v3.0 | ${date} | CONFIDENTIAL*\n`;
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
  csv += `Market,TAM,${csvEscape(data.market?.tam)}\n`;
  csv += `Market,SAM,${csvEscape(data.market?.sam)}\n`;
  csv += `Market,SOM,${csvEscape(data.market?.som)}\n`;
  csv += `Scores,Overall,${data.scores?.overallGrowthScore || 0}\n`;

  if (data.competitor?.direct?.length > 0) {
    data.competitor.direct.forEach(c => {
      csv += `Competitor,${csvEscape(c.name || c.domain)},${csvEscape(c.type || 'direct')}\n`;
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
