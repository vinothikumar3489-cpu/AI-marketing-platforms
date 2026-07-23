export function buildEvidenceSection(brief) {
  const lines = [];
  if (brief.product?.name) lines.push(`Product: ${brief.product.name}`);
  if (brief.product?.brandName) lines.push(`Brand: ${brief.product.brandName}`);
  if (brief.company?.name) lines.push(`Company: ${brief.company.name}`);
  if (brief.product?.summary) lines.push(`Product Summary: ${brief.product.summary}`);
  if (brief.product?.usp) lines.push(`USP: ${brief.product.usp}`);
  if (brief.product?.features?.length) {
    const featureTexts = brief.product.features.map(f => {
      if (typeof f === 'string') return f;
      if (f && typeof f === 'object') {
        const name = f.name || f.feature || f.title || '';
        const desc = f.description || f.details || '';
        const benefit = f.benefit || f.value || '';
        return [name, desc, benefit].filter(Boolean).join(': ');
      }
      return String(f);
    }).filter(Boolean);
    if (featureTexts.length) lines.push(`Features:\n${featureTexts.slice(0, 10).map(f => `  - ${f}`).join('\n')}`);
  }
  if (brief.product?.benefits?.length) {
    const benefitTexts = brief.product.benefits.map(b => {
      if (typeof b === 'string') return b;
      if (b && typeof b === 'object') return b.text || b.description || b.benefit || JSON.stringify(b);
      return String(b);
    }).filter(Boolean);
    if (benefitTexts.length) lines.push(`Benefits:\n${benefitTexts.slice(0, 8).map(b => `  - ${b}`).join('\n')}`);
  }
  if (brief.company?.industry) lines.push(`Industry: ${brief.company.industry}`);
  if (brief.targetPersonas?.length) {
    lines.push(`Target Personas:\n${brief.targetPersonas.slice(0, 5).map(p => {
      const parts = [p.name, p.role].filter(Boolean);
      if (p.painPoints?.length) parts.push(`pain: ${p.painPoints.slice(0, 3).join('; ')}`);
      if (p.goals?.length) parts.push(`goals: ${p.goals.slice(0, 3).join('; ')}`);
      return `  - ${parts.join(' | ')}`;
    }).join('\n')}`);
  }
  if (brief.painPoints?.length) lines.push(`Pain Points:\n${brief.painPoints.slice(0, 6).map(p => `  - ${p}`).join('\n')}`);
  if (brief.objections?.length) lines.push(`Objections:\n${brief.objections.slice(0, 4).map(o => `  - ${o}`).join('\n')}`);
  if (brief.validatedCompetitors?.length) {
    lines.push(`Competitors:\n${brief.validatedCompetitors.slice(0, 5).map(c => {
      const parts = [c.name, c.domain].filter(Boolean);
      if (c.strengths?.length) parts.push(`strengths: ${c.strengths.slice(0, 3).join('; ')}`);
      if (c.weaknesses?.length) parts.push(`weaknesses: ${c.weaknesses.slice(0, 3).join('; ')}`);
      return `  - ${parts.join(' | ')}`;
    }).join('\n')}`);
  }
  if (brief.verifiedKeywords?.length) lines.push(`SEO Keywords:\n${brief.verifiedKeywords.slice(0, 15).map(k => {
    const parts = [k.keyword];
    if (k.volume) parts.push(`vol: ${k.volume}`);
    if (k.difficulty) parts.push(`diff: ${k.difficulty}`);
    if (k.intent) parts.push(`intent: ${k.intent}`);
    return `  - ${parts.join(' | ')}`;
  }).join('\n')}`);
  if (brief.topicIdeas?.length) lines.push(`Topic Ideas:\n${brief.topicIdeas.slice(0, 5).map(t => `  - ${t.topic || t}`).join('\n')}`);
  if (brief.contentGaps?.length) lines.push(`Content Gaps:\n${brief.contentGaps.slice(0, 4).map(g => `  - ${g.gap || g}`).join('\n')}`);
  if (brief.tone) lines.push(`Tone: ${brief.tone}`);
  if (brief.CTA?.length) lines.push(`CTA:\n${brief.CTA.slice(0, 3).map(c => `  - ${c.text || c}`).join('\n')}`);
  if (brief.limitations?.length) lines.push(`Limitations:\n${brief.limitations.slice(0, 3).map(l => `  - ${l}`).join('\n')}`);
  return `\n${lines.join('\n')}\n`;
}

export function getFirstFeature(brief) { return brief.product?.features?.[0] ? (typeof brief.product.features[0] === 'object' ? brief.product.features[0].name || brief.product.features[0].feature || brief.product.features[0].title || 'key feature' : brief.product.features[0]) : 'key feature'; }
export function getFirstBenefit(brief) { return brief.product?.benefits?.[0] ? (typeof brief.product.benefits[0] === 'object' ? brief.product.benefits[0].text || brief.product.benefits[0].benefit || 'value' : brief.product.benefits[0]) : 'valuable outcomes'; }
export function getFirstPainPoint(brief) { return brief.painPoints?.[0] || brief.targetPersonas?.[0]?.painPoints?.[0] || 'common challenges'; }
export function getProductName(brief) { return brief.product?.name || brief.product?.brandName || brief.company?.name || 'this solution'; }
export function getPersonaName(brief) { return brief.targetPersonas?.[0]?.name || brief.targetPersonas?.[0]?.role || 'users'; }
export function getKeyword(brief, idx) { return brief.verifiedKeywords?.[idx]?.keyword || brief.verifiedKeywords?.[idx] || ''; }

export function buildProductEvidenceContext(brief) {
  const product = brief.product || {};
  const company = brief.company || {};
  const personas = brief.targetPersonas || [];
  const persona = personas[0] || {};
  const keywords = (brief.verifiedKeywords || []).slice(0, 10);
  return `PRODUCT CONTEXT:
Identity: ${product.name || company.name || 'Unknown'}
Summary: ${product.summary || 'N/A'}
USP: ${product.usp || 'N/A'}
Features: ${(product.features || []).slice(0, 6).map(f => typeof f === 'string' ? f : f.name || f.feature || f).filter(Boolean).join(', ') || 'N/A'}
Benefits: ${(product.benefits || []).slice(0, 6).map(b => typeof b === 'string' ? b : b.text || b.benefit || b.description || b).filter(Boolean).join(', ') || 'N/A'}
Industry: ${company.industry || 'N/A'}
Target Persona: ${persona.name || persona.role || 'N/A'}
Pain Points: ${(persona.painPoints || brief.painPoints || []).slice(0, 5).join('; ') || 'N/A'}
SEO Keywords: ${keywords.map(k => k.keyword).filter(Boolean).join(', ') || 'N/A'}
Competitors: ${(brief.validatedCompetitors || []).slice(0, 5).map(c => c.name).filter(Boolean).join(', ') || 'N/A'}
Tone: ${brief.tone || 'professional'}
Missing evidence: ${(brief.limitations || []).join('; ') || 'None identified'}`;
}

export const FALLBACK_FAILURE = { _status: 'generation_failed', _reason: 'AI generation failed, no rule-based templates available', _provider: 'ai' };

export function getEvidenceForTrend(brief) {
  const hasTrendKeywords = brief.verifiedKeywords?.some(k => k.keyword && (k.volume || k.difficulty)) || false;
  const hasWebData = brief.evidenceSources?.websiteScrape || false;
  if (!hasTrendKeywords && !hasWebData) {
    return "Current trend data is not connected. This content is based on product and SEO evidence.";
  }
  return null;
}
