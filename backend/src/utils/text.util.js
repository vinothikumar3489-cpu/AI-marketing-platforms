/**
 * Text Utility Functions
 * Shared text processing helpers for backend services
 */

/**
 * Safely convert any value to an array.
 * Never throws. Never returns null/undefined.
 * @param {*} value - The value to convert
 * @returns {Array} - Always a valid array
 */
export function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  if (typeof value === "string") return [value];
  if (typeof value === "object" && typeof value[Symbol.iterator] === "function") return Array.from(value);
  if (typeof value === "object") return Object.values(value);
  return [];
}

/**
 * Sanitize text by removing HTML tags and excessive whitespace
 * @param {*} value - The value to sanitize
 * @returns {string} - Cleaned text string
 */
export function sanitizeText(value) {
  if (!value) return "";
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract clean text from various possible sources
 * @param {Object} data - Data object that may contain text in various fields
 * @param {string[]} fields - Array of field names to check in order
 * @returns {string} - Cleaned text from first available field
 */
export function extractText(data, fields = ['text', 'content', 'value', 'title', 'description']) {
  if (!data || typeof data !== 'object') {
    return sanitizeText(data);
  }

  for (const field of fields) {
    if (data[field] && typeof data[field] === 'string') {
      return sanitizeText(data[field]);
    }
  }

  return "";
}

/**
 * Clean and normalize company/brand name
 * @param {string} name - Raw company name
 * @returns {string} - Normalized company name
 */
export function normalizeCompanyName(name) {
  if (!name) return "";
  let cleaned = sanitizeText(name);
  // Remove common suffixes
  cleaned = cleaned
    .replace(/\s+(Inc|LLC|Ltd|Corp|Corporation|Company|Co)\.?$/i, "")
    .replace(/\s+(com|net|org|io|app|ai)\.?$/i, "")
    .trim();
  return cleaned;
}

/**
 * Validate if a keyword is relevant and not generic junk
 * @param {string} keyword - Keyword to validate
 * @returns {boolean} - True if keyword is valid
 */
export function isValidKeyword(keyword) {
  if (!keyword || typeof keyword !== 'string') return false;
  
  const cleaned = keyword.toLowerCase().trim();
  
  // Reject single-character keywords
  if (cleaned.length < 2) return false;
  
  // Reject generic junk keywords
  const genericKeywords = new Set([
    'general', 'account', 'semrush', 'platform for', 'for building',
    'figma com', 'notion com', 'shell', 'studio', 'assistbot',
    'business', 'custom', 'systems', 'built', 'everything', 'right', 'before',
    'https', 'apple', 'services', 'customer', 'product', 'all', 'software',
    'company', 'free', 'best', 'premium', 'plan', 'month', 'features',
    'get', 'make', 'use', 'work', 'time', 'new', 'good', 'great', 'top',
    'random', 'sentence', 'fragments', 'users', 'chose', 'choose', 'days',
    'trial', 'try', 'click', 'sign', 'login', 'demo', 'video', 'image'
  ]);
  
  if (genericKeywords.has(cleaned)) return false;
  
  // Reject keywords that are just domain names with "com"
  if (cleaned.endsWith(' com') || cleaned.endsWith('.com')) return false;
  
  // Reject keywords that look like random fragments
  if (cleaned.split(' ').length > 8) return false;
  
  return true;
}

/**
 * Extract domain from URL
 * @param {string} url - URL string
 * @returns {string} - Domain name
 */
export function extractDomain(url) {
  if (!url) return "";
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
  }
}

// ============================================
// CANONICAL KEYWORD NORMALIZER
// Single source of truth for keyword counting across all consumers.
// ============================================

/**
 * Extract the keyword text from various object shapes
 * @param {string|Object} item - Keyword item
 * @returns {string|null} - Normalized keyword text
 */
function extractKeywordText(item) {
  if (typeof item === 'string') return item;
  if (!item || typeof item !== 'object') return null;
  return item.keyword || item.term || item.name || item.topic || item.value || item.text || null;
}

/**
 * Normalize a keyword item into a canonical shape
 * @param {string|Object} item - Raw keyword item
 * @returns {Object|null} - Normalized keyword object
 */
function normalizeKeywordItem(item) {
  const text = extractKeywordText(item);
  if (!text || typeof text !== 'string') return null;
  
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;

  return {
    keyword: trimmed,
    searchVolume: typeof item === 'object' ? (item.searchVolume ?? item.volume ?? null) : null,
    keywordDifficulty: typeof item === 'object' ? (item.keywordDifficulty ?? item.difficulty ?? null) : null,
    cpc: typeof item === 'object' ? (item.cpc ?? null) : null,
    competition: typeof item === 'object' ? (item.competition ?? null) : null,
    competitionIndex: typeof item === 'object' ? (item.competitionIndex ?? null) : null,
    monthlySearches: typeof item === 'object' ? (item.monthlySearches ?? null) : null,
    source: typeof item === 'object' ? (item.source ?? null) : null,
    intent: typeof item === 'object' ? (item.intent ?? null) : null,
    confidence: typeof item === 'object' ? (item.confidence ?? null) : null,
    metricType: typeof item === 'object' ? (item.metricType ?? null) : null,
  };
}

/**
 * Canonical keyword normalizer - single source of truth for all keyword consumers.
 * Supports stored data in multiple field paths and item shapes.
 * Deduplicates by normalized lowercase keyword text.
 * 
 * @param {Object} seoIntelligence - SEO intelligence record or keyword data
 * @returns {Object} - Normalized keyword buckets with canonical structure
 */
export function normalizeSeoKeywords(seoIntelligence) {
  const si = seoIntelligence || {};

  // Try canonical paths first, then legacy paths
  const kwData = si.keywordOpportunities || si.keywordIntelligence || si.keywordIntelligenceRecord || si.keywords || si;

  // Extract from canonical paths
  let primaryRaw = kwData.primaryKeywords || kwData.primary || [];
  let secondaryRaw = kwData.secondaryKeywords || kwData.secondary || [];
  let longTailRaw = kwData.longTailKeywords || kwData.longTail || [];
  let questionRaw = kwData.questionKeywords || kwData.questions || kwData.questionKeywords || [];
  let geoRaw = kwData.geoKeywords || [];
  let competitorRaw = kwData.competitorKeywords || [];
  let contentOppRaw = kwData.contentOpportunities || [];

  // Also check nested metadata paths
  if (kwData.keywordOpportunities) {
    primaryRaw = kwData.keywordOpportunities.primaryKeywords || primaryRaw;
    secondaryRaw = kwData.keywordOpportunities.secondaryKeywords || secondaryRaw;
    longTailRaw = kwData.keywordOpportunities.longTailKeywords || longTailRaw;
    questionRaw = kwData.keywordOpportunities.questionKeywords || questionRaw;
    geoRaw = kwData.keywordOpportunities.geoKeywords || geoRaw;
    competitorRaw = kwData.keywordOpportunities.competitorKeywords || competitorRaw;
    contentOppRaw = kwData.keywordOpportunities.contentOpportunities || contentOppRaw;
  }

  // Normalize each bucket
  const normalize = (items) => {
    const seen = new Set();
    return asArray(items)
      .map(normalizeKeywordItem)
      .filter(kw => {
        if (!kw) return false;
        const key = kw.keyword.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  };

  const primaryKeywords = normalize(primaryRaw);
  const secondaryKeywords = normalize(secondaryRaw);
  const longTailKeywords = normalize(longTailRaw);
  const questionKeywords = normalize(questionRaw);
  const geoKeywords = normalize(geoRaw);
  const competitorKeywords = normalize(competitorRaw);
  const contentOpportunities = normalize(contentOppRaw);

  // Build allKeywords (deduplicated across all buckets)
  const allSeen = new Set();
  const allKeywords = [];
  for (const bucket of [primaryKeywords, secondaryKeywords, longTailKeywords, questionKeywords, geoKeywords, competitorKeywords, contentOpportunities]) {
    for (const kw of bucket) {
      const key = kw.keyword.toLowerCase();
      if (!allSeen.has(key)) {
        allSeen.add(key);
        allKeywords.push(kw);
      }
    }
  }

  return {
    primaryKeywords,
    secondaryKeywords,
    longTailKeywords,
    questionKeywords,
    geoKeywords,
    competitorKeywords,
    contentOpportunities,
    allKeywords,
    keywordCount: allKeywords.length,
  };
}
