/**
 * Product Intelligence Normalizer
 * Normalizes product features and benefits from various shapes into canonical format
 * Extended for Content Studio — extracts Features, Benefits, Use Cases, Integrations,
 * Pricing, CTA, Pain Points, Industries, Target Audience, Capabilities.
 * All inferred fields are marked with AI_INFERRED status.
 */

import { asArray, safeMap } from "./array-helpers.js";
import { InferenceStatus } from "../../shared/schemas/enums.js";

/**
 * Inference status enum for tracking data source confidence
 */
const INFERENCE_STATUS = InferenceStatus;

/**
 * Extract feature name from various object shapes
 */
function extractFeatureName(feature) {
  if (typeof feature === 'string') return feature;
  if (!feature || typeof feature !== 'object') return null;
  return feature.name || feature.title || feature.feature || feature.description || null;
}

/**
 * Extract feature description from various object shapes
 */
function extractFeatureDescription(feature) {
  if (typeof feature === 'string') return null;
  if (!feature || typeof feature !== 'object') return null;
  return feature.description || feature.details || feature.explanation || null;
}

/**
 * Extract feature benefit from various object shapes
 */
function extractFeatureBenefit(feature) {
  if (typeof feature === 'string') return null;
  if (!feature || typeof feature !== 'object') return null;
  return feature.benefit || feature.value || feature.advantage || null;
}

/**
 * Normalize a single feature to canonical format
 * Handles strings and objects with various field names
 */
function normalizeFeature(item) {
  if (typeof item === "string") {
    return {
      name: item.trim(),
      description: null,
      benefit: null,
      evidence: null,
      inferenceStatus: "EVIDENCE_BACKED"
    };
  }

  if (!item || typeof item !== "object") {
    return null;
  }

  const name =
    item.name ??
    item.feature ??
    item.title ??
    item.capability ??
    item.label ??
    item.description ??
    null;

  if (!name || typeof name !== "string") {
    return null;
  }

  return {
    name: name.trim(),
    description:
      typeof item.description === "string"
        ? item.description.trim()
        : typeof item.details === "string"
          ? item.details.trim()
          : null,
    benefit:
      typeof item.benefit === "string"
        ? item.benefit.trim()
        : typeof item.outcome === "string"
          ? item.outcome.trim()
          : typeof item.value === "string"
            ? item.value.trim()
            : null,
    evidence:
      typeof item.evidence === "string"
        ? item.evidence
        : typeof item.source === "string"
          ? item.source
          : null,
    inferenceStatus:
      item.inferenceStatus ??
      "EVIDENCE_BACKED"
  };
}

/**
 * Normalize features array from various shapes
 */
export function normalizeFeatures(features) {
  const rawFeatures = asArray(features);
  
  // Handle nested items arrays
  if (rawFeatures.length === 1 && rawFeatures[0]?.items) {
    return rawFeatures[0].items
      .map(normalizeFeature)
      .filter(Boolean);
  }
  
  return rawFeatures
    .map(normalizeFeature)
    .filter(Boolean);
}

/**
 * Normalize a single benefit to canonical format
 * Handles strings and objects with various field names
 */
function normalizeBenefit(item) {
  if (typeof item === "string") {
    return {
      text: item.trim(),
      evidence: null,
      inferenceStatus: "EVIDENCE_BACKED"
    };
  }

  if (!item || typeof item !== "object") {
    return null;
  }

  const text =
    item.text ??
    item.benefit ??
    item.value ??
    item.outcome ??
    item.description ??
    null;

  if (!text || typeof text !== "string") {
    return null;
  }

  return {
    text: text.trim(),
    evidence:
      typeof item.evidence === "string"
        ? item.evidence
        : typeof item.source === "string"
          ? item.source
          : null,
    inferenceStatus:
      item.inferenceStatus ??
      "EVIDENCE_BACKED"
  };
}

/**
 * Normalize benefits array from various shapes
 */
export function normalizeBenefits(benefits) {
  const rawBenefits = asArray(benefits);
  
  // Handle nested items arrays
  if (rawBenefits.length === 1 && rawBenefits[0]?.items) {
    return rawBenefits[0].items
      .map(normalizeBenefit)
      .filter(Boolean);
  }
  
  return rawBenefits
    .map(normalizeBenefit)
    .filter(Boolean);
}

/**
 * Convert feature to display text
 */
export function featureToText(feature) {
  if (!feature) return '';
  if (typeof feature === 'string') return feature;
  
  const name = feature.name || feature.title || feature.feature || '';
  const description = feature.description || feature.details || '';
  const benefit = feature.benefit || feature.value || '';
  
  if (name && description) {
    return `${name}: ${description}`;
  }
  if (name && benefit) {
    return `${name} - ${benefit}`;
  }
  if (name) return name;
  if (description) return description;
  if (benefit) return benefit;
  
  return '';
}

/**
 * Convert benefit to display text
 */
export function benefitToText(benefit) {
  if (!benefit) return '';
  if (typeof benefit === 'string') return benefit;
  
  return benefit.text || benefit.benefit || benefit.description || benefit.value || '';
}

/**
 * Main normalization function for product intelligence
 * Searches all possible feature/benefit paths in the product intelligence record
 */
export function normalizeProductIntelligence(productIntel) {
  if (!productIntel || typeof productIntel !== 'object') {
    return {
      features: [],
      benefits: [],
      warnings: ['Product intelligence not available or invalid']
    };
  }

  const pa = productIntel.productAnalysis || {};
  const website = productIntel.websiteEvidence || {};

  // Search all possible feature paths in order of preference
  // Includes deeply nested paths, alternate shapes, and multi-level objects
  const rawFeatures = productIntel.features
    || pa.features
    || pa.keyFeatures
    || pa.capabilities
    || pa.productFeatures
    || pa.differentiators
    || pa.jobsToBeDone
    || pa.details?.features
    || pa.summary?.features
    || pa.productDNA?.features
    || website.features
    || [];

  const rawBenefits = productIntel.benefits
    || pa.benefits
    || pa.coreBenefits
    || pa.valuePropositions
    || pa.advantages
    || pa.valueProposition
    || pa.details?.benefits
    || pa.summary?.benefits
    || website.benefits
    || [];

  const features = normalizeFeatures(rawFeatures);
  const benefits = normalizeBenefits(rawBenefits);

  const warnings = [];

  if (features.length === 0) {
    warnings.push('No features available in product intelligence');
  }

  if (benefits.length === 0) {
    warnings.push('No benefits available in product intelligence');
  }

  const unnamedFeatures = features.filter(f => f.name === `Feature ${features.indexOf(f) + 1}`);
  if (unnamedFeatures.length > 0) {
    warnings.push(`${unnamedFeatures.length} features have no explicit name`);
  }

  return {
    features,
    benefits,
    warnings
  };
}

/**
 * Comprehensive product normalization for Content Studio
 * Extracts all known product fields and derives missing ones with AI_INFERRED marking
 */
export function normalizeProductForContentStudio(productIntel, extraContext = {}) {
  if (!productIntel || typeof productIntel !== 'object') {
    return {
      features: [],
      benefits: [],
      useCases: [],
      integrations: [],
      pricing: null,
      cta: [],
      painPoints: [],
      industries: [],
      targetAudience: [],
      capabilities: [],
      usp: null,
      summary: null,
      warnings: ['Product intelligence not available'],
    };
  }

  const pa = productIntel.productAnalysis || {};
  const website = extraContext.website || {};
  const audienceData = productIntel.audienceIntelligence || {};
  const warnings = [];
  const derivedFrom = [];

  // --- Extract summary ---
  const summary = pa.summary || pa.productSummary || extraContext.summary || null;

  // --- Extract USP ---
  const usp = pa.usp || extraContext.usp || null;

  // --- Extract Features (with derivation fallback) ---
  const rawFeatures = normalizeFeatures(
    productIntel.features
    || pa.features
    || pa.keyFeatures
    || pa.capabilities
    || pa.productFeatures
    || pa.differentiators
    || pa.jobsToBeDone
    || pa.details?.features
    || pa.summary?.features
    || pa.productDNA?.features
    || website.featuresText
    || website.features
    || []
  );
  const hasExplicitFeatures = rawFeatures.length > 0;
  let features = rawFeatures;

  if (features.length === 0) {
    const derived = deriveFeatures(summary, usp, pa, website);
    features = derived.map(f => ({
      ...f,
      inferenceStatus: InferenceStatus.AI_INFERRED,
    }));
    if (features.length > 0) {
      derivedFrom.push('summary, USP, or website content');
      warnings.push(`Features derived from ${derivedFrom[derivedFrom.length - 1]} — mark as AI_INFERRED`);
    }
  }

  // --- Extract Benefits ---
  const rawBenefits = normalizeBenefits(
    productIntel.benefits
    || pa.benefits
    || pa.coreBenefits
    || pa.valuePropositions
    || pa.advantages
    || pa.valueProposition
    || pa.details?.benefits
    || pa.summary?.benefits
    || website.benefits
    || []
  );
  const hasExplicitBenefits = rawBenefits.length > 0;
  let benefits = rawBenefits;

  if (benefits.length === 0 && features.length > 0) {
    benefits = features
      .filter(f => f.benefit)
      .map(f => ({
        text: f.benefit,
        evidence: null,
        inferenceStatus: f.inferenceStatus || InferenceStatus.EVIDENCE_BACKED,
      }));
    if (benefits.length > 0) {
      warnings.push('Benefits derived from feature benefits');
    }
  }

  // --- Extract Use Cases ---
  const rawUseCases = asArray(pa.useCases || pa.useCases || pa.jobsToBeDone || pa.details?.useCases || []);
  const useCases = rawUseCases.map(u => {
    if (typeof u === 'string') return { scenario: u, solution: null, outcome: null };
    return {
      scenario: u.scenario || u.useCase || u.name || u.title || '',
      solution: u.solution || u.description || null,
      outcome: u.outcome || u.result || null,
    };
  }).filter(u => u.scenario);

  // --- Extract Integrations ---
  const rawIntegrations = asArray(
    pa.integrations
    || pa.technologyStack
    || productIntel.integrations
    || website.technologyHints
    || website.technologyStack
    || []
  );
  const integrations = rawIntegrations.map(i => {
    if (typeof i === 'string') return { name: i, category: null };
    return {
      name: i.name || i.tool || i.platform || i.technology || '',
      category: i.category || i.type || null,
    };
  }).filter(i => i.name);

  // --- Extract Pricing ---
  const pricing = pa.pricing || pa.pricingModel || pa.businessModel || null;

  // --- Extract CTA ---
  const rawCta = asArray(
    pa.cta
    || website.ctaTexts
    || pa.ctaText
    || []
  );
  const cta = rawCta.map(c => {
    if (typeof c === 'string') return { text: c, url: null };
    if (typeof c === 'object') {
      return {
        text: c.text || c.label || c.cta || '',
        url: c.url || c.destination || null,
      };
    }
    return { text: String(c), url: null };
  }).filter(c => c.text);

  // --- Extract Pain Points ---
  const rawPainPoints = asArray(
    audienceData.painPoints
    || pa.painPoints
    || pa.problemsSolved
    || pa.challenges
    || pa.details?.painPoints
    || []
  );
  const painPoints = rawPainPoints.map(p => {
    if (typeof p === 'string') return p;
    return p.text || p.painPoint || p.description || p.name || '';
  }).filter(Boolean);

  // --- Extract Industries ---
  const rawIndustries = asArray(
    pa.industries
    || productIntel.industries
    || (pa.industry ? [pa.industry] : [])
  );
  const industries = rawIndustries.map(i => {
    if (typeof i === 'string') return i;
    return i.name || i.industry || '';
  }).filter(Boolean);

  // --- Extract Target Audience ---
  const rawAudience = asArray(
    audienceData.primaryAudience
    || audienceData.buyerPersonas
    || pa.targetAudience
    || productIntel.targetAudience
    || pa.customerSegments
    || pa.idealCustomerProfile
    || []
  );
  const targetAudience = rawAudience.map(a => {
    if (typeof a === 'string') return { name: a, role: null, description: null };
    if (typeof a === 'object') {
      return {
        name: a.name || a.audience || a.title || a.role || '',
        role: a.role || a.jobTitle || null,
        description: a.description || a.summary || null,
      };
    }
    return { name: String(a), role: null, description: null };
  }).filter(a => a.name);

  // --- Extract Capabilities ---
  const rawCapabilities = asArray(
    pa.capabilities
    || pa.keyFeatures
    || pa.productFeatures
    || []
  );
  const capabilities = rawCapabilities.map(c => {
    if (typeof c === 'string') return { name: c, description: null };
    return {
      name: c.name || c.title || c.feature || c.capability || '',
      description: c.description || c.details || null,
    };
  }).filter(c => c.name);

  // --- Add warnings ---
  if (features.length === 0) warnings.push('No features available');
  if (benefits.length === 0) warnings.push('No benefits available');
  if (useCases.length === 0) warnings.push('No use cases available');
  if (pricing === null) warnings.push('No pricing information available');
  if (painPoints.length === 0) warnings.push('No pain points available');
  if (industries.length === 0) warnings.push('No industry information available');
  if (targetAudience.length === 0) warnings.push('No target audience defined');

  return {
    summary,
    usp,
    features,
    benefits,
    useCases,
    integrations,
    pricing,
    cta,
    painPoints,
    industries,
    targetAudience,
    capabilities,
    warnings,
    _derivedFrom: derivedFrom.length > 0 ? derivedFrom : null,
    _hasExplicitFeatures: hasExplicitFeatures,
    _hasExplicitBenefits: hasExplicitBenefits,
  };
}

/**
 * Derive features from summary, USP, headings, metadata, website content
 * Returns inferred feature objects marked for AI_INFERRED status
 */
function deriveFeatures(summary, usp, productAnalysis, website) {
  const derived = [];
  const textToParse = [
    summary || '',
    usp || '',
    productAnalysis.description || '',
    productAnalysis.productSummary || '',
    website.title || '',
    website.metaDescription || '',
    website.heroText || '',
  ].filter(Boolean).join(' ').toLowerCase();

  if (!textToParse) return derived;

  const capabilityPatterns = [
    { name: 'Automation & Workflow', keywords: ['automate', 'workflow', 'streamline', 'efficiency', 'optimize'] },
    { name: 'Analytics & Insights', keywords: ['analytics', 'insight', 'report', 'dashboard', 'metric', 'measure', 'track'] },
    { name: 'AI & Intelligence', keywords: ['ai', 'artificial intelligence', 'machine learning', 'ml', 'intelligent', 'smart'] },
    { name: 'Integration & Connectivity', keywords: ['integrate', 'connect', 'api', 'sync', 'embed'] },
    { name: 'Content Management', keywords: ['content', 'manage', 'organize', 'create', 'publish'] },
    { name: 'Collaboration', keywords: ['collaborate', 'team', 'share', 'communicate', 'coordinate'] },
    { name: 'Security & Compliance', keywords: ['security', 'secure', 'compliance', 'gdpr', 'encrypt', 'privacy'] },
    { name: 'Reporting & Visualization', keywords: ['report', 'visualize', 'chart', 'graph', 'dashboard'] },
    { name: 'Personalization', keywords: ['personalize', 'customize', 'tailor', 'adaptive', 'recommend'] },
    { name: 'Real-time Processing', keywords: ['real-time', 'realtime', 'live', 'instant', 'immediate'] },
    { name: 'Scalability', keywords: ['scale', 'scalable', 'enterprise', 'grow', 'expand'] },
    { name: 'Search & Discovery', keywords: ['search', 'discover', 'find', 'explore', 'navigate'] },
    { name: 'Automation Rules Engine', keywords: ['rule', 'trigger', 'condition', 'automation', 'if this then that'] },
    { name: 'Template & Library', keywords: ['template', 'library', 'asset', 'repository', 'blueprint'] },
  ];

  capabilityPatterns.forEach(({ name, keywords }) => {
    const matched = keywords.some(k => textToParse.includes(k));
    if (matched) {
      derived.push({
        name,
        description: null,
        benefit: null,
        evidence: null,
        inferenceStatus: InferenceStatus.AI_INFERRED,
      });
    }
  });

  // If no patterns matched, create a generic derived feature from summary
  if (derived.length === 0 && summary) {
    const words = summary.split(/\s+/).filter(w => w.length > 4).slice(0, 3);
    if (words.length > 0) {
      derived.push({
        name: words.join(' ') + ' capability',
        description: summary.substring(0, 200),
        benefit: null,
        evidence: null,
        inferenceStatus: InferenceStatus.AI_INFERRED,
      });
    }
  }

  return derived;
}

export default {
  normalizeProductIntelligence,
  normalizeFeatures,
  normalizeBenefits,
  featureToText,
  benefitToText,
  normalizeProductForContentStudio,
  INFERENCE_STATUS
};
