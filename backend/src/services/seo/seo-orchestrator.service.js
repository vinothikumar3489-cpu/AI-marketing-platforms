import { deriveWebsiteIdentity } from "../../utils/seo-identity.util.js";
import { getLatestEvidenceSnapshot } from "../../domains/research/services/evidence.service.js";
import { getDesktopAndMobilePageSpeed } from "../../providers/pagespeed.service.js";
import { getChromeUXReport } from "./technical-seo-merged.service.js";
import { generateKeywordIntelligence } from "./keyword-intelligence.service.js";
import { generateCompetitorSeoIntelligence } from "./competitor-seo-intelligence.service.js";
import { generateContentGapIntelligence } from "./content-gap-engine.service.js";
import { generateGeoIntelligence } from "./geo-intelligence.service.js";
import { generateBlogIntelligence } from "./blog-intelligence.service.js";
import { generateSearchEnrichment } from "./search-enrichment.service.js";
import { getSEOProviderStatus, verifyDataForSEOAtStartup, getDataForSEOStartupStatus } from "./seo-provider-router.service.js";
import { buildSEOReport } from "./seo-report-builder.service.js";

export { verifyDataForSEOAtStartup, getDataForSEOStartupStatus };

export async function generateCompleteSeoIntelligence({ chatId, userId, websiteUrl, chat }) {
  const runId = `seo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const warnings = [];
  const modules = {};

  console.log('[SEO ORCHESTRATOR]', { runId, chatId, userId, websiteUrl });

  const providerStatus = await getSEOProviderStatus();
  console.log('[SEO ORCHESTRATOR] Provider selection:', {
    selected: providerStatus.selection.selectedProvider,
    dataforseoConnected: providerStatus.dataforseo.connected,
    dataforseoStatus: providerStatus.dataforseo.status,
    serpapiStatus: providerStatus.serpapi?.status
  });

  let websiteData = null;
  let identity = null;
  let researchData = { keywords: [], competitors: [] };

  try {
    if (chatId) {
      const evidenceReq = await getLatestEvidenceSnapshot(chatId);
      if (evidenceReq.success && evidenceReq.snapshot) {
        const snap = evidenceReq.snapshot;
        const webEv = snap.websiteEvidence || {};
        const contentEv = snap.contentEvidence || {};
        const txt = contentEv.cleanedText || snap.rawEvidence?.rawMarkdown || '';
        websiteData = {
          text: txt,
          url: websiteUrl,
          content: { text: txt },
          title: webEv.title || '',
          metaDescription: webEv.metaDescription || '',
          meta: {
            title: webEv.title || '',
            description: webEv.metaDescription || '',
            ...(contentEv.openGraph || {}),
            ...(contentEv.twitterCard || {}),
            ...(contentEv.structuredData ? { schema: contentEv.structuredData } : {})
          },
          h1: webEv.headings || [],
          headings: { h1: webEv.headings || [] },
          openGraph: contentEv.openGraph || {},
          twitterCard: contentEv.twitterCard || {},
          schema: contentEv.structuredData || {},
          structured: contentEv.structuredData || {}
        };
      }
    }
    if (!websiteData) {
      throw new Error("No EvidenceSnapshot found. Please ensure scraping has completed first.");
    }
    identity = deriveWebsiteIdentity({ websiteUrl, scrapedData: websiteData, chat });
    modules.crawl = { status: 'SUCCESS', websiteData, identity };
    console.log('[SEO ORCHESTRATOR] Crawl complete, identity derived:', { productName: identity.productName });
  } catch (e) {
    warnings.push({ code: 'CRAWL_FAILED', message: `Evidence extraction failed: ${e.message}` });
    identity = { websiteUrl, productName: chat?.productName || '', companyName: chat?.title || '' };
    modules.crawl = { status: 'FAILED', error: e.message, identity };
  }

  const techAudit = await runModule('technicalSeo', runModuleTechnicalSeo.bind(null, websiteData, websiteUrl));
  modules.technicalSeo = techAudit;

  const keywordIntelligence = await runModule('keywordIntelligence', async () => {
    return await generateKeywordIntelligence({
      websiteData,
      identity,
      seoIntelligence: null,
      orchestratorKeywords: researchData.keywords || []
    });
  });
  modules.keywordIntelligence = keywordIntelligence;

  const competitorIntelligence = await runModule('competitorIntelligence', async () => {
    return await generateCompetitorSeoIntelligence({
      keywordIntelligence: keywordIntelligence.data || {},
      geoIntelligence: null,
      websiteData,
      identity,
      orchestratorCompetitors: researchData.competitors || []
    });
  });
  modules.competitorIntelligence = competitorIntelligence;

  const contentGapIntelligence = await runModule('contentGapIntelligence', async () => {
    return await generateContentGapIntelligence({
      websiteData,
      keywordIntelligence: keywordIntelligence.data || {},
      geoIntelligence: null,
      competitorIntelligence: competitorIntelligence.data || {},
      identity
    });
  });
  modules.contentGapIntelligence = contentGapIntelligence;

  const geoIntelligence = await runModule('geoIntelligence', async () => {
    return await generateGeoIntelligence({
      websiteData,
      technicalAudit: techAudit.data || null,
      identity
    });
  });
  modules.geoIntelligence = geoIntelligence;

  const blogIntelligence = await runModule('blogIntelligence', async () => {
    return await generateBlogIntelligence({
      keywordIntelligence: keywordIntelligence.data || {},
      competitorIntelligence: competitorIntelligence.data || {},
      geoIntelligence: geoIntelligence.data || {},
      identity,
      orchestratorData: {}
    });
  });
  modules.blogIntelligence = blogIntelligence;

  const searchEnrichment = await runModule('searchEnrichment', async () => {
    return await generateSearchEnrichment({
      query: identity?.productName || websiteUrl || '',
      location: 'United States'
    });
  });
  modules.searchEnrichment = searchEnrichment;

  const fullReport = buildSEOReport({
    identity,
    technicalAudit: techAudit.data || {},
    keywordIntelligence: keywordIntelligence.data || {},
    competitorIntelligence: competitorIntelligence.data || {},
    geoIntelligence: geoIntelligence.data || {},
    contentGapIntelligence: contentGapIntelligence.data || {},
    blogIntelligence: blogIntelligence.data || {},
    serpFeatures: searchEnrichment.data?.serpFeatures || [],
    peopleAlsoAsk: searchEnrichment.data?.peopleAlsoAsk || [],
    trendAnalysis: searchEnrichment.data?.trends || [],
    providers: providerStatus,
    pageSpeed: techAudit.data?.pageSpeed || null,
    crux: techAudit.data?.crux || null
  });

  console.log('[SEO ORCHESTRATOR] Complete', { runId, warnings: warnings.length });

  return {
    success: true,
    data: fullReport,
    modules,
    warnings,
    provider: providerStatus.selection.selectedProvider,
    providers: providerStatus,
    runId
  };
}

async function runModule(name, fn) {
  try {
    console.log(`[SEO ORCHESTRATOR] Running module: ${name}`);
    const result = await fn();
    return { status: 'SUCCESS', data: result };
  } catch (e) {
    console.warn(`[SEO ORCHESTRATOR] Module ${name} failed:`, e.message);
    return { status: 'FAILED', error: e.message, data: null };
  }
}

async function runModuleTechnicalSeo(websiteData, websiteUrl) {
  const tech = {
    meta: extractMeta(websiteData),
    canonical: extractCanonical(websiteData),
    robots: extractRobots(websiteData),
    sitemap: extractSitemap(websiteData),
    headings: extractHeadings(websiteData),
    openGraph: extractOpenGraph(websiteData),
    twitterCard: extractTwitterCard(websiteData),
    structuredData: extractStructuredData(websiteData),
    images: extractImages(websiteData),
    links: extractLinks(websiteData),
    https: { status: websiteUrl?.startsWith('https') ? 'enabled' : 'unknown', value: websiteUrl?.startsWith('https') || null },
    mobile: { status: 'unavailable', value: null },
    performance: null,
    pageSpeed: null,
    crux: null,
    overallScore: null
  };

  const pageSpeed = await runPageSpeedWithRetry(websiteUrl, 3);
  if (pageSpeed.success) {
    tech.pageSpeed = pageSpeed.data;
    tech.performance = {
      mobile: pageSpeed.data.mobile?.performance ?? null,
      desktop: pageSpeed.data.desktop?.performance ?? null,
      status: 'measured'
    };
    tech.overallScore = pageSpeed.data.mobile?.performance ?? pageSpeed.data.desktop?.performance ?? null;
  } else {
    console.log('[SEO TECHNICAL] PageSpeed unavailable, trying CrUX...');
    const crux = await getChromeUXReport(websiteUrl);
    if (crux.success) {
      tech.crux = crux.data;
      tech.performance = {
        lcp: crux.data.lcp?.p75 ?? null,
        cls: crux.data.cls?.p75 ?? null,
        inp: crux.data.inp?.p75 ?? null,
        status: 'measured_from_crux'
      };
    } else {
      tech.performance = { status: 'unavailable', reason: pageSpeed.error || 'PageSpeed and CrUX both unavailable' };
    }
  }

  return tech;
}

async function runPageSpeedWithRetry(url, maxRetries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[SEO TECHNICAL] PageSpeed attempt ${attempt}/${maxRetries}`);
      const result = await getDesktopAndMobilePageSpeed(url);
      if (result.success) {
        console.log(`[SEO TECHNICAL] PageSpeed succeeded on attempt ${attempt}`);
        return result;
      }
      lastError = result.error || 'PageSpeed returned unsuccessful';
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
        console.log(`[SEO TECHNICAL] PageSpeed retry ${attempt} failed, waiting ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
      }
    } catch (e) {
      lastError = e.message;
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  return { success: false, error: lastError, reason: 'Max retries exceeded' };
}

function extractMeta(data) {
  if (!data) return { title: null, description: null, status: 'unavailable' };
  const title = data.title || data.meta?.title || data.metadata?.title || null;
  const description = data.metaDescription || data.meta?.description || data.metadata?.description || null;
  return { title, description, status: title || description ? 'measured' : 'unavailable' };
}

function extractCanonical(data) {
  if (!data) return { url: null, status: 'unavailable' };
  const url = data.meta?.canonical || data.canonical || null;
  return { url, status: url ? 'measured' : 'unavailable' };
}

function extractRobots(data) {
  if (!data) return { content: null, status: 'unavailable' };
  return { content: data.meta?.robots || data.robots || null, status: 'measured' };
}

function extractSitemap(data) {
  if (!data) return { url: null, status: 'unavailable' };
  return { url: data.sitemap || data.meta?.sitemap || null, status: 'unavailable' };
}

function extractHeadings(data) {
  if (!data) return { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [], status: 'unavailable' };
  const h1 = asArray(data.h1 || data.headings?.h1 || []);
  const h2 = asArray(data.h2 || data.headings?.h2 || []);
  const h3 = asArray(data.h3 || data.headings?.h3 || []);
  return {
    h1: h1.map(h => typeof h === 'string' ? h : (h.text || h)),
    h2: h2.map(h => typeof h === 'string' ? h : (h.text || h)),
    h3: h3.map(h => typeof h === 'string' ? h : (h.text || h)),
    h4: [],
    h5: [],
    h6: [],
    status: h1.length > 0 || h2.length > 0 ? 'measured' : 'unavailable'
  };
}

function extractOpenGraph(data) {
  if (!data) return { title: null, description: null, image: null, status: 'unavailable' };
  const og = data.openGraph || data.meta?.openGraph || data.content?.openGraph || {};
  const keys = Object.keys(og);
  if (keys.length === 0) return { status: 'unavailable' };
  return {
    title: og.title || og['og:title'] || null,
    description: og.description || og['og:description'] || null,
    image: og.image || og['og:image'] || null,
    url: og.url || og['og:url'] || null,
    type: og.type || og['og:type'] || null,
    siteName: og.siteName || og['og:site_name'] || null,
    status: 'measured'
  };
}

function extractTwitterCard(data) {
  if (!data) return { card: null, site: null, title: null, status: 'unavailable' };
  const tc = data.twitterCard || data.meta?.twitterCard || data.content?.twitterCard || {};
  const keys = Object.keys(tc);
  if (keys.length === 0) return { status: 'unavailable' };
  return {
    card: tc.card || tc['twitter:card'] || null,
    site: tc.site || tc['twitter:site'] || null,
    title: tc.title || tc['twitter:title'] || null,
    description: tc.description || tc['twitter:description'] || null,
    image: tc.image || tc['twitter:image'] || null,
    status: 'measured'
  };
}

function extractStructuredData(data) {
  if (!data) return { types: [], count: 0, status: 'unavailable' };
  const schema = data.schema || data.structured || data.meta?.schema || {};
  const types = schema.types || schema.type ? [schema.type] : [];
  const items = schema.items || [];
  const count = types.length + (Array.isArray(items) ? items.length : 0);
  return { types, count, status: count > 0 ? 'measured' : 'unavailable' };
}

function extractImages(data) {
  if (!data) return { count: 0, withAlt: 0, withoutAlt: 0, status: 'unavailable' };
  const images = data.images || data.content?.images || [];
  const count = Array.isArray(images) ? images.length : 0;
  const withAlt = Array.isArray(images) ? images.filter(i => i.alt || i.altText).length : 0;
  return { count, withAlt, withoutAlt: count - withAlt, status: count > 0 ? 'measured' : 'unavailable' };
}

function extractLinks(data) {
  if (!data) return { internal: 0, external: 0, broken: 0, status: 'unavailable' };
  const links = data.links || data.content?.links || [];
  const internal = Array.isArray(links) ? links.filter(l => l.internal || l.type === 'internal').length : 0;
  const external = Array.isArray(links) ? links.filter(l => !l.internal && l.type !== 'internal').length : 0;
  return { internal, external, broken: 0, status: 'measured' };
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}


