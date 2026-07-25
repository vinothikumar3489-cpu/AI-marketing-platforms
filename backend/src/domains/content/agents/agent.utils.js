export function getFirstFeature(brief) { return brief.product?.features?.[0] ? (typeof brief.product.features[0] === 'object' ? brief.product.features[0].name || brief.product.features[0].feature || brief.product.features[0].title || 'key feature' : brief.product.features[0]) : 'key feature'; }
export function getFirstBenefit(brief) { return brief.product?.benefits?.[0] ? (typeof brief.product.benefits[0] === 'object' ? brief.product.benefits[0].text || brief.product.benefits[0].benefit || 'value' : brief.product.benefits[0]) : 'valuable outcomes'; }
export function getFirstPainPoint(brief) { return brief.painPoints?.[0] || brief.targetPersonas?.[0]?.painPoints?.[0] || 'common challenges'; }
export function getProductName(brief) { return brief.product?.name || brief.product?.brandName || brief.company?.name || 'this solution'; }
export function getPersonaName(brief) { return brief.targetPersonas?.[0]?.name || brief.targetPersonas?.[0]?.role || 'users'; }
export function getKeyword(brief, idx) { return brief.verifiedKeywords?.[idx]?.keyword || brief.verifiedKeywords?.[idx] || ''; }

export function buildProductEvidenceContext(brief, normalizedEvidence) {
  const product = brief.product || {};
  const company = brief.company || {};
  const personas = brief.targetPersonas || [];
  const persona = personas[0] || {};
  const keywords = (brief.verifiedKeywords || []).slice(0, 10);
  const features = (product.features || []).slice(0, 6);
  const benefits = (product.benefits || []).slice(0, 6);
  
  // Use normalizedEvidence if available (safe array, never raw objects)
  const normalizedKw = normalizedEvidence?.keywords;
  const evidenceKeywords = Array.isArray(normalizedKw) && normalizedKw.length > 0
    ? normalizedKw.slice(0, 10).map(k => typeof k === 'string' ? k : (k?.keyword || k?.phrase || '')).filter(Boolean)
    : keywords.map(k => k.keyword).filter(Boolean);
  return `PRODUCT CONTEXT:
Identity: ${product.name || company.name || 'Unknown'}
Summary: ${product.summary || 'N/A'}
USP: ${product.usp || 'N/A'}
Features: ${features.map(f => typeof f === 'string' ? f : f.name || f.feature || f).filter(Boolean).join(', ') || 'N/A'}
Benefits: ${benefits.map(b => typeof b === 'string' ? b : b.text || b.benefit || b.description || b).filter(Boolean).join(', ') || 'N/A'}
Industry: ${company.industry || 'N/A'}
Target Persona: ${persona.name || persona.role || 'N/A'}
Pain Points: ${(persona.painPoints || brief.painPoints || []).slice(0, 5).join('; ') || 'N/A'}
SEO Keywords: ${evidenceKeywords.join(', ') || 'N/A'}
Competitors: ${(brief.validatedCompetitors || []).slice(0, 5).map(c => c.name).filter(Boolean).join(', ') || 'N/A'}
Tone: ${brief.tone || 'professional'}
Missing evidence: ${(brief.limitations || []).join('; ') || 'None identified'}`;
}

export function buildFallbackFeatures(brief) {
  const features = brief.product?.features || [];
  if (features.length === 0) return ['Core platform capabilities', 'Advanced analytics dashboard', 'Seamless integration options'];
  return features.map(f => typeof f === 'string' ? f : (f.name || f.feature || f.title || '')).filter(Boolean).slice(0, 5);
}

export function buildFallbackBenefits(brief) {
  const benefits = brief.product?.benefits || [];
  if (benefits.length === 0) return ['Increased operational efficiency', 'Enhanced team productivity', 'Reduced manual effort', 'Better data-driven decisions', 'Improved user satisfaction'];
  return benefits.map(b => typeof b === 'string' ? b : (b.text || b.benefit || b.description || '')).filter(Boolean).slice(0, 5);
}

export function buildFallbackEvidenceFields(brief) {
  const fields = [];
  if (brief.product?.name) fields.push('product_name');
  if (brief.product?.features?.length) fields.push('product_features');
  if (brief.product?.benefits?.length) fields.push('product_benefits');
  if (brief.painPoints?.length) fields.push('pain_points');
  if (brief.targetPersonas?.length) fields.push('target_personas');
  if (brief.validatedCompetitors?.length) fields.push('competitors');
  if (brief.verifiedKeywords?.length) fields.push('seo_keywords');
  return fields;
}

export function getEvidenceForTrend(brief) {
  const hasTrendKeywords = brief.verifiedKeywords?.some(k => k.keyword && (k.volume || k.difficulty)) || false;
  const hasWebData = brief.evidenceSources?.websiteScrape || false;
  if (!hasTrendKeywords && !hasWebData) {
    return "Current trend data is not connected. This content is based on product and SEO evidence.";
  }
  return null;
}
