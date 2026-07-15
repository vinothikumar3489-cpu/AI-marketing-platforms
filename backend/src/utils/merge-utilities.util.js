/**
 * Merge Utilities for Growth Workspace
 * 
 * These utilities ensure that deterministic Business Intelligence data
 * is never overwritten by empty AI fallbacks.
 * 
 * Rules:
 * 1. Non-empty arrays are preferred over empty arrays
 * 2. Defined values are preferred over null/undefined/Unknown
 * 3. Evidence sources and inference status are preserved
 * 4. Fallback data is only used when both deterministic and AI values are unavailable
 */

/**
 * Prefer non-empty array from a list of candidates
 * Returns the first non-empty array, or empty array if all are empty
 */
export function preferNonEmptyArray(...values) {
  for (const value of values) {
    if (Array.isArray(value) && value.length > 0) {
      return value;
    }
  }
  return [];
}

/**
 * Prefer defined value from a list of candidates
 * Returns the first value that is not null, undefined, empty string, or "Unknown"
 */
export function preferDefinedValue(...values) {
  for (const value of values) {
    if (
      value !== null &&
      value !== undefined &&
      value !== "" &&
      value !== "Unknown" &&
      value !== "unknown" &&
      value !== "Not measured" &&
      value !== "N/A" &&
      value !== "n/a"
    ) {
      return value;
    }
  }
  return null;
}

/**
 * Merge evidence objects, preserving sources and inference status
 */
export function mergeEvidenceObjects(...objects) {
  const merged = {
    sources: [],
    confidence: null,
    inferenceStatus: 'deterministic',
    collectedAt: null
  };

  for (const obj of objects) {
    if (!obj) continue;
    
    if (obj.sources && Array.isArray(obj.sources)) {
      merged.sources.push(...obj.sources);
    }
    
    if (obj.confidence != null) {
      merged.confidence = Math.max(merged.confidence || 0, obj.confidence);
    }
    
    if (obj.inferenceStatus) {
      merged.inferenceStatus = obj.inferenceStatus;
    }
    
    if (obj.collectedAt && (!merged.collectedAt || new Date(obj.collectedAt) > new Date(merged.collectedAt))) {
      merged.collectedAt = obj.collectedAt;
    }
  }

  // Deduplicate sources by URL or identifier
  merged.sources = deduplicateByKey(merged.sources, 'url') || deduplicateByKey(merged.sources, 'id') || merged.sources;
  
  return merged;
}

/**
 * Deduplicate array by key
 */
export function deduplicateByKey(array, key) {
  if (!Array.isArray(array)) return [];
  const seen = new Set();
  return array.filter(item => {
    const keyValue = item[key];
    if (keyValue == null) return true;
    if (seen.has(keyValue)) return false;
    seen.add(keyValue);
    return true;
  });
}

/**
 * Merge two objects, preferring non-null values from the second object
 */
export function mergeObjects(base, override) {
  if (!base) return override || {};
  if (!override) return base;
  
  const merged = { ...base };
  
  for (const key in override) {
    if (override[key] != null && override[key] !== "" && override[key] !== "Unknown") {
      merged[key] = override[key];
    }
  }
  
  return merged;
}

/**
 * Merge stage result with deterministic data and AI result
 * This is the core function to prevent empty fallback overwrites
 */
export function mergeGrowthStageResult({
  deterministicResult = {},
  aiResult = {},
  fallbackResult = {},
  stage
}) {
  const merged = { ...fallbackResult }; // Start with fallback as base
  
  // Prefer AI result if it has meaningful data
  if (aiResult && Object.keys(aiResult).length > 0) {
    for (const key in aiResult) {
      const aiValue = aiResult[key];
      
      // For arrays, prefer non-empty
      if (Array.isArray(aiValue)) {
        merged[key] = preferNonEmptyArray(aiValue, deterministicResult[key], fallbackResult[key]);
      }
      // For objects, merge
      else if (typeof aiValue === 'object' && aiValue !== null) {
        merged[key] = mergeObjects(deterministicResult[key], aiValue);
      }
      // For primitives, prefer defined
      else {
        merged[key] = preferDefinedValue(aiValue, deterministicResult[key], fallbackResult[key]);
      }
    }
  }
  
  // Then overlay deterministic data for any missing or empty fields
  if (deterministicResult && Object.keys(deterministicResult).length > 0) {
    for (const key in deterministicResult) {
      const detValue = deterministicResult[key];
      const mergedValue = merged[key];
      
      // If merged value is empty/null/Unknown, use deterministic
      if (
        mergedValue == null ||
        mergedValue === "" ||
        mergedValue === "Unknown" ||
        (Array.isArray(mergedValue) && mergedValue.length === 0)
      ) {
        merged[key] = detValue;
      }
    }
  }
  
  // Preserve evidence and metadata
  merged.evidence = mergeEvidenceObjects(
    deterministicResult.evidence,
    aiResult.evidence,
    fallbackResult.evidence
  );
  
  merged.inferenceStatus = aiResult?.inferenceStatus || 
                          (deterministicResult ? 'deterministic' : 'fallback');
  
  merged.provider = aiResult?.provider || fallbackResult?.provider || 'fallback';
  
  merged.stage = stage;
  
  return merged;
}

/**
 * Generic labels to reject in product identity
 */
export const GENERIC_LABELS = [
  'New & Featured',
  'Featured',
  'New',
  'Home',
  'Courses',
  'Explore',
  'New Analysis',
  'New Growth Analysis',
  'Unknown Product',
  'Unknown',
  'Not specified',
  'N/A'
];

/**
 * Check if a label is generic and should be rejected
 */
export function isGenericLabel(label) {
  if (!label || typeof label !== 'string') return true;
  const normalized = label.trim();
  return GENERIC_LABELS.includes(normalized);
}

/**
 * Extract domain from URL
 */
export function extractDomainFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return null;
  }
}

/**
 * Derive brand name from domain
 */
export function deriveBrandFromDomain(domain) {
  if (!domain) return null;
  const parts = domain.split('.');
  if (parts.length >= 2) {
    return parts[parts.length - 2].charAt(0).toUpperCase() + 
           parts[parts.length - 2].slice(1);
  }
  return domain.charAt(0).toUpperCase() + domain.slice(1);
}

/**
 * Validate and clean product identity
 */
export function validateProductIdentity(identity) {
  if (!identity) return null;
  
  const cleaned = { ...identity };
  
  // Reject generic company names
  if (isGenericLabel(cleaned.companyName)) {
    cleaned.companyName = deriveBrandFromDomain(cleaned.domain) || cleaned.productName;
  }
  
  // Reject generic product names
  if (isGenericLabel(cleaned.productName)) {
    cleaned.productName = cleaned.companyName || deriveBrandFromDomain(cleaned.domain);
  }
  
  // Reject generic brand names
  if (isGenericLabel(cleaned.brandName)) {
    cleaned.brandName = cleaned.companyName || cleaned.productName;
  }
  
  // Ensure domain is extracted from websiteUrl if missing
  if (!cleaned.domain && cleaned.websiteUrl) {
    cleaned.domain = extractDomainFromUrl(cleaned.websiteUrl);
  }
  
  return cleaned;
}

/**
 * Check if technical audit is complete and usable
 */
export function hasCompleteTechnicalAudit(technicalAudit) {
  if (!technicalAudit) return false;
  
  const hasMeasurement = technicalAudit.measuredAt != null;
  
  const hasMobileScores = technicalAudit.mobile && 
    Object.values(technicalAudit.mobile).some(v => v != null && v !== 0);
  
  const hasDesktopScores = technicalAudit.desktop && 
    Object.values(technicalAudit.desktop).some(v => v != null && v !== 0);
  
  const hasValidChecks = technicalAudit.checks && 
    technicalAudit.checks.some(c => c.status === 'PASS' || c.status === 'FAIL' || c.status === 'WARNING');
  
  return hasMeasurement && (hasMobileScores || hasDesktopScores) && hasValidChecks;
}

/**
 * Filter valid actions from action plan
 */
export function filterValidActions(actions) {
  if (!Array.isArray(actions)) return [];
  
  return actions.filter(action => 
    action.title &&
    action.reason &&
    action.evidence &&
    action.priority &&
    action.title !== 'Review SEO' &&
    action.title !== 'Improve visibility' &&
    action.title !== 'Review technical audit' &&
    !action.title.includes('generic')
  );
}

/**
 * Filter invalid keywords
 */
export function filterInvalidKeywords(keywords, productIdentity = {}) {
  if (!Array.isArray(keywords)) return [];
  
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
    'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once'
  ]);
  
  const genericWords = new Set([
    'home', 'page', 'cookie', 'banner', 'privacy', 'policy', 'terms', 'service',
    'contact', 'about', 'login', 'signup', 'register', 'menu', 'navigation'
  ]);
  
  const productName = (productIdentity.productName || '').toLowerCase();
  const brandName = (productIdentity.brandName || '').toLowerCase();
  const category = (productIdentity.category || '').toLowerCase();
  
  return keywords.filter(keyword => {
    const text = (keyword.text || keyword.keyword || '').toLowerCase().trim();
    
    // Reject if too short
    if (text.length < 3) return false;
    
    // Reject if stop word
    if (stopWords.has(text)) return false;
    
    // Reject if generic navigation word
    if (genericWords.has(text)) return false;
    
    // Reject if contains HTML fragments
    if (text.includes('<') || text.includes('>') || text.includes('&')) return false;
    
    // Reject if malformed (concatenated tokens)
    if (text.includes('cookiebanner') || text.includes('privacypolicy')) return false;
    
    // Accept if relates to product
    if (productName && text.includes(productName)) return true;
    if (brandName && text.includes(brandName)) return true;
    if (category && text.includes(category)) return true;
    
    // Accept if has meaningful metrics (DataForSEO)
    if (keyword.searchVolume != null || keyword.cpc != null || keyword.difficulty != null) {
      return true;
    }
    
    // Otherwise reject generic single words
    if (!text.includes(' ') && text.length < 8) return false;
    
    return true;
  });
}
