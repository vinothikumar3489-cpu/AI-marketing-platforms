# Research Pipeline — Complete Investigation

**Date:** 2026-08-01
**Auditor:** Lead Software Architect (read-only — no code was modified)
**Scope:** End-to-end trace of every research request: entry points → orchestrators → providers → AI routers → transformers → evidence storage → consumers.

---

## 0. Executive Summary

The research pipeline is a **6-stage pipeline** (Entry → Scrape → Enrich → AI-Synthesize → Transform → Store) that is architecturally broken in four fundamental ways:

1. **P0 — The chat-analysis core is dead code**: `src/domains/analytics/services/analysis.service.js` has **zero imports** but uses `z` (line 152) and `aiOrchestrator` (line 206). `ReferenceError: z is not defined` is thrown **before** the try/catch — every `POST /:chatId/messages` and every `POST /api/analysis/product` burns 1 Tavily call + 1-2 scrapes and then returns **500**. The fallback path (line 226) is unreachable.
2. **P1 — The scraper contract is broken**: `scrapeWebsite()` never returns an `html` or `text` field, but the orchestrator's technology detection (`detectTechnologyStack(scrapedContent?.html)`, research-orchestrator.service.js:60) and keyword extraction (`websiteContent.text`, :405) depend on them. **Technology detection always returns `[]` via the primary path; website-content keywords are never collected.** The whole feature extraction layer (features/benefits/pricing) is under-fed.
3. **P1 — Business Intelligence runs on empty data but stamps confidence 75-90**: in the growth-workspace flow, `collectBusinessIntelligence` is called without `chatId` (growthWorkspace.service.js:269-275), so its EvidenceSnapshot load is skipped, `scrapedData` is null, and all 4 collectors run on empty text — yet `synthesizeWithAI` stamps `confidence` 85/90/85/80/75/80 based on nothing but `sources.length`.
4. **P1 — Fabricated confidence everywhere**: hardcoded confidence constants (Tavily 55-70, audience templates 55-90, BI 75-90, features 100, keyword AI-estimates 30, action-plan gap analyses 100) are attached to heuristic/template data with zero correlation to evidence quality. Two layers of hardcoded fallback data (`fallback.generators.js` + `ai-response-validator` fallbacks) guarantee **the pipeline never returns null — it returns invented data**.

Provider economics are also broken: one growth-workspace run issues **~25-30 Tavily searches, 8-13 DataForSEO calls, 2 PageSpeed calls, 11-14 LLM calls, and up to 4 scraper attempts** with **no caching and no deduplication** across phases.

**Overall risk: CRITICAL** (P0 endpoint always fails; fabricated data persists to production tables).

---

## 1. Pipeline Topology (who calls whom)

```
ENTRY POINTS
├─ POST /api/chats/:chatId/messages ──► message.controller ──► analysis.service.generateAnalysis      [P0: always 500]
├─ POST /api/analysis/product ────────► analysis.controller ──► scrape(1) + collectEvidence(2nd scrape) + generateAnalysis  [P0: always 500]
├─ POST /api/chats/:chatId/growth-workspace/run-full-analysis
│     └─► growthWorkspace.service.runFullGrowthAnalysis
│           ├─ collectResearchData (research-orchestrator) ── 5 phases (below)
│           ├─ collectBusinessIntelligence (WITHOUT chatId ─► runs on null data)
│           │     ├─ collectCompanyIntelligence (regex heuristics)
│           │     ├─ collectMarketIntelligence (DataForSEO + Tavily)
│           │     ├─ collectCompetitorIntelligence (DataForSEO + Tavily)
│           │     ├─ collectAudienceIntelligence (HARDCODED persona templates)
│           │     └─ extractVerifiedPricing (regex)
│           ├─ 8× AI module steps (product/market/audience/competitor/intent/positioning/campaign/channel)
│           │     each: callBestAI → aiRouter.callAI (Groq→Gemini→OpenRouter→OpenAI) → fallback.generators
│           └─ persistence: ProductIntelligence/CompetitorIntelligence/CampaignIntelligence + EvidenceSnapshot
├─ POST /api/chats/:chatId/seo-intelligence/run ──► seo-orchestrator ──► provider-router (SerpAPI→DataForSEO→cache→AI)
├─ POST /api/chats/:chatId/evidence/collect ──► evidence.service.collectEvidence ──► scrape + robots/sitemap/PageSpeed/github
├─ POST /api/scrape/product-website ──► scraper.service (Jina→Firecrawl→Playwright→Cheerio)
├─ POST /api/chats/:chatId/product-intelligence/{market,product,audience}/run ──► product-intelligence module
└─ POST /api/chats/:chatId/competitor-intelligence/*/run ──► competitor-discovery cascade

RESEARCH ORCHESTRATOR (research-orchestrator.service.js) — 5 phases
├─ P1  scrapeWebsite (4-scraper chain) ──► [broken: no html/text fields returned]
│     └─ P1b detectTechnologyStack(html)  ← html is undefined ─► ALWAYS []
│     └─ P1c extractPricingFromWebsite    ← only pricingText field available
├─ P2  getDesktopAndMobilePageSpeed (2 API calls, 3 retries, 5-min cache)
├─ P3  discoverCompetitors (cascade: schema_org→SERP→links→[Tavily∥DDG∥Exa∥GitHub∥PH]→AI→enrich)
├─ P4  collectKeywords (DataForSEO metrics + AI-estimated + deterministic nulls)
└─ P5  collectMarketSignals (researchCompetitors = 7 Tavily queries + researchCompany = 4 queries)

TRANSFORM LAYER (services/intelligence/*) — deterministic, NO AI (synthesizeWithAI is a misnomer)
├─ synthesizeWithAI ─► confidence 75-90 stamped on presence-only basis
├─ executive-story / action-plan ─► hardcoded templates, inverted confidence (gaps get 100)
└─ evidence-validator ─► requires evidence.collector — which NO service emits (would reject everything)

STORAGE
├─ EvidenceSnapshot (always CREATE, never upsert — rows accumulate; "latest" may be an emptier row)
├─ ProductIntelligence / CompetitorIntelligence / CampaignIntelligence (AI output upserts)
└─ GraphEntity/GraphRelationship (nothing writes them — brain dormant)
```

---

## 2. Request Traces (end-to-end)

### 2.1 Trace A — `POST /api/chats/:chatId/messages` (chat analysis)
1. `message.controller.js:30` creates the user Message row.
2. `:35` calls `generateAnalysis` **without try/catch**.
3. Inside: Tavily `v1/research` fetch (`analysis.service.js:114`) — **1 Tavily call burned**.
4. `:152` `z.object(...)` → **`ReferenceError: z is not defined`** (no import, no global) → 500.
5. Assistant message never created; `prisma.analysis` never written; ProductIntelligence never updated.
6. **Result: every chat message = wasted Tavily call + guaranteed 500.**

### 2.2 Trace B — `POST /api/analysis/product`
1. `analysis.controller.js:31` → `scrapeWebsite()` — scrape attempt #1.
2. `:49` → `collectEvidence()` which scrapes **again** internally (evidence.service.js:40-42) — scrape attempt #2 (+ robots/sitemap/PageSpeed/github fetches).
3. `:66` → `generateAnalysis` → Tavily call → **`ReferenceError: z` → 500**.
4. All evidence collected is discarded; nothing persisted.
5. **Result: 2 scrapes + 1 evidence collection + 1 Tavily call, guaranteed 500.**

### 2.3 Trace C — `POST /:chatId/growth-workspace/run-full-analysis`
1. Research phase: scraper chain (up to 4 attempts) + PageSpeed (2 calls) + competitor cascade (up to 12 source calls) + keywords (1 DataForSEO + ≤1 AI) + 11 Tavily queries. EvidenceSnapshot auto-created by scraper (scraper.service.js:725-753).
2. BI phase: `collectBusinessIntelligence` called **without chatId** (growthWorkspace.service.js:269-275) → EvidenceSnapshot load skipped → **all collectors run on null website data** → still stamped confidence 75-90.
3. 8 AI module steps, each with **4-second sleep** (growthWorkspace.service.js:354+ — ≥28 s of pacing) → 8 LLM calls via aiRouter → fallback generators if all providers fail.
4. Persistence: 3 upserts (ProductIntelligence/CompetitorIntelligence/CampaignIntelligence).
5. **Post-commit `saveEvidenceSnapshot` (growthWorkspace.service.js:1207) writes a mostly-empty reconstruction** — which becomes the "latest" snapshot read by `getGrowthWorkspaceResults` (:1735-1738). **The richer scraper snapshot is shadowed.**
6. **Result: ~25-30 Tavily + 8-13 DataForSEO + 2 PageSpeed + 11-14 LLM + 2 snapshots, tens of seconds latency, emptied evidence.**

### 2.4 Trace D — `POST /:chatId/seo-intelligence/run`
1. seo-orchestrator → provider router: SerpAPI (confidence 100/85) → DataForSEO (80) → cache (60) → AI_FALLBACK (30).
2. Cache: 24 h TTL, 500-entry FIFO.
3. SEO scores: `buildSEOEvidenceData` is **dead code** (evidence snapshot has no `.evidence` field — `seoIntelligence.service.js:94-95`) → all `safeSeoScores` are null → `seoScore: null` persisted → "Score: Not yet available" in UI.

### 2.5 Trace E — `POST /:chatId/evidence/collect`
1. Scraper chain (Jina→Firecrawl→Playwright→Cheerio; Playwright **always fails — package not installed**).
2. Then robots/sitemap/PageSpeed/github in parallel (evidence.service.js:53-58) — **PageSpeed re-fetches the same URL that the orchestrator and technical-seo-analyzer also fetch** (3 parallel PageSpeed implementations).
3. `saveEvidenceSnapshot` always `create` (:124) — **no dedupe; rows accumulate per call**.
4. Partial failure → `technicalSeoEvidence: {…}` written with nulls (controller :37-47) — **silent null persistence**.

---

## 3. Provider Audit (success/retry/timeout/cache/confidence/fallback/error)

### 3.1 Tavily (`providers/tavily.service.js`)
| Dimension | Finding |
|---|---|
| Success rate | No tracking anywhere (nothing persists success/failure) |
| Retry | **None** |
| Timeout | 20 s AbortController (`:18-19`) — the only hard timeout in research |
| Caching | **None** |
| Confidence | Hardcoded per fact type: mission 70, funding 65, founders 60, employees 55 (`:136-145`); no confidence for competitors |
| Fallback | `generateFallbackCompetitorInsights` returns **empty arrays** with `success:false` — honest, no fabrication |
| Error handling | Per-query try/catch, `console.warn`, skipped (`:60-62`) — **silent partial failure** |
| Auth | **`api_key` sent in BOTH body and `Authorization` header** (`:22, :27`) — duplicate exposure |
| Cost | `researchCompetitors` = 7 sequential queries; `researchCompany` = 4 → 11 per orchestrator run + 7 more in market-intelligence + 7 in competitor-intelligence + ≤5 pricing enrichment = **~30 searches per growth run** |

### 3.2 DataForSEO (`providers/dataforseo.service.js`)
| Dimension | Finding |
|---|---|
| Success rate | Module latches only: `_dataforseoAuthFailed` (sticky until success), `_dataforseoBlockedUntil` (5-min 402 circuit), `_dataforseoVerified` |
| Retry | **None** |
| Timeout | **None** (no AbortController; router's 30 s `Promise.race` abandons but never aborts → socket leak) |
| Caching | **None** (router caches) |
| Confidence | **100 hardcoded on every metric row** (`:270, :329, :395, :445, :933, :959`); only competitor confidence is computed (`calculateConfidence` `:772-776`) |
| Fallback | Auth-fail/402 short-circuit without network (`:119-125`); zero usable rows → `{success:false, data:[]}`; null metrics **kept inside success:true rows** (`:321-334`) |
| Error handling | Never throws; 401 latches permanently until `verifyDataForSEO` probe succeeds; 402 opens 5-min circuit; **reconnect probe fires during circuit → re-blocks** (`:1025`) |
| Notes | Mojibake emoji logs (`:58, :167, :193, :255`); `sanitizeKeywords` NFKC-normalizes; 13-location map |

### 3.3 SerpAPI (`services/serpapi.service.js`)
| Dimension | Finding |
|---|---|
| Success rate | `_serpapiAvailable` latch (401/403 → permanently false); 60 s cached status probe |
| Retry | **None** |
| Timeout | **None on searches** (10 s only on the status probe `:69-70`) |
| Caching | **None in file** (router caches: `serp:query:location:device` etc., 24 h TTL, 500 FIFO) |
| Confidence | 100 on all normalized results (`:287, :422, :443...`); 80 competitors; `searchOpportunityScore` 70 marked `estimated` (`:740-743`) — the honest outlier |
| Fallback | 429 → `{success:false, retryAfter:60}` — **retryAfter never honored, nothing sleeps, next request retries anyway**; 401/403 latch availability off |
| Error handling | Key in **URL query param** (`:231`); `<20-char keys rejected`; never throws |
| Notes | `organic_results_state === "Fully empty"` → success:false (`:256-258`) |

### 3.4 PageSpeed (`providers/pagespeed.service.js`)
| Dimension | Finding |
|---|---|
| Success rate | No tracking; 5-min in-memory cache, **unbounded growth (no max size)** |
| Retry | **Yes — 3 attempts**, exponential backoff 1 s→2 s, honors `retry-after` on 429, retries 5xx + network errors (`:71-98`) — the only provider with real retry |
| Timeout | **None** — hung request can hang the orchestrator phase |
| Caching | 5-min TTL Map, key `strategy:url`, only successes cached (`:64-66`) |
| Confidence | None (source labels only) |
| Fallback | Never throws; mobile+desktop runs in parallel, `success` = OR of two, failed one = null (`:118-122`) — partial data |
| Notes | **Field-mapping bug**: `is-on-https` audit mislabeled `hasTitleTag` (`:173`) |

### 3.5 Competitor Discovery cascade (`providers/competitor-discovery.service.js`)
Order: schema_org(95) → dataforseo_serp(90) → website_links(50) → parallel [Tavily(70)/DuckDuckGo(65)/Exa(60)/GitHub(55)/ProductHunt(55)] → mergeAndRank → AI reasoning(35, only if <3 results) → enrichment (AI batches of 6 + Tavily pricing ≤5 + DataForSEO domain data ≤5).
- Retry: none. Timeout: 10-15 s per source via `fetchWithTimeout` (real AbortController, `:96-116`). Cache: none.
- Confidence: computed `min(98, conf*0.6 + maxSourceWeight*0.4 + min(sourceCount*8, 20))` (`:613`) — the only honest scoring in the pipeline.
- **Fabrication**: Tavily (`:275`) and Product Hunt (`:496`) convert company names to `name.com` domains **never verified to exist**; GitHub synthesizes `*.github.io` (`:390`). AI fallback instructed "NEVER invent names" but still synthesizes domains (`:541`).
- **Gate bug**: all 5 parallel sources share one `< 4` snapshot gate (`:822`) — if candidates are low at that instant, **all 5 run** regardless of how many the first returns.

### 3.6 Firecrawl (`scraper.service.js:279-378`)
| Dimension | Finding |
|---|---|
| Success | No tracking; **no retry**; 15 s SDK timeout (`:301`) |
| Caching | None |
| Confidence | None — only `scrapeQuality` counts (titleFound/metaFound/featureCounts) |
| Fallback | Any failure → `return null` → next scraper in chain (**silent**; chain continues) |
| Error handling | try/catch → console.warn → null (`:374-377`) |
| Notes | Sits 2nd in chain (after Jina); extracts features/benefits/pricing/CTA/FAQ/testimonials via regex keyword lists — noise-based, high false-positive/negative rate |

### 3.7 Cheerio (`scraper.service.js:382-488`)
| Dimension | Finding |
|---|---|
| Retry | **None** |
| Timeout | `fetch(websiteUrl, { timeout: 10000 })` with **node-fetch v3 — the `timeout` option does not exist in v3 and is silently ignored** → **can hang forever** |
| Confidence | None |
| Fallback | null → pipeline ends (last resort) |
| Notes | 4th in chain; single UA header; regex extraction of features/benefits/pricing/FAQ/testimonials from raw text |

### 3.8 Playwright (`scraper.service.js:549-572`) — BROKEN
- **`playwright` is not in package.json** → dynamic import always throws → returns null (`:552-556`).
- Even if installed: **browser is never closed on error** (resource leak, `:560-567`).
- Effectively a dead fallback that silently consumes the slot.

### 3.9 Jina (`scraper.service.js:576-662`)
- 1st in chain; POST `r.jina.ai` with `X-Timeout: 20` header — **no AbortSignal** (header may or may not be honored); no retry; null on any failure.

### 3.10 Tavily-as-scraper (`scraper.service.js:666-682`) — BROKEN
- **Placeholder — returns `null` unconditionally** (`:677`). Comment says "replace with actual SDK usage". The scraper chain comment at `:693` claims "Jina → Firecrawl → Playwright → Cheerio" but dead Tavily is listed in code paths above.

### 3.11 AI routers (prompt layer)

**aiRouter.service.js** (research/growth path):
| Dimension | Finding |
|---|---|
| Chain | Groq → Gemini → OpenRouter → OpenAI; first success wins; cooldowns: 5 min after 429/quota (`:20-28`), Gemini extra 60 s flag |
| Timeout | **Yes — `AbortSignal.timeout(45000)` on all 4 providers** (`:215, :294, :373, :450`) — the only AI layer with real timeouts |
| Retry | Exactly 1 retry, **only** for `JSON_PARSE_FAILED`/`INVALID_RESPONSE`, no backoff (`:508-517`) |
| Confidence | **None assigned** |
| Fallback | All fail → `{success:false, diagnostics}` — consumers (growthWorkspace `callBestAI`) substitute **hardcoded fallback.generators data with `provider:'fallback'`** — never null |
| Error handling | 401/403 → provider **permanently** `NOT_CONFIGURED` for process lifetime (status cache never re-probes, `:535-586`); no 500-specific branch; JSON body parse failure misclassified as NETWORK_FAILED |
| Model | Gemini 2.0-flash, Llama-3.3-70B, Claude-3-haiku, GPT-4o-mini; temp 0.4; maxTokens from caller (1000-4000) |
| Injection | **Raw scraped website content interpolated into prompts with no sanitization** (`:131-164`) |

**aiOrchestrator.service.js** (content/email/campaign path):
| Dimension | Finding |
|---|---|
| Chain | Gemini(3 models) → Groq → Cerebras → DeepSeek → OpenRouter; no OpenAI endpoint |
| Timeout | **None** — SDK defaults (OpenAI SDK 10-min timeout, 2 auto-retries; Gemini none) |
| Retry | SDK built-ins only (2 for OpenAI-compatible) |
| Confidence | None |
| Fallback | `{success:false, error}`; **`callAI` returns `success:true, data:null` on empty/unparseable responses** (`:304`) — silent nulls |
| Error handling | No status classification; every provider error → generic catch; last error overwritten (`:154`) |
| Bugs | **`response_format: json_object` sent to ALL providers** incl. DeepSeek/Cerebras (`:165`); cross-provider model fallback `gemini-1.5-flash` (`:163`, latent); temperature logged but never applied (`:219`); schema param ignored (`:93`); email-campaign-generator passes an **array** prompt → `prompt.substring` TypeError → that path can never succeed (`email-campaign-generator.service.js:596-599`) |

### 3.12 Google Search Console (`providers/googleSearchConsole.service.js`)
- 1 retry on 401 only; no timeout; no data cache; **`getSiteMetrics` returns `success:true, status:"measured"` even when all 5 sub-queries fail** (`:179-218`) — silent misleading success.
- Only used in SEO controller status endpoint.

### 3.13 Exa / DuckDuckGo / GitHub / Product Hunt (discovery sub-sources)
- Exa: 15 s timeout (x-api-key header); second usage in competitor-seo uses **`Authorization: Bearer` — inconsistent header style**; no retry.
- DuckDuckGo: 10 s, 2 fetches, HTML scraping (cheerio).
- GitHub: 10 s, ≤3 repos, fabricates `.github.io` domains.
- Product Hunt: 10 s, 1 fetch, fabricates `name.com` domains.

---

## 4. Component Audit (the 13 named components)

### 4.1 Browser Crawlers — **BROKEN**
- Playwright not installed (`scraper.service.js:552`), Tavily-scraper is a placeholder returning null (`:677`). The "crawler" tier effectively = Jina (1st) / Firecrawl (2nd) / Cheerio (4th) only.

### 4.2 Website Parser — **BROKEN CONTRACT**
- `parseScrapedHtml`/cheerio extractors produce `{title, metaDescription, heroText, headings, features, benefits, pricingText, ctaText, faq, testimonials, socialLinks, rawMarkdown, cleanedText, scrapeQuality}` — **no `html`, no `text`**.
- Orchestrator expects `html` (tech detection `:60`) and `text` (keywords `:405`, pricing `:341`) → **those phases are starved on the primary path**; they only work via the `basic_fetch` fallback (`:201-218`).
- Extraction is keyword-list based: features/benefits/CTA/FAQ/testimonials are **regex-matched lines**, high false-positive and false-negative rates, capped hard (features 12, benefits 8, CTA 5, FAQ 5, testimonials 4).

### 4.3 Technology Detector — **ALWAYS FAILS ON PRIMARY PATH**
- `detectTechnologyStack(html)` (`research-orchestrator.service.js:230-334`) — 64 hardcoded signature regexes; confidence **hardcoded 85/70** per signature (`:307, :320, :327`).
- Called with `scrapedContent?.html` which is `undefined` from the scraper → `[]` → warning "no signatures". Only the basic_fetch fallback supplies html. Second implementation in `business-intelligence.service.js:176-381` (regex over text — 15 categories) has the same hardcoded-confidence problem (`70 + 10×patterns`).

### 4.4 Pricing Extractor — DATA-LOSS + FABRICATED CONFIDENCE
- `extractPricingFromWebsite` (`research-orchestrator.service.js:339-395`): regex `$X` search within 120 chars of tier names; **confidence hardcoded 65/70/40** (`:378, :393`); `currency` defaults to `$` (`:390`); pricing evidence string fabricated ("Extracted from website pricing section" even when it wasn't, `:392`).
- Only `pricingText` feeds it (scraper's truncated 300-char pricingText) — **full-page pricing data lost**.
- Second implementation in `business-intelligence.service.js:408-488` (extractVerifiedPricing).

### 4.5 Market Analyzer — **HOLLOW**
- `market-intelligence.service.js`: TAM/SAM/SOM/CAGR/regulations/seasonality/opportunities/risks **initialized but never populated — always `'Unknown'` / `[]`** (`:59-70`). Only `industrySize`/`growthRate` bucket strings + trends get data.
- **Fabricated `investmentTrends`**: if industry contains `ai|fintech|saas|...` → pushes "High VC/PE investment activity in {industry}" with `source:'Industry analysis', confidence 70` (`:163-175`).
- `executive-story` then emits "Total Addressable Market estimated at Unknown" — the 'Unknown' propagates into narrative output.

### 4.6 Competitor Finder — best-behaved, but fabricates domains
- Cascade in §3.5. Honest computed confidence in `mergeAndRank` (`:613`). **But**: Tavily/PH/GitHub synthesize unverified domains; AI fallback (conf 35) allowed when <3 found; AI enrichment writes pricing/strengths/weaknesses/traffic (`enrichCompetitorsWithAI :625-681`) with no verification; DataForSEO enrichment adds +10 confidence capped 99 (`:711`).
- **Hardcoded tech-stack inference** in `competitor-intelligence.service.js:259-291` (Canva→React/TypeScript/AWS etc.) — **synthetic data injected into `enterpriseFields.technologies`** as if measured.

### 4.7 Audience Builder — **TEMPLATE FABRICATION**
- `audience-intelligence.service.js:32-103`: **hardcoded persona library** (Technology/Marketing/E-commerce × B2B/B2C) with pre-written painPoints/goals/objections, self-attributed `source:'industry_evidence_pattern', confidence 70/65/55` (`:42-99`).
- Unknown industry → **silently falls back to Technology personas** (`:119-125`).
- `budget/intent/companySize/techMaturity/lifetimeValue` — **explicitly null, never populated** (`:182-186`).
- `buyingTriggers` is actually built from `preferredContent` (`:175`) — mislabel.

### 4.8 Firecrawl / DataForSEO / Tavily / Cheerio / OpenAI / Gemini / Groq / OpenRouter / SERP — see §3 provider matrix.

---

## 5. Where Data Is Lost (in order of severity)

| # | Loss point | Location | Impact |
|---|---|---|---|
| 1 | **No `html`/`text` fields from scraper** | scraper.service.js return objects | Tech detection dead; website keyword extraction dead |
| 2 | **Evidence snapshot shadowing** | growthWorkspace.service.js:1182-1228 writes mostly-empty 2nd snapshot; readers use "latest" (:1735) | Rich scrape evidence replaced by empty reconstruction |
| 3 | **BI runs on null data** | growthWorkspace.service.js:269-275 (no chatId) | Company/market/competitor/audience heuristics run on `''` — output is defaults |
| 4 | **`|| {}` persistence defaults** | evidence.service.js:29-35; evidence.controller.js:37-47 | Partial collections persist as empty objects/nulls |
| 5 | **Truncation caps** | scraper: markdown 2000-3000 chars, features 12, benefits 8, CTA 5, FAQ 5, testimonials 4, headings 15 | Structural data discarded |
| 6 | **synthesizeWithAI drops fields** | business-intelligence.service.js:594-618 | indirect/emerging/all competitors lose confidence/snippet/featureOverlap/pricingOverlap/trafficEstimate |
| 7 | **Field mis-mapping** | business-intelligence.service.js:521-523 | revenueModel←businessModel; growthStage←fundingStage; **productMaturity←launchYear (a year served as maturity)** |
| 8 | **TAM/SAM/SOM/CAGR never populated** | market-intelligence.service.js:59-70 | Executive story always "Unknown" |
| 9 | **`company.integrations` never populated** | company-intelligence.service.js:19 | executive-story `integrationsDetected` always false |
| 10 | **`hasAPI` always false** | executive-story.service.js:95 (checks `category === 'framework'` which never exists) | API narratives never generated |
| 11 | **evidence.validator rejects everything** | evidence-validator.service.js:80 requires `collector` — no service emits it | If wired to BI, 100% rejection |
| 12 | **GSC silent partial success** | googleSearchConsole.service.js:179-218 | success:true with all-null data |
| 13 | **aiOrchestrator success:true + data:null** | aiOrchestrator.service.js:304 | Nulls flow into content/email/campaign |

## 6. Where Null Values Appear

- `scrapeQuality` fields are booleans/counts — never confidence.
- Orchestrator keyword rows: `volume/difficulty/cpc/competition/intent` = null when DataForSEO unavailable (`research-orchestrator.service.js:453-462`), with **confidence 90 stamped on rows whose metrics are all null**; deterministic fallback rows get `confidence: Math.min(freq*5, 50)` with all-null metrics (`:509-522`).
- Audience: budget/intent/companySize/techMaturity/lifetimeValue = null always (`audience-intelligence.service.js:182-186`).
- Competitor `enterpriseFields` all null (13 fields, `competitor-intelligence.service.js:109-128`); Tavily competitors `confidence: null` (`:158`).
- PageSpeed: failed mobile/desktop half = null (`pagespeed.service.js:118-122`).
- EvidenceSnapshot JSON columns nullable by schema; every writer defaults `|| {}`/`|| null`.
- SEO: all `safeSeoScores` null because `buildSEOEvidenceData` is dead (`seoIntelligence.service.js:94-95`).

## 7. Where AI Overwrites Real Data

| # | Overwrite | Location |
|---|---|---|
| 1 | **AI-estimated keyword metrics merged into real keyword array** (source `ai_estimated`, confidence 30) | research-orchestrator.service.js:470-502 — same array as DataForSEO 90/100 rows; consumers can't easily distinguish |
| 2 | **Growth-workspace AI module outputs are the persisted values**; real evidence only merged into 3 fields (technologyStack, market.pricing, competitor.directCompetitors when AI returned none) | growthWorkspace.service.js:659-685, :1063-1080 |
| 3 | **marketDiscovery upsert** — AI result overwrites `productIntelligence.marketDiscovery` on every run | marketDiscovery.service.js:31-50 |
| 4 | **Hardcoded competitor tech stacks injected into enterpriseFields.technologies** | competitor-intelligence.service.js:259-291 |
| 5 | **SEO AI generators write keywordOpportunities/competitorKeywords into seoIntelligence** while evidence-based scores stay null | seoIntelligence.service.js:491-495 |
| 6 | **Hardcoded fallback layers guarantee fabricated data**: `fallback.generators.js` (8 generators, conf 25-50) and `ai-response-validator` fallbacks (canned strings) replace failed AI paths; caller never sees null | growthWorkspace.service.js:1706-1721; ai-response-validator.js:468-694 |
| 7 | **Action-plan inverted confidence**: gap analyses emitted *because data is missing* get confidence 100 | action-plan.service.js:53, :85, :135, :205 |

## 8. Where Duplicate Requests Happen

| # | Duplication | Location |
|---|---|---|
| 1 | **2 scrapes per product-analysis request** | analysis.controller.js:31 + :49 |
| 2 | **~30 Tavily searches per growth run** (7+4 orchestrator + 7 market + 7 competitor + ≤5 pricing enrichment) — no dedupe across phases | tavily.service.js; multiple callers |
| 3 | **8-13 DataForSEO calls per growth run** — no cross-phase cache | competitor-discovery + market + keywords + enrichment |
| 4 | **3 parallel PageSpeed implementations** fetching the same URL: `providers/pagespeed.service.js` (mobile+desktop, cached 5 min), `modules/evidence/pageSpeedEvidence.service.js` (mobile, uncached), `technical-seo-analyzer.service.js` | — |
| 5 | **robots/sitemap fetched independently** by evidence module and technical-seo-analyzer | — |
| 6 | **EvidenceSnapshot rows accumulate** — both writers always `create`, never upsert | evidence.service.js:22, :124 |
| 7 | **Double AI estimation**: keywords AI-estimate (`research-orchestrator:485`) + separate `keyword-intelligence` AI fallback path | — |
| 8 | **SerpAPI auto-retry on next op after 429** — `retryAfter:60` never honored | serpapi.service.js:246-248 |

## 9. Where Providers Fail Silently

| # | Silent failure | Location |
|---|---|---|
| 1 | Scraper chain: each scraper returns null on failure — caller only sees final "All scrapers failed" | scraper.service.js |
| 2 | Playwright fallback always fails silently (not installed) | scraper.service.js:552-556 |
| 3 | Tavily-as-scraper placeholder returns null silently | scraper.service.js:666-682 |
| 4 | Tavily per-query failures → warn + skip (loses 1 of 7 queries) | tavily.service.js:60-62 |
| 5 | GSC returns success:true + status:"measured" with all-null data | googleSearchConsole.service.js:179-218 |
| 6 | DataForSEO auth-fail latch: subsequent calls return instantly, silently | dataforseo.service.js:123-125 |
| 7 | BI evidence-load failure → warning only, pipeline continues on null | business-intelligence.service.js:79-81 |
| 8 | Market/competitor/audience provider failures → warnings only, 'Unknown'/[] returned | market-intelligence.service.js:122-150 |
| 9 | Orchestrator phases never throw; all failures → warnings array | research-orchestrator.service.js:165-169 |
| 10 | aiOrchestrator returns success:true with data:null | aiOrchestrator.service.js:304 |
| 11 | `saveEvidenceSnapshot` returns null on error; callers log-and-continue | evidence.service.js:144 |
| 12 | **DataForSEO reconnect probe fires during the 402 circuit and re-blocks** | dataforseo.service.js:1025 |

## 10. Root Causes

1. **Missing contract between scraper and consumers** — the scraper's return shape was changed (html/text dropped) without updating orchestrator consumers; no types or validation to catch it.
2. **Copy-paste service assembly without import hygiene** — `analysis.service.js` lost its imports (or was written without them); no lint/CI gate; the repo's own import-check script crashes on an unrelated broken path.
3. **Confidence is a display number, not a measurement** — assigned per-branch as marketing ("high confidence") rather than computed from source quality, corroboration, or recency; the one real scoring engine (competitor `calculateConfidence`, marketDiscovery authority/recency) is the exception and its output is mostly discarded.
4. **Never-null policy via fallback data** — the pipeline prefers fabricated fallbacks over honest nulls, so failures become indistinguishable from success.
5. **No caching or deduplication across phases** — cost explosion (~60 external calls per growth run) and stale/latest-wins snapshot confusion.
6. **Three parallel implementations of every capability** (scraper evidence, PageSpeed, SEO, product analysis, market discovery) with different signatures and behaviors.
7. **No provider observability** — zero persistent success/failure/health telemetry; only in-memory latches and console logs.

## 11. Broken Pipeline Locations (priority order)

| Priority | Broken location | Symptom | File:Line |
|---|---|---|---|
| **P0** | `generateAnalysis` missing imports | Every chat message & product analysis → 500 after wasting Tavily+scrape | analysis.service.js:152 (`z`), :206 (`aiOrchestrator`); callers message.controller.js:35, analysis.controller.js:66 |
| **P1** | Scraper return shape has no `html`/`text` | Tech detection always `[]`; website keywords never collected | scraper.service.js (return objects :358-372, :468-482, :530-544, :643-657); consumers research-orchestrator.service.js:60, :405 |
| **P1** | Evidence snapshot shadowing (2nd write emptier, read = latest) | Rich evidence replaced by empty reconstruction | growthWorkspace.service.js:1182-1228 vs :1735-1738 |
| **P1** | BI called without chatId in growth flow | All BI collectors run on null data, stamped conf 75-90 | growthWorkspace.service.js:269-275; business-intelligence.service.js:48-81 |
| **P1** | `buildSEOEvidenceData` dead (`.evidence` never exists) | SEO scores always null; "Score: Not yet available" | seoIntelligence.service.js:94-95, :373-382 |
| **P1** | Playwright not installed + Tavily scraper placeholder | Crawler tier broken; chain shortened silently | scraper.service.js:549-572, :666-682 |
| **P1** | node-fetch v3 `timeout` option ignored in Cheerio scraper | Potential infinite hang | scraper.service.js:395-398 |
| **P2** | AI-estimated keywords merged into real array | Fabricated metrics with conf 30 look like data | research-orchestrator.service.js:470-502 |
| **P2** | Hardcoded persona templates + silent Tech fallback | Fake audiences for unknown industries | audience-intelligence.service.js:32-125 |
| **P2** | Hardcoded competitor tech stacks | Synthetic tech intel presented as measured | competitor-intelligence.service.js:259-291 |
| **P2** | Fabricated investmentTrends | "High VC/PE investment" from keyword match | market-intelligence.service.js:163-175 |
| **P2** | Inverted action-plan confidence (gaps=100) | Most confident items are the least evidence-based | action-plan.service.js:53, :85, :135, :205 |
| **P2** | Provider cost duplication (30 Tavily + 13 DataForSEO per run) | Cost & latency blowout; no caching | tavily/dataforseo/competitor-discovery callers |
| **P2** | 3 parallel PageSpeed implementations | Duplicate API calls, inconsistent caching | pagespeed.service.js vs pageSpeedEvidence.service.js vs technical-seo-analyzer.service.js |
| **P2** | aiOrchestrator success:true+data:null; json_object to all providers | Silent nulls; DeepSeek/Cerebras/OpenRouter likely reject | aiOrchestrator.service.js:165, :304 |
| **P2** | email-campaign-generator passes array prompt | That generation path can never succeed | email-campaign-generator.service.js:596-599 |
| **P2** | `evidence.collector` required but never emitted | Validator would reject 100% of BI evidence | evidence-validator.service.js:80, :157 |
| **P3** | GSC silent success with nulls | Misleading status:"measured" | googleSearchConsole.service.js:179-218 |
| **P3** | DataForSEO reconnect during 402 circuit | Re-blocks; wasted probe | dataforseo.service.js:1025 |
| **P3** | SerpAPI retryAfter never honored | Immediate re-attempt after 429 | serpapi.service.js:246-248 |
| **P3** | Empty EvidenceSnapshot rows accumulate (never upsert) | DB bloat; stale "latest" reads | evidence.service.js:22, :124 |
| **P3** | Field mis-mappings (productMaturity←launchYear etc.) | Wrong data in executive story | business-intelligence.service.js:521-523 |

## 12. Suggested Fix Priorities (NO code was changed)

1. **P0**: restore imports in `analysis.service.js` (`zod`, `aiOrchestrator`) or route the flow through `services/intelligence.service.js`.
2. **P1**: re-add `html` (and `text`) to the scraper return contract; fix the orchestrator to use `rawMarkdown` as `text` fallback.
3. **P1**: pass `chatId` into `collectBusinessIntelligence`; skip confidence stamping when source count is 0.
4. **P1**: dedupe/upsert EvidenceSnapshot by `(chatId, websiteUrl)`; stop the post-analysis shadow write (or merge before write).
5. **P1**: either install `playwright`, or remove the slot; remove the Tavily placeholder; use `AbortSignal.timeout` in Cheerio fetch.
6. **P2**: dedupe Tavily/DataForSEO calls per run (request-scoped memo); single PageSpeed implementation.
7. **P2**: separate AI-estimated rows from measured rows at the API boundary; confidence = f(source, corroboration, recency), never hardcoded presence-based constants.
8. **P2**: remove fabricated branches (persona fallback, investmentTrends, competitor tech stacks) or mark them `dataSource: 'synthetic'`.
9. **P2**: fix aiOrchestrator null-success contract; gate `response_format` per provider.
10. **P3**: add persistent provider telemetry (success/failure counts, latency, fallback triggers) so the "success rate" column of this audit becomes observable instead of guessed.
