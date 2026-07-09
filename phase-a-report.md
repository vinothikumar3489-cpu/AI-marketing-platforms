# Phase A — Critical Blockers Implementation Report

## Files Modified

### Backend (12 files)

| File | Change |
|------|--------|
| `backend/src/utils/http.util.js` | **NEW** — Shared HTTP utility with `fetchText()` and `fetchJson()`, timeout+error handling |
| `backend/src/utils/evidence-logger.js` | **NEW** — Structured logger: `logEvidenceError()` and `logEvidenceInfo()` with source/URL/error/userId/chatId |
| `backend/src/modules/evidence/robotsEvidence.service.js` | Uses shared `fetchText`, added structured error logging |
| `backend/src/modules/evidence/sitemapEvidence.service.js` | Uses shared `fetchText`, added structured error logging |
| `backend/src/modules/evidence/pageSpeedEvidence.service.js` | Uses shared `fetchJson`, added structured error logging |
| `backend/src/modules/evidence/githubEvidence.service.js` | Uses shared error logger; contributor count returns `null` on failure/rate-limit |
| `backend/src/modules/evidence/websiteEvidence.service.js` | Added structured error logging |
| `backend/src/modules/evidence/evidence.service.js` | Added structured error logging for collection/save/read |
| `backend/src/services/intelligence/audience-intelligence.service.js` | Removed all invented budgets, demographics, LTV, intent levels, company sizes, buying committees. Personas now include only: role, pain points, goals, objections, preferred content, evidence source, confidence |
| `backend/src/services/seo/keyword-intelligence.service.js` | Complete rewrite: no fabricated volume/difficulty/CPC/competition. Without DataForSEO: `metricType: 'topic_idea_only'`, all metrics null. With DataForSEO: `metricType: 'verified_keyword_metric'`. Removed `generateSmartKeywordVariations`, `generateCompetitiveKeywords`, `estimateDifficulty`, category seed keyword fabrication. Added `markAsTopicIdeas()` and `enrichWithDataForSEO()` |
| `backend/src/controllers/automation.controller.js` | Added `getEvidenceContext` endpoint; `executeSingleModule` now uses `buildEvidenceContext` |
| `backend/src/routes/automation.routes.js` | Added `GET /api/automation/:chatId/evidence-context` route |

### Frontend (2 files)

| File | Change |
|------|--------|
| `frontend/src/lib/api.ts` | Added `getEvidenceContext()`, `generateExecutionModule()`, `getExecutionData()` API functions |
| `frontend/src/components/AIContentStudio.tsx` | **Complete rewrite** — Removed all template-based generators (`generateContent`, `generateEmail`, `generateSocial`, `generateCreative`, `generateVideo`, `generateCampaign`) and frontend `collectEvidence()`. Now fetches evidence context from backend on mount, calls `generateExecutionModule()` API for real content generation. Added `EvidencePanel` showing product evidence (hero text, CTAs, pain points, SEO issues, sources) |

## Bugs Fixed

| Bug | Fix |
|-----|-----|
| AIContentStudio template-based fake AI generation | Replaced all `setTimeout` generators with real backend API calls via `POST /api/automation/:chatId/execute/:module` |
| Audience intelligence hallucinated personas with invented budgets/LTV | Removed all `budget`, `lifetimeValue`, `companySize`, `techMaturity`, `intent`, `decisionAuthority`, `demographics` from ICP patterns. Personas now contain only role, pain points, goals, objections, preferred content, evidence source |
| Keyword intelligence fabricated volume/difficulty/CPC/competition | Without DataForSEO: all metrics null, `label: 'topic idea only'`. With DataForSEO: `label: 'verified keyword metric'`. Removed `estimateDifficulty()`, `generateSmartKeywordVariations()`, hardcoded seed keyword scoring |
| GitHub contributor count shows wrong value when API fails | Return `null` when API is rate-limited or unavailable |
| FetchText duplicated across 4+ evidence modules | Centralized in `src/utils/http.util.js` with timeout + error handling |
| Evidence collection silent error handling | All evidence modules now call `logEvidenceError()` with structured source/URL/error |
| executeSingleModule missing evidence context | Now calls `buildEvidenceContext(prisma, userId, chatId)` and passes it to execution services |

## Old vs New Behavior

### AIContentStudio
- **Old**: `collectEvidence(fullResults)` extracted weak frontend data; each tab used template-based generators with `setTimeout()` simulating AI; content was generic placeholder text
- **New**: Loads evidence context from backend `GET /api/automation/:chatId/evidence-context`; each tab calls `POST /api/automation/:chatId/execute/:module` for real AI generation with product evidence; `EvidencePanel` shows what data is available

### Audience Intelligence
- **Old**: Personas included invented `budget: '$50k-$500k annually'`, `lifetimeValue: '$150k-$1.5M'`,  `intent`, `companySize`, `techMaturity`, `decisionAuthority`, `buyingCommittee` — all fabricated
- **New**: Personas only include `role`, `painPoints`, `goals`, `objections`, `preferredContent`, `evidence` (source + confidence). All budget/LTV/demographics fields set to `null`

### Keyword Intelligence
- **Old**: Without DataForSEO, returned fabricated `searchVolume: 0`, `difficulty: 0`, `cpc: 0`, `competition: 'Unknown'` via `estimateDifficulty()` and `generateSmartKeywordVariations()`; fallback to category seed keywords with fake confidence scores
- **New**: Without DataForSEO, every keyword has `metricType: 'topic_idea_only'`, `searchVolume: null`, `keywordDifficulty: null`, `cpc: null`, `competition: null`; with DataForSEO, enriched keywords have `metricType: 'verified_keyword_metric'`. Removed all `generateSmartKeywordVariations()`, `generateCompetitiveKeywords()`, `estimateDifficulty()`

### GitHub Contributors
- **Old**: `contributorsCount: data.length` — returned 1 (the page count) even when API failed or returned empty
- **New**: Returns `null` when rate-limited or API unavailable; only returns actual count when array data is valid

## Remaining Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Evidence context endpoint requires authentication | None | Uses existing `requireAuth` middleware, scoped by userId |
| Content generation module may fail if automation plan not generated yet | Low | Empty states and error messages shown in UI |
| Keyword intelligence still uses GROQ for AI extraction (cost) | Low | Falls back to category-based topic ideas if GROQ unavailable |
| Audience intelligence personas are still industry-pattern-based | Low | Pattern 0-3 generic roles per industry; explicitly labeled as "industry_evidence_pattern" with confidence 55-70 |
| Email send test, poster image generation, video rendering unchanged | None | These already call backend APIs, no templates involved |

## Manual Test Steps

1. **Evidence context endpoint**
   - Open browser to `GET /api/automation/:chatId/evidence-context` (authenticated)
   - Response should include `company`, `product`, `website`, `audience`, `competitors`, `seo`, `channels`, `growth`, `sourceSummary`
   - When no data exists, all fields should be `null` or empty arrays

2. **AIContentStudio**
   - Navigate to Content & Campaign Studio page
   - Evidence panel should appear showing product data (or "No evidence data" warning)
   - Enter a topic and click Generate — content should come from backend API
   - Without evidence: warning shown, API returns error with clear message

3. **Keyword intelligence**
   - Run SEO Intelligence for a new domain without DataForSEO configured
   - Verify all keyword metrics are `null` and each keyword has `metricType: 'topic_idea_only'`
   - No fake `searchVolume`, `difficulty`, `cpc`, or `competition` values

4. **Audience intelligence**
   - Run analysis and inspect `audienceIntelligence` response
   - Personas should have only: `role`, `painPoints`, `goals`, `objections`, `preferredContent`, `evidence`
   - No `budget`, `lifetimeValue`, `companySize`, `techMaturity`, `demographics` fields with invented values

5. **GitHub evidence**
   - Test with a repo URL and no GITHUB_TOKEN configured
   - Should return `error: "No GITHUB_TOKEN configured"`, no fake data
