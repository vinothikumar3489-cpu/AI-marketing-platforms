/**
 * Product Features Normalizer
 * PART 3: Normalize product features from multiple sources into canonical structure
 */

/**
 * Normalize product features from various sources
 * Reads and merges: product.features, product.keyFeatures, product.productFeatures, 
 * product.capabilities, productAnalysis.features, productAnalysis.keyFeatures, 
 * productAnalysis.capabilities, websiteEvidence.features, website.features, 
 * benefits, USP evidence, scraped feature sections
 */
export function normalizeProductFeatures(data) {
  if (!data) return [];

  const features = [];

  // Helper to add features from a source
  const addFeatures = (source, sourceName, baseConfidence = 0.7) => {
    if (!source) return;

    const featuresArray = Array.isArray(source) ? source : [source];
    
    featuresArray.forEach((item, index) => {
      if (!item) return;

      // Handle different structures
      const feature = {
        name: item.name || item.feature || item.title || item.description || `Feature ${index + 1}`,
        description: item.description || item.detail || item.text || '',
        source: sourceName,
        confidence: item.confidence || baseConfidence,
        evidenceId: item.evidenceId || item.id || null
      };

      // Only add if it has meaningful content
      if (feature.name && feature.name !== 'Feature ' + (index + 1)) {
        features.push(feature);
      }
    });
  };

  // Priority 1: product.features
  addFeatures(data.product?.features, 'product.features', 0.9);
  addFeatures(data.product?.keyFeatures, 'product.keyFeatures', 0.9);
  addFeatures(data.product?.productFeatures, 'product.productFeatures', 0.9);
  addFeatures(data.product?.capabilities, 'product.capabilities', 0.9);

  // Priority 2: productAnalysis
  addFeatures(data.productAnalysis?.features, 'productAnalysis.features', 0.85);
  addFeatures(data.productAnalysis?.keyFeatures, 'productAnalysis.keyFeatures', 0.85);
  addFeatures(data.productAnalysis?.capabilities, 'productAnalysis.capabilities', 0.85);

  // Priority 3: websiteEvidence
  addFeatures(data.websiteEvidence?.features, 'websiteEvidence.features', 0.8);

  // Priority 4: website
  addFeatures(data.website?.features, 'website.features', 0.75);

  // Priority 5: benefits
  addFeatures(data.benefits, 'benefits', 0.7);

  // Priority 6: USP evidence
  addFeatures(data.uspEvidence, 'uspEvidence', 0.8);

  // Priority 7: scraped feature sections
  addFeatures(data.scrapedFeatures, 'scrapedFeatures', 0.7);

  // Deduplicate semantically
  const deduplicated = deduplicateFeatures(features);

  return deduplicated;
}

/**
 * Deduplicate features semantically
 */
function deduplicateFeatures(features) {
  const seen = new Set();
  const deduplicated = [];

  features.forEach(feature => {
    // Create a normalized key for semantic comparison
    const key = normalizeFeatureKey(feature.name, feature.description);
    
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(feature);
    } else {
      // If duplicate exists, keep the one with higher confidence
      const existingIndex = deduplicated.findIndex(f => 
        normalizeFeatureKey(f.name, f.description) === key
      );
      if (existingIndex !== -1 && feature.confidence > deduplicated[existingIndex].confidence) {
        deduplicated[existingIndex] = feature;
      }
    }
  });

  return deduplicated;
}

/**
 * Normalize feature key for semantic comparison
 */
function normalizeFeatureKey(name, description) {
  const text = `${name} ${description}`.toLowerCase();
  // Remove common stop words and normalize
  return text
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(word => word.length > 2)
    .sort()
    .join(' ');
}

/**
 * Check if features exist (for warning suppression)
 */
export function hasMeaningfulFeatures(data) {
  const features = normalizeProductFeatures(data);
  return features.length > 0;
}
