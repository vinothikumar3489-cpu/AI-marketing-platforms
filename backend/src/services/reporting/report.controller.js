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

function generateMarkdown(data) {
  const { company, market, audience, competitor, technology, scores, actionPlan } = data;
  let md = `# ${company?.name || 'Company'} — Full Data Export\n\n`;
  md += `**Generated:** ${new Date().toISOString()}\n\n`;
  md += `## Company Overview\n\n`;
  md += `| Attribute | Value |\n| --- | --- |\n`;
  md += `| Name | ${company?.name || 'Unknown'} |\n`;
  md += `| Industry | ${company?.industry || 'Unknown'} |\n`;
  md += `| Business Model | ${company?.businessModel || 'Unknown'} |\n`;
  md += `| Target Market | ${company?.targetMarket || 'Unknown'} |\n`;
  md += `| Headquarters | ${company?.headquarters || 'Unknown'} |\n\n`;
  md += `## Market Sizing\n\n`;
  md += `- **TAM:** ${market?.tam || 'Unknown'}\n`;
  md += `- **SAM:** ${market?.sam || 'Unknown'}\n`;
  md += `- **SOM:** ${market?.som || 'Unknown'}\n\n`;
  md += `## Scores\n\n`;
  md += `- **Overall Growth Score:** ${scores?.overallGrowthScore || 0}/100\n\n`;
  if (competitor?.direct?.length > 0) {
    md += `## Direct Competitors\n\n`;
    competitor.direct.forEach(c => {
      md += `- **${c.name || c.domain}** (${c.type || 'direct'})\n`;
    });
    md += '\n';
  }
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
