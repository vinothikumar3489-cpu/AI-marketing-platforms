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

const SAFE_REPLACEMENTS = [
  [/\bbest\b(?!\s+(practices|way|time))/gi, 'designed to help'],
  [/\b#1\b/gi, 'preferred'],
  [/\bnumber one\b/gi, 'preferred'],
  [/\bguaranteed\b/gi, 'designed to'],
  [/\bfastest\b/gi, 'efficient'],
  [/\bmarket leader\b/gi, 'trusted option'],
  [/\bmarket[- ]leading\b/gi, 'trusted'],
  [/\bindustry[- ]leading\b/gi, 'well-regarded'],
  [/\bleading provider\b/gi, 'notable provider'],
  [/\bleading solution\b/gi, 'effective solution'],
  [/\bworld[- ]class\b/gi, 'high-quality'],
  [/\bunmatched\b/gi, 'strong'],
  [/\bunbeatable\b/gi, 'competitive'],
  [/\bunrivaled\b/gi, 'distinctive'],
  [/\bunparalleled\b/gi, 'exceptional'],
  [/\bproven\b/gi, 'tested'],
  [/\brevolutionary\b/gi, 'modern'],
  [/\bgame[- ]changer\b/gi, 'valuable tool'],
  [/\bcutting[- ]edge\b/gi, 'modern'],
  [/\bstate[- ]of[- ]the[- ]art\b/gi, 'advanced'],
  [/\binnovative\b/gi, 'practical'],
  [/\btransformative\b/gi, 'effective'],
  [/\bdisruptive\b/gi, 'different'],
  [/\bgroundbreaking\b/gi, 'notable'],
  [/\bnext[- ]gen(eration)?\b/gi, 'new'],
  [/\benterprise[- ]grade\b/gi, 'enterprise-ready'],
  [/\bmost advanced\b/gi, 'advanced'],
  [/\bmost powerful\b/gi, 'powerful'],
  [/\bmost comprehensive\b/gi, 'comprehensive'],
  [/\bmost trusted\b/gi, 'trusted'],
  [/\bmost popular\b/gi, 'well-known'],
  [/\bmost effective\b/gi, 'effective'],
  [/\b100%\b(?!\s+(satisfaction|secure|safe))/gi, 'highly'],
  [/\bgo viral\b/gi, 'gain visibility'],
  [/\beveryone\b/gi, 'many teams'],
  [/\bno one\b/gi, 'few'],
  [/\balways\b/gi, 'consistently'],
  [/\bnever\b/gi, 'rarely'],
];

function autoRewrite(text) {
  if (typeof text !== 'string' || !text) return text;
  let result = text;
  for (const [pattern, replacement] of SAFE_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function traverseAndClean(obj, path = '', findings = []) {
  if (!obj || typeof obj !== 'object') return findings;

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;

    if (typeof value === 'string') {
      if (containsHallucination(value) || containsFakeMetric(value)) {
        const rewritten = autoRewrite(value);
        if (rewritten !== value) {
          findings.push({
            path: currentPath,
            issue: 'auto_rewritten',
            text: value.substring(0, 100),
            rewritten: rewritten.substring(0, 100),
            action: 'rewritten',
          });
          obj[key] = rewritten;
        } else if (containsHallucination(value)) {
          obj[key] = '[Content removed — unsupported claim]';
          findings.push({
            path: currentPath,
            issue: 'hallucinated_pattern',
            text: value.substring(0, 100),
            action: 'removed',
          });
        }
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
  const hasRemoved = findings.some(f => f.action === 'removed');
  const hasRewritten = findings.some(f => f.action === 'rewritten');
  const hasFlags = findings.some(f => f.action === 'flagged_for_review');

  return {
    valid: true,
    hasFlags: hasFlags || hasRemoved,
    findings,
    claimCount: findings.length,
    rejectedCount: findings.filter(f => f.action === 'removed').length,
    flaggedCount: findings.filter(f => f.action === 'flagged_for_review').length,
    rewrittenCount: findings.filter(f => f.action === 'rewritten').length,
    status: hasRewritten ? 'auto_rewritten' : hasRemoved ? 'auto_rewritten' : hasFlags ? 'needs_review' : 'passed',
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

  // Validate product identity is not generic
  const INVALID_PRODUCT_LABELS = new Set([
    'unknown product', 'new analysis', 'new & featured', 'untitled',
    'new project', 'growth analysis', 'featured', 'home',
  ]);
  
  const productName = brief.product?.name?.toLowerCase().trim();
  if (productName && (INVALID_PRODUCT_LABELS.has(productName) || productName.length < 2)) {
    return { 
      valid: false, 
      status: 'blocked', 
      reason: `Invalid product identity: "${brief.product.name}" — content generation requires verified product`,
      code: 'INVALID_PRODUCT_IDENTITY'
    };
  }

  // Only block if there is truly no product identity at all
  const blocked = !brief.product?.name;
  const status = blocked ? 'blocked' : issues.length === 0 ? 'passed' : 'needs_review';

  return {
    valid: !blocked,
    status,
    issues,
    code: status === 'blocked' ? 'BRIEF_BLOCKED' : undefined
  };
}

export default { validateContentClaims, validateBriefContent };
