/**
 * Product Identity Resolver — single source of truth for product identity.
 * Priority: 1) ProductIntelligence, 2) Website evidence, 3) Product summary, 4) EvidenceSnapshot, 5) User input, 6) Chat title.
 */

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
    // Priority 1: ProductIntelligence product identity
    const productIntel = await prisma.productIntelligence.findFirst({
      where: { chatId },
      orderBy: { updatedAt: 'desc' },
    });

    if (productIntel) {
      const productName = productIntel.productName || productIntel.brandName || null;
      const analysis = productIntel.productAnalysis || {};

      identity.productName = productName || analysis.productName || analysis.brandName || null;
      identity.brandName = productIntel.brandName || analysis.brandName || identity.productName || null;
      identity.companyName = productIntel.companyName || analysis.companyName || null;
      identity.websiteUrl = productIntel.websiteUrl || analysis.websiteUrl || analysis.url || null;
      identity.domain = productIntel.domain || extractDomain(identity.websiteUrl) || null;
      identity.category = analysis.category || analysis.industry || null;
      identity.source = 'product_intelligence';

      if (identity.productName) return identity;
    }

    // Priority 2: EvidenceSnapshot website data
    const snapshot = await prisma.evidenceSnapshot.findFirst({
      where: { chatId },
      orderBy: { createdAt: 'desc' },
    });

    if (snapshot?.data) {
      const data = typeof snapshot.data === 'string' ? JSON.parse(snapshot.data) : snapshot.data;
      const website = data.website || data.companyWebsite || {};
      const product = data.product || {};
      const company = data.company || {};

      identity.productName = product.name || website.productName || null;
      identity.brandName = product.brandName || website.brandName || identity.productName || null;
      identity.companyName = company.name || data.companyName || null;
      identity.websiteUrl = website.url || company.website || null;
      identity.domain = website.domain || extractDomain(identity.websiteUrl) || null;
      identity.category = product.category || company.industry || null;
      identity.source = 'evidence_snapshot';

      if (identity.productName) return identity;
    }

    // Priority 3: Product summary detected brand
    if (productIntel?.productSummary) {
      const summary = typeof productIntel.productSummary === 'string'
        ? productIntel.productSummary
        : productIntel.productSummary.text || productIntel.productSummary.description || '';
      const brandMatch = summary.match(/([A-Z][a-z]+(?:[A-Z][a-z]+)*)/g);
      if (brandMatch) {
        identity.productName = brandMatch[0];
        identity.brandName = brandMatch[0];
        identity.source = 'product_summary_brand_detection';
        return identity;
      }
    }

    // Priority 4: Chat title as project title only
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
      if (!name || seen.has(name.toLowerCase())) continue;
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
