/**
 * Enterprise Data Quality Framework
 * 
 * Provides standardized data quality tracking and distinction for all SEO services.
 * Every data point must be tagged with its source and confidence level.
 * 
 * DATA SOURCE TYPES:
 * - VERIFIED: Direct from authoritative provider API (DataForSEO, SerpAPI, etc.)
 * - ESTIMATED: AI estimation based on patterns and heuristics
 * - AI_INFERRED: AI reasoning from available data
 * - PROVIDER_UNAVAILABLE: Provider failed, data not available
 * - TOPIC_IDEA: Generated from content analysis without metrics
 */

export const DataSource = {
  VERIFIED: 'VERIFIED',
  ESTIMATED: 'ESTIMATED',
  AI_INFERRED: 'AI_INFERRED',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  TOPIC_IDEA: 'TOPIC_IDEA',
  HYBRID: 'HYBRID' // Mix of verified and estimated
};

export const ConfidenceLevel = {
  HIGH: 'HIGH', // 80-100% confidence
  MEDIUM: 'MEDIUM', // 50-79% confidence
  LOW: 'LOW', // 20-49% confidence
  VERY_LOW: 'VERY_LOW', // 0-19% confidence
  UNKNOWN: 'UNKNOWN' // Cannot determine
};

/**
 * Marks a data point with its source and confidence
 */
export function markDataQuality(data, source, confidence = ConfidenceLevel.UNKNOWN, metadata = {}) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  return {
    ...data,
    _dataQuality: {
      source,
      confidence,
      timestamp: new Date().toISOString(),
      ...metadata
    }
  };
}

/**
 * Marks an array of data points with data quality
 */
export function markArrayDataQuality(items, source, confidence = ConfidenceLevel.UNKNOWN, metadata = {}) {
  if (!Array.isArray(items)) return items;
  return items.map(item => markDataQuality(item, source, confidence, metadata));
}

/**
 * Extracts data quality information from a data point
 */
export function getDataQuality(data) {
  if (!data || typeof data !== 'object') {
    return { source: DataSource.UNKNOWN, confidence: ConfidenceLevel.UNKNOWN };
  }
  return data._dataQuality || { source: DataSource.UNKNOWN, confidence: ConfidenceLevel.UNKNOWN };
}

/**
 * Filters data by minimum confidence level
 */
export function filterByConfidence(items, minConfidence = ConfidenceLevel.MEDIUM) {
  const confidenceOrder = {
    [ConfidenceLevel.HIGH]: 4,
    [ConfidenceLevel.MEDIUM]: 3,
    [ConfidenceLevel.LOW]: 2,
    [ConfidenceLevel.VERY_LOW]: 1,
    [ConfidenceLevel.UNKNOWN]: 0
  };

  const minLevel = confidenceOrder[minConfidence] || 0;
  
  if (!Array.isArray(items)) return items;
  return items.filter(item => {
    const quality = getDataQuality(item);
    const level = confidenceOrder[quality.confidence] || 0;
    return level >= minLevel;
  });
}

/**
 * Merges verified data with estimated data, preferring verified
 */
export function mergeWithPreference(verifiedData, estimatedData, keyField = 'keyword') {
  if (!verifiedData && !estimatedData) return [];
  
  const verified = Array.isArray(verifiedData) ? verifiedData : [];
  const estimated = Array.isArray(estimatedData) ? estimatedData : [];
  
  const verifiedMap = new Map(verified.map(item => [item[keyField], item]));
  
  const merged = [...verified];
  
  for (const estItem of estimated) {
    const key = estItem[keyField];
    if (!verifiedMap.has(key)) {
      merged.push({
        ...estItem,
        _dataQuality: {
          ...(estItem._dataQuality || {}),
          source: DataSource.ESTIMATED
        }
      });
    }
  }
  
  return merged;
}

/**
 * Creates a data quality summary for reporting
 */
export function createDataQualitySummary(data) {
  if (!Array.isArray(data)) {
    return {
      total: 0,
      verified: 0,
      estimated: 0,
      aiInferred: 0,
      providerUnavailable: 0,
      topicIdea: 0,
      hybrid: 0,
      unknown: 0
    };
  }

  const summary = {
    total: data.length,
    verified: 0,
    estimated: 0,
    aiInferred: 0,
    providerUnavailable: 0,
    topicIdea: 0,
    hybrid: 0,
    unknown: 0
  };

  data.forEach(item => {
    const quality = getDataQuality(item);
    switch (quality.source) {
      case DataSource.VERIFIED:
        summary.verified++;
        break;
      case DataSource.ESTIMATED:
        summary.estimated++;
        break;
      case DataSource.AI_INFERRED:
        summary.aiInferred++;
        break;
      case DataSource.PROVIDER_UNAVAILABLE:
        summary.providerUnavailable++;
        break;
      case DataSource.TOPIC_IDEA:
        summary.topicIdea++;
        break;
      case DataSource.HYBRID:
        summary.hybrid++;
        break;
      default:
        summary.unknown++;
    }
  });

  return summary;
}

/**
 * Gracefully degrades data when provider fails
 * Returns provider data if available, otherwise returns estimated/AI data with proper marking
 */
export function gracefulDegrade(providerData, fallbackData, providerName) {
  if (providerData && (Array.isArray(providerData) ? providerData.length > 0 : true)) {
    return markDataQuality(
      providerData,
      DataSource.VERIFIED,
      ConfidenceLevel.HIGH,
      { provider: providerName }
    );
  }

  if (fallbackData) {
    return markDataQuality(
      fallbackData,
      DataSource.ESTIMATED,
      ConfidenceLevel.MEDIUM,
      { 
        providerUnavailable: providerName,
        fallbackUsed: true
      }
    );
  }

  return markDataQuality(
    null,
    DataSource.PROVIDER_UNAVAILABLE,
    ConfidenceLevel.UNKNOWN,
    { providerUnavailable: providerName }
  );
}

/**
 * Normalizes keyword data with enterprise-grade data quality
 */
export function normalizeKeywordWithQuality(keyword, source, confidence, metadata = {}) {
  return {
    keyword: keyword.keyword || keyword,
    searchVolume: keyword.searchVolume ?? null,
    keywordDifficulty: keyword.keywordDifficulty ?? null,
    cpc: keyword.cpc ?? null,
    competition: keyword.competition ?? null,
    intent: keyword.intent ?? null,
    opportunityScore: keyword.opportunityScore ?? null,
    _dataQuality: {
      source,
      confidence,
      timestamp: new Date().toISOString(),
      ...metadata
    }
  };
}

/**
 * Normalizes competitor data with enterprise-grade data quality
 */
export function normalizeCompetitorWithQuality(competitor, source, confidence, metadata = {}) {
  return {
    name: competitor.name,
    website: competitor.website,
    domain: competitor.domain,
    description: competitor.description,
    competitorType: competitor.competitorType,
    reason: competitor.reason,
    estimatedAuthority: competitor.estimatedAuthority ?? null,
    _dataQuality: {
      source,
      confidence,
      timestamp: new Date().toISOString(),
      ...metadata
    }
  };
}

/**
 * Normalizes content gap data with enterprise-grade data quality
 */
export function normalizeContentGapWithQuality(gap, source, confidence, metadata = {}) {
  return {
    title: gap.title,
    contentType: gap.contentType,
    priority: gap.priority,
    opportunityScore: gap.opportunityScore ?? null,
    competitorExample: gap.competitorExample,
    reason: gap.reason,
    suggestedAction: gap.suggestedAction,
    estimatedImpact: gap.estimatedImpact,
    _dataQuality: {
      source,
      confidence,
      timestamp: new Date().toISOString(),
      ...metadata
    }
  };
}

/**
 * Calculates an overall quality score for a dataset
 */
export function calculateQualityScore(data) {
  if (!Array.isArray(data) || data.length === 0) return 0;

  const summary = createDataQualitySummary(data);
  const weights = {
    verified: 1.0,
    estimated: 0.6,
    aiInferred: 0.4,
    hybrid: 0.7,
    topicIdea: 0.3,
    providerUnavailable: 0.0,
    unknown: 0.1
  };

  let weightedSum = 0;
  for (const [key, count] of Object.entries(summary)) {
    if (key === 'total') continue;
    weightedSum += count * (weights[key] || 0);
  }

  return Math.round((weightedSum / summary.total) * 100);
}

export default {
  DataSource,
  ConfidenceLevel,
  markDataQuality,
  markArrayDataQuality,
  getDataQuality,
  filterByConfidence,
  mergeWithPreference,
  createDataQualitySummary,
  gracefulDegrade,
  normalizeKeywordWithQuality,
  normalizeCompetitorWithQuality,
  normalizeContentGapWithQuality,
  calculateQualityScore
};
