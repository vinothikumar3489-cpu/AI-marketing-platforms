import { buildReportData, generateExecutiveReport, generateGrowthReport, generateSeoReport } from './report-builder.service.js';
import { prisma } from '../../config/prisma.js';

export const exportExecutiveReportHandler = async (req, res) => {
  const { chatId, format } = req.params;
  const userId = req.user?.id;

  console.log('[Report Controller] Export:', { chatId, format, userId });

  if (!chatId || !userId) {
    return res.status(400).json({ success: false, error: 'Missing chatId or user' });
  }

  const validFormats = ['pdf', 'docx', 'pptx', 'json', 'csv', 'markdown'];
  if (!validFormats.includes(format)) {
    return res.status(400).json({ success: false, error: `Unsupported format: ${format}. Supported: ${validFormats.join(', ')}` });
  }

  try {
    let buffer = await generateExecutiveReport(chatId, userId, format);
    if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
    sendFileResponse(res, buffer, format, `ExecutiveReport_${chatId}`);
  } catch (error) {
    console.error('[Report Controller] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Report generation failed' });
  }
};

export const exportGrowthReportHandler = async (req, res) => {
  const { chatId, format } = req.params;
  const userId = req.user?.id;

  if (!chatId || !userId) {
    return res.status(400).json({ success: false, error: 'Missing chatId or user' });
  }

  const validFormats = ['pdf', 'docx', 'pptx', 'json', 'csv', 'markdown'];
  if (!validFormats.includes(format)) {
    return res.status(400).json({ success: false, error: `Unsupported format: ${format}. Supported: ${validFormats.join(', ')}` });
  }

  try {
    let buffer = await generateGrowthReport(chatId, userId, format);
    if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
    sendFileResponse(res, buffer, format, `GrowthReport_${chatId}`);
  } catch (error) {
    console.error('[Report Controller] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Report generation failed' });
  }
};

export const exportSeoReportHandler = async (req, res) => {
  const { chatId, format } = req.params;
  const userId = req.user?.id;

  if (!chatId || !userId) {
    return res.status(400).json({ success: false, error: 'Missing chatId or user' });
  }

  const validFormats = ['pdf', 'docx', 'pptx', 'json', 'csv', 'markdown'];
  if (!validFormats.includes(format)) {
    return res.status(400).json({ success: false, error: `Unsupported format: ${format}. Supported: ${validFormats.join(', ')}` });
  }

  try {
    let buffer = await generateSeoReport(chatId, userId, format);
    if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
    sendFileResponse(res, buffer, format, `SEOReport_${chatId}`);
  } catch (error) {
    console.error('[Report Controller] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Report generation failed' });
  }
};

export const exportRawDataHandler = async (req, res) => {
  const { chatId, format } = req.params;
  const userId = req.user?.id;

  if (!chatId || !userId) {
    return res.status(400).json({ success: false, error: 'Missing chatId or user' });
  }

  const validFormats = ['json', 'csv', 'markdown'];
  if (!validFormats.includes(format)) {
    return res.status(400).json({ success: false, error: `Raw data supports: ${validFormats.join(', ')}` });
  }

  try {
    const data = await buildReportData(chatId, userId);

    let buffer;
    let filename;

    switch (format) {
      case 'json':
        buffer = Buffer.from(JSON.stringify(data, null, 2));
        filename = `FullData_${chatId}.json`;
        break;
      case 'csv':
        buffer = Buffer.from(generateCsv(data));
        filename = `FullData_${chatId}.csv`;
        break;
      case 'markdown':
        buffer = Buffer.from(generateMarkdown(data));
        filename = `FullData_${chatId}.md`;
        break;
      default:
        return res.status(400).json({ success: false, error: 'Invalid format' });
    }

    sendFileResponse(res, buffer, format, filename.replace(`.${format}`, ''));
  } catch (error) {
    console.error('[Report Controller] Error:', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Data export failed' });
  }
};

function sendFileResponse(res, buffer, format, filename) {
  const mimeTypes = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    json: 'application/json',
    csv: 'text/csv',
    markdown: 'text/markdown',
  };

  const ext = format === 'markdown' ? 'md' : format;
  const mime = mimeTypes[format] || 'application/octet-stream';

  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.${ext}"`);
  res.setHeader('Content-Length', buffer.length);
  return res.send(buffer);
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

  csv += `Scores,Overall Growth,${data.scores?.overallGrowthScore || 0}\n`;
  csv += `Scores,Market Opportunity,${data.scores?.marketOpportunityScore || 0}\n`;
  csv += `Scores,Audience Clarity,${data.scores?.audienceClarityScore || 0}\n`;
  csv += `Scores,Competitive Defensibility,${data.scores?.competitiveDefensibilityScore || 0}\n`;
  csv += `Scores,Campaign Readiness,${data.scores?.campaignReadinessScore || 0}\n`;

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

function generateMarkdown(data) {
  const { company, market, audience, competitor, technology, pricing, scores, actionPlan, channelData, seo } = data;
  let md = '';
  const name = company?.name || 'Company';
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  md += `# Full Data Export — ${name}\n\n`;
  md += `**Generated:** ${date} | **Classification:** Confidential\n\n`;
  md += `---\n\n`;

  md += `## 1. Company Overview\n\n`;
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

  md += `## 2. Performance Scores\n\n`;
  md += `| Score | Value |\n| --- | --- |\n`;
  md += `| Overall Growth | ${scores?.overallGrowthScore || 0}/100 |\n`;
  md += `| Market Opportunity | ${scores?.marketOpportunityScore || 0}/100 |\n`;
  md += `| Audience Clarity | ${scores?.audienceClarityScore || 0}/100 |\n`;
  md += `| Competitive Defensibility | ${scores?.competitiveDefensibilityScore || 0}/100 |\n`;
  md += `| Campaign Readiness | ${scores?.campaignReadinessScore || 0}/100 |\n\n`;

  md += `## 3. Market Intelligence\n\n`;
  md += `- **TAM:** ${market?.tam || 'Unknown'}\n`;
  md += `- **SAM:** ${market?.sam || 'Unknown'}\n`;
  md += `- **SOM:** ${market?.som || 'Unknown'}\n`;
  md += `- **Growth Rate:** ${market?.growthRate || 'Unknown'}\n\n`;
  const trends = market?.trends || [];
  if (trends.length > 0) {
    md += `### Market Trends\n`;
    trends.slice(0, 8).forEach(t => {
      md += `- ${typeof t === 'string' ? t : t.keyword || t.signal || t.value || t}\n`;
    });
    md += '\n';
  }
  const opportunities = market?.opportunities || [];
  if (opportunities.length > 0) {
    md += `### Opportunities\n`;
    opportunities.slice(0, 5).forEach(o => {
      md += `- ${typeof o === 'string' ? o : o.value || o.name || o.opportunity || o}\n`;
    });
    md += '\n';
  }
  const risks = market?.risks || [];
  if (risks.length > 0) {
    md += `### Risks\n`;
    risks.slice(0, 5).forEach(r => {
      md += `- ${typeof r === 'string' ? r : r.value || r.name || r.risk || r}\n`;
    });
    md += '\n';
  }

  md += `## 4. Competitive Landscape\n\n`;
  const directComps = competitor?.direct || [];
  if (directComps.length > 0) {
    md += `| Competitor | Domain | Type | Similarity |\n| --- | --- | --- | --- |\n`;
    directComps.forEach(c => {
      md += `| ${c.name || 'Unknown'} | ${c.domain || 'N/A'} | ${c.type || 'N/A'} | ${c.similarityScore || 'N/A'}/100 |\n`;
    });
    md += '\n';
  } else {
    md += '> No direct competitors identified.\n\n';
  }

  const personas = audience?.personas || [];
  if (personas.length > 0) {
    md += `## 5. Audience Personas\n\n`;
    personas.forEach(p => {
      md += `- **${p.role || p.name || 'Persona'}** (Size: ${p.companySize || 'N/A'} | Budget: ${p.budget || 'N/A'})\n`;
      if ((p.painPoints || []).length > 0) md += `  - Pain Points: ${p.painPoints.join(', ')}\n`;
    });
    md += '\n';
  }

  const techStack = technology?.technologies || [];
  if (techStack.length > 0) {
    md += `## 6. Technology Infrastructure\n\n`;
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
    md += `## 7. Pricing\n\n`;
    md += `- Free Tier: ${pricing?.hasFree ? 'Yes' : 'No'} | Free Trial: ${pricing?.hasFreeTrial ? 'Yes' : 'No'} | Enterprise: ${pricing?.hasEnterprise ? 'Yes' : 'No'}\n\n`;
  }

  if (seo?.keywords?.length > 0) {
    md += `## 8. SEO Keywords (${seo.keywords.length})\n\n`;
    md += `| Keyword | Volume | Difficulty | Intent |\n| --- | --- | --- | --- |\n`;
    seo.keywords.slice(0, 20).forEach(k => {
      md += `| ${k.keyword || k} | ${k.volume || k.searchVolume || 'N/A'} | ${k.keywordDifficulty || k.difficulty || 'N/A'} | ${k.intent || 'Informational'} |\n`;
    });
    md += '\n';
  }

  const chData = channelData || [];
  if (chData.length > 0) {
    md += `## 9. Channel Plan\n\n`;
    chData.slice(0, 10).forEach(c => {
      md += `- **${c.name || c.channel}** (Fit: ${c.fitScore || c.fit || 'N/A'} | Budget: ${c.budgetAllocation || 'N/A'}%)\n`;
    });
    md += '\n';
  }

  if (actionPlan) {
    const hasActions = ['day7','day30','day60','day90','day180','day365'].some(k => (actionPlan[k] || []).length > 0);
    if (hasActions) {
      md += `## 10. Action Plan\n\n`;
      ['day7','day30','day60','day90'].forEach(period => {
        const tasks = actionPlan[period] || [];
        if (tasks.length > 0) {
          md += `### ${period.replace('day', 'Day ')}\n\n`;
          tasks.slice(0, 5).forEach(t => {
            md += `- **${t.title || t.task || 'Task'}** (Priority: ${t.priority || 'Medium'}) — ${t.owner || 'Unassigned'}\n`;
          });
          md += '\n';
        }
      });
    }
  }

  md += `---\n`;
  md += `*Generated by AI Marketing Platform v3.0 | ${date} | CONFIDENTIAL*\n`;
  return md;
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
