/**
 * Content Studio Claim Validator
 * Rejects fabricated claims before they reach output.
 *
 * Every factual claim must be:
 * - supported by evidence (evidence_backed / verified),
 * - clearly marked as inference (ai_inferred / topic_idea_only),
 * - or omitted.
 */

const HALLUCINATED_PATTERNS = [
  /according to our research/i,
  /studies show/i,
  /research indicates/i,
  /industry experts say/i,
  /our customers report/i,
  /customers have seen/i,
  /join [0-9,+]+\+ (customers|users|companies)/i,
  /trusted by [0-9,+]+\+/i,
  /over [0-9,+]+\+ (customers|businesses|companies)/i,
  /rated [0-9](\.[0-9])?\/[0-9]+ (stars|out of)/i,
  /award-winning/i,
  /best[- ]in[- ]class/i,
  /game[- ]changer/i,
  /industry[- ]leading/i,
  /cutting[- ]edge/i,
  /as low as \$/i,
  /starting at \$/i,
  /only \$/i,
  /save up to/i,
  /reduce (costs|time|effort) by [0-9]+%/i,
  /increase (revenue|traffic|sales) by [0-9]+%/i,
  /[0-9]+% (faster|better|more efficient)/i,
  /testimonial from/i,
  /"[^"]{10,}" — \w+/,
  /\w+ says,? "/i,
];

const FAKE_METRICS = [
  /ROI/i,
  /conversion rate/i,
  /open rate/i,
  /click[- ]?through rate/i,
  /engagement rate/i,
];

function containsHallucination(text) {
  if (typeof text !== 'string') return false;
  return HALLUCINATED_PATTERNS.some(pattern => pattern.test(text));
}

function containsFakeMetric(text) {
  if (typeof text !== 'string') return false;
  return FAKE_METRICS.some(pattern => pattern.test(text));
}

function traverseAndClean(obj, path = '', findings = []) {
  if (!obj || typeof obj !== 'object') return findings;

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;

    if (typeof value === 'string') {
      if (containsHallucination(value)) {
        findings.push({
          path: currentPath,
          issue: 'hallucinated_pattern',
          text: value.substring(0, 100),
          action: 'removed',
        });
        obj[key] = null;
      } else if (containsFakeMetric(value) && !key.toLowerCase().includes('limitation')) {
        findings.push({
          path: currentPath,
          issue: 'fake_metric',
          text: value.substring(0, 100),
          action: 'flagged_for_review',
        });
      }
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => traverseAndClean(item, `${currentPath}[${i}]`, findings));
    } else if (value && typeof value === 'object') {
      traverseAndClean(value, currentPath, findings);
    }
  }

  return findings;
}

export function validateContentClaims(content, assetType) {
  const findings = traverseAndClean(content, assetType);
  const hasRejections = findings.some(f => f.action === 'removed');
  const hasFlags = findings.some(f => f.action === 'flagged_for_review');

  return {
    valid: !hasRejections,
    hasFlags,
    findings,
    claimCount: findings.length,
    rejectedCount: findings.filter(f => f.action === 'removed').length,
    flaggedCount: findings.filter(f => f.action === 'flagged_for_review').length,
    status: hasRejections ? 'blocked' : hasFlags ? 'needs_review' : 'passed',
  };
}

export function validateBriefContent(brief) {
  if (!brief || brief.rejected) {
    return { valid: false, status: 'blocked', reason: brief?.reason || 'No brief available' };
  }

  const issues = [];
  if (!brief.product) issues.push('No product data in brief');
  if (!brief.product?.name) issues.push('No product name');
  if (!brief.product?.summary && !brief.product?.usp) issues.push('No product summary or USP');
  if (!brief.product?.features?.length && !brief.product?.benefits?.length) issues.push('No features or benefits');

  return {
    valid: issues.length === 0,
    status: issues.length === 0 ? 'passed' : issues.length <= 2 ? 'needs_review' : 'blocked',
    issues,
  };
}

export default { validateContentClaims, validateBriefContent };
