import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, BorderStyle,
  PageNumber, Header, Footer, PageBreak, TableOfContents,
  ShadingType, convertInchesToTwip
} from 'docx';

export async function generateDocx(data) {
  console.log('[Report][DOCX] Generating DOCX...');

  const { company, market, audience, competitor, technology, pricing, scores } = data;
  const name = company?.name || 'Company';
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const children = [];

  // Cover page
  children.push(
    new Paragraph({ spacing: { before: 4000 } }),
    new Paragraph({
      children: [new TextRun({ text: name, size: 52, bold: true, color: '1e1b4b' })],
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Executive Strategy Report', size: 36, color: '4338ca' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }),
    new Paragraph({
      children: [new TextRun({ text: `Prepared: ${date}`, size: 22, color: '6b7280' })],
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({
      children: [new TextRun({ text: 'CONFIDENTIAL', size: 20, color: '9ca3af' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({ children: [new PageBreak()] })
  );

  // Table of Contents
  children.push(
    createHeading('Table of Contents', HeadingLevel.HEADING_1),
    createTocItem('1. Executive Summary'),
    createTocItem('2. Company Overview'),
    createTocItem('3. Technology Infrastructure'),
    createTocItem('4. Market Intelligence'),
    createTocItem('5. Competitive Landscape'),
    createTocItem('6. Audience Intelligence'),
    createTocItem('7. Pricing Intelligence'),
    createTocItem('8. Strategic Assessment'),
    new Paragraph({ children: [new PageBreak()] })
  );

  // Section 1: Executive Summary
  children.push(
    createHeading('1. Executive Summary', HeadingLevel.HEADING_1),
    createMetricTable([
      ['Overall Score', `${scores?.overallGrowthScore || 0}/100`],
      ['TAM', market?.tam || 'Unknown'],
      ['SAM', market?.sam || 'Unknown'],
      ['SOM', market?.som || 'Unknown'],
      ['Direct Competitors', String((competitor?.direct || []).length)],
      ['Technologies Detected', String((technology?.technologies || []).length)]
    ]),
    createInfoBox('Company', `${name} | ${company?.industry || 'Unknown'} | ${company?.businessModel || 'Unknown'}`),
    new Paragraph({ children: [new PageBreak()] })
  );

  // Section 2: Company Overview
  children.push(
    createHeading('2. Company Overview', HeadingLevel.HEADING_1),
    createDataTable([
      ['Attribute', 'Value'],
      ['Company Name', name],
      ['Domain', company?.domain || 'Unknown'],
      ['Industry', company?.industry || 'Unknown'],
      ['Category', company?.category || 'Unknown'],
      ['Business Model', company?.businessModel || 'Unknown'],
      ['B2B / B2C', company?.b2bOrB2C || 'Unknown'],
      ['Target Market', company?.targetMarket || 'Unknown'],
      ['Headquarters', company?.headquarters || 'Unknown'],
      ['Employee Estimate', company?.employeeEstimate || 'Unknown'],
      ['Funding Stage', company?.fundingStage || 'Unknown']
    ]),
    new Paragraph({ children: [new PageBreak()] })
  );

  // Section 3: Technology
  children.push(
    createHeading('3. Technology Infrastructure', HeadingLevel.HEADING_1),
    ...(technology?.technologies?.length > 0
      ? [createDataTable([
          ['Category', 'Technologies'],
          ...groupTechnologiesByCategory(technology.technologies)
        ])]
      : [createInfoBox('Note', 'Technology fingerprinting inconclusive')]),
    new Paragraph({ children: [new PageBreak()] })
  );

  // Section 4: Market Intelligence
  children.push(
    createHeading('4. Market Intelligence', HeadingLevel.HEADING_1),
    createMetricTable([
      ['TAM', market?.tam || 'Unknown'],
      ['SAM', market?.sam || 'Unknown'],
      ['SOM', market?.som || 'Unknown']
    ]),
    ...(market?.trends?.length > 0
      ? [createHeading('Market Trends', HeadingLevel.HEADING_2), ...market.trends.slice(0, 8).map(t => createBullet(typeof t === 'string' ? t : t.keyword || t.signal || t.value || ''))]
      : [createInfoBox('Note', 'Market trend data unavailable')]),
    new Paragraph({ children: [new PageBreak()] })
  );

  // Section 5: Competitive Landscape
  children.push(
    createHeading('5. Competitive Landscape', HeadingLevel.HEADING_1),
    ...((competitor?.direct || []).length > 0
      ? [createDataTable([
          ['Competitor', 'Domain', 'Type', 'Source'],
          ...competitor.direct.map(c => [c.name || 'Unknown', c.domain || 'N/A', c.type || 'direct', c.source || 'Unknown'])
        ])]
      : [createInfoBox('Note', 'No direct competitors identified from verified sources')]),
    new Paragraph({ children: [new PageBreak()] })
  );

  // Section 6: Audience
  children.push(
    createHeading('6. Audience Intelligence', HeadingLevel.HEADING_1),
    ...((audience?.personas || []).length > 0
      ? audience.personas.map(p => createPersonaBox(p))
      : [createInfoBox('Note', 'Audience persona data unavailable')]),
    new Paragraph({ children: [new PageBreak()] })
  );

  // Section 7: Pricing
  children.push(
    createHeading('7. Pricing Intelligence', HeadingLevel.HEADING_1),
    ...((pricing?.tiers || []).length > 0
      ? [
          createDataTable([
            ['Attribute', 'Value'],
            ['Free Tier', pricing?.hasFree ? 'Yes' : 'No'],
            ['Free Trial', pricing?.hasFreeTrial ? 'Yes' : 'No'],
            ['Enterprise Plan', pricing?.hasEnterprise ? 'Yes' : 'No'],
            ['Custom Pricing', pricing?.hasCustomPricing ? 'Yes' : 'No'],
            ['Currency', pricing?.currency || 'Unknown']
          ])
        ]
      : [createInfoBox('Note', 'Pricing information unavailable')]),
    new Paragraph({ children: [new PageBreak()] })
  );

  // Section 8: Strategic Assessment
  children.push(
    createHeading('8. Strategic Assessment', HeadingLevel.HEADING_1),
    createInfoBox('Top Opportunity', (market?.opportunities || [])[0] || 'Insufficient data for opportunity analysis', 'green'),
    createInfoBox('Primary Risk', (market?.risks || [])[0] || 'Insufficient data for risk analysis', 'red'),
    new Paragraph({ children: [new PageBreak()] })
  );

  // Section 9: Data Sources
  children.push(
    createHeading('9. Data Sources & Methodology', HeadingLevel.HEADING_1),
    new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: 'Collection Methods:', bold: true, size: 22 })] }),
    createBullet('Website scraping (Firecrawl / Cheerio)'),
    createBullet('Technology fingerprinting from page source'),
    createBullet('Market data from DataForSEO (if configured)'),
    createBullet('Competitor discovery via DataForSEO SERP + Tavily'),
    createBullet('Pricing extraction from scraped content'),
    new Paragraph({ spacing: { before: 200 }, children: [new TextRun({
      text: 'This report displays "Unknown" for any data point that could not be verified from collected evidence. No AI-generated, hallucinated, or estimated values are included.',
      italics: true, size: 20, color: '6b7280'
    })] })
  );

  const doc = new Document({
    title: `${name} Executive Strategy Report`,
    description: `Strategic market assessment for ${name}`,
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    sections: [{
      properties: {
        page: {
          margin: { top: convertInchesToTwip(1), bottom: convertInchesToTwip(1), left: convertInchesToTwip(1), right: convertInchesToTwip(1) }
        }
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [new TextRun({ text: 'AI Marketing Platform v3.0', size: 16, color: '9ca3af' })],
            alignment: AlignmentType.RIGHT
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [
              new TextRun({ text: 'CONFIDENTIAL — Page ', size: 16, color: '9ca3af' }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '9ca3af' }),
              new TextRun({ text: ' of ', size: 16, color: '9ca3af' }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '9ca3af' })
            ],
            alignment: AlignmentType.CENTER
          })]
        })
      },
      children
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  console.log('[Report][DOCX] DOCX generated successfully:', buffer.length, 'bytes');
  return buffer;
}

function createHeading(text, level) {
  return new Paragraph({
    text,
    heading: level,
    spacing: { before: 300, after: 200 },
    border: level === HeadingLevel.HEADING_1 ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: '6366f1' } } : undefined
  });
}

function createDataTable(rows) {
  if (!rows || rows.length < 2) return new Paragraph({ text: 'No data' });
  const isHeader = true;
  const tableRows = rows.map((row, i) => new TableRow({
    tableHeader: i === 0,
    children: row.map(cell => new TableCell({
      shading: i === 0 ? { type: ShadingType.SOLID, color: '1e1b4b' } : undefined,
      children: [new Paragraph({
        children: [new TextRun({
          text: cell || '',
          bold: i === 0,
          color: i === 0 ? 'FFFFFF' : '1f2937',
          size: 20
        })],
        alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.LEFT
      })]
    }))
  }));

  return new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE }
  });
}

function createMetricTable(rows) {
  const tableRows = rows.map(([label, value]) => new TableRow({
    children: [
      new TableCell({
        width: { size: 40, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20, color: '374151' })] })]
      }),
      new TableCell({
        width: { size: 60, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [new TextRun({ text: value || 'N/A', size: 20, color: '1e1b4b' })] })]
      })
    ]
  }));

  return new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE }
  });
}

function createInfoBox(title, content, type = 'default') {
  const colors = { default: { bg: 'EEF2FF', border: '6366f1' }, green: { bg: 'F0FDF4', border: '22C55E' }, red: { bg: 'FEF2F2', border: 'EF4444' } };
  const c = colors[type] || colors.default;
  return new Table({
    rows: [new TableRow({
      children: [new TableCell({
        shading: { type: ShadingType.SOLID, color: c.bg },
        children: [
          new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 20, color: '1f2937' })] }),
          new Paragraph({ children: [new TextRun({ text: content || '', size: 20, color: '4b5563' })] })
        ]
      })]
    })],
    width: { size: 100, type: WidthType.PERCENTAGE }
  });
}

function createPersonaBox(persona) {
  return new Table({
    rows: [new TableRow({
      children: [new TableCell({
        shading: { type: ShadingType.SOLID, color: 'F9FAFB' },
        children: [
          new Paragraph({ children: [new TextRun({ text: persona.role || persona.name || 'Target Persona', bold: true, size: 22, color: '4338ca' })] }),
          new Paragraph({ children: [new TextRun({ text: `Company Size: ${persona.companySize || 'Unknown'}`, size: 20 })] }),
          new Paragraph({ children: [new TextRun({ text: `Pain Points: ${(persona.painPoints || []).join(', ') || 'Unknown'}`, size: 20 })] }),
          new Paragraph({ children: [new TextRun({ text: `Goals: ${(persona.goals || []).join(', ') || 'Unknown'}`, size: 20 })] }),
          new Paragraph({ children: [new TextRun({ text: `Budget: ${persona.budget || 'Unknown'}`, size: 20 })] })
        ]
      })]
    })],
    width: { size: 100, type: WidthType.PERCENTAGE }
  });
}

function createBullet(text) {
  return new Paragraph({
    children: [new TextRun({ text: `  •  ${text}`, size: 20 })],
    spacing: { before: 60 }
  });
}

function createTocItem(text) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    spacing: { before: 80, after: 80 }
  });
}

function groupTechnologiesByCategory(technologies) {
  const cats = {};
  technologies.forEach(t => {
    const cat = t.category || 'other';
    if (!cats[cat]) cats[cat] = [];
    cats[cat].push(t.name);
  });
  return Object.entries(cats).map(([cat, names]) => [cat.charAt(0).toUpperCase() + cat.slice(1), names.join(', ')]);
}
