/**
 * Product Intelligence Normalizer
 * Normalizes product features and benefits from various shapes into canonical format
 */

import { asArray, safeMap } from './array-helpers.js';

/**
 * Inference status enum for tracking data source confidence
 */
const INFERENCE_STATUS = {
  EVIDENCE_BACKED: 'EVIDENCE_BACKED',
  AI_INFERRED: 'AI_INFERRED',
  USER_PROVIDED: 'USER_PROVIDED',
  NOT_MEASURED: 'NOT_MEASURED'
};

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

export default {
  normalizeProductIntelligence,
  normalizeFeatures,
  normalizeBenefits,
  featureToText,
  benefitToText,
  INFERENCE_STATUS
};
