import fetch from 'node-fetch';

const PAGESPEED_API_KEY = process.env.PAGESPEED_INSIGHTS_API_KEY || process.env.GOOGLE_PAGESPEED_INSIGHTS_API_KEY || process.env.PAGESPEED_API_KEY;
const PAGESPEED_API_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;
const CACHE_TTL_MS = 5 * 60 * 1000;

const cache = new Map();

function getCacheKey(url, strategy) {
  return `${strategy}:${url}`;
}

function cacheGet(url, strategy) {
  const key = getCacheKey(url, strategy);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function cacheSet(url, strategy, data) {
  const key = getCacheKey(url, strategy);
  cache.set(key, { data, timestamp: Date.now() });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function getPageSpeedAudit(url, strategy = 'mobile') {
  if (!url) {
    return { success: false, error: 'URL is required' };
  }

  if (!PAGESPEED_API_KEY) {
    console.warn('⚠️ PageSpeed API key not configured');
    return { success: false, error: 'PageSpeed API key not configured' };
  }

  const cached = cacheGet(url, strategy);
  if (cached) {
    console.log(`🔍 [PageSpeed] Cache hit for ${strategy}: ${url}`);
    return { success: true, data: cached, fromCache: true };
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const apiUrl = `${PAGESPEED_API_URL}?url=${encodeURIComponent(url)}&strategy=${strategy}&key=${PAGESPEED_API_KEY}`;
      console.log(`🔍 [PageSpeed] Requesting ${strategy} audit for: ${url} (attempt ${attempt}/${MAX_RETRIES})`);

      const response = await fetch(apiUrl);

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ [PageSpeed] ${strategy} audit successful`);

        const normalized = normalizePageSpeedResult(data, strategy);
        if (normalized) {
          cacheSet(url, strategy, normalized);
        }
        return { success: true, data: normalized };
      }

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '0', 10) * 1000 || RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(`⚠️ [PageSpeed] Rate limited (429) for ${strategy}:${url}, retrying in ${retryAfter}ms (attempt ${attempt}/${MAX_RETRIES})`);
        if (attempt < MAX_RETRIES) {
          await sleep(retryAfter);
          continue;
        }
        const errorText = await response.text();
        console.error(`❌ [PageSpeed] Rate limit exhausted after ${MAX_RETRIES} attempts: ${errorText}`);
        return { success: false, error: `Rate limited after ${MAX_RETRIES} retries`, rateLimited: true };
      }

      if (response.status >= 500 && attempt < MAX_RETRIES) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(`⚠️ [PageSpeed] Server error ${response.status} for ${strategy}:${url}, retrying in ${delay}ms`);
        await sleep(delay);
        continue;
      }

      const errorText = await response.text();
      console.error(`❌ [PageSpeed] API error: ${response.status} - ${errorText}`);
      return { success: false, error: `API error: ${response.status}` };
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(`⚠️ [PageSpeed] Network error: ${error.message}, retrying in ${delay}ms`);
        await sleep(delay);
        continue;
      }
      console.error(`❌ [PageSpeed] Request failed after ${MAX_RETRIES} attempts:`, error.message);
      return { success: false, error: error.message };
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}

export async function getDesktopAndMobilePageSpeed(url) {
  if (!url) {
    return { success: false, error: 'URL is required' };
  }

  const [mobileResult, desktopResult] = await Promise.all([
    getPageSpeedAudit(url, 'mobile'),
    getPageSpeedAudit(url, 'desktop')
  ]);

  return {
    success: mobileResult.success || desktopResult.success,
    data: {
      mobile: mobileResult.success ? mobileResult.data : null,
      desktop: desktopResult.success ? desktopResult.data : null
    }
  };
}

function normalizePageSpeedResult(response, strategy) {
  if (!response || !response.lighthouseResult) {
    return null;
  }

  const lighthouse = response.lighthouseResult;
  const audits = lighthouse.audits || {};
  const categories = lighthouse.categories || {};

  return {
    strategy,
    timestamp: response.fetchTime || new Date().toISOString(),
    finalUrl: response.finalUrl || response.requestUrl,
    lighthouseScores: extractLighthouseScores(categories),
    coreWebVitals: extractCoreWebVitals(audits),
    seoAudits: extractSeoAudits(audits),
    performanceAudits: extractPerformanceAudits(audits),
    opportunities: extractOpportunities(audits),
    diagnostics: extractDiagnostics(audits),
    passedAudits: extractPassedAudits(audits),
    failedAudits: extractFailedAudits(audits)
  };
}

function extractLighthouseScores(categories) {
  return {
    performance: categories.performance?.score ? Math.round(categories.performance.score * 100) : null,
    accessibility: categories.accessibility?.score ? Math.round(categories.accessibility.score * 100) : null,
    bestPractices: categories['best-practices']?.score ? Math.round(categories['best-practices'].score * 100) : null,
    seo: categories.seo?.score ? Math.round(categories.seo.score * 100) : null,
    source: 'PageSpeed'
  };
}

function extractCoreWebVitals(audits) {
  return {
    fcp: getMetricValue(audits['first-contentful-paint']),
    lcp: getMetricValue(audits['largest-contentful-paint']),
    cls: getMetricValue(audits['cumulative-layout-shift']),
    inp: getMetricValue(audits['interaction-to-next-paint']) || getMetricValue(audits['total-blocking-time']),
    ttfb: getMetricValue(audits['time-to-first-byte']),
    source: 'PageSpeed'
  };
}

function extractSeoAudits(audits) {
  return {
    hasTitleTag: audits['is-on-https']?.score === 1,
    hasMetaDescription: audits['meta-description']?.score === 1,
    hasViewport: audits['viewport']?.score === 1,
    hasCanonical: audits['canonical']?.score === 1,
    hasRobotsTxt: audits['robots-txt']?.score === 1,
    hasSitemap: audits['sitemap']?.score === 1,
    hasStructuredData: audits['structured-data']?.score === 1,
    hasOpenGraph: audits['opengraph']?.score === 1,
    hasTwitterCard: audits['twitter']?.score === 1,
    source: 'PageSpeed'
  };
}

function extractPerformanceAudits(audits) {
  return {
    totalBlockingTime: getMetricValue(audits['total-blocking-time']),
    speedIndex: getMetricValue(audits['speed-index']),
    largestContentfulPaint: getMetricValue(audits['largest-contentful-paint']),
    firstContentfulPaint: getMetricValue(audits['first-contentful-paint']),
    cumulativeLayoutShift: getMetricValue(audits['cumulative-layout-shift']),
    timeToInteractive: getMetricValue(audits['interactive']),
    source: 'PageSpeed'
  };
}

function extractOpportunities(audits) {
  const opportunityKeys = [
    'unused-css-rules',
    'unused-javascript',
    'modern-image-formats',
    'offscreen-images',
    'render-blocking-resources',
    'minify-css',
    'minify-javascript',
    'text-compression',
    'use-efficient-image-formats',
    'serve-images-in-next-gen-formats'
  ];

  return opportunityKeys
    .map(key => audits[key])
    .filter(audit => audit && audit.score !== null && audit.score < 1)
    .map(audit => ({
      title: audit.title || 'Optimization opportunity',
      description: audit.description || '',
      score: audit.score,
      numericValue: audit.numericValue,
      displayValue: audit.displayValue,
      severity: audit.score < 0.5 ? 'high' : 'medium',
      source: 'PageSpeed'
    }));
}

function extractDiagnostics(audits) {
  const diagnosticKeys = [
    'mainthread-work-breakdown',
    'network-requests',
    'network-rtt',
    'network-server-latency',
    'duplicated-javascript',
    'legacy-javascript',
    'dom-size',
    'total-byte-weight'
  ];

  return diagnosticKeys
    .map(key => audits[key])
    .filter(audit => audit)
    .map(audit => ({
      title: audit.title || 'Diagnostic',
      description: audit.description || '',
      details: audit.details,
      score: audit.score,
      source: 'PageSpeed'
    }));
}

function extractPassedAudits(audits) {
  return Object.values(audits)
    .filter(audit => audit.score === 1)
    .map(audit => ({
      title: audit.title,
      description: audit.description,
      id: audit.id,
      source: 'PageSpeed'
    }));
}

function extractFailedAudits(audits) {
  return Object.values(audits)
    .filter(audit => audit.score !== null && audit.score < 1)
    .map(audit => ({
      title: audit.title,
      description: audit.description,
      id: audit.id,
      score: audit.score,
      severity: audit.score === 0 ? 'critical' : audit.score < 0.5 ? 'high' : 'medium',
      displayValue: audit.displayValue,
      source: 'PageSpeed'
    }));
}

function getMetricValue(audit) {
  if (!audit) return null;
  return audit.numericValue !== undefined ? audit.numericValue : null;
}

export function isPageSpeedConfigured() {
  return !!PAGESPEED_API_KEY;
}
