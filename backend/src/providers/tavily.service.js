import { sanitizeText } from "../utils/text.util.js";
import { memoize } from "../utils/research-cache.util.js";

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const TAVILY_API_URL = process.env.TAVILY_API_URL || "https://api.tavily.com/search";
const TAVILY_TIMEOUT_MS = 20000;
const TAVILY_RETRIES = 2;
const TAVILY_RETRY_BASE_MS = 500;
// 30-min TTL: dedupes the ~30 Tavily searches a growth run issues across
// phases (orchestrator, market intelligence, competitor intelligence) while
// still allowing fresh results within a working session.
const TAVILY_CACHE_TTL_MS = 30 * 60 * 1000;

function cleanText(value = "") {
  if (!value || typeof value !== "string") return "";
  return value
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/https?:\/\/[^\s"']+/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function tavilySearch(query, maxResults = 5) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TAVILY_TIMEOUT_MS);
  try {
    const response = await fetch(TAVILY_API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TAVILY_API_KEY}`,
      },
      body: JSON.stringify({ query, max_results: maxResults, include_answer: true }),
    });

    if (!response.ok) {
      throw new Error(`Tavily API responded with HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Bounded retry with exponential backoff for transient failures. */
async function tavilySearchWithRetry(query, maxResults = 5) {
  let lastError = null;
  for (let attempt = 1; attempt <= TAVILY_RETRIES; attempt++) {
    try {
      const data = await tavilySearch(query, maxResults);
      if (data?.error) throw new Error(data.error);
      return data;
    } catch (error) {
      lastError = error;
      if (attempt < TAVILY_RETRIES) {
        await sleep(TAVILY_RETRY_BASE_MS * Math.pow(2, attempt - 1));
      }
    }
  }
  throw lastError;
}

/**
 * LLM-oriented web search used as citation evidence for AI visibility scoring.
 * Returns the raw Tavily payload (results + generated `answer`) so callers can
 * inspect exactly which sources mention the brand. Memoized like the other
 * research queries to dedupe the multi-platform visibility checks.
 */
export async function searchLlmWeb(query, maxResults = 5) {
  if (!TAVILY_API_KEY) {
    return { success: false, error: 'Tavily key not configured', code: 'missing_key' };
  }
  return memoize(
    `tavily:llm-web:${(query || '').toLowerCase().trim()}`,
    TAVILY_CACHE_TTL_MS,
    async () => {
      try {
        const data = await tavilySearchWithRetry(query, maxResults);
        return {
          success: true,
          answer: data.answer || null,
          results: (data.results || []).map(r => ({
            title: r.title || '',
            url: r.url || '',
            domain: r.domain || '',
            score: typeof r.score === 'number' ? r.score : null,
            content: (r.content || '').slice(0, 600),
            source: 'Tavily',
            status: 'measured'
          })),
          query,
          retrievedAt: new Date().toISOString()
        };
      } catch (error) {
        return { success: false, error: error.message, code: 'search_failed' };
      }
    }
  );
}

/**
 * Run a batch of Tavily queries in PARALLEL (allSettled) so one slow/failed
 * query neither serializes the batch nor drops the results of the others.
 */
async function tavilySearchBatch(queries, maxResults) {
  const settled = await Promise.allSettled(queries.map(q => tavilySearchWithRetry(q, maxResults)));
  const results = [];
  const failures = [];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") {
      const data = r.value;
      if (Array.isArray(data.results)) results.push(...data.results);
      if (!data.results?.length) failures.push(queries[i]);
    } else {
      failures.push(queries[i]);
    }
  });
  return { results, failures };
}

export const researchCompetitors = async (productName, industry, category) => {
  if (!TAVILY_API_KEY) {
    return { success: false, error: "Tavily key not configured", code: "missing_key" };
  }

  return memoize(
    `tavily:competitors:${(productName || "").toLowerCase()}|${(industry || "").toLowerCase()}|${(category || "").toLowerCase()}`,
    TAVILY_CACHE_TTL_MS,
    async () => {
      const queries = [
        `${productName} competitors`,
        `${productName} market category`,
        `${industry} market trends`,
        `${productName} pricing competitors`,
        `${industry} buyer pain points`,
        `${industry} SEO keywords`,
        `best products in ${industry}`,
      ];

      const { results: allResults, failures } = await tavilySearchBatch(queries, 5);

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
        failedQueries: failures,
        source: "tavily",
      };
    }
  );
};

export const researchCompany = async (companyName) => {
  if (!TAVILY_API_KEY) {
    return { success: false, error: "Tavily key not configured", code: "missing_key" };
  }
  if (!companyName) {
    return { success: false, error: "Company name required" };
  }

  return memoize(
    `tavily:company:${companyName.toLowerCase()}`,
    TAVILY_CACHE_TTL_MS,
    async () => {
      const queries = [
        `${companyName} company mission`,
        `${companyName} funding raised`,
        `${companyName} founders`,
        `${companyName} number of employees`,
      ];

      const { results: allResults, failures } = await tavilySearchBatch(queries, 4);

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
    failedQueries: failures,
  };
    }
  );
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
