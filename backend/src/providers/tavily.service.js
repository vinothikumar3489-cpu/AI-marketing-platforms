import { sanitizeText } from "../utils/text.util.js";

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const TAVILY_API_URL = process.env.TAVILY_API_URL || "https://api.tavily.com/search";
const TAVILY_TIMEOUT_MS = 20000;

function cleanText(value = "") {
  if (!value || typeof value !== "string") return "";
  return value
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/https?:\/\/[^\s"']+/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function tavilySearch(query, maxResults = 5) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TAVILY_TIMEOUT_MS);
  try {
    const headers = { "Content-Type": "application/json" };
    if (TAVILY_API_KEY) headers["Authorization"] = `Bearer ${TAVILY_API_KEY}`;
    const response = await fetch(TAVILY_API_URL, {
      method: "POST",
      signal: controller.signal,
      headers,
      body: JSON.stringify({ api_key: TAVILY_API_KEY, query, max_results: maxResults, include_answer: true }),
    });

    if (!response.ok) {
      throw new Error(`Tavily API responded with HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
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
      const data = await tavilySearch(query, 5);
      if (data.results) allResults.push(...data.results);
    } catch (error) {
      console.warn(`[Tavily] Search failed for query "${query}":`, error.message);
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

export const researchCompany = async (companyName) => {
  if (!TAVILY_API_KEY) {
    return { success: false, error: "Tavily key not configured", code: "missing_key" };
  }
  if (!companyName) {
    return { success: false, error: "Company name required" };
  }

  const queries = [
    `${companyName} company mission`,
    `${companyName} funding raised`,
    `${companyName} founders`,
    `${companyName} number of employees`,
  ];

  const allResults = [];
  for (const query of queries) {
    try {
      const data = await tavilySearch(query, 4);
      if (data.results) allResults.push(...data.results);
    } catch (error) {
      console.warn(`[Tavily] Company search failed for query "${query}":`, error.message);
    }
  }

  const text = cleanText(allResults.map((r) => `${r.title || ""} ${r.content || ""}`).join(" \n"));

  const missionMatch = text.match(/(?:mission|mission statement|purpose|who we are)[:\s]*["']?([^"'.\n]{20,300})/i);
  const fundingMatches = text.matchAll(/(?:raised|secured|closed)\s+\$?\s*(\d+(?:\.\d+)?)\s*(million|m|billion|b)?\s*(?:in|of)?\s*(?:funding|series\s+[a-z]|seed|round)/gi);
  const foundersMatch = text.match(/(?:founded by|co-founded by|founders?)[:\s]+([A-Z][a-zA-Z.\-]+(?:\s+and\s+[A-Z][a-zA-Z.\-]+)?)/g);
  const employeesMatch = text.match(/(\d+(?:[,.]?\d+)?)\s*(?:\+|~)?\s*(employees?|team members?|staff|people)/gi);

  const funding = [];
  for (const m of fundingMatches) {
    const amount = parseFloat(m[1].replace(/,/g, ""));
    const unit = (m[2] || "").toLowerCase();
    const normalized = unit.startsWith("b") ? amount * 1000 : unit.startsWith("m") ? amount : amount / 1000;
    funding.push({ amount: Math.round(normalized * 100) / 100, unit: "m", raw: m[0].trim() });
  }

  const founders = Array.from(foundersMatch || [])
    .map(f => f.replace(/^(founded by|co-founded by|founders?)[:\s]+/i, "").trim())
    .flatMap(f => f.split(/\s+and\s+/i))
    .map(f => f.trim())
    .filter(Boolean)
    .slice(0, 4);

  const employees = Array.from(employeesMatch || [])
    .map(e => e.match(/(\d+(?:[,.]?\d+)?)/)?.[1]?.replace(/,/g, ""))
    .map(Number)
    .filter(n => n >= 1 && n <= 1000000)
    .sort((a, b) => b - a)[0] || null;

  const facts = [];
  if (missionMatch && missionMatch[1].trim().length > 10) {
    facts.push({ type: 'mission', value: missionMatch[1].trim(), confidence: 70 });
  }
  if (funding.length > 0) {
    facts.push({ type: 'funding', value: funding.map(f => `$${f.amount}m${f.raw.includes('Series') ? ' ' + f.raw.match(/series\s+[a-z]/i)?.[0].toUpperCase() : ''}`.trim()).join(', '), confidence: 65, detail: funding });
  }
  if (founders.length > 0) {
    facts.push({ type: 'founders', value: founders.join(', '), confidence: 60 });
  }
  if (employees) {
    facts.push({ type: 'employees', value: String(employees), confidence: 55 });
  }

  return {
    success: facts.length > 0,
    companyName,
    facts,
    mission: missionMatch ? missionMatch[1].trim() : null,
    funding: funding.length > 0 ? funding : [],
    founders: founders.length > 0 ? founders : [],
    employees,
    source: "tavily",
    queries,
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
