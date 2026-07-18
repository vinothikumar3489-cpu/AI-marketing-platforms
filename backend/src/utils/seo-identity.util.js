/**
 * Derive correct website identity without blindly trusting previous project names.
 * Fully safe - handles null/undefined inputs gracefully.
 */
import { sanitizeText } from './text.util.js';

function extractHostname(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}

function cleanTitle(raw) {
  if (!raw) return '';
  const parts = raw.split(/\||-|–/);
  if (parts.length > 1) {
    return parts.reduce((a, b) => a.trim().length <= b.trim().length && a.trim().length > 0 ? a : b).trim();
  }
  return raw.trim();
}

function capitalizeDomain(domain) {
  if (!domain) return '';
  const parts = domain.split('.');
  if (parts.length > 1) {
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }
  return domain.charAt(0).toUpperCase() + domain.slice(1);
}

export function deriveWebsiteIdentity(params = {}) {
  const { websiteUrl = '', scrapedData = {}, chat = {} } = params || {};

  if (!websiteUrl || typeof websiteUrl !== 'string') {
    return {
      websiteUrl: '', domain: '', brandName: null, companyName: null,
      productName: null, industry: null, category: null, targetAudience: null,
      websiteTitle: '', websiteDescription: '', businessModel: null,
      businessCategory: null, companySize: null, source: 'fallback'
    };
  }

  const identityContext = {
    originalUrl: websiteUrl,
    hostname: extractHostname(websiteUrl),
    normalizedDomain: null,
    companyHint: null,
    productHint: null,
    evidence: [],
    confidence: null
  };

  const meta = scrapedData?.meta || {};
  const ogSiteName = meta?.ogSiteName || meta?.['og:site_name'];

  const titleSources = [
    scrapedData?.title, meta?.title, meta?.ogTitle,
    meta?.['og:title'], scrapedData?.h1?.[0], ogSiteName
  ];
  const titlePart = cleanTitle(titleSources.find(t => t) || '');

  const descriptionSources = [
    meta?.description, meta?.ogDescription, meta?.['og:description'],
    scrapedData?.metaDescription, scrapedData?.description
  ];
  const descriptionPart = descriptionSources.find(d => d) || '';

  const h1 =
    scrapedData?.h1?.[0] || scrapedData?.metadata?.h1?.[0] ||
    scrapedData?.headings?.h1?.[0] || scrapedData?.headings?.h1 ||
    (scrapedData?.content?.match?.(/<h1[^>]*>(.*?)<\/h1>/i)?.[1] || '');

  identityContext.normalizedDomain = identityContext.hostname;
  const domainDerivedName = capitalizeDomain(identityContext.normalizedDomain);

  identityContext.productHint = ogSiteName || titlePart || h1 || domainDerivedName || identityContext.normalizedDomain;
  identityContext.companyHint = identityContext.productHint;

  let chatHostname = '';
  if (chat?.websiteUrl) {
    chatHostname = extractHostname(chat.websiteUrl);
  }

  if (chatHostname === identityContext.normalizedDomain && chat?.productName) {
    identityContext.productHint = chat.productName;
    identityContext.companyHint = chat.companyName || chat.productName;
  }

  let businessModel = null;
  let companySize = null;
  let businessCategory = null;
  let category = null;
  let targetAudience = null;

  if (scrapedData?.text) {
    const text = scrapedData.text.toLowerCase();
    if (text.includes('add to cart') || text.includes('checkout') || text.includes('shipping')) {
      businessModel = 'E-commerce';
      businessCategory = 'Retail & E-commerce';
      category = 'E-commerce';
    } else if (text.includes('pricing') || text.includes('book a demo') || text.includes('start free trial')) {
      businessModel = 'B2B SaaS';
      category = 'SaaS';
    } else if (text.includes('consulting') || text.includes('our services')) {
      businessModel = 'Agency / Services';
      category = 'Services';
    }

    if (text.includes('enterprise') && (text.includes('fortune 500') || text.includes('global scale'))) {
      companySize = 'Enterprise';
      targetAudience = 'Enterprise';
    } else if (text.includes('startup') || text.includes('early stage')) {
      companySize = 'Startup';
      targetAudience = 'Startups';
    } else if (text.includes('small business') || text.includes('smb')) {
      targetAudience = 'SMB';
    }
  }

  const resolvedIndustry = category || (chatHostname === identityContext.normalizedDomain && chat?.industry ? chat.industry : null);

  return {
    websiteUrl: identityContext.originalUrl,
    domain: identityContext.normalizedDomain,
    brandName: sanitizeText(identityContext.productHint),
    companyName: sanitizeText(identityContext.companyHint),
    productName: sanitizeText(identityContext.productHint),
    industry: resolvedIndustry,
    category,
    targetAudience,
    websiteTitle: sanitizeText(titlePart),
    websiteDescription: sanitizeText(descriptionPart),
    businessModel,
    businessCategory,
    companySize,
    source: (chatHostname === identityContext.normalizedDomain && chat?.productName) ? 'chat_match' : 'scraped_derived'
  };
}
