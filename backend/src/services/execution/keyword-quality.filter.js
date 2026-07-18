const LOW_QUALITY_KEYWORDS = new Set([
  'started', 'alerts', 'outlier', 'shorts', 'text', 'tracking', 'trends',
  'content', 'alert', 'product', 'home', 'page', 'app', 'get', 'use',
  'how', 'what', 'why', 'when', 'where', 'login', 'signup', 'sign up',
  'register', 'pricing', 'features', 'blog', 'docs', 'documentation',
  'support', 'contact', 'about', 'careers', 'help', 'search', 'setting',
  'settings', 'dashboard', 'profile', 'account', 'billing',
  'review', 'reviews', 'download', 'free', 'trial', 'demo', 'video',
  'tutorial', 'guide', 'manual', 'instructions', 'overview',
  'google', 'facebook', 'twitter', 'instagram', 'linkedin', 'youtube',
  'google.', 'facebook.', 'twitter.', 'instagram.', 'youtube.',
  'google.com', 'facebook.com', 'twitter.com',
  'workspace.', 'workspace', 'newsletters', 'accordance',
  'receive', 'click', 'here', 'read', 'more', 'learn', 'email',
  'privacy', 'cookies', 'cookie', 'terms', 'conditions',
  'javascript', 'browser', 'chrome', 'firefox', 'safari', 'edge',
  'android', 'ios', 'iphone', 'ipad', 'mac', 'windows',
]);

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'up', 'about', 'into', 'over', 'after',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
  'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
  'very', 'just', 'because', 'as', 'until', 'while', 'that', 'this',
  'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'it', 'its', 'you', 'your', 'we', 'our', 'they', 'their',
  'he', 'she', 'his', 'her', 'him', 'i', 'me', 'my', 'myself',
]);

const NAVIGATION_TERMS = /^(login|sign.?in|sign.?up|register|get.?started|try.?free|book.?demo|watch.?demo|schedule|pricing|plans|contact.?us|support|help|docs|documentation|faq|knowledge.?base|community|forum|status|blog|careers|about.?us|our.?story|team|investors|press|news|partners|integrations|apps|marketplace|changelog|releases|roadmap|system.?status|cookie.?policy|privacy.?policy|terms.?of.?service|eula|license|sitemap|accessibility)($|\s)/i;

function normalizeKeyword(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/[.,/#!$%^&*;:{}=\-_`~()"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function countTokens(text) {
  return text.trim().split(/\s+/).filter(t => t.length > 0).length;
}

function isNavigationOrLegal(text) {
  const lower = text.toLowerCase().trim();
  if (NAVIGATION_TERMS.test(lower)) return true;
  const navTokens = ['privacy', 'cookies', 'terms', 'conditions', 'legal', 'compliance', 'gdpr', 'ccpa', 'accessibility', 'sitemap', 'eula', 'license'];
  const tokens = lower.split(/\s+/);
  const navCount = tokens.filter(t => navTokens.includes(t)).length;
  if (tokens.length <= 3 && navCount >= Math.ceil(tokens.length / 2)) return true;
  return false;
}

function isVerbalOrUtility(text) {
  const tokens = text.toLowerCase().trim().split(/\s+/);
  if (tokens.length > 3) return false;
  const verbalTokens = ['get', 'use', 'make', 'do', 'have', 'see', 'find', 'try', 'buy', 'sell', 'pay', 'send', 'receive', 'click', 'read', 'watch', 'listen', 'learn', 'know', 'need', 'want', 'like', 'love', 'share', 'post', 'talk', 'say', 'tell', 'ask', 'answer', 'help', 'show', 'give', 'take', 'keep', 'start', 'stop', 'continue'];
  return tokens.every(t => verbalTokens.includes(t));
}

function hasSingleTokenMeaning(text) {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (trimmed.includes(' ')) return false;
  const genericSingleTokens = ['google', 'youtube', 'facebook', 'twitter', 'instagram', 'linkedin', 'amazon', 'apple', 'microsoft', 'netflix', 'spotify', 'reddit', 'pinterest', 'tiktok', 'snapchat', 'whatsapp', 'telegram', 'slack', 'zoom', 'outlook', 'gmail', 'dropbox', 'drive', 'docs', 'sheets', 'slides', 'meet', 'calendar', 'chrome', 'firefox', 'safari', 'edge', 'android', 'iphone', 'ipad', 'macbook', 'windows', 'linux', 'ubuntu', 'npm', 'node', 'docker', 'kubernetes', 'github', 'gitlab', 'bitbucket', 'jira', 'confluence', 'trello', 'asana', 'monday', 'notion', 'evernote', 'airtable', 'salesforce', 'hubspot', 'marketo', 'mailchimp', 'sendgrid', 'brevo', 'twilio', 'stripe', 'paypal', 'square', 'shopify', 'woocommerce', 'magento', 'wordpress', 'wix', 'squarespace', 'webflow', 'figma', 'sketch', 'adobe', 'canva', 'photoshop', 'illustrator', 'after', 'effects', 'premiere', 'lightroom', 'indesign'];
  return genericSingleTokens.includes(trimmed.toLowerCase());
}

export function isLowQualityKeyword(keyword) {
  if (!keyword || typeof keyword !== 'string') return true;
  const normalized = normalizeKeyword(keyword);
  if (!normalized) return true;
  if (normalized.length < 3) return true;
  if (LOW_QUALITY_KEYWORDS.has(normalized)) return true;
  if (/^\d+$/.test(normalized)) return true;
  if (normalized.startsWith('http') || normalized.startsWith('www')) return true;
  if (/^(new\s+analysis|untitled|new\s+project|growth\s+analysis|project)$/i.test(normalized)) return true;
  if (isNavigationOrLegal(normalized)) return true;
  if (isVerbalOrUtility(normalized)) return true;
  if (hasSingleTokenMeaning(normalized)) return true;
  if (normalized.endsWith('.') && normalized.length > 3) {
    const withoutDot = normalized.slice(0, -1).trim();
    if (withoutDot.length >= 3) return false;
  }
  if (countTokens(normalized) >= 2) return false;
  return true;
}

export function filterKeywords(keywords) {
  if (!Array.isArray(keywords)) return [];
  return keywords.filter(k => {
    if (typeof k === 'string') return !isLowQualityKeyword(k);
    if (k && typeof k === 'object') {
      const text = k.keyword || k.phrase || k.name || k.term || '';
      const passed = !isLowQualityKeyword(text);
      if (passed && typeof k === 'object') {
        k.validationStatus = 'PASSED';
      }
      return passed;
    }
    return false;
  });
}

export function rateKeywordRelevance(keyword, productName, brandName, description) {
  const text = (typeof keyword === 'string' ? keyword : (keyword?.keyword || keyword?.phrase || '')).toLowerCase();
  const productLower = (productName || '').toLowerCase();
  const brandLower = (brandName || '').toLowerCase();
  const descLower = (description || '').toLowerCase();
  let score = 0;
  if (productLower && text.includes(productLower)) score += 40;
  if (brandLower && text.includes(brandLower)) score += 30;
  const productTokens = productLower.split(/\s+/).filter(Boolean);
  for (const token of productTokens) {
    if (token.length > 2 && text.includes(token)) score += 10;
  }
  const descTokens = descLower.split(/\s+/).filter(Boolean);
  for (const token of descTokens) {
    if (token.length > 3 && text.includes(token)) score += 5;
  }
  const intentScores = { 'how to': 15, 'what is': 10, 'best': 15, 'vs': 10, 'alternative': 10, 'pricing': 5, 'review': 5, 'tutorial': 10, 'guide': 8, 'example': 5, 'software': 3, 'tool': 3, 'platform': 5, 'solution': 3, 'service': 2 };
  for (const [phrase, s] of Object.entries(intentScores)) {
    if (text.includes(phrase)) score += s;
  }
  const tokens = text.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) score += 10;
  if (tokens.length >= 3) score += 5;
  return Math.min(score, 100);
}

export function prioritizeProductKeywords(keywords, productName, brandName, description) {
  if (!Array.isArray(keywords)) return { product: [], broad: [] };
  const product = [];
  const broad = [];
  for (const k of keywords) {
    const text = typeof k === 'string' ? k : (k.keyword || k.phrase || k.name || '');
    const relevance = rateKeywordRelevance(text, productName, brandName, description);
    const entry = typeof k === 'object' ? { ...k, relevanceScore: relevance } : { phrase: k, relevanceScore: relevance };
    if (relevance >= 30) {
      product.push(entry);
    } else {
      entry.relevanceScore = relevance;
      broad.push(entry);
    }
  }
  product.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  broad.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  return { product, broad };
}

export default { isLowQualityKeyword, filterKeywords, prioritizeProductKeywords, rateKeywordRelevance };