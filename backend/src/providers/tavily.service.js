import { sanitizeText } from "../utils/text.util.js";

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const TAVILY_API_URL = process.env.TAVILY_API_URL || "https://api.tavily.com/search";

function cleanText(value = "") {
  if (!value || typeof value !== "string") return "";
  return value
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/https?:\/\/[^\s"']+/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const researchCompetitors = async (productName, industry, category) => {
  if (!TAVILY_API_KEY) {
    return { success: false, error: "Tavily key not configured", code: "missing_key" };
  }

  const queries = [
    `${productName} competitors`,
    `${productName} market category`,
    `${industry} market trends`,
    `${productName} pricing competitors`,
    `${industry} buyer pain points`,
    `${industry} SEO keywords`,
    `best products in ${industry}`,
  ];

  const allResults = [];

  for (const query of queries) {
    try {
      const response = await fetch(TAVILY_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: TAVILY_API_KEY, query, max_results: 5, include_answer: true }),
      });

      if (!response.ok) continue;
      const data = await response.json();
      if (data.results) allResults.push(...data.results);
    } catch {
      continue;
    }
  }

  const competitors = extractCompetitorsFromResults(allResults);
  const marketSignals = extractMarketSignals(allResults);
  const seoOpportunities = extractSeoOpportunities(allResults);
  const buyerIntent = extractBuyerIntent(allResults);

  return {
    success: true,
    competitors,
    marketSignals,
    seoOpportunities,
    buyerIntent,
    queries,
    source: "tavily",
  };
};

const extractCompetitorsFromResults = (results) => {
  const competitors = new Set();
  const textBlocks = results.map((result) => cleanText(`${result.title || ""} ${result.content || ""}`)).join(" \n");
  const patterns = [/(?:competitors|alternatives|similar to|vs\.?|versus)[:\s]+([^\n]+)/gi, /(?:best|top)\s+([^\n]+)/gi];

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(textBlocks))) {
      const items = (match[1] || "").split(/[,;\/]| and /).map((item) => cleanText(item).trim()).filter(Boolean);
      items.forEach((item) => { if (item.length > 2 && item.length < 60) competitors.add(item); });
    }
  });

  return Array.from(competitors).slice(0, 12);
};

const extractMarketSignals = (results) => {
  const signals = new Set();
  results.forEach((result) => {
    const text = cleanText(`${result.title || ""} ${result.content || ""}`);
    if (/growth|emerging|expanding|demand|opportunity/i.test(text)) signals.add("Positive market growth");
    if (/competitive|alternative|comparison|market share|vs\.?/i.test(text)) signals.add("Competitive market environment");
    if (/automation|AI|machine learning|intelligence/i.test(text)) signals.add("AI-driven opportunity");
    if (/risk|challenge|barrier|regulation/i.test(text)) signals.add("Market risk or challenge");
  });
  return Array.from(signals).slice(0, 6);
};

const extractSeoOpportunities = (results) => {
  const opportunities = new Set();
  results.forEach((result) => {
    const text = cleanText(`${result.title || ""} ${result.content || ""}`);
    if (/keyword|search intent|SEO|organic/i.test(text)) {
      const phraseMatch = text.match(/(?:keyword|search intent|SEO|organic)[:\s]*(.*?)(?:\.|,|\n|$)/i);
      if (phraseMatch) opportunities.add(sanitizeText(phraseMatch[1]));
    }
  });
  return Array.from(opportunities).filter(Boolean).slice(0, 5);
};

const extractBuyerIntent = (results) => {
  const intents = new Set();
  results.forEach((result) => {
    const text = cleanText(`${result.title || ""} ${result.content || ""}`);
    if (/buy|purchase|evaluate|compare|demo|pricing/i.test(text)) {
      intents.add("High buying intent signals detected");
    }
    if (/trial|demo|evaluate|pricing/i.test(text)) {
      intents.add("Users seek product evaluation and pricing details");
    }
  });
  return Array.from(intents).slice(0, 5);
};

export const generateFallbackCompetitorInsights = (productName, industry, category) => {
  // No hardcoded fallback competitors - return empty when API unavailable
  return {
    success: false,
    competitors: [],
    marketSignals: ["Competitor data unavailable - SERP API required"],
    seoOpportunities: ["Real competitor data unavailable. Connect SERP API."],
    buyerIntent: ["Competitor analysis unavailable. No verified source found."],
    queries: [],
    source: "fallback",
    fallback: true,
  };
};
