/**
 * LEGACY PRODUCT IDENTITY RESOLVER - DEPRECATED
 * 
 * This file is deprecated. Use canonical-product-identity.resolver.js instead.
 * This file is kept for backward compatibility during migration.
 */

import { resolveProductIdentity as canonicalResolve } from '../resolvers/canonical-product-identity.resolver.js';

function extractDomain(url) {
  if (!url || typeof url !== 'string') return null;
  try { return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, ''); } catch { return null; }
}

function cleanTitle(title) {
  if (!title || typeof title !== 'string') return null;
  const cleaned = title.replace(/^(New Analysis|New Project|Untitled|Growth Analysis)$/i, '').trim();
  return cleaned || null;
}

export async function resolveProductIdentity({ prisma, userId, chatId, chatTitle }) {
  console.warn('[DEPRECATED] Using legacy execution/product-identity.resolver.js. Migrate to canonical-product-identity.resolver.js');
  
  const identity = {
    projectTitle: cleanTitle(chatTitle) || 'Product Analysis',
    productName: null,
    brandName: null,
    companyName: null,
    websiteUrl: null,
    domain: null,
    category: null,
    source: null,
  };

  try {
    // Fetch data needed for canonical resolver
    const [productIntel, snapshot] = await Promise.all([
      prisma.productIntelligence.findFirst({
        where: { chatId },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.evidenceSnapshot.findFirst({
        where: { chatId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Use canonical resolver
    const canonical = canonicalResolve({
      websiteUrl: productIntel?.websiteUrl,
      productIntelligence,
      evidenceSnapshot: snapshot,
      chat: { productName: productIntel?.productName, websiteUrl: productIntel?.websiteUrl }
    });

    if (canonical.resolved) {
      Object.assign(identity, {
        productName: canonical.productName,
        brandName: canonical.brandName || canonical.productName,
        companyName: canonical.companyName || canonical.brandName,
        websiteUrl: canonical.websiteUrl,
        domain: canonical.domain,
        category: canonical.category,
        source: canonical.source,
      });
      return identity;
    }

    // Fallback to chat title only
    identity.projectTitle = chatTitle || 'Product Analysis';
    identity.source = 'chat_title_only';
    return identity;
  } catch (error) {
    console.error('[ProductIdentity] Resolve error:', error.message);
    identity.source = 'resolve_error';
    return identity;
  }
}

/**
 * Resolve features from all possible ProductIntelligence paths.
 */
export function resolveProductFeatures(productIntel) {
  const analysis = productIntel?.productAnalysis || {};
  const paths = [
    analysis.features,
    analysis.keyFeatures,
    analysis.capabilities,
    analysis.differentiators,
    productIntel?.features,
    productIntel?.capabilities,
  ];

  const seen = new Set();
  const features = [];

  for (const path of paths) {
    if (!Array.isArray(path)) continue;
    for (const item of path) {
      if (!item) continue;
      const name = typeof item === 'string' ? item : (item.name || item.feature || item.title || '');
      if (!name) continue;
      if (!seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        features.push({
          name,
          description: typeof item === 'object' ? (item.description || item.details || '') : '',
          benefit: typeof item === 'object' ? (item.benefit || item.value || '') : '',
          source: productIntel?.id ? `product_intelligence:${productIntel.id}` : 'product_intelligence',
          inferenceStatus: 'EVIDENCE_BACKED',
        });
      }
    }
  }

  // Derive capabilities from USP/summary if no explicit features found
  if (features.length === 0 && (productIntel?.productSummary || analysis?.usp || analysis?.valueProposition)) {
    const text = [
      productIntel.productSummary,
      analysis?.usp,
      analysis?.valueProposition,
    ].filter(Boolean).join(' ');
    const capabilityIndicators = [
      'track', 'monitor', 'analyze', 'identify', 'detect', 'research',
      'discover', 'compare', 'benchmark', 'report',
    ];
    for (const indicator of capabilityIndicators) {
      if (text.toLowerCase().includes(indicator)) {
        features.push({
          name: `${indicator} capabilities`,
          description: `Inferred from product evidence`,
          benefit: '',
          source: 'product_summary_analysis',
          inferenceStatus: 'AI_INFERRED_FROM_EVIDENCE',
        });
      }
    }
  }

  return features;
}
