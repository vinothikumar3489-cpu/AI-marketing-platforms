import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const ORIGINAL_KEY = process.env.SERPAPI_API_KEY;

async function getSerpapiModule() {
  return await import('../src/services/serpapi.service.js');
}

async function getRouterModule() {
  return await import('../src/services/seo/seo-provider-router.service.js');
}

describe('getSerpAPIStatus — no network', () => {
  beforeEach(() => {
    process.env.SERPAPI_API_KEY = ORIGINAL_KEY;
  });

  afterEach(() => {
    process.env.SERPAPI_API_KEY = ORIGINAL_KEY;
  });

  it('returns NOT_CONFIGURED when SERPAPI_API_KEY is missing', async () => {
    delete process.env.SERPAPI_API_KEY;
    const mod = await getSerpapiModule();
    const status = await mod.getSerpAPIStatus();
    assert.equal(status.status, 'NOT_CONFIGURED');
    assert.equal(status.configured, false);
    assert.equal(status.available, false);
    assert.equal(status.provider, 'SERPAPI');
    assert.ok(status.reason.includes('not set'));
    assert.ok(status.checkedAt);
    assert.equal(status.enabled, true);
  });

  it('returns NOT_CONFIGURED when SERPAPI_API_KEY is empty', async () => {
    process.env.SERPAPI_API_KEY = '';
    const mod = await getSerpapiModule();
    const status = await mod.getSerpAPIStatus();
    assert.equal(status.status, 'NOT_CONFIGURED');
    assert.equal(status.configured, false);
    assert.equal(status.available, false);
  });

  it('returns correct envelope shape', async () => {
    delete process.env.SERPAPI_API_KEY;
    const mod = await getSerpapiModule();
    const status = await mod.getSerpAPIStatus();
    const keys = Object.keys(status).sort();
    assert.deepEqual(keys, ['available', 'checkedAt', 'configured', 'enabled', 'provider', 'reason', 'searchesRemaining', 'status']);
  });

  it('never leaks the API key in output', async () => {
    process.env.SERPAPI_API_KEY = 'super-secret-key-12345';
    const mod = await getSerpapiModule();
    const status = mod.getCachedSerpAPIStatus();
    const serialized = JSON.stringify(status);
    assert.ok(!serialized.includes('super-secret-key'), 'API key leaked in output');
    assert.ok(!serialized.includes('12345'), 'API key leaked in output');
  });
});

describe('getCachedSerpAPIStatus', () => {
  it('returns sync status object without network calls', async () => {
    const mod = await getSerpapiModule();
    const status = mod.getCachedSerpAPIStatus();
    assert.equal(typeof status, 'object');
    assert.equal(status.provider, 'SERPAPI');
    assert.equal(status.enabled, true);
    assert.ok('configured' in status);
    assert.ok('available' in status);
    assert.ok('status' in status);
    assert.ok('checkedAt' in status);
  });
});

describe('Provider router import integration', () => {
  it('getSEOProviderStatus is importable without ReferenceError', async () => {
    const router = await getRouterModule();
    assert.equal(typeof router.getSEOProviderStatus, 'function');
    assert.equal(typeof router.getCachedSEOProviderStatus, 'function');
    assert.equal(typeof router.withProviderFallback, 'function');
    assert.equal(typeof router.clearSEOCache, 'function');
    assert.equal(typeof router.getCacheStats, 'function');
    // Ensure no ReferenceError from missing getSerpAPIStatus import
    const cached = router.getCachedSEOProviderStatus();
    assert.ok('serpapi' in cached);
    assert.equal(cached.serpapi.provider, 'SERPAPI');
  });

  it('getCachedSEOProviderStatus returns correct shape', async () => {
    const router = await getRouterModule();
    const status = router.getCachedSEOProviderStatus();
    assert.ok('serpapi' in status, 'missing serpapi key');
    assert.ok('dataforseo' in status, 'missing dataforseo key');
    assert.ok('cacheAvailable' in status, 'missing cacheAvailable key');
    assert.equal(status.serpapi.provider, 'SERPAPI');
    assert.ok('configured' in status.dataforseo);
    assert.ok('available' in status.dataforseo);
    assert.ok('enabled' in status.dataforseo);
  });

  it('does not throw when calling getSEOProviderStatus (key missing = no network)', async () => {
    delete process.env.SERPAPI_API_KEY;
    const router = await getRouterModule();
    let error = null;
    let result = null;
    try {
      result = await router.getSEOProviderStatus();
    } catch (e) {
      error = e;
    }
    assert.equal(error, null, `getSEOProviderStatus threw: ${error?.message}`);
    assert.ok(result !== null, 'getSEOProviderStatus returned null');
    assert.ok('serpapi' in result);
    assert.equal(result.serpapi.status, 'NOT_CONFIGURED');
  });
});

describe('SEO orchestrator integration', () => {
  it('generateCompleteSeoIntelligence is importable', async () => {
    const orchestrator = await import('../src/services/seo/seo-orchestrator.service.js');
    assert.equal(typeof orchestrator.generateCompleteSeoIntelligence, 'function');
  });

  it('seo controller exports are importable', async () => {
    const controller = await import('../src/domains/seo/controllers/seo.controller.js');
    assert.equal(typeof controller.runSeoHandler, 'function');
    assert.equal(typeof controller.getSeoHandler, 'function');
    assert.equal(typeof controller.getSEOProviderStatusHandler, 'function');
    assert.equal(typeof controller.clearSEOCacheHandler, 'function');
  });
});
