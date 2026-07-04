import PptxGenJS from 'pptxgenjs';

export async function generatePptx(data) {
  console.log('[Report][PPTX] Generating PPTX...');

  const { company, market, audience, competitor, technology, pricing, scores, actionPlan } = data;
  const name = company?.name || 'Company';
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const pptx = new PptxGenJS();
  pptx.author = 'AI Marketing Platform';
  pptx.company = name;
  pptx.title = `${name} Strategic Report`;
  pptx.subject = 'Enterprise Market Intelligence Report';

  const COLORS = { dark: '1E1B4B', primary: '6366F1', secondary: '10B981', accent: 'F59E0B', danger: 'EF4444', muted: '6B7280', light: 'F3F4F6' };

  // Slide 1: Cover
  const cover = pptx.addSlide();
  cover.background = { color: COLORS.dark };
  cover.addText(name, { x: 1, y: 2, w: 8, h: 1.2, fontSize: 36, fontFace: 'Calibri', color: 'FFFFFF', bold: true, align: 'center' });
  cover.addText('Executive Strategy Report', { x: 1, y: 3.2, w: 8, h: 0.8, fontSize: 20, fontFace: 'Calibri', color: 'A5B4FC', align: 'center' });
  cover.addText(`Prepared: ${date}`, { x: 1, y: 4.5, w: 8, h: 0.5, fontSize: 12, fontFace: 'Calibri', color: '9CA3AF', align: 'center' });
  cover.addText('CONFIDENTIAL', { x: 1, y: 5, w: 8, h: 0.5, fontSize: 10, fontFace: 'Calibri', color: '6B7280', align: 'center' });

  // Slide 2: Table of Contents
  const toc = pptx.addSlide();
  toc.background = { color: 'FFFFFF' };
  toc.addText('Agenda', { x: 0.5, y: 0.3, w: 9, h: 0.8, fontSize: 28, fontFace: 'Calibri', color: COLORS.dark, bold: true });
  const sections = ['Executive Summary', 'Company Overview', 'Market Intelligence', 'Competitive Landscape', 'Audience Intelligence', 'Technology Stack', 'Pricing Model', 'Strategic Roadmap'];
  sections.forEach((s, i) => {
    toc.addText(`${i + 1}.  ${s}`, { x: 1, y: 1.5 + i * 0.7, w: 8, h: 0.6, fontSize: 16, fontFace: 'Calibri', color: COLORS.dark });
  });

  // Slide 3: Executive Summary
  addSectionSlide(pptx, 'Executive Summary', 'Key Metrics at a Glance', COLORS.dark);
  const metrics = [
    { label: 'Overall Score', value: `${scores?.overallGrowthScore || 0}/100`, color: COLORS.primary },
    { label: 'TAM', value: market?.tam || 'Unknown', color: COLORS.secondary },
    { label: 'Direct Competitors', value: String((competitor?.direct || []).length), color: COLORS.accent },
    { label: 'Technologies', value: String((technology?.technologies || []).length), color: COLORS.danger }
  ];
  metrics.forEach((m, i) => {
    const x = 0.5 + i * 2.4;
    addMetricBox(pptx, m.label, m.value, m.color, x, 1.5);
  });

  // Slide 4: Company Overview
  addSectionSlide(pptx, 'Company Overview', `${name} — Business Profile`, COLORS.primary);
  const companyFields = [
    ['Industry', company?.industry || 'Unknown'], ['Business Model', company?.businessModel || 'Unknown'],
    ['B2B / B2C', company?.b2bOrB2C || 'Unknown'], ['Target Market', company?.targetMarket || 'Unknown'],
    ['Headquarters', company?.headquarters || 'Unknown'], ['Employees', company?.employeeEstimate || 'Unknown']
  ];
  companyFields.forEach((f, i) => {
    const y = 1.5 + i * 0.7;
    addBulletSlide(pptx, f[0], f[1], y);
  });

  // Slide 5: Market Intelligence
  addSectionSlide(pptx, 'Market Intelligence', 'Market Sizing & Trends', COLORS.secondary);
  pptx.addText(`TAM: ${market?.tam || 'Unknown'}`, { x: 0.5, y: 1.5, w: 9, h: 0.5, fontSize: 16, fontFace: 'Calibri', color: '333333' });
  pptx.addText(`SAM: ${market?.sam || 'Unknown'}`, { x: 0.5, y: 2.1, w: 9, h: 0.5, fontSize: 16, fontFace: 'Calibri', color: '333333' });
  pptx.addText(`SOM: ${market?.som || 'Unknown'}`, { x: 0.5, y: 2.7, w: 9, h: 0.5, fontSize: 16, fontFace: 'Calibri', color: '333333' });

  // Slide 6: Competitive Landscape
  addSectionSlide(pptx, 'Competitive Landscape', 'Direct & Indirect Competitors', COLORS.danger);
  const comps = (competitor?.direct || []).slice(0, 6);
  if (comps.length > 0) {
    const maxScore = Math.max(...comps.map(c => c.similarityScore || 50), 1);
    comps.forEach((c, i) => {
      const y = 1.5 + i * 0.8;
      const barW = ((c.similarityScore || 50) / maxScore) * 5;
      pptx.addText(c.name || c.domain, { x: 0.5, y, w: 3, h: 0.5, fontSize: 12, fontFace: 'Calibri', color: '333333' });
      pptx.addShape(pptx.ShapeType.rect, { x: 3.8, y: y + 0.05, w: barW, h: 0.4, fill: { color: COLORS.primary }, rectRadius: 0.1 });
      pptx.addText(String(c.similarityScore || ''), { x: 3.8 + barW + 0.2, y, w: 1, h: 0.5, fontSize: 10, fontFace: 'Calibri', color: COLORS.muted });
    });
  } else {
    pptx.addText('No direct competitors identified from verified sources.', { x: 0.5, y: 2, w: 9, h: 0.5, fontSize: 14, fontFace: 'Calibri', color: COLORS.muted, italic: true });
  }

  // Slide 7: Technology Stack
  addSectionSlide(pptx, 'Technology Stack', 'Detected Technologies', COLORS.primary);
  const techItems = (technology?.technologies || []).slice(0, 12);
  if (techItems.length > 0) {
    techItems.forEach((t, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 0.5 + col * 3.2;
      const y = 1.5 + row * 0.7;
      pptx.addShape(pptx.ShapeType.roundRect, { x, y, w: 2.8, h: 0.5, fill: { color: 'EEF2FF' }, rectRadius: 0.1 });
      pptx.addText(t.name, { x: x + 0.2, y: y + 0.05, w: 2.4, h: 0.4, fontSize: 11, fontFace: 'Calibri', color: COLORS.dark });
    });
  } else {
    pptx.addText('Technology fingerprinting inconclusive.', { x: 0.5, y: 2, w: 9, h: 0.5, fontSize: 14, fontFace: 'Calibri', color: COLORS.muted, italic: true });
  }

  // Slide 8: Pricing Model
  addSectionSlide(pptx, 'Pricing Model', 'Tier Structure & Billing', COLORS.accent);
  const tiers = pricing?.tiers || [];
  if (tiers.length > 0) {
    tiers.forEach((t, i) => {
      const x = 0.5 + i * 2.4;
      pptx.addShape(pptx.ShapeType.roundRect, { x, y: 1.5, w: 2, h: 2, fill: { color: 'F9FAFB' }, line: { color: COLORS.primary, width: 1 }, rectRadius: 0.2 });
      pptx.addText(t.name, { x, y: 1.7, w: 2, h: 0.5, fontSize: 14, fontFace: 'Calibri', color: COLORS.dark, bold: true, align: 'center' });
    });
  } else {
    pptx.addText('Pricing information unavailable from verified sources.', { x: 0.5, y: 2, w: 9, h: 0.5, fontSize: 14, fontFace: 'Calibri', color: COLORS.muted, italic: true });
  }

  // Slide 9: Strategic Roadmap
  addSectionSlide(pptx, 'Strategic Roadmap', 'Recommended Action Plan', COLORS.secondary);
  const planPhases = [
    { label: 'Day 7', task: getFirstTask(actionPlan?.day7) },
    { label: 'Day 30', task: getFirstTask(actionPlan?.day30) },
    { label: 'Day 60', task: getFirstTask(actionPlan?.day60) },
    { label: 'Day 90', task: getFirstTask(actionPlan?.day90) },
    { label: 'Day 180', task: getFirstTask(actionPlan?.day180) },
    { label: 'Day 365', task: getFirstTask(actionPlan?.day365) }
  ];
  planPhases.forEach((p, i) => {
    const y = 1.5 + i * 0.7;
    pptx.addShape(pptx.ShapeType.rect, { x: 0.5, y: y + 0.05, w: 1.2, h: 0.45, fill: { color: COLORS.primary }, rectRadius: 0.05 });
    pptx.addText(p.label, { x: 0.5, y: y + 0.05, w: 1.2, h: 0.45, fontSize: 11, fontFace: 'Calibri', color: 'FFFFFF', align: 'center' });
    pptx.addText(p.task || 'No tasks defined', { x: 2, y, w: 7.5, h: 0.55, fontSize: 12, fontFace: 'Calibri', color: '333333' });
  });

  // Slide 10: Thank You
  const end = pptx.addSlide();
  end.background = { color: COLORS.dark };
  end.addText('Thank You', { x: 1, y: 2.5, w: 8, h: 1, fontSize: 36, fontFace: 'Calibri', color: 'FFFFFF', bold: true, align: 'center' });
  end.addText('AI Marketing Platform v3.0', { x: 1, y: 3.8, w: 8, h: 0.6, fontSize: 16, fontFace: 'Calibri', color: 'A5B4FC', align: 'center' });
  end.addText('CONFIDENTIAL', { x: 1, y: 4.5, w: 8, h: 0.5, fontSize: 10, fontFace: 'Calibri', color: '6B7280', align: 'center' });

  const buffer = await pptx.write({ outputType: 'nodebuffer' });
  console.log('[Report][PPTX] PPTX generated successfully:', buffer.length, 'bytes');
  return buffer;
}

function addSectionSlide(pptx, title, subtitle, color) {
  const slide = pptx.addSlide();
  slide.background = { color: 'FFFFFF' };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.1, fill: { color } });
  slide.addText(title, { x: 0.5, y: 0.1, w: 9, h: 0.6, fontSize: 24, fontFace: 'Calibri', color: 'FFFFFF', bold: true });
  slide.addText(subtitle, { x: 0.5, y: 0.65, w: 9, h: 0.35, fontSize: 12, fontFace: 'Calibri', color: 'E0E7FF' });
  return slide;
}

function addMetricBox(pptx, label, value, color, x) {
  pptx.addShape(pptx.ShapeType.roundRect, { x, y: 1.5, w: 2, h: 1.5, fill: { color: 'F9FAFB' }, line: { color, width: 2 }, rectRadius: 0.15 });
  pptx.addText(value, { x, y: 1.7, w: 2, h: 0.7, fontSize: 20, fontFace: 'Calibri', color, bold: true, align: 'center' });
  pptx.addText(label, { x, y: 2.4, w: 2, h: 0.4, fontSize: 10, fontFace: 'Calibri', color: '6B7280', align: 'center' });
}

function addBulletSlide(pptx, label, value, y) {
  pptx.addText(`• ${label}:  ${value}`, { x: 0.5, y, w: 9, h: 0.5, fontSize: 14, fontFace: 'Calibri', color: '333333' });
}

function getFirstTask(tasks) {
  if (!tasks || tasks.length === 0) return null;
  const t = tasks[0];
  return t.title || t.task || t.action || null;
}
