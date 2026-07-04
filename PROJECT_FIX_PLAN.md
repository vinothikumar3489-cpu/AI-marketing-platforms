# AI Marketing Platform — Project Fix Plan

**Date:** 2026-07-02
**Based on:** Full Project Audit (PROJECT_AUDIT_REPORT.md)
**Estimated Effort:** 4-6 weeks (single developer)
**Risk Level:** High — many interconnected systems

---

## Phase 1: Critical Runtime Fixes (Week 1)

### 1.1 Fix `identity undefined` in Executive Dashboard Generator

| Field | Value |
|-------|-------|
| **File** | `backend/src/services/seo/executive-dashboard-generator.service.js` |
| **Problem** | `generateExecutiveActionPlan` uses `identity` variable that is never defined in function scope |
| **Fix** | Add `const safeSeoData`, `const identity`, `const brandName`, `const domain` at function top; replace all raw `identity` usage with safe variables |
| **Risk** | Low — self-contained function fix |
| **Test** | `node --check executive-dashboard-generator.service.js` + run SEO for canva.in |

### 1.2 Add Old SEO Child Record Cleanup

| Field | Value |
|-------|-------|
| **File** | `backend/src/modules/seo-intelligence/seoIntelligence.service.js` |
| **Problem** | Running SEO again on existing chat leaves orphaned old child records; upsert on SeoIntelligence creates new `id`, old children remain linked to old id |
| **Fix** | Before the transaction, find existing SeoIntelligence by chatId, delete all child records and the SeoIntelligence record itself |
| **Risk** | Medium — data loss if transaction fails before new save completes (mitigated by wrapping in transaction) |
| **Test** | Run SEO twice on same chat → verify only one set of records exists |

### 1.3 Fix Frontend Run Flow — Clear State, Verify ChatId

| Field | Value |
|-------|-------|
| **File** | `frontend/src/pages/SEOIntelligencePage.tsx` |
| **Problem** | `setSeo({})` not called before new run → stale results flash; no chatId verification; `loadFullResults` may fire before run completes |
| **Fix** | Call `setSeo({})` before run; verify `res.chatId === chatId`; wait for `run()` response before `loadFullResults` |
| **Risk** | Low |
| **Test** | Run SEO → verify no stale data flash, verify console shows chatId match |

### 1.4 Remove Legacy SEO Route Conflict

| Field | Value |
|-------|-------|
| **File** | `backend/src/routes/seo.routes.js` (entire file) + `backend/src/controllers/seo.controller.js` (legacy) + `backend/src/services/seo.service.js` (legacy) |
| **Problem** | TWO SEO route files mounted at `/api/chats` — legacy `seo.routes.js` and modern `modules/seo-intelligence/seo.routes.js`. Legacy routes include `/:chatId/seo/run` which conflicts with modern `/:chatId/seo-intelligence/run`. |
| **Fix** | Remove legacy route file from `server.js` mount; remove legacy controller and service files; verify modern routes handle all required paths |
| **Risk** | Medium — verify frontend only calls modern routes before removing |
| **Test** | `grep -r "seo/run" frontend/src/` → only `/seo-intelligence/run` used ✓ |

### 1.5 Fix Technical Audit Score Rendering

| Field | Value |
|-------|-------|
| **Files** | `backend/src/controllers/chat.controller.js`, `frontend/src/lib/normalizers.ts`, `frontend/src/pages/SEOIntelligencePage.tsx` |
| **Problem** | Backend normalizer only checks PageSpeed nested paths (`auditData.pageSpeed.mobile.lighthouseScores.*`) but scores stored at `auditData.performanceScore` directly. Frontend normalizer missing direct path. Component reads wrong field chain. |
| **Fix** | Add `normalizeTechnicalAudit()` function that checks `auditData.performanceScore` first with PageSpeed fallback; update frontend normalizer to read `auditData.*Score` paths first; update component to check `data.technical?.auditData?.*Score` |
| **Risk** | Low |
| **Test** | View Technical Audit tab after SEO run → verify scores show numbers not N/A |

---

## Phase 2: Chat/History/Data Flow Fixes (Week 2)

### 2.1 Fix `loadFullResults` ChatId Verification

| Field | Value |
|-------|-------|
| **File** | `frontend/src/context/ProjectContext.tsx` |
| **Problem** | `loadFullResults(id)` does not verify that the API response matches the requested chatId. If multiple requests are in-flight, stale response may overwrite fresh data. |
| **Fix** | Add response-chatId verification: `if (response.chatId !== requestedId) return`; store `lastRequestedChatId` ref and ignore stale responses |
| **Risk** | Low |
| **Test** | Rapidly switch chats → verify correct data displayed for each chat |

### 2.2 Fix ProjectContext Race Conditions

| Field | Value |
|-------|-------|
| **File** | `frontend/src/context/ProjectContext.tsx` |
| **Problem** | `setTimeout(100ms)` not reliable for DB commit; `useEffect` on mount may fire with stale `selectedChatId` |
| **Fix** | Remove artificial delay; add request deduplication with AbortController; guard `setFullResults` against stale responses |
| **Risk** | Medium |
| **Test** | Click chat, immediately click another → verify no stale data |

### 2.3 Fix DashboardPage Navigation URLs

| Field | Value |
|-------|-------|
| **File** | `frontend/src/pages/DashboardPage.tsx` |
| **Problem** | "New SEO Analysis" navigates to `/app/seo-intelligence` which is not a valid route (should be `/app/seo`) |
| **Fix** | Change `navigate('/app/seo-intelligence')` to `navigate('/app/seo')` |
| **Risk** | Low |
| **Test** | Click "New Analysis" → "SEO" → verify /app/seo loads |

### 2.4 Add Chat List Refresh After Analysis

| Field | Value |
|-------|-------|
| **File** | `frontend/src/pages/SEOIntelligencePage.tsx` |
| **Problem** | After SEO analysis completes, chat list not refreshed → ProjectDropdown doesn't show updated scores |
| **Fix** | Call `refreshChats()` after `loadFullResults()` in the run flow |
| **Risk** | Low |
| **Test** | Run SEO → open ProjectDropdown → see updated chat entry |

### 2.5 Fix Normalizer Direct Score Paths

| Field | Value |
|-------|-------|
| **File** | `frontend/src/lib/normalizers.ts` |
| **Problem** | `extractScore` checks `technicalData.performanceScore` etc. but those are null from old backend; the correct value is nested deeper |
| **Fix** | Add direct `auditData.performanceScore` as the first checked path before PageSpeed paths |
| **Risk** | Low |
| **Test** | Check normalized scores in console after SEO run |

---

## Phase 3: SEO Intelligence Refactor (Weeks 2-3)

### 3.1 Standardize SEO Response Shape

| Field | Value |
|-------|-------|
| **Files** | `backend/src/controllers/chat.controller.js` (getFullResults), `backend/src/modules/seo-intelligence/seo.controller.js` |
| **Problem** | `getFullResults` re-normalizes all scores from saved data; `seo.controller.js` has its own response structure. Two different response shapes for "same" data. |
| **Fix** | Standardize on ONE response shape: `{ identity, technicalAudit, keywordIntelligence, competitorIntelligence, contentGapAnalysis, blogIntelligence, geoIntelligence, executiveDashboard, executiveStory, actionPlan, scoreBreakdown }`. Remove legacy `_legacy` wrapper. |
| **Risk** | High — verify all frontend consumers match new shape |
| **Test** | Compare old vs new response side by side |

### 3.2 Deduplicate Dashboard Services

| Field | Value |
|-------|-------|
| **Files** | `services/seo/executive-dashboard.service.js` vs `services/seo/executive-dashboard-generator.service.js` |
| **Problem** | Two files with similar names and overlapping functionality — one is imported by seoIntelligence.service.js |
| **Fix** | Remove the unused one; rename the active one to be unambiguous |
| **Risk** | Medium |
| **Test** | Run full SEO → verify dashboard still generated |

### 3.3 Fix Executive Story Counts

| Field | Value |
|-------|-------|
| **Files** | `frontend/src/lib/normalizers.ts`, `frontend/src/pages/SEOIntelligencePage.tsx` |
| **Problem** | Executive Story component reads `story.keywordFindings?.totalKeywords` etc. but `story.keywordFindings` is null — counts come from `data.keywordIntelligence` |
| **Fix** | In the component, compute counts from available `data.keywordIntelligence`, `data.competitorIntelligence`, etc. when story sub-objects are null |
| **Risk** | Low |
| **Test** | Check Executive Story tab shows correct keyword/competitor/content gap counts |

### 3.4 Fix Action Plan Rendering

| Field | Value |
|-------|-------|
| **Files** | `backend/src/services/seo/executive-dashboard-generator.service.js`, `frontend/src/pages/SEOIntelligencePage.tsx` |
| **Problem** | Action Plan only has GEO tasks because generation only fires when all buckets are empty AND GEO+keyword+technical data exists |
| **Fix** | Always generate action plan items from ALL available data sources; remove empty-bucket-only guard |
| **Risk** | Low |
| **Test** | Check Action Plan tab after SEO run → verify day7/30/60/90 all populated |

### 3.5 Normalize Score Breakdown Field Names

| Field | Value |
|-------|-------|
| **Files** | `backend/src/modules/seo-intelligence/seoIntelligence.service.js`, `backend/src/controllers/chat.controller.js` |
| **Problem** | `SeoScoreBreakdown` model has `technicalScore, onPageScore, contentScore, authorityScore, aiVisibilityScore, localSeoScore, overallScore` but some code references snake_case names |
| **Fix** | Standardize all references to camelCase matching the model |
| **Risk** | Low |
| **Test** | Verify scoreBreakdown displays correctly in frontend |

---

## Phase 4: Growth Workspace Polish (Week 3)

### 4.1 Fix Growth Results Data Flow

| Field | Value |
|-------|-------|
| **Files** | `frontend/src/pages/GrowthWorkspacePage.tsx`, `frontend/src/context/ProjectContext.tsx` |
| **Problem** | Growth workspace reads `fullResults.growth` but the fullResults normalization path may not include growth data |
| **Fix** | Trace `fullResults.growth` → `normalizeFullResults` → verify growth data is correctly passed from API response |
| **Risk** | Medium |
| **Test** | Run Growth analysis → verify tabs show data not empty states |

### 4.2 Fix KPI Calculations

| Field | Value |
|-------|-------|
| **File** | `frontend/src/pages/DashboardPage.tsx` |
| **Problem** | KPI calculations reference `p.growthScore` and `p.seoScore` which don't exist on Chat model — values shown from DB query `listChats` which doesn't join with intelligence tables |
| **Fix** | Either: (a) add computed scores to Chat list API response by joining with intelligence tables, or (b) calculate from fullResults cache |
| **Risk** | High — requires backend change to chat list query |
| **Test** | Check Dashboard → scores show real values (not 0 or -) |

### 4.3 Add Loading States to Growth Tabs

| Field | Value |
|-------|-------|
| **File** | `frontend/src/pages/GrowthWorkspacePage.tsx` |
| **Problem** | All tabs share single loading state — no per-tab loading indicator |
| **Fix** | Add Suspense/lazy loading for each tab component; show skeleton loaders |
| **Risk** | Low |
| **Test** | Click between tabs → see loading indicator on transition |

---

## Phase 5: UI/UX Polish (Week 4)

### 5.1 Fix Inconsistent Score Display

| Field | Value |
|-------|-------|
| **Files** | `frontend/src/components/UI.tsx` (ScoreCard), all consumer pages |
| **Problem** | ScoreCard shows "-" for null, some places show "N/A", some show "Unavailable" |
| **Fix** | Standardize ScoreCard to show "N/A" for null values; update all consumers |
| **Risk** | Low |
| **Test** | Check all score displays across all tabs |

### 5.2 Add Tab-Level Error Boundaries

| Field | Value |
|-------|-------|
| **File** | `frontend/src/pages/SEOIntelligencePage.tsx` |
| **Problem** | One tab crash takes down all tabs; single ErrorBoundary wraps all content |
| **Fix** | Wrap each tab render in its own ErrorBoundary so one failing tab doesn't break others |
| **Risk** | Low |
| **Test** | Inject error in one tab → other tabs still work |

### 5.3 Fix Toast Notification Position in Drawer

| Field | Value |
|-------|-------|
| **File** | `frontend/src/pages/ChatHistoryPage.tsx` |
| **Problem** | Toast notification rendered inside drawer component — hidden when drawer is closed |
| **Fix** | Move toast to a global notification system in AppLayout or context level |
| **Risk** | Low |
| **Test** | Delete chat from drawer → toast visible at top of screen |

### 5.4 Standardize Empty States

| Field | Value |
|-------|-------|
| **Files** | All tab components in both SEO and Growth pages |
| **Problem** | Some tabs use `EmptyState`, some show raw "No data", some show blank card |
| **Fix** | Add consistent empty state component with action buttons; use in all tabs |
| **Risk** | Low |
| **Test** | View each tab without data → see consistent empty state |

---

## Phase 6: Deployment Readiness (Week 4-5)

### 6.1 Add Request Validation

| Field | Value |
|-------|-------|
| **Files** | All route handler files, especially SEO and Growth routes |
| **Problem** | Zero Zod/validation schemas used on any mutation route |
| **Fix** | Add Zod schemas for all POST/PUT/DELETE route inputs; return 400 with field-level errors |
| **Risk** | Medium |
| **Test** | Send invalid data → get proper validation error |

### 6.2 Add Rate Limiting

| Field | Value |
|-------|-------|
| **File** | `backend/src/server.js` |
| **Problem** | No rate limiting configured — any API can be spammed |
| **Fix** | Add `express-rate-limit` to auth routes (strict) and all other routes (moderate); add burst limit for AI-heavy endpoints |
| **Risk** | Low |
| **Test** | Send 100 rapid requests → get 429 after limit |

### 6.3 Add API Key Validation at Startup

| Field | Value |
|-------|-------|
| **File** | `backend/src/server.js` |
| **Problem** | Server starts even if critical API keys missing — failures happen at runtime |
| **Fix** | Add startup validation for required env vars: `DATABASE_URL`, `JWT_SECRET`, `GROQ_API_KEY` (at least one AI provider) |
| **Risk** | Low |
| **Test** | Remove required key → server refuses to start with clear error message |

### 6.4 Add Proper CORS Configuration

| Field | Value |
|-------|-------|
| **File** | `backend/src/server.js` |
| **Problem** | CORS allows all origins (no production origin configured) |
| **Fix** | Set `origin` to production frontend URL(s); add development exception |
| **Risk** | Low |
| **Test** | Access from non-whitelisted origin → blocked |

### 6.5 Add Redis Caching Layer

| Field | Value |
|-------|-------|
| **File** | New: `backend/src/config/cache.js`, modify `chat.controller.js` |
| **Problem** | Every `getFullResults` hits database with multiple joins — slow for frequently accessed data |
| **Fix** | Cache fullResults by chatId with 5-minute TTL; invalidate on SEO/Growth analysis completion |
| **Risk** | Medium |
| **Test** | First request slow, subsequent fast → verify cache hit in logs |

### 6.6 Add Request Timeouts

| Field | Value |
|-------|-------|
| **Files** | `backend/src/services/*` (all API calling services) |
| **Problem** | No timeout on any external API call — a hanging API blocks the entire SEO pipeline |
| **Fix** | Add 30-second timeout to all fetch/axios calls using AbortController |
| **Risk** | Medium |
| **Test** | Call service with slow endpoint → times out after 30s without crash |

### 6.7 Remove Dead Code and Files

| Field | Value |
|-------|-------|
| **Files** | See Audit Report Section 14 |
| **Problem** | 28 root MD files, legacy routes, dead service files — clutter, confusion, maintenance burden |
| **Fix** | Archive MD files to `/docs/archive/`; remove legacy route/service files; remove dead API config from .env |
| **Risk** | Low (if files are truly unused) |
| **Test** | `grep -r "import.*legacyFile" src/` → no matches |

---

## Phase 7: Monitoring & Testing (Week 5-6)

### 7.1 Add Structured Logging

| Field | Value |
|-------|-------|
| **Files** | All backend files |
| **Problem** | `console.log` everywhere — no log levels, no structured format, no searchability |
| **Fix** | Replace with structured logger (pino or winston); add request IDs; add performance timing |
| **Risk** | Low |
| **Test** | Check logs are JSON-formatted with timestamps and levels |

### 7.2 Add Integration Tests

| Field | Value |
|-------|-------|
| **Files** | New: `backend/__tests__/` |
| **Problem** | Zero automated tests — only manual testing |
| **Fix** | Test key flows: register → login → create chat → run SEO → get fullResults; add health check test |
| **Risk** | Low |
| **Test** | `npm test` → green |

### 7.3 Add Health Checks

| Field | Value |
|-------|-------|
| **File** | `backend/src/server.js` |
| **Problem** | Basic `GET /api/health` returns `"OK"` — no dependency check |
| **Fix** | Add database connectivity check, AI provider ping, disk space check |
| **Risk** | Low |
| **Test** | `curl /api/health` → shows all dependency statuses |

---

## Summary: Fix Order by Week

```
Week 1:  Phase 1 (Critical Runtime Fixes) — 5 items
Week 2:  Phase 2 (Data Flow) + Phase 3 (SEO) start — 8 items
Week 3:  Phase 3 (SEO Refactor) + Phase 4 (Growth) — 6 items
Week 4:  Phase 5 (UI/UX) + Phase 6 (Deployment) start — 6 items
Week 5:  Phase 6 (Deployment) + Phase 7 (Testing) — 5 items
Week 6:  Phase 7 (Testing) + Bug Bash + Production Deploy — 3 items
```

## Risk Register

| Fix | Risk Level | Mitigation |
|-----|-----------|------------|
| 1.2 Old data cleanup | Medium | Wrap in transaction |
| 1.4 Remove legacy routes | Medium | Verify frontend calls before removal |
| 2.1 ChatId verification | Medium | Add logging to catch mismatches |
| 2.2 Race condition fix | Medium | Use AbortController |
| 2.5 KPI fix | High | Backend query change |
| 3.1 Response shape standardization | High | Dual-write during migration |
| 6.5 Redis caching | Medium | Cache invalidation logic |
| 6.6 Timeouts | Medium | Timeout value tuning |

---

*End of Fix Plan — 2026-07-02*
