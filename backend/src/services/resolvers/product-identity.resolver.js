/**
 * LEGACY PRODUCT IDENTITY RESOLVER - DEPRECATED
 * 
 * This file is deprecated. Use canonical-product-identity.resolver.js instead.
 * This file is kept for backward compatibility during migration.
 */

import { resolveProductIdentity as canonicalResolve } from './canonical-product-identity.resolver.js';

export function resolveProductIdentity({ chat, productIntelligence, evidenceSnapshot, website }) {
  console.warn('[DEPRECATED] Using legacy product-identity.resolver.js. Migrate to canonical-product-identity.resolver.js');
  
  // Delegate to canonical resolver
  return canonicalResolve({
    websiteUrl: chat?.websiteUrl || website?.url,
    scrapedWebsite: website,
    productIntelligence,
    evidenceSnapshot,
    chat
  });
}

export default { resolveProductIdentity };
