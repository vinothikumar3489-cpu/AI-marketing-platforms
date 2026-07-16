/**
 * Keyword quality filter — validates complete phrases, not individual tokens.
 * Rejects raw page tokens, navigation labels, single generic words, and malformed text.
 * Only passes phrases with sufficient product relevance and understandable intent.
 */

const LOW_QUALITY_KEYWORDS = new Set([
  'started', 'alerts', 'outlier', 'shorts', 'text', 'tracking', 'trends',
  'content', 'alert', 'product', 'home', 'page', 'app', 'get', 'use',
  'how', 'what', 'why', 'when', 'where', 'login', 'signup', 'sign up',
  'register', 'pricing', 'features', 'blog', 'docs', 'documentation',
  'support', 'contact', 'about', 'careers', 'help', 'search', 'setting',
  'settings', 'dashboard', 'profile', 'account', 'billing',
  'review', 'reviews', 'download', 'free', 'trial', 'demo', 'video',
  'tutorial', 'guide', 'manual', 'instructions', 'overview',
  'receive', 'accordance', 'personal', 'newsletters', 'google.', 'workspace.',
  'accordance', 'cloud', 'receive', 'google', 'cloud', 'workspace', 'meet',
  'notifications', 'admin', 'storage', 'security', 'privacy', 'terms',
  'sign', 'manage', 'create', 'delete', 'edit', 'update', 'view',
  'share', 'send', 'invite', 'join', 'leave', 'accept', 'decline',
  'allow', 'block', 'report', 'feedback', 'survey', 'poll',
]);

// Generic single words that should never standalone as keywords
const GENERIC_SINGLE_WORDS = new Set([
  'software', 'system', 'platform', 'service', 'solution', 'tool', 'app',
  'product', 'company', 'business', 'team', 'data', 'tech', 'code',
  'cloud', 'web', 'site', 'page', 'user', 'client', 'general',
  'account', 'semrush', 'google', 'meet', 'workspace', 'cloud',
  'receive', 'accordance', 'personal', 'newsletters', 'notifications',
  'admin', 'storage', 'security', 'privacy', 'terms', 'design',
  'services', 'solutions', 'features', 'pricing', 'login', 'signup',
  'register', 'dashboard', 'profile', 'settings', 'help', 'support',
  'faq', 'about', 'contact', 'careers', 'blog', 'docs', 'home',
  'overview', 'started', 'alerts', 'shorts', 'tracking', 'trends',
  'outlier', 'content',
]);

// Phrases that are too generic or boilerplate
const LOW_QUALITY_PHRASE_PATTERNS = [
  /^- /, /^[a-z]{15,}$/, /^[a-z]+[A-Z]/, /^[a-z]{2,}[A-Z]{2,}/,
  /\.(com|org|net|io|app|ai)\b/, /\bhttp/, /^www\./,
  /cookie|privacy policy|terms of service|all rights reserved/i,
  /sign in|sign up|log in|create account|forgot password/i,
  /newsletter|subscribe|unsubscribe/i,
  /get started|learn more|read more|contact us/i,
  /^[a-z]\.$/, /\.$/, /\s\.$/, /\s-\s$/,
  /^\d+$/, /^[\d,+.$\-‰%]+$/,
  /complete guide for/i, /comprehensive guide/i,
];

/**
 * Check if a keyword string is low quality.
 * Validates complete phrases, not individual tokens.
 */
export function isLowQualityKeyword(keyword) {
  if (!keyword || typeof keyword !== 'string') return true;
  const trimmed = keyword.trim().toLowerCase();
  if (trimmed.length < 3) return true;
  if (LOW_QUALITY_KEYWORDS.has(trimmed)) return true;
  if (/^\d+$/.test(trimmed)) return true;
  if (trimmed.startsWith('http') || trimmed.startsWith('www')) return true;
  if (/^(new\s+analysis|untitled|new\s+project|growth\s+analysis|project)$/i.test(trimmed)) return true;

  // Check phrase-level patterns
  for (const pattern of LOW_QUALITY_PHRASE_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }

  // Single-word check: reject unless it has clear product intent
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    if (GENERIC_SINGLE_WORDS.has(words[0])) return true;
    if (words[0].length <= 2) return true;
    if (/^[a-z]{15,}$/.test(words[0])) return true;
    if (words[0].endsWith('.') || words[0].endsWith(',') || words[0].endsWith(';')) return true;
  }

  // Multi-word: reject if it's essentially a single generic word + filler
  if (words.length >= 2) {
    const meaningfulWords = words.filter(w => !['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'it', 'its', 'we', 'you', 'they', 'he', 'she'].includes(w));
    if (meaningfulWords.length === 0) return true;
    // All meaningful words are single generic terms
    if (meaningfulWords.every(w => GENERIC_SINGLE_WORDS.has(w))) return true;
  }

  // Reject if ends with orphaned punctuation
  if (/[\s,;:.!?]$/.test(trimmed) && !trimmed.endsWith('?')) return true;

  return false;
}

/**
 * Filter an array of keyword objects or strings, keeping only high-quality keywords.
 */
export function filterKeywords(keywords) {
  if (!Array.isArray(keywords)) return [];
  return keywords.filter(k => {
    if (typeof k === 'string') return !isLowQualityKeyword(k);
    if (k && typeof k === 'object') {
      const text = k.keyword || k.phrase || k.name || k.term || '';
      return !isLowQualityKeyword(text);
    }
    return false;
  });
}

/**
 * Separate keywords into product-relevant and broad categories.
 */
export function prioritizeProductKeywords(keywords, productName, brandName) {
  if (!Array.isArray(keywords)) return { product: [], broad: [] };
  const product = [];
  const broad = [];
  const productLower = (productName || '').toLowerCase();
  const brandLower = (brandName || '').toLowerCase();

  for (const k of keywords) {
    const text = typeof k === 'string' ? k : (k.keyword || k.phrase || k.name || '');
    const lower = text.toLowerCase();
    if (productLower && lower.includes(productLower)) {
      product.push(k);
    } else if (brandLower && lower.includes(brandLower)) {
      product.push(k);
    } else {
      broad.push(k);
    }
  }

  return { product, broad };
}

export default { isLowQualityKeyword, filterKeywords, prioritizeProductKeywords };
