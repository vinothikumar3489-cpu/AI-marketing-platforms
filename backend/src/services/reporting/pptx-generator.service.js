import PptxGenJS from 'pptxgenjs';

export async function generatePptx(data) {
  console.log('[Report][PPTX] generator start');

  try {
    const { company, market, audience, competitor, technology, pricing, scores, actionPlan, seo } = data || {};
    const name = company?.name || 'Company';
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const hasSeo = seo?.keywords?.length > 0 || seo?.scores?.overall !== undefined;
    const isExecutive = !hasSeo;
    const reportType = hasSeo ? 'SEO Intelligence Report' : (isExecutive ? 'Executive Strategy Report' : 'Growth Strategy Report');

    const pptx = new PptxGenJS();
    pptx.author = 'AI Marketing Platform';
    pptx.company = name;
    pptx.title = `${name} ${reportType}`;
    pptx.subject = 'Enterprise Market Intelligence Report';

    const C = { dark: '1E293B', primary: '6366F1', secondary: '059669', accent: 'D97706', danger: 'DC2626', muted: '64748B', light: 'F1F5F9', white: 'FFFFFF' };
    const FONT = 'Calibri';

    // ----------------------------------------------------------------
    // Slide 1: Cover
    // ----------------------------------------------------------------
    const cover = pptx.addSlide();
    cover.background = { color: C.dark };
    cover.addShape(pptx.ShapeType.rect, { x: 3.5, y: 2.1, w: 1, h: 0.06, fill: { color: C.primary } });
    cover.addText(name, { x: 0.5, y: 0.8, w: 9, h: 0.6, fontSize: 11, fontFace: FONT, color: '94A3B8', align: 'center' });
    cover.addText(reportType, { x: 0.5, y: 2.4, w: 9, h: 1, fontSize: 32, fontFace: FONT, color: C.white, bold: true, align: 'center' });
    cover.addText('Strategic Market Assessment & Growth Intelligence', { x: 0.5, y: 3.4, w: 9, h: 0.6, fontSize: 16, fontFace: FONT, color: 'A5B4FC', align: 'center' });
    cover.addText(`Prepared: ${date}`, { x: 0.5, y: 4.8, w: 9, h: 0.4, fontSize: 11, fontFace: FONT, color: '94A3B8', align: 'center' });
    cover.addText('CONFIDENTIAL  |  AI Marketing Platform v3.0', { x: 0.5, y: 5.2, w: 9, h: 0.4, fontSize: 9, fontFace: FONT, color: '64748B', align: 'center' });

    // ----------------------------------------------------------------
    // Slide 2: Table of Contents
    // ----------------------------------------------------------------
    const toc = pptx.addSlide();
    toc.background = { color: C.white };
    toc.addText('Table of Contents', { x: 0.5, y: 0.3, w: 9, h: 0.7, fontSize: 26, fontFace: FONT, color: C.dark, bold: true });
    toc.addShape(pptx.ShapeType.rect, { x: 0.5, y: 0.95, w: 2, h: 0.04, fill: { color: C.primary } });
    const tocItems = [
      'Executive Summary & KPI Dashboard', 'Company Overview', 'SWOT Analysis',
      hasSeo ? 'Technical Audit' : 'Technology Infrastructure',
      hasSeo ? 'Keyword Intelligence' : 'Market Intelligence',
      hasSeo ? 'Competitor SEO' : (isExecutive ? 'Competitive Landscape' : 'Audience Intelligence'),
      hasSeo ? 'Content Gaps & GEO Visibility' : (isExecutive ? 'Audience & Pricing' : 'Competitive Landscape'),
      hasSeo ? 'SEO Action Plan' : 'Strategic Assessment & Risk Register',
      'Implementation Roadmap', 'Executive Conclusion', 'Evidence & Methodology'
    ];
    tocItems.forEach((s, i) => {
      const col = i < 6 ? 0 : 1;
      const idx = i < 6 ? i : i - 6;
      const x = col === 0 ? 0.5 : 5.2;
      toc.addText(`${String(i + 1).padStart(2, '0')}.  ${s}`, { x, y: 1.3 + idx * 0.55, w: 4.3, h: 0.45, fontSize: 12, fontFace: FONT, color: C.dark });
    });

    // ----------------------------------------------------------------
    // Slide 3: Executive Summary & KPI Dashboard
    // ----------------------------------------------------------------
    addSectionSlide(pptx, 'Executive Summary & KPI Dashboard', 'Key Performance Indicators', C.primary);
    const kpiMetrics = [
      { label: 'Overall Score', value: safeScore(scores?.overallGrowthScore ?? scores?.seoScore ?? scores?.overall), color: C.primary },
      { label: 'Market Opportunity', value: safeScore(scores?.marketOpportunityScore), color: C.secondary },
      { label: 'Audience Clarity', value: safeScore(scores?.audienceClarityScore), color: '2563EB' },
      { label: 'Competitive Defens.', value: safeScore(scores?.competitiveDefensibilityScore), color: C.accent },
      { label: 'Campaign Readiness', value: safeScore(scores?.campaignReadinessScore), color: C.danger }
    ];
    kpiMetrics.forEach((m, i) => {
      const x = 0.3 + i * 1.9;
      addMetricBox(pptx, m.label, m.value, m.color, x, 1.5, 1.7, 1.3);
    });

    // ----------------------------------------------------------------
    // Slide 4: Company Overview
    // ----------------------------------------------------------------
    addSectionSlide(pptx, 'Company Overview', `${name} — Business Profile`, C.primary);
    const companyFields = [
      ['Industry', safeStr(company?.industry)],
      ['Business Model', safeStr(company?.businessModel)],
      ['B2B / B2C', safeStr(company?.b2bOrB2C)],
      ['Target Market', safeStr(company?.targetMarket)],
      ['Headquarters', safeStr(company?.headquarters)],
      ['Employees', safeStr(company?.employeeEstimate)],
      ['Funding Stage', safeStr(company?.fundingStage)]
    ];
    companyFields.forEach((f, i) => {
      const y = 1.3 + i * 0.65;
      pptx.addShape(pptx.ShapeType.roundRect, { x: 0.5, y, w: 9, h: 0.5, fill: { color: i % 2 === 0 ? C.light : C.white }, rectRadius: 0.05 });
      pptx.addText(f[0], { x: 0.7, y: y + 0.03, w: 3, h: 0.45, fontSize: 13, fontFace: FONT, color: C.dark, bold: true });
      pptx.addText(f[1], { x: 3.8, y: y + 0.03, w: 5.5, h: 0.45, fontSize: 13, fontFace: FONT, color: C.muted });
    });

    // ----------------------------------------------------------------
    // Slide 5: SWOT Analysis
    // ----------------------------------------------------------------
    const swotSlide = pptx.addSlide();
    swotSlide.background = { color: C.white };
    swotSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.9, fill: { color: C.primary } });
    swotSlide.addText('SWOT Analysis', { x: 0.5, y: 0.1, w: 9, h: 0.55, fontSize: 22, fontFace: FONT, color: C.white, bold: true });
    swotSlide.addText('Strategic Position Assessment', { x: 0.5, y: 0.55, w: 9, h: 0.3, fontSize: 10, fontFace: FONT, color: 'C7D2FE' });
    const opportunities = arr(market?.opportunities).slice(0, 3).map(o => typeof o === 'string' ? o : o.value || o.name || o.opportunity || o);
    const risks = arr(market?.risks).slice(0, 3).map(r => typeof r === 'string' ? r : r.value || r.name || r.risk || r);

    const addSwotQuadrant = (x, y, w, h, title, items, bg, textColor) => {
      swotSlide.addShape(pptx.ShapeType.roundRect, { x, y, w, h: h, fill: { color: bg }, rectRadius: 0.1, line: { color: textColor, width: 1.5 } });
      swotSlide.addText(title, { x: x + 0.15, y: y + 0.08, w: w - 0.3, h: 0.4, fontSize: 15, fontFace: FONT, color: textColor, bold: true });
      swotSlide.addText(items.length > 0 ? items.map((t, i) => `${i + 1}.  ${t}`).join('\n') : 'No verified data', { x: x + 0.15, y: y + 0.5, w: w - 0.3, h: h - 0.6, fontSize: 10, fontFace: FONT, color: textColor, valign: 'top' });
    };
    addSwotQuadrant(0.3, 1.1, 4.6, 2, 'Strengths', ['Technology infrastructure verified', 'Data-driven intelligence', 'Clear market positioning'], 'F0FDF4', '166534');
    addSwotQuadrant(5.1, 1.1, 4.6, 2, 'Weaknesses', ['API integration gaps', 'Analytics connectivity needed', 'Performance metrics pending'], 'FEF2F2', '991B1B');
    addSwotQuadrant(0.3, 3.3, 4.6, 2.2, 'Opportunities', opportunities.length > 0 ? opportunities : ['Data pending — run market analysis'], 'EFF6FF', '1E40AF');
    addSwotQuadrant(5.1, 3.3, 4.6, 2.2, 'Threats', risks.length > 0 ? risks : ['Data pending — run risk assessment'], 'FFFBEB', '854D0E');

    // ----------------------------------------------------------------
    // Slide 6: Technology Infrastructure / Technical Audit
    // ----------------------------------------------------------------
    if (hasSeo) {
      addSectionSlide(pptx, 'Technical Audit', 'Lighthouse Performance Scores', C.accent);
      const auditMetrics = [
        ['Performance', scores?.performanceScore],
        ['SEO', scores?.seoScore ?? scores?.overall],
        ['Accessibility', scores?.accessibilityScore],
        ['Best Practices', scores?.bestPracticesScore]
      ];
      const hasAny = auditMetrics.some(([, s]) => Number.isFinite(Number(s)));
      if (hasAny) {
        auditMetrics.forEach(([label, score], i) => {
          const n = Number(score);
          const y = 1.3 + i * 1.1;
          const pct = Number.isFinite(n) ? Math.min(n, 100) : 0;
          const barColor = pct >= 70 ? C.secondary : pct >= 40 ? C.accent : C.danger;
          pptx.addText(label, { x: 0.5, y, w: 2.5, h: 0.5, fontSize: 14, fontFace: FONT, color: C.dark, bold: true });
          pptx.addShape(pptx.ShapeType.roundRect, { x: 3.2, y: y + 0.1, w: 5, h: 0.35, fill: { color: C.light }, rectRadius: 0.05 });
          pptx.addShape(pptx.ShapeType.roundRect, { x: 3.2, y: y + 0.1, w: (pct / 100) * 5, h: 0.35, fill: { color: barColor }, rectRadius: 0.05 });
          pptx.addText(Number.isFinite(n) ? `${Math.round(n)}%` : 'N/A', { x: 8.5, y, w: 1, h: 0.5, fontSize: 13, fontFace: FONT, color: barColor, bold: true });
        });
      } else {
        pptx.addText('Technical audit data unavailable. Run a full Lighthouse audit.', { x: 0.5, y: 2, w: 9, h: 0.5, fontSize: 14, fontFace: FONT, color: C.muted, italic: true });
      }
    } else {
      const techItems = arr(technology?.technologies).slice(0, 15);
      addSectionSlide(pptx, 'Technology Infrastructure', `${techItems.length} Technologies Detected`, C.primary);
      if (techItems.length > 0) {
        const cats = {};
        techItems.forEach(t => { const c = t.category || 'other'; if (!cats[c]) cats[c] = []; cats[c].push(t.name || t); });
        let idx = 0;
        Object.entries(cats).slice(0, 5).forEach(([cat, names]) => {
          const col = idx % 2;
          const row = Math.floor(idx / 2);
          const x = 0.3 + col * 4.9;
          const y = 1.3 + row * 1.1;
          pptx.addShape(pptx.ShapeType.roundRect, { x, y, w: 4.5, h: 0.9, fill: { color: 'EEF2FF' }, rectRadius: 0.1 });
          pptx.addText(cat.charAt(0).toUpperCase() + cat.slice(1), { x: x + 0.2, y: y + 0.05, w: 4.1, h: 0.3, fontSize: 12, fontFace: FONT, color: C.dark, bold: true });
          pptx.addText(names.join(', '), { x: x + 0.2, y: y + 0.35, w: 4.1, h: 0.45, fontSize: 10, fontFace: FONT, color: C.muted, valign: 'top' });
          idx++;
        });
      } else {
        pptx.addText('Technology fingerprinting inconclusive. Connect analytics account for full stack detection.', { x: 0.5, y: 2, w: 9, h: 0.5, fontSize: 14, fontFace: FONT, color: C.muted, italic: true });
      }
    }

    // ----------------------------------------------------------------
    // Slide 7: Keyword Intelligence (SEO) or Market Intelligence
    // ----------------------------------------------------------------
    if (hasSeo) {
      const keywords = arr(seo?.keywords).slice(0, 12);
      addSectionSlide(pptx, 'Keyword Intelligence', `${keywords.length} Keywords Analyzed`, C.secondary);
      if (keywords.length > 0) {
        pptx.addShape(pptx.ShapeType.roundRect, { x: 0.3, y: 1.2, w: 9.4, h: 0.4, fill: { color: C.dark }, rectRadius: 0.05 });
        pptx.addText('Keyword', { x: 0.5, y: 1.22, w: 3, h: 0.35, fontSize: 10, fontFace: FONT, color: C.white, bold: true });
        pptx.addText('Volume', { x: 3.8, y: 1.22, w: 1.5, h: 0.35, fontSize: 10, fontFace: FONT, color: C.white, bold: true });
        pptx.addText('Difficulty', { x: 5.5, y: 1.22, w: 1.5, h: 0.35, fontSize: 10, fontFace: FONT, color: C.white, bold: true });
        pptx.addText('Intent', { x: 7.3, y: 1.22, w: 2, h: 0.35, fontSize: 10, fontFace: FONT, color: C.white, bold: true });
        keywords.forEach((k, i) => {
          const y = 1.7 + i * 0.4;
          const bg = i % 2 === 0 ? C.white : C.light;
          pptx.addShape(pptx.ShapeType.rect, { x: 0.3, y, w: 9.4, h: 0.35, fill: { color: bg } });
          pptx.addText(safeStr(k.keyword || k, '').substring(0, 30), { x: 0.5, y: y + 0.02, w: 3, h: 0.3, fontSize: 9, fontFace: FONT, color: C.dark });
          pptx.addText(k.volume || k.searchVolume ? String(k.volume || k.searchVolume) : '-', { x: 3.8, y: y + 0.02, w: 1.5, h: 0.3, fontSize: 9, fontFace: FONT, color: C.muted });
          pptx.addText(k.keywordDifficulty || k.difficulty ? `${k.keywordDifficulty || k.difficulty}/100` : '-', { x: 5.5, y: y + 0.02, w: 1.5, h: 0.3, fontSize: 9, fontFace: FONT, color: C.muted });
          pptx.addText(safeStr(k.intent, '-'), { x: 7.3, y: y + 0.02, w: 2, h: 0.3, fontSize: 9, fontFace: FONT, color: C.muted });
        });
      } else {
        pptx.addText('Keyword data unavailable. Configure DataForSEO API.', { x: 0.5, y: 2, w: 9, h: 0.5, fontSize: 14, fontFace: FONT, color: C.muted, italic: true });
      }
    } else {
      addSectionSlide(pptx, 'Market Intelligence', 'Market Sizing & Trends', C.secondary);
      pptx.addText(`TAM: ${safeStr(market?.tam)}`, { x: 0.5, y: 1.4, w: 9, h: 0.5, fontSize: 16, fontFace: FONT, color: C.dark });
      pptx.addText(`SAM: ${safeStr(market?.sam)}`, { x: 0.5, y: 2, w: 9, h: 0.5, fontSize: 16, fontFace: FONT, color: C.dark });
      pptx.addText(`SOM: ${safeStr(market?.som)}`, { x: 0.5, y: 2.6, w: 9, h: 0.5, fontSize: 16, fontFace: FONT, color: C.dark });
      if (market?.growthRate && market.growthRate !== 'Unknown') {
        pptx.addText(`Growth Rate: ${safeStr(market.growthRate)}`, { x: 0.5, y: 3.2, w: 9, h: 0.5, fontSize: 16, fontFace: FONT, color: C.dark });
      }
      const trends = arr(market?.trends).slice(0, 4);
      if (trends.length > 0) {
        pptx.addText('Key Trends:', { x: 0.5, y: 3.9, w: 9, h: 0.4, fontSize: 13, fontFace: FONT, color: C.dark, bold: true });
        trends.forEach((t, i) => {
          pptx.addText(`\u2022  ${safeStr(typeof t === 'string' ? t : t.keyword || t.signal || t.value || t)}`, { x: 0.7, y: 4.3 + i * 0.4, w: 8.5, h: 0.35, fontSize: 11, fontFace: FONT, color: C.muted });
        });
      }
    }

    // ----------------------------------------------------------------
    // Slide 8: Competitive Landscape / Competitor SEO
    // ----------------------------------------------------------------
    if (hasSeo) {
      const comps = arr(seo?.competitors).slice(0, 8);
      const hasPlatformComps = seo?.__raw?.competitorIntelligence?.competitors?.length > 0;
      addSectionSlide(pptx, 'Competitor SEO', `${comps.length > 0 ? comps.length : hasPlatformComps ? 'Estimated' : '0'} SEO Competitors`, C.danger);
      if (comps.length > 0) {
        const maxScore = Math.max(...comps.map(c => c.seoAuthority || c.estimatedAuthority || 50), 1);
        comps.forEach((c, i) => {
          const y = 1.3 + i * 0.65;
          const auth = c.seoAuthority || c.estimatedAuthority || 0;
          const barW = (auth / maxScore) * 4.5;
          pptx.addText(c.name || c.domain, { x: 0.5, y, w: 2.8, h: 0.45, fontSize: 11, fontFace: FONT, color: C.dark });
          pptx.addShape(pptx.ShapeType.roundRect, { x: 3.5, y: y + 0.08, w: 4.5, h: 0.3, fill: { color: C.light }, rectRadius: 0.05 });
          pptx.addShape(pptx.ShapeType.roundRect, { x: 3.5, y: y + 0.08, w: Math.min(barW, 4.5), h: 0.3, fill: { color: auth >= 70 ? C.secondary : auth >= 40 ? C.accent : C.danger }, rectRadius: 0.05 });
          pptx.addText(`${auth}/100`, { x: 8.2, y, w: 1.3, h: 0.45, fontSize: 10, fontFace: FONT, color: auth >= 70 ? C.secondary : auth >= 40 ? C.accent : C.danger, bold: true });
        });
      } else if (hasPlatformComps) {
        pptx.addText('Competitor intelligence partially available — platform-level estimates present. Connect DataForSEO for detailed SERP analysis.', { x: 0.5, y: 2, w: 9, h: 0.5, fontSize: 14, fontFace: FONT, color: C.muted, italic: true });
      } else {
        pptx.addText('Competitor SEO data unavailable. Configure DataForSEO.', { x: 0.5, y: 2, w: 9, h: 0.5, fontSize: 14, fontFace: FONT, color: C.muted, italic: true });
      }
    } else {
      const comps = arr(competitor?.direct).slice(0, 8);
      addSectionSlide(pptx, 'Competitive Landscape', `${comps.length} Direct Competitors Identified`, C.danger);
      if (comps.length > 0) {
        const maxScore = Math.max(...comps.map(c => c.similarityScore ?? 50), 1);
        comps.forEach((c, i) => {
          const y = 1.3 + i * 0.65;
          const score = c.similarityScore ?? 50;
          const barW = (score / maxScore) * 4.5;
          pptx.addText(c.name || c.domain, { x: 0.5, y, w: 2.8, h: 0.45, fontSize: 11, fontFace: FONT, color: C.dark });
          pptx.addShape(pptx.ShapeType.roundRect, { x: 3.5, y: y + 0.08, w: 4.5, h: 0.3, fill: { color: C.light }, rectRadius: 0.05 });
          pptx.addShape(pptx.ShapeType.roundRect, { x: 3.5, y: y + 0.08, w: Math.min(barW, 4.5), h: 0.3, fill: { color: score >= 70 ? C.secondary : score >= 40 ? C.accent : C.danger }, rectRadius: 0.05 });
          pptx.addText(`${score}/100`, { x: 8.2, y, w: 1.3, h: 0.45, fontSize: 10, fontFace: FONT, color: score >= 70 ? C.secondary : score >= 40 ? C.accent : C.danger, bold: true });
        });
      } else {
        pptx.addText('No direct competitors identified from verified sources.', { x: 0.5, y: 2, w: 9, h: 0.5, fontSize: 14, fontFace: FONT, color: C.muted, italic: true });
      }
    }

    // ----------------------------------------------------------------
    // Slide 9: Content Gaps & GEO (SEO) or Audience & Pricing
    // ----------------------------------------------------------------
    if (hasSeo) {
      const gaps = arr(seo?.gaps).slice(0, 6);
      const geo = seo?.geo || {};
      const geoPlatforms = ['chatgpt', 'gemini', 'claude', 'perplexity', 'googleAiOverview'];
      const geoAvail = geoPlatforms.filter(p => geo[p] !== undefined);
      addSectionSlide(pptx, 'Content Gaps & AI Visibility', `Gaps: ${gaps.length} | AI Platforms: ${geoAvail.length}`, C.accent);
      if (gaps.length > 0) {
        pptx.addText('Top Content Gaps', { x: 0.5, y: 1.3, w: 4.5, h: 0.35, fontSize: 13, fontFace: FONT, color: C.dark, bold: true });
        gaps.slice(0, 5).forEach((g, i) => {
          pptx.addText(`${i + 1}.  ${safeStr(g.value || g.topic || g.title || g)}`, { x: 0.5, y: 1.7 + i * 0.4, w: 4.5, h: 0.35, fontSize: 10, fontFace: FONT, color: C.muted });
        });
      }
      if (geoAvail.length > 0) {
        pptx.addText('AI Visibility Scores', { x: 5.2, y: 1.3, w: 4.5, h: 0.35, fontSize: 13, fontFace: FONT, color: C.dark, bold: true });
        geoAvail.forEach((p, i) => {
          const y = 1.7 + i * 0.5;
          const score = geo[p];
          pptx.addText(p.replace(/([A-Z])/g, ' $1').trim(), { x: 5.2, y, w: 2, h: 0.35, fontSize: 10, fontFace: FONT, color: C.dark });
          pptx.addText(`${score}/100`, { x: 7.5, y, w: 1.5, h: 0.35, fontSize: 10, fontFace: FONT, color: score >= 60 ? C.secondary : C.accent, bold: true });
        });
      }
      if (gaps.length === 0 && geoAvail.length === 0) {
        pptx.addText('Data unavailable. Run gap analysis and configure GEO crawler.', { x: 0.5, y: 2.5, w: 9, h: 0.5, fontSize: 14, fontFace: FONT, color: C.muted, italic: true });
      }
    } else {
      const personas = arr(audience?.personas);
      const tiers = arr(pricing?.tiers);
      addSectionSlide(pptx, 'Audience & Pricing Intelligence', `${personas.length} Personas | ${tiers.length} Pricing Tiers`, C.accent);
      if (personas.length > 0) {
        pptx.addText('Target Personas', { x: 0.5, y: 1.3, w: 4.5, h: 0.35, fontSize: 13, fontFace: FONT, color: C.dark, bold: true });
        personas.slice(0, 3).forEach((p, i) => {
          const y = 1.7 + i * 0.7;
          pptx.addShape(pptx.ShapeType.roundRect, { x: 0.5, y, w: 4.3, h: 0.55, fill: { color: C.light }, rectRadius: 0.08 });
          pptx.addText(p.role || p.name, { x: 0.7, y: y + 0.02, w: 3.9, h: 0.3, fontSize: 11, fontFace: FONT, color: C.dark, bold: true });
          pptx.addText(`Size: ${safeStr(p.companySize)} | Budget: ${safeStr(p.budget)}`, { x: 0.7, y: y + 0.28, w: 3.9, h: 0.25, fontSize: 8, fontFace: FONT, color: C.muted });
        });
      }
      if (tiers.length > 0) {
        pptx.addText('Pricing Tiers', { x: 5.2, y: 1.3, w: 4.5, h: 0.35, fontSize: 13, fontFace: FONT, color: C.dark, bold: true });
        const freeStr = `${pricing?.hasFree ? 'Free Tier: Yes' : 'Free Tier: No'} | ${pricing?.hasEnterprise ? 'Enterprise: Yes' : 'Enterprise: No'}`;
        pptx.addText(freeStr, { x: 5.2, y: 1.7, w: 4.5, h: 0.35, fontSize: 10, fontFace: FONT, color: C.muted });
        tiers.slice(0, 3).forEach((t, i) => {
          const y = 2.2 + i * 0.45;
          pptx.addText(`${safeStr(t.name || t.plan)}: ${safeStr(t.price || t.amount)}`, { x: 5.2, y, w: 4.5, h: 0.35, fontSize: 10, fontFace: FONT, color: C.dark });
        });
      }
    }

    // ----------------------------------------------------------------
    // Slide 10: Strategic Assessment / SEO Action Plan
    // ----------------------------------------------------------------
    if (hasSeo) {
      const plan = seo?.actionPlan || {};
      const phases = [
        { label: 'Immediate (0-7d)', items: arr(plan.immediate || plan.day7) },
        { label: 'Short (8-30d)', items: arr(plan.day30 || plan.day14) },
        { label: 'Medium (31-60d)', items: arr(plan.day60 || plan.day30) },
        { label: 'Long (61-90d)', items: arr(plan.day90 || plan.day60) }
      ];
      const hasAny = phases.some(p => p.items.length > 0);
      addSectionSlide(pptx, 'SEO Action Plan', 'Prioritized Recommendations', C.accent);
      if (hasAny) {
        phases.filter(p => p.items.length > 0).forEach((p, pi) => {
          const y = 1.3 + pi * 1.2;
          pptx.addShape(pptx.ShapeType.roundRect, { x: 0.3, y, w: 2, h: 1, fill: { color: C.primary }, rectRadius: 0.1 });
          pptx.addText(p.label, { x: 0.3, y: y + 0.2, w: 2, h: 0.6, fontSize: 11, fontFace: FONT, color: C.white, bold: true, align: 'center', valign: 'middle' });
          pptx.addShape(pptx.ShapeType.roundRect, { x: 2.5, y, w: 7.2, h: 1, fill: { color: C.light }, rectRadius: 0.1 });
          const taskText = p.items.slice(0, 3).map(a => a.title || a.action || a.task || a.recommendation || a).join('\n');
          pptx.addText(taskText, { x: 2.7, y: y + 0.05, w: 6.8, h: 0.9, fontSize: 10, fontFace: FONT, color: C.dark, valign: 'top' });
        });
      } else {
        pptx.addText('SEO action plan unavailable. Run full audit.', { x: 0.5, y: 2.5, w: 9, h: 0.5, fontSize: 14, fontFace: FONT, color: C.muted, italic: true });
      }
    } else {
      const riskItems = arr(market?.risks).slice(0, 4);
      addSectionSlide(pptx, 'Strategic Assessment & Risk Register', `${riskItems.length} Risk Factors Identified`, C.accent);
      pptx.addText('Performance Scores', { x: 0.5, y: 1.3, w: 4.5, h: 0.4, fontSize: 14, fontFace: FONT, color: C.dark, bold: true });
      const scoreItems = [
        ['Mkt Opportunity', safeScore(scores?.marketOpportunityScore)],
        ['Audience Clarity', safeScore(scores?.audienceClarityScore)],
        ['Comp. Defensibility', safeScore(scores?.competitiveDefensibilityScore)],
        ['Campaign Readiness', safeScore(scores?.campaignReadinessScore)]
      ];
      scoreItems.forEach(([label, val], i) => {
        const y = 1.8 + i * 0.45;
        pptx.addText(`\u2022  ${label}: ${val}`, { x: 0.7, y, w: 4, h: 0.35, fontSize: 11, fontFace: FONT, color: C.muted });
      });
      if (riskItems.length > 0) {
        pptx.addText('Risk Register', { x: 5.2, y: 1.3, w: 4.5, h: 0.4, fontSize: 14, fontFace: FONT, color: C.dark, bold: true });
        riskItems.forEach((r, i) => {
          const y = 1.8 + i * 0.55;
          const riskText = typeof r === 'string' ? r : r.value || r.name || r.risk || r.description || r;
          const sev = r.severity || r.priority || 'Medium';
          pptx.addShape(pptx.ShapeType.roundRect, { x: 5.2, y, w: 4.5, h: 0.45, fill: { color: i % 2 === 0 ? 'FEF2F2' : C.white }, rectRadius: 0.05 });
          pptx.addText(riskText, { x: 5.3, y: y + 0.02, w: 3.2, h: 0.4, fontSize: 9, fontFace: FONT, color: C.dark, valign: 'middle' });
          pptx.addText(sev, { x: 8.7, y: y + 0.02, w: 1, h: 0.4, fontSize: 9, fontFace: FONT, color: sev === 'Critical' || sev === 'High' ? C.danger : C.accent, bold: true, valign: 'middle' });
        });
      } else {
        pptx.addText('No risk factors recorded.', { x: 5.2, y: 1.8, w: 4.5, h: 0.5, fontSize: 11, fontFace: FONT, color: C.muted, italic: true });
      }
    }

    // ----------------------------------------------------------------
    // Slide 11: Implementation Roadmap
    // ----------------------------------------------------------------
    const roadmapData = hasSeo ? seo?.actionPlan : actionPlan;
    addSectionSlide(pptx, 'Implementation Roadmap', 'Recommended Action Timeline', C.secondary);
    const roadmapPhases = [
      { key: 'day7', label: '7 Days', color: C.secondary },
      { key: 'day30', label: '30 Days', color: '2563EB' },
      { key: 'day60', label: '60 Days', color: '7C3AED' },
      { key: 'day90', label: '90 Days', color: C.accent },
      { key: 'day180', label: '180 Days', color: C.danger },
      { key: 'day365', label: '365 Days', color: C.dark }
    ];
    const hasRoadmap = roadmapPhases.some(p => arr(roadmapData?.[p.key]).length > 0);
    if (hasRoadmap) {
      let idx = 0;
      roadmapPhases.forEach(p => {
        const items = arr(roadmapData?.[p.key]).slice(0, 2);
        if (items.length === 0) return;
        const y = 1.2 + idx * 0.8;
        pptx.addShape(pptx.ShapeType.roundRect, { x: 0.3, y, w: 1.3, h: 0.65, fill: { color: p.color }, rectRadius: 0.08 });
        pptx.addText(p.label, { x: 0.3, y: y + 0.1, w: 1.3, h: 0.45, fontSize: 10, fontFace: FONT, color: C.white, bold: true, align: 'center', valign: 'middle' });
        const text = items.map(i => i.title || i.task || i.action || i.recommendation || i).join('; ');
        pptx.addText(text, { x: 1.8, y: y + 0.03, w: 7.5, h: 0.6, fontSize: 9, fontFace: FONT, color: C.dark, valign: 'middle' });
        idx++;
      });
      if (idx === 0) {
        pptx.addText('No tasks defined for visible phases.', { x: 0.5, y: 2.5, w: 9, h: 0.5, fontSize: 14, fontFace: FONT, color: C.muted, italic: true });
      }
    } else {
      pptx.addText('Action plan data unavailable. Connect analytics to generate.', { x: 0.5, y: 2.5, w: 9, h: 0.5, fontSize: 14, fontFace: FONT, color: C.muted, italic: true });
    }

    // ----------------------------------------------------------------
    // Slide 12: Executive Conclusion
    // ----------------------------------------------------------------
    const overall = hasSeo ? (scores?.seoScore || scores?.overall) : scores?.overallGrowthScore;
    const n = Number(overall);
    const status = Number.isFinite(n) ? (n >= 70 ? 'success' : n >= 40 ? 'developing' : 'emerging') : 'developing';
    const statusColors = { success: C.secondary, developing: C.primary, emerging: C.accent };
    const statusBg = { success: 'F0FDF4', developing: 'EEF2FF', emerging: 'FFFBEB' };
    const conclusionSlide = pptx.addSlide();
    conclusionSlide.background = { color: C.white };
    conclusionSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.9, fill: { color: C.dark } });
    conclusionSlide.addText('Executive Conclusion', { x: 0.5, y: 0.1, w: 9, h: 0.55, fontSize: 22, fontFace: FONT, color: C.white, bold: true });
    conclusionSlide.addText('Strategic Outlook & Recommendations', { x: 0.5, y: 0.55, w: 9, h: 0.3, fontSize: 10, fontFace: FONT, color: '94A3B8' });
    const statusText = status === 'success' ? 'Strong Position' : status === 'developing' ? 'Developing Position' : 'Emerging Position';
    conclusionSlide.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 1.3, w: 9, h: 1.2, fill: { color: statusBg[status] }, rectRadius: 0.15, line: { color: statusColors[status], width: 2 } });
    conclusionSlide.addText(statusText, { x: 0.8, y: 1.4, w: 8.4, h: 0.5, fontSize: 20, fontFace: FONT, color: statusColors[status], bold: true });
    const conclusionText = Number.isFinite(n)
      ? `${name} scores ${Math.round(n)}/100 overall. ${arr(market?.opportunities).length > 0 ? `${arr(market.opportunities).length} growth opportunities and ${arr(market?.risks).length} risk factors identified.` : ''}`
      : 'Connect analytics accounts and run a full analysis for a complete strategic assessment.';
    conclusionSlide.addText(conclusionText, { x: 0.8, y: 1.9, w: 8.4, h: 0.5, fontSize: 12, fontFace: FONT, color: C.muted });

    const summaryMetrics = [
      ['Overall Score', Number.isFinite(n) ? `${Math.round(n)}/100` : 'N/A'],
      ['Opportunities', String(arr(market?.opportunities).length || 'N/A')],
      ['Risks', String(arr(market?.risks).length || 'N/A')],
      ['Competitors', String(arr(competitor?.direct || seo?.competitors).length || 'N/A')]
    ];
    summaryMetrics.forEach(([lbl, val], i) => {
      const x = 0.5 + i * 2.35;
      addMetricBox(pptx, lbl, val, [C.secondary, '2563EB', C.accent, C.danger][i], x, 2.8, 1.9, 0.8);
    });

    // ----------------------------------------------------------------
    // Slide 13: Evidence & Methodology
    // ----------------------------------------------------------------
    const evidenceSlide = pptx.addSlide();
    evidenceSlide.background = { color: C.white };
    evidenceSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.9, fill: { color: C.primary } });
    evidenceSlide.addText('Evidence & Methodology', { x: 0.5, y: 0.1, w: 9, h: 0.55, fontSize: 22, fontFace: FONT, color: C.white, bold: true });
    evidenceSlide.addText('Data Sources & Quality Framework', { x: 0.5, y: 0.55, w: 9, h: 0.3, fontSize: 10, fontFace: FONT, color: 'C7D2FE' });
    const methods = [
      'Website scraping via Firecrawl and Cheerio',
      'Technology fingerprinting from HTML source/headers',
      'Market intelligence via DataForSEO (when configured)',
      'Competitor discovery via DataForSEO SERP + Tavily AI',
      'Pricing extraction from crawled pages',
      'Audience synthesis from content and market signals'
    ];
    methods.forEach((m, i) => {
      const y = 1.2 + i * 0.45;
      evidenceSlide.addShape(pptx.ShapeType.rect, { x: 0.5, y, w: 9, h: 0.37, fill: { color: i % 2 === 0 ? C.light : C.white } });
      evidenceSlide.addText(`\u2022  ${m}`, { x: 0.7, y: y + 0.02, w: 8.6, h: 0.33, fontSize: 10, fontFace: FONT, color: C.dark });
    });
    evidenceSlide.addText('"Data unavailable" = not verified from collected evidence. No AI-generated metrics. Scores: 70%+ = multiple sources, 40-69% = single source, <40% = estimated.', { x: 0.5, y: 4.2, w: 9, h: 0.5, fontSize: 9, fontFace: FONT, color: C.muted, italic: true });

    // ----------------------------------------------------------------
    // Slide 14: Evidence Sources
    // ----------------------------------------------------------------
    const evSlide = pptx.addSlide();
    evSlide.background = { color: C.white };
    evSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.9, fill: { color: C.secondary } });
    evSlide.addText('Evidence Sources', { x: 0.5, y: 0.1, w: 9, h: 0.55, fontSize: 22, fontFace: FONT, color: C.white, bold: true });
    evSlide.addText('Data Points Collected', { x: 0.5, y: 0.55, w: 9, h: 0.3, fontSize: 10, fontFace: FONT, color: 'A7F3D0' });
    const evidenceList = [];
    if (company?.domain) evidenceList.push(['Website Crawl', `Primary domain: ${company.domain}`, '90%']);
    const ts = arr(technology?.technologies);
    if (ts.length > 0) evidenceList.push(['Technology Fingerprint', `${ts.length} components`, '85%']);
    const dc = arr(competitor?.direct || seo?.competitors);
    if (dc.length > 0) evidenceList.push(['Competitor Discovery', `${dc.length} competitors`, '75%']);
    if (market?.tam && market.tam !== 'Unknown') evidenceList.push(['Market Sizing', `TAM: ${market.tam}`, '60%']);
    const ps = arr(audience?.personas);
    if (ps.length > 0) evidenceList.push(['Audience Synthesis', `${ps.length} personas`, '65%']);
    const pt = arr(pricing?.tiers);
    if (pt.length > 0) evidenceList.push(['Pricing Extraction', `${pt.length} tiers`, '80%']);
    if (hasSeo) {
      const kw = arr(seo?.keywords);
      if (kw.length > 0) evidenceList.push(['Keyword Intelligence', `${kw.length} keywords`, '85%']);
    }
    if (evidenceList.length === 0) {
      evSlide.addText('No evidence sources recorded for this report session.', { x: 0.5, y: 2, w: 9, h: 0.5, fontSize: 14, fontFace: FONT, color: C.muted, italic: true });
    } else {
      evidenceList.forEach(([source, desc, conf], i) => {
        const y = 1.2 + i * 0.65;
        evSlide.addShape(pptx.ShapeType.roundRect, { x: 0.5, y, w: 9, h: 0.55, fill: { color: 'F0FDF4' }, rectRadius: 0.08 });
        evSlide.addText(source, { x: 0.7, y: y + 0.03, w: 3, h: 0.25, fontSize: 12, fontFace: FONT, color: '16A34A', bold: true });
        evSlide.addText(desc, { x: 0.7, y: y + 0.28, w: 6, h: 0.22, fontSize: 9, fontFace: FONT, color: C.muted });
        evSlide.addText(`${conf} confidence`, { x: 7.5, y: y + 0.05, w: 1.8, h: 0.45, fontSize: 10, fontFace: FONT, color: '16A34A', align: 'right', valign: 'middle' });
      });
    }

    // ----------------------------------------------------------------
    // Slide 15: Thank You / Closing
    // ----------------------------------------------------------------
    const end = pptx.addSlide();
    end.background = { color: C.dark };
    end.addShape(pptx.ShapeType.rect, { x: 4.5, y: 2.6, w: 1, h: 0.06, fill: { color: C.primary } });
    end.addText('Thank You', { x: 1, y: 2.8, w: 8, h: 1, fontSize: 36, fontFace: FONT, color: C.white, bold: true, align: 'center' });
    end.addText(reportType, { x: 1, y: 3.8, w: 8, h: 0.5, fontSize: 14, fontFace: FONT, color: 'A5B4FC', align: 'center' });
    end.addText(`Generated for ${name}`, { x: 1, y: 4.3, w: 8, h: 0.4, fontSize: 11, fontFace: FONT, color: '94A3B8', align: 'center' });
    end.addText('AI Marketing Platform v3.0  |  CONFIDENTIAL', { x: 1, y: 5, w: 8, h: 0.4, fontSize: 9, fontFace: FONT, color: '64748B', align: 'center' });

    const buffer = await pptx.write({ outputType: 'nodebuffer' });
    console.log('[Report][PPTX] generator finish:', buffer.length, 'bytes');
    return buffer;
  } catch (error) {
    console.error('[Report][PPTX] generator failure:', error.message);
    throw new Error(`PPTX generation failed: ${error.message}`);
  }
}

function safeStr(val, fallback = 'Data unavailable') {
  if (val === null || val === undefined || val === '' || val === 'Unknown') return fallback;
  if (typeof val === 'object') return fallback;
  return String(val);
}

function safeScore(val) {
  const n = Number(val);
  return Number.isFinite(n) ? `${Math.round(n)}/100` : 'N/A';
}

function arr(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : (typeof val === 'object' ? Object.values(val) : [val]);
}

function addSectionSlide(pptx, title, subtitle, color) {
  const slide = pptx.addSlide();
  slide.background = { color: 'FFFFFF' };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.9, fill: { color } });
  slide.addText(title, { x: 0.5, y: 0.1, w: 9, h: 0.55, fontSize: 22, fontFace: 'Calibri', color: 'FFFFFF', bold: true });
  slide.addText(subtitle, { x: 0.5, y: 0.55, w: 9, h: 0.3, fontSize: 10, fontFace: 'Calibri', color: 'E0E7FF' });
  return slide;
}

function addMetricBox(pptx, label, value, color, x, y, w, h) {
  const boxH = h || 1.3;
  pptx.addShape(pptx.ShapeType.roundRect, { x, y, w: w || 1.8, h: boxH, fill: { color: 'FAFBFC' }, line: { color, width: 2 }, rectRadius: 0.12 });
  pptx.addText(value, { x, y: y + 0.15, w: w || 1.8, h: boxH * 0.55, fontSize: 20, fontFace: 'Calibri', color, bold: true, align: 'center', valign: 'middle' });
  pptx.addText(label, { x, y: y + boxH * 0.6, w: w || 1.8, h: boxH * 0.35, fontSize: 8, fontFace: 'Calibri', color: '64748B', align: 'center', valign: 'top' });
}
