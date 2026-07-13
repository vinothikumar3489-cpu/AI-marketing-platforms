/**
 * Canonical Product Identity Resolver
 * Resolves the actual product name, brand, and company from multiple sources
 * Prioritizes analyzed product data over project/chat titles
 */

import { asArray } from '../normalizers/array-helpers.js';

/**
 * Resolve product identity from multiple sources
 * Priority: ProductIntelligence > EvidenceSnapshot > Domain > Chat
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

  // Priority 1: ProductIntelligence.productName
  let productName = productIntelligence?.productName || null;
  let brandName = productIntelligence?.brandName || null;
  let companyName = productIntelligence?.companyName || null;
  let source = 'productIntelligence';

  // Priority 2: ProductIntelligence.productAnalysis.name
  if (!productName) {
    productName = productIntelligence?.productAnalysis?.name || null;
    if (productName) source = 'productAnalysis';
  }

  // Priority 3: ProductIntelligence.productAnalysis.brand
  if (!brandName) {
    brandName = productIntelligence?.productAnalysis?.brand || null;
  }

  // Priority 4: ProductIntelligence.productAnalysis.company
  if (!companyName) {
    companyName = productIntelligence?.productAnalysis?.company || null;
  }

  // Priority 5: EvidenceSnapshot brand/product identity
  if (!productName || !brandName) {
    const evidence = evidenceSnapshot?.evidence || {};
    if (evidence.brand) {
      productName = productName || evidence.brand.name || null;
      brandName = brandName || evidence.brand.name || null;
      source = 'evidenceSnapshot';
    }
    if (evidence.product) {
      productName = productName || evidence.product.name || null;
      if (!source) source = 'evidenceSnapshot';
    }
  }

  // Priority 6: Analyzed domain
  if (!productName && domain) {
    // Convert domain to product name (e.g., virlo.ai -> Virlo)
    productName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
    brandName = brandName || productName;
    source = 'domain';
  }

  // Priority 7: chat.productName only if explicitly set by user (not default)
  if (!productName && chat?.productName && chat.productName !== 'New Analysis') {
    productName = chat.productName;
    source = 'chat';
  }

  // Priority 8: chat.title as final display fallback only
  if (!productName) {
    productName = projectTitle;
    source = 'titleFallback';
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
    source
  };
}

export default { resolveProductIdentity };
