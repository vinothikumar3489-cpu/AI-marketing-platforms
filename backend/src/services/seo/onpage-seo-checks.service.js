
const CHECK_STATUS = { PASS: 'PASS', FAIL: 'FAIL', WARNING: 'WARNING', NOT_MEASURED: 'NOT_MEASURED' };

function checkTitle(title) {
  if (!title) return { name: 'title', status: CHECK_STATUS.NOT_MEASURED, evidence: null, recommendation: 'Add a title tag to the page.' };
  const len = title.length;
  if (len < 30) return { name: 'title', status: CHECK_STATUS.FAIL, evidence: `Title is ${len} chars (min 30 recommended)`, recommendation: 'Extend title to 50-60 characters including primary keyword.' };
  if (len > 60) return { name: 'title', status: CHECK_STATUS.WARNING, evidence: `Title is ${len} chars (max 60 recommended)`, recommendation: 'Shorten title to 50-60 characters.' };
  return { name: 'title', status: CHECK_STATUS.PASS, evidence: `Title is ${len} chars (within recommended range)`, recommendation: null };
}

function checkMetaDescription(desc) {
  if (!desc) return { name: 'meta_description', status: CHECK_STATUS.NOT_MEASURED, evidence: null, recommendation: 'Add a meta description to the page.' };
  const len = desc.length;
  if (len < 120) return { name: 'meta_description', status: CHECK_STATUS.FAIL, evidence: `Meta description is ${len} chars (min 120 recommended)`, recommendation: 'Extend meta description to 150-160 characters.' };
  if (len > 160) return { name: 'meta_description', status: CHECK_STATUS.WARNING, evidence: `Meta description is ${len} chars (max 160 recommended)`, recommendation: 'Shorten meta description to 150-160 characters.' };
  return { name: 'meta_description', status: CHECK_STATUS.PASS, evidence: `Meta description is ${len} chars (within recommended range)`, recommendation: null };
}

function checkCanonical(canonical) {
  if (!canonical) return { name: 'canonical', status: CHECK_STATUS.NOT_MEASURED, evidence: null, recommendation: 'Add a canonical URL tag to prevent duplicate content issues.' };
  return { name: 'canonical', status: CHECK_STATUS.PASS, evidence: `Canonical: ${canonical}`, recommendation: null };
}

function checkH1(h1s) {
  const h1List = Array.isArray(h1s) ? h1s : [];
  if (h1List.length === 0) return { name: 'h1_heading', status: CHECK_STATUS.FAIL, evidence: 'No H1 heading found', recommendation: 'Add exactly one H1 heading containing primary keyword.' };
  if (h1List.length > 1) return { name: 'h1_heading', status: CHECK_STATUS.WARNING, evidence: `${h1List.length} H1 headings found`, recommendation: 'Use exactly one H1 per page.' };
  const h1Text = h1List[0];
  if (typeof h1Text === 'string' && h1Text.length < 10) return { name: 'h1_heading', status: CHECK_STATUS.WARNING, evidence: `H1 is too short: "${h1Text}"`, recommendation: 'Make H1 descriptive (20-70 characters preferred).' };
  return { name: 'h1_heading', status: CHECK_STATUS.PASS, evidence: `1 H1 found: "${typeof h1Text === 'string' ? h1Text.substring(0, 80) : 'present'}"`, recommendation: null };
}

function checkHeadingHierarchy(h1s, h2s) {
  const hasH1 = Array.isArray(h1s) && h1s.length > 0;
  const hasH2 = Array.isArray(h2s) && h2s.length > 0;
  if (!hasH1 && !hasH2) return { name: 'heading_hierarchy', status: CHECK_STATUS.NOT_MEASURED, evidence: null, recommendation: 'Add H1 and H2 headings to structure content.' };
  if (!hasH1) return { name: 'heading_hierarchy', status: CHECK_STATUS.FAIL, evidence: 'No H1 heading (H2s present but no H1)', recommendation: 'Add an H1 heading above H2 sections.' };
  if (hasH1 && !hasH2) return { name: 'heading_hierarchy', status: CHECK_STATUS.WARNING, evidence: 'H1 present but no H2 headings', recommendation: 'Add H2 headings to structure content under H1.' };
  return { name: 'heading_hierarchy', status: CHECK_STATUS.PASS, evidence: `1 H1, ${h2s.length} H2 headings`, recommendation: null };
}

function checkRobotsTxt(robots) {
  if (!robots) return { name: 'robots_txt', status: CHECK_STATUS.NOT_MEASURED, evidence: null, recommendation: 'Ensure robots.txt exists and doesn\'t block important pages.' };
  const lower = robots.toLowerCase();
  if (lower.includes('disallow: /')) return { name: 'robots_txt', status: CHECK_STATUS.WARNING, evidence: 'robots.txt disallows crawling of root', recommendation: 'Check if root disallow is intentional.' };
  return { name: 'robots_txt', status: CHECK_STATUS.PASS, evidence: 'robots.txt accessible', recommendation: null };
}

function checkSitemap(sitemap) {
  if (!sitemap) return { name: 'sitemap', status: CHECK_STATUS.NOT_MEASURED, evidence: null, recommendation: 'Submit an XML sitemap to Google Search Console.' };
  return { name: 'sitemap', status: CHECK_STATUS.PASS, evidence: 'Sitemap found', recommendation: null };
}

function checkOpenGraph(og) {
  if (!og || !og.title || !og.description) return { name: 'open_graph', status: CHECK_STATUS.WARNING, evidence: og ? 'OpenGraph tags present but incomplete' : 'No OpenGraph tags found', recommendation: 'Add og:title, og:description, and og:image meta tags.' };
  return { name: 'open_graph', status: CHECK_STATUS.PASS, evidence: 'og:title and og:description present', recommendation: null };
}

function checkTwitterCard(tc) {
  if (!tc) return { name: 'twitter_card', status: CHECK_STATUS.WARNING, evidence: 'No Twitter Card tags found', recommendation: 'Add twitter:card meta tag for rich social previews.' };
  return { name: 'twitter_card', status: CHECK_STATUS.PASS, evidence: 'Twitter Card tags present', recommendation: null };
}

function checkSchema(schema) {
  if (!schema) return { name: 'structured_data', status: CHECK_STATUS.NOT_MEASURED, evidence: null, recommendation: 'Implement structured data (JSON-LD) for the core entity.' };
  const types = Array.isArray(schema) ? schema : (schema.types || []);
  if (types.length === 0) return { name: 'structured_data', status: CHECK_STATUS.FAIL, evidence: 'No structured data found', recommendation: 'Add JSON-LD structured data for organization, product, or article.' };
  return { name: 'structured_data', status: CHECK_STATUS.PASS, evidence: `${types.length} schema types found`, recommendation: null };
}

function checkImageAlt(images) {
  const imgList = Array.isArray(images) ? images : [];
  if (imgList.length === 0) return { name: 'image_alt_text', status: CHECK_STATUS.NOT_MEASURED, evidence: null, recommendation: 'Add alt text to all images.' };
  const withAlt = imgList.filter(i => i.alt || i.altText).length;
  const pct = Math.round((withAlt / imgList.length) * 100);
  if (pct < 50) return { name: 'image_alt_text', status: CHECK_STATUS.FAIL, evidence: `${pct}% of images have alt text`, recommendation: 'Add descriptive alt text to all images.' };
  if (pct < 80) return { name: 'image_alt_text', status: CHECK_STATUS.WARNING, evidence: `${pct}% of images have alt text`, recommendation: 'Improve alt text coverage to at least 80%.' };
  return { name: 'image_alt_text', status: CHECK_STATUS.PASS, evidence: `${pct}% of images have alt text`, recommendation: null };
}

function checkCrawlability(robots, metaRobots) {
  const noindex = metaRobots?.includes('noindex');
  const nofollow = metaRobots?.includes('nofollow');
  if (noindex) return { name: 'crawlability', status: CHECK_STATUS.FAIL, evidence: 'Page is set to noindex', recommendation: 'Remove noindex directive if this page should appear in search.' };
  return { name: 'crawlability', status: CHECK_STATUS.PASS, evidence: 'Page is indexable', recommendation: null };
}

function checkHttps(websiteUrl) {
  if (!websiteUrl) return { name: 'https', status: CHECK_STATUS.NOT_MEASURED, evidence: null, recommendation: 'Ensure site uses HTTPS.' };
  const isHttps = websiteUrl.startsWith('https');
  return { name: 'https', status: isHttps ? CHECK_STATUS.PASS : CHECK_STATUS.FAIL, evidence: isHttps ? 'HTTPS enabled' : 'Page loaded over HTTP', recommendation: isHttps ? null : 'Migrate to HTTPS.' };
}

function checkMobileResponsive(viewport) {
  if (!viewport) return { name: 'mobile_responsiveness', status: CHECK_STATUS.NOT_MEASURED, evidence: null, recommendation: 'Ensure the site is mobile-responsive with proper viewport meta tag.' };
  return { name: 'mobile_responsiveness', status: CHECK_STATUS.PASS, evidence: 'Viewport meta tag present', recommendation: null };
}

function checkPageResponseTime(loadTime) {
  if (loadTime === null || loadTime === undefined) return { name: 'page_response_time', status: CHECK_STATUS.NOT_MEASURED, evidence: null, recommendation: 'Measure page load time and optimize for under 2.5 seconds.' };
  if (loadTime > 3) return { name: 'page_response_time', status: CHECK_STATUS.FAIL, evidence: `${loadTime}s load time`, recommendation: 'Optimize page speed for under 2.5s.' };
  if (loadTime > 2.5) return { name: 'page_response_time', status: CHECK_STATUS.WARNING, evidence: `${loadTime}s load time`, recommendation: 'Improve page speed to under 2.5s.' };
  return { name: 'page_response_time', status: CHECK_STATUS.PASS, evidence: `${loadTime}s load time`, recommendation: null };
}

function checkInternalLinks(links) {
  const internal = Array.isArray(links) ? links.filter(l => !l.startsWith('http') || l.includes(l.hostname)) : [];
  if (internal.length === 0) return { name: 'internal_links', status: CHECK_STATUS.NOT_MEASURED, evidence: null, recommendation: 'Add internal links to connect related content.' };
  if (internal.length < 3) return { name: 'internal_links', status: CHECK_STATUS.WARNING, evidence: `${internal.length} internal links found`, recommendation: 'Add more internal links (5+ recommended).' };
  return { name: 'internal_links', status: CHECK_STATUS.PASS, evidence: `${internal.length} internal links found`, recommendation: null };
}

export function runOnPageSeoChecks(websiteData) {
  if (!websiteData) return [];
  const metadata = websiteData.metadata || websiteData;
  const content = websiteData.content || websiteData;

  const checks = [
    checkTitle(metadata.title || content.title),
    checkMetaDescription(metadata.description || content.description),
    checkCanonical(metadata.canonical || content.canonical),
    checkH1(metadata.h1 || content.h1 || content.headings?.filter(h => h.level === 1 || h.tag === 'h1')),
    checkHeadingHierarchy(
      metadata.h1 || content.h1 || [],
      metadata.h2 || content.h2 || []
    ),
    checkRobotsTxt(content.robotsTxt || metadata.robotsTxt),
    checkSitemap(content.sitemap || metadata.sitemap),
    checkOpenGraph(metadata.openGraph || content.openGraph),
    checkTwitterCard(metadata.twitterCard || content.twitterCard),
    checkSchema(content.schema || metadata.schema),
    checkImageAlt(content.images || metadata.images || []),
    checkCrawlability(content.robotsTxt, metadata.metaRobots || content.metaRobots),
    checkHttps(websiteData.url || websiteData.websiteUrl),
    checkMobileResponsive(metadata.viewport || content.viewport),
    checkPageResponseTime(metadata.loadTime ?? content.loadTime ?? null),
    checkInternalLinks(content.links || metadata.links || [])
  ];

  return checks;
}
