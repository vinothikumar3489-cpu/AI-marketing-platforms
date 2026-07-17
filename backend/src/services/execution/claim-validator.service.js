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
  /award[- ]winning/i,
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
  // Additional unsupported superlatives
  /\bultimate\b/i,
  /\bbest\b(?!\s+(practices|way|time))/i,
  /\bindustry[- ]leading\b/i,
  /\bnumber one\b/i,
  /\b#1\b/i,
  /\bunmatched\b/i,
  /\brevolutionary\b/i,
  /\bguaranteed\b/i,
  /\bproven\b/i,
  /\bproven approach\b/i,
  /\bhighly successful\b/i,
  /\bgo viral\b/i,
  /\bgain a competitive edge\b/i,
  /\bcompetitive edge\b/i,
  /\btake (your|the) (content|marketing|business) to the next level\b/i,
  /\bnext level\b/i,
  /\bcontent that resonates\b/i,
  // Unsupported percentage growth claims
  /[0-9]+%\s*(follower|followers|engagement|traffic|revenue|sale|sales|conversion|website|visit|visits|lead|leads|download|downloads|signup|signups|retention|growth|increase|improvement|boost|uplift|gain|rate|share|roi|ctr)\b/i,
  /[0-9]+%\s*(higher|lower|more|less|faster|better|greater)\s+(follower|followers|engagement|traffic|revenue|conversion|roi|ctr|growth|rate)/i,
  /\bincrease\s+[a-z]+\s+by\s+[0-9]+%/i,
  /\bboost\s+[a-z]+\s+by\s+[0-9]+%/i,
  /\bgrow\s+[a-z]+\s+by\s+[0-9]+%/i,
  /\bmost advanced\b/i,
  /\bmost powerful\b/i,
  /\bmost comprehensive\b/i,
  /\bmost trusted\b/i,
  /\bmost popular\b/i,
  /\bmost effective\b/i,
  /\bleading\b(?!\s+(edge|platform|tool|solution))/i,
  /\bworld[- ]class\b/i,
  /\benterprise[- ]grade\b/i,
  /\bnext[- ]gen(eration)?\b/i,
  /\binnovative\b/i,
  /\btransformative\b/i,
  /\bdisruptive\b/i,
  /\bunrivaled\b/i,
  /\bunparalleled\b/i,
  /\bbest[- ]in[- ]breed\b/i,
  /\bstate[- ]of[- ]the[- ]art\b/i,
  /\b100%\b(?!\s+(satisfaction|secure|safe))/i,
  /\bmarket leader\b/i,
  /\bmarket[- ]leading\b/i,
  /\bpreferred choice\b/i,
  /\bfirst choice\b/i,
  /\bleading provider\b/i,
  /\bleading solution\b/i,
  /\btop[- ]rated\b/i,
  /\bgroundbreaking\b/i,
  /\bunbeatable\b/i,
  /\bfastest\b/i,
  /\beasiest\b/i,
  /\bsimplest\b/i,
  /\beveryone\b/i,
  /\bno one\b/i,
  /\balways\b/i,
  /\bnever\b/i,
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
  const cleanCopy = JSON.parse(JSON.stringify(content));
  const findings = traverseAndClean(cleanCopy, assetType);
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
    sanitized: cleanCopy,
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
  
  const features = brief.product?.features || [];
  const benefits = brief.product?.benefits || [];
  const hasFeatures = Array.isArray(features) && features.length > 0;
  const hasBenefits = Array.isArray(benefits) && benefits.length > 0;
  
  if (!hasFeatures && !hasBenefits) {
    issues.push('No features or benefits');
  }

  // Only block if there is truly no product identity at all
  const blocked = !brief.product?.name;
  const status = blocked ? 'blocked' : issues.length === 0 ? 'passed' : 'needs_review';

  return {
    valid: !blocked,
    status,
    issues,
  };
}

export default { validateContentClaims, validateBriefContent };
