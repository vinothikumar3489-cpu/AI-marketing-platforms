# AI Marketing Platform — Complete Architecture Audit

**Date:** 2026-08-01
**Auditor:** Lead Software Architect (read-only audit — no code was modified)
**Repository:** `C:\Users\sanja\Downloads\Test`
**Scope:** Entire monorepo — backend (Express/Prisma/PostgreSQL/Redis/BullMQ), frontend (React/TS/Vite), database schema, background jobs, AI services, Brain/Knowledge Graph, autonomous layer, reporting.

---

## 0. Executive Summary

The platform is a large (backend: **358 JS files, ~3.66 MB**; frontend: **~33,800 lines TS/TSX**; **71 Prisma models**) single-tenant-per-chat AI marketing suite. It is feature-rich but architecturally **fractured**: the codebase contains **3 parallel AI-routing systems, 4–5 product-analysis implementations, 4 SEO-intelligence implementations, 2 Brevo providers, 2 email provider interfaces, 2 scheduling systems, and a "Brain" intelligence core that no production service consumes**. Roughly **15+ backend files and ~50% of frontend lines are unreachable dead code**. The most serious production risks are: **fabricated (hardcoded) business intelligence served as real via admin APIs**, **unauthenticated static file serving of tenant PDF reports**, **SSRF via arbitrary URL scraping**, and **12 routers stacked on the `/api/chats` prefix with two confirmed route-shadowing bugs**.

**Overall risk level: HIGH** (see §8).

---

## 1. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FRONTEND (Vercel) — React 18 + TS + Vite, 33.8k LOC                         │
│  pages: Dashboard, GrowthWorkspace, SEOIntelligence, CampaignIntelligence,  │
│         AutomationCenter, ContentStudio, EmailBuilder, ExecutiveStory,       │
│         ChatHistory, Profile, Settings, Landing/Login/Register               │
│  admin: /admin/brain/* (10 pages), /admin/intelligence/* (10 pages)          │
│  lib/api.ts — fetch client (JWT in localStorage), admin-api, intelligence-api│
│  modules/: growth-workspace, seo, campaign-intelligence, crm-automation,     │
│            email-automation, campaign-planning, sales-copilot, agents,       │
│            competitor-intelligence, product-intelligence, workflow           │
└───────────────┬─────────────────────────────────────────────────────────────┘
                │ HTTPS  VITE_API_URL  (JWT Bearer)
                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ BACKEND (Render) — Express 4 + ESM, src/server.js                           │
│  helmet · compression · cors · rate-limiters · express.json (1MB prod)      │
│  requestId middleware → brainMiddleware (no-op) → 26 routers                 │
│                                                                             │
│  /api/auth ──► auth.controller ──► prisma User                               │
│  /api/chats  (12 ROUTERS STACKED HERE — collision risk)                     │
│     ├─ chat.routes ──► message.controller ──► analysis.service ──► Tavily   │
│     ├─ seo.routes ──► seoIntelligence(domain) ──► seo-orchestrator          │
│     ├─ product.routes ──► product.controller / product-intelligence module  │
│     ├─ competitor-intelligence ──► competitor-discovery.provider            │
│     ├─ agents (ai-assistant) ──► domains/ai/aiOrchestrator                  │
│     ├─ workflow ──► automation.service / workflow.service                   │
│     ├─ growth-workspace ──► growthWorkspace.service (107 KB)                │
│     ├─ report.routes ──► report-builder → pdf/docx/pptx generators (queue) │
│     ├─ evidence.routes ──► evidence module → scraper + 8 evidence sources   │
│     ├─ email-campaign.routes (20+ endpoints) ──► email-campaign-generator   │
│     ├─ crm.routes (38 endpoints) ──► crm controllers → crm-*.services       │
│     └─ sales-copilot.routes (13 endpoints) ──► sales-copilot.service        │
│  /api/automation ──► automation.controller (50 KB) ──► automation.service    │
│                   ──► execution/* (content-studio, campaign-planner, …)     │
│  /api/campaign ──► campaign.controller ──► campaign-planner / campaign-intel │
│  /api/product-analysis ──► productAnalysis.controller (legacy AI path)      │
│  /api/analysis ──► analysis.controller (Tavily v1/research)                 │
│  /api/scrape ──► scraper.service (4-scraper chain)                          │
│  /api/dashboard · /api/integrations · /api/user · /api/notifications        │
│  /api/content/email ──► email-workflow.controller ──► email persistence     │
│  /api/brain ──► brain.controller → decision/agent endpoints                 │
│  /api/admin/brain (14) ──► admin.brain.controller → Brain engines           │
│  /api/admin/intelligence (12) ──► intelligence.controller → AUTONOMOUS      │
│                                    LAYER (HARDCODED DEMO DATA ⚠)            │
│  /api/webhooks/email/brevo ──► HMAC-optional Brevo webhook                  │
│  /api/local-assets ──► express.static — NO AUTH ⚠                           │
└──────┬───────────────────┬──────────────────────────┬──────────────────────┘
       │                   │                          │
       ▼                   ▼                          ▼
┌──────────────┐   ┌───────────────┐        ┌────────────────────┐
│ AI PROVIDERS │   │ RESEARCH/     │        │ QUEUES (BullMQ)    │
│ Gemini/Groq/ │   │ SCRAPING      │        │ ScrapingQueue      │
│ OpenAI/      │   │ Tavily, Exa,  │        │ AIQueue            │
│ DeepSeek/    │   │ Firecrawl,    │        │ EmailQueue         │
│ Cerebras/    │   │ Jina,         │        │ CRMQueue           │
│ OpenRouter   │   │ DataForSEO,   │        │ ReportQueue        │
│  (2 routers: │   │ SerpAPI,      │        │ + DB pollers       │
│  aiRouter +  │   │ PageSpeed,    │        │  (scheduler.js,    │
│  aiOrchestr.)│   │ CrUX, GitHub, │        │   scheduled-email) │
└──────┬───────┘   │ SERPAPI       │        └────────┬───────────┘
       │           └───────┬───────┘                 │
       ▼                   ▼                         ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ BRAIN CORE (src/brain — 60+ files) — booted at startup,                   │
│ 15 engines + 11 adapters + 12 agents + graph + learning + decisions       │
│ ⚠ NO PRODUCTION CONSUMER — only /api/brain & /api/admin/brain touch it     │
└───────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ DATABASE — PostgreSQL via Prisma — 71 models                              │
│ Chat/Message/Analysis · ProductIntelligence · CompetitorIntelligence ·    │
│ SeoIntelligence + 12 child tables · AutomationPlan/Asset/Log/Execution ·  │
│ EmailCampaign/SequenceItem/Template/Automation/Schedule/DeliveryLog/Event │
│ CRM Contact/Company/Pipeline/Deal/Activity/Task/Workflow/Import ·         │
│ SalesCopilotMemory/DealInsight/Proposal/CustomerHealthSnapshot ·          │
│ GraphEntity/GraphRelationship · BrainExecution/Feedback/Pattern/… ·       │
│ EvidenceSnapshot · AgentRun · Notification · GrowthSprint*/GrowthTask*    │
│                                                                           │
│ * GrowthSprint/GrowthTask = unused models                                 │
└───────────────────────────────────────────────────────────────────────────┘
```

### Complete execution flow (end-to-end example — Growth Workspace)

```
Browser (GrowthWorkspacePage)
  │  POST /api/chats/{chatId}/growth-workspace/run-full-analysis  (JWT)
  ▼
Express middleware: helmet → compression → generalLimiter → CORS → json
  → requestId → brainMiddleware (no-op)
  ▼
growthWorkspace.routes → growthWorkspace.controller (requireAuth)
  ▼
growthWorkspace.service.runFullGrowthAnalysis  (107 KB god-file)
  ├─ validates/creates Chat row (transaction)
  ├─ collectResearchData ──► research-orchestrator.service
  │      ├─ Tavily search (competitors/company)
  │      ├─ PageSpeed (3 retries, 5-min cache)
  │      └─ scraper.service (Firecrawl → Jina → scrapingbee → cheerio)
  ├─ business-intelligence.service (company + audience synthesis)
  ├─ 8× AI stages: runProductAnalysis, runMarketDiscovery, runAudienceIntelligence,
  │      runCompetitorAnalysis, runIntentPrediction, runPositioningEngine,
  │      runCampaignGenerator, runChannelRecommendation
  │      each: callBestAI → aiRouter.service.callAI (Groq→Gemini→OpenRouter→OpenAI,
  │      cooldowns) → fallback.generators (hardcoded fallbacks)
  ├─ quality filters → normalizeGrowthResults
  └─ persistence: ProductIntelligence / CompetitorIntelligence / Chat.results
  ▼
Frontend (GET /growth-workspace/results) renders 8 panels
```

---

## 2. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Backend runtime | Node.js ≥20, ESM, Express 4.18 | `express-async-errors`, compression, helmet |
| ORM | Prisma 5.10 + PostgreSQL | 71 models, 25 migrations |
| Queues | BullMQ 5 + Redis (ioredis) | 5 queues, 5 workers × concurrency 5 |
| AI providers | Gemini, Groq, OpenAI, DeepSeek, Cerebras, OpenRouter | 2 competing routers + 1 dead router |
| Research/search | Tavily, Exa, Firecrawl, Jina, DataForSEO, SerpAPI, Serper, PageSpeed, CrUX, GitHub API | |
| Email | Brevo, SendGrid, SMTP | registry + 2 duplicated Brevo providers |
| Media | Cloudinary (images), Pollinations/FAL (image gen), Shotstack/Creatomate (video) | |
| Reporting | Puppeteer (PDF), docx, pptxgenjs, inline SVG charts | heavy formats queued |
| Frontend | React 18 + TS + Vite + Tailwind + Recharts + Framer Motion | 33,802 lines |
| Auth | JWT (7d expiry), bcryptjs | role claim not re-validated |

---

## 3. Folder Responsibilities

### 3.1 Backend (`backend/src`)

| Folder | Purpose | Notes |
|---|---|---|
| `server.js` | Entry: env validation, middleware, DB connect, 26 router mounts, Brain boot, workers, graceful shutdown | Also kills any process on port 5000 at boot ⚠ |
| `routes/` | Top-level routers (auth, chat, integrations, brain, admin.brain, intelligence, notification, sales-copilot, user) | `jobs.routes.js`, `diagnostics.routes.js` = dead |
| `controllers/` | HTTP handlers (auth, chat 43 KB, message, brain, admin.brain, intelligence, integrations, notification, sales-copilot, user) | chat.controller is a god-file |
| `domains/` | Feature domains: `ai`, `analytics`, `automation`, `campaign`, `content`, `crm`, `email`, `research`, `seo` — each with routes/controllers/services | Cleanest architectural idea; inconsistently applied |
| `services/` | Business logic (largest folder): `automation/`, `email/`, `execution/` (Content Studio), `intelligence/` (research), `integrations/` (image/video/storage), `reporting/`, `seo/`, `scraping/`, `scoring/`, `normalizers/`, `loaders/`, `providers/`, `persistence/`, `resolvers/`, `validators/` | Contains 3 god-services >70 KB |
| `modules/` | Older module implementations: `growth-workspace` (107 KB), `seo-intelligence` (dead 71 KB), `competitor-intelligence`, `evidence` (8 evidence sources), `product-intelligence` | Duplicates `domains/` & `services/` responsibilities |
| `ai/` | `services/aiRouter.service.js` (legacy AI router), `prompts/` | Superseded by `domains/ai` |
| `brain/` | Marketing Intelligence Core: 15 engines (memory, knowledge, evidence, adapter, graph, reasoning, recommendations, confidence, learning, quality, decision +), 11 adapters, 12 agents, knowledge graph, learning store, decision engine, scheduler | No production consumer ⚠ |
| `autonomous/` | 10 "autonomous" modules (market monitor, competitor monitor, trend monitor, lead engine, opportunity engines…) | All return **hardcoded demo data** ⚠ |
| `providers/` | External API clients: dataforseo (38 KB), competitor-discovery (33 KB), tavily, pagespeed, googleSearchConsole, ahrefs (dead), semrush (dead) | |
| `jobs/` | BullMQ queues, workers, CRM scheduler, scheduled-email processor | scheduler.js dead; double-scheduling risk |
| `middleware/` | auth (JWT), admin (role), brainMiddleware (no-op), validate (zod) | |
| `config/` | prisma.js (retry + SSL), redis.js | |
| `constants/` `shared/` | Content-type maps, schemas | `constants/content-types.js` vs `shared/schemas/content-types.schema.js` overlap |
| `dto/` | AI output normalizers (content.dto, email-copy.dto) — not request validation | |
| `utils/` | ai-orchestrator wrapper, ai-response-validator, response.util, retry-utils, stable-hash, seo-identity, text.util, merge-utilities | |
| `repositories/`, `database/`, `validators/` | **Empty directories** — scaffolding remnants | |
| `__tests__` / `tests/` | Node test-runner + Jest suites | One test imports a non-existent file → broken |

### 3.2 Frontend (`frontend/src`)

| Folder | Purpose | Notes |
|---|---|---|
| `pages/` | 13 app pages + 10 admin brain pages + 10 admin intelligence pages | `product-intelligence` route is a redirect |
| `components/` | AppLayout, AdminLayout, IntelligenceLayout, AIContentStudio (1269 L), EnterpriseActionWorkspace (1195 L), EnterpriseDecisionSuite (1002 L), email/, SEO/, ui/ (46 shadcn files) | `ui/` only used by dead code |
| `modules/` | 11 feature modules | Only crm-automation, email-automation, campaign-planning, sales-copilot are reachable via AutomationCenterPage; the rest excluded from tsconfig |
| `lib/` | api.ts (813 L fetch client), normalizers, admin-api, intelligence-api, contexts, stores | ~10 dead files (chat-store, chat-context, sample-data, lovable-error-reporting…) |
| `context/` | AuthContext, ProjectContext (live); chat-store/chat-context dead | |
| `hooks/` | use-mobile (dead), useFormPersistence (dead) | |

---

## 4. Module Deep-Dive

### 4.1 Authentication & Users

- **Purpose:** register/login/me/logout; role-gated admin.
- **Flow:** `auth.routes` → `auth.controller` (zod) → bcrypt compare → JWT `{userId,email,role}` 7-day → `auth.middleware` re-fetches user per request, throttles `lastActiveAt` writes (5-min in-memory Map).
- **DB tables:** `User`, `Notification`.
- **Frontend:** LoginPage, RegisterPage, ProfilePage, `AuthContext`.
- **Problems:** `logout` is a no-op (no revocation); `role` claim trusted for 7 days (demoted admins keep power); `req.user` includes the bcrypt password hash (`auth.middleware.js:67`); tokens in localStorage (XSS-exposed); auth limiter only active in production.

### 4.2 Chat & Analysis Engine

- **Purpose:** the primary UX — chat per project ("chat" = workspace/project container keyed to a URL).
- **Flow:** `chat.routes` (12 routes incl. `/:chatId/full-results`) → `message.controller` → `analysis.service` → **Tavily `v1/research` direct call** (synchronous, in request path) → assistant message persisted.
- **DB tables:** `Chat`, `Message`, `Analysis`.
- **Frontend:** ChatHistoryPage, DashboardPage.
- **Problems:** LLM+research chain runs **synchronously per user message** (no queue, no timeout, no cache); chat.controller is 43 KB; ownership checks inconsistent across the 12 routers sharing `/api/chats`.

### 4.3 Research Engine

- **Purpose:** collect evidence about companies/products/markets from web sources.
- **Services:** `research-orchestrator.service.js` (26 KB — collects research + runs a **Tavily–PageSpeed–scraper** chain), `business-intelligence.service.js` (30 KB), `market/competitor/company/audience-intelligence.service.js`, `scraper.service.js` (24 KB, 4-scraper serial chain: Firecrawl → Jina → scrapingbee → cheerio), `evidence-validator`, `executive-story`, `action-plan`.
- **Flow:** orchestrator → parallel Tavily + PageSpeed → scraper chain → normalizers → evidence snapshot (`EvidenceSnapshot`).
- **External APIs:** Tavily (key sent in body **and** header), Firecrawl, Jina, Exa, PageSpeed (3 retries, 5-min cache), CrUX, GitHub (token).
- **DB tables:** `EvidenceSnapshot`, `ProductIntelligence`, `CompetitorIntelligence`.
- **Problems:** SSRF — arbitrary `websiteUrl` fetched with no private-IP/allowlist check (`POST /api/scrape/product-website`, `POST /:chatId/evidence/collect`); serial scraper chain up to ~65 s per call; scraped HTML interpolated into prompts with no prompt-injection defenses.

### 4.4 Evidence Module

- **Purpose:** structured evidence collection for claims.
- **Flow:** `POST /:chatId/evidence/collect` → `evidence.service` → scraper + parallel robots/sitemap/pagespeed/github/technology/schema/opengraph checks → `evidence.normalizer.js` (26 KB) → `EvidenceSnapshot`.
- **Duplicate:** second evidence service at `src/domains/research/services/evidence.service.js` (used by SEO + intelligence) — two implementations of `getLatestEvidenceSnapshot`.

### 4.5 SEO Intelligence

- **Purpose:** technical SEO, keywords, competitor SEO, content gap, geo, blog ideas, executive dashboard, action plan.
- **Live chain:** `seo.routes` → `domains/seo/services/seoIntelligence.service.js` (wrapper) → `services/seo/seo-orchestrator.service.js` → provider router (SerpAPI ↔ DataForSEO, 24-h in-memory cache, circuit breaker) → keyword-intelligence (45 KB) + competitor-seo-intelligence (61 KB) + content-gap (28 KB) + geo (43 KB) + blog + executive-dashboard-generator (79 KB).
- **Dead duplicates:** `modules/seo-intelligence/seoIntelligence.service.js` (71 KB, no importers); legacy chain `ai/services/seoIntelligence.service.js` + `domains/seo/services/seo.service.js` (mutually-referencing dead pair); `executive-dashboard.service.js` (36 KB dead vs live 79 KB generator); `keyword-pipeline`, `competitor-pipeline`, `seo-provider-capability-manager` (dead).
- **DB tables:** `SeoIntelligence` + 12 child tables (`KeywordIntelligenceRecord`, `SeoCompetitorIntelligence`, `GeoIntelligenceRecord`, `ContentGapRecord`, `BlogIntelligenceRecord`, `CompetitorSeoRecord`, `TechnicalSeoAudit`, `SeoScoreBreakdown`, `TopicCluster`, `ExecutiveSeoDashboard`, `RawCrawlData`).
- **Frontend:** SEOIntelligencePage (2092 L), `components/SEO/`.
- **Problems:** 3 parallel implementations of the same responsibility; heavy synchronous chain in request path; `seo.controller.js:51` returns `statusUrl` pointing to the **unmounted** `/api/jobs` router.

### 4.6 Product Analysis (5 parallel implementations)

1. `ai/services/productAnalysis.service.js` → `/api/product-analysis/:chatId/run` (live)
2. `domains/content/services/productAnalysis.service.js` (22.9 KB) — **dead**
3. `domains/content/controllers/product.controller.js` → `/api/chats/:chatId/product-analysis/run`
4. `domains/analytics/controllers/analysis.controller.js` → `/api/analysis/product`
5. `modules/product-intelligence/product.service.js` → `/api/chats/:chatId/product-intelligence/product/run`
- Same pattern for market discovery (2 impls) and audience intelligence (2 impls).

### 4.7 Growth Workspace

- **Purpose:** 8-panel executive analysis (Executive Summary, Opportunity Radar, Market Position, Audience, Competitors, Positioning, Campaign Command Center, Growth Action Plan).
- **Service:** `growthWorkspace.service.js` (**107 KB — largest file in backend**): `runFullGrowthAnalysis` = research + 8 sequential AI stages with per-stage fallback generators (`fallback.generators.js`, 36 KB of hardcoded fallback data).
- **Frontend:** GrowthWorkspacePage (1636 L).
- **Problems:** god-file; **8 sequential LLM calls per request** (60–120+ s latency); fallback generators fabricate data indistinguishable from AI output; `Math.random()` used for difficulty/confidence in frontend (`GrowthWorkspacePage.tsx:606`).

### 4.8 Campaign Planner

- **Purpose:** 30/60/90-day/quarterly campaign plans.
- **Flow:** `campaign.controller` (`POST /:chatId/generate`) or `marketing-execution.service` module #5 → `campaign-planner.service.js` → AI → `CampaignPlan`.
- **Consumers:** campaign routes + automation execution chain. Clean, no duplication found. Supporting `campaign-intelligence.service.js` (79.5 KB god-file) for intelligence.

### 4.9 Content Studio

- **Purpose:** generate social/blog/page/document/script content + plan, quality-score, version, deploy to Brevo.
- **Flow:** `automation.controller` (`POST /:chatId/content`) → `content-studio.service.js` (68 KB) → 5 content agents (`social.agent.js` 29 KB, `page.agent.js` 21 KB, `blog.agent.js` 17 KB, `script.agent.js` 15 KB, `document.agent.js` 14 KB) → claim-validator → content-schemas (36 KB) → quality-review/scorer (37 KB) → content-memory → `AutomationAsset`.
- **Consumers:** automation controller, `marketing-execution.service.js` (module #1), email-workflow controller.
- **DB tables:** `AutomationPlan`, `AutomationAsset`, `AutomationLog`, `ExecutionRecord`, `AgentRun`.
- **Problems:** god-service; generate+score+save flow triplicated in controller (`generateContent`, `generateAllContent`, `regenerateContentAsset`); 7-stage persistence verification with extra DB round-trips per asset; serial `Promise` loops.

### 4.10 Email Engine

- **Purpose:** campaign generation, HTML templates, delivery (Brevo/SendGrid/SMTP), scheduling, webhooks, persistence, versions, approval workflow.
- **Flow:** email-campaign.routes (20+ endpoints) → `email-campaign-generator.service.js` (54 KB) → `email-html-generator` → `email-delivery.service` (sanitize → registry → queue or sync) → `email-persistence.service` → provider registry (circuit breaker).
- **External APIs:** Brevo transactional + campaign APIs, SendGrid, SMTP.
- **DB tables:** `EmailCampaign`, `EmailSequenceItem`, `EmailTemplate`, `EmailAutomation`, `EmailSchedule`, `EmailDeliveryLog`, `EmailEvent`, `EmailCampaignVersion`, `EmailCampaignLog`.
- **Duplication:** two same-named `brevo.provider.js` files (`services/providers/email/` vs `services/providers/brevo/`); two interface files (`email-provider.interface.js` + `email-provider-interface.js`); legacy seam `email-service-legacy.js` still used; **`automation.controller.js` imports both Brevo providers in one handler**.
- **Problems:** Brevo webhook HMAC **optional** and computed over re-serialized JSON (breaks signature verification); webhook always returns 200 even on failure; `sendCampaignEmail` can auto-approve bypassing review; double scheduling path (BullMQ delayed job + `EmailSchedule` DB poller) risks duplicate sends; frontend `sendTestEmailContent` logs full payloads + bodies (PII in console).

### 4.11 CRM

- **Purpose:** contacts, companies, deals, pipelines, tasks, activities, workflows (versioned, approval-gated), CSV import, lead journeys.
- **Architecture:** clean thin controllers (`domains/crm/controllers/*`) → `services/automation/crm-*.service.js` with shared `crm-data.service.js`. **The cleanest module in the codebase.**
- **DB tables:** 12 CRM tables (contact, company, pipeline/stage, deal, activity, task, workflow + version/execution/log, import job).
- **Frontend:** `modules/crm-automation/*` inside AutomationCenterPage.
- **Problems:** route-shadowing bug — `GET /:chatId/crm/import/jobs` unreachable (shadowed by `/:chatId/crm/import/:importId`, `crm.routes.js:132-133`); no zod validation on any of the 38 endpoints.

### 4.12 Sales Copilot

- **Purpose:** deal insights, next-best-action, follow-ups, proposals, meeting prep, customer health, conversation memory, automation actions.
- **Service:** `sales-copilot.service.js` (37 KB) → `sales-copilot.routes` (13 endpoints).
- **DB tables:** `DealInsight`, `Proposal`, `CustomerHealthSnapshot`, `SalesCopilotMemory`.
- **Frontend:** `modules/sales-copilot/*`.

### 4.13 Analytics / Dashboard

- **Purpose:** `/api/dashboard` summary + executive view per chat; `/api/analysis` product analysis (Tavily v1/research).
- **DB tables:** `AgentRun`, `SeoIntelligence`, etc. (aggregates).
- **Problems:** dashboard controller duplicates CRM context loading already in `crm-data.service.js`; sync Tavily call in request path.

### 4.14 Reporting (PDF/DOCX/PPTX)

- **Purpose:** executive/growth/SEO reports in 6 formats.
- **Flow:** `report.routes` → `report.controller` → **ReportQueue** (BullMQ) for pdf/docx/pptx → worker → `report-builder.service.js` (reads `ProductIntelligence`, `CompetitorIntelligence`, `CampaignIntelligence`, `SeoIntelligence` + 12 child tables) → `report-templates.service.js` (67 KB HTML) → `pdf-generator` (puppeteer singleton) / `docx-generator` / `pptx-generator` + `chart-generator` (inline SVG).
- **Frontend:** `downloadReport()` in `lib/api.ts`.
- **Problems:** files written to `local-assets/reports/` then served via **unauthenticated** `/api/local-assets` static route → any user with a guessable filename can download another tenant's report ⚠; json/csv/markdown build synchronously (unqueued); no pagination on the multi-table report queries; report data re-built every request (no cache).

### 4.15 Automation Center

- **Purpose:** orchestration of all execution modules + AI agents + approval center.
- **Flow:** `automation.routes` (22 endpoints) → `automation.controller` (50 KB, ~100 exports) → `automation.service` (53 KB) + `workflow.service` (14 KB) + `marketing-execution.service` (6-module chain: Content Studio → Email → Creative → Video → Campaign Planner → Social Calendar).
- **DB tables:** `AutomationPlan`, `AutomationAsset`, `AutomationLog`, `ExecutionRecord`, `AgentRun`, `Workflow*` (via domains/automation).
- **Problems:** god controller; `result.data?.lists || result.data?.lists || []` copy-paste bug (automation.controller.js:1407); duplicate `generate+score+save` flows.

### 4.16 Knowledge Graph

- **Purpose:** persistent entity graph (22 entity types, 10 relationship types) fed by evidence.
- **Services:** `EntityStore`/`RelationshipStore` (Prisma `GraphEntity`/`GraphRelationship`), `EntityResolver` (exact/canonical/fuzzy/URL), `GraphTraversal` (BFS/DFS), `GraphSearch`, `GraphHealth` (duplicates/staleness >90 days), `EntityGraphService.updateFromEvidence`.
- **DB tables:** `GraphEntity`, `GraphRelationship` (+ enums).
- **Reality check:** only **writers** are the graph stores; only **readers** are the admin controller and learning engines. No domain service writes/reads the graph — **the knowledge graph stays effectively empty in production** because nothing triggers full brain requests.

### 4.17 Learning Engine

- **Purpose:** execution stats, feedback, pattern discovery (6 methods), trend analysis, rule optimization, BrainIQ scoring.
- **DB tables:** `BrainExecution`, `BrainFeedback`, `BrainPattern`, `BrainRulePerformance`, `BrainLearningScore`.
- **Reality check:** writes happen only inside full brain requests; `FeedbackEngine` is never called by any controller; `RuleOptimizer`/`KnowledgeEvolution` are dormant. Learning is **statistics, not feedback-driven behavior change**.

### 4.18 Prompt Engine / AI Providers

- **Three parallel systems:**
  - `ai/services/aiRouter.service.js` (legacy-new): raw fetch, Groq→Gemini→OpenRouter→OpenAI, cooldowns (300 s / 60 s), JSON repair. Consumers: growth-workspace, competitor-discovery, research-orchestrator, keyword-intelligence.
  - `domains/ai/services/aiOrchestrator.service.js`: SDK-based singleton, Gemini/Groq/Cerebras/DeepSeek/OpenRouter + fallback provider. Consumers: ~20 files (automation, email, content agents, copilot).
  - `services/aiProvider.service.js`: **dead** (0 importers).
- **Problems:** the two live routers have **different provider sets and no shared fallback logic**; no timeouts on any provider call; aiOrchestrator forces `response_format: json_object` on providers that may reject it and defaults to `gemini-1.5-flash` when no model given; OpenRouter `HTTP-Referer: http://localhost:5000` hardcoded; 300-s cooldown only in one router.

### 4.19 Brain (Marketing Intelligence Core)

- **Purpose:** orchestrated pipeline memory → knowledge → evidence → adapter → graph → reasoning → recommendations → confidence → learning → quality → decision; 12 agents; decision engine with simulator/explainer/risk/tradeoff analysis.
- **Endpoints:** `/api/brain` (10), `/api/admin/brain` (14), `/api/admin/intelligence` (12).
- **Reality check:** **zero production domain services import the brain.** It is only exercised through admin/decision APIs. `brainMiddleware` (mounted on every `/api` request) is a no-op. 26 modules + 12 agents boot synchronously at startup (cold-start cost).
- **DB tables:** `BrainExecution` (also reused for decisions via `DecisionMemory`), `BrainFeedback`, `BrainPattern`, `BrainRulePerformance`, `BrainLearningScore`, `GraphEntity`, `GraphRelationship`.

### 4.20 Autonomous Layer

- **Purpose:** market/competitor/trend monitoring, SEO/content/lead opportunity engines, campaign optimizer, alerts, insights, scoring, scheduling.
- **⚠ CRITICAL:** every module returns **hardcoded demo data** — fake trends (`IT-001`, "Gartner Hype Cycle", "$2.1B in 2026"), fake leads (`HVP-001 TechGrowth Inc.`, `marketing@techgrowth.io`), fake alerts. No DB reads, no external API calls.
- **Scheduling is dead:** `AutonomousScheduler.startAll()`, `BrainScheduler.start()`, and `jobs/scheduler.js startScheduler()` are never called. Nothing persists — every `GET /api/admin/intelligence/*` re-runs the modules on demand.
- **Frontend:** 10 admin intelligence pages render this data as real.

### 4.21 Jobs, Queues, Caching

- **Queues:** `ScrapingQueue` (website-scrape, seo-audit), `AIQueue` (content-generation), `EmailQueue` (scheduled-campaign, send-email, generic fallback), `CRMQueue` (execute-workflow), `ReportQueue` (any). Attempts 3, exponential backoff, concurrency 5 each.
- **DB pollers:** `scheduled-email-processor.js` (60-s poll of `EmailSchedule`); `scheduler.js` (CRM date-reached trigger — **never started**, dead).
- **Redis fallback:** when Redis is down, queues return `null` and heavy work falls back **synchronously** into the request path.
- **Caching:** SerpAPI availability (60 s), PageSpeed (5 min), SEO provider router (24 h, 500 entries), unified evidence graph (10 min), in-memory cooldown maps. **No caching** for report-builder, SEO results, growth workspace, chat analysis.
- **Problems:** double scheduling of email campaigns (BullMQ delay + DB poller); no dead-letter queue; `seo-audit` status URL points at dead `/api/jobs` router; scheduler.js dead despite docs referencing it.

---

## 5. External APIs (complete inventory)

| Provider | Env var | Used by | Status |
|---|---|---|---|
| Google Gemini | GEMINI_API_KEY | aiRouter, aiOrchestrator | live |
| Groq | GROQ_API_KEY | aiRouter, aiOrchestrator | live |
| OpenAI | OPENAI_API_KEY | aiRouter, aiOrchestrator | live |
| OpenRouter | OPENROUTER_API_KEY | aiRouter, aiOrchestrator | live |
| DeepSeek | DEEPSEEK_API_KEY | aiOrchestrator | live |
| Cerebras | CEREBRAS_API_KEY | aiOrchestrator | live |
| Tavily | TAVILY_API_KEY | research, chat analysis | live (key sent twice) |
| DataForSEO | DATAFORSEO_LOGIN/PASSWORD | SEO pipelines | live |
| SerpAPI | SERPAPI_API_KEY | SEO provider router | live |
| Serper | SERPER_API_KEY | marketDiscovery research | live (unused module) |
| Firecrawl | FIRECRAWL_API_KEY | scraper chain | live |
| Jina | JINA_API_KEY | scraper chain | live |
| Exa | EXA_API_KEY | SEO enrichment | live |
| PageSpeed | PAGESPEED_INSIGHTS_API_KEY | SEO/evidence/business-intel | live |
| Chrome UX | CHROME_UX_API_KEY | technical SEO | live |
| GitHub API | GITHUB_TOKEN | evidence | live |
| Brevo | BREVO_API_KEY | email (2 provider files) | live |
| SendGrid | SENDGRID_API_KEY | email registry | live |
| SMTP | SMTP_HOST/PASS | email registry | live |
| Cloudinary | CLOUDINARY_URL | image storage | live |
| Pollinations / FAL | — / FAL_API_KEY | image generation | live |
| Shotstack / Creatomate | SHOTSTACK_API_KEY / CREATOMATE_API_KEY | video rendering | live |
| **Ahrefs** | AHREFS_API_KEY | — | **dead** (0 importers) |
| **SEMrush** | SEMRUSH_API_KEY | — | **dead** (0 importers) |
| Google OAuth, Stripe | GOOGLE_OAUTH_*, STRIPE_* | auth/integrations | env-checked only |

---

## 6. Database Models (71) — usage status

**Live core:** User, Chat, Message, Analysis, Notification, ProductProfile, ProductAnalysis, ProductIntelligence, CompetitorIntelligence, CampaignIntelligence, CampaignPlan, SeoIntelligence + 12 SEO child tables, RawCrawlData, TechnicalSeoAudit, SeoScoreBreakdown, EvidenceSnapshot, AutomationPlan, AutomationAsset, AutomationLog, ExecutionRecord, AgentRun, EmailCampaign + 8 email tables, CRM 12 tables, SalesCopilotMemory, DealInsight, Proposal, CustomerHealthSnapshot, GraphEntity, GraphRelationship, BrainExecution, BrainFeedback, BrainPattern, BrainRulePerformance, BrainLearningScore, ExecutiveSeoDashboard.

**⚠ Unused models (no code references anywhere):**
- `GrowthSprint` — no references
- `GrowthTask` — no references

**⚠ Effectively dormant (only reachable via brain internals, no production trigger):** `GraphEntity`, `GraphRelationship`, `BrainExecution`, `BrainFeedback`, `BrainPattern`, `BrainRulePerformance`, `BrainLearningScore` — tables exist, code exists, but nothing in the product domain invokes the brain pipeline that populates them.

---

## 7. Problems Found

### 7.1 Duplicate services (highest-impact)

| # | Duplication | Files |
|---|---|---|
| D1 | **3 AI routers** | `ai/services/aiRouter.service.js` (live), `domains/ai/services/aiOrchestrator.service.js` (live, different providers), `services/aiProvider.service.js` (dead) |
| D2 | **5 product-analysis implementations** | `ai/services/productAnalysis.service.js`, `domains/content/services/productAnalysis.service.js` (dead), `product.controller.js` (inline), `analysis.controller.js`, `modules/product-intelligence/product.service.js` |
| D3 | **4 SEO-intelligence implementations** | `domains/seo/services/seoIntelligence.service.js` (live wrapper), `services/seo/seo-orchestrator.service.js` (live), `modules/seo-intelligence/seoIntelligence.service.js` (dead), `ai/services/seoIntelligence.service.js` + `domains/seo/services/seo.service.js` (dead chain) |
| D4 | **2 Brevo providers, same filename** | `services/providers/email/brevo.provider.js` vs `services/providers/brevo/brevo.provider.js` — imported together in `automation.controller.js:1344` |
| D5 | **2 email interfaces** | `email-provider.interface.js` vs `email-provider-interface.js` |
| D6 | **2 evidence services** | `domains/research/services/evidence.service.js` vs `modules/evidence/evidence.service.js` |
| D7 | **2 `buildEvidenceContext`** (different signatures) | `execution/evidence-context-builder.service.js` vs `evidence.normalizer.js` |
| D8 | **3 evidence-graph builders** | `unified-evidence-graph.service.js` (live), `content-evidence-graph.service.js` (dead), `normalizers/evidence-graph.js` (dead) |
| D9 | **2 executive dashboard builders** | `executive-dashboard.service.js` (dead) vs `executive-dashboard-generator.service.js` (live) |
| D10 | **2 scheduling systems** | BullMQ delayed `scheduled-campaign` + `EmailSchedule` DB poller (both can fire); `jobs/scheduler.js` (dead) vs `autonomous/AutonomousScheduler.js` (never started) |
| D11 | **2 CRM context loaders** | `crm-data.service.js` vs inline loader in `crm.routes.js:48` |
| D12 | **2 decision engines** | brain `DecisionEngine` vs `AutonomousDecisionModule`'s own instance |
| D13 | **2 SEO provider selection layers** | `seo-provider-router.service.js` (live) vs `seo-provider-capability-manager.service.js` (dead) |

### 7.2 Dead code (backend)

`src/routes/jobs.routes.js` (referenced by seo.controller statusUrl!), `src/routes/diagnostics.routes.js`, `src/modules/seo-intelligence/seoIntelligence.service.js` (71 KB), `src/domains/content/services/productAnalysis.service.js` (23 KB), `src/ai/services/seoIntelligence.service.js` + `src/domains/seo/services/seo.service.js`, `src/providers/ahrefs.service.js`, `src/providers/semrush.service.js`, `src/services/aiProvider.service.js` (31 KB), `src/services/automation/campaign-consistency.validator.js`, `src/services/execution/content-evidence-graph.service.js`, `src/services/normalizers/evidence-graph.js`, `src/services/seo/executive-dashboard.service.js` (36 KB), `competitor-pipeline.service.js`, `keyword-pipeline.service.js`, `seo-provider-capability-manager.service.js`, `email-template-renderer.service.js`, `loaders/evidence-context-loader.js`, `brain/helpers/withBrain.js`, `domains/ai/services/aiAnalytics.service.js`, `domains/ai/services/promptManager.service.js`, `jobs/scheduler.js`, `src/brain/` autonomous scheduler wiring, empty dirs `repositories/`, `database/`, `validators/`. Plus broken test import: `src/__tests__/email-workflow.test.js:26` imports non-existent `services/integrations/email/brevo.provider.js` (the repo's own import-check script crashes on it).

### 7.3 Dead code (frontend)

~**16,000 of 33,800 lines unreachable**, formally documented in `frontend/tsconfig.json` excludes: entire `src/modules/*` (only crm-automation, email-automation, campaign-planning, sales-copilot reachable transitively), 46 files in `components/ui/`, `ui-kit.tsx`, both sidebars, `lib/auth.ts`, `lib/chat-context.tsx`, `lib/chat-store.ts`, `lib/config.server.ts`, `api/example.functions.ts` (imports `@tanstack/react-start` — **not in package.json**), `lib/content-renderers.ts`, `lib/error-capture.ts`, `lib/error-page.ts`, `lib/lovable-error-reporting.ts`, `lib/sample-data.ts`, `modules/growth-workspace/WorkflowResultViewer.tsx`, root `components/EmailRenderer.tsx`, `hooks/use-mobile.tsx`, `hooks/useFormPersistence.ts`.

### 7.4 Unused APIs

- `GET /api/jobs/:queueName/:jobId/status` — router never mounted (but referenced by clients!)
- `GET /api/chats/:chatId/email-campaign/segments` — **shadowed**, unreachable (route-order bug, email-campaign.routes.js:46 vs 394)
- `GET /api/chats/:chatId/crm/import/jobs` — **shadowed**, unreachable (crm.routes.js:132 vs 133)
- `GET /api/chats/:chatId/seo-intelligence/providers` — exposed but consumer unclear
- All `/api/brain/*` and `/api/admin/brain/*` endpoints — functional but have no product consumers
- All `/api/admin/intelligence/*` — serve fabricated data

### 7.5 Unused DB models

`GrowthSprint`, `GrowthTask` (zero references). Dormant: all `Graph*` and `Brain*` tables.

### 7.6 Circular dependencies / wrong abstractions

- **Circular/mutual import chain:** `ai/services/seoIntelligence.service.js` ↔ `domains/seo/services/seo.service.js` — only reference each other, both dead.
- **Wrong abstraction:** "Adapters" (11 `brain/adapters/*`) duplicate the real `services/intelligence/*` logic instead of wrapping it (only `CompanyAdapter` is injected with the real service).
- **Wrong abstraction:** `dto/` files are AI-output normalizers, not DTOs — and are unused.
- **Wrong abstraction:** `automation.controller.js` contains business logic (Brevo deploy, 7-stage asset verification) — controller-as-service.
- **Wrong abstraction:** `ai/services` layer vs `domains/ai` vs `services/*` — three parallel layering philosophies coexist (`ai/` prefix folder, `domains/` feature folders, `modules/` legacy feature folders).
- **Violated layering:** `chat.controller.js` (controller) does DB work directly; `automation.controller.js` imports services from 4 different folders.
- **Inverted dependency:** `evidence.normalizer.js` (module layer) used by `growth-workspace.service` (service layer) and `unified-evidence-graph` — cross-layer imports in both directions.

### 7.7 Architecture smells

- **God files:** growthWorkspace.service.js (107 KB), campaign-intelligence.service.js (79.5 KB), executive-dashboard-generator.service.js (79 KB), modules/seo-intelligence (71 KB), content-studio.service.js (68 KB), report-templates.service.js (67 KB), competitor-seo-intelligence.service.js (61 KB), email-campaign-generator.service.js (54 KB), automation.service.js (53 KB), automation.controller.js (50 KB), chat.controller.js (44 KB).
- **12 routers stacked on one `/api/chats` prefix** — order-dependent route resolution; any new short route in `chat.routes.js` shadows deeper modules silently.
- **No migration discipline:** 25 migrations in 7 weeks, including `fix_schema_drift` and `fix_seo_child_unique_relations` — schema churn.
- **Frontend:** `Math.random()` for difficulty in GrowthWorkspacePage.tsx:606 (fabricated confidence); a duplicated old dashboard copy committed at repo root (`ai_marketing_platform_dashboard_fixed (3)/market-genesis-ai-main`, 50,731 files) — repo hygiene.
- **The project's own import-check script crashes** — CI can't even verify module integrity.
- Multiple `.env*` files committed (`backend/.env`, `.emv` typo file) — secret management risk.
- No `repositories/` layer used despite the folder existing; controllers query Prisma directly everywhere.

### 7.8 Security issues

| Severity | Issue | Location |
|---|---|---|
| HIGH | **Unauthenticated static file serving** of tenant PDF/DOCX/PPTX reports | server.js:411-412 + worker.js:174-183 (`/api/local-assets`) |
| HIGH | **SSRF**: arbitrary URL scraping without private-IP/allowlist checks | scrape.routes, evidence/collect, scraper.service, research-orchestrator:201 |
| HIGH | **Fabricated business intelligence served as real** (fake leads, contacts, trends) | autonomous/* + intelligence.controller + 10 admin pages |
| MEDIUM | Brevo webhook HMAC optional; computed over re-serialized body (signature mismatch); always 200 | email-campaign.routes.js:509-620 |
| MEDIUM | JWT role claim trusted 7 days; logout no-op; `req.user` carries bcrypt hash; tokens in localStorage | auth.middleware.js:67, auth.controller.js |
| MEDIUM | Port-killing startup routine (`taskkill /F`) | server.js:124-162 |
| MEDIUM | Helmet CSP allows `unsafe-inline`/`unsafe-eval` | server.js:186-201 |
| MEDIUM | CORS: dev allows any origin with credentials; `*.vercel.app` wildcard in prod | server.js:239-252 |
| MEDIUM | PII logging: email bodies logged (200 chars) on email-workflow routes; auth steps + emails logged; frontend logs full payloads | email-workflow.routes.js:25-30, api.ts sendTestEmailContent |
| MEDIUM | Prompt injection: raw scraped HTML interpolated into prompts | growthWorkspace.service.js, research-orchestrator |
| LOW | Tavily key sent in body + header (double exposure); `.env` files in repo; OpenRouter referer leaks hostname | tavily.service.js:21-27 |
| LOW | Rate limiters **disabled outside production** | server.js:203-229 |

### 7.9 Performance bottlenecks

1. **Synchronous LLM chains in request path**: chat message → Tavily research (unbounded); growth workspace → 8 sequential AI calls (minutes); evidence collect → 4-scraper chain (~65 s) all block the HTTP response.
2. **No timeouts on any AI provider call** (both routers) — hung provider = hung request.
3. **Redis fallback to sync**: queues return null without Redis; heavy work executes inline.
4. **Report builder**: multi-table includes, no pagination, no caching; only 3 of 6 formats are queued.
5. **Duplicate DB round-trips**: 7-stage asset verification; `lastActiveAt` write per request (throttled 5 min, unbounded Map).
6. **Unbounded prompts**: `limitArray` (3200-char truncation) exists only in the dead aiProvider service; live prompts unbounded → token cost + latency.
7. **CPU-bound cheerio parsing** in-process per scrape.
8. **Cold start**: 26 brain engines + 12 agents + 12-adapters health report boot synchronously.

### 7.10 Scalability issues

- Single Express process runs web + workers + schedulers + brain (Render single instance) — worker backpressure competes with request handling.
- All queues/workers co-located (concurrency 5 × 5 workers = 25 parallel jobs in the API process).
- In-memory state everywhere: provider cooldowns, SerpAPI status, alert manager, autonomous results — lost on restart, not shareable across instances.
- No dead-letter queue / no job retry observability.
- No pagination on report queries, no indexes visible for JSON query paths (e.g. `Chat.results` JSONB lookups).
- 12 routers on one prefix make horizontal API splitting hard.
- Frontend/backend coupled via chatId-centric URL scheme (single chat = single project = single "tenant" granularity).

---

## 8. Risk Assessment

| Area | Risk | Confidence | Impact |
|---|---|---|---|
| Autonomous intelligence serves fabricated data | **CRITICAL** | Verified (hardcoded arrays) | Trust/legal (fake leads, fake contacts) |
| Unauthenticated report downloads | **HIGH** | Verified | Cross-tenant data leak |
| SSRF via scrape/evidence endpoints | **HIGH** | Verified | Internal network compromise |
| Route shadowing (segments, import/jobs) + 12 routers on /api/chats | **HIGH** | Verified (2 confirmed bugs) | Silent feature failure; regression-prone |
| Duplicate AI/SEO/product systems | **HIGH** | Verified | Inconsistent outputs, doubled cost, drift |
| Email double-scheduling | **MEDIUM** | Verified (two mechanisms) | Duplicate sends |
| Brain/graph/learning dormant (10+ modules, 12 agents) | **MEDIUM** | Verified | Wasted ~500 KB of code; false sense of capability |
| No provider timeouts; sync heavy chains | **MEDIUM** | Verified | Availability risk under load |
| ~50% frontend dead code; tsconfig-based build survival | **MEDIUM** | Verified | Build fragility (excludes hide real breakages) |
| Dead jobs router referenced by live controller | **LOW** | Verified | Broken UX (status polling 404s) |

**Overall: HIGH RISK.**

---

## 9. Suggested Improvements (prioritized roadmap)

### Phase 1 — Safety (immediate, 1–2 sprints)
1. **Kill the fabricated-data endpoints**: tag `/api/admin/intelligence/*` as demo; add `dataSource: 'DEMO'` flags, or remove until real pipelines exist. Never let hardcoded leads/contacts reach real users.
2. **Authenticate `/api/local-assets`** — sign report URLs (HMAC token in path) or move downloads behind an authenticated streaming endpoint with ownership check.
3. **SSRF guard**: central URL-validate utility — reject private/loopback/link-local IPs, non-http(s) schemes, unusual ports; apply in scrape, evidence, research-orchestrator, robots/sitemap fetchers.
4. **Timeouts on all AI/provider fetches** (AbortSignal) + tighten Brevo webhook (require HMAC, sign raw body, honor non-200 responses).
5. **Remove `killProcessOnPort`** from production boot path.
6. **Drop `password` from `req.user`**; re-validate role from DB on admin endpoints.

### Phase 2 — Consolidation (2–4 sprints)
7. **Pick one AI router**: fold `aiOrchestrator` features (Cerebras/DeepSeek) into `aiRouter` or vice versa; single diagnostics function; delete the dead `aiProvider.service.js`.
8. **Collapse SEO to one orchestrator**; delete `modules/seo-intelligence`, dead legacy chain, dead pipelines, dead dashboard builder.
9. **Collapse product analysis to one service**; delete the 23 KB dead twin.
10. **Unify Brevo**: one provider file with both transactional + campaign APIs; one interface file; delete legacy seam.
11. **Unify evidence services** (`getLatestEvidenceSnapshot`), evidence-graph builders, CRM context loaders, decision engine instantiation.

### Phase 3 — Structure (1–2 months)
12. **Fix route architecture**: mount modules by explicit prefix (`/api/seo/:chatId/...`, `/api/crm/:chatId/...`, `/api/growth/:chatId/...`) instead of 12 routers on `/api/chats`; add a route-ordering lint (express route-shadow detector) and a contract test.
13. **Break god-files** (growthWorkspace 107 KB, campaign-intelligence 79.5 KB, content-studio 68 KB) along the existing clean seams (research / analysis / fallback / persistence).
14. **Wire the Brain or delete it**: either make `research-orchestrator`/SEO/campaign write to the knowledge graph and read recommendations in prompts, or quarantine `brain/` + `autonomous/` behind a feature flag. Decide — half-integrated is the worst state.
15. **Clean frontend dead code** using tsconfig excludes as the manifest; restore `@tanstack` packages or remove the files importing them; remove `Math.random()` confidence values; remove double-`/api` prefixes in dead stores; delete the `ai_marketing_platform_dashboard_fixed (3)` folder from the repo.
16. **Unify scheduling**: one scheduler (BullMQ `repeatable jobs` or one DB poller) for email + CRM + autonomous; remove the double-send path; start or delete `jobs/scheduler.js`.
17. **Validation**: extend zod middleware to CRM (38 endpoints), email-campaign, evidence, growth-workspace, copilot.
18. **Caching**: memoize report-builder data (hash of chat + intelligence versions), cache SEO results by chat+provider snapshot, cache analysis results by message hash.

### Phase 4 — Scale (quarterly)
19. Separate web/worker/brain processes; Redis-required production mode (fail fast instead of silent sync fallback); dead-letter queues + job observability; paginate report queries; bounded-concurrency `Promise.all` for content generation; move scraper CPU work to dedicated workers.

---

## Appendix A — Backend endpoint inventory (by mount)

| Mount | Router | # endpoints | Sample |
|---|---|---|---|
| /api/auth | auth | 4 | register, login, me, logout |
| /api/chats | chat | 14 | messages, full-results, campaign-intelligence |
| /api/chats | seo | 9 | seo-intelligence/run, keywords, geo, dashboard |
| /api/chats | product | 9 | product-profile, product-analysis, product-intelligence/* |
| /api/chats | competitor-intelligence | 4 | competitors/run, intent/run, positioning/run |
| /api/chats | agents (ai-assistant) | 2 | ai-assistant/chat |
| /api/chats | workflow | 6 | solution, workflow/start/status/step |
| /api/chats | growth-workspace | 3 | run-full-analysis, results, status |
| /api/chats | report | 5 | report/executive|growth|seo/:format, export, status |
| /api/chats | evidence | 2 | evidence/collect |
| /api/chats | email-campaign | 20+ | generate, approve, schedule, send, versions |
| /api/chats | crm | 38 | contacts/deals/pipelines/workflows/import/lead-journey |
| /api/chats | sales-copilot | 13 | deals/:id/insights, nba, proposals, health |
| /api/automation | automation | 22 | plan, content, content/plan, assets, execute |
| /api/campaign | campaign | 3 | generate, plan, status |
| /api/product-analysis | productAnalysis | 2 | run (legacy AI) |
| /api/analysis | analysis | 1 | product |
| /api/scrape | scrape | 1 | product-website |
| /api/dashboard | dashboard | 3 | summary, executive/:chatId, export |
| /api/integrations | integrations | ~8 | health, studio/email, creative, video |
| /api/user | user | 2 | me |
| /api/notifications | notification | 4 | list, read, read-all, clear |
| /api/brain | brain | 10 | agents/task, decisions/*, learning |
| /api/admin/brain | admin.brain | 14 | dashboard, graph, learning, executions |
| /api/admin/intelligence | intelligence | 12 | market, competitors, trends, alerts, run-cycle |
| /api/content/email | email-workflow | ~18 | generate, draft, templates, send-test, schedule |
| /api/webhooks/email | brevo webhook | 1 | brevo |
| /api/local-assets | static | — | unauthenticated file serving |
| /api/health, /api/version | inline | 3 | health, health/database, version |

## Appendix B — Frontend route table

| Path | Page | Module |
|---|---|---|
| / | LandingPage | — |
| /login, /register | Login/Register | — |
| /app/dashboard | DashboardPage | Analytics |
| /app/growth-workspace | GrowthWorkspacePage | Growth Workspace |
| /app/seo | SEOIntelligencePage | SEO Intelligence |
| /app/campaigns | CampaignIntelligencePage | Campaign |
| /app/executive-story | ExecutiveStoryPage | Reporting |
| /app/automation-center | AutomationCenterPage | Automation (CRM, Email, Campaign Planning, Copilot, Agents) |
| /app/content-studio | ContentStudioPage | Content Studio |
| /app/email-builder | EmailWorkflow (component) | Email |
| /app/chat-history | ChatHistoryPage | Chat |
| /app/profile, /app/settings | Profile/Settings | User |
| /admin/brain/* (10) | Admin pages | Brain admin |
| /admin/intelligence/* (10) | Intelligence pages | Autonomous layer |
