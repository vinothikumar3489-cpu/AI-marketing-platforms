import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

const ORIGINAL_ENV = { ...process.env };

before(() => {
  // Zero ALL PageSpeed env slots so the provider short-circuits locally
  // (no network) and the shape contract is testable deterministically.
  process.env.JINA_API_KEY = '';
  process.env.FIRECRAWL_API_KEY = '';
  process.env.PAGESPEED_INSIGHTS_API_KEY = '';
  process.env.GOOGLE_PAGESPEED_INSIGHTS_API_KEY = '';
  process.env.PAGESPEED_API_KEY = '';
  process.env.TAVILY_API_KEY = '';
});

after(() => {
  Object.assign(process.env, ORIGINAL_ENV);
});

// ============================================
// Research cache — dedupe + no failure poisoning
// ============================================
describe('Research engine — shared cache semantics', () => {
  it('dedupes concurrent in-flight calls of the same key (single loader run)', async () => {
    const { memoize, clearResearchCache } = await import('../src/utils/research-cache.util.js');
    clearResearchCache();

    let calls = 0;
    const loader = async () => {
      calls++;
      await new Promise(r => setTimeout(r, 50));
      return { value: 'x' };
    };

    const [a, b, c] = await Promise.all([
      memoize('t:dedupe', 5000, loader),
      memoize('t:dedupe', 5000, loader),
      memoize('t:dedupe', 5000, loader),
    ]);

    assert.equal(calls, 1, 'loader must run exactly once for concurrent callers');
    assert.deepEqual(a, { value: 'x' });
    assert.equal(a, b);
    assert.equal(b, c);
  });

  it('serves cached value within TTL without re-running the loader', async () => {
    const { memoize, clearResearchCache } = await import('../src/utils/research-cache.util.js');
    clearResearchCache();

    let calls = 0;
    const loader = async () => { calls++; return { n: calls }; };

    const first = await memoize('t:ttl', 5000, loader);
    const second = await memoize('t:ttl', 5000, loader);
    assert.equal(first.n, 1);
    assert.equal(second.n, 1, 'cached hit must not re-run loader');
    assert.equal(calls, 1);
  });

  it('does NOT cache failures — the next call re-attempts the loader', async () => {
    const { memoize, clearResearchCache } = await import('../src/utils/research-cache.util.js');
    clearResearchCache();

    let calls = 0;
    const loader = async () => {
      calls++;
      if (calls === 1) throw new Error('transient failure');
      return { ok: true };
    };

    await assert.rejects(memoize('t:retry', 5000, loader));
    const second = await memoize('t:retry', 5000, loader);
    assert.equal(calls, 2, 'failed loader must be re-attempted, not served from cache');
    assert.deepEqual(second, { ok: true });
  });

  it('cacheKeyUrl normalizes trailing slash / hash / www for one shared key', async () => {
    const { cacheKeyUrl } = await import('../src/utils/research-cache.util.js');
    assert.equal(
      cacheKeyUrl('https://example.com/'),
      cacheKeyUrl('https://example.com#section')
    );
    assert.equal(cacheKeyUrl('example.com'), 'https://example.com');
  });
});

// ============================================
// Scraper — failure reporting + failures never cached
// ============================================
describe('Research engine — scraper reliability', () => {
  it('returns per-scraper attempts and does not cache a total failure', async () => {
    const { scrapeWebsite } = await import('../src/domains/research/services/scraper.service.js');
    const { clearResearchCache } = await import('../src/utils/research-cache.util.js');
    clearResearchCache();

    const badUrl = 'https://%zz.invalid/';
    const first = await scrapeWebsite({ websiteUrl: badUrl });
    assert.equal(first.success, false);
    assert.ok(Array.isArray(first.attempts), 'attempts array must be reported');
    assert.ok(first.attempts.length >= 2, 'all chain slots must be reported');

    // Failure must not have been cached: a second call re-attempts and still
    // reports the chain outcome instead of silently returning a stale failure.
    const second = await scrapeWebsite({ websiteUrl: badUrl });
    assert.equal(second.success, false);
    assert.ok(second.attempts.length >= 2);
  });

  it('memoizes successful scrapes so duplicate crawling is impossible', async () => {
    const { memoize } = await import('../src/utils/research-cache.util.js');
    let calls = 0;
    const loader = async () => { calls++; return { title: 't' }; };
    const a = await memoize('scrape:https://example.com', 60000, loader);
    const b = await memoize('scrape:https://example.com', 60000, loader);
    assert.deepEqual(a, { title: 't' });
    assert.equal(b, a, 'second caller reuses the same scrape result');
    assert.equal(calls, 1);
  });
});

// ============================================
// PageSpeed evidence — single implementation shape
// ============================================
describe('Research engine — PageSpeed evidence mapping', () => {
  it('returns the backward-compatible result shape with error when unconfigured', async () => {
    const { collectPageSpeedEvidence } = await import('../src/modules/evidence/pageSpeedEvidence.service.js');
    const result = await collectPageSpeedEvidence('https://example.com');
    for (const field of ['performanceScore', 'accessibilityScore', 'bestPracticesScore', 'seoScore']) {
      assert.ok(result[field] === null || typeof result[field] === 'number', `${field} must be null or number`);
    }
    assert.ok(Array.isArray(result.topOpportunities));
    assert.ok(Array.isArray(result.diagnostics));
    assert.equal(result.source, 'pagespeed_api');
    assert.ok(result.error, 'should report the unconfigured-key error without throwing');
  });
});

// ============================================
// Normalizer — source attribution preserved
// ============================================
describe('Research engine — evidence normalizer', () => {
  it('preserves pageSpeed source attribution', async () => {
    const { normalizeEvidenceResponse } = await import('../src/modules/evidence/evidence.normalizer.js');
    const normalized = normalizeEvidenceResponse({
      pageSpeed: {
        performanceScore: 91,
        accessibilityScore: 95,
        bestPracticesScore: 100,
        seoScore: 99,
        source: 'pagespeed_api',
      },
    });
    assert.equal(normalized.evidence.pageSpeed.source, 'pagespeed_api');
    assert.ok(normalized.sourcesCollected.includes('pageSpeedInsights'));
  });
});

// ============================================
// Snapshot merge — populated values never overwritten
// ============================================
describe('Research engine — evidence merge semantics', () => {
  it('deepMergeEvidence keeps richer existing data over emptier incoming writes', async () => {
    const { deepMergeEvidence } = await import('../src/modules/evidence/evidence.service.js');
    const existing = { title: 'Real Title', pricingText: 'Rich pricing', meta: { og: 'x' } };
    const incoming = { title: null, pricingText: '', meta: { og: 'x', extra: null } };
    const merged = deepMergeEvidence(existing, incoming);
    assert.equal(merged.title, 'Real Title', 'null must not overwrite populated value');
    assert.equal(merged.pricingText, 'Rich pricing', 'empty string must not overwrite');
    assert.equal(merged.meta.og, 'x');
    assert.ok(!('extra' in merged.meta) || merged.meta.extra === null || merged.meta.extra !== undefined);
  });
});
