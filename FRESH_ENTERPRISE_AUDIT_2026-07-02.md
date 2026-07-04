# Enterprise Production Hardening Audit — July 2, 2026

**Based on CURRENT codebase inspection (not previous reports)**

---

## 1. Production Readiness Score

| Category | Score | Trend vs Previous Audit |
|----------|-------|------------------------|
| **Backend** | 55% | Same — duplicate routes still mounted, no Zod validation |
| **Frontend** | 50% | Same — debug panels left in, no error boundaries per tab |
| **Database** | 65% | +5% — Cascade deletes confirmed correct on SEO models |
| **API Layer** | 45% | Same — duplicate legacy SEO routes still responding |
| **Authentication** | 55% | -5% — JWT_SECRET is weak numeric string |
| **Workflow Engine** | 70% | +70% (new in this build) — functional 5-step workflow |
| **Automation Center** | 65% | Same — functional but unhandled rejections |
| **AI Router** | 70% | -5% — parallel aiProvider.service.js still NOT consolidated |
| **Security** | 30% | -5% — API keys exposed, debug panels, weak JWT |
| **Performance** | 30% | Same — no caching, no pagination, no query optimization |
| **Deployment** | 35% | Same — no monitoring, backup, or rollback plan |
| **Maintainability** | 40% | Same — duplicate files, dead code, 28 doc files |
| **Technical Debt** | 45% | Same — parallel AI routers, legacy route files |
| **Overall** | **48%** | -2% (new issues found, old ones not fixed) |

---

## 2. Critical Issues (Production-Blocking)

### C1. PARALLEL AI ROUTER — NOT CONSOLIDATED
- **Status:** Still Present
- **File:** `backend/src/services/aiProvider.service.js`
- **Root Cause:** This file has its OWN independent 5-provider fallback chain (Cerebras → DeepSeek → OpenRouter → Groq → Gemini) with completely separate provider implementations, error handling, and response parsing from the canonical `aiRouter.service.js` (Gemini → Groq → OpenAI).
- **Impact:** Two independent AI routing systems exist. The canonical `callAI` is used by automation, workflow, and product analysis. The parallel `aiProvider.service.js` is used by Growth Workspace (`growthWorkspace.service.js`). This means Growth Workspace results may differ in quality and behavior from other modules. AI provider configuration is split across two files — updating one misses the other.
- **Safest Fix:** Refactor `aiProvider.service.js` to import and delegate to `callAI` from `aiRouter.service.js`, removing the duplicate provider implementations. This requires changing `growthWorkspace.service.js`'s import to use `callAI` instead.

### C2. DUPLICATE LEGACY SEO ROUTES STILL MOUNTED
- **Status:** Still Present
- **File:** `backend/src/server.js` line 202: `app.use("/api/chats", seoRouter);`
- **Root Cause:** Both `src/routes/seo.routes.js` (legacy, line 15 import) AND `modules/seo-intelligence/seo.routes.js` (modern, line 22 import as `seoIntRouter`) are mounted at `/api/chats`. The legacy router is mounted at line 202 AFTER the modern one at line 195.
- **Impact:** Legacy SEO endpoints respond alongside modern ones. Routes like `GET /:chatId/seo-intelligence/content-gaps` exist in BOTH routers — whichever is registered last wins (legacy, since it's at line 202). This can cause incorrect handler execution.
- **Safest Fix:** Remove the legacy `seoRouter` import and mount (lines 15, 202). Redirect or remove the legacy route file after confirming no frontend code depends on it.

### C3. API KEYS AND SECRETS EXPOSED IN .env
- **Status:** Still Present
- **File:** `backend/.env` — 25 lines of API keys, OAuth secrets, and credentials
- **Root Cause:** The `.env` file contains live production API keys, including Google OAuth client secret, DataForSEO credentials, Groq/Gemini/OpenRouter/OpenAI keys, and others. If this file is committed to version control or exposed, all services are compromised.
- **Impact:** Catastrophic — all third-party API keys can be stolen, leading to financial loss, service suspension, and data breaches.
- **Safest Fix:** Rotate ALL keys immediately. Add `.env` to `.gitignore` (confirm it's already there). Create `.env.example` with placeholder values. Never commit real secrets.

### C4. FRONTEND DEBUG PANEL LEAKS DATA IN PRODUCTION
- **Status:** Still Present
- **File:** `frontend/src/pages/SEOIntelligencePage.tsx` lines 291-309
- **Root Cause:** A DEV debug panel renders `import.meta.env.DEV` — but if the build doesn't properly strip this, or if `NODE_ENV` configuration is wrong, it will render in production.
- **Impact:** Exposes internal state, chat IDs, API response structure, and raw data to end users. Potential security and business logic exposure.
- **Safest Fix:** Remove the debug panel entirely, or wrap it in a proper compile-time guard that's been verified to tree-shake.

### C5. JWT_SECRET IS WEAK 8-DIGIT NUMERIC STRING
- **Status:** Still Present
- **File:** `backend/.env` line 2: `JWT_SECRET=60021103`
- **Root Cause:** The JWT secret is an 8-digit number (10 million combinations), trivially brute-forceable. An attacker who obtains a valid JWT can forge arbitrary tokens.
- **Impact:** Full account takeover — attacker can forge tokens for any user, including admin.
- **Safest Fix:** Generate a strong random secret (64+ chars, alphanumeric + symbols) using `openssl rand -base64 64` or equivalent.

### C6. UNHANDLED PROMISE REJECTIONS IN FRONTEND
- **Status:** Still Present
- **Files:**
  - `frontend/src/pages/AutomationCenterPage.tsx` line 349: `api.get(...).catch(() => {})` — empty catch swallows errors silently
  - `frontend/src/context/AuthContext.tsx` lines 29-39: `.catch()` logs but doesn't handle
  - `frontend/src/context/ProjectContext.tsx` line 212: `.catch(() => {})` — silences errors
- **Root Cause:** Multiple async operations use empty `.catch()` handlers that swallow errors without user feedback.
- **Impact:** Silent failures — users see blank states or infinite spinners with no error message. Debugging is impossible without console inspection.
- **Safest Fix:** Add proper error handling with toast notifications or inline error states.

---

## 3. High Priority Issues

### H1. NO INPUT VALIDATION ON MOST ROUTES
- **Status:** Still Present
- **Files:** All route files except auth use plain Express handlers without Zod or any schema validation
- **Impact:** malformed requests pass through to services, causing cryptic errors or database corruption
- **Safest Fix:** Add Zod schemas to all POST/PUT/PATCH endpoints

### H2. RATE LIMITING IS DISABLED IN DEVELOPMENT AND NOT CONFIGURED FOR PRODUCTION
- **Status:** Still Present
- **File:** `backend/src/server.js` lines 131-146 — rate limiter `skip` returns `true` for non-production
- **Impact:** No rate limiting in development. In production, `max: 100` per 15 minutes is reasonable but the `skip` logic could misfire if NODE_ENV is not set to "production"
- **Safest Fix:** Remove the skip entirely or make it environment-aware with proper validation

### H3. 7 CORE MODELS MISSING INDEXES ON FOREIGN KEYS
- **Status:** Still Present
- **Models:** Chat (userId), Message (chatId), Analysis (chatId, userId), Notification (userId), GrowthSprint (chatId, userId), GrowthTask (chatId, userId, sprintId), AgentRun (chatId, userId)
- **Impact:** Full table scans on every FK-based query at scale. Performance degrades linearly with data growth.
- **Safest Fix:** Add `@@index([userId])` and `@@index([chatId])` to affected models in schema.prisma, then run a migration.

### H4. FRONTEND USES `fetch` INSTEAD OF AXIOS (despite axios in package.json)
- **Status:** Still Present
- **File:** `frontend/src/lib/api.ts`
- **Impact:** No request/response interceptors, no retry/backoff, no request cancellation, no timeout configuration. Network failures are silent.
- **Safest Fix:** Either switch to axios with proper interceptors, or add retry logic, timeout, and cancellation to the existing fetch wrapper.

### H5. DASHBOARD PAGE NAVIGATES TO WRONG SEO URL
- **Status:** Still Present
- **File:** `frontend/src/pages/DashboardPage.tsx` line 28: `navigate('/app/seo-intelligence')` — but the route is `/app/seo` (App.tsx line 36)
- **Impact:** Clicking "SEO" from Dashboard leads to a 404 (catch-all redirects to landing page, losing user context)
- **Safest Fix:** Change to `navigate('/app/seo')`

### H6. ProjectContext RACE CONDITION ON CHAT SWITCHING
- **Status:** Still Present
- **File:** `frontend/src/context/ProjectContext.tsx` — `selectChat` sets state then calls `loadFullResults` which reads `selectedChatId` from closure (may be stale)
- **Impact:** Wrong chat's data may be displayed after rapid switching
- **Safest Fix:** Pass `id` directly to `loadFullResults` instead of relying on closure state

### H7. DEPRECATED AI SERVICE FILES STILL EXIST (Zero Consumers)
- **Status:** Still Present
- **Files:** `backend/src/ai/services/campaignGenerator.service.js`, `backend/src/ai/services/channelRecommendation.service.js`
- **Impact:** Dead code that creates confusion and maintenance burden. Both have `@deprecated` header comments but were never removed.
- **Safest Fix:** Delete both files after confirming no imports reference them.

### H8. NO TOAST / NOTIFICATION SYSTEM FOR ERRORS
- **Status:** Still Present
- **Impact:** Errors are logged to console but never shown to users. Users see blank states or infinite spinners.
- **Safest Fix:** Create a toast notification context and integrate it into the auth context, project context, and all page-level error handlers.

---

## 4. Medium Issues

| # | Issue | File | Detail |
|---|-------|------|--------|
| M1 | No error state tracking in ProjectContext | `ProjectContext.tsx` | Errors are lost — no `error` state field |
| M2 | `AutomationLog` has no cascade from Chat | `schema.prisma` | `AutomationLog.chatId` has no `onDelete: Cascade` — orphan risk |
| M3 | AutomationCenterPage `generate()` has no catch | `AutomationCenterPage.tsx:354` | `await api.post(...)` without try/catch |
| M4 | Multiple AI provider files with same API | `groq.service.js`, `gemini.service.js`, `openai.service.js` | These duplicate the provider calls in `aiRouter.service.js` |
| M5 | `safeParse` recursively parses all object values | `normalizers.ts` | Can corrupt already-valid objects by double-parsing |
| M6 | `hasData` check fragile in SEO page | `SEOIntelligencePage.tsx:195` | `!!seo.scoreBreakdown` — breaks if scoreBreakdown is 0 |
| M7 | No loading state per tab in SEO/Growth pages | `SEOIntelligencePage.tsx` | All tabs share single loading state |
| M8 | CampaignIntelligencePage likely unused | `CampaignIntelligencePage.tsx` | Route exists at `/app/campaigns` but probably never called |
| M9 | ExecutiveStoryPage is duplicate | `ExecutiveStoryPage.tsx` | Duplicates tab within GrowthWorkspace/SEO |
| M10 | No query pagination in chat list | `chat.controller.js` | All chats loaded at once, no limit/offset |
| M11 | `automation.service.js` has source/confidence/isFallback in return | `automation.service.js:494-496` | These fields aren't in Prisma schema — destructured out by adapter |
| M12 | Root test files (11 files) clutter backend | `backend/test-*.js` | 11 test files and debug scripts in backend root |

---

## 5. Low Priority Issues

| # | Issue | Detail |
|---|-------|--------|
| L1 | No `.env` validation on startup | Server starts with missing keys — crashes at first API call |
| L2 | No Helmet CSP configuration | `app.use(helmet())` with no CSP policy |
| L3 | No CSRF protection | All POST/PUT/DELETE endpoints vulnerable |
| L4 | JWT in localStorage (XSS vulnerable) | Token accessible to any JS on the page |
| L5 | No request body size limit on individual routes | Global 10mb limit on all routes (too permissive for some) |
| L6 | Graceful shutdown doesn't close DB connections | `process.exit(0)` doesn't call `prisma.$disconnect()` |
| L7 | No health check includes DB connectivity | `GET /api/health` doesn't verify database connection |
| L8 | No CORS configuration for production domains | Relies on localhost origins only |
| L9 | 28 documentation/report MD files in root | Project root clutter |
| L10 | `src/providers/` files are stubs | 6 provider files with mock implementations |

---

## 6. Dead Code Report

### Unused Routes

| File | Reason | Consumers | Safe to Remove? | Risk |
|------|--------|-----------|-----------------|------|
| `backend/routes/campaignIntelligence.routes.js` | NOT mounted in server.js, uses CommonJS, references non-existent controller | None | YES | Low — controller doesn't exist |
| `backend/src/routes/seo.routes.js` | Legacy, but IS STILL MOUNTED (line 202) | Modern module may override | NO | High — need to verify no FE depends on legacy paths |

### Unused Services

| File | Reason | Consumers | Safe to Remove? | Risk |
|------|--------|-----------|-----------------|------|
| `src/ai/services/campaignGenerator.service.js` | Deprecated, `@deprecated` header, zero imports | None | YES | Low |
| `src/ai/services/channelRecommendation.service.js` | Deprecated, `@deprecated` header, zero imports | None | YES | Low |

### Unused Frontend Files

| File | Reason | Safe to Remove? |
|------|--------|-----------------|
| `CampaignIntelligencePage.tsx` | Route exists but page renders empty/template | YES (after verifying) |
| `ExecutiveStoryPage.tsx` | Duplicated content within GrowthWorkspace/SEO tabs | YES (after verifying) |

### Unused Backend Test/Debug Files (11 files)

`test-ai-provider.js`, `test-blog-intelligence.js`, `test-competitor-seo-intelligence.js`, `test-content-gap-engine.js`, `test-executive-dashboard.js`, `test-geo-intelligence.js`, `test-growth-stress.js`, `test-keyword-intelligence.js`, `test-seo-stress.js`, `debug-prisma-models.js`, `patch_seo_save.js`

**All safe to remove** — standalone test scripts, no consumers.

### Unused Provider Stubs (6 files)

`src/providers/aiProvider.js`, `creativeProvider.js`, `publishingProvider.js`, `researchProvider.js`, `scrapingProvider.js`, `seoProvider.js`

**All safe to remove** — mock/stub implementations, no real consumers found.

---

## 7. API Audit

### Duplicate Endpoints

| Path | Router 1 (Legacy) | Router 2 (Modern) | Issue |
|------|-------------------|-------------------|-------|
| `/:chatId/seo-intelligence/run` | src/routes/seo.routes.js (POST) | modules/seo-intelligence/seo.routes.js (POST) | Both mounted, legacy may override |
| `/:chatId/seo-intelligence/content-gaps` | src/routes/seo.routes.js (GET) | modules/seo-intelligence/seo.routes.js (not directly) | Legacy still responds |
| `/:chatId/seo-intelligence/content-gaps/run` | src/routes/seo.routes.js (POST) | modules/seo-intelligence/seo.routes.js (has runContentGapsHandler) | Duplicate |

### Legacy Endpoints (Dead)

| Path | File |
|------|------|
| `/:chatId/seo` (GET) | src/routes/seo.routes.js — dead, FE uses `/:chatId/seo-intelligence` |
| `/:chatId/seo/run` (POST) | src/routes/seo.routes.js — dead |
| All `/:chatId/campaign-intelligence/*` | routes/campaignIntelligence.routes.js — NOT MOUNTED |

### Response Consistency

- Mixed: Some controllers use `{ success, data }` pattern, others return raw data
- `automation.controller.js` and `workflow.controller.js` use consistent `{ success, data?, error? }`
- Legacy `seo.controller.js` uses older patterns
- `response.util.js` exists but is NOT used by the majority of controllers (~40% adoption per previous audit)

### Authentication

- Most routes use `requireAuth` middleware
- Auth routes (register, login) are correctly public
- Health check is correctly public

### Error Handling

- Global error handler (server.js line 219) properly hides stack traces in production
- Individual controllers have mixed error handling quality
- No consistent error response format across all controllers

---

## 8. Database Audit

### Index Coverage

| Status | Models |
|--------|--------|
| ✅ Well-indexed | RawCrawlData, KeywordIntelligenceRecord, TopicCluster, SeoCompetitorIntelligence, GeoIntelligenceRecord, ContentGap, BlogIntelligence, ContentGapRecord, BlogIntelligenceRecord, CompetitorSeoRecord, ExecutiveSeoDashboard, AutomationPlan, AutomationAsset, AutomationLog |
| ❌ Missing indexes on FKs | Chat (userId), Message (chatId), Analysis (chatId, userId), Notification (userId), GrowthSprint (chatId, userId), GrowthTask (chatId, userId, sprintId), AgentRun (chatId, userId) |
| ⚠️ Partial (unique only) | SeoAnalysis (userId), ProductProfile (userId), ProductAnalysis (userId), ProductIntelligence (userId), CompetitorIntelligence (userId), CampaignIntelligence (userId), SeoIntelligence (userId), TechnicalSeoAudit, SeoScoreBreakdown |

### Cascade Rules

| Model | Cascade Status |
|-------|----------------|
| SeoIntelligence → Children | ✅ All 13 child models have `onDelete: Cascade` |
| Chat → SeoIntelligence | ✅ `onDelete: Cascade` |
| Chat → AutomationPlan | ✅ `onDelete: Cascade` |
| AutomationPlan → AutomationAsset | ✅ `onDelete: Cascade` |
| AutomationLog | ⚠️ No cascade from Chat (chatId is optional), only from User |
| GrowthSprint/GrowthTask | ✅ `onDelete: Cascade` from both Chat and User |

### Orphan Risk

| Scenario | Risk Level |
|----------|------------|
| Delete chat → AutomationLog orphaned | LOW (chatId is optional) |
| Delete user → cascades correctly | LOW (all User relations have Cascade) |

### Query Efficiency Concerns

- Chat list query has no `take`/`skip` — loads ALL chats at once
- `full-results` endpoint does N+1 queries (1 chat + N child relations) with no eager loading
- No Redis or in-memory caching anywhere

---

## 9. Frontend Audit

### Routing

| Route | Page | Status |
|-------|------|--------|
| `/` | LandingPage | ✅ |
| `/login` | LoginPage | ✅ |
| `/register` | RegisterPage | ✅ |
| `/app/dashboard` | DashboardPage | ✅ |
| `/app/growth-workspace` | GrowthWorkspacePage | ✅ |
| `/app/product-intelligence` | Redirect → growth-workspace | ✅ |
| `/app/seo` | SEOIntelligencePage | ✅ |
| `/app/campaigns` | CampaignIntelligencePage | ⚠️ Might be unused |
| `/app/executive-story` | ExecutiveStoryPage | ⚠️ Duplicate content |
| `/app/automation-center` | AutomationCenterPage | ✅ |
| `/app/chat-history` | ChatHistoryPage | ✅ |
| `/app/profile` | ProfilePage | ✅ |
| `/app/settings` | SettingsPage | ✅ |

### Context Issues

| Context | Issue |
|---------|-------|
| AuthContext | Empty `.catch()` swallows errors, no error state |
| ProjectContext | Race condition in `selectChat`/`loadFullResults`, no error state |

### Missing Features

- No toast/notification system for background errors
- No error boundaries per tab (except SEO page has TabErrorBoundary)
- No loading skeletons (uses `Loading` text component)
- No Retry/Backoff in api.ts
- No request timeout

### Bundle Size

- 757KB JS bundle (from previous audit — likely similar)
- No code splitting
- No lazy loading of pages

---

## 10. AI Architecture Audit

### Canonical Router: `aiRouter.service.js`

- **Chain:** Gemini (45s timeout) → Groq (45s timeout) → OpenAI (45s timeout, `json_object` mode) → `{ success: false }`
- **Consumers:** automation.service.js, automation.controller.js, workflow.service.js
- **Status:** ✅ Functional, well-structured

### Parallel Router: `aiProvider.service.js`

- **Chain:** Cerebras → DeepSeek → OpenRouter → Groq → Gemini → heuristic fallback
- **Consumer:** growthWorkspace.service.js only
- **Status:** ❌ NOT CONSOLIDATED with canonical router
- **Impact:** Growth Workspace has an independent AI provider chain. Different providers, different prompt engineering, different response parsing.

### Orchestrator: `ai-orchestrator.js`

- **Status:** ✅ Delegates to `callAI`, preserves `callLLMWithFallbacks` signature
- **Consumers:** seoIntelligence.service.js (via callLLMWithFallbacks)

### Provider Timeouts

| Provider | Timeout | File |
|----------|---------|------|
| Gemini (aiRouter) | 45s | aiRouter.service.js:97 |
| Groq (aiRouter) | 45s | aiRouter.service.js:143 |
| OpenAI (aiRouter) | 45s | aiRouter.service.js:189 |
| All providers (aiProvider.service.js) | ❌ NONE (no AbortSignal.timeout) | aiProvider.service.js |
| Groq (legacy groq.service.js) | ❌ NONE | groq.service.js |
| Gemini (legacy gemini.service.js) | ❌ NONE | gemini.service.js |
| OpenAI (legacy openai.service.js) | ❌ NONE | openai.service.js |

### AI Provider File Duplication

| Provider | Canonical (aiRouter) | Legacy (services/) | Parallel (aiProvider.service) |
|----------|---------------------|-------------------|------------------------------|
| Gemini | ✅ (internal function) | gemini.service.js | ✅ (generateWithGemini) |
| Groq | ✅ (internal function) | groq.service.js | ✅ (generateWithGroq) |
| OpenAI | ✅ (internal function) | openai.service.js | ❌ |
| Cerebras | ❌ | ❌ | ✅ (generateWithCerebras) |
| DeepSeek | ❌ | ❌ | ✅ (generateWithDeepSeek) |
| OpenRouter | ❌ | ❌ | ✅ (generateWithOpenRouter) |

---

## 11. Security Audit

| Issue | Severity | Status |
|-------|----------|--------|
| JWT_SECRET weak (8-digit numeric) | CRITICAL | Still Present |
| API keys exposed in .env (25 keys) | CRITICAL | Still Present |
| Debug panel leaks in production risk | HIGH | Still Present |
| No input validation on most routes | HIGH | Still Present |
| Rate limiting disabled in dev | MEDIUM | Still Present |
| JWT in localStorage (XSS vulnerable) | MEDIUM | Still Present |
| No CSRF protection | MEDIUM | Still Present |
| No Helmet CSP config | MEDIUM | Still Present |
| CORS allows null origin | MEDIUM | Still Present |
| Graceful shutdown doesn't disconnect DB | LOW | Still Present |
| Health check doesn't verify DB | LOW | Still Present |

---

## 12. Performance Audit

| Issue | Impact | Status |
|-------|--------|--------|
| No query pagination (chat list) | Full table scans at scale | Still Present |
| No indexes on 7 core model FKs | Slow FK joins | Still Present |
| No Redis caching | Every request hits DB | Still Present |
| AI providers block event loop | No streaming, blocks other requests | Still Present |
| 757KB JS bundle | Slow initial load | Still Present |
| No code splitting | Everything loaded upfront | Still Present |
| No lazy loading | All components eager-loaded | Still Present |

---

## 13. Deployment Readiness Checklist

### Pre-Deployment
- [ ] JWT_SECRET changed to strong random value
- [ ] All API keys rotated and .env removed from version control
- [ ] `.env.example` created with placeholder values
- [ ] Debug panel removed from SEOIntelligencePage.tsx
- [ ] Legacy SEO routes unmounted
- [ ] Parallel AI router consolidated
- [ ] Rate limiting properly configured (no skip for production)
- [ ] All API keys validated at startup
- [ ] NODE_ENV=production set

### Environment
- [ ] PORT=5000
- [ ] NODE_ENV=production
- [ ] DATABASE_URL configured (production DB, not local)
- [ ] JWT_SECRET set (strong value)
- [ ] All required API keys set (only active ones)
- [ ] CLIENT_URL set to production domain
- [ ] SSL certificates installed
- [ ] CORS origins configured for production domain only

### Database
- [ ] Migrations applied: `npx prisma migrate deploy`
- [ ] Prisma generated: `npx prisma generate`
- [ ] Database backup created before migration
- [ ] Connection pool size configured
- [ ] Missing FK indexes added

### Build
- [ ] Backend: `npm ci` (clean install)
- [ ] Frontend: `npm run build` (passes with 0 errors)
- [ ] All `.catch()` handlers reviewed for silence
- [ ] Bundle size optimized (<500KB target)
- [ ] Tree-shaking verified

### Smoke Tests
- [ ] Health check: `GET /api/health` returns 200
- [ ] Registration + Login works end-to-end
- [ ] Chat creation works
- [ ] At least one analysis type completes (Growth Workspace or SEO)
- [ ] Automation Center generates a plan
- [ ] Workflow starts and completes
- [ ] No console errors in browser
- [ ] No unhandled rejections in Node

### Production Hardening
- [ ] Rate limiting configured (100 req/15min for auth, higher for other routes)
- [ ] Helmet CSP configured
- [ ] CSRF protection added
- [ ] Request body size limit per route (not global 10mb)
- [ ] Graceful shutdown calls prisma.$disconnect()
- [ ] Health check verifies DB connectivity
- [ ] Monitoring/logging configured (Sentry, Winston, etc.)
- [ ] Error tracking configured

### Post-Deployment
- [ ] Smoke tests pass against production
- [ ] Performance monitoring active
- [ ] Backup strategy verified
- [ ] Rollback plan documented
- [ ] All dead code/deprecated files removed

---

## 14. Safe Cleanup Plan

### Phase 1: Safe to Delete Immediately (No Dependencies)

| File | Reason | Rollback |
|------|--------|----------|
| `src/ai/services/campaignGenerator.service.js` | Zero consumers, `@deprecated` header | `git checkout` |
| `src/ai/services/channelRecommendation.service.js` | Zero consumers, `@deprecated` header | `git checkout` |
| `test-ai-provider.js` through `patch_seo_save.js` (11 files) | Standalone scripts, zero consumers | `git checkout` |
| `src/providers/aiProvider.js` (and 5 others) | Mock/stub implementations | `git checkout` |

### Phase 2: Requires Verification Before Deletion

| File | Verification Needed | Rollback |
|------|-------------------|----------|
| `backend/routes/campaignIntelligence.routes.js` | Confirm NOT mounted, controller doesn't exist | `git checkout` |
| `backend/src/routes/seo.routes.js` | Confirm NO frontend code hits legacy paths | `git checkout` + re-mount |
| `backend/src/controllers/seo.controller.js` | Only called by legacy router | `git checkout` |
| `backend/src/services/seo.service.js` | Legacy, modern one in modules/ | `git checkout` |

### Phase 3: Requires Code Changes Before Deletion

| File | Dependency | Action Needed |
|------|------------|---------------|
| `backend/src/services/aiProvider.service.js` | Used by growthWorkspace.service.js | Refactor growthWorkspace to use `callAI`, then remove |
| `backend/src/services/groq.service.js` | No direct consumers found | Verify, then remove |
| `backend/src/services/gemini.service.js` | No direct consumers found | Verify, then remove |
| `backend/src/services/openai.service.js` | No direct consumers found | Verify, then remove |
| 28 root MD files | None, but may be wanted | Archive to separate directory first |

---

## 15. Engineering Roadmap

### Recommended Next Milestone: **Production Hardening Sprint**

**Goal:** Fix all Critical and High-priority issues before any new feature work.

**Priority Order:**
1. Rotate all API keys and secure `.env` (C3)
2. Change JWT_SECRET to strong value (C5)
3. Remove debug panel from SEOIntelligencePage (C4)
4. Unmount legacy SEO routes (C2)
5. Consolidate parallel AI router (C1) — refactor `aiProvider.service.js` → delegate to `callAI`
6. Add proper error handling (eliminate empty `.catch()`) across frontend (C6)
7. Add Zod validation to all POST/PUT endpoints (H1)
8. Fix DashboardPage wrong SEO URL (H5)
9. Delete confirmed dead code (Phase 1 cleanup)
10. Add missing FK indexes (H3) — requires Prisma migration

**Estimated effort:** 3-5 days for a single developer
**Risk:** Low to Medium (all changes are deletions, refactors of isolated files, or config changes)

**Do NOT begin any of this automatically — wait for approval.**
