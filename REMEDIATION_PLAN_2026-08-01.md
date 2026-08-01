# AI Marketing Platform — Remediation Plan

**Date:** 2026-08-01
**Author:** Lead Software Architect (plan only — no code was changed)
**Inputs:** `ARCHITECTURE_AUDIT_2026-08-01.md` (risk HIGH) + `RESEARCH_PIPELINE_AUDIT_2026-08-01.md` (risk CRITICAL)
**Purpose:** Ordered, dependency-aware, effort-estimated fix plan. Each item lists finding, fix, files, effort, risk, dependencies, and how to verify the fix.

---

## 0. Guiding Principles

1. **Honesty over completeness**: a null is better than fabricated data. Remove every branch that invents data, or mark it `dataSource: 'synthetic'` at the API boundary.
2. **Confidence is a measurement**: confidence must be computed from source quality + corroboration + recency (the competitor `calculateConfidence` pattern), never hardcoded per-branch.
3. **One implementation per capability**: pick one winner per duplicate family; delete the rest. Drift is the root of most bugs here.
4. **Observability before optimization**: add persistent provider telemetry so the next audit measures instead of guesses.
5. **Fix CI first**: the repo's own import checker crashes, so nothing can prove modules are intact.

---

## 1. Priority Matrix (what to do first)

| Phase | Theme | Items | Timeline | Goal |
|---|---|---|---|---|
| **0** | Stop the bleeding | R01–R04 | 2–3 days | End guaranteed 500s, stop serving fabricated data, close the two HIGH security holes |
| **1** | Data integrity | R05–R10 | 1–2 sprints | Stop data loss, null inflation, fabricated confidence |
| **2** | Consolidation | R11–R18 | 2–3 sprints | One AI router, one SEO, one product analysis, one evidence |
| **3** | Structure & hardening | R19–R24 | ~1 month | Route safety, god-file breakups, Brain decision, validation |
| **4** | Scale & observability | R25–R28 | quarterly | Telemetry, process separation, caching, DLQ |

Effort estimates are for one engineer; parallelizable items are marked `∥`.

---

## 2. Phase 0 — Stop the Bleeding (days 0–3)

### R01 — Fix `analysis.service.js` missing imports (P0 from research audit)

- **Finding:** `src/domains/analytics/services/analysis.service.js` uses `z` (:152) and `aiOrchestrator` (:206) with zero imports → `ReferenceError: z is not defined` → every `POST /:chatId/messages` and `POST /api/analysis/product` returns 500 after burning 1 Tavily call + 1–2 scrapes. The fallback path at :226 is unreachable.
- **Fix:** (a) restore imports (`zod`, `aiOrchestrator`) — smallest change; or (b) route `generateAnalysis` through `services/intelligence.service.js` (already does what this file duplicates). Choose (b) if it works, else (a). Wrap the callers (`message.controller.js:35`, `analysis.controller.js:66`) in try/catch as defense-in-depth.
- **Files:** `domains/analytics/services/analysis.service.js`, `domains/analytics/controllers/analysis.controller.js`, `controllers/message.controller.js`
- **Effort:** 0.5–1 day. **Fix-risk:** low. **Priority:** P0.
- **Dependencies:** none.
- **Verify:** `POST /api/analysis/product` returns 200 and persists `Analysis`; a chat message creates the Assistant message; add a regression test asserting both endpoints return 200 and `Analysis` rows.

### R02 — Harden `/api/local-assets` (HIGH security, architecture audit)

- **Finding:** `server.js:411` + `worker.js:174-183` serve tenant PDF/DOCX/PPTX reports via `express.static` with **no auth**; any guessable filename downloads another tenant's report.
- **Fix:** sign report URLs with HMAC (path token, e.g. `/api/local-assets/r/{token}/{file}`) or move downloads behind an authenticated streaming endpoint (`GET /api/reports/:id/download` with ownership check). Keep files outside the public web root either way.
- **Files:** `server.js`, `jobs/workers/report.worker.js` (or wherever worker writes), `routes/report.routes.js`, `frontend/lib/api.ts` (`downloadReport`).
- **Effort:** 1 day. **Fix-risk:** low–medium (frontend URL change). **Priority:** HIGH security.
- **Dependencies:** none; do in parallel with R01 (`∥`).
- **Verify:** unauthenticated `GET /api/local-assets/...` → 401/404; signed URL with wrong token → 403; cross-tenant download attempt blocked.

### R03 — SSRF guard (HIGH security, architecture audit)

- **Finding:** arbitrary `websiteUrl` scraping with no private/loopback/link-local IP checks in `scrape.routes`, `evidence/collect`, `scraper.service`, `research-orchestrator.service.js:201`, robots/sitemap fetchers.
- **Fix:** one central `validateExternalUrl(url)` util (dns-resolve + reject private ranges `10/8, 172.16/12, 192.168/16, 127/8, 169.254/16, ::1, fc00::/7`, non-http(s) schemes, unusual ports). Apply at every entry that accepts a URL; also strip `@` userinfo. Redirects must be re-validated (common bypass).
- **Files:** new `utils/url-safety.js` + all URL-accepting endpoints listed above.
- **Effort:** 1–1.5 days. **Fix-risk:** low (may break localhost-based testing — add allowlist for dev env).
- **Dependencies:** none (`∥`).
- **Verify:** unit tests: `http://127.0.0.1`, `http://[::1]`, `http://169.254.169.254`, `http://localhost` rejected; redirect-to-private rejected.

### R04 — Kill or flag the fabricated-data endpoints (CRITICAL, architecture audit)

- **Finding:** all 10 `/api/admin/intelligence/*` autonomous modules return **hardcoded demo data** (fake leads `HVP-001 TechGrowth Inc.`, fake trends `IT-001`, "$2.1B in 2026"), rendered by 10 admin pages as real.
- **Fix:** quickest: block the routes in production (return 410/`dataSource:'DEMO'`) and add `dataSource: 'DEMO'` to every payload; proper: delete `autonomous/` + `intelligence.controller.js` + 10 admin pages until real pipelines exist. Do not fix the fake data — it must not exist as "real".
- **Files:** `routes/intelligence.routes.js`, `controllers/intelligence.controller.js`, `autonomous/*`, frontend `pages/admin/intelligence/*`.
- **Effort:** 0.5–1 day. **Fix-risk:** none. **Priority:** CRITICAL.
- **Dependencies:** none (`∥`).
- **Verify:** any `GET /api/admin/intelligence/*` in production → 410 or `dataSource:'DEMO'`; grep `src/autonomous` shows no caller in the product domain.

---

## 3. Phase 1 — Data Integrity (sprints 1–2)

### R05 — Restore the scraper return contract (P1, research audit)

- **Finding:** `scrapeWebsite()` returns `{title, metaDescription, heroText, headings, features, benefits, pricingText, ...}` but **no `html` and no `text`**; consumers `research-orchestrator.service.js:60` (`detectTechnologyStack(scrapedContent?.html)`) and `:405` (keywords from `websiteContent.text`) therefore always receive undefined → tech detection always `[]`, website keywords never collected.
- **Fix:** add `html` and `text` (`rawMarkdown` fallback) to every scraper return object (Jina/Firecrawl/Cheerio, `scraper.service.js:358-372, :468-482, :530-544, :643-657`); make orchestrator use `rawMarkdown || text` defensively at both call sites. Add a shape guard (assert both fields exist) to catch regressions.
- **Files:** `domains/research/services/scraper.service.js`, `services/intelligence/research-orchestrator.service.js`.
- **Effort:** 0.5–1 day. **Fix-risk:** low. **Priority:** P1.
- **Dependencies:** none (can start in Phase 0 if time permits).
- **Verify:** unit test: fake scrape result contains `html`; integration: `detectTechnologyStack` returns ≥1 signature on a real site (e.g. example.com); keyword rows sourced from website text appear.

### R06 — EvidenceSnapshot dedupe + stop the shadow write (P1, research audit)

- **Finding:** two writers always `create`, never upsert (`evidence.service.js:22, :124`) → rows accumulate; and `growthWorkspace.service.js:1182-1228` writes a mostly-empty post-commit snapshot that becomes the "latest" read by `:1735-1738` — shadowing the rich scraper snapshot.
- **Fix:** upsert key `(chatId, websiteUrl)`. Merge before write: post-analysis snapshot should carry forward non-null fields from the existing latest row instead of `|| {}`. Delete the second writer or fold it into one `saveEvidenceSnapshot(chat, merge=true)`.
- **Files:** `modules/evidence/evidence.service.js` (+ `domains/research/services/evidence.service.js` twin), `modules/growth-workspace/growthWorkspace.service.js:1182-1228, :1735-1738`.
- **Effort:** 1 day. **Fix-risk:** medium (two implementations — see R15 for unification; do R06 against the module used by growth workspace first).
- **Dependencies:** none.
- **Verify:** run growth analysis twice → exactly 1 snapshot row per `(chatId, websiteUrl)`; snapshot read by `getGrowthWorkspaceResults` contains scraper evidence (pricingText, technology, robots) — not nulls.

### R07 — Pass `chatId` into `collectBusinessIntelligence`; gate confidence on source count (P1, research audit)

- **Finding:** `growthWorkspace.service.js:269-275` calls `collectBusinessIntelligence` without `chatId` → EvidenceSnapshot load skipped, all 4 collectors run on null text, yet `synthesizeWithAI` stamps confidence 85/90/85/80/75/80 based only on `sources.length`.
- **Fix:** pass `chatId`; load latest snapshot before collectors run (`business-intelligence.service.js:48-81` already has the path — fix the caller); skip confidence stamping entirely when `sources.length === 0` (emit `confidence: null`), and base confidence on source count *min(evidenceQuality, …) instead of hardcoded constants.
- **Files:** `modules/growth-workspace/growthWorkspace.service.js:269-275`, `services/intelligence/business-intelligence.service.js`.
- **Effort:** 0.5–1 day. **Fix-risk:** low–medium (confidence contract change; consumers must render null gracefully — check `normalizeGrowthResults`).
- **Dependencies:** R06 (so the loaded snapshot is rich).
- **Verify:** unit: call with chatId → snapshot loaded; empty sources → confidence null; growth run output no longer claims 85–90 on empty inputs.

### R08 — Wire up `buildSEOEvidenceData` (P1, research audit)

- **Finding:** `seoIntelligence.service.js:94-95` calls `buildSEOEvidenceData(snapshot)` where `snapshot.evidence` never exists → returns null → all `safeSeoScores` null → UI shows "Score: Not yet available".
- **Fix:** either make the evidence snapshot expose a real `.evidence` field populated from the evidence module's schema/opengraph/robots results, or change `buildSEOEvidenceData` to read the actual evidence tables (`EvidenceSnapshot.technicalSeoEvidence` etc.). Then persist `seoScore`.
- **Files:** `domains/seo/services/seoIntelligence.service.js:94-95, :373-382`, evidence module output.
- **Effort:** 1 day. **Fix-risk:** medium (evidence shape uncertainty — verify what columns `EvidenceSnapshot` actually has before choosing).
- **Dependencies:** R06 (stable snapshot shape).
- **Verify:** run SEO analysis → `safeSeoScores` populated; `seoScore` persisted non-null; UI shows a score.

### R09 — Fix the broken crawler tier (P1, research audit)

- **Finding:** Playwright not in `package.json` → dynamic import always throws (`scraper.service.js:552-556`); Tavily-as-scraper is a placeholder returning null unconditionally (`:666-682`); Cheerio `fetch(url, { timeout })` uses node-fetch v3 where `timeout` is silently ignored → can hang forever (`:395-398`).
- **Fix:** decide: (a) `npm i playwright` + proper browser lifecycle (always `browser.close()` on error, `:560-567`), or (b) delete the slot. Do **delete the Tavily placeholder** regardless. Replace Cheerio timeout with `AbortSignal.timeout(10000)`.
- **Files:** `domains/research/services/scraper.service.js`, `backend/package.json`.
- **Effort:** (a) 1–1.5 days incl. install/browser download, (b) 0.5 day. **Fix-risk:** low.
- **Dependencies:** none.
- **Verify:** unit: Cheerio aborts at 10 s on a hanging host (test with unroutable IP); scrape a JS-heavy page (if (a)) returns content; no code path references Tavily scraper.

### R10 — Confidence policy sweep (P1–P2, research audit)

- **Finding:** hardcoded confidence everywhere: Tavily 55–70 (`tavily.service.js:136-145`), personas 55–90, BI 75–90, features 100, keywords AI-estimate 30, action-plan gaps **100 on missing data** (`action-plan.service.js:53, :85, :135, :205`), DataForSEO metric rows 100 (`dataforseo.service.js:270, :329, :395, :445, :933, :959`).
- **Fix:** introduce `computeConfidence({ source, corroborations, recency, completeness })` (pattern exists in `competitor-discovery.service.js:613` and marketDiscovery — promote it to a shared util). Replace constants per site; invert the action-plan logic so **missing data → low/null confidence**. Where a fix is deferred, mark `confidence: null` rather than fake numbers.
- **Files:** new `services/intelligence/confidence.service.js` + all stamping sites above.
- **Effort:** 2–3 days. **Fix-risk:** medium (API contract: consumers must tolerate null — audit `normalizeGrowthResults`, executive-story, report templates).
- **Dependencies:** R07 (BI), R05 (source quality available).
- **Verify:** unit tests per collector: 0 sources → null; 1 low-quality source → ≤40; corroborated multi-source → ≥70. Growth output shows no confidence > 60 on any field fed only by templates.

---

## 4. Phase 2 — Consolidation (sprints 3–5)

### R11 — Single AI router (D1, architecture audit)

- **Finding:** `ai/services/aiRouter.service.js` (raw fetch; Groq→Gemini→OpenRouter→OpenAI; timeouts; cooldowns) vs `domains/ai/services/aiOrchestrator.service.js` (SDK; Gemini→Groq→Cerebras→DeepSeek→OpenRouter; no timeouts) vs dead `services/aiProvider.service.js`.
- **Fix:** pick `aiRouter` as base (it has timeouts + cooldowns + JSON repair); fold in Cerebras/DeepSeek support and the `response_format`-gating fix (R17) from `aiOrchestrator`; rewire aiOrchestrator consumers (~20 files) to the unified router via a thin compat wrapper, then delete `aiOrchestrator` and `aiProvider`.
- **Files:** `ai/services/aiRouter.service.js`, `domains/ai/services/aiOrchestrator.service.js`, consumers.
- **Effort:** 2–3 days. **Fix-risk:** medium-high (20 consumers; do with a test harness that stubs all providers).
- **Dependencies:** R17 fixes folded in.
- **Verify:** all content/email/campaign automation paths return 200 with a stubbed provider set; no imports of `aiOrchestrator` remain.

### R12 — Single SEO implementation (D3, architecture audit)

- **Finding:** live wrapper `domains/seo/services/seoIntelligence.service.js` + `services/seo/seo-orchestrator.service.js` vs dead `modules/seo-intelligence/seoIntelligence.service.js` (71 KB), dead `ai/services/seoIntelligence.service.js` ↔ `domains/seo/services/seo.service.js` mutual-import pair, dead pipelines (`keyword-pipeline`, `competitor-pipeline`, `seo-provider-capability-manager`, `executive-dashboard.service.js`).
- **Fix:** keep `domains/seo` + `services/seo` chain; delete the dead files; fix `seo.controller.js:51` statusUrl pointing at the unmounted `/api/jobs` router (point at the real queue endpoint or remove).
- **Files:** as listed + `controllers/seo.controller.js`.
- **Effort:** 1–2 days (mostly deletion + one status fix). **Fix-risk:** low (dead files have no importers — verify with `check-module-imports.mjs` after R27).
- **Dependencies:** R27 (working import checker to prove no importers).
- **Verify:** `rg "modules/seo-intelligence"` → 0; SEO run works end-to-end; status polling returns 200.

### R13 — Single product analysis (D2, architecture audit)

- **Finding:** 5 implementations: live `ai/services/productAnalysis.service.js`, dead `domains/content/services/productAnalysis.service.js` (22.9 KB), `product.controller.js` inline, `analysis.controller.js`, `modules/product-intelligence/product.service.js`.
- **Fix:** keep the one wired to the frontend's `product-intelligence` page; delete the rest; unify market discovery (2 impls) and audience intelligence (2 impls) similarly.
- **Files:** as listed.
- **Effort:** 1 day. **Fix-risk:** low (pick by route usage: `GET` which endpoint `ProductIntelligencePage` calls).
- **Dependencies:** R01 (analysis path correctness) so the survivor is actually healthy.
- **Verify:** one endpoint per capability; frontend product page functional.

### R14 — Unify Brevo + email interfaces (D4, D5, architecture audit)

- **Finding:** two same-named `brevo.provider.js` files (`services/providers/email/` vs `services/providers/brevo/`) imported together in `automation.controller.js:1344`; two interface files (`email-provider.interface.js` + `email-provider-interface.js`); legacy seam `email-service-legacy.js` still used.
- **Fix:** one provider file with both transactional + campaign APIs; one interface; delete legacy seam; fix the broken test import `src/__tests__/email-workflow.test.js:26` (`services/integrations/email/brevo.provider.js` doesn't exist — this is what crashes `check-module-imports.mjs`).
- **Files:** both `brevo.provider.js`, both interface files, `email-service-legacy.js`, `src/__tests__/email-workflow.test.js`.
- **Effort:** 1 day. **Fix-risk:** medium (delivery paths; keep registry indirection until tests pass).
- **Dependencies:** none.
- **Verify:** email send via registry works with either provider selected; `node scripts/check-module-imports.mjs` passes (with R27).

### R15 — Unify evidence + single PageSpeed (D6, D7, D8 + research §8)

- **Finding:** 2 evidence services (`domains/research/services/evidence.service.js` vs `modules/evidence/evidence.service.js`), 2 `buildEvidenceContext` signatures, 3 evidence-graph builders, 3 PageSpeed implementations (`providers/pagespeed.service.js` cached vs `modules/evidence/pageSpeedEvidence.service.js` uncached vs `technical-seo-analyzer.service.js`).
- **Fix:** one evidence service (keep `modules/evidence` as it's the growth-workspace consumer), one graph builder (`unified-evidence-graph.service.js`), one PageSpeed module used by all three callers (reuse `providers/pagespeed.service.js` with its retry + cache; delete the other two).
- **Files:** as listed.
- **Effort:** 2 days. **Fix-risk:** medium — this is also a behavior change (caching shared), verify SEO scores don't regress (R08).
- **Dependencies:** R08, R12.
- **Verify:** one import site per capability; PageSpeed called once per unique URL per run (instrument counters in dev).

### R16 — Remove or flag fabricated branches (P2, research audit)

- **Finding:** hardcoded persona templates + silent Tech fallback (`audience-intelligence.service.js:32-125`), fabricated `investmentTrends` from keyword match (`market-intelligence.service.js:163-175`), hardcoded competitor tech stacks injected as measured (`competitor-intelligence.service.js:259-291`), `hasAPI` always false (`executive-story.service.js:95`), domain fabrication (`name.com`, `*.github.io`) in competitor discovery (`competitor-discovery.service.js:275, :390, :496`).
- **Fix:** per branch: (a) delete, (b) mark `dataSource:'synthetic'` + reduce confidence, or (c) compute honestly. Minimum viable: (b) for persona fallback + investmentTrends + tech stacks; (c) for domains — resolve/fetch before emitting, else drop the candidate.
- **Files:** as listed.
- **Effort:** 2 days. **Fix-risk:** low (output-only changes).
- **Dependencies:** R10 (confidence policy gives the honest numbers).
- **Verify:** growth output contains no `name.com`-pattern domain that isn't HTTP-200-fetchable; personas only for matching industries; `dataSource` field present in all synthetic rows.

### R17 — Fix aiOrchestrator contract + provider gating (P2, research audit)

- **Finding:** `success:true, data:null` on empty/unparseable responses (`aiOrchestrator.service.js:304`); `response_format: json_object` sent to **all** providers (`:165`) — DeepSeek/Cerebras/OpenRouter may reject; cross-provider model default `gemini-1.5-flash` (`:163`); `temperature` logged but never applied (`:219`); `schema` param ignored (`:93`); email-campaign-generator passes an **array** prompt → `prompt.substring` TypeError (`email-campaign-generator.service.js:596-599`).
- **Fix:** `success:false` + explicit error on null data; gate `response_format` per provider capability map; remove the latent cross-provider model default; apply temperature; either implement schema or stop advertising it; `String(prompt)` guard in email-campaign-generator (and validate its caller — likely passing an array of sections).
- **Files:** `domains/ai/services/aiOrchestrator.service.js`, `modules/email-campaign/email-campaign-generator.service.js` (path TBD from audit), consumers handling `success:true&&data===null`.
- **Effort:** 1.5 days. **Fix-risk:** medium (contract change ripples to ~20 consumers; grep `success` handling).
- **Dependencies:** none (but fold into R11 if router unification goes first).
- **Verify:** stub providers to return empty strings → caller sees `success:false`; email campaign generation with array prompt no longer throws.

### R18 — Per-run dedupe + caching for research calls (P2, research audit)

- **Finding:** ~30 Tavily + 8–13 DataForSEO + 2 PageSpeed + up to 4 scraper attempts per growth run, no dedupe across phases; EvidenceSnapshot rows accumulate (R06 covers); PageSpeed triple-fetch (R15 covers).
- **Fix:** request-scoped memo (AsyncLocalStorage or a `Map` keyed by stable-hash of {provider, query, locale, device} passed through the orchestrator chain) + persisted cache with TTL for Tavily/DataForSEO responses (mirror the SEO router's 24-h cache). Skip repeated queries within a run.
- **Files:** new `utils/request-memo.js`, `services/intelligence/research-orchestrator.service.js`, `providers/tavily.service.js`, `providers/dataforseo.service.js`, `providers/competitor-discovery.service.js`.
- **Effort:** 2–3 days. **Fix-risk:** medium (shared cache must respect query params — unit test with same/different queries).
- **Dependencies:** R15.
- **Verify:** instrument provider entry points; growth run shows unique query count, not 30 Tavily calls; second run within TTL issues 0 external calls.

---

## 5. Phase 3 — Structure & Hardening (month 2)

### R19 — Fix route architecture (HIGH, architecture audit)

- **Finding:** 12 routers stacked on `/api/chats`; 2 confirmed shadowing bugs (`GET /:chatId/email-campaign/segments` shadowed `email-campaign.routes.js:46 vs 394`; `GET /:chatId/crm/import/jobs` shadowed `crm.routes.js:132-133`).
- **Fix:** mount modules on explicit prefixes (`/api/seo/:chatId/...`, `/api/crm/:chatId/...`, `/api/growth/:chatId/...`, `/api/email/:chatId/...`) with a migration window where old paths 301. Immediately: reorder the 2 shadowed route pairs. Add a route-shadow detector script (walk mount tree, report duplicate patterns) to CI.
- **Files:** `server.js`, all 12 routers, frontend `lib/api.ts` call sites.
- **Effort:** 2–3 days + frontend path updates. **Fix-risk:** medium-high (coordinate frontend deploy).
- **Dependencies:** none.
- **Verify:** `GET /:chatId/crm/import/jobs` and `GET /:chatId/email-campaign/segments` reachable; shadow-detector exits 0; e2e smoke of each module route.

### R20 — Break the god-files (architecture audit)

- **Finding:** growthWorkspace.service.js (107 KB), campaign-intelligence.service.js (79.5 KB), executive-dashboard-generator.service.js (79 KB), content-studio.service.js (68 KB), report-templates.service.js (67 KB), automation.controller.js (50 KB).
- **Fix:** extract along existing seams: growthWorkspace → `research/`, `intelligence/`, `fallback/`, `persistence/` (the audit's 6-stage pipeline is the seam map); campaign-intelligence → per-analyzer files; content-studio → per-agent helpers; automation.controller → service. Pure refactor — no behavior change, verified by existing routes.
- **Files:** the 6 files + new modules.
- **Effort:** 1–2 weeks. **Fix-risk:** low (refactor-only; rely on route smoke tests).
- **Dependencies:** R12/R13 (so refactors target the surviving implementations).
- **Verify:** `git diff` with no behavior markers; smoke test all routes per file; file sizes < 30 KB each.

### R21 — Brain decision: wire it or quarantine it (architecture audit)

- **Finding:** brain/ (60+ files, 15 engines, 12 agents, ~500 KB) + knowledge graph + learning engine have **zero production consumers**; `brainMiddleware` is a no-op; only admin APIs touch them; Graph/Brain tables stay empty.
- **Fix:** pick one: (a) **wire** — make `research-orchestrator` write entities/relationships to the graph (`EntityGraphService.updateFromEvidence` exists) and read recommendations in prompts; (b) **quarantine** — gate all `/api/brain*`, `/api/admin/brain*` behind a feature flag, stop booting engines at startup, document as experimental. Recommend (b) first, (a) later behind the flag. Do not leave half-integrated.
- **Files:** `server.js` (boot), `middleware/brainMiddleware.js`, `routes/brain.routes.js`, `routes/admin.brain.routes.js`.
- **Effort:** (b) 0.5 day; (a) 2–3 days. **Fix-risk:** (b) low; (a) medium.
- **Dependencies:** R05 (graph ingestion needs real scraper data).
- **Verify:** (b) flag off → zero `brain/*` boot time; (a) growth run creates ≥1 `GraphEntity` row.

### R22 — Frontend dead-code cleanup (architecture audit)

- **Finding:** ~16k of 33,802 lines unreachable, documented in `frontend/tsconfig.json` excludes; `Math.random()` difficulty in `GrowthWorkspacePage.tsx:606`; `lib/api/example.functions.ts` imports `@tanstack/react-start` (not in package.json); duplicate committed folder `ai_marketing_platform_dashboard_fixed (3)/market-genesis-ai-main` (50,731 files) at repo root.
- **Fix:** delete files listed in tsconfig excludes (or restore the `@tanstack` packages and keep — choose per file); replace `Math.random()` with real scores from the API (ties to R10); remove the committed dashboard copy; re-enable tsconfig strictness in increments.
- **Files:** `frontend/tsconfig.json`, `frontend/src/**` per manifest, repo-root stray folder.
- **Effort:** 2–3 days. **Fix-risk:** low–medium (build might surface latent breakage — good, that's the point).
- **Dependencies:** R10 (scores), R19 (path changes).
- **Verify:** `tsc --noEmit` passes with excludes removed in stages; bundle size before/after; `GrowthWorkspacePage` shows API-derived difficulty.

### R23 — Security hardening batch (MEDIUM items, architecture audit)

- **Finding:** Brevo webhook HMAC optional + computed over re-serialized body (`email-campaign.routes.js:509-620`); `req.user` carries bcrypt hash (`auth.middleware.js:67`); role claim trusted 7 days; logout no-op; port-killing startup (`server.js:124-162`); rate limiters disabled outside production (`server.js:203-229`); `.env*` files committed.
- **Fix:** require HMAC over the raw body buffer; strip `password` from `req.user`; re-validate role from DB on admin routes; make logout revoke the JWT (token version column or short TTL); remove `killProcessOnPort` from production boot; enable limiters in all envs; remove `.env` files from repo + add `.gitignore`; PII: stop logging email bodies.
- **Files:** as listed.
- **Effort:** 2 days. **Fix-risk:** low–medium (limiter tuning).
- **Dependencies:** none.
- **Verify:** webhook with wrong HMAC → 403; `/api/auth/me` response contains no `password`; demoted admin loses access within token TTL; boot on port 5000 no longer kills anything.

### R24 — Validation coverage (architecture audit)

- **Finding:** 38 CRM endpoints have no zod validation; email-campaign (20+), evidence, growth-workspace, copilot endpoints likewise.
- **Fix:** extend the existing `middleware/validate.js` (zod) to all listed routers; add ownership checks (`chatId` belongs to `req.user.id`) to the routers missing them (12 routers on `/api/chats` each do it inconsistently).
- **Files:** `crm.routes.js`, `email-campaign.routes.js`, `evidence.routes.js`, growth-workspace routes, `sales-copilot.routes.js`, `middleware/validate.js`.
- **Effort:** 2–3 days. **Fix-risk:** low (rejections only for malformed input; run against test traffic).
- **Dependencies:** R19 (route rework reduces churn).
- **Verify:** invalid payloads → 400 with zod message; cross-chat access → 403.

---

## 6. Phase 4 — Scale & Observability (quarterly)

### R25 — Persistent provider telemetry (P3, research audit)

- **Finding:** zero persistent success/failure/latency tracking — only in-memory latches and console.log. The audit's "success rate" column is a guess.
- **Fix:** `ProviderHealth` Prisma table (or Redis counters with daily flush): provider, operation, success, latencyMs, fallbackTriggered, errorClass. Emit from a small wrapper used by every provider. Expose `GET /api/admin/provider-health` and surface in the existing diagnostics page.
- **Files:** new `services/observability/provider-telemetry.js`, `config/prisma.js` schema addition, all provider files (thin wrapper).
- **Effort:** 2 days. **Fix-risk:** low.
- **Dependencies:** none (can start early; useful for validating R18).
- **Verify:** run growth analysis → rows appear; failure rate before/after R18 dedupe measurable.

### R26 — GSC + SerpAPI + DataForSEO reliability fixes (P3, research audit)

- **Finding:** GSC returns `success:true, status:"measured"` with all sub-queries failed (`googleSearchConsole.service.js:179-218`); SerpAPI `retryAfter:60` never honored (`serpapi.service.js:246-248`); DataForSEO reconnect probe fires during the 402 circuit and re-blocks (`dataforseo.service.js:1025`).
- **Fix:** GSC: `success = all five sub-queries succeeded` (or partial flag `status:'partial'`); SerpAPI: honor `retryAfter` with a real sleep/cooldown; DataForSEO: skip the probe while circuit open.
- **Files:** `providers/googleSearchConsole.service.js`, `services/serpapi.service.js`, `providers/dataforseo.service.js`.
- **Effort:** 1 day. **Fix-risk:** low.
- **Dependencies:** none.
- **Verify:** unit tests: GSC 4/5 fail → `status:'partial'`; SerpAPI 429 → no immediate retry; DataForSEO circuit open → zero probes.

### R27 — Fix CI gates (prereq for everything)

- **Finding:** `node scripts/check-module-imports.mjs` crashes with `ENOENT` on `services/integrations/email/brevo.provider.js` imported by `src/__tests__/email-workflow.test.js:26` → module integrity never verifiable.
- **Fix:** repair the broken import (R14) or make the checker skip/resolve test aliases; add `eslint no-undef` + `tsc --noEmit` (backend: `--checkJs` or add a JSDoc pass) so the R01 class of bug dies on CI. Wire all into `npm test` / CI.
- **Files:** `scripts/check-module-imports.mjs`, `src/__tests__/email-workflow.test.js`, CI config.
- **Effort:** 0.5–1 day. **Fix-risk:** none.
- **Dependencies:** R14 (import fix) optional.
- **Verify:** `node scripts/check-module-imports.mjs` exits 0; a deliberate bad import fails CI.

### R28 — Process separation + caching (architecture audit §7.9-7.10)

- **Finding:** single process runs web + 5 workers × concurrency 5 + brain + schedulers; Redis-down silently falls back to sync execution; no DLQ; report builder uncached/unpaginated; in-memory cooldown state lost on restart.
- **Fix:** separate web/worker/brain processes (env flag per role); production mode requires Redis (fail fast); add DLQ per queue + retry observability; memoize report-builder data (hash of chat + intelligence version); paginate report queries; bounded-concurrency Promise.all in content generation.
- **Files:** `server.js`, `jobs/*`, `config/redis.js`, `report-builder.service.js`.
- **Effort:** 1–2 weeks. **Fix-risk:** high (deployment topology change — last item, schedule accordingly).
- **Dependencies:** all phases above (codebase stability first).
- **Verify:** deploy split processes; kill Redis → requests fail fast with 503, not sync hang; DLQ captures failed jobs; report build with unchanged data serves from cache.

---

## 7. Explicitly Not To Fix — Delete or Quarantine

| Item | Reason | Action |
|---|---|---|
| `autonomous/*` hardcoded modules | Fabricated data, no real pipeline | Delete (R04) |
| `modules/seo-intelligence` (71 KB) | Dead, 0 importers | Delete (R12) |
| `services/aiProvider.service.js` (31 KB) | Dead, 0 importers | Delete (R11) |
| `providers/ahrefs.service.js`, `semrush.service.js` | Dead | Delete |
| `jobs/scheduler.js` + `AutonomousScheduler` | Never started; double-scheduling risk | Delete (R23 cleanup) |
| `GrowthSprint`, `GrowthTask` models | Zero references | Drop via migration |
| `frontend/tsconfig.json` excluded files (~16k lines) | Unreachable | Delete or restore deps (R22) |
| Repo-root `ai_marketing_platform_dashboard_fixed (3)` folder | Committed duplicate (50,731 files) | Delete |
| `repositories/`, `database/`, `validators/` empty dirs | Scaffolding remnants | Delete |
| `.env*` committed files | Secret exposure | Remove + gitignore (R23) |
| `email-service-legacy.js` seam | Superseded | Delete (R14) |

## 8. Sequencing Summary (dependency-aware)

```
R01 ─┬─ R07 ─┬─ R10 ── R16
     │       │        │
     ├─ R06 ─┤        └─ R22
     │       └─ R08 ── R15 ── R18
     │
     ├─ R05 (can start day 1)
     ├─ R02 · R03 · R04 (parallel, day 0–3)
     │
R27 (CI) ── unblocks verification of every deletion (R12/R13/R14/R22)
R11 ── R17 ── (R17 feeds R11)
R19 ── R24 ── R20
R23 · R25 · R26 · R28 (independent; R25 early to measure R18)
```

**Suggested start:** R01 + R02 + R03 + R04 + R27 in week 1; R05/R06/R07 week 2; R10 + R16 in sprint 3; consolidation (R11–R15) sprints 4–6.

---

## 9. Definition of Done (global)

- `node scripts/check-module-imports.mjs` exits 0; backend and frontend type/lint checks pass in CI.
- No endpoint returns 500 for valid input (R01 regression suite).
- No fabricated data path is reachable without an explicit `dataSource: 'synthetic'` marker.
- No capability has more than one live implementation (grep-audit script in CI).
- Provider success/failure/latency is visible in a persistent table.
- Every fix in this plan is closed with its "Verify" step recorded (test or manual check) in the PR.
