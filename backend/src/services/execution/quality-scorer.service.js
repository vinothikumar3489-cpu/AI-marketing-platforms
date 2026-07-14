/**
 * Content Studio Quality Scorer
 *
 * Uses categorical checks (not percentages).
 * Returns Passed / Needs review / Blocked per category.
 */

import { resolveProductIdentity } from '../resolvers/product-identity.resolver.js';

const QUALITY_CHECKS = {
  productSpecificity: {
    label: 'Product specificity',
    check: (content, brief) => {
      // Use canonical product identity instead of brief.product.name
      const productIdentity = brief?._productIdentity || resolveProductIdentity({
        chat: brief?._chat,
        productIntelligence: brief?._productIntel,
        evidenceSnapshot: brief?._evidenceSnapshot,
        websiteEvidence: brief?.website
      });
      
      const productName = productIdentity?.productName;
      const brandName = productIdentity?.brandName;
      
      if (!productName) return { status: 'blocked', detail: 'No product name available' };
      
      const contentStr = JSON.stringify(content).toLowerCase();
      
      // Check for product name, brand name, or verified features
      const productMentions = (contentStr.match(new RegExp(productName.toLowerCase(), 'g')) || []).length;
      const brandMentions = brandName ? (contentStr.match(new RegExp(brandName.toLowerCase(), 'g')) || []).length : 0;
      
      // Check for verified features
      const features = brief?.product?.features || [];
      const featureNames = features.map(f => f.name).filter(Boolean);
      const featureMentions = featureNames.reduce((count, feature) => {
        return count + (contentStr.match(new RegExp(feature.toLowerCase(), 'g')) || []).length;
      }, 0);
      
      const totalMentions = productMentions + brandMentions + featureMentions;
      
      if (totalMentions === 0) {
        return { status: 'blocked', detail: `Product "${productName}" or brand "${brandName}" not mentioned in content` };
      }
      if (totalMentions < 2) {
        return { status: 'needs_review', detail: `Product/brand mentioned only ${totalMentions} time(s)` };
      }
      
      const evidence = [];
      if (productMentions > 0) evidence.push(`product "${productName}" (${productMentions}x)`);
      if (brandMentions > 0) evidence.push(`brand "${brandName}" (${brandMentions}x)`);
      if (featureMentions > 0) evidence.push(`features (${featureMentions}x)`);
      
      return { status: 'passed', detail: `Product identity mentioned ${totalMentions} times: ${evidence.join(', ')}` };
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
      
      // Match persona names, roles, pain points, and goals
      let personaHits = 0;
      let roleHits = 0;
      let painHits = 0;
      let goalHits = 0;
      
      const evidence = [];
      
      personas.forEach(p => {
        // Check persona name
        if (p.name && contentStr.includes(p.name.toLowerCase())) {
          personaHits++;
          evidence.push(`persona "${p.name}"`);
        }
        // Check role
        if (p.role && contentStr.includes(p.role.toLowerCase())) {
          roleHits++;
          evidence.push(`role "${p.role}"`);
        }
        // Check goals
        if (p.goals && p.goals.length) {
          p.goals.forEach(goal => {
            if (goal && contentStr.includes(goal.toLowerCase())) {
              goalHits++;
              evidence.push(`goal "${goal}"`);
            }
          });
        }
      });
      
      // Check pain points
      painHits = painPoints.filter(p => contentStr.includes(p.toLowerCase())).length;
      if (painHits > 0) {
        evidence.push(`${painHits} pain point(s)`);
      }
      
      // Check for audience synonyms
      const audienceSynonyms = ['creators', 'marketers', 'business', 'enterprise', 'startup', 'smb'];
      const synonymHits = audienceSynonyms.filter(syn => contentStr.includes(syn)).length;
      if (synonymHits > 0) {
        evidence.push(`${synonymHits} audience synonym(s)`);
      }
      
      const totalHits = personaHits + roleHits + painHits + goalHits + synonymHits;
      
      if (totalHits === 0) {
        return { status: 'needs_review', detail: 'Content does not reference audience personas, roles, pain points, or goals' };
      }
      
      return { status: 'passed', detail: `Audience relevance: ${evidence.slice(0, 5).join(', ')}${evidence.length > 5 ? '...' : ''}` };
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
      
      // Unsupported marketing language phrases that require evidence
      const unsupportedPhrases = [
        'ultimate',
        'best',
        'industry-leading',
        'industry leading',
        'gain a competitive edge',
        'competitive edge',
        'guaranteed',
        'proven',
        'highly successful',
        'take your content to the next level',
        'next level',
        'revolutionary',
        'groundbreaking',
        'world-class',
        'unmatched',
        'unbeatable',
        'state-of-the-art',
        'cutting edge',
        'cutting-edge',
        'market leader',
        'market-leading',
        'number one',
        '#1',
        'top-rated',
        'award-winning',
        'most advanced',
        'most powerful',
        'most effective',
        'fastest',
        'easiest',
        'simplest',
        'first choice',
        'preferred choice',
        'leading provider',
        'leading solution'
      ];
      
      const contentStr = JSON.stringify(content).toLowerCase();
      const evidenceUsed = content.evidenceUsed || [];
      
      // Find unsupported phrases in content
      const foundPhrases = unsupportedPhrases.filter(phrase => 
        contentStr.includes(phrase.toLowerCase())
      );
      
      // Remove duplicates
      const uniquePhrases = [...new Set(foundPhrases)];
      
      // If unsupported phrases found and no evidence to support them
      if (uniquePhrases.length > 0 && evidenceUsed.length === 0) {
        return { 
          status: 'needs_review', 
          detail: `${uniquePhrases.length} unsupported marketing phrase(s) found without evidence: ${uniquePhrases.slice(0, 3).join(', ')}${uniquePhrases.length > 3 ? '...' : ''}` 
        };
      }
      
      // If unsupported phrases found but some evidence exists
      if (uniquePhrases.length > 0 && evidenceUsed.length > 0) {
        return { 
          status: 'needs_review', 
          detail: `${uniquePhrases.length} marketing phrase(s) found: ${uniquePhrases.slice(0, 3).join(', ')}${uniquePhrases.length > 3 ? '...' : ''} — verify evidence supports these claims` 
        };
      }
      
      // Check claims requiring review
      if (claimsReview.length > 3) return { status: 'blocked', detail: `${claimsReview.length} claims requiring review — too many` };
      if (claimsReview.length > 0) return { status: 'needs_review', detail: `${claimsReview.length} claims flagged for review` };
      
      return { status: 'passed', detail: 'No unsupported claims or marketing language' };
    },
  },
  seoAlignment: {
    label: 'SEO alignment',
    check: (content, brief, assetType) => {
      // SEO-oriented content types
      const seoContentTypes = ['blog_article', 'landing_page', 'product_page', 'comparison_page', 'faq', 'youtube_description'];
      
      // Non-SEO content types where SEO alignment is informational or not applicable
      const nonSeoContentTypes = ['email_copy', 'creative_brief', 'short_social_post', 'linkedin_post', 'instagram_post', 'twitter_post', 'facebook_post'];
      
      const keywords = brief?.verifiedKeywords || [];
      const hasSeoData = keywords.length > 0 && brief?.evidenceSources?.hasSeoIntel;
      
      // If no SEO data available, mark as not applicable
      if (!hasSeoData) {
        return { status: 'not_applicable', detail: 'SEO data not available' };
      }
      
      // If content type is non-SEO oriented, mark as informational
      if (nonSeoContentTypes.includes(assetType)) {
        const title = (content.metaTitle || content.title || '').toLowerCase();
        const desc = (content.metaDescription || '').toLowerCase();
        const matchCount = keywords.filter(k => title.includes((k.keyword || '').toLowerCase()) || desc.includes((k.keyword || '').toLowerCase())).length;
        if (matchCount > 0) {
          return { status: 'passed', detail: `SEO keywords present in content (informational)` };
        }
        return { status: 'not_applicable', detail: 'SEO alignment informational for this content type' };
      }
      
      // For SEO-oriented content types, check keyword alignment
      if (seoContentTypes.includes(assetType)) {
        const title = (content.metaTitle || content.title || '').toLowerCase();
        const desc = (content.metaDescription || '').toLowerCase();
        const body = (content.article || content.body || content.text || '').toLowerCase();
        
        const titleMatches = keywords.filter(k => title.includes((k.keyword || '').toLowerCase())).length;
        const descMatches = keywords.filter(k => desc.includes((k.keyword || '').toLowerCase())).length;
        const bodyMatches = keywords.filter(k => body.includes((k.keyword || '').toLowerCase())).length;
        
        const totalMatches = titleMatches + descMatches + bodyMatches;
        
        if (totalMatches === 0) {
          return { status: 'needs_review', detail: 'No SEO keywords found in content' };
        }
        
        const evidence = [];
        if (titleMatches > 0) evidence.push(`${titleMatches} in title`);
        if (descMatches > 0) evidence.push(`${descMatches} in description`);
        if (bodyMatches > 0) evidence.push(`${bodyMatches} in body`);
        
        return { status: 'passed', detail: `SEO alignment: ${evidence.join(', ')}` };
      }
      
      // For other content types, informational check
      const title = (content.metaTitle || content.title || '').toLowerCase();
      const desc = (content.metaDescription || '').toLowerCase();
      const matchCount = keywords.filter(k => title.includes((k.keyword || '').toLowerCase()) || desc.includes((k.keyword || '').toLowerCase())).length;
      if (matchCount > 0) {
        return { status: 'passed', detail: `${matchCount} keywords found (informational)` };
      }
      return { status: 'not_applicable', detail: 'SEO alignment informational for this content type' };
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
      results[key] = check.check(content, brief, assetType);
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
