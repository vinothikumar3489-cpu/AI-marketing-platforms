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
