// Growth Workspace Utility Functions
// Helpers for rendering and normalizing data

export const asArray = (value: any): string[] => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.includes(",")) {
    return value.split(",").map(v => v.trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
};

export const asText = (value: any, fallback: string = "Not available"): string => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value) && value.length > 0) return value[0];
  return fallback;
};

export const asNumber = (value: any, fallback: number = 60): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const hasData = (value: any): boolean => {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return true;
  if (typeof value === "object" && value !== null) {
    return Object.keys(value).length > 0;
  }
  return false;
};

export const normalizeResults = (results: any): any => {
  if (!results) return {};
  
  return {
    product: results.product || results.productAnalysis || {},
    market: results.market || results.marketDiscovery || {},
    audience: results.audience || results.audienceIntelligence || {},
    competitor: results.competitor || results.competitorAnalysis || {},
    intent: results.intent || results.intentPrediction || {},
    positioning: results.positioning || results.positioningEngine || {},
    campaign: results.campaign || results.campaignGenerator || {},
    channel: results.channel || results.channelRecommendation || {}
  };
};
