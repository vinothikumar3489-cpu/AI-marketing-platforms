/**
 * Derive correct website identity without blindly trusting previous project names.
 * Fully safe - handles null/undefined inputs gracefully.
 */
import { sanitizeText, extractText } from './text.util.js';

export function deriveWebsiteIdentity(params = {}) {
  // Safe extraction with defaults
  const {
    websiteUrl = '',
    scrapedData = {},
    researchData = {},
    chat = {}
  } = params || {};

  // Return safe defaults if no websiteUrl
  if (!websiteUrl || typeof websiteUrl !== 'string') {
    return {
      websiteUrl: '',
      domain: '',
      brandName: null,
      companyName: null,
      productName: null,
      industry: null,
      category: null,
      targetAudience: null,
      websiteTitle: '',
      websiteDescription: '',
      businessModel: null,
      businessCategory: null,
      companySize: null,
      source: 'fallback'
    };
  }

  let domain = '';
  try {
    const urlObj = new URL(websiteUrl);
    domain = urlObj.hostname.replace(/^www\./, '');
  } catch (e) {
    domain = websiteUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }

  // Helper to safely split titles
  const cleanTitle = (raw) => {
    if (!raw) return '';
    let parts = raw.split(/\||-|–/);
    if (parts.length > 1) {
      return parts.reduce((a, b) => a.trim().length <= b.trim().length && a.trim().length > 0 ? a : b).trim();
    }
    return raw.trim();
  };

  const meta = scrapedData?.meta || {};
  const ogSiteName = meta?.ogSiteName || meta?.['og:site_name'];
  
  // Extract title from multiple sources in priority order
  const titleSources = [
    scrapedData?.title,
    meta?.title,
    meta?.ogTitle,
    meta?.['og:title'],
    scrapedData?.h1?.[0],
    ogSiteName
  ];
  const titlePart = cleanTitle(titleSources.find(t => t) || '');
  
  // Extract description from multiple sources in priority order
  const descriptionSources = [
    meta?.description,
    meta?.ogDescription,
    meta?.['og:description'],
    scrapedData?.metaDescription,
    scrapedData?.description
  ];
  const descriptionPart = descriptionSources.find(d => d) || '';

  // Safely extract h1 from multiple sources
  const h1 =
    scrapedData?.h1?.[0] ||
    scrapedData?.metadata?.h1?.[0] ||
    scrapedData?.headings?.h1?.[0] ||
    scrapedData?.headings?.h1 ||
    (scrapedData?.content?.match?.(/<h1[^>]*>(.*?)<\/h1>/i)?.[1] || '');

  // Format domain to proper case - NEVER append TLD words
  const formatDomain = (d) => {
    if (!d) return '';
    const parts = d.split('.');
    if (parts.length > 1) {
      const name = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      
      // Never append TLD as separate word - always return just the name capitalized
      // This prevents "Notion com", "Figma com", "Orkyn ai" etc.
      return name;
    }
    return d.charAt(0).toUpperCase() + d.slice(1);
  };

  const domainDerivedName = formatDomain(domain);

  // Pick the best company/product/brand name - prioritize scraped title/meta over domain
  let brandName = ogSiteName || titlePart || h1 || domainDerivedName || domain;
  let companyName = brandName;
  let productName = brandName;

  // Check if we should inherit from chat (only if domain matches exactly)
  let chatDomain = '';
  if (chat?.websiteUrl) {
    try {
      chatDomain = new URL(chat.websiteUrl).hostname.replace(/^www\./, '');
    } catch (e) {
      chatDomain = chat.websiteUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    }
  }

  if (chatDomain === domain && chat?.productName) {
    productName = chat.productName;
    companyName = chat.companyName || chat.productName;
    brandName = chat.productName;
  }

  // Ensure we don't output generic fallback names — use brandName instead
  if (!productName) {
    productName = brandName;
  }

  // Infer business properties from scraped text
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

  return {
    websiteUrl,
    domain,
    brandName: sanitizeText(brandName),
    companyName: sanitizeText(companyName),
    productName: sanitizeText(productName),
    industry: chatDomain === domain && chat?.industry ? chat.industry : null,
    category,
    targetAudience,
    websiteTitle: sanitizeText(titlePart),
    websiteDescription: sanitizeText(descriptionPart),
    businessModel,
    businessCategory,
    companySize,
    source: (chatDomain === domain && chat?.productName) ? 'chat_match' : 'scraped_derived'
  };
}
