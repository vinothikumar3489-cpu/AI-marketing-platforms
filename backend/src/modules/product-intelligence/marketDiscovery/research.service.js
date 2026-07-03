import { researchCompetitors, generateFallbackCompetitorInsights } from "../../../services/tavily.service.js";
import { scrapeWebsite, scrapeWebsiteFallback } from "../../../services/scraper.service.js";

const SERPER_API_KEY = process.env.SERPER_API_KEY;

async function searchWithSerper(query) {
  if (!SERPER_API_KEY) return null;
  try {
    const resp = await fetch("https://api.serper.dev/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERPER_API_KEY}` },
      body: JSON.stringify({ q: query, num: 5 }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data;
  } catch (e) {
    return null;
  }
}

export async function runResearch({ productName, industry, region, websiteUrl } = {}) {
  // 1. Tavily
  if (process.env.TAVILY_API_KEY) {
    try {
      const r = await researchCompetitors(productName || "Product", industry || "General", region || industry || "General");
      if (r && r.success) return { success: true, source: "tavily", data: r };
    } catch (e) {
      // continue
    }
  }

  // 2. Serper
  if (SERPER_API_KEY) {
    try {
      const q = `${productName} ${industry} competitors market trends ${region || ""}`.trim();
      const s = await searchWithSerper(q);
      if (s) {
        const competitors = (s.organic || []).slice(0, 8).map((it) => it.title || it.link || it.snippet).filter(Boolean);
        return { success: true, source: "serper", data: { competitors, raw: s } };
      }
    } catch (e) {}
  }

  // 3. Use website scraping if provided (Firecrawl/Jina/Cheerio)
  if (websiteUrl) {
    try {
      const scraped = await scrapeWebsite(websiteUrl);
      if (scraped && scraped.success) {
        const competitors = scraped.scrapedData?.features || [];
        return { success: true, source: scraped.source || "scrape", data: { competitors, scrapedData: scraped.scrapedData } };
      }
    } catch (e) {}
  }

  // 4. Fallback - returns empty when API unavailable
  return generateFallbackCompetitorInsights(productName || "Product", industry || "General", region || industry || "General");
}
