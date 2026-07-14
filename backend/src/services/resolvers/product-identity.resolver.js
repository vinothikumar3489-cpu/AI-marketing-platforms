/**
 * Canonical Product Identity Resolver
 * Resolves the actual product name, brand, and company from multiple sources
 * Prioritizes analyzed product data over project/chat titles
 */

import { asArray } from '../normalizers/array-helpers.js';

// Generic titles that should not be used as product names
const GENERIC_TITLES = [
  'New Analysis',
  'Untitled Project',
  'Growth Analysis',
  'New Project',
  'Project',
  'Analysis',
  'Untitled',
  'My',
  'The',
  'Test',
  'Demo',
  'Sample',
];

/**
 * Check if a name is a generic title that should not be used as product name
 */
function isGenericTitle(name) {
  if (!name || typeof name !== 'string') return true;
  const normalized = name.trim();
  return GENERIC_TITLES.some(generic => 
    normalized.toLowerCase() === generic.toLowerCase()
  );
}

/**
 * Resolve product identity from multiple sources
 * Priority order as specified:
 * 1. ProductIntelligence.productName
 * 2. ProductIntelligence.name
 * 3. ProductIntelligence.brandName
 * 4. ProductIntelligence.companyName
 * 5. detected brand from product summary
 * 6. website title or H1
 * 7. analyzed domain
 * 8. explicit user-provided product name
 * 9. chat title only as projectTitle
 */
export function resolveProductIdentity({ chat, productIntelligence, evidenceSnapshot, website }) {
  const projectTitle = chat?.title || 'New Analysis';
  const websiteUrl = chat?.websiteUrl || website?.url || null;
  
  // Extract domain from website URL
  let domain = null;
  if (websiteUrl) {
    try {
      const url = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`);
      domain = url.hostname.replace('www.', '');
    } catch (e) {
      domain = websiteUrl;
    }
  }

  // Track evidence reference for debugging
  let evidenceReference = null;
  let source = 'unknown';

  // Priority 1: ProductIntelligence.productName
  let productName = productIntelligence?.productName || null;
  let brandName = productIntelligence?.brandName || null;
  let companyName = productIntelligence?.companyName || null;
  
  if (productName && !isGenericTitle(productName)) {
    source = 'productIntelligence_productName';
    evidenceReference = 'ProductIntelligence.productName';
  }

  // Priority 2: ProductIntelligence.productAnalysis.productName (nested)
  if (!productName || isGenericTitle(productName)) {
    const paName = productIntelligence?.productAnalysis?.productName || productIntelligence?.productAnalysis?.name || null;
    if (paName && !isGenericTitle(paName)) {
      productName = paName;
      source = 'productIntelligence_productAnalysis_productName';
      evidenceReference = 'ProductIntelligence.productAnalysis.productName';
    }
  }

  // Priority 3: ProductIntelligence.name
  if (!productName || isGenericTitle(productName)) {
    const piName = productIntelligence?.name || null;
    if (piName && !isGenericTitle(piName)) {
      productName = piName;
      source = 'productIntelligence_name';
      evidenceReference = 'ProductIntelligence.name';
    }
  }

  // Priority 4: ProductIntelligence.brandName
  if (!brandName) {
    brandName = productIntelligence?.brandName || productIntelligence?.productAnalysis?.brandName || null;
    if (brandName && !productName) {
      productName = brandName;
      source = 'productIntelligence_brandName';
      evidenceReference = 'ProductIntelligence.brandName';
    }
  }

  // Priority 5: ProductIntelligence.companyName
  if (!companyName) {
    companyName = productIntelligence?.companyName || productIntelligence?.productAnalysis?.companyName || null;
  }

  // Priority 5: detected brand from product summary
  if (!productName || isGenericTitle(productName)) {
    const productAnalysis = productIntelligence?.productAnalysis || {};
    const summary = productAnalysis.summary || productAnalysis.productSummary || '';
    // Try to extract brand from summary (simple heuristic)
    const brandMatch = summary.match(/^([A-Z][a-zA-Z]+)\s+is/i);
    if (brandMatch && !isGenericTitle(brandMatch[1])) {
      productName = brandMatch[1];
      brandName = brandName || productName;
      source = 'productSummary_brand';
      evidenceReference = 'ProductIntelligence.productAnalysis.summary';
    }
  }

  // Priority 6: website title or H1
  if (!productName || isGenericTitle(productName)) {
    const websiteTitle = website?.title || website?.heroText || evidenceSnapshot?.evidence?.website?.title || null;
    if (websiteTitle && !isGenericTitle(websiteTitle)) {
      productName = websiteTitle;
      source = 'website_title';
      evidenceReference = 'Website.title';
    }
  }

  // Priority 7: analyzed domain
  if (!productName || isGenericTitle(productName)) {
    if (domain) {
      // Convert domain to product name (e.g., virlo.ai -> Virlo, my-site.com -> My Site)
      const domainPart = domain.split('.')[0];
      const domainName = domainPart
        .replace(/[-_]/g, ' ')
        .split(' ')
        .filter(w => w.length > 0 && !/^\d+$/.test(w))
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
      if (domainName && !isGenericTitle(domainName)) {
        productName = domainName;
        brandName = brandName || domainName;
        source = 'domain';
        evidenceReference = 'Domain extraction';
      }
    }
  }

  // Priority 8: explicit user-provided product name (chat.productName)
  if (!productName || isGenericTitle(productName)) {
    if (chat?.productName && !isGenericTitle(chat.productName)) {
      productName = chat.productName;
      source = 'chat_productName';
      evidenceReference = 'Chat.productName';
    }
  }

  // Priority 9: chat.title ONLY as projectTitle fallback, never as productName
  // If we reach here, productName is still generic or null - use domain or mark as unknown
  if (!productName || isGenericTitle(productName)) {
    if (domain) {
      const domainPart = domain.split('.')[0];
      const domainName = domainPart
        .replace(/[-_]/g, ' ')
        .split(' ')
        .filter(w => w.length > 0 && !/^\d+$/.test(w))
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
      productName = domainName || 'Unknown Product';
      brandName = brandName || productName;
      source = 'domain_fallback';
      evidenceReference = 'Domain fallback';
    } else {
      productName = 'Unknown Product';
      source = 'unknown';
      evidenceReference = 'No product identity found';
    }
  }

  // If brandName still not set, use productName
  if (!brandName) {
    brandName = productName;
  }

  // If companyName still not set, use brandName
  if (!companyName) {
    companyName = brandName;
  }

  return {
    projectTitle,
    productName,
    brandName,
    companyName,
    websiteUrl,
    domain,
    source,
    evidenceReference
  };
}

export default { resolveProductIdentity };
