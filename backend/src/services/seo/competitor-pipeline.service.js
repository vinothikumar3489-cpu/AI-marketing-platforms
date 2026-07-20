import { getSerpCompetitors } from '../serpapi.service.js';

const EXCLUDED_DOMAINS = new Set([
  'reddit.com', 'youtube.com', 'wikipedia.org', 'medium.com', 'quora.com',
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'linkedin.com',
  'pinterest.com', 'tiktok.com', 'snapchat.com', 'threads.net',
  'capterra.com', 'g2.com', 'trustpilot.com', 'crunchbase.com',
  'producthunt.com', 'alternativeto.net', 'getapp.com',
  'softwareadvice.com', 'sitejabber.com', 'saasworthy.com',
  'gartner.com', 'forrester.com', 'similarweb.com',
  'semrush.com', 'ahrefs.com', 'moz.com',
  'forbes.com', 'techcrunch.com', 'theverge.com', 'wired.com',
  'businessinsider.com', 'entrepreneur.com', 'inc.com', 'venturebeat.com',
  'techradar.com', 'zdnet.com', 'cnet.com', 'pcmag.com',
  'hubspot.com', 'neilpatel.com', 'backlinko.com', 'wordstream.com',
  'searchengineland.com', 'searchenginejournal.com',
  'github.com', 'stackoverflow.com', 'gitlab.com', 'bitbucket.org',
  'medium.com', 'dev.to', 'hashnode.com',
  'play.google.com', 'apps.apple.com', 'appstore.com',
  'chrome.google.com', 'chromewebstore.google.com',
  'docs.google.com', 'support.google.com', 'developers.google.com'
]);

const ARTICLE_TITLE_PATTERNS = [
  /^what\s+is/i, /^how\s+to/i, /^top\s+\d+/i, /^best\s+/i,
  /^guide\s+to/i, /^ultimate\s+guide/i, /^\d+\s+(best|top|ways|tips|reasons)/i,
  /vs\.?\s+/i, /versus\s+/i, /comparison/i, /review/i
];

const BLOG_INDICATORS = [
  /blog/i, /article/i, /news/i, /press/i, /insights/i, /stories/i,
  /updates/i, /journal/i, /magazine/i, /resources/i
];

const DOCS_INDICATORS = [
  /docs/i, /documentation/i, /help/i, /support/i, /knowledge.?base/i,
  /faq/i, /guide/i, /manual/i, /tutorial/i, /learn/i, /academy/i,
  /developers/i, /api/i, /reference/i, /changelog/i
];

const SAAS_PRODUCT_INDICATORS = [
  /software/i, /platform/i, /saas/i, /app/i, /tool/i, /solution/i,
  /cloud/i, /enterprise/i, /business/i, /dashboard/i, /analytics/i,
  /automation/i, /integration/i, /workflow/i, /collaboration/i,
  /productivity/i, /management/i, /optimization/i, /intelligence/i
];

export function isSaaSProduct(title, snippet, domain) {
  const text = `${title || ''} ${snippet || ''} ${domain || ''}`.toLowerCase();

  if (EXCLUDED_DOMAINS.has(domain)) return false;

  if (isBlogSite(domain, title, text)) return false;
  if (isDocsSite(domain, title, text)) return false;
  if (isArticlePage(title, snippet)) return false;

  const saasScore = SAAS_PRODUCT_INDICATORS.reduce((score, p) =>
    p.test(text) ? score + 1 : score, 0
  );

  return saasScore >= 1;
}

function isBlogSite(domain, title, text) {
  if (BLOG_INDICATORS.some(p => p.test(domain))) return true;
  if (BLOG_INDICATORS.some(p => p.test(title || ''))) return true;
  return false;
}

function isDocsSite(domain, title, text) {
  if (DOCS_INDICATORS.some(p => p.test(domain))) return true;
  if (DOCS_INDICATORS.some(p => p.test(title || ''))) return true;
  return false;
}

function isArticlePage(title, snippet) {
  if (!title) return false;
  if (ARTICLE_TITLE_PATTERNS.some(p => p.test(title))) return true;
  if (snippet && (snippet.includes('list of') || snippet.includes('top ') || snippet.startsWith('best '))) return true;
  return false;
}

function extractDomain(url) {
  if (!url) return '';
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch {
    return url.split('/')[0].replace(/^www\./, '').toLowerCase();
  }
}

export function filterCompetitors(rawCompetitors, targetDomain = '') {
  if (!Array.isArray(rawCompetitors) || rawCompetitors.length === 0) return [];

  const target = extractDomain(targetDomain);
  const seen = new Set();
  const validCompetitors = [];

  for (const comp of rawCompetitors) {
    const domain = comp.domain || extractDomain(comp.url || comp.website || '');
    if (!domain) continue;

    const normalizedDomain = domain.toLowerCase();

    if (normalizedDomain === target || normalizedDomain.includes(target) || target.includes(normalizedDomain)) continue;
    if (EXCLUDED_DOMAINS.has(normalizedDomain)) continue;
    if (seen.has(normalizedDomain)) continue;
    seen.add(normalizedDomain);

    const title = comp.title || comp.name || '';
    const snippet = comp.snippet || comp.description || '';

    if (!isSaaSProduct(title, snippet, normalizedDomain)) continue;

    const companyName = extractCompanyName(title, normalizedDomain);
    validCompetitors.push({
      name: companyName,
      domain: normalizedDomain,
      url: comp.url || comp.website || `https://${normalizedDomain}`,
      title: title,
      snippet: snippet,
      competitorType: 'direct',
      relevanceScore: calculateRelevance(title, snippet),
      source: 'SerpAPI',
      confidence: 80,
      retrievedAt: new Date().toISOString(),
      status: 'measured'
    });
  }

  return validCompetitors.slice(0, 20);
}

function extractCompanyName(title, domain) {
  if (title) {
    let name = title
      .replace(/\s*[-|–]\s*.*/g, '')
      .replace(/\s*:\s*.*/g, '')
      .replace(/\s*\|\s*.*/g, '')
      .replace(/\s*\(.*\)\s*/g, '')
      .trim();
    const words = name.split(/\s+/);
    if (words.length <= 5 && words.length >= 1 && !ARTICLE_TITLE_PATTERNS.some(p => p.test(name))) {
      return name;
    }
  }
  return domain.split('.')[0]
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function calculateRelevance(title, snippet) {
  let score = 50;
  const text = `${title || ''} ${snippet || ''}`.toLowerCase();

  if (text.includes('software') || text.includes('platform') || text.includes('saas')) score += 15;
  if (text.includes('enterprise') || text.includes('business')) score += 10;
  if (text.includes('alternative') || text.includes('competitor') || text.includes('vs')) score += 10;
  if (text.includes('pricing') || text.includes('price') || text.includes('plan')) score += 5;
  if (text.includes('features') || text.includes('integrations')) score += 5;
  if (text.includes('review') || text.includes('comparison')) score += 5;

  return Math.min(95, score);
}

export async function discoverCompetitorsViaSerpAPI(productName, industry, websiteUrl) {
  const queries = [
    `${productName} alternatives`,
    `${productName} competitors`,
    `best ${industry} software`,
    `top ${industry} tools`,
    `${industry} platforms`,
    `${productName} vs`
  ].filter(Boolean);

  const targetDomain = extractDomain(websiteUrl);
  const allResults = [];

  for (const query of queries.slice(0, 4)) {
    try {
      const result = await getSerpCompetitors(productName, industry, websiteUrl);
      if (result?.success && result?.data) {
        allResults.push(...result.data);
      }
    } catch (e) {
      console.warn(`[CompetitorPipeline] Search failed for "${query}":`, e.message);
    }
  }

  const filtered = filterCompetitors(allResults, targetDomain);
  return filtered;
}
