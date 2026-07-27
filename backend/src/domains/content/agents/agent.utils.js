function extractText(v) {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (v.value && typeof v.value === 'string') return v.value;
  if (v.text) return v.text;
  if (v.name) return v.name;
  if (v.title) return v.title;
  return '';
}

function extractArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (v.value && Array.isArray(v.value)) return v.value;
  if (Array.isArray(v.items)) return v.items;
  return [];
}

export function getFirstFeature(brief) {
  const f = extractArray(brief.product?.features || brief.features);
  const first = f?.[0];
  return first ? (extractText(first) || (first.name || first.feature || first.title || 'key feature')) : 'key feature';
}

export function getFirstBenefit(brief) {
  const b = extractArray(brief.product?.benefits || brief.benefits);
  const first = b?.[0];
  return first ? (extractText(first) || (first.text || first.benefit || 'value')) : 'valuable outcomes';
}

export function getFirstPainPoint(brief) {
  return brief.painPoints?.[0] || brief.targetPersonas?.[0]?.painPoints?.[0] || brief.audience?.painPoints?.[0] || 'common challenges';
}

export function getProductName(brief) {
  return brief.product?.name || brief.product?.brandName || brief.company?.name || brief.productIdentity?.displayName || 'this solution';
}

export function getPersonaName(brief) {
  return brief.targetPersonas?.[0]?.name || brief.targetPersonas?.[0]?.role || brief.audience?.primary || 'users';
}

export function getKeyword(brief, idx) {
  const kw = brief.verifiedKeywords?.[idx] || brief.seo?.primary?.[idx] || brief.seo?.primaryKeywords?.[idx];
  return kw ? (typeof kw === 'string' ? kw : kw.keyword || kw.phrase || '') : '';
}

function resolveEvidence(brief, context) {
  const evidence = (brief && typeof brief === 'object' && brief._source !== 'unified_evidence_graph') ? brief : (context || {});
  return evidence;
}

export function buildProductEvidenceContext(brief, normalizedEvidence) {
  const product = brief.product || {};
  const company = brief.company || {};
  const personas = brief.targetPersonas || [];
  const persona = personas[0] || {};
  const keywords = (brief.verifiedKeywords || []).slice(0, 10);
  const features = (product.features || []).slice(0, 6);
  const benefits = (product.benefits || []).slice(0, 6);

  const normalizedKw = normalizedEvidence?.keywords;
  const evidenceKeywords = Array.isArray(normalizedKw) && normalizedKw.length > 0
    ? normalizedKw.slice(0, 10).map(k => extractText(k))
    : keywords.map(k => extractText(k));

  const painPoint = getFirstPainPoint(brief);
  const personaName = getPersonaName(brief);

  const campaignGoal = brief.campaign?.goal?.value || brief.campaign?.goal || '';
  const businessGoal = brief.campaign?.businessGoal?.value || brief.campaign?.businessGoal || '';
  const primaryCTA = brief.campaign?.primaryCTA?.value || brief.campaign?.primaryCTA || '';
  const brandVoice = brief.campaign?.brandVoice?.value || brief.campaign?.brandVoice || brief.brandVoice?.value || brief.brandVoice || '';
  const buyingStage = brief.audience?.buyingStage?.value || brief.audience?.buyingStage || '';
  const decisionDrivers = extractArray(brief.audience?.decisionDrivers?.value || brief.audience?.decisionDrivers || []);

  const seoPrimary = extractArray(brief.seo?.primary?.value || brief.seo?.primary || brief.seo?.primaryKeywords || []);
  const seoClusters = extractArray(brief.seo?.clusters?.value || brief.seo?.clusters || []);
  const seoIntent = brief.seo?.intent?.value || brief.seo?.intent || '';
  const seoContentGaps = extractArray(brief.seo?.contentGaps?.value || brief.seo?.contentGaps || []);

  const execStory = brief.executive?.story?.value || brief.executive?.story || '';
  const execRecommendations = extractArray(brief.executive?.recommendations?.value || brief.executive?.recommendations || []);

  const growthWs = brief.growthWorkspace || '';

  return `PRODUCT & COMPANY:
Identity: ${company.name || product.name || 'Unknown'}
Product Name: ${product.name || 'N/A'}
Brand: ${product.brandName || company.brandName || 'N/A'}
Summary: ${product.summary || product.description || 'N/A'}
USP: ${product.usp || 'N/A'}
Industry: ${company.industry || product.industry || 'N/A'}

PRODUCT FEATURES:
${features.map(f => `- ${extractText(f)}${f.description ? ': ' + f.description : ''}${f.benefit ? ' — Benefit: ' + f.benefit : ''}`).join('\n') || 'N/A'}

PRODUCT BENEFITS:
${benefits.map(b => `- ${extractText(b)}${b.description ? ': ' + b.description : ''}`).join('\n') || 'N/A'}

BUSINESS CONTEXT:
Campaign Goal: ${campaignGoal || 'N/A'}
Business Goal: ${businessGoal || 'N/A'}
Primary CTA: ${primaryCTA || 'N/A'}
Brand Voice: ${brandVoice || 'professional'}
Buying Stage: ${buyingStage || 'N/A'}
Decision Drivers: ${decisionDrivers.join(', ') || 'N/A'}

TARGET AUDIENCE:
Persona: ${personaName || 'N/A'}
Pain Points: ${(persona.painPoints || brief.painPoints || []).slice(0, 5).join('; ') || painPoint || 'N/A'}
Buying Stage: ${buyingStage || 'N/A'}

SEO CONTEXT:
Primary Keywords: ${evidenceKeywords.slice(0, 10).join(', ') || 'N/A'}
Clusters: ${seoClusters.map(c => c.name || c).join(', ') || 'N/A'}
Search Intent: ${seoIntent || 'N/A'}
Content Gaps: ${seoContentGaps.map(g => g.topic || g).join(', ') || 'N/A'}

COMPETITIVE CONTEXT:
Competitors: ${(brief.validatedCompetitors || []).slice(0, 5).map(c => c.name).filter(Boolean).join(', ') || 'N/A'}

EXECUTIVE SUMMARY:
${execStory ? execStory.substring(0, 300) : 'N/A'}
${execRecommendations.length > 0 ? 'Executive Recommendations: ' + execRecommendations.map(r => r.action || r.recommendation || r).join(', ') : ''}

GROWTH WORKSPACE:
${typeof growthWs === 'object' ? JSON.stringify(growthWs).substring(0, 300) : growthWs || 'N/A'}

Tone: ${brief.tone || 'professional'}
Missing evidence: ${(brief.limitations || []).join('; ') || 'None identified'}`;
}

export function buildFallbackFeatures(brief) {
  const features = brief.product?.features || [];
  if (features.length === 0) return ['Core platform capabilities', 'Advanced analytics dashboard', 'Seamless integration options'];
  return features.map(f => extractText(f) || (f.name || f.feature || f.title || '')).filter(Boolean).slice(0, 5);
}

export function buildFallbackBenefits(brief) {
  const benefits = brief.product?.benefits || [];
  if (benefits.length === 0) return ['Increased operational efficiency', 'Enhanced team productivity', 'Reduced manual effort', 'Better data-driven decisions', 'Improved user satisfaction'];
  return benefits.map(b => extractText(b) || (b.text || b.benefit || b.description || '')).filter(Boolean).slice(0, 5);
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
  if (brief.campaign?.goal) fields.push('campaign_goal');
  if (brief.seo?.clusters) fields.push('seo_clusters');
  return fields;
}

export function checkEvidenceSufficiency(brief, normalizedEvidence, minFeatures = 1, minBenefits = 1) {
  const evidence = normalizedEvidence || brief?.evidenceSnapshot || brief?.product;

  const features = Array.isArray(evidence?.features) ? evidence.features :
                   Array.isArray(brief?.product?.features) ? brief.product.features : [];
  const benefits = Array.isArray(evidence?.benefits) ? evidence.benefits :
                   Array.isArray(brief?.product?.benefits) ? brief.product.benefits : [];
  const productName = brief?.product?.name || brief?.product?.displayName || brief?.productIdentity?.displayName || '';

  if (!productName) {
    return 'Additional verified product information is required. No product name identified.';
  }

  if (features.length < minFeatures) {
    return 'Additional verified product information is required. Insufficient feature data for content generation.';
  }

  if (benefits.length < minBenefits) {
    return 'Additional verified product information is required. Insufficient benefit data for content generation.';
  }

  return null;
}

export function getEvidenceForTrend(brief) {
  const hasTrendKeywords = brief.verifiedKeywords?.some(k => k.keyword && (k.volume || k.difficulty)) || false;
  const hasWebData = brief.evidenceSources?.websiteScrape || false;
  if (!hasTrendKeywords && !hasWebData) {
    return "Current trend data is not connected. This content is based on product and SEO evidence.";
  }
  return null;
}
