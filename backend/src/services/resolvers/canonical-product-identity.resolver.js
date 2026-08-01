/**
 * CANONICAL PRODUCT IDENTITY RESOLVER
 * Single authoritative source of truth for product identity.
 * 
 * Priority Order:
 * 1. Product JSON-LD
 * 2. Organization JSON-LD
 * 3. application-name
 * 4. og:site_name
 * 5. og:title
 * 6. canonical title
 * 7. verified product summary
 * 8. domain-derived identity
 * 9. validated user-provided name
 * 
 * Rejected UI/Navigation Identities:
 * - Chat history
 * - New chat
 * - Home
 * - Dashboard
 * - Settings
 * - New Analysis
 * - New Growth Analysis
 * - New & Featured
 * - Unknown Product
 * - None
 * - Untitled
 * - Get Started
 * - Learn More
 */

const REJECTED_IDENTITIES = new Set([
  'chat history',
  'new chat',
  'home',
  'dashboard',
  'settings',
  'new analysis',
  'new growth analysis',
  'new seo analysis',
  'new campaign',
  'new & featured',
  'featured',
  'unknown product',
  'none',
  'untitled',
  'untitled project',
  'get started',
  'learn more',
  'my',
  'the',
  'test',
  'demo',
  'sample',
  'project',
  'analysis',
  'website',
  'landing',
  'page',
  'www',
  'app',
  'login',
  'signin',
  'signup',
  'courses',
]);

function isRejectedIdentity(label) {
  if (!label || typeof label !== 'string') return true;
  const normalized = label.trim().toLowerCase();
  if (normalized.length < 2) return true;
  return REJECTED_IDENTITIES.has(normalized);
}

function extractDomain(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

function domainToBrand(domain) {
  if (!domain) return null;
  const parts = domain.split('.');
  if (parts.length < 2) return null;
  const name = parts[0];
  if (!name || name.length < 2 || isRejectedIdentity(name)) return null;
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

/**
 * Extract identity from structured data (JSON-LD)
 */
function extractFromStructuredData(structuredData) {
  if (!structuredData || typeof structuredData !== 'object') return null;
  
  // Priority 1: Product JSON-LD
  if (structuredData['@type'] === 'Product' || structuredData.product) {
    const product = structuredData.product || structuredData;
    if (product.name && !isRejectedIdentity(product.name)) {
      return {
        productName: product.name,
        brandName: product.brand?.name || product.brand || null,
        source: 'product_json_ld',
        evidence: 'Product JSON-LD structured data'
      };
    }
  }
  
  // Priority 2: Organization JSON-LD
  if (structuredData['@type'] === 'Organization' || structuredData.organization) {
    const org = structuredData.organization || structuredData;
    if (org.name && !isRejectedIdentity(org.name)) {
      return {
        productName: org.name,
        brandName: org.name,
        companyName: org.name,
        source: 'organization_json_ld',
        evidence: 'Organization JSON-LD structured data'
      };
    }
  }
  
  return null;
}

/**
 * Extract identity from meta tags
 */
function extractFromMetaTags(metaData) {
  if (!metaData || typeof metaData !== 'object') return null;
  
  // Priority 3: application-name
  if (metaData['application-name'] && !isRejectedIdentity(metaData['application-name'])) {
    return {
      productName: metaData['application-name'],
      source: 'application_name_meta',
      evidence: 'application-name meta tag'
    };
  }
  
  // Priority 4: og:site_name
  if (metaData['og:site_name'] && !isRejectedIdentity(metaData['og:site_name'])) {
    return {
      productName: metaData['og:site_name'],
      brandName: metaData['og:site_name'],
      source: 'og_site_name',
      evidence: 'og:site_name meta tag'
    };
  }
  
  // Priority 5: og:title
  if (metaData['og:title'] && !isRejectedIdentity(metaData['og:title'])) {
    return {
      productName: metaData['og:title'],
      source: 'og_title',
      evidence: 'og:title meta tag'
    };
  }
  
  return null;
}

/**
 * Extract identity from canonical title
 */
function extractFromCanonicalTitle(title) {
  if (!title || typeof title !== 'string') return null;
  
  // Remove common patterns
  const cleaned = title
    .replace(/\s*[-–|:]\s*.*$/, '') // Remove everything after separator
    .replace(/\s*\(\s*.*\s*\)\s*$/, '') // Remove parenthetical content
    .trim();
  
  if (cleaned && !isRejectedIdentity(cleaned) && cleaned.length >= 2) {
    return {
      productName: cleaned,
      source: 'canonical_title',
      evidence: 'Canonical page title'
    };
  }
  
  return null;
}

/**
 * Extract identity from verified product summary
 */
function extractFromProductSummary(summary) {
  if (!summary || typeof summary !== 'string') return null;
  
  // Look for brand pattern: "[Brand] is a..."
  const brandMatch = summary.match(/^([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)*)\s+is\s+(?:a|an|the)/i);
  if (brandMatch && !isRejectedIdentity(brandMatch[1])) {
    return {
      productName: brandMatch[1],
      brandName: brandMatch[1],
      source: 'product_summary',
      evidence: 'Verified product summary brand detection'
    };
  }
  
  return null;
}

/**
 * Infer category, industry and business model from available signals.
 * Never returns null/placeholder values — falls back to verified domain signals.
 */
function inferIdentityAttributes({ domain, description, structuredData, productIntelligence, websiteUrl }) {
  const signals = [
    description,
    scrapedDescription(productIntelligence),
    scrapedDescription(structuredData),
    websiteUrl,
    domain,
  ].filter(Boolean).join(' ').toLowerCase();

  let industry = null;
  let category = null;
  let businessModel = null;

  const industryKeywords = [
    ['SaaS / Software', ['saas', 'software', 'platform', 'cloud', 'api', 'app ', 'web app', 'mobile app', 'b2b software']],
    ['E-commerce', ['ecommerce', 'e-commerce', 'online store', 'shop', 'shopping', 'checkout', 'retail']],
    ['Fintech', ['fintech', 'payment', 'banking', 'finance', 'invoice', 'payments', 'bank', 'investing']],
    ['Healthcare', ['healthcare', 'health care', 'medical', 'clinic', 'health', 'wellness', 'therapy']],
    ['Education', ['education', 'learning', 'course', 'training', 'school', 'academy', 'university']],
    ['Marketing & Advertising', ['marketing', 'advertising', 'seo', 'analytics', 'social media', 'campaign']],
    ['Recruitment & HR', ['recruitment', 'hiring', 'human resources', 'hr ', 'talent', 'jobs']],
    ['Real Estate', ['real estate', 'property', 'rental', 'housing', 'mortgage']],
    ['Logistics', ['logistics', 'shipping', 'delivery', 'supply chain', 'freight']],
    ['Food & Beverage', ['restaurant', 'food', 'beverage', 'coffee', 'delivery food']],
    ['Travel & Hospitality', ['travel', 'hotel', 'booking', 'tourism', 'hospitality']],
    ['Cybersecurity', ['cybersecurity', 'security', 'threat', 'vulnerability', 'encryption']],
    ['AI & Machine Learning', ['machine learning', 'artificial intelligence', ' ai ', 'llm', 'gpt', 'automation']],
    ['Legal', ['legal', 'law firm', 'attorney', 'compliance']],
    ['Manufacturing', ['manufacturing', 'industrial', 'factory', 'production']],
    ['Consulting', ['consulting', 'advisory', 'strategy']],
    ['Technology', ['tech', 'digital', 'platform', 'software', 'saas', 'cloud']],
  ];

  for (const [label, keywords] of industryKeywords) {
    if (keywords.some(k => signals.includes(k))) {
      industry = label;
      break;
    }
  }

  if (industry && industry !== 'Technology') {
    if (industry === 'SaaS / Software' || industry === 'AI & Machine Learning' || industry === 'Cybersecurity') {
      category = 'Technology';
    } else if (industry === 'E-commerce') {
      category = 'E-commerce';
    } else {
      category = 'Services';
    }
  } else if (domain) {
    if (/\.(io|ai|dev|app|tech|software)$/.test(domain)) {
      category = 'Technology';
    } else if (/\.(shop|store|market)$/.test(domain)) {
      category = 'E-commerce';
    } else if (/\.(edu|school|academy)$/.test(domain)) {
      category = 'Services';
    } else if (/\.(org|gov)$/.test(domain)) {
      category = 'Services';
    } else {
      category = 'General';
    }
  } else {
    category = 'General';
  }

  if (!industry) industry = 'Technology';

  if (/(free trial|freemium|subscription|per month|monthly|annual plan|pricing plan)/.test(signals)) {
    businessModel = 'Subscription';
  } else if (/one-time|one time|lifetime deal|one time purchase/.test(signals)) {
    businessModel = 'One-time purchase';
  } else if (/free|open source|community/.test(signals)) {
    businessModel = 'Freemium';
  }

  return { industry, category, businessModel };
}

function scrapedDescription(productIntelligence) {
  if (!productIntelligence) return '';
  const candidate = productIntelligence.productAnalysis?.summary
    || productIntelligence.productSummary
    || productIntelligence.description
    || productIntelligence.scrapedData?.description
    || productIntelligence.scrapedData?.meta?.description
    || '';
  return typeof candidate === 'string' ? candidate : JSON.stringify(candidate || '');
}

/**
 * Main canonical resolver
 */
export function resolveProductIdentity({
  websiteUrl,
  structuredData,
  openGraph,
  metadata,
  scrapedWebsite,
  productIntelligence,
  evidenceSnapshot,
  chat
}) {
  const domain = extractDomain(websiteUrl || scrapedWebsite?.url || chat?.websiteUrl);
  
  let result = {
    resolved: false,
    productName: null,
    brandName: null,
    companyName: null,
    domain,
    websiteUrl: websiteUrl || scrapedWebsite?.url || chat?.websiteUrl,
    category: null,
    industry: null,
    businessModel: null,
    source: null,
    evidence: null
  };

  const inferred = inferIdentityAttributes({
    domain,
    description: scrapedWebsite?.description || metadata?.description || openGraph?.description || null,
    structuredData: structuredData || scrapedWebsite?.structuredData,
    productIntelligence,
    websiteUrl,
  });

  const applyInferred = (identity) => {
    identity.category = identity.category || inferred.category;
    identity.industry = identity.industry || inferred.industry;
    identity.businessModel = identity.businessModel || inferred.businessModel;
    return identity;
  };
  
  // Priority 1: Product JSON-LD
  const structuredIdentity = extractFromStructuredData(structuredData || scrapedWebsite?.structuredData);
  if (structuredIdentity) {
    Object.assign(result, structuredIdentity);
    result.resolved = true;
    return applyInferred(result);
  }
  
  // Priority 2: Organization JSON-LD (already handled in extractFromStructuredData)
  
  // Priority 3: application-name
  const metaIdentity = extractFromMetaTags(metadata || scrapedWebsite?.metadata || openGraph);
  if (metaIdentity) {
    Object.assign(result, metaIdentity);
    result.resolved = true;
    return applyInferred(result);
  }
  
  // Priority 4: og:site_name (already handled in extractFromMetaTags)
  
  // Priority 5: og:title (already handled in extractFromMetaTags)
  
  // Priority 6: canonical title
  const title = scrapedWebsite?.title || metadata?.title || openGraph?.title;
  const titleIdentity = extractFromCanonicalTitle(title);
  if (titleIdentity) {
    Object.assign(result, titleIdentity);
    result.resolved = true;
    return applyInferred(result);
  }
  
  // Priority 7: verified product summary
  const summary = productIntelligence?.productAnalysis?.summary || 
                  productIntelligence?.productSummary ||
                  scrapedWebsite?.description;
  const summaryIdentity = extractFromProductSummary(summary);
  if (summaryIdentity) {
    Object.assign(result, summaryIdentity);
    result.resolved = true;
    return applyInferred(result);
  }
  
  // Priority 8: domain-derived identity
  const domainIdentity = domainToBrand(domain);
  if (domainIdentity) {
    result.productName = domainIdentity;
    result.brandName = domainIdentity;
    result.source = 'domain_derived';
    result.evidence = 'Domain-derived brand name';
    result.resolved = true;
    return applyInferred(result);
  }
  
  // Priority 9: validated user-provided name
  const userProvided = [chat?.productName,
                        productIntelligence?.productName,
                        productIntelligence?.inputJson?.productName]
    .find(candidate => candidate && !isRejectedIdentity(candidate)) || null;
  if (userProvided) {
    result.productName = userProvided;
    result.brandName = userProvided;
    result.source = 'user_provided';
    result.evidence = 'User-provided product name';
    result.resolved = true;
    return applyInferred(result);
  }
  
  // No valid identity found — domain is the last verified signal
  if (domain) {
    const lastResort = domainToBrand(domain);
    if (lastResort) {
      result.productName = lastResort;
      result.brandName = lastResort;
      result.source = 'domain_derived';
      result.evidence = 'Domain-derived brand name';
      result.resolved = true;
      return applyInferred(result);
    }
  }

  // Truly unresolved — keep domain and inferred attributes, mark unresolved
  return applyInferred(result);
}

/**
 * Validate that identity is not a UI/navigation label
 */
export function isValidProductIdentity(identity) {
  if (!identity || !identity.productName) return false;
  return !isRejectedIdentity(identity.productName);
}

export default { resolveProductIdentity, isValidProductIdentity };
