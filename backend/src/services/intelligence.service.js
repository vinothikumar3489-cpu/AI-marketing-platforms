import { aiOrchestrator } from "../domains/ai/services/aiOrchestrator.service.js";

const PRODUCT_ANALYSIS_SCHEMA = {
  productSummary: "",
  category: "",
  marketSegment: "",
  businessModel: "",
  revenueModel: "",
  marketMaturity: "",
  usp: [],
  features: [],
  benefits: [],
  painPoints: [],
  targetUsers: [],
  buyerPersonas: [],
  directCompetitors: [],
  indirectCompetitors: [],
  emergingCompetitors: [],
  pricingPosition: "",
  seoOpportunities: [],
  marketingAngles: [],
  campaignIdeas: [],
  recommendedChannels: [],
  useCases: [],
  customerSegments: [],
  testimonials: [],
  caseStudies: [],
  technologyStack: [],
  faq: [],
  resources: [],
};

function emptyAnalysis() {
  return JSON.parse(JSON.stringify(PRODUCT_ANALYSIS_SCHEMA));
}

function toCleanString(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  return String(value).trim();
}

function toCleanArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map((v) => (typeof v === "string" ? v.trim() : v));
  if (typeof value === "string" && value.trim()) return value.split(/[;,\n]/).map((s) => s.trim()).filter(Boolean);
  return [];
}

function normalizeAnalysis(raw = {}) {
  const analysis = emptyAnalysis();
  const pick = (key, fallback = "") => {
    const value = raw[key];
    return value == null || (typeof value === "string" && value.trim() === "") ? fallback : value;
  };

  analysis.productSummary = toCleanString(pick("productSummary", raw.summary));
  analysis.category = toCleanString(pick("category", raw.category));
  analysis.marketSegment = toCleanString(pick("marketSegment", raw.marketSegment));
  analysis.businessModel = toCleanString(pick("businessModel", raw.businessModel));
  analysis.revenueModel = toCleanString(pick("revenueModel", raw.revenueModel));
  analysis.marketMaturity = toCleanString(pick("marketMaturity", raw.marketMaturity));
  analysis.usp = toCleanArray(pick("usp", raw.uniqueValueProposition));
  analysis.features = toCleanArray(pick("features", raw.keyFeatures));
  analysis.benefits = toCleanArray(pick("benefits", raw.coreBenefits));
  analysis.painPoints = toCleanArray(pick("painPoints", raw.painPointsSolved));
  analysis.targetUsers = toCleanArray(pick("targetUsers", raw.targetAudience));
  analysis.buyerPersonas = toCleanArray(pick("buyerPersonas"));
  analysis.directCompetitors = toCleanArray(pick("directCompetitors"));
  analysis.indirectCompetitors = toCleanArray(pick("indirectCompetitors"));
  analysis.emergingCompetitors = toCleanArray(pick("emergingCompetitors"));
  analysis.pricingPosition = toCleanString(pick("pricingPosition"));
  analysis.seoOpportunities = toCleanArray(pick("seoOpportunities", raw.seoSuggestions));
  analysis.marketingAngles = toCleanArray(pick("marketingAngles"));
  analysis.campaignIdeas = toCleanArray(pick("campaignIdeas"));
  analysis.recommendedChannels = toCleanArray(pick("recommendedChannels"));
  analysis.useCases = toCleanArray(pick("useCases"));
  analysis.customerSegments = toCleanArray(pick("customerSegments"));
  analysis.testimonials = toCleanArray(pick("testimonials"));
  analysis.caseStudies = toCleanArray(pick("caseStudies"));
  analysis.technologyStack = toCleanArray(pick("technologyStack"));
  analysis.faq = toCleanArray(pick("faq"));
  analysis.resources = toCleanArray(pick("resources"));

  const scrapedFeatures = toCleanArray(
    raw.scrapedData?.features || (raw.scrapedData?.extract && (raw.scrapedData.extract.features || raw.scrapedData.extract.benefits)) || []
  );
  if (analysis.features.length === 0 && scrapedFeatures.length > 0) {
    analysis.features = scrapedFeatures.slice(0, 10);
  }

  return analysis;
}

function buildProductAnalysisPrompt(productData, scrapedData) {
  const product = productData || {};
  const scraped = scrapedData || {};

  const websiteEvidence = [
    scraped.title,
    scraped.metaDescription,
    scraped.heroText,
    scraped.pricingText,
    Array.isArray(scraped.cleanedText) ? scraped.cleanedText.join(" ") : typeof scraped.cleanedText === "string" ? scraped.cleanedText : "",
  ]
    .filter((s) => typeof s === "string" && s.trim())
    .join("\n")
    .slice(0, 3000);

  const features = toCleanArray(scraped.features).slice(0, 10);
  const benefits = toCleanArray(scraped.benefits).slice(0, 10);

  return `You are a senior SaaS product marketing analyst. Analyze the product using ONLY the profile and website evidence below.

PRODUCT PROFILE:
Name: ${toCleanString(product.productName) || "Not provided"}
Company: ${toCleanString(product.companyName) || "Not provided"}
Industry: ${toCleanString(product.industry) || "Not provided"}
Description: ${toCleanString(product.description) || "Not provided"}
Target audience: ${toCleanString(product.targetAudience) || "Not provided"}
Pricing: ${toCleanString(product.pricing) || "Not provided"}
Competitors: ${toCleanString(product.competitors) || "Not provided"}
Business goal: ${toCleanString(product.businessGoal) || "Not provided"}

WEBSITE EVIDENCE (verified by scraping):
${websiteEvidence || "No website evidence available"}
Features extracted: ${features.join(", ") || "None"}
Benefits extracted: ${benefits.join(", ") || "None"}

Return valid JSON only with these EXACT fields:
{
  "productSummary": "2-3 sentence evidence-based summary",
  "category": "product category",
  "marketSegment": "",
  "businessModel": "",
  "revenueModel": "",
  "marketMaturity": "",
  "usp": ["array of strings"],
  "features": ["array of strings"],
  "benefits": ["array of strings"],
  "painPoints": [],
  "targetUsers": [],
  "buyerPersonas": [],
  "directCompetitors": [],
  "indirectCompetitors": [],
  "emergingCompetitors": [],
  "pricingPosition": "",
  "seoOpportunities": [],
  "marketingAngles": [],
  "campaignIdeas": [],
  "recommendedChannels": [],
  "useCases": [],
  "customerSegments": [],
  "testimonials": [],
  "caseStudies": [],
  "technologyStack": [],
  "faq": [],
  "resources": []
}

RULES:
- Derive every value from the product profile or website evidence above.
- When a field cannot be derived from the evidence, return an empty string or empty array.
- NEVER invent product features, prices, competitors, company facts, or statistics that are not present in the evidence.
- Never use placeholder text like "Not provided", "TBD", or generic filler.
- Return valid JSON only — no markdown, no code fences, no explanation.`;
}

export const analyzeProductIntelligence = async (productData, scrapedData) => {
  const warnings = [];
  const providers = {
    usedProvider: "heuristic",
  };

  try {
    const prompt = buildProductAnalysisPrompt(productData, scrapedData);

    const response = await aiOrchestrator.generateCompletion({
      userId: "system",
      chatId: "system",
      prompt,
      systemPrompt:
        "You are an evidence-based product analyst. Return only the exact JSON schema described by the user. Never fabricate facts that are not present in the provided evidence.",
      preferredProvider: "gemini",
      model: "gemini-1.5-flash",
      schema: PRODUCT_ANALYSIS_SCHEMA,
      maxTokens: 2000,
    });

    if (!response.success) {
      warnings.push(response.error || "AI analysis failed");
      providers.error = response.error;
      return { success: true, analysis: emptyAnalysis(), providers, warnings, fallbackUsed: true };
    }

    const raw = response.data && typeof response.data === "object" ? response.data : {};
    providers.usedProvider = response.provider || "heuristic";
    providers.model = response.model || null;

    return {
      success: true,
      analysis: normalizeAnalysis({ ...raw, scrapedData }),
      providers,
      warnings,
      fallbackUsed: false,
    };
  } catch (err) {
    console.error("AI analysis failed:", err);
    warnings.push(err.message);
    providers.error = err.message;
    return { success: true, analysis: emptyAnalysis(), providers, warnings, fallbackUsed: true };
  }
};
