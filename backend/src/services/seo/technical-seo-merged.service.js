import { getDesktopAndMobilePageSpeed } from "../../providers/pagespeed.service.js";

function extractOpenGraph(data) {
  const og = data.openGraph || data.content?.openGraph || {};
  if (Object.keys(og).length === 0) return { status: 'unavailable' };
  return {
    title: og.title || og['og:title'] || '',
    description: og.description || og['og:description'] || '',
    image: og.image || og['og:image'] || '',
    url: og.url || og['og:url'] || '',
    type: og.type || og['og:type'] || '',
    siteName: og.siteName || og['og:site_name'] || '',
    status: 'measured'
  };
}

function extractTwitterCard(data) {
  const tc = data.twitterCard || data.content?.twitterCard || {};
  if (Object.keys(tc).length === 0) return { status: 'unavailable' };
  return {
    card: tc.card || tc['twitter:card'] || '',
    site: tc.site || tc['twitter:site'] || '',
    title: tc.title || tc['twitter:title'] || '',
    description: tc.description || tc['twitter:description'] || '',
    image: tc.image || tc['twitter:image'] || '',
    status: 'measured'
  };
}

function buildTechnicalRecommendations(tech) {
  const recs = [];
  if (tech.performance?.mobile != null && tech.performance.mobile < 50) {
    recs.push({ priority: 'high', area: 'performance', message: `Mobile performance score is ${tech.performance.mobile}/100 - optimize Core Web Vitals` });
  }
  if (tech.performance?.desktop != null && tech.performance.desktop < 50) {
    recs.push({ priority: 'high', area: 'performance', message: `Desktop performance score is ${tech.performance.desktop}/100` });
  }
  if (tech.accessibility?.mobile != null && tech.accessibility.mobile < 70) {
    recs.push({ priority: 'medium', area: 'accessibility', message: `Accessibility score is ${tech.accessibility.mobile}/100` });
  }
  if (tech.seo?.mobile != null && tech.seo.mobile < 70) {
    recs.push({ priority: 'medium', area: 'seo', message: `SEO score is ${tech.seo.mobile}/100 - check meta tags and structured data` });
  }
  if (tech.meta?.status === 'unavailable' || !tech.meta?.title) {
    recs.push({ priority: 'critical', area: 'meta', message: 'Missing page title - critical for SEO' });
  }
  if (tech.meta?.status === 'unavailable' || !tech.meta?.description) {
    recs.push({ priority: 'high', area: 'meta', message: 'Missing meta description' });
  }
  if (tech.structuredData?.count === 0) {
    recs.push({ priority: 'medium', area: 'schema', message: 'No structured data found - add Schema.org markup' });
  }
  if (tech.canonical?.status === 'unavailable') {
    recs.push({ priority: 'medium', area: 'canonical', message: 'No canonical URL found' });
  }
  if (tech.openGraph?.status === 'unavailable') {
    recs.push({ priority: 'medium', area: 'opengraph', message: 'No Open Graph tags found - important for social sharing' });
  }
  if (tech.twitterCard?.status === 'unavailable') {
    recs.push({ priority: 'low', area: 'twitter', message: 'No Twitter Card tags found' });
  }
  return recs;
}

function categorizeTechnicalIssues(tech) {
  const issues = { critical: [], high: [], medium: [], low: [] };

  if (tech.meta?.status === 'unavailable' || !tech.meta?.title) {
    issues.critical.push({ type: 'missing_title', message: 'Missing or empty page title' });
  }
  if (!tech.meta?.description) {
    issues.high.push({ type: 'missing_description', message: 'Missing meta description' });
  }
  if (tech.performance?.mobile != null && tech.performance.mobile < 30) {
    issues.critical.push({ type: 'poor_mobile_performance', message: `Mobile performance: ${tech.performance.mobile}/100` });
  }
  if (tech.performance?.mobile != null && tech.performance.mobile < 50) {
    issues.high.push({ type: 'low_mobile_performance', message: `Mobile performance below 50: ${tech.performance.mobile}/100` });
  }
  if (tech.structuredData?.count === 0) {
    issues.medium.push({ type: 'no_structured_data', message: 'No Schema.org structured data detected' });
  }
  if (tech.canonical?.status === 'unavailable') {
    issues.medium.push({ type: 'no_canonical', message: 'No canonical URL specified' });
  }
  if (tech.openGraph?.status === 'unavailable') {
    issues.medium.push({ type: 'no_opengraph', message: 'Open Graph tags missing' });
  }

  return issues;
}

export async function getChromeUXReport(websiteUrl) {
  const API_KEY = process.env.GOOGLE_CRUX_API_KEY;
  if (!API_KEY) return { success: false, error: 'CrUX API key not configured', status: 'unavailable' };

  try {
    const url = `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${API_KEY}`;
    const origin = new URL(websiteUrl).origin;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin })
    });

    if (!response.ok) {
      if (response.status === 404) return { success: false, error: 'No CrUX data for this origin', status: 'unavailable' };
      if (response.status === 403) return { success: false, error: 'CrUX API key invalid', status: 'unavailable' };
      return { success: false, error: `CrUX API error: ${response.status}`, status: 'unavailable' };
    }

    const data = await response.json();
    const record = data.record;
    if (!record) return { success: false, error: 'No CrUX data available', status: 'unavailable' };

    const metrics = record.metrics || {};
    const normalize = (m) => {
      if (!m?.percentiles) return null;
      const percentiles = m.percentiles;
      return {
        p75: percentiles.p75 || null,
        fast: m.histogram?.[0]?.proportion || null,
        average: m.histogram?.[1]?.proportion || null,
        slow: m.histogram?.[2]?.proportion || null
      };
    };

    return {
      success: true,
      data: {
        lcp: normalize(metrics.largest_contentful_paint),
        fcp: normalize(metrics.first_contentful_paint),
        cls: normalize(metrics.cumulative_layout_shift),
        inp: normalize(metrics.interaction_to_next_paint),
        ttfb: normalize(metrics.experimental_time_to_first_byte),
        overallCategory: record.record?.key?.effectiveConnectionType || null,
        source: 'Chrome UX Report',
        status: 'measured'
      }
    };
  } catch (error) {
    return { success: false, error: error.message, status: 'unavailable' };
  }
}
