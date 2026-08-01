/**
 * AI Response AutoRepair Service
 * 
 * Automatically repairs AI-generated responses before schema validation.
 * Handles field aliases, missing required fields, type conversions, and data normalization.
 */

// CTA field aliases mapping
const CTA_ALIASES = [
  'cta',
  'callToAction',
  'call_to_action',
  'action',
  'primaryCTA',
  'primaryAction',
  'buttonText',
  'learnMore',
  'signupCTA',
  'heroCTA',
  'finalCTA',
  'button_label',
  'buttonLabel',
  'ctaText',
  'cta_text',
];

/**
 * Extract CTA from AI response using alias support
 */
function extractCTA(response, contentBrief) {
  // Try to find CTA from any alias
  for (const alias of CTA_ALIASES) {
    if (response[alias] && typeof response[alias] === 'string') {
      return response[alias];
    }
    if (response[alias] && typeof response[alias] === 'object' && response[alias].label) {
      return response[alias].label;
    }
  }

  // If no CTA found, derive from content brief
  if (contentBrief) {
    // Priority: Campaign Goal > Primary Benefit > Product USP > Default
    if (contentBrief.campaign?.goal) {
      return `Learn more about ${contentBrief.campaign.goal.toLowerCase()}`;
    }
    if (contentBrief.product?.benefits?.length > 0) {
      const primaryBenefit = contentBrief.product.benefits[0];
      const benefitText = typeof primaryBenefit === 'string' ? primaryBenefit : primaryBenefit.benefit || primaryBenefit;
      return `Experience ${benefitText.toLowerCase()}`;
    }
    if (contentBrief.product?.usp) {
      return `Discover ${contentBrief.product.usp.toLowerCase()}`;
    }
  }

  // Default fallback
  return 'Learn More';
}

/**
 * Normalize arrays - ensure they are arrays and filter empty values
 */
function normalizeArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter(item => item !== null && item !== undefined && item !== '');
  }
  if (typeof value === 'string') {
    return value.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [value];
}

/**
 * Normalize strings - trim and handle null/undefined
 */
function normalizeString(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value.trim() || fallback;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

/**
 * Normalize objects - handle nested object structures
 */
function normalizeObject(value, schema) {
  if (!value || typeof value !== 'object') return {};
  if (Array.isArray(value)) return value;

  const normalized = {};
  for (const key in value) {
    if (value[key] !== null && value[key] !== undefined) {
      normalized[key] = value[key];
    }
  }
  return normalized;
}

/**
 * Repair hashtags - ensure array format and max count
 */
function repairHashtags(hashtags, maxCount = 15) {
  const normalized = normalizeArray(hashtags);
  // Remove # prefix if present
  const cleaned = normalized.map(tag => tag.replace(/^#/, '').trim());
  // Deduplicate and limit
  const unique = [...new Set(cleaned)];
  return unique.slice(0, maxCount);
}

/**
 * Repair evidence - ensure array of strings
 */
function repairEvidence(evidence) {
  if (!evidence) return [];
  if (Array.isArray(evidence)) {
    return evidence.map(e => typeof e === 'string' ? e : JSON.stringify(e)).filter(Boolean);
  }
  if (typeof evidence === 'string') {
    return evidence.split('\n').map(e => e.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Repair claims requiring review - ensure array of strings
 */
function repairClaims(claims) {
  return repairEvidence(claims);
}

/**
 * Content type specific repair functions
 */
const CONTENT_TYPE_REPAIRERS = {
  blog_article: (response, brief) => ({
    ...response,
    cta: response.cta || extractCTA(response, brief),
    targetKeywords: repairHashtags(response.targetKeywords || response.keywords, 10),
    evidenceUsed: repairEvidence(response.evidenceUsed),
    claimsRequiringReview: repairClaims(response.claimsRequiringReview),
  }),

  faq_page: (response, brief) => ({
    ...response,
    cta: response.cta || extractCTA(response, brief),
    faqs: Array.isArray(response.faqs) ? response.faqs.map(faq => ({
      question: normalizeString(faq.question),
      answer: normalizeString(faq.answer),
    })) : [],
    evidenceUsed: repairEvidence(response.evidenceUsed),
    claimsRequiringReview: repairClaims(response.claimsRequiringReview),
  }),

  landing_page: (response, brief) => ({
    ...response,
    heroCTA: response.heroCTA || response.cta || extractCTA(response, brief),
    finalCTA: response.finalCTA || response.cta || extractCTA(response, brief),
    painPoints: normalizeArray(response.painPoints),
    features: Array.isArray(response.features) ? response.features.map(f => ({
      icon: f.icon,
      title: normalizeString(f.title),
      description: normalizeString(f.description),
    })) : [],
    seoKeywords: repairHashtags(response.seoKeywords || response.keywords, 10),
    evidenceUsed: repairEvidence(response.evidenceUsed),
    claimsRequiringReview: repairClaims(response.claimsRequiringReview),
  }),

  product_page: (response, brief) => ({
    ...response,
    cta: response.cta || extractCTA(response, brief),
    keyFeatures: Array.isArray(response.keyFeatures) ? response.keyFeatures.map(f => ({
      name: normalizeString(f.name),
      description: normalizeString(f.description),
      benefit: normalizeString(f.benefit),
    })) : [],
    useCases: Array.isArray(response.useCases) ? response.useCases.map(u => ({
      scenario: normalizeString(u.scenario),
      solution: normalizeString(u.solution),
      outcome: normalizeString(u.outcome),
    })) : [],
    evidenceUsed: repairEvidence(response.evidenceUsed),
    claimsRequiringReview: repairClaims(response.claimsRequiringReview),
  }),

  linkedin_post: (response, brief) => ({
    ...response,
    cta: response.cta || extractCTA(response, brief),
    hashtags: repairHashtags(response.hashtags, 8),
    evidenceUsed: repairEvidence(response.evidenceUsed),
    claimsRequiringReview: repairClaims(response.claimsRequiringReview),
  }),

  instagram_post: (response, brief) => ({
    ...response,
    callToAction: response.callToAction || response.cta || extractCTA(response, brief),
    hashtags: repairHashtags(response.hashtags, 15),
    carouselSlides: Array.isArray(response.carouselSlides) ? response.carouselSlides.map(slide => ({
      headline: normalizeString(slide.headline),
      body: normalizeString(slide.body),
      visualHint: normalizeString(slide.visualHint),
    })) : [],
    evidenceUsed: repairEvidence(response.evidenceUsed),
    claimsRequiringReview: repairClaims(response.claimsRequiringReview),
  }),

  twitter_post: (response, brief) => ({
    ...response,
    cta: response.cta || extractCTA(response, brief),
    hashtags: repairHashtags(response.hashtags, 3),
    post: normalizeString(response.post || response.content).substring(0, 280),
    evidenceUsed: repairEvidence(response.evidenceUsed),
    claimsRequiringReview: repairClaims(response.claimsRequiringReview),
  }),

  facebook_post: (response, brief) => ({
    ...response,
    cta: response.cta || extractCTA(response, brief),
    evidenceUsed: repairEvidence(response.evidenceUsed),
    claimsRequiringReview: repairClaims(response.claimsRequiringReview),
  }),

  youtube_description: (response, brief) => ({
    ...response,
    cta: response.cta || extractCTA(response, brief),
    hashtags: repairHashtags(response.hashtags, 15),
    keywords: repairHashtags(response.keywords, 15),
    chapters: Array.isArray(response.chapters) ? response.chapters.map(c => ({
      timestamp: normalizeString(c.timestamp),
      title: normalizeString(c.title),
    })) : [],
    links: Array.isArray(response.links) ? response.links.map(l => ({
      label: normalizeString(l.label),
      url: normalizeString(l.url),
    })) : [],
    evidenceUsed: repairEvidence(response.evidenceUsed),
    claimsRequiringReview: repairClaims(response.claimsRequiringReview),
  }),

  email_copy: (response, brief) => ({
    ...response,
    callToAction: response.callToAction || response.cta || {
      label: extractCTA(response, brief),
      url: null,
    },
    bodyParagraphs: normalizeArray(response.bodyParagraphs || response.body),
    benefits: normalizeArray(response.benefits),
    featureHighlights: normalizeArray(response.featureHighlights),
    evidenceUsed: repairEvidence(response.evidenceUsed),
    claimsRequiringReview: repairClaims(response.claimsRequiringReview),
  }),

  creative_brief: (response, brief) => ({
    ...response,
    cta: response.cta || extractCTA(response, brief),
    supportingMessages: normalizeArray(response.supportingMessages),
    deliverables: normalizeArray(response.deliverables),
    mandatoryElements: normalizeArray(response.mandatoryElements),
    prohibitedClaims: normalizeArray(response.prohibitedClaims),
    brandSignals: normalizeArray(response.brandSignals),
    evidenceUsed: repairEvidence(response.evidenceUsed),
    limitations: normalizeArray(response.limitations),
  }),

  video_script: (response, brief) => ({
    ...response,
    scenes: Array.isArray(response.scenes) ? response.scenes.map(s => ({
      scene: s.scene,
      narration: normalizeString(s.narration),
      onScreenText: normalizeString(s.onScreenText),
      visual: normalizeString(s.visual),
      evidencePoint: normalizeString(s.evidencePoint),
      cta: s.cta || extractCTA(response, brief),
      duration: normalizeString(s.duration),
    })) : [],
    evidenceUsed: repairEvidence(response.evidenceUsed),
    limitations: normalizeArray(response.limitations),
  }),
};

/**
 * Main repair function - repairs AI response before validation
 */
export function repairAIResponse(response, contentType, contentBrief = null) {
  console.info('[AIRepair] Repairing response', { contentType, hasResponse: !!response, hasBrief: !!contentBrief });

  if (!response || typeof response !== 'object') {
    console.warn('[AIRepair] Invalid response:', response);
    return {};
  }

  // Get content type specific repairer
  const repairer = CONTENT_TYPE_REPAIRERS[contentType];
  if (repairer) {
    const repaired = repairer(response, contentBrief);
    console.info('[AIRepair] Repaired with type-specific repairer', { contentType });
    return repaired;
  }

  // Generic repair for unknown content types
  console.info('[AIRepair] Using generic repairer', { contentType });
  return {
    ...response,
    cta: response.cta || extractCTA(response, contentBrief),
    evidenceUsed: repairEvidence(response.evidenceUsed),
    claimsRequiringReview: repairClaims(response.claimsRequiringReview),
  };
}

/**
 * Validate repaired response against schema
 */
export function validateRepairedResponse(repairedResponse, schema) {
  try {
    const result = schema.safeParse(repairedResponse);
    if (result.success) {
      console.info('[AIRepair] Validation successful after repair');
      return { success: true, data: result.data, errors: [] };
    } else {
      console.warn('[AIRepair] Validation failed even after repair', { errors: result.error.errors });
      return { success: false, errors: result.error.errors };
    }
  } catch (error) {
    console.error('[AIRepair] Validation error:', error);
    return { success: false, errors: [error.message] };
  }
}

/**
 * Full repair and validate pipeline
 */
export function repairAndValidate(response, contentType, schema, contentBrief = null) {
  // Step 1: Repair the response
  const repaired = repairAIResponse(response, contentType, contentBrief);

  // Step 2: Validate against schema
  const validation = validateRepairedResponse(repaired, schema);

  return {
    repaired,
    validation,
    success: validation.success,
  };
}

export default {
  repairAIResponse,
  validateRepairedResponse,
  repairAndValidate,
  extractCTA,
};
