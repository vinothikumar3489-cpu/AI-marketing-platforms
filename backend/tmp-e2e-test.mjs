import 'dotenv/config';
import { runFullGrowthAnalysis } from './src/modules/growth-workspace/growthWorkspace.service.js';
import { generateCompleteSeoIntelligence } from './src/services/seo/seo-orchestrator.service.js';
import { collectResearchData, detectTechnologyStack } from './src/services/intelligence/research-orchestrator.service.js';
import { discoverCompetitors } from './src/providers/competitor-discovery.service.js';
import { cleanValue, scrubPlaceholders, safeStringify } from './src/utils/clean-value.util.js';
import { callAI } from './src/ai/services/aiRouter.service.js';
import { getKeywordIdeaMetrics } from './src/providers/dataforseo.service.js';
import { prisma } from './src/config/prisma.js';
import fs from 'fs';

const RESULTS_FILE = './tmp-e2e-results.jsonl';
const out = (obj) => fs.appendFileSync(RESULTS_FILE, JSON.stringify(obj) + '\n');
const done = () => {
  if (!fs.existsSync(RESULTS_FILE)) return new Set();
  return new Set(fs.readFileSync(RESULTS_FILE, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(r => r.phase === PHASES.GW && r.ok).map(r => r.site));
};

const PHASES = {
  UNIT: 0,
  GEMINI: 1,
  DFS: 2,
  CASCADE: 3,
  RESEARCH: 4,
  GW: 5,
  SEO: 6
};

async function unitTests() {
  const failures = [];
  const cases = [
    [cleanValue('Unknown'), null],
    [cleanValue('N/A'), null],
    [cleanValue('Insufficient Data'), null],
    [cleanValue('  null '), null],
    [cleanValue('undefined'), null],
    [cleanValue('Real Value'), 'Real Value'],
    [cleanValue('TBD'), null],
    [cleanValue('[object Object]'), null],
    [scrubPlaceholders('Unknown'), null],
    [scrubPlaceholders('Price is Unknown and TBD, N/A data'), 'Price is Unknown and TBD, N/A data'],
    [safeStringify({ a: { b: 'x' } }), '{"a":{"b":"x"}}'],
    [cleanValue('0'), '0'],
    [cleanValue('12,345 users'), '12,345 users'],
    [cleanValue('Not Available'), null],
    [cleanValue('As of 2026, the market is growing.'), 'As of 2026, the market is growing.']
  ];
  for (const [got, want] of cases) {
    if (got !== want) failures.push({ got, want });
  }
  return { passed: cases.length - failures.length, total: cases.length, failures };
}

async function geminiSmoke() {
  try {
    const res = await callAI('Return ONLY compact JSON: {"answer":"PONG"}', 500);
    const ok = res.success && res.data && res.data.answer === 'PONG';
    return { ok, provider: res.provider, data: res.data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function dfsKeywordSmoke() {
  try {
    const res = await getKeywordIdeaMetrics(['seo audit software', 'growth marketing platform'], 'United States', 'English');
    if (!res.success) return { ok: false, unavailable: res.unavailable === true, reason: res.reason || res.error || 'failed' };
    const arr = res.results || [];
    return { ok: arr.length > 0, count: arr.length, sample: arr[0] || null };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function cascadeSmoke(site) {
  const start = Date.now();
  try {
    const res = await discoverCompetitors({ websiteUrl: site.url, productName: site.product, targetDomain: site.domain, max: 6, enrich: true });
    const comps = res.competitors || [];
    const names = comps.map(c => c.name || c.domain).slice(0, 8);
    return {
      ok: comps.length > 0,
      count: comps.length,
      names,
      sourcesUsed: res.sourcesUsed,
      sourceFailures: res.sourceFailures,
      missingFields: res.missingFields,
      durationMs: res.durationMs || Date.now() - start,
      warning: res.warning || null
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function researchSmoke(site) {
  const start = Date.now();
  try {
    const res = await collectResearchData({ websiteUrl: site.url, productName: site.product, companyName: site.company, userId: TEST_USER_ID, chatId: null });
    const html = res.website?.content?.rawHtml || res.website?.rawHtml || '';
    const tech = detectTechnologyStack(html);
    return {
      ok: true,
      competitors: (res.competitors || []).length,
      techStack: tech || [],
      pricing: res.pricing ? { currency: res.pricing.currency, period: res.pricing.period, tiers: (res.pricing.tiers || []).length } : null,
      keywords: (res.keywords || []).length,
      durationMs: Date.now() - start,
      scraped: !!res.website
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function findLeaks(obj, path = '', leaks = []) {
  if (obj === null || obj === undefined || typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') return leaks;
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => findLeaks(v, `${path}[${i}]`, leaks));
    return leaks;
  }
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string' && (v === 'Unknown' || v === 'N/A' || v === 'Insufficient Data' || v === '[object Object]' || v === 'null' || v === 'undefined' || v === 'TBD' || v === 'Not Available')) {
      leaks.push(`${path}.${k} = "${v}"`);
    } else if (typeof v === 'object' && v !== null) {
      findLeaks(v, `${path}.${k}`, leaks);
    }
  }
  return leaks;
}

async function growthRun(site, skipIfDone) {
  if (skipIfDone && done().has(site.site)) return { skipped: true };
  const start = Date.now();
  try {
    const result = await runFullGrowthAnalysis({ chatId: null, userId: TEST_USER_ID, input: { websiteUrl: site.url, productName: site.product, companyName: site.company } });
    const summary = result.summary || result.growthSummary || {};
    const scores = [
      'overallGrowthScore', 'marketOpportunityScore', 'competitivePositionScore', 'audienceClarityScore',
      'campaignReadinessScore', 'brandAuthorityScore', 'revenuePotentialScore', 'productMaturityScore',
      'goToMarketReadinessScore', 'channelReadinessScore', 'pricingCompetitivenessScore', 'viralityScore', 'confidenceScore'
    ];
    const missingScores = scores.filter(s => summary[s] == null);
    const competitors = (summary.directCompetitors || []).length;
    const channels = (summary.recommendedChannels || []).filter(c => c && c.channel).length;
    const leaks = findLeaks(summary);
    const record = {
      phase: PHASES.GW, site: site.site, ok: missingScores.length === 0 && leaks.length === 0,
      overall: summary.overallGrowthScore, missingScores, channels, competitors,
      status: summary.growthScoreStatus || null,
      techStack: (result.analysisData?.technologyStack || []).length,
      leaks: leaks.slice(0, 5),
      durationSec: Math.round((Date.now() - start) / 1000)
    };
    out(record);
    return record;
  } catch (e) {
    const record = { phase: PHASES.GW, site: site.site, ok: false, error: e.message, durationSec: Math.round((Date.now() - start) / 1000) };
    out(record);
    return record;
  }
}

async function seoRun(site) {
  const start = Date.now();
  try {
    const res = await generateCompleteSeoIntelligence({ chatId: null, userId: TEST_USER_ID, websiteUrl: site.url, chat: { title: site.company } });
    const report = res.data || res.seoReport || res.report || res;
    const keywords = (report.keywordOpportunities || report.keywords || []).length;
    const kwMissingMetrics = (report.keywordOpportunities || report.keywords || []).filter(k => k.searchVolume == null && k.opportunityScore == null).length;
    const overall = report?.overallScore ?? report?.overall?.overallScore ?? null;
    const authority = report?.authorityScore ?? null;
    const tech = report?.technicalScore ?? report?.technical?.overallScore ?? null;
    const leaks = findLeaks(report);
    const record = {
      phase: PHASES.SEO, site: site.site, ok: overall != null && tech != null && leaks.length === 0,
      overall, tech, authority,
      keywords, kwMissingMetrics,
      backlinks: report?.backlinks ? { measured: report.backlinks.status === 'measured', count: report.backlinks.totalBacklinks } : null,
      warnings: (res.warnings || []).slice(0, 4),
      leaks: leaks.slice(0, 5),
      durationSec: Math.round((Date.now() - start) / 1000)
    };
    out(record);
    return record;
  } catch (e) {
    const record = { phase: PHASES.SEO, site: site.site, ok: false, error: e.message, durationSec: Math.round((Date.now() - start) / 1000) };
    out(record);
    return record;
  }
}

const TEST_USER_ID = process.env.TEST_USER_ID || 'test-e2e-user';

const SITES = [
  { site: 'virlo.ai', url: 'https://virlo.ai', product: 'AI Marketing Platform', company: 'Virlo', domain: 'virlo.ai' },
  { site: 'hubspot.com', url: 'https://www.hubspot.com', product: 'Marketing Hub', company: 'HubSpot', domain: 'hubspot.com' },
  { site: 'openai.com', url: 'https://openai.com', product: 'AI Research Platform', company: 'OpenAI', domain: 'openai.com' },
  { site: 'stripe.com', url: 'https://stripe.com', product: 'Payments Platform', company: 'Stripe', domain: 'stripe.com' },
  { site: 'shopify.com', url: 'https://www.shopify.com', product: 'E-commerce Platform', company: 'Shopify', domain: 'shopify.com' },
  { site: 'notion.so', url: 'https://www.notion.so', product: 'Productivity Workspace', company: 'Notion', domain: 'notion.so' },
  { site: 'linear.app', url: 'https://linear.app', product: 'Issue Tracking Software', company: 'Linear', domain: 'linear.app' },
  { site: 'vercel.com', url: 'https://vercel.com', product: 'Frontend Deployment Platform', company: 'Vercel', domain: 'vercel.com' }
];

const ARGS = process.argv.slice(2);
const mode = ARGS[0] || 'quick';
const onlySites = ARGS.slice(1).filter(a => !a.startsWith('--'));
const skipFlags = new Set(ARGS.filter(a => a.startsWith('--')));

async function main() {
  if (!fs.existsSync(RESULTS_FILE)) fs.writeFileSync(RESULTS_FILE, '');
  let user = await prisma.user.findUnique({ where: { id: TEST_USER_ID } });
  if (!user) {
    user = await prisma.user.create({ data: { id: TEST_USER_ID, email: 'test-e2e-user@example.com', name: 'E2E Test User', password: 'test-password' } });
    console.log('[E2E] created test user');
  }

  const results = [];
  const sites = SITES.filter(s => !onlySites.length || onlySites.includes(s.site));

  if (!skipFlags.has('--skip-units')) {
    const unit = await unitTests();
    results.push({ phase: PHASES.UNIT, ok: unit.passed === unit.total, ...unit });
    console.log(`[UNIT] ${unit.passed}/${unit.total}`, unit.failures.slice(0, 3));
  }

  if (!skipFlags.has('--skip-gemini')) {
    const g = await geminiSmoke();
    results.push({ phase: PHASES.GEMINI, ...g });
    console.log('[GEMINI]', g);
  }

  if (!skipFlags.has('--skip-dfs')) {
    const d = await dfsKeywordSmoke();
    results.push({ phase: PHASES.DFS, ...d });
    console.log('[DATAFORSEO]', d.ok ? `ok, ${d.count} keywords` : `FAIL ${d.error}`);
  }

  if (mode !== 'full') {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  // Full mode: cascade + research + GW for all sites, SEO for first two
  const concurrency = 2;
  const queue = [...sites];
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length) {
      const site = queue.shift();
      if (!skipFlags.has('--skip-cascade')) {
        const c = await cascadeSmoke(site);
        out({ phase: PHASES.CASCADE, site: site.site, ...c });
        console.log(`[CASCADE] ${site.site}:`, c.ok ? `${c.count} competitors` : `FAIL ${c.error}`);
      }
      if (!skipFlags.has('--skip-research')) {
        const r = await researchSmoke(site);
        out({ phase: PHASES.RESEARCH, site: site.site, ...r });
        console.log(`[RESEARCH] ${site.site}:`, r.ok ? `comps=${r.competitors} tech=${(r.techStack || []).length} pricing=${r.pricing ? 'yes' : 'no'} kw=${r.keywords}` : `FAIL ${r.error}`);
      }
      const g = await growthRun(site, true);
      console.log(`[GW] ${site.site}:`, g.ok ? `overall=${g.overall} comps=${g.competitors} ch=${g.channels}` : (g.skipped ? 'skipped' : `FAIL ${g.error}`));
      if (site.site === 'virlo.ai' || site.site === 'vercel.com') {
        if (!skipFlags.has('--skip-seo')) {
          const s = await seoRun(site);
          console.log(`[SEO] ${site.site}:`, s.ok ? `overall=${s.overall} tech=${s.tech} kw=${s.keywords}` : `FAIL ${s.error}`);
        }
      }
    }
  });
  await Promise.all(workers);
  console.log('DONE');
}

main().then(() => process.exit(0)).catch(e => { console.error('FATAL', e); process.exit(1); });
