/**
 * Content Studio Quality Scorer
 *
 * Uses categorical checks (not percentages).
 * Returns Passed / Needs review / Blocked per category.
 */

const QUALITY_CHECKS = {
  productSpecificity: {
    label: 'Product specificity',
    check: (content, brief) => {
      const productName = brief?.product?.name;
      if (!productName) return { status: 'blocked', detail: 'No product name in brief' };
      const escaped = productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const contentStr = JSON.stringify(content).toLowerCase();
      const mentions = (contentStr.match(new RegExp(escaped.toLowerCase(), 'g')) || []).length;
      if (mentions === 0) return { status: 'blocked', detail: `Product "${productName}" not mentioned in content` };
      if (mentions < 3) return { status: 'needs_review', detail: `Product mentioned only ${mentions} times` };
      return { status: 'passed', detail: `Product mentioned ${mentions} times` };
    },
  },
  evidenceCoverage: {
    label: 'Evidence coverage',
    check: (content, brief) => {
      const evidenceUsed = content.evidenceUsed || [];
      if (!evidenceUsed.length) return { status: 'needs_review', detail: 'No evidence sources listed' };
      const briefSources = Object.entries(brief?.evidenceSources || {}).filter(([, v]) => v).length;
      if (evidenceUsed.length < 2 && briefSources > 0) return { status: 'needs_review', detail: `Only ${evidenceUsed.length} evidence sources cited out of ${briefSources} available` };
      return { status: 'passed', detail: `${evidenceUsed.length} evidence sources cited` };
    },
  },
  audienceRelevance: {
    label: 'Audience relevance',
    check: (content, brief) => {
      const personas = brief?.targetPersonas || [];
      const painPoints = brief?.painPoints || [];
      if (!personas.length && !painPoints.length) return { status: 'needs_review', detail: 'No audience data in brief' };
      const contentStr = JSON.stringify(content).toLowerCase();
      const personaHits = personas.filter(p => p.name && contentStr.includes(p.name.toLowerCase())).length;
      const painHits = painPoints.filter(p => contentStr.includes(p.toLowerCase())).length;
      if (personaHits === 0 && painHits === 0) return { status: 'needs_review', detail: 'Content does not reference audience personas or pain points' };
      return { status: 'passed', detail: `References ${personaHits} personas and ${painHits} pain points` };
    },
  },
  ctaClarity: {
    label: 'CTA clarity',
    check: (content) => {
      const cta = content.cta || content.callToAction;
      if (!cta || cta.length < 5) return { status: 'needs_review', detail: 'No clear CTA' };
      if (cta.length > 150) return { status: 'needs_review', detail: 'CTA too long' };
      return { status: 'passed', detail: 'Clear CTA present' };
    },
  },
  toneConsistency: {
    label: 'Tone consistency',
    check: (content) => {
      const contentStr = JSON.stringify(content);
      const exclamationCount = (contentStr.match(/!/g) || []).length;
      const capsWords = (contentStr.match(/\b[A-Z]{4,}\b/g) || []).length;
      if (exclamationCount > 5) return { status: 'needs_review', detail: `${exclamationCount} exclamation marks — may be too promotional` };
      if (capsWords > 3) return { status: 'needs_review', detail: `${capsWords} ALL-CAPS words detected` };
      return { status: 'passed', detail: 'Tone appears consistent' };
    },
  },
  unsupportedClaims: {
    label: 'Unsupported claims',
    check: (content) => {
      const claimsReview = content.claimsRequiringReview || [];
      if (claimsReview.length > 3) return { status: 'blocked', detail: `${claimsReview.length} claims requiring review — too many` };
      if (claimsReview.length > 0) return { status: 'needs_review', detail: `${claimsReview.length} claims flagged for review` };
      return { status: 'passed', detail: 'No unsupported claims' };
    },
  },
  seoAlignment: {
    label: 'SEO alignment',
    check: (content, brief) => {
      const keywords = brief?.verifiedKeywords || [];
      if (!keywords.length) return { status: 'needs_review', detail: 'No SEO keywords in brief' };
      const title = (content.metaTitle || content.title || '').toLowerCase();
      const desc = (content.metaDescription || '').toLowerCase();
      const matchCount = keywords.filter(k => title.includes((k.keyword || '').toLowerCase()) || desc.includes((k.keyword || '').toLowerCase())).length;
      if (matchCount === 0) return { status: 'needs_review', detail: 'No keywords in meta title or description' };
      return { status: 'passed', detail: `${matchCount} keywords found in metadata` };
    },
  },
  readability: {
    label: 'Readability',
    check: (content) => {
      const article = content.article || content.body || content.text || content.description || '';
      if (!article || article.length < 100) return { status: 'needs_review', detail: 'Content too short for readability assessment' };
      const sentences = article.split(/[.!?]+/).filter(Boolean);
      const avgWords = sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0) / sentences.length;
      if (avgWords > 30) return { status: 'needs_review', detail: `Average sentence length ${Math.round(avgWords)} words — may be hard to read` };
      return { status: 'passed', detail: `Average sentence length ${Math.round(avgWords)} words` };
    },
  },
};

export function scoreContentQuality(content, brief, assetType) {
  const results = {};

  for (const [key, check] of Object.entries(QUALITY_CHECKS)) {
    try {
      results[key] = check.check(content, brief);
    } catch (e) {
      results[key] = { status: 'needs_review', detail: `Check error: ${e.message}` };
    }
  }

  const counts = { passed: 0, needs_review: 0, blocked: 0 };
  for (const r of Object.values(results)) {
    counts[r.status]++;
  }

  let overall;
  if (counts.blocked > 0) overall = 'Blocked';
  else if (counts.needs_review > 2) overall = 'Needs review';
  else overall = 'Passed';

  return {
    overall,
    checks: results,
    summary: `Passed: ${counts.passed}, Needs review: ${counts.needs_review}, Blocked: ${counts.blocked}`,
    counts,
  };
}

export { QUALITY_CHECKS };
export default { scoreContentQuality };
