import { generateAnalysis } from "./analysis.service.js";

function uniq(a) { return Array.from(new Set((a||[]).filter(Boolean))); }
function truncateString(text = "", maxLength = 300) { return typeof text === "string" && text.length > maxLength ? text.slice(0, maxLength).trim() + "..." : (text || ""); }
function ensureArray(value) { return Array.isArray(value) ? value.filter(Boolean) : value ? [value] : []; }

function featureToMarketing(feature) {
  return feature || "";
}

function inferBuyerPersonas(manualData = {}, scrapedData = {}) {
  return [];
}

function inferMarketMaturity(manualData = {}, scrapedData = {}) {
  return '';
}

function ensurePainPoints(painPoints = [], manualData = {}, scrapedData = {}) {
  return ensureArray(painPoints).filter(Boolean);
}

function normalizeText(text = "") {
  return typeof text === "string" ? text.replace(/\s+/g, " ").trim() : "";
}

function extractBuyerPersonas(manualData = {}, scrapedData = {}) {
  const aiPersonas = ensureArray(scrapedData?.buyerPersonas || []);
  if (aiPersonas.length > 0) return aiPersonas;
  return inferBuyerPersonas(manualData, scrapedData);
}

function extractUSP(manualData = {}, scrapedData = {}) {
  return '';
}

function extractSummary(manualData = {}, scrapedData = {}) {
  const headline = manualData.productName || scrapedData?.title || '';
  return headline ? `Analysis for ${headline}` : '';
}

function extractPainPoints(manualData = {}, scrapedData = {}) {
  const painPoints = [];

  if (manualData.businessGoal) {
    painPoints.push(manualData.businessGoal);
  }

  return uniq(painPoints).slice(0, 6);
}

function deduplicateUsers(users) {
  const seen = new Set();
  return users.filter(user => {
    const key = (user || '').toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractTargetUsers(manualData = {}, scrapedData = {}) {
  if (manualData.targetAudience) {
    return manualData.targetAudience.split(/,|;|\s+and\s+/).map(s => s.trim()).filter(Boolean).slice(0, 5);
  }
  return [];
}

function extractCompetitors(manualData = {}, scrapedData = {}) {
  if (manualData.competitors) {
    return manualData.competitors.split(/,|;|\s+and\s+/).map(s => s.trim()).filter(Boolean).slice(0, 5);
  }
  return [];
}

function extractPricingPosition(manualData = {}, scrapedData = {}) {
  if (manualData.pricing && manualData.pricing.length > 3) {
    return manualData.pricing;
  }
  if (scrapedData?.pricingText) {
    return scrapedData.pricingText;
  }
  return '';
}

function extractMarketingAngles(manualData = {}, scrapedData = {}) {
  return [];
}

function extractRecommendedModules(manualData = {}, scrapedData = {}) {
  return [];
}

function calculateConfidenceScore(manualData = {}, scrapedData = {}) {
  let score = 0;

  if (manualData.productName) score += 8;
  if (manualData.description && manualData.description.length > 40) score += 10;
  if (manualData.industry) score += 6;
  if (manualData.targetAudience) score += 6;
  if (manualData.competitors) score += 4;
  if (manualData.pricing) score += 4;

  if (scrapedData?.title) score += 6;
  if (scrapedData?.metaDescription) score += 5;
  if (scrapedData?.heroText) score += 6;

  const featureCount = scrapedData?.scrapeQuality?.featuresCount || 0;
  if (featureCount >= 3) score += 10;
  else if (featureCount === 2) score += 6;
  else if (featureCount === 1) score += 3;

  const benefitCount = scrapedData?.scrapeQuality?.benefitsCount || 0;
  if (benefitCount >= 2) score += 8;
  else if (benefitCount === 1) score += 4;

  if (scrapedData?.pricingText && scrapedData.pricingText.length > 10) score += 5;
  if ((scrapedData?.ctaText || []).length > 0) score += 4;

  return Math.min(Math.max(score, 0), 100);
}

export async function generateProductAnalysis(manualData = {}, scrapedData = {}) {
  let aiResponse = null;
  let aiUsed = false;
  let analysisResult = null;

  try {
    if (process.env.OPENAI_API_KEY && (scrapedData?.cleanedText || manualData.description)) {
      const ai = await generateAnalysis({ manualData, scrapedData });
      analysisResult = ai.structured || null;
      // merge provider status and warnings into scrapedData for later persistence
      if (ai.providerStatus) {
        scrapedData = scrapedData || {};
        scrapedData.providerStatus = ai.providerStatus;
      }
      if (ai.warnings && ai.warnings.length > 0) {
        scrapedData = scrapedData || {};
        scrapedData.aiWarnings = ai.warnings;
      }
      aiUsed = Boolean(analysisResult);
    }
  } catch (error) {
    console.warn("AI analysis failed, falling back to heuristic analysis:", error.message);
  }

  const features = ensureArray(analysisResult?.features || scrapedData?.features || []);
  const benefits = ensureArray(analysisResult?.benefits || scrapedData?.benefits || []);
  const painPoints = ensurePainPoints(ensureArray(analysisResult?.painPoints || []), manualData, scrapedData);
  const buyerPersonas = extractBuyerPersonas(manualData, scrapedData).concat(ensureArray(analysisResult?.buyerPersonas || [])).slice(0, 5);
  const targetUsers = ensureArray(analysisResult?.targetUsers || extractTargetUsers(manualData, scrapedData));
  const competitorTypes = ensureArray(analysisResult?.competitorTypes || extractCompetitors(manualData, scrapedData));
  const marketingAngles = ensureArray(analysisResult?.marketingAngles || extractMarketingAngles(manualData, scrapedData)).slice(0, 6);
  const pricingPosition = analysisResult?.pricingPosition || extractPricingPosition(manualData, scrapedData);
  const marketMaturity = analysisResult?.marketMaturity || inferMarketMaturity(manualData, scrapedData);
  const category = analysisResult?.category || manualData.industry || '';
  const usp = ensureArray(analysisResult?.usp || [extractUSP(manualData, scrapedData)]);
  const productSummary = analysisResult?.productSummary || extractSummary(manualData, scrapedData);

  let confidenceScore = analysisResult?.confidenceScore ?? calculateConfidenceScore(manualData, scrapedData);
  if ((!benefits || benefits.length === 0) || (!painPoints || painPoints.length === 0)) {
    confidenceScore = Math.min(confidenceScore, 94);
  }
  confidenceScore = Math.min(confidenceScore, 100);

  const dataSourcesUsed = [];
  if (manualData.websiteUrl) dataSourcesUsed.push("website scrape");
  if (manualData.description) dataSourcesUsed.push("manual description");
  if (manualData.targetAudience) dataSourcesUsed.push("manual audience");
  if (manualData.competitors) dataSourcesUsed.push("manual competitors");
  if (scrapedData?.scrapeQuality) dataSourcesUsed.push(`scraper: ${scrapedData.scrapeQuality.source || scrapedData.source || "unknown"}`);
  if (aiUsed) dataSourcesUsed.push("AI business intelligence");
  if (scrapedData?.providerStatus) dataSourcesUsed.push(`providers: ${Object.entries(scrapedData.providerStatus).map(([k,v])=>`${k}=${v}`).join(",")}`);

  const warnings = ensureArray(analysisResult?.warnings || []).concat(ensureArray(scrapedData?.aiWarnings || [])).slice(0,6);
  if (!manualData.description && (!scrapedData?.features || scrapedData.features.length === 0)) {
    warnings.push("Limited product detail available; insights are inferred from available website copy.");
  }
  if (scrapedData?.scrapeQuality?.source === "cheerio" && scrapedData?.scrapeQuality?.noisyLinesRemoved > 5) {
    warnings.push("Scraped website content contained navigational/noise text and was filtered for clarity.");
  }
  if (aiUsed && (!analysisResult || !analysisResult.productSummary)) {
    warnings.push("AI returned partial results; some fields may be inferred from fallback heuristics.");
  }

  return {
    productSummary: productSummary || "",
    category,
    usp,
    features,
    benefits,
    painPoints,
    buyerPersonas,
    targetUsers,
    competitorTypes,
    competitors: ensureArray(analysisResult?.competitors || []),
    marketingAngles,
    pricingPosition,
    marketMaturity,
    confidenceScore,
    dataSourcesUsed: uniq(dataSourcesUsed),
    warnings,
    scrapeQuality: scrapedData?.scrapeQuality || null,
    source: aiUsed ? "ai-biz-intelligence" : "analysis-engine",
  };
}
