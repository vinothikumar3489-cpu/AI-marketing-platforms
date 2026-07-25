const QUALITY_WEIGHTS = {
  platformSuitability: 0.15,
  productSpecificity: 0.20,
  brandConsistency: 0.10,
  seoUsage: 0.10,
  readability: 0.10,
  ctaQuality: 0.15,
  evidenceUsage: 0.10,
  originality: 0.05,
  compliance: 0.05,
};

function scorePlatformSuitability(content, assetType) {
  let score = 1.0;
  if (assetType === 'linkedin_post') {
    if (content.body?.length > 1500) score -= 0.3;
    if (!content.hook || content.hook.length > 200) score -= 0.2;
    if (!content.cta) score -= 0.1;
  }
  if (assetType === 'twitter_post' || assetType === 'x_post') {
    if (content.post?.length > 280) score -= 0.5;
    if (content.post?.length < 50) score -= 0.2;
  }
  if (assetType === 'instagram_post') {
    if (!content.caption) score -= 0.3;
    if (!content.visualConcept) score -= 0.2;
  }
  if (assetType === 'blog_article') {
    if (!content.sections || content.sections.length < 2) score -= 0.3;
    if (!content.headline) score -= 0.2;
    if (!content.introduction) score -= 0.2;
  }
  if (assetType === 'landing_page') {
    if (!content.headline) score -= 0.3;
    if (!content.heroCTA) score -= 0.2;
    if (!content.features || content.features.length < 2) score -= 0.2;
  }
  if (assetType === 'email_copy' || assetType.startsWith('email_')) {
    if (!content.subject) score -= 0.3;
    if (!content.html) score -= 0.2;
    if (!content.callToAction && !content.primaryCta) score -= 0.1;
  }
  if (assetType === 'video_script') {
    if (!content.scenes || content.scenes.length < 3) score -= 0.4;
    if (!content.title) score -= 0.2;
  }
  if (assetType === 'comparison_page') {
    if (!content.comparisonTable?.rows?.length) score -= 0.4;
    if (!content.whyChooseUs) score -= 0.2;
  }
  if (assetType === 'product_page') {
    if (!content.keyFeatures || content.keyFeatures.length < 2) score -= 0.3;
    if (!content.useCases?.length) score -= 0.2;
  }
  if (assetType === 'faq_page') {
    if (!content.faqs || content.faqs.length < 3) score -= 0.4;
  }
  if (assetType === 'feature_announcement') {
    if (!content.headline) score -= 0.3;
    if (!content.body) score -= 0.3;
  }
  if (assetType === 'whitepaper') {
    if (!content.sections || content.sections.length < 3) score -= 0.4;
    if (!content.executiveSummary) score -= 0.2;
  }
  if (assetType === 'creative_brief') {
    if (!content.objective) score -= 0.3;
    if (!content.message) score -= 0.2;
    if (!content.visualDirection) score -= 0.2;
  }
  if (assetType === 'youtube_description') {
    if (!content.description) score -= 0.3;
    if (!content.title) score -= 0.2;
  }

  return Math.max(0, Math.min(1, score));
}

function scoreProductSpecificity(content, evidenceGraph) {
  let score = 0.5;
  if (!evidenceGraph?.product?.name) return score;

  const productName = evidenceGraph.product.name.toLowerCase();
  const contentStr = JSON.stringify(content).toLowerCase();

  if (contentStr.includes(productName)) score += 0.2;

  const features = evidenceGraph.product.features || [];
  const matchedFeatures = features.filter(f => {
    const fName = typeof f === 'string' ? f : (f.name || f.feature || '');
    return fName && contentStr.includes(fName.toLowerCase());
  });
  if (matchedFeatures.length > 0) score += 0.15 * Math.min(1, matchedFeatures.length / 3);

  const benefits = evidenceGraph.product.benefits || [];
  const matchedBenefits = benefits.filter(b => {
    const bText = typeof b === 'string' ? b : (b.text || b.benefit || '');
    return bText && contentStr.includes(bText.toLowerCase());
  });
  if (matchedBenefits.length > 0) score += 0.1 * Math.min(1, matchedBenefits.length / 3);

  if (evidenceGraph.product.usp && contentStr.includes(evidenceGraph.product.usp.toLowerCase())) score += 0.05;

  return Math.min(1, score);
}

function scoreBrandConsistency(content, evidenceGraph) {
  let score = 0.7;
  const brandName = evidenceGraph?.company?.brandName || evidenceGraph?.product?.brandName;
  if (!brandName) return score;

  const brandLower = brandName.toLowerCase();
  const contentStr = JSON.stringify(content).toLowerCase();

  if (contentStr.includes(brandLower)) score += 0.15;

  const industry = evidenceGraph?.company?.industry;
  if (industry && contentStr.includes(industry.toLowerCase())) score += 0.15;

  return Math.min(1, score);
}

function scoreSeoUsage(content, evidenceGraph) {
  const keywords = evidenceGraph?.seo?.keywords || [];
  if (keywords.length === 0) return 0.5;

  const contentStr = JSON.stringify(content).toLowerCase();
  const matchedCount = keywords.filter(k => {
    const kw = typeof k === 'string' ? k : (k.keyword || k.phrase || '');
    return kw && contentStr.includes(kw.toLowerCase());
  }).length;

  if (matchedCount === 0) return 0.3;
  const ratio = matchedCount / Math.min(keywords.length, 10);
  return Math.min(1, 0.3 + ratio * 0.7);
}

function scoreReadability(content) {
  const contentStr = JSON.stringify(content);
  const sentences = contentStr.split(/[.!?]+\s/).filter(Boolean);
  if (sentences.length === 0) return 0.5;

  const avgWords = sentences.reduce((sum, s) => sum + s.split(/\s+/).filter(Boolean).length, 0) / sentences.length;
  if (avgWords > 40) return 0.3;
  if (avgWords > 25) return 0.6;
  if (avgWords > 12) return 0.9;
  return 1.0;
}

function scoreCtaQuality(content) {
  if (content.cta && content.cta.length > 10 && content.cta.length < 100) return 1.0;
  if (content.callToAction) {
    const cta = typeof content.callToAction === 'string' ? content.callToAction : (content.callToAction.label || '');
    if (cta.length > 5) return 1.0;
  }
  if (content.primaryCta?.label) return 1.0;
  if (content.heroCTA) return 0.8;
  if (content.finalCTA) return 0.8;

  const anyCta = content.ctaText || content.ctaUrl || content.callToActionText;
  if (anyCta) return 0.6;

  return 0.0;
}

function scoreEvidenceUsage(content) {
  const evidenceUsed = content.evidenceUsed || content._evidenceUsed || [];
  if (Array.isArray(evidenceUsed) && evidenceUsed.length > 0) return Math.min(1, 0.4 + evidenceUsed.length * 0.1);
  if (content.claimsRequiringReview && content.claimsRequiringReview.length === 0) return 0.5;
  return 0.3;
}

function scoreOriginality(content) {
  const checks = [
    'stay ahead', 'game-changer', 'cutting-edge', 'revolutionary', 'best-in-class',
    'industry-leading', 'state-of-the-art', 'ultimate', '#1', 'number one',
    'In today\'s world', 'In today\'s digital', 'transform your',
  ];
  const contentStr = JSON.stringify(content).toLowerCase();
  const clicheCount = checks.filter(c => contentStr.includes(c)).length;
  if (clicheCount > 3) return 0.2;
  if (clicheCount > 1) return 0.5;
  return 1.0;
}

function scoreCompliance(content) {
  const contentStr = JSON.stringify(content).toLowerCase();
  const riskyClaims = [
    'guarantee', 'guaranteed', 'proven', '100%', 'money back', 'best',
    'fastest', 'cheapest', 'most effective',
  ];
  const riskyCount = riskyClaims.filter(c => contentStr.includes(c)).length;
  if (riskyCount > 2) return 0.3;
  if (riskyCount > 0) return 0.7;
  return 1.0;
}

export function scoreContentQuality(content, evidenceGraphOrNull, assetType) {
  if (!content || typeof content !== 'object') {
    return { overall: 0, scores: {}, details: ['No content provided'], passed: false };
  }

  const evidenceGraph = evidenceGraphOrNull && typeof evidenceGraphOrNull === 'object' && !Array.isArray(evidenceGraphOrNull)
    ? evidenceGraphOrNull : null;

  const scores = {};
  const details = [];

  scores.platformSuitability = scorePlatformSuitability(content, assetType);
  scores.productSpecificity = scoreProductSpecificity(content, evidenceGraph);
  scores.brandConsistency = scoreBrandConsistency(content, evidenceGraph);
  scores.seoUsage = scoreSeoUsage(content, evidenceGraph);
  scores.readability = scoreReadability(content);
  scores.ctaQuality = scoreCtaQuality(content);
  scores.evidenceUsage = scoreEvidenceUsage(content);
  scores.originality = scoreOriginality(content);
  scores.compliance = scoreCompliance(content);

  let overall = 0;
  let totalWeight = 0;
  for (const [key, weight] of Object.entries(QUALITY_WEIGHTS)) {
    if (scores[key] !== undefined) {
      overall += scores[key] * weight;
      totalWeight += weight;
    }
  }
  if (totalWeight > 0) overall /= totalWeight;
  overall = Math.round(overall * 100);

  if (overall < 40) details.push('Quality score critically low — content needs significant improvement');
  if (scores.platformSuitability < 0.5) details.push(`Platform suitability is weak for ${assetType}`);
  if (scores.productSpecificity < 0.5) details.push('Content lacks specific product references');
  if (scores.ctaQuality < 0.5) details.push('Call-to-action is missing or weak');
  if (scores.evidenceUsage < 0.4) details.push('Content does not cite evidence sources');
  if (scores.originality < 0.5) details.push('Content uses cliches or overused phrases');

  const passed = overall >= 90;

  return {
    overall,
    scores,
    details,
    passed,
    needsRewrite: overall < 90,
    rewriteAttempts: 0,
    maxRewriteAttempts: 3,
    rewriteSuggestions: details.length > 0 ? details : ['Minor improvements needed'],
  };
}

export function buildRewritePrompt(originalContent, qualityResult, assetType, brief) {
  const weakAreas = Object.entries(qualityResult.scores)
    .filter(([, score]) => score < 0.6)
    .map(([key]) => key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()));

  return `Rewrite the following ${assetType.replace(/_/g, ' ')} to address these quality issues:

Weak areas: ${weakAreas.join(', ')}

Original issues to fix:
${qualityResult.details.map(d => `- ${d}`).join('\n')}

Product context:
${brief?.product?.name ? `Product: ${brief.product.name}` : ''}
${brief?.product?.usp ? `USP: ${brief.product.usp}` : ''}
${brief?.product?.features?.length ? `Key features: ${brief.product.features.slice(0, 5).map(f => typeof f === 'string' ? f : f.name).filter(Boolean).join(', ')}` : ''}

Original content body (rewrite this with the above feedback in mind):
${JSON.stringify(originalContent, null, 2)}

Return the same JSON structure with improved content addressing each issue.`;
}

export default { scoreContentQuality, buildRewritePrompt };
