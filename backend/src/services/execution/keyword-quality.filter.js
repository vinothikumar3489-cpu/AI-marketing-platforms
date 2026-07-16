const LOW_QUALITY_KEYWORDS = new Set([
  'started', 'alerts', 'outlier', 'shorts', 'text', 'tracking', 'trends',
  'content', 'alert', 'product', 'home', 'page', 'app', 'get', 'use',
  'how', 'what', 'why', 'when', 'where', 'login', 'signup', 'sign up',
  'register', 'pricing', 'features', 'blog', 'docs', 'documentation',
  'support', 'contact', 'about', 'careers', 'help', 'search', 'setting',
  'settings', 'dashboard', 'profile', 'account', 'billing',
  'review', 'reviews', 'download', 'free', 'trial', 'demo', 'video',
  'tutorial', 'guide', 'manual', 'instructions', 'overview',
]);

export function isLowQualityKeyword(keyword) {
  if (!keyword || typeof keyword !== 'string') return true;
  const trimmed = keyword.trim().toLowerCase();
  if (trimmed.length < 3) return true;
  if (LOW_QUALITY_KEYWORDS.has(trimmed)) return true;
  if (/^\d+$/.test(trimmed)) return true;
  if (trimmed.startsWith('http') || trimmed.startsWith('www')) return true;
  if (/^(new\s+analysis|untitled|new\s+project|growth\s+analysis|project)$/i.test(trimmed)) return true;
  return false;
}

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
