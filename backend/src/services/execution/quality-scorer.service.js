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
      const seoContentTypes = ['blog_article', 'landing_page', 'product_page', 'comparison_page', 'faq', 'youtube_description'];
      const nonSeoContentTypes = ['email_copy', 'creative_brief', 'short_social_post', 'linkedin_post', 'instagram_post', 'twitter_post', 'facebook_post'];
      
      const keywords = brief?.verifiedKeywords || [];
      const hasSeoData = keywords.length > 0 && brief?.evidenceSources?.hasSeoIntel;
      
      if (!hasSeoData) {
        return { status: 'not_applicable', detail: 'SEO data not available' };
      }
      
      if (nonSeoContentTypes.includes(assetType)) {
        const title = (content.metaTitle || content.title || '').toLowerCase();
        const desc = (content.metaDescription || '').toLowerCase();
        const matchCount = keywords.filter(k => title.includes((k.keyword || '').toLowerCase()) || desc.includes((k.keyword || '').toLowerCase())).length;
        if (matchCount > 0) {
          return { status: 'passed', detail: `SEO keywords present in content (informational)` };
        }
        return { status: 'not_applicable', detail: 'SEO alignment informational for this content type' };
      }
      
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
      const words = article.split(/\s+/).filter(w => w.length > 0);
      const avgWords = sentences.length > 0 ? words.length / sentences.length : 0;
      
      // Check for passive voice indicators
      const passiveIndicators = /\b(is|are|was|were|been|be|being)\s+(being\s+)?\w+ed\b/gi;
      const passiveMatches = article.match(passiveIndicators) || [];
      const passiveRatio = sentences.length > 0 ? passiveMatches.length / sentences.length : 0;
      
      // Check for paragraph length
      const paragraphs = article.split(/\n\n+/).filter(p => p.trim().length > 0);
      const longParagraphs = paragraphs.filter(p => p.split(/\s+/).length > 150).length;
      
      if (avgWords > 30) return { status: 'needs_review', detail: `Average sentence length ${Math.round(avgWords)} words — may be hard to read` };
      if (passiveRatio > 0.2) return { status: 'needs_review', detail: `${Math.round(passiveRatio * 100)}% passive voice — aim for active voice` };
      if (longParagraphs > 0) return { status: 'needs_review', detail: `${longParagraphs} paragraph(s) over 150 words — consider breaking up` };
      
      return { status: 'passed', detail: `Readability OK: avg ${Math.round(avgWords)} words/sentence, ${Math.round(passiveRatio * 100)}% passive, ${paragraphs.length} paragraphs` };
    },
  },
  brandConsistency: {
    label: 'Brand consistency',
    check: (content, brief) => {
      const brandName = brief?.company?.brandName || brief?.product?.brandName;
      const productName = brief?.company?.productName || brief?.product?.name;
      const usp = brief?.product?.usp;
      
      if (!brandName && !productName) return { status: 'not_applicable', detail: 'No brand/product name to check against' };
      
      const contentStr = JSON.stringify(content).toLowerCase();
      
      // Check for competing brand names (competitors mentioned more than the product)
      const competitors = brief?.competitors || [];
      let competitorMentions = 0;
      competitors.forEach(c => {
        if (c.name && contentStr.includes(c.name.toLowerCase())) {
          competitorMentions++;
        }
      });
      
      const productMentions = productName ? (contentStr.match(new RegExp(productName.toLowerCase(), 'g')) || []).length : 0;
      
      if (competitorMentions > productMentions && productMentions > 0) {
        return { status: 'needs_review', detail: `Competitor brands mentioned ${competitorMentions} times vs product ${productMentions} times` };
      }
      
      // Check for inconsistent brand name usage (different capitalizations)
      if (brandName) {
        const variations = contentStr.match(new RegExp(brandName.toLowerCase(), 'g')) || [];
        if (variations.length > 0 && !contentStr.includes(brandName.toLowerCase())) {
          return { status: 'needs_review', detail: 'Brand name capitalization inconsistent' };
        }
      }
      
      // Check USP alignment if present
      if (usp) {
        const uspWords = usp.toLowerCase().split(/\s+/).filter(w => w.length > 4);
        const uspHits = uspWords.filter(w => contentStr.includes(w)).length;
        if (uspHits > 0 && uspHits < uspWords.length * 0.3) {
          return { status: 'needs_review', detail: `Only ${Math.round(uspHits / uspWords.length * 100)}% of USP language reflected` };
        }
      }
      
      return { status: 'passed', detail: `Brand consistency OK — product mentioned ${productMentions}x` };
    },
  },
  engagement: {
    label: 'Engagement potential',
    check: (content, brief, assetType) => {
      const contentStr = JSON.stringify(content);
      
      // Questions engage readers — check for question marks
      const questionMarks = (contentStr.match(/\?/g) || []).length;
      
      // Numbers/data build trust
      const numbers = contentStr.match(/\b\d+(\.\d+)?[%xkKmM]?\b/g) || [];
      
      // Check for subheadings in long-form content
      const hasSubheadings = content.subheadings || content.sections || content.bulletPoints;
      
      // Social proof indicators
      const socialProof = ['customer', 'client', 'user', 'review', 'testimonial', 'case study', 'result'];
      const proofHits = socialProof.filter(term => contentStr.toLowerCase().includes(term)).length;
      
      const evidence = [];
      if (questionMarks > 0) evidence.push(`${questionMarks} question(s)`);
      if (numbers.length > 0) evidence.push(`${numbers.length} data point(s)`);
      if (hasSubheadings) evidence.push('structured with sections');
      if (proofHits > 0) evidence.push(`${proofHits} social proof term(s)`);
      
      const score = evidence.length;
      
      if (score === 0) {
        return { status: 'needs_review', detail: 'No engagement indicators found — consider adding questions, data, or structure' };
      }
      if (score >= 3) {
        return { status: 'passed', detail: `Strong engagement: ${evidence.join(', ')}` };
      }
      return { status: 'passed', detail: `Engagement: ${evidence.join(', ')}` };
    },
  },
  originality: {
    label: 'Originality',
    check: (content) => {
      const contentStr = JSON.stringify(content).toLowerCase();
      
      // Check for generic filler phrases
      const fillerPhrases = [
        'in today\'s fast-paced',
        'in today\'s world',
        'as we all know',
        'it\'s no secret',
        'when it comes to',
        'in the realm of',
        'it\'s important to note',
        'it goes without saying',
        'needless to say',
        'at the end of the day',
        'it\'s worth mentioning',
        'in conclusion',
        'to sum up',
        'in summary',
      ];
      
      const foundFillers = fillerPhrases.filter(phrase => contentStr.includes(phrase));
      
      // Check for repeated phrases (potential copy-paste)
      const sentences = contentStr.split(/[.!?]+/).filter(Boolean);
      const phraseCount = {};
      sentences.forEach(s => {
        const words = s.trim().split(/\s+/);
        for (let i = 0; i < words.length - 2; i++) {
          const trigram = words.slice(i, i + 3).join(' ');
          phraseCount[trigram] = (phraseCount[trigram] || 0) + 1;
        }
      });
      const repeatedPhrases = Object.entries(phraseCount).filter(([_, count]) => count > 2).map(([phrase]) => phrase);
      
      const evidence = [];
      if (foundFillers.length > 0) evidence.push(`${foundFillers.length} filler phrase(s)`);
      if (repeatedPhrases.length > 0) evidence.push(`${repeatedPhrases.length} repeated phrase(s)`);
      
      if (foundFillers.length > 3) {
        return { status: 'needs_review', detail: `${foundFillers.length} generic filler phrases detected — rewrite for specificity` };
      }
      if (repeatedPhrases.length > 5) {
        return { status: 'needs_review', detail: `${repeatedPhrases.length} phrases repeated 3+ times — reduce repetition` };
      }
      if (evidence.length > 0) {
        return { status: 'passed', detail: `Minor originality concerns: ${evidence.join(', ')}` };
      }
      return { status: 'passed', detail: 'No generic filler or repetition issues detected' };
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
