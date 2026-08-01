/**
 * Cascading Competitor Discovery Service
 * Enterprise-grade competitor discovery across 12+ sources with per-source
 * evidence, confidence scoring, deduplication, and AI enrichment.
 *
 * Cascade order (each source only runs if the previous found too few):
 *  1. Website outgoing links        (from scraped HTML)
 *  2. Schema.org JSON-LD            (sameAs / competitor mentions)
 *  3. DataForSEO SERP               (real search engine results)
 *  4. Tavily web search             (AI-search API)
 *  5. DuckDuckGo HTML               (free, no key)
 *  6. GitHub repository search      (GITHUB_TOKEN)
 *  7. Exa search                    (EXA_API_KEY)
 *  8. Product Hunt search           (public scrape)
 *  9. AI reasoning                  (llm knowledge — LOW confidence, marked)
 *
 * Never returns zero competitors unless EVERY source truly fails.
 */

import { load } from "cheerio";
import { callAI } from "../ai/services/aiRouter.service.js";
import { getSerpCompetitors, normalizeSerpCompetitors, getDomainData, isDataForSEOConfigured } from "./dataforseo.service.js";
import { researchCompetitors } from "./tavily.service.js";
import { cleanValue, cleanNumber } from "../utils/clean-value.util.js";
import { memoize } from "../utils/research-cache.util.js";

const DDG_URL = "https://html.duckduckgo.com/html/";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const NOISE_DOMAINS = new Set([
  "google.com", "google.co", "bing.com", "duckduckgo.com", "youtube.com",
  "facebook.com", "twitter.com", "x.com", "instagram.com", "linkedin.com",
  "tiktok.com", "reddit.com", "wikipedia.org", "github.com", "medium.com",
  "g2.com", "capterra.com", "alternative.me", "producthunt.com", "crunchbase.com",
  "trustpilot.com", "similarweb.com", "clutch.co", "quora.com", "stackoverflow.com",
  "npmjs.com", "pinterest.com", "vimeo.com", "yahoo.com", "mail.google.com",
  "apple.com", "microsoft.com", "adobe.com", "cloudflare.com", "wordpress.org",
  "wordpress.com", "hubspot.com", "marketingplatform.google.com",
]);

const SOURCE_WEIGHT = {
  schema_org: 95,
  dataforseo_serp: 90,
  tavily: 70,
  duckduckgo: 65,
  exa: 60,
  github: 55,
  producthunt: 55,
  website_links: 50,
  ai_reasoning: 35,
};

function extractDomain(url) {
  if (!url || typeof url !== "string") return "";
  try {
    const cleaned = url.replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0].toLowerCase();
    return cleaned.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isNoiseDomain(domain) {
  if (!domain) return true;
  const lower = domain.toLowerCase();
  if (NOISE_DOMAINS.has(lower)) return true;
  if (NOISE_DOMAINS.has(lower.replace(/^www\./, ""))) return true;
  // CDNs, asset hosts, mailers, analytics
  if (/(cdn|cloudfront|amazonaws|googleapis|jsdelivr|unpkg|sentry|mixpanel|intercom|zendesk|crisp|hotjar|analytics|segment|hubspot|mailchimp|klaviyo|stripe|paypal|typeform|calendly|notion\.so\/|figma\.com\/|docs\.)/.test(lower)) return true;
  return false;
}

function domainMatchesTarget(domain, targetDomain) {
  if (!domain || !targetDomain) return false;
  return (
    domain === targetDomain ||
    domain.includes(targetDomain) ||
    targetDomain.includes(domain) ||
    domain.endsWith("." + targetDomain) ||
    targetDomain.endsWith("." + domain)
  );
}

function titleToCompanyName(title, domain) {
  if (!title) return domain || "Unknown";
  let name = title
    .replace(/\s*[-|–—:]\s*.+$/, "")
    .replace(/^www\./i, "")
    .replace(/\s*\(.*?\)\s*$/, "")
    .replace(/\.(com|ai|io|net|org|app)\s*$/i, "")
    .trim();
  if (!name || name.length < 2) name = domain || title;
  return name.slice(0, 80);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { "User-Agent": UA, ...(options.headers || {}) },
    });
    return response;
  } catch (error) {
    if (error.name === "AbortError") {
      const err = new Error(`Timeout after ${timeoutMs}ms: ${url}`);
      err.code = "TIMEOUT";
      throw err;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// ============================================
// SOURCE 1: Website outgoing links
// ============================================
export function discoverFromWebsiteLinks(html, websiteUrl, targetDomain, max = 8) {
  if (!html) return [];
  let $;
  try {
    $ = load(html);
  } catch {
    return [];
  }
  const counts = new Map();
  const linkMeta = new Map();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    let url;
    try {
      url = new URL(href, websiteUrl);
    } catch {
      return;
    }
    const domain = url.hostname.replace(/^www\./, "").toLowerCase();
    if (!domain || isNoiseDomain(domain) || domainMatchesTarget(domain, targetDomain)) return;
    const anchor = $(el).text().trim().replace(/\s+/g, " ").slice(0, 120);
    const current = counts.get(domain) || 0;
    counts.set(domain, current + 1);
    if (!linkMeta.has(domain)) {
      linkMeta.set(domain, { url: url.origin, anchor });
    }
  });

  const ranked = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([domain, count]) => ({
      name: titleToCompanyName(linkMeta.get(domain)?.anchor || "", domain),
      domain,
      website: linkMeta.get(domain)?.url || `https://${domain}`,
      snippet: linkMeta.get(domain)?.anchor ? `Linked from target website (${count}×): "${linkMeta.get(domain).anchor}"` : `Linked from target website (${count}×)`,
      source: "website_links",
      evidence: `Found ${count} outgoing link(s) to this domain on the target website`,
      confidence: Math.min(45 + count * 5, 80),
      category: null,
    }));

  return ranked;
}

// ============================================
// SOURCE 2: Schema.org / JSON-LD
// ============================================
export function discoverFromSchemaOrg(html, max = 6) {
  if (!html) return [];
  const candidates = [];
  const seenDomains = new Set();
  const schemaBlocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];

  for (const block of schemaBlocks) {
    const raw = block.replace(/<script[^>]*>/gi, "").replace(/<\/script>/gi, "").trim();
    if (!raw) continue;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    const items = Array.isArray(parsed) ? parsed : [parsed];
    for (const item of items) {
      const graph = Array.isArray(item?.["@graph"]) ? item["@graph"] : [item];
      for (const node of graph) {
        const sameAs = Array.isArray(node?.sameAs) ? node.sameAs : node?.sameAs ? [node.sameAs] : [];
        for (const url of sameAs) {
          const domain = extractDomain(url);
          if (!domain || isNoiseDomain(domain) || seenDomains.has(domain)) continue;
          seenDomains.add(domain);
          candidates.push({
            name: node.name || titleToCompanyName("", domain),
            domain,
            website: url,
            snippet: node.description || `Mentioned in ${node["@type"] || "Schema.org"} markup`,
            source: "schema_org",
            evidence: `Declared in Schema.org ${node["@type"] || "entity"} markup (sameAs relation)`,
            confidence: 85,
            category: null,
          });
        }
        const competitorMentions =
          (node.competitor && (Array.isArray(node.competitor) ? node.competitor : [node.competitor])) || [];
        for (const comp of competitorMentions) {
          const name = typeof comp === "string" ? comp : comp.name;
          const url = typeof comp === "string" ? "" : comp.url || comp.website;
          const domain = url ? extractDomain(url) : null;
          if (domain && (seenDomains.has(domain) || isNoiseDomain(domain))) continue;
          if (domain) seenDomains.add(domain);
          if (name) {
            candidates.push({
              name: titleToCompanyName(name, domain || ""),
              domain: domain || "",
              website: url || "",
              snippet: `Declared competitor in Schema.org markup`,
              source: "schema_org",
              evidence: `Explicit competitor reference in ${node["@type"] || "Schema.org"} markup`,
              confidence: 90,
              category: null,
            });
          }
        }
      }
      if (candidates.length >= max) break;
    }
    if (candidates.length >= max) break;
  }
  return candidates.slice(0, max);
}

// ============================================
// SOURCE 3: DataForSEO SERP
// ============================================
export async function discoverFromSerp(productName, targetDomain, location = "United States", max = 10) {
  try {
    const result = await getSerpCompetitors([productName, `${productName} alternatives`, `${productName} vs`], location, "English");
    if (!result.success || !Array.isArray(result.data) || result.data.length === 0) return [];
    const normalized = normalizeSerpCompetitors(result.data, { websiteUrl: `https://${targetDomain}` });
    return normalized
      .filter((c) => c.domain && !domainMatchesTarget(c.domain, targetDomain) && !isNoiseDomain(c.domain))
      .slice(0, max)
      .map((c) => ({
        name: c.name || titleToCompanyName(c.title, c.domain),
        domain: c.domain,
        website: `https://${c.domain}`,
        snippet: c.snippet || c.title || "",
        source: "dataforseo_serp",
        evidence: c.evidence || `Found in search results for "${productName}"`,
        confidence: c.confidence ?? 70,
        category: c.competitorType || null,
      }));
  } catch (error) {
    console.warn("[Competitor Discovery] DataForSEO SERP failed:", error.message);
    return [];
  }
}

// ============================================
// SOURCE 4: Tavily
// ============================================
export async function discoverFromTavily(productName, industry, targetDomain, max = 8) {
  try {
    const result = await researchCompetitors(productName, industry || "software", "technology");
    if (!result.success) return [];
    const names = (result.competitors || []).slice(0, max);
    const domainHints = (result.marketSignals || []).slice(0, max);
    const candidates = [];

    for (const name of names) {
      if (typeof name !== "string" || name.length < 2 || name.length > 80) continue;
      // The domain is SYNTHESIZED from the company name — it must be flagged so
      // consumers can distinguish measured domains from inferred ones.
      const domain = name.replace(/\s+/g, "").toLowerCase() + ".com";
      if (isNoiseDomain(domain) || domainMatchesTarget(domain, targetDomain)) continue;
      if (candidates.some((c) => c.domain === domain)) continue;
      candidates.push({
        name: titleToCompanyName(name, domain),
        domain,
        website: "",
        snippet: name,
        source: "tavily",
        evidence: `Named as competitor by Tavily search across ${(result.queries || []).length} queries`,
        confidence: 55,
        category: null,
        domainVerified: false,
      });
    }
    return candidates;
  } catch (error) {
    console.warn("[Competitor Discovery] Tavily failed:", error.message);
    return [];
  }
}

// ============================================
// SOURCE 5: DuckDuckGo HTML (free)
// ============================================
export async function discoverFromDuckDuckGo(productName, targetDomain, max = 8) {
  try {
    const queries = [`${productName} competitors`, `${productName} alternatives`];
    const candidates = [];
    const seen = new Set();

    for (const query of queries) {
      if (candidates.length >= max) break;
      let response;
      try {
        response = await fetchWithTimeout(`${DDG_URL}?q=${encodeURIComponent(query)}`, {}, 10000);
      } catch {
        continue;
      }
      if (!response.ok) continue;
      const html = await response.text();
      let $;
      try {
        $ = load(html);
      } catch {
        continue;
      }
      $("a.result__a").each((_, el) => {
        if (candidates.length >= max) return false;
        const href = $(el).attr("href") || "";
        const title = $(el).text().trim();
        const snippet = $(el).parent().find(".result__snippet").text().trim().slice(0, 200);
        let url = href;
        try {
          const parsed = new URL(href);
          if (parsed.hostname.includes("duckduckgo.com")) {
            const uddg = parsed.searchParams.get("uddg");
            if (uddg) url = uddg;
          }
        } catch {
          return;
        }
        const domain = extractDomain(url);
        if (!domain || isNoiseDomain(domain) || domainMatchesTarget(domain, targetDomain) || seen.has(domain)) return;
        seen.add(domain);
        candidates.push({
          name: titleToCompanyName(title, domain),
          domain,
          website: url,
          snippet,
          source: "duckduckgo",
          evidence: `Ranked result for query "${query}" on DuckDuckGo`,
          confidence: 60,
          category: null,
        });
      });
    }
    return candidates;
  } catch (error) {
    console.warn("[Competitor Discovery] DuckDuckGo failed:", error.message);
    return [];
  }
}

// ============================================
// SOURCE 6: GitHub repository search
// ============================================
export async function discoverFromGitHub(productName, targetDomain, max = 5) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return [];
  try {
    const queries = [
      `${productName} alternative`,
      `${productName} competitor`,
      productName,
    ];
    const candidates = [];
    const seen = new Set();

    for (const query of queries) {
      if (candidates.length >= max) break;
      let response;
      try {
        response = await fetchWithTimeout(
          `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=5`,
          { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } },
          10000
        );
      } catch {
        continue;
      }
      if (!response.ok) continue;
      const data = await response.json();
      for (const repo of data.items || []) {
        if (candidates.length >= max) break;
        const homepage = repo.homepage || "";
        const domain = homepage ? extractDomain(homepage) : repo.full_name.toLowerCase().replace(/\//g, "-") + ".github.io";
        if (!domain || isNoiseDomain(domain) || domainMatchesTarget(domain, targetDomain)) continue;
        const key = repo.full_name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        candidates.push({
          name: titleToCompanyName(repo.full_name.replace("/", " - "), domain),
          domain,
          website: homepage || repo.html_url,
          snippet: (repo.description || "").slice(0, 200),
          source: "github",
          evidence: `GitHub repository "${repo.full_name}" (${repo.stargazers_count || 0}★) matches "${query}"`,
          confidence: 50,
          category: null,
          // .github.io domains synthesized from repo names are not verified.
          domainVerified: Boolean(homepage),
        });
      }
    }
    return candidates;
  } catch (error) {
    console.warn("[Competitor Discovery] GitHub failed:", error.message);
    return [];
  }
}

// ============================================
// SOURCE 7: Exa search
// ============================================
export async function discoverFromExa(productName, targetDomain, max = 8) {
  const key = process.env.EXA_API_KEY;
  if (!key) return [];
  try {
    const queries = [`${productName} competitors and alternatives`];
    const candidates = [];
    const seen = new Set();

    for (const query of queries) {
      if (candidates.length >= max) break;
      let response;
      try {
        response = await fetchWithTimeout(
          "https://api.exa.ai/search",
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": key },
            body: JSON.stringify({ query, numResults: 10, useAutoprompt: true, text: false }),
          },
          15000
        );
      } catch {
        continue;
      }
      if (!response.ok) continue;
      const data = await response.json();
      for (const item of data.results || []) {
        if (candidates.length >= max) break;
        const domain = extractDomain(item.url);
        if (!domain || isNoiseDomain(domain) || domainMatchesTarget(domain, targetDomain) || seen.has(domain)) continue;
        seen.add(domain);
        candidates.push({
          name: titleToCompanyName(item.title, domain),
          domain,
          website: item.url,
          snippet: (item.highlights || []).join(" ").slice(0, 200) || item.title || "",
          source: "exa",
          evidence: `Exa semantic search result for "${query}"`,
          confidence: 55,
          category: null,
        });
      }
    }
    return candidates;
  } catch (error) {
    console.warn("[Competitor Discovery] Exa failed:", error.message);
    return [];
  }
}

// ============================================
// SOURCE 8: Product Hunt
// ============================================
export async function discoverFromProductHunt(productName, targetDomain, max = 5) {
  try {
    let response;
    try {
      response = await fetchWithTimeout(
        `https://www.producthunt.com/search?q=${encodeURIComponent(productName)}`,
        { headers: { Accept: "text/html" } },
        10000
      );
    } catch {
      return [];
    }
    if (!response.ok) return [];
    const html = await response.text();
    let $;
    try {
      $ = load(html);
    } catch {
      return [];
    }
    const candidates = [];
    const seen = new Set();
    $("a[href^='/posts/']").each((_, el) => {
      if (candidates.length >= max) return false;
      const name = $(el).attr("aria-label") || $(el).text().trim();
      if (!name || name.length < 2) return;
      // Synthesized from the product name — never claimed as verified.
      const domain = name.replace(/\s+/g, "").toLowerCase() + ".com";
      if (isNoiseDomain(domain) || domainMatchesTarget(domain, targetDomain) || seen.has(domain)) return;
      seen.add(domain);
      candidates.push({
        name: titleToCompanyName(name, domain),
        domain,
        website: "",
        snippet: name,
        source: "producthunt",
        evidence: `Listed on Product Hunt for query "${productName}"`,
        confidence: 50,
        category: null,
        domainVerified: false,
      });
    });
    return candidates;
  } catch (error) {
    console.warn("[Competitor Discovery] Product Hunt failed:", error.message);
    return [];
  }
}

// ============================================
// SOURCE 9: AI reasoning (LAST RESORT)
// ============================================
export async function discoverFromAI(productName, industry, targetDomain, max = 5) {
  try {
    const prompt = `You are a market intelligence engine. Name real, verifiable competitor companies for "${productName}"${industry ? ` in the ${industry} industry` : ""}.

Return ONLY compact JSON:
{"competitors":[{"name":"Real company name","website":"https://real-domain.com","category":"category","snippet":"one-line description of what they offer"}]}

Rules:
- ONLY real companies with real websites. NEVER invent names.
- Exclude: ${targetDomain}, Wikipedia, review sites, directories (G2, Capterra).
- Return 3-8 competitors.
- If you genuinely cannot name real competitors, return {"competitors":[]}.`;

    const result = await callAI(prompt, 2000);
    if (!result.success) return [];
    const data = result.data || {};
    const list = Array.isArray(data.competitors) ? data.competitors : [];
    return list
      .filter((c) => c && c.name && typeof c.name === "string")
      .slice(0, max)
      .map((c) => {
        const domain = extractDomain(c.website || "") || c.name.replace(/\s+/g, "").toLowerCase() + ".com";
        return {
          name: titleToCompanyName(c.name, domain),
          domain,
          website: c.website || `https://${domain}`,
          snippet: c.snippet || c.category || "",
          source: "ai_reasoning",
          evidence: "AI reasoning from trained market knowledge (LOW confidence - verify manually)",
          confidence: 35,
          category: c.category || null,
          // The AI provided a real website → verified; synthesized `.com` → not.
          domainVerified: Boolean(c.website && extractDomain(c.website)),
        };
      });
  } catch (error) {
    console.warn("[Competitor Discovery] AI reasoning failed:", error.message);
    return [];
  }
}

// ============================================
// MERGE + RANK
// ============================================
export function mergeAndRankCompetitors(sourceSets, targetDomain, max = 12) {
  const byDomain = new Map();

  const addCandidate = (candidate) => {
    const domain = (candidate.domain || "").toLowerCase();
    if (!domain) return;
    if (isNoiseDomain(domain) || domainMatchesTarget(domain, targetDomain)) return;
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) return;

    const existing = byDomain.get(domain);
    if (existing) {
      existing.sources.push(candidate.source);
      existing.evidence.push(candidate.evidence);
      existing.snippets.push(candidate.snippet);
      if (candidate.confidence > existing.confidence) existing.confidence = candidate.confidence;
      if (candidate.website && !existing.website) existing.website = candidate.website;
      if (!existing.name || existing.name === existing.domain) existing.name = candidate.name;
      if (candidate.category && !existing.category) existing.category = candidate.category;
      // Any measured source verifying the domain overrides an inferred one.
      if (candidate.domainVerified) existing.domainVerified = true;
    } else {
      byDomain.set(domain, {
        name: candidate.name || domain,
        domain,
        website: candidate.website || `https://${domain}`,
        category: candidate.category || null,
        snippet: candidate.snippet || "",
        sources: [candidate.source],
        evidence: [candidate.evidence].filter(Boolean),
        snippets: [candidate.snippet].filter(Boolean),
        confidence: candidate.confidence || 40,
        domainVerified: candidate.domainVerified === true,
        similarityScore: null,
        marketPosition: null,
        pricing: null,
        strengths: [],
        weaknesses: [],
        trafficEstimate: null,
        seoAuthority: null,
        technologyOverlap: null,
        aiEnriched: false,
      });
    }
  };

  for (const set of sourceSets) {
    for (const candidate of set) {
      addCandidate(candidate);
    }
  }

  const ranked = Array.from(byDomain.values()).map((comp) => {
    const maxSourceWeight = comp.sources.reduce((max, s) => Math.max(max, SOURCE_WEIGHT[s] || 40), 0);
    const sourceCount = comp.sources.length;
    const confidence = Math.min(98, Math.round((comp.confidence || 40) * 0.6 + maxSourceWeight * 0.4 + Math.min(sourceCount * 8, 20)));
    return { ...comp, confidence };
  });

  return ranked
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, max);
}

// ============================================
// AI ENRICHMENT (strengths/weaknesses/position/pricing estimates)
// ============================================
export async function enrichCompetitorsWithAI(competitors, productName, industry) {
  if (!Array.isArray(competitors) || competitors.length === 0) return competitors;

  const batchSize = 6;
  const enriched = [];

  for (let i = 0; i < competitors.length; i += batchSize) {
    const batch = competitors.slice(i, i + batchSize);
    const list = batch
      .map(
        (c, idx) =>
          `${idx + 1}. "${c.name}" (${c.domain}) - ${(c.snippet || "").slice(0, 120)}`
      )
      .join("\n");

    const prompt = `You are a competitive intelligence analyst. For each competitor below, provide insights for ${productName || "the target product"}${industry ? ` in ${industry}` : ""}.

Competitors:
${list}

Return ONLY compact JSON:
{"competitors":[{"domain":"exact domain from list","category":"product category","marketPosition":"market leader / challenger / niche player / follower","pricing":"observed pricing model e.g. Freemium from $0, Pro $49/mo (if known, else null)","strengths":["2-3 brief strengths"],"weaknesses":["2-3 brief weaknesses"],"technologyOverlap":"high / medium / low","trafficEstimate":"low / medium / high"}]}

Rules:
- Match domains EXACTLY as given.
- Only include competitors you are genuinely confident about. Skip unknown ones.
- Keep every string under 120 characters.`;

    try {
      const result = await callAI(prompt, 3000);
      if (result.success && Array.isArray(result.data?.competitors)) {
        const lookup = new Map(
          (result.data.competitors || []).map((c) => [(c.domain || "").toLowerCase().trim(), c])
        );
        batch.forEach((comp) => {
          const ai = lookup.get(comp.domain.toLowerCase());
          if (ai) {
            comp.aiEnriched = true;
            comp.category = cleanValue(ai.category, {}) ? ai.category : comp.category;
            comp.marketPosition = ai.marketPosition ? String(ai.marketPosition) : null;
            comp.pricing = ai.pricing ? String(ai.pricing) : null;
            comp.strengths = Array.isArray(ai.strengths) ? ai.strengths.map((s) => String(s)).slice(0, 3) : [];
            comp.weaknesses = Array.isArray(ai.weaknesses) ? ai.weaknesses.map((s) => String(s)).slice(0, 3) : [];
            comp.technologyOverlap = ai.technologyOverlap ? String(ai.technologyOverlap) : null;
            comp.trafficEstimate = ai.trafficEstimate ? String(ai.trafficEstimate) : null;
            comp.aiEnrichmentSource = result.provider || "ai";
          }
        });
      }
    } catch (error) {
      console.warn("[Competitor Discovery] AI enrichment failed for batch:", error.message);
    }
    enriched.push(...batch);
  }

  return enriched;
}

// ============================================
// DOMAIN DATA ENRICHMENT (traffic + authority from DataForSEO)
// ============================================
export async function enrichCompetitorsWithDomainData(competitors) {
  if (!isDataForSEOConfigured() || !Array.isArray(competitors) || competitors.length === 0) return competitors;
  const top = competitors.slice(0, 5);

  const results = await Promise.allSettled(
    top.map((comp) =>
      getDomainData(comp.domain).then((res) => ({ domain: comp.domain, res })).catch(() => ({ domain: comp.domain, res: { success: false } }))
    )
  );

  const byDomain = new Map();
  results.forEach((settled) => {
    if (settled.status === "fulfilled" && settled.value.res.success) {
      byDomain.set(settled.value.domain, settled.value.res.data);
    }
  });

  return competitors.map((comp) => {
    const data = byDomain.get(comp.domain);
    if (!data) return comp;
    if (data.backlinks?.totalBacklinks != null) comp.seoAuthority = data.backlinks.totalBacklinks;
    if (data.backlinks?.referringDomains != null) comp.referringDomains = data.backlinks.referringDomains;
    if (data.analytics?.organicTraffic != null) comp.organicTraffic = data.analytics.organicTraffic;
    if (data.analytics?.domainRank != null) comp.domainRank = data.analytics.domainRank;
    comp.domainDataVerified = true;
    comp.confidence = Math.min(99, (comp.confidence || 0) + 10);
    return comp;
  });
}

// ============================================
// PRICING LOOKUP (per-competitor quick web search)
// ============================================
export async function enrichCompetitorsWithPricing(competitors) {
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!tavilyKey) return competitors;
  const top = competitors.slice(0, 5);

  const results = await Promise.allSettled(
    top.map(async (comp) => {
      let response;
      try {
        response = await fetchWithTimeout(
          "https://api.tavily.com/search",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ api_key: tavilyKey, query: `${comp.name} pricing plans cost`, max_results: 3 }),
          },
          12000
        );
      } catch {
        return { domain: comp.domain, pricing: null };
      }
      if (!response.ok) return { domain: comp.domain, pricing: null };
      const data = await response.json();
      const text = (data.results || [])
        .map((r) => `${r.title || ""} ${r.content || ""}`)
        .join(" ")
        .slice(0, 1500);
      const priceMatches = text.match(/(free|freemium|from\s*\$[\d,.]+|\$[\d,.]+(\s*\/\s*(mo|month|year|user))?)/gi) || [];
      const uniquePrices = [...new Set(priceMatches)].slice(0, 5);
      return { domain: comp.domain, pricing: uniquePrices.length ? uniquePrices.join("; ") : null };
    })
  );

  const pricingByDomain = new Map();
  results.forEach((settled) => {
    if (settled.status === "fulfilled" && settled.value.pricing) {
      pricingByDomain.set(settled.value.domain, settled.value.pricing);
    }
  });

  return competitors.map((comp) => {
    if (pricingByDomain.has(comp.domain)) {
      comp.pricing = pricingByDomain.get(comp.domain);
      comp.pricingSource = "tavily_web_search";
    }
    return comp;
  });
}

// ============================================
// MAIN ENTRY
// ============================================
const COMPETITOR_CACHE_TTL_MS = 60 * 60 * 1000;

export async function discoverCompetitors({
  websiteUrl,
  productName,
  industry,
  companyName,
  targetDomain,
  location = "United States",
  html = null,
  max = 12,
  enrich = true,
  verbose = false,
}) {
  const startTime = Date.now();
  const log = (msg) => {
    if (verbose) console.log(`[Competitor Discovery] ${msg}`);
  };

  const sourcesUsed = [];
  const sourceFailures = [];
  const target = (targetDomain || extractDomain(websiteUrl) || "").replace(/^www\./, "").toLowerCase();

  log(`Starting discovery for "${productName}" @ ${target}`);

  // Memoized per (target, product, location, max, enrich) so the orchestrator,
  // business intelligence and SEO phases of one run never re-issue the ~12
  // source calls for the same competitor set. A cloned result is returned so
  // callers cannot mutate the shared cache entry.
  const cacheKey = `competitors:${target}|${(productName || "").toLowerCase()}|${location}|m:${max}|e:${enrich}`;

  const result = await memoize(cacheKey, COMPETITOR_CACHE_TTL_MS, async () => {
    const schemaCandidates = html ? discoverFromSchemaOrg(html, 6) : [];
    if (schemaCandidates.length) sourcesUsed.push("schema_org");
    else sourceFailures.push("schema_org");

    let candidates = [...schemaCandidates];
    if (candidates.length < 4) {
      const serp = await discoverFromSerp(productName, target, location, 10);
      if (serp.length) {
        sourcesUsed.push("dataforseo_serp");
        candidates.push(...serp);
      } else {
        sourceFailures.push("dataforseo_serp");
      }
    } else {
      log("Skipped SERP - schema.org provided enough candidates");
    }

    if (candidates.length < 4) {
      const links = html ? discoverFromWebsiteLinks(html, websiteUrl, target, 8) : [];
      if (links.length) {
        sourcesUsed.push("website_links");
        candidates.push(...links);
      } else {
        sourceFailures.push("website_links");
      }
    }

    // Web sources run in TWO waves: the highest-value free/keyed sources
    // (Tavily + DuckDuckGo) go first in parallel; the remaining three only fire
    // if the first wave still left the pool under the gate — so a rich first
    // wave never over-fetches, and a poor one still gets full coverage at only
    // two parallel round-trips of latency.
    const wave1 = await Promise.allSettled([
      candidates.length < 4 ? discoverFromTavily(productName, industry, target, 8) : Promise.resolve([]),
      candidates.length < 4 ? discoverFromDuckDuckGo(productName, target, 8) : Promise.resolve([]),
    ]);

    const wave1Results = wave1.map((r) => (r.status === "fulfilled" ? r.value : []));
    if (wave1Results.some((list) => list.length)) sourcesUsed.push("web_search_multi");
    candidates.push(...wave1Results.flat());

    let wave2 = [];
    if (candidates.length < 4) {
      const settled = await Promise.allSettled([
        discoverFromExa(productName, target, 8),
        discoverFromGitHub(productName, target, 5),
        discoverFromProductHunt(productName, target, 5),
      ]);
      wave2 = settled.map((r) => (r.status === "fulfilled" ? r.value : []));
      if (wave2.some((list) => list.length)) sourcesUsed.push("web_search_multi");
      candidates.push(...wave2.flat());
    }

    let merged = mergeAndRankCompetitors([candidates], target, max);

    if (merged.length === 0) {
      log("No competitors from any structured source - falling back to AI reasoning");
      const ai = await discoverFromAI(productName, industry, target, 5);
      sourcesUsed.push("ai_reasoning");
      candidates.push(...ai);
    }

    let final = merged;
    if (final.length < 3) {
      const ai = await discoverFromAI(productName, industry, target, 5);
      if (ai.length) sourcesUsed.push("ai_reasoning");
      final = mergeAndRankCompetitors([candidates, ai], target, max);
    }

    if (enrich && final.length > 0) {
      log(`Enriching ${final.length} competitors with AI + domain data`);
      final = await enrichCompetitorsWithAI(final, productName, industry);
      final = await enrichCompetitorsWithPricing(final);
      final = await enrichCompetitorsWithDomainData(final);
    }

    const missingFields = {
      pricing: final.filter((c) => !c.pricing).length,
      strengths: final.filter((c) => !c.strengths?.length).length,
      traffic: final.filter((c) => !c.trafficEstimate && !c.organicTraffic).length,
    };

    log(`Done in ${Date.now() - startTime}ms: ${final.length} competitors (${sourcesUsed.join(", ") || "none"})`);

    return {
      success: true,
      competitors: final,
      totalFound: final.length,
      sourcesUsed: [...new Set(sourcesUsed)],
      sourceFailures: [...new Set(sourceFailures)],
      missingFields,
      durationMs: Date.now() - startTime,
    };
  });

  // Return a deep clone so no caller can mutate the shared cache entry.
  return result ? structuredClone(result) : result;
}

export function extractDomainFromUrl(url) {
  return extractDomain(url);
}

export function cleanCompetitorNumber(value) {
  return cleanNumber(value);
}
