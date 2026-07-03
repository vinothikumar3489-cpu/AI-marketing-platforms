import fetch from 'node-fetch';

// ============================================
// GOOGLE PAGESPEED INSIGHTS SERVICE
// Real technical SEO audit data from Google PageSpeed API
// ============================================

const PAGESPEED_API_KEY = process.env.PAGESPEED_API_KEY;
const PAGESPEED_API_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const FETCH_TIMEOUT = 30000;

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url, timeoutMs = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
    console.log('[PageSpeed] timeout');
  }, timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Get PageSpeed audit for a URL
 */
export async function getPageSpeedAudit(url, strategy = 'mobile') {
  if (!url) {
    return { success: false, error: 'URL is required' };
  }

  if (!PAGESPEED_API_KEY) {
    console.warn('[PageSpeed] API key not configured');
    return { success: false, error: 'PageSpeed API key not configured' };
  }

  try {
    const apiUrl = `${PAGESPEED_API_URL}?url=${encodeURIComponent(url)}&strategy=${strategy}&key=${PAGESPEED_API_KEY}`;
    const startTime = Date.now();
    console.log('[PageSpeed]', strategy, 'started');

    const response = await fetchWithTimeout(apiUrl, FETCH_TIMEOUT);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('[PageSpeed] failed - API error:', response.status);
      return { success: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();
    const duration = Date.now() - startTime;
    console.log('[PageSpeed]', strategy, 'finished', 'duration:', duration, 'ms');

    const normalized = normalizePageSpeedResult(data, strategy);
    return { success: true, data: normalized };
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('[PageSpeed] failed - timeout');
      return { success: false, error: 'timeout' };
    }
    console.log('[PageSpeed] failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get both desktop and mobile PageSpeed audits
 * Runs mobile first, then desktop.
 * If mobile fails, continues with desktop.
 * If desktop fails, continues with mobile.
 * If both fail, returns success:false.
 */
export async function getDesktopAndMobilePageSpeed(url) {
  if (!url) {
    return { success: false, error: 'URL is required' };
  }

  const totalStart = Date.now();

  const [mobileResult, desktopResult] = await Promise.all([
    getPageSpeedAudit(url, 'mobile'),
    getPageSpeedAudit(url, 'desktop'),
  ]);

  const totalDuration = Date.now() - totalStart;
  console.log('[PageSpeed] total duration:', totalDuration, 'ms');

  if (!mobileResult.success && !desktopResult.success) {
    return { success: false, reason: 'PageSpeed unavailable' };
  }

  return {
    success: mobileResult.success || desktopResult.success,
    data: {
      mobile: mobileResult.success ? mobileResult.data : null,
      desktop: desktopResult.success ? desktopResult.data : null,
    },
  };
}

/**
 * Normalize PageSpeed API response
 */
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

/**
 * Extract Lighthouse category scores
 */
function extractLighthouseScores(categories) {
  return {
    performance: categories.performance?.score ? Math.round(categories.performance.score * 100) : null,
    accessibility: categories.accessibility?.score ? Math.round(categories.accessibility.score * 100) : null,
    bestPractices: categories['best-practices']?.score ? Math.round(categories['best-practices'].score * 100) : null,
    seo: categories.seo?.score ? Math.round(categories.seo.score * 100) : null,
    source: 'PageSpeed',
    confidence: 100
  };
}

/**
 * Extract Core Web Vitals
 */
function extractCoreWebVitals(audits) {
  return {
    fcp: getMetricValue(audits['first-contentful-paint']),
    lcp: getMetricValue(audits['largest-contentful-paint']),
    cls: getMetricValue(audits['cumulative-layout-shift']),
    inp: getMetricValue(audits['interaction-to-next-paint']) || getMetricValue(audits['total-blocking-time']),
    ttfb: getMetricValue(audits['time-to-first-byte']),
    source: 'PageSpeed',
    confidence: 100
  };
}

/**
 * Extract SEO-specific audits
 */
function extractSeoAudits(audits) {
  return {
    hasTitleTag: audits['is-on-https']?.score === 1,
    hasMetaDescription: audits['meta-description']?.score === 1,
    hasViewport: audits['viewport']?.score === 1,
    hasCanonical: audits['canonical']?.score === 1,
    hasRobotsTxt: audits['robots-txt']?.score === 1,
    hasSitemap: audits['sitemap']?.score === 1,
    hasStructuredData: audits['structured-data']?.score === 1,
    hasOpenGraph: audits['is-crawlable']?.score === 1,
    hasTwitterCard: audits['is-crawlable']?.score === 1,
    source: 'PageSpeed',
    confidence: 100
  };
}

/**
 * Extract performance audits
 */
function extractPerformanceAudits(audits) {
  return {
    totalBlockingTime: getMetricValue(audits['total-blocking-time']),
    speedIndex: getMetricValue(audits['speed-index']),
    largestContentfulPaint: getMetricValue(audits['largest-contentful-paint']),
    firstContentfulPaint: getMetricValue(audits['first-contentful-paint']),
    cumulativeLayoutShift: getMetricValue(audits['cumulative-layout-shift']),
    timeToInteractive: getMetricValue(audits['interactive']),
    source: 'PageSpeed',
    confidence: 100
  };
}

/**
 * Extract opportunities
 */
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

/**
 * Extract diagnostics
 */
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

/**
 * Extract passed audits
 */
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

/**
 * Extract failed audits
 */
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

/**
 * Get metric value from audit
 */
function getMetricValue(audit) {
  if (!audit) return null;
  return audit.numericValue !== undefined ? audit.numericValue : null;
}

/**
 * Check if PageSpeed API is configured
 */
export function isPageSpeedConfigured() {
  return !!PAGESPEED_API_KEY;
}
