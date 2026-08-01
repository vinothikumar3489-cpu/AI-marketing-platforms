/**
 * AI VISIBILITY SERVICE — evidence-backed per-platform visibility for
 * ChatGPT, Gemini, Claude, Perplexity and Google AI Overview.
 *
 * Evidence model (no fabricated numbers):
 *  - LLM platforms (ChatGPT/Gemini/Claude/Perplexity): proxied through an
 *    LLM-oriented web search (Tavily `include_answer`). A platform is scored
 *    from REAL citations: does the generated LLM answer mention the brand,
 *    how many distinct sources mention it, what is their relevance, and is
 *    entity naming consistent. The method is always labeled
 *    `llm_search_proxy` — we never claim a direct query against the platform.
 *  - Google AI Overview: REAL Google SERP checks per target keyword
 *    (DataForSEO or SerpAPI). Evidence = an `ai_overview` result exists and
 *    the brand domain is cited INSIDE the AI Overview text.
 *  - When no provider is available every platform degrades to an
 *    `estimated` on-page heuristic that is explicitly labeled as such.
 */

import { isDataForSEOConfigured, getSerpAnalysis } from "../../providers/dataforseo.service.js";
import { isSerpAPIConfigured, googleSearch } from "../serpapi.service.js";
import { searchLlmWeb } from "../../providers/tavily.service.js";

const LLM_PLATFORMS = [
  { key: 'chatgpt', label: 'ChatGPT' },
  { key: 'gemini', label: 'Gemini' },
  { key: 'claude', label: 'Claude' },
  { key: 'perplexity', label: 'Perplexity' }
];

const PLATFORM_NOTE = 'Derived from LLM-oriented web search citations — not a direct query against the platform';

function extractDomain(url) {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function normalizeBrandTokens(productName, companyName, domain) {
  const tokens = [];
  const add = (t) => {
    if (t && typeof t === 'string') {
      const clean = t.trim();
      if (clean.length >= 2 && !/^(unknown|null|undefined|n\/a|not available)$/i.test(clean)) {
        tokens.push(clean);
      }
    }
  };
  add(productName);
  add(companyName);
  if (domain) add(extractDomain(domain));
  return [...new Set(tokens)];
}

function mentionsBrand(text, tokens) {
  if (!text || tokens.length === 0) return false;
  const lower = text.toLowerCase();
  for (const token of tokens) {
    const clean = token.toLowerCase().replace(/^www\./, '');
    if (clean.includes('.')) {
      const root = clean.split('.')[0];
      if (root.length >= 3 && new RegExp(`\\b${escapeRegExp(root)}\\b`).test(lower)) return true;
    } else if (clean.length >= 3) {
      if (new RegExp(`\\b${escapeRegExp(clean)}\\b`).test(lower)) return true;
    }
  }
  return false;
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Pure scoring for LLM-proxy evidence.
 * @param {Object} data { brandMentions, queryCount, answerMention, citingSourceCount, topRelevance, entityConsistency }
 * @returns {{ score: number, components: Object }}
 */
export function scoreLlmVisibilityEvidence(data) {
  const queryCount = Math.max(data.queryCount || 0, 1);
  const presenceRatio = Math.min((data.brandMentions || 0) / queryCount, 1);

  const answerComponent = (data.answerMention ? 1 : 0) * 30;
  const presenceComponent = presenceRatio * 30;
  const citationComponent = Math.min((data.citingSourceCount || 0) / 4, 1) * 20 +
    Math.min((data.topRelevance || 0) / 1, 1) * 5;
  const consistencyComponent = Math.min(data.entityConsistency || 0, 1) * 15;

  const score = Math.round(answerComponent + presenceComponent + citationComponent + consistencyComponent);
  return {
    score: Math.max(0, Math.min(100, score)),
    components: {
      answerMention: data.answerMention || false,
      presenceRatio: Math.round(presenceRatio * 100) / 100,
      citingSourceCount: data.citingSourceCount || 0,
      topRelevance: data.topRelevance ?? null,
      entityConsistency: Math.round((data.entityConsistency || 0) * 100) / 100
    }
  };
}

/**
 * Pure scoring for Google AI Overview SERP evidence.
 * @param {Object} data { keywordsChecked, aiOverviewCount, brandCitedInOverviewCount, featuredSnippetCount, brandRankedCount }
 */
export function scoreAiOverviewEvidence(data) {
  const checked = Math.max(data.keywordsChecked || 0, 1);
  const overviewRatio = Math.min((data.aiOverviewCount || 0) / checked, 1);
  const citedRatio = Math.min((data.brandCitedInOverviewCount || 0) / checked, 1);
  const featuredRatio = Math.min((data.featuredSnippetCount || 0) / checked, 1);
  const rankedRatio = Math.min((data.brandRankedCount || 0) / checked, 1);

  const score = Math.round(
    (citedRatio * 55) +
    (overviewRatio * 20) +
    (featuredRatio * 10) +
    (rankedRatio * 15)
  );

  return {
    score: Math.max(0, Math.min(100, score)),
    components: {
      keywordsChecked: data.keywordsChecked || 0,
      aiOverviewRatio: Math.round(overviewRatio * 100) / 100,
      brandCitedRatio: Math.round(citedRatio * 100) / 100,
      featuredSnippetRatio: Math.round(featuredRatio * 100) / 100,
      brandRankedRatio: Math.round(rankedRatio * 100) / 100
    }
  };
}

/**
 * Deterministic on-page estimate used ONLY when no evidence provider is
 * available. Explicitly labeled `estimated` — never presented as measured.
 */
export function estimateVisibilityFromOnPage(websiteData, productName) {
  const text = websiteData?.text || '';
  const lower = text.toLowerCase();
  let score = 10;

  if (productName && lower.includes(productName.toLowerCase())) score += 20;
  const structured = websiteData?.structured || websiteData?.schema || {};
  const schemaTypes = Array.isArray(structured?.types)
    ? structured.types
    : (structured?.items?.length ? structured.items.map(i => i['@type'] || i.type) : []);
  if (schemaTypes.length > 0) score += 15;
  if (/^what is /i.test(text) || /^what is /i.test(websiteData?.title || '')) score += 10;
  if (/(\d+\+?\s*(users|customers|companies|years))/i.test(text)) score += 10;
  if (/(definition|refers to|is defined as)/i.test(text)) score += 10;
  if ((websiteData?.content?.headings || []).length >= 5) score += 10;
  if (/faq/i.test(text)) score += 10;
  if ((websiteData?.meta?.description || '').length >= 100) score += 5;

  return Math.max(0, Math.min(100, score));
}

function buildFindings({ answerMention, citingSources, brandMentions, queryCount, platform }) {
  const findings = [];
  if (answerMention) {
    findings.push('Brand is mentioned in the generated LLM answer — strongest citation signal');
  }
  if (citingSources.length > 0) {
    findings.push(`Brand cited by ${citingSources.length} distinct source(s) including ${citingSources.slice(0, 3).join(', ')}`);
  } else if (brandMentions > 0) {
    findings.push(`Brand appears in search results for ${brandMentions}/${queryCount} queries but was not cited as a source`);
  } else {
    findings.push('No sources mention the brand across the checked queries');
  }
  if (answerMention && citingSources.length >= 3) {
    findings.push(`Strong citation profile — ${platform} is likely to surface the brand for related queries`);
  }
  return findings;
}

/**
 * Run one LLM-platform visibility check via LLM-oriented web search.
 * Returns measured or unavailable; NEVER fabricated.
 */
async function checkLlmPlatform(platform, brandTokens, queries, websiteData, productName) {
  const settled = await Promise.allSettled(queries.map(q => searchLlmWeb(q, 5)));
  const successful = settled.filter(r => r.status === 'fulfilled' && r.value?.success);
  if (successful.length === 0) {
    return null;
  }

  let brandMentions = 0;
  let answerMention = false;
  const citingSources = [];
  const seenSources = new Set();
  let topRelevance = 0;

  for (const r of successful) {
    const payload = r.value;
    const answerText = `${payload.answer || ''}`;
    if (mentionsBrand(answerText, brandTokens)) {
      answerMention = true;
    }
    for (const result of payload.results || []) {
      const haystack = `${result.title || ''} ${result.url || ''} ${result.content || ''}`;
      if (mentionsBrand(haystack, brandTokens)) {
        brandMentions++;
        const domain = result.domain || extractDomain(result.url);
        if (domain && !seenSources.has(domain)) {
          seenSources.add(domain);
          citingSources.push({ domain, url: result.url, title: (result.title || '').slice(0, 120) });
        }
        if (typeof result.score === 'number' && result.score > topRelevance) topRelevance = result.score;
      }
    }
  }

  const entityConsistency = citingSources.length >= 2 ? 0.8 : citingSources.length === 1 ? 0.5 : 0;
  const scored = scoreLlmVisibilityEvidence({
    brandMentions,
    queryCount: queries.length,
    answerMention,
    citingSourceCount: citingSources.length,
    topRelevance,
    entityConsistency
  });

  return {
    platform: platform.label,
    score: scored.score,
    status: 'measured',
    confidence: Math.round(Math.min(40 + successful.length * 15, 90)),
    method: 'llm_search_proxy',
    note: PLATFORM_NOTE,
    evidence: {
      queries,
      answeredQueries: successful.length,
      answerMention,
      brandMentions,
      citingSourceCount: citingSources.length,
      citingSources: citingSources.slice(0, 10),
      topRelevance,
      retrievedAt: new Date().toISOString()
    },
    components: scored.components,
    findings: buildFindings({ answerMention, citingSources, brandMentions, queryCount: queries.length, platform: platform.label })
  };
}

/**
 * Run real Google SERP checks for Google AI Overview + featured snippets.
 * Returns measured when at least one SERP succeeded; null otherwise.
 */
async function checkGoogleAiOverview(brandTokens, domain, keywords) {
  const checked = [];
  const serpResults = [];
  const usableKeywords = (keywords || []).filter(k => typeof k === 'string' && k.trim().length >= 3).slice(0, 5);

  if (usableKeywords.length === 0) return null;

  const dataforseoReady = isDataForSEOConfigured();
  const serpapiReady = isSerpAPIConfigured();

  for (const keyword of usableKeywords) {
    let parsed = null;
    if (dataforseoReady) {
      const res = await getSerpAnalysis(keyword, 'United States', 'English');
      if (res.success) parsed = res.data;
    }
    if (!parsed && serpapiReady) {
      const res = await googleSearch(keyword, { num: 10 });
      if (res.success) {
        const d = res.data;
        parsed = {
          keyword,
          aiOverview: d.aiOverview,
          featuredSnippet: d.featuredSnippet,
          organic: d.organic || [],
          provider: 'SerpAPI',
          status: 'measured'
        };
      }
    }
    if (parsed) {
      checked.push(keyword);
      serpResults.push(parsed);
    }
  }

  if (checked.length === 0) return null;

  let aiOverviewCount = 0;
  let brandCitedInOverviewCount = 0;
  let featuredSnippetCount = 0;
  let brandRankedCount = 0;
  const overviewEvidence = [];

  for (const parsed of serpResults) {
    const overview = parsed.aiOverview;
    const aiOverviewPresent = !!overview;
    if (aiOverviewPresent) aiOverviewCount++;

    let brandCited = false;
    if (overview && overview.text) {
      brandCited = mentionsBrand(overview.text, brandTokens);
      if (brandCited) brandCitedInOverviewCount++;
      const citedDomains = (overview.citedDomains || []).map(c => c.domain);
      overviewEvidence.push({
        keyword: parsed.keyword,
        aiOverviewPresent,
        brandCitedInOverview: brandCited,
        citedDomains: citedDomains.slice(0, 10),
        snippet: (overview.text || '').slice(0, 300)
      });
    } else {
      overviewEvidence.push({
        keyword: parsed.keyword,
        aiOverviewPresent: false,
        brandCitedInOverview: false,
        citedDomains: [],
        snippet: null
      });
    }

    if (parsed.featuredSnippet) featuredSnippetCount++;
    if ((parsed.organic || []).some(r => {
      const d = r.domain || extractDomain(r.url || '');
      return d && domain && d === extractDomain(domain);
    })) brandRankedCount++;
  }

  const scored = scoreAiOverviewEvidence({
    keywordsChecked: checked.length,
    aiOverviewCount,
    brandCitedInOverviewCount,
    featuredSnippetCount,
    brandRankedCount
  });

  return {
    platform: 'Google AI Overview',
    score: scored.score,
    status: 'measured',
    confidence: Math.round(Math.min(40 + checked.length * 15, 90)),
    method: 'real_serp_ai_overview',
    note: 'Based on real Google SERP AI Overview presence and brand citation inside the overview',
    evidence: {
      keywordsChecked: checked,
      aiOverviewCount,
      brandCitedInOverviewCount,
      featuredSnippetCount,
      brandRankedCount,
      perKeyword: overviewEvidence,
      provider: serpResults[0]?.provider || 'mixed',
      retrievedAt: new Date().toISOString()
    },
    components: scored.components,
    findings: [
      checked.length > 0 && brandCitedInOverviewCount > 0
        ? `Brand cited inside Google AI Overview for ${brandCitedInOverviewCount}/${checked.length} checked keywords`
        : 'Brand not cited inside any detected Google AI Overview',
      featuredSnippetCount > 0
        ? `Featured snippet held for ${featuredSnippetCount}/${checked.length} checked keywords`
        : 'No featured snippet detected for checked keywords'
    ].filter(Boolean)
  };
}

/**
 * Enterprise AI visibility analysis.
 * @param {Object} params { productName, companyName, domain, keywords, websiteData }
 * @returns {Object} per-platform evidence-backed scores
 */
export async function generateAIVisibility({
  productName = '',
  companyName = '',
  domain = '',
  keywords = [],
  websiteData = null
}) {
  const brandTokens = normalizeBrandTokens(productName, companyName, domain);
  const industry = (websiteData?.industry || '');
  const baseQueries = [
    productName ? `${productName}` : null,
    productName && industry ? `${productName} ${industry}` : null,
    productName ? `what is ${productName}` : null,
    domain ? `${domain}` : null
  ].filter(Boolean);

  const platforms = [];

  const llmChecks = await Promise.allSettled(
    LLM_PLATFORMS.map(p => checkLlmPlatform(p, brandTokens, baseQueries, websiteData, productName))
  );
  llmChecks.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value) {
      platforms.push(r.value);
    }
  });

  const serpCheck = await checkGoogleAiOverview(brandTokens, domain, keywords);
  if (serpCheck) platforms.push(serpCheck);

  // Platforms without live evidence degrade to an explicitly-estimated
  // on-page heuristic — never a fabricated number.
  const measuredKeys = new Set(platforms.map(p => p.platform));
  const estimatedPlatforms = [];
  for (const p of LLM_PLATFORMS) {
    if (!measuredKeys.has(p.label)) {
      const estimate = estimateVisibilityFromOnPage(websiteData, productName);
      estimatedPlatforms.push({
        platform: p.label,
        score: estimate,
        status: 'estimated',
        confidence: 25,
        method: 'onpage_heuristic',
        note: 'No live citation provider available — estimated from on-page AI-readiness signals',
        evidence: null,
        components: null,
        findings: ['Estimated from on-page signals; connect Tavily/Exa or a SERP provider for measured data']
      });
    }
  }
  if (!measuredKeys.has('Google AI Overview')) {
    const estimate = estimateVisibilityFromOnPage(websiteData, productName);
    estimatedPlatforms.push({
      platform: 'Google AI Overview',
      score: estimate,
      status: 'estimated',
      confidence: 25,
      method: 'onpage_heuristic',
      note: 'No live SERP provider available — estimated from on-page AI-readiness signals',
      evidence: null,
      components: null,
      findings: ['Estimated from on-page signals; connect DataForSEO or SerpAPI to detect real AI Overview citations']
    });
  }

  const allPlatforms = [...platforms, ...estimatedPlatforms];
  const measuredScores = platforms.map(p => p.score).filter(Number.isFinite);
  const overallScore = measuredScores.length > 0
    ? Math.round(measuredScores.reduce((a, b) => a + b, 0) / measuredScores.length)
    : null;

  return {
    overallScore,
    platforms: allPlatforms,
    totalPlatformsMeasured: platforms.length,
    totalPlatforms: allPlatforms.length,
    measuredPlatforms: platforms.map(p => p.platform),
    estimatedPlatforms: estimatedPlatforms.map(p => p.platform),
    evidenceSummary: {
      brandTokens,
      llmSearchQueries: baseQueries,
      serpKeywordsChecked: serpCheck ? serpCheck.evidence.keywordsChecked : [],
      totalCitedSources: platforms.reduce((sum, p) => sum + (p.evidence?.citingSourceCount || 0), 0),
      retrievedAt: new Date().toISOString()
    },
    status: measuredScores.length > 0 ? 'measured' : 'estimated',
    citationLikelihood: overallScore != null ? (overallScore >= 70 ? 'High' : overallScore >= 40 ? 'Medium' : 'Low') : null
  };
}

export default { generateAIVisibility, scoreLlmVisibilityEvidence, scoreAiOverviewEvidence, estimateVisibilityFromOnPage };
