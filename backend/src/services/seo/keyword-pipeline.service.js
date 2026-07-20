const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'shall',
  'can', 'need', 'dare', 'ought', 'used', 'this', 'that', 'these', 'those', 'it', 'its',
  'we', 'you', 'they', 'he', 'she', 'what', 'which', 'who', 'whom', 'when', 'where', 'why',
  'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'some', 'any', 'no', 'not',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'because', 'about', 'into',
  'over', 'after', 'before', 'between', 'under', 'above', 'below', 'up', 'down', 'out',
  'off', 'through', 'during', 'without', 'within', 'along', 'around', 'among',
  'our', 'your', 'their', 'my', 'his', 'her', 'get', 'gets', 'got', 'getting',
  'make', 'makes', 'made', 'making', 'use', 'uses', 'used', 'using', 'find',
  'found', 'finding', 'see', 'sees', 'saw', 'seen', 'come', 'comes', 'came', 'coming',
  'take', 'takes', 'took', 'taking', 'know', 'knows', 'knew', 'known', 'like', 'likes',
  'go', 'goes', 'went', 'gone', 'going', 'want', 'wants', 'wanted', 'look', 'looks',
  'help', 'helps', 'helped', 'work', 'works', 'worked', 'working', 'seem', 'seems',
  'try', 'tries', 'tried', 'leave', 'leaves', 'call', 'calls', 'called'
]);

const NAVIGATION_PATTERNS = [
  /sign in/i, /sign up/i, /log in/i, /login/i, /register/i, /create account/i,
  /forgot password/i, /reset password/i, /terms of service/i, /privacy policy/i,
  /cookie policy/i, /accept cookies/i, /manage cookies/i, /subscribe/i,
  /newsletter/i, /unsubscribe/i, /all rights reserved/i, /powered by/i,
  /get started free/i, /start free trial/i, /free trial/i, /download now/i,
  /learn more/i, /read more/i, /contact us/i, /contact sales/i, /get in touch/i,
  /follow us/i, /share this/i, /copyright/i, /legal notice/i, /sitemap/i,
  /search/i, /menu/i, /navigation/i, /skip to content/i, /back to top/i,
  /loading/i, /please wait/i, /under construction/i, /coming soon/i,
  /stay connected/i, /join our community/i, /follow on social/i,
  /download on app store/i, /get it on google play/i, /available on/i,
  /workspace/i, /google workspace/i, /admin console/i, /google admin/i
];

const GENERIC_WORDS = new Set([
  'software', 'platform', 'tool', 'solution', 'app', 'service', 'product',
  'business', 'company', 'enterprise', 'management', 'system', 'online',
  'digital', 'technology', 'cloud', 'data', 'web', 'website', 'application',
  'provider', 'services', 'solutions', 'tools', 'platforms', 'apps',
  'free', 'premium', 'pro', 'basic', 'advanced', 'best', 'top', 'great',
  'features', 'benefits', 'pricing', 'price', 'cost', 'demo', 'trial',
  'download', 'install', 'login', 'signup', 'register', 'home', 'about',
  'contact', 'blog', 'news', 'help', 'support', 'faq', 'docs', 'guide'
]);

export function extractCandidatePhrases(sources = {}) {
  const candidates = new Map();

  const sourcePriority = {
    title: 10, description: 9, h1: 8, h2: 7, h3: 6,
    features: 7, benefits: 7, pricing: 6, cta: 5,
    schema: 6, faqs: 5, content: 4, links: 3
  };

  for (const [sourceType, texts] of Object.entries(sources)) {
    const priority = sourcePriority[sourceType] || 3;
    const items = Array.isArray(texts) ? texts : (texts ? [texts] : []);
    for (const item of items) {
      if (!item || typeof item !== 'string') continue;
      const phrases = extractPhrases(item);
      for (const phrase of phrases) {
        const existing = candidates.get(phrase);
        if (existing) {
          existing.priority = Math.max(existing.priority, priority);
          existing.sources.add(sourceType);
          existing.frequency++;
        } else {
          candidates.set(phrase, {
            phrase,
            priority,
            sources: new Set([sourceType]),
            frequency: 1
          });
        }
      }
    }
  }

  return Array.from(candidates.values());
}

function extractPhrases(text, maxWords = 4, minWords = 2) {
  const normalized = text.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()"']/g, ' ').replace(/\s+/g, ' ').trim();
  const words = normalized.split(' ').filter(w => w.length > 0);
  const phrases = new Set();

  for (let len = Math.min(maxWords, words.length); len >= minWords; len--) {
    for (let i = 0; i <= words.length - len; i++) {
      const window = words.slice(i, i + len);
      const contentWords = window.filter(w => !STOP_WORDS.has(w) && w.length > 1);
      if (contentWords.length < minWords) continue;
      if (contentWords.some(w => w.length > 25)) continue;
      const phrase = window.join(' ');
      if (phrase.length < 5) continue;
      if (isNavigationText(phrase)) continue;
      phrases.add(phrase);
    }
  }

  return Array.from(phrases);
}

function isNavigationText(phrase) {
  return NAVIGATION_PATTERNS.some(p => p.test(phrase));
}

export function validateKeyword(phrase, productName = '', companyName = '') {
  if (!phrase || typeof phrase !== 'string') return false;
  const trimmed = phrase.trim();
  if (trimmed.length < 3 || trimmed.length > 100) return false;

  const lower = trimmed.toLowerCase();
  const words = lower.split(/\s+/);

  if (words.every(w => STOP_WORDS.has(w))) return false;
  if (words.every(w => GENERIC_WORDS.has(w))) return false;

  const contentWords = words.filter(w => !STOP_WORDS.has(w));
  if (contentWords.length === 0) return false;

  if (/^[0-9+\-.,%#]+$/.test(trimmed)) return false;
  if (/^\[.*\]$/.test(trimmed)) return false;
  if (/http[s]?:\/\//.test(trimmed)) return false;

  if (isNavigationText(trimmed)) return false;

  return true;
}

export function deduplicateKeywords(keywords) {
  const seen = new Set();
  const result = [];

  for (const kw of keywords) {
    const key = kw.phrase || kw.keyword || kw;
    if (!key) continue;
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(kw);
    }
  }

  return result;
}

export function removeStopWords(phrase) {
  if (!phrase) return '';
  const words = phrase.split(/\s+/);
  const filtered = words.filter(w => !STOP_WORDS.has(w.toLowerCase()) && w.length > 1);
  return filtered.join(' ');
}

export function scoreKeywordRelevance(phrase, productName = '', companyName = '', industry = '') {
  let score = 50;
  const lower = phrase.toLowerCase();
  const product = (productName || '').toLowerCase();
  const company = (companyName || '').toLowerCase();
  const ind = (industry || '').toLowerCase();

  if (product && lower.includes(product)) score += 25;
  if (company && lower.includes(company)) score += 15;
  if (ind && lower.includes(ind)) score += 10;

  const commercial = ['buy', 'price', 'pricing', 'best', 'top', 'review', 'vs',
    'alternative', 'compare', 'software', 'tool', 'platform', 'discount', 'deal'];
  const commercialCount = commercial.filter(c => lower.includes(c)).length;
  score += Math.min(commercialCount * 5, 15);

  const specific = ['how', 'what', 'why', 'when', 'where', 'guide', 'tutorial',
    'example', 'vs', 'versus', 'comparison', 'alternative', 'review'];
  const specificCount = specific.filter(s => lower.includes(s)).length;
  score += specificCount * 3;

  return Math.min(100, score);
}

export function classifyKeyword(phrase) {
  const lower = phrase.toLowerCase();

  if (lower.startsWith('how') || lower.startsWith('what') || lower.startsWith('why') ||
      lower.startsWith('when') || lower.startsWith('where') || lower.startsWith('which') ||
      lower.startsWith('who') || lower.startsWith('does') || lower.startsWith('can') ||
      lower.startsWith('is') || lower.startsWith('are') || lower.startsWith('will') ||
      lower.startsWith('should') || lower.startsWith('do')) {
    return 'question';
  }

  const commercial = ['buy', 'price', 'pricing', 'best', 'top', 'review', 'vs',
    'versus', 'compare', 'comparison', 'alternative', 'discount', 'deal', 'coupon',
    'cheap', 'affordable'];
  const commercialCount = commercial.filter(c => lower.includes(c)).length;

  if (commercialCount >= 2 || (commercialCount >= 1 && lower.includes('software') || lower.includes('tool') || lower.includes('platform'))) {
    return 'commercial';
  }

  if (lower.split(' ').length >= 4) {
    return 'long_tail';
  }

  return 'informational';
}

export function buildKeywordSources(websiteData) {
  const wd = websiteData || {};
  const sources = {};

  sources.title = [wd.title || wd.metadata?.title || ''].filter(Boolean);
  sources.description = [wd.description || wd.metadata?.description || ''].filter(Boolean);

  for (const tag of ['h1', 'h2', 'h3']) {
    const items = wd[tag] || wd.content?.headings?.filter(h => h.tag === tag) || [];
    sources[tag] = items.map(i => typeof i === 'string' ? i : (i.text || i)).filter(Boolean);
  }

  sources.features = (wd.featuresText || wd.content?.features || wd.features || []).map(f =>
    typeof f === 'string' ? f : (f.text || f.name || f)
  ).filter(Boolean);

  sources.benefits = (wd.benefitsText || wd.content?.benefits || wd.benefits || []).map(b =>
    typeof b === 'string' ? b : (b.text || b.name || b)
  ).filter(Boolean);

  sources.pricing = (wd.pricingText || wd.content?.pricing || wd.pricing || []).map(p =>
    typeof p === 'string' ? p : (p.text || p.plan || p)
  ).filter(Boolean);

  sources.cta = (wd.ctaTexts || wd.content?.ctas || wd.ctas || []).map(c =>
    typeof c === 'string' ? c : (c.text || c.label || c)
  ).filter(Boolean);

  sources.schema = extractSchemaTexts(wd.schema || wd.structured);
  sources.faqs = extractFAQTexts(wd.faqs || wd.content?.faqs || wd.structured?.faqs);

  sources.content = [wd.text || wd.content?.text || ''].filter(Boolean);
  sources.links = (wd.links || wd.content?.links || wd.internalLinks || []).map(l =>
    typeof l === 'string' ? l : (l.text || l.label || l.title || '')
  ).filter(Boolean);

  return sources;
}

function extractSchemaTexts(schema) {
  if (!schema) return [];
  const texts = [];
  const items = schema.items || schema.types || schema.graph || [];
  const process = (item) => {
    if (!item) return;
    if (item.name) texts.push(item.name);
    if (item.description) texts.push(item.description);
    if (Array.isArray(item.about)) item.about.forEach(a => process(a));
    if (Array.isArray(item.itemListElement)) item.itemListElement.forEach(e => process(e));
    if (Array.isArray(item.mainEntity)) item.mainEntity.forEach(e => process(e));
  };
  if (Array.isArray(items)) items.forEach(process);
  else process(schema);
  return texts;
}

function extractFAQTexts(faqs) {
  if (!faqs) return [];
  const texts = [];
  const items = Array.isArray(faqs) ? faqs : (faqs.items || faqs.questions || faqs.faqs || []);
  for (const item of items) {
    if (item.question) texts.push(item.question);
    if (item.answer) texts.push(typeof item.answer === 'string' ? item.answer : (item.answer.text || ''));
    if (item.q) texts.push(item.q);
    if (item.a) texts.push(typeof item.a === 'string' ? item.a : (item.a.text || ''));
  }
  return texts;
}
