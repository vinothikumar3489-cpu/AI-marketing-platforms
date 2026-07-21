/**
 * Product Identity Normalizer
 * PART 2: Normalize both brief.productIdentity and brief._productIdentity into one canonical object
 */

/**
 * Normalize product identity from various sources into a canonical structure
 * Priority: brief.productIdentity → brief._productIdentity → brief.product → brief.company → domain-derived
 */
export function normalizeProductIdentity(brief) {
  if (!brief) {
    return {
      internalName: 'unknown',
      displayName: 'Unknown Product',
      brandName: 'Unknown',
      companyName: 'Unknown',
      domain: '',
      canonicalUrl: ''
    };
  }

  // Priority 1: brief.productIdentity
  if (brief.productIdentity) {
    return normalizeIdentityObject(brief.productIdentity);
  }

  // Priority 2: brief._productIdentity
  if (brief._productIdentity) {
    return normalizeIdentityObject(brief._productIdentity);
  }

  // Priority 3: brief.product
  if (brief.product) {
    return normalizeIdentityObject(brief.product);
  }

  // Priority 4: brief.company
  if (brief.company) {
    return normalizeIdentityObject(brief.company);
  }

  // Priority 5: domain-derived identity
  if (brief.domain || brief.websiteUrl || brief.url) {
    const domain = brief.domain || brief.websiteUrl || brief.url || '';
    return deriveFromDomain(domain);
  }

  // Fallback
  return {
    internalName: 'unknown',
    displayName: 'Unknown Product',
    brandName: 'Unknown',
    companyName: 'Unknown',
    domain: '',
    canonicalUrl: ''
  };
}

/**
 * Normalize an identity object into the canonical structure
 */
function normalizeIdentityObject(obj) {
  const internalName = obj.internalName || obj.name || obj.productName || obj.id || 'unknown';
  const displayName = obj.displayName || obj.name || obj.productName || obj.product || internalName;
  const brandName = obj.brandName || obj.brand || displayName;
  const companyName = obj.companyName || obj.company || brandName;
  const domain = obj.domain || obj.websiteUrl || obj.url || '';
  const canonicalUrl = obj.canonicalUrl || (domain.startsWith('http') ? domain : `https://${domain}`);

  return {
    internalName,
    displayName,
    brandName,
    companyName,
    domain,
    canonicalUrl
  };
}

/**
 * Derive identity from domain
 */
function deriveFromDomain(domain) {
  if (!domain) {
    return {
      internalName: 'unknown',
      displayName: 'Unknown Product',
      brandName: 'Unknown',
      companyName: 'Unknown',
      domain: '',
      canonicalUrl: ''
    };
  }

  // Extract domain from URL if needed
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  
  // Extract company/brand from domain (simple heuristic)
  const parts = cleanDomain.split('.');
  const mainPart = parts.length > 2 ? parts[parts.length - 2] : parts[0];
  
  // Convert to display name (capitalize, replace hyphens)
  const displayName = mainPart
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    internalName: mainPart,
    displayName: displayName || 'Unknown Product',
    brandName: displayName || 'Unknown',
    companyName: displayName || 'Unknown',
    domain: cleanDomain,
    canonicalUrl: domain.startsWith('http') ? domain : `https://${domain}`
  };
}

/**
 * Get public-facing product name (for customer-facing content)
 * Returns displayName, never internalName
 */
export function getPublicProductName(productIdentity) {
  if (!productIdentity) return 'Unknown Product';
  return productIdentity.displayName || productIdentity.brandName || 'Unknown Product';
}
