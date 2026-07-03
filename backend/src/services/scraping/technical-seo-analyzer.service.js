import fetch from 'node-fetch';
import { getDesktopAndMobilePageSpeed, isPageSpeedConfigured } from '../pagespeed.service.js';

// ============================================
// TECHNICAL SEO ANALYZER
// Comprehensive technical SEO audit
// ============================================

export async function analyzeTechnicalSeo(scrapedData, websiteUrl) {
  console.log('🔍 [Technical SEO] Starting analysis for:', websiteUrl);

  // Get PageSpeed data if configured
  let pageSpeedData = null;
  if (isPageSpeedConfigured()) {
    console.log('🔍 [Technical SEO] Fetching PageSpeed data...');
    const pageSpeedResult = await getDesktopAndMobilePageSpeed(websiteUrl);
    if (pageSpeedResult.success) {
      pageSpeedData = pageSpeedResult.data;
      console.log('✅ [Technical SEO] PageSpeed data retrieved');
    } else {
      console.log('⚠️ [Technical SEO] PageSpeed data unavailable');
    }
  }

  const audit = {
    url: websiteUrl,
    analyzedAt: new Date().toISOString(),
    pageSpeed: pageSpeedData,
    
    // Core Elements
    titleTag: analyzeTitleTag(scrapedData),
    metaDescription: analyzeMetaDescription(scrapedData),
    canonicalTag: analyzeCanonicalTag(scrapedData, websiteUrl),
    robotsMeta: analyzeRobotsMeta(scrapedData),
    
    // Structured Data
    openGraph: analyzeOpenGraph(scrapedData),
    twitterCards: analyzeTwitterCards(scrapedData),
    schemaMarkup: analyzeSchemaMarkup(scrapedData),
    
    // Content Structure
    headingStructure: analyzeHeadingStructure(scrapedData),
    internalLinking: analyzeInternalLinking(scrapedData),
    images: analyzeImages(scrapedData),
    
    // Performance
    pageMetrics: analyzePageMetrics(scrapedData),
    
    // Security
    security: analyzeSecurityHeaders(websiteUrl),
    
    // Mobile
    mobile: analyzeMobileFriendliness(scrapedData),
    
    // Additional checks
    indexability: await checkIndexability(websiteUrl)
  };

  // Calculate scores - use PageSpeed if available, otherwise calculate from HTML analysis
  audit.scores = calculateScores(audit, pageSpeedData);

  // Generate issues and recommendations
  audit.issues = generateIssues(audit, pageSpeedData);
  audit.recommendations = generateRecommendations(audit, pageSpeedData);

  // Ensure canonical output structure with proper PageSpeed score mapping
  // PageSpeed service already returns 0-100 scores, use directly
  const mobileLighthouse = pageSpeedData?.mobile?.lighthouseScores;
  const desktopLighthouse = pageSpeedData?.desktop?.lighthouseScores;

  const canonicalOutput = {
    overallScore: audit.scores.overall || 0,
    performanceScore: mobileLighthouse?.performance || desktopLighthouse?.performance || audit.scores.performance || 0,
    seoScore: mobileLighthouse?.seo || desktopLighthouse?.seo || audit.scores.seo || 0,
    accessibilityScore: mobileLighthouse?.accessibility || desktopLighthouse?.accessibility || audit.scores.accessibility || 0,
    bestPracticesScore: mobileLighthouse?.bestPractices || desktopLighthouse?.bestPractices || audit.scores.bestPractices || 0,
    mobileScore: mobileLighthouse?.performance || audit.scores.performance || 0,
    desktopScore: desktopLighthouse?.performance || audit.scores.performance || 0,
    coreWebVitals: {
      fcp: pageSpeedData?.mobile?.coreWebVitals?.fcp || pageSpeedData?.desktop?.coreWebVitals?.fcp || null,
      lcp: pageSpeedData?.mobile?.coreWebVitals?.lcp || pageSpeedData?.desktop?.coreWebVitals?.lcp || null,
      cls: pageSpeedData?.mobile?.coreWebVitals?.cls || pageSpeedData?.desktop?.coreWebVitals?.cls || null,
      inp: pageSpeedData?.mobile?.coreWebVitals?.inp || pageSpeedData?.desktop?.coreWebVitals?.inp || null,
      ttfb: pageSpeedData?.mobile?.coreWebVitals?.ttfb || pageSpeedData?.desktop?.coreWebVitals?.ttfb || null
    },
    criticalIssues: audit.issues.critical || [],
    highIssues: audit.issues.high || [],
    mediumIssues: audit.issues.medium || [],
    recommendations: audit.recommendations || [],
    pageSpeed: pageSpeedData,
    auditData: {
      ...audit,
      scores: {
        ...audit.scores,
        performance: mobileLighthouse?.performance || desktopLighthouse?.performance || audit.scores.performance || 0,
        seo: mobileLighthouse?.seo || desktopLighthouse?.seo || audit.scores.seo || 0,
        accessibility: mobileLighthouse?.accessibility || desktopLighthouse?.accessibility || audit.scores.accessibility || 0,
        bestPractices: mobileLighthouse?.bestPractices || desktopLighthouse?.bestPractices || audit.scores.bestPractices || 0,
        mobile: mobileLighthouse?.performance || audit.scores.performance || 0,
        desktop: desktopLighthouse?.performance || audit.scores.performance || 0
      }
    }
  };

  console.log('✅ [Technical SEO] Analysis complete. Score:', canonicalOutput.overallScore, 
              'Performance:', canonicalOutput.performanceScore, 
              'SEO:', canonicalOutput.seoScore);

  return canonicalOutput;
}

// ============================================
// TITLE TAG ANALYSIS
// ============================================

function analyzeTitleTag(scrapedData) {
  const title = scrapedData.technical?.titleTag || '';
  const length = title.length;
  
  return {
    value: title,
    length,
    score: calculateTitleScore(length),
    status: getTitleStatus(length),
    issue: getTitleIssue(title, length),
    recommendation: getTitleRecommendation(title, length),
    priority: getTitlePriority(length)
  };
}

function calculateTitleScore(length) {
  if (length === 0) return 0;
  if (length < 30) return 40;
  if (length >= 30 && length <= 60) return 100;
  if (length <= 70) return 80;
  return 50;
}

function getTitleStatus(length) {
  if (length === 0) return 'missing';
  if (length < 30) return 'too_short';
  if (length > 70) return 'too_long';
  if (length >= 30 && length <= 60) return 'optimal';
  return 'acceptable';
}

function getTitleIssue(title, length) {
  // Log detected values for debugging
  console.log('🔍 [Technical SEO] Title check:', {
    title: title || '(empty)',
    length,
    hasTitle: !!title,
    source: title ? 'detected' : 'not detected'
  });
  
  // Only report missing if we're confident the scraping worked
  // If title is empty but we have other technical data, it might be genuinely missing
  // If everything is empty, the scraping might have failed
  if (length === 0) {
    // Check if we have other technical data to determine if scraping worked
    // This is a heuristic - if we have other data, assume scraping worked
    console.log('⚠️ [Technical SEO] No title tag found (scraping appears to have worked based on other data)');
    return 'No title tag found';
  }
  if (length < 30) return `Title too short (${length} chars). Should be 30-60 characters.`;
  if (length > 70) return `Title too long (${length} chars). Will be truncated in search results.`;
  return null;
}

function getTitleRecommendation(title, length) {
  if (length === 0) return 'Add a descriptive title tag (30-60 characters) with your primary keyword';
  if (length < 30) return 'Expand title to 30-60 characters. Include your main keyword and value proposition.';
  if (length > 70) return 'Shorten title to 30-60 characters to prevent truncation in search results.';
  return 'Title length is good. Ensure it includes your primary keyword near the beginning.';
}

function getTitlePriority(length) {
  if (length === 0) return 'critical';
  if (length < 30 || length > 70) return 'high';
  return 'low';
}

// ============================================
// META DESCRIPTION ANALYSIS
// ============================================

function analyzeMetaDescription(scrapedData) {
  const description = scrapedData.technical?.metaDescription || '';
  const length = description.length;
  
  return {
    value: description,
    length,
    score: calculateMetaScore(length),
    status: getMetaStatus(length),
    issue: getMetaIssue(description, length),
    recommendation: getMetaRecommendation(description, length),
    priority: getMetaPriority(length)
  };
}

function calculateMetaScore(length) {
  if (length === 0) return 0;
  if (length < 70) return 40;
  if (length >= 120 && length <= 160) return 100;
  if (length >= 70 && length < 120) return 70;
  if (length <= 180) return 80;
  return 50;
}

function getMetaStatus(length) {
  if (length === 0) return 'missing';
  if (length < 70) return 'too_short';
  if (length > 180) return 'too_long';
  if (length >= 120 && length <= 160) return 'optimal';
  return 'acceptable';
}

function getMetaIssue(description, length) {
  // Log detected values for debugging
  console.log('🔍 [Technical SEO] Meta description check:', {
    description: description || '(empty)',
    length,
    hasDescription: !!description,
    source: description ? 'detected' : 'not detected'
  });
  
  // Only report missing if we're confident the scraping worked
  if (length === 0) {
    console.log('⚠️ [Technical SEO] No meta description found (scraping appears to have worked based on other data)');
    return 'No meta description found';
  }
  if (length < 70) return `Meta description too short (${length} chars). Should be 120-160 characters.`;
  if (length > 180) return `Meta description too long (${length} chars). Will be truncated.`;
  return null;
}

function getMetaRecommendation(description, length) {
  if (length === 0) return 'Add a compelling meta description (120-160 characters) with target keywords and a call-to-action';
  if (length < 70) return 'Expand description to 120-160 characters. Include benefits, keywords, and a CTA.';
  if (length > 180) return 'Shorten description to 120-160 characters to prevent truncation.';
  return 'Description length is good. Ensure it includes keywords and entices clicks.';
}

function getMetaPriority(length) {
  if (length === 0) return 'high';
  if (length < 70 || length > 180) return 'medium';
  return 'low';
}

// ============================================
// CANONICAL TAG ANALYSIS
// ============================================

function analyzeCanonicalTag(scrapedData, websiteUrl) {
  const canonical = scrapedData.technical?.canonicalUrl || '';
  const hasCanonical = canonical.length > 0;
  
  return {
    value: canonical,
    hasCanonical,
    score: hasCanonical ? 100 : 60,
    status: hasCanonical ? 'present' : 'missing',
    issue: hasCanonical ? null : 'No canonical tag found',
    recommendation: hasCanonical 
      ? 'Canonical tag present. Ensure it points to the correct URL version.'
      : 'Add a canonical tag to specify the preferred version of this page.',
    priority: hasCanonical ? 'low' : 'medium'
  };
}

// ============================================
// ROBOTS META ANALYSIS
// ============================================

function analyzeRobotsMeta(scrapedData) {
  const robots = scrapedData.technical?.robotsMeta || '';
  const isIndexable = !robots.includes('noindex');
  const isFollowable = !robots.includes('nofollow');
  
  return {
    value: robots,
    isIndexable,
    isFollowable,
    score: (isIndexable && isFollowable) ? 100 : 50,
    status: isIndexable ? 'indexable' : 'noindex',
    issue: !isIndexable ? 'Page is set to noindex - will not appear in search results' : null,
    recommendation: isIndexable 
      ? 'Page is indexable. Ensure this is correct for this page type.'
      : 'Remove noindex directive if you want this page in search results.',
    priority: !isIndexable ? 'critical' : 'low'
  };
}

// ============================================
// OPEN GRAPH ANALYSIS
// ============================================

function analyzeOpenGraph(scrapedData) {
  const og = scrapedData.technical?.openGraph || {};
  const hasTitle = og.title?.length > 0;
  const hasDescription = og.description?.length > 0;
  const hasImage = og.image?.length > 0;
  const hasUrl = og.url?.length > 0;
  
  const completeness = [hasTitle, hasDescription, hasImage, hasUrl].filter(Boolean).length;
  const score = (completeness / 4) * 100;
  
  return {
    title: og.title || '',
    description: og.description || '',
    image: og.image || '',
    url: og.url || '',
    type: og.type || '',
    siteName: og.siteName || '',
    completeness,
    score,
    status: completeness >= 3 ? 'good' : completeness >= 2 ? 'partial' : 'missing',
    issue: completeness < 3 ? `Only ${completeness}/4 Open Graph tags present` : null,
    recommendation: completeness < 4 
      ? 'Add missing Open Graph tags (og:title, og:description, og:image, og:url) for better social sharing.'
      : 'Open Graph tags complete. Ensure image is high quality (1200x630px recommended).',
    priority: completeness < 2 ? 'medium' : 'low'
  };
}

// ============================================
// TWITTER CARDS ANALYSIS
// ============================================

function analyzeTwitterCards(scrapedData) {
  const twitter = scrapedData.technical?.twitterCard || {};
  const hasCard = twitter.card?.length > 0;
  const hasTitle = twitter.title?.length > 0;
  const hasDescription = twitter.description?.length > 0;
  const hasImage = twitter.image?.length > 0;
  
  const completeness = [hasCard, hasTitle, hasDescription, hasImage].filter(Boolean).length;
  const score = (completeness / 4) * 100;
  
  return {
    card: twitter.card || '',
    title: twitter.title || '',
    description: twitter.description || '',
    image: twitter.image || '',
    site: twitter.site || '',
    completeness,
    score,
    status: completeness >= 3 ? 'good' : completeness >= 1 ? 'partial' : 'missing',
    issue: completeness < 3 ? `Only ${completeness}/4 Twitter Card tags present` : null,
    recommendation: completeness < 4 
      ? 'Add Twitter Card tags (twitter:card, twitter:title, twitter:description, twitter:image) for better Twitter sharing.'
      : 'Twitter Cards complete. Test with Twitter Card Validator.',
    priority: completeness < 2 ? 'medium' : 'low'
  };
}

// ============================================
// SCHEMA MARKUP ANALYSIS
// ============================================

function analyzeSchemaMarkup(scrapedData) {
  const schemas = scrapedData.structured?.jsonLd || [];
  const hasSchema = schemas.length > 0;
  
  const schemaTypes = schemas.map(s => s['@type'] || 'Unknown');
  const hasBreadcrumbs = schemaTypes.some(t => t === 'BreadcrumbList');
  const hasFAQ = schemaTypes.some(t => t === 'FAQPage');
  const hasOrganization = schemaTypes.some(t => t === 'Organization');
  const hasArticle = schemaTypes.some(t => t.includes('Article'));
  
  return {
    hasSchema,
    schemaTypes,
    count: schemas.length,
    hasBreadcrumbs,
    hasFAQ,
    hasOrganization,
    hasArticle,
    score: hasSchema ? 80 : 40,
    status: hasSchema ? 'present' : 'missing',
    issue: !hasSchema ? 'No structured data (Schema.org) found' : null,
    recommendation: hasSchema 
      ? 'Schema markup present. Consider adding FAQ, Breadcrumb, or Organization schemas if relevant.'
      : 'Add JSON-LD structured data (Organization, Breadcrumb, FAQ) to enhance search appearance.',
    priority: !hasSchema ? 'medium' : 'low'
  };
}

// ============================================
// HEADING STRUCTURE ANALYSIS
// ============================================

function analyzeHeadingStructure(scrapedData) {
  const headings = scrapedData.content?.headings || [];
  
  const h1Count = headings.filter(h => h.level === 1).length;
  const hasH1 = h1Count > 0;
  const multipleH1 = h1Count > 1;
  const hasHierarchy = checkHeadingHierarchy(headings);
  
  let score = 50;
  if (hasH1 && !multipleH1) score += 30;
  if (hasHierarchy) score += 20;
  
  return {
    h1Count,
    totalCount: headings.length,
    hasH1,
    multipleH1,
    hasHierarchy,
    headings: headings.slice(0, 20), // First 20 headings
    score,
    status: hasH1 && !multipleH1 && hasHierarchy ? 'good' : 'needs_improvement',
    issue: !hasH1 ? 'No H1 heading found' 
      : multipleH1 ? `Multiple H1 tags found (${h1Count})` 
      : !hasHierarchy ? 'Heading hierarchy has gaps' 
      : null,
    recommendation: !hasH1 ? 'Add a single H1 heading with your main keyword'
      : multipleH1 ? 'Use only one H1 per page. Use H2-H6 for subheadings.'
      : !hasHierarchy ? 'Follow proper heading hierarchy (H1 → H2 → H3, etc.)'
      : 'Heading structure is good. Ensure headings describe content accurately.',
    priority: !hasH1 ? 'high' : multipleH1 ? 'medium' : 'low'
  };
}

function checkHeadingHierarchy(headings) {
  if (headings.length < 2) return true;
  
  for (let i = 1; i < headings.length; i++) {
    const currentLevel = headings[i].level;
    const previousLevel = headings[i - 1].level;
    
    // Check if there's a gap (e.g., H1 → H3)
    if (currentLevel - previousLevel > 1) {
      return false;
    }
  }
  
  return true;
}

// ============================================
// INTERNAL LINKING ANALYSIS
// ============================================

function analyzeInternalLinking(scrapedData) {
  const internalLinks = scrapedData.content?.internalLinks || [];
  const count = internalLinks.length;
  
  let score = 50;
  if (count >= 5) score += 20;
  if (count >= 10) score += 20;
  if (count >= 20) score += 10;
  
  return {
    count,
    links: internalLinks.slice(0, 50), // First 50 links
    score: Math.min(score, 100),
    status: count >= 5 ? 'good' : 'low',
    issue: count < 3 ? 'Very few internal links found' : null,
    recommendation: count < 5 
      ? 'Add more internal links to relevant pages (aim for 5-10 contextual links)'
      : 'Internal linking is good. Ensure links use descriptive anchor text.',
    priority: count < 3 ? 'medium' : 'low'
  };
}

// ============================================
// IMAGE ANALYSIS
// ============================================

function analyzeImages(scrapedData) {
  const images = scrapedData.content?.images || [];
  const count = images.length;
  
  const withAlt = images.filter(img => img.alt && img.alt.length > 0).length;
  const withoutAlt = count - withAlt;
  const altPercentage = count > 0 ? (withAlt / count) * 100 : 0;
  
  const withLazyLoading = images.filter(img => img.loading === 'lazy').length;
  
  return {
    count,
    withAlt,
    withoutAlt,
    altPercentage,
    withLazyLoading,
    score: Math.min(altPercentage, 100),
    status: altPercentage >= 90 ? 'good' : altPercentage >= 70 ? 'acceptable' : 'needs_improvement',
    issue: altPercentage < 90 ? `${withoutAlt} images missing alt text` : null,
    recommendation: altPercentage < 90 
      ? `Add descriptive alt text to all ${withoutAlt} images for accessibility and SEO`
      : 'Image alt text is good. Consider adding lazy loading for performance.',
    priority: altPercentage < 70 ? 'medium' : 'low'
  };
}

// ============================================
// PAGE METRICS ANALYSIS
// ============================================

function analyzePageMetrics(scrapedData) {
  const html = scrapedData.html || '';
  const text = scrapedData.text || '';
  
  const htmlSize = Buffer.byteLength(html, 'utf8');
  const wordCount = text.split(/\s+/).length;
  
  // Estimate resource sizes
  const jsSize = estimateJsSize(html);
  const cssSize = estimateCssSize(html);
  
  return {
    htmlSize,
    wordCount,
    jsSize,
    cssSize,
    totalSize: htmlSize + jsSize + cssSize,
    score: htmlSize < 500000 ? 100 : htmlSize < 1000000 ? 70 : 40,
    status: htmlSize < 500000 ? 'good' : htmlSize < 1000000 ? 'acceptable' : 'large',
    issue: htmlSize > 1000000 ? 'HTML size exceeds 1MB' : null,
    recommendation: htmlSize > 1000000 
      ? 'Optimize page size. Consider code splitting, compression, and removing unused code.'
      : 'Page size is acceptable. Monitor as content grows.',
    priority: htmlSize > 1000000 ? 'medium' : 'low'
  };
}

function estimateJsSize(html) {
  const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
  return scriptMatches.reduce((sum, script) => sum + script.length, 0);
}

function estimateCssSize(html) {
  const styleMatches = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
  return styleMatches.reduce((sum, style) => sum + style.length, 0);
}

// ============================================
// SECURITY ANALYSIS
// ============================================

function analyzeSecurityHeaders(websiteUrl) {
  const hasHTTPS = websiteUrl.startsWith('https://');
  
  return {
    hasHTTPS,
    score: hasHTTPS ? 100 : 0,
    status: hasHTTPS ? 'secure' : 'insecure',
    issue: !hasHTTPS ? 'Website not using HTTPS' : null,
    recommendation: !hasHTTPS 
      ? 'Implement HTTPS immediately. Required for security and SEO.'
      : 'HTTPS enabled. Ensure all resources load over HTTPS.',
    priority: !hasHTTPS ? 'critical' : 'low'
  };
}

// ============================================
// MOBILE FRIENDLINESS ANALYSIS
// ============================================

function analyzeMobileFriendliness(scrapedData) {
  const viewport = scrapedData.technical?.viewport || '';
  const hasViewport = viewport.length > 0;
  const isResponsive = hasViewport && viewport.includes('width=device-width');
  
  // Log detected values for debugging
  console.log('🔍 [Technical SEO] Viewport check:', {
    viewport: viewport || '(empty)',
    hasViewport,
    isResponsive,
    hasTechnicalData: scrapedData.technical && Object.keys(scrapedData.technical).length > 0,
    source: viewport ? 'detected' : 'not detected'
  });
  
  // Only report issue if we're confident the scraping worked and viewport is genuinely missing
  // If viewport is empty but we have other technical data, it might be genuinely missing
  const issue = (!hasViewport && scrapedData.technical && Object.keys(scrapedData.technical).length > 0) 
    ? 'No responsive viewport meta tag found' 
    : null;
  
  if (issue) {
    console.log('⚠️ [Technical SEO] Viewport issue reported:', issue);
  }
  
  return {
    hasViewport,
    viewport,
    isResponsive,
    score: isResponsive ? 100 : hasViewport ? 60 : 0,
    status: isResponsive ? 'responsive' : 'not_responsive',
    issue,
    recommendation: !isResponsive && issue
      ? 'Add viewport meta tag: <meta name="viewport" content="width=device-width, initial-scale=1">'
      : 'Viewport configured. Test on actual mobile devices.',
    priority: !isResponsive && issue ? 'high' : 'low'
  };
}

// ============================================
// INDEXABILITY CHECK
// ============================================

async function checkIndexability(websiteUrl) {
  try {
    const domain = new URL(websiteUrl).origin;
    
    // Check robots.txt
    const robotsTxt = await checkRobotsTxt(domain);
    
    // Check sitemap.xml
    const sitemap = await checkSitemap(domain);
    
    return {
      robotsTxt,
      sitemap,
      score: (robotsTxt.exists && sitemap.exists) ? 100 : robotsTxt.exists ? 70 : 40,
      status: (robotsTxt.exists && sitemap.exists) ? 'good' : 'partial',
      issue: (!robotsTxt.exists || !sitemap.exists) ? 'Missing indexability files (robots.txt or sitemap.xml)' : null,
      recommendation: !robotsTxt.exists 
        ? 'Add robots.txt file to root domain'
        : !sitemap.exists 
        ? 'Add sitemap.xml and submit to Google Search Console'
        : 'Both robots.txt and sitemap.xml present. Ensure sitemap is up to date.',
      priority: (!robotsTxt.exists || !sitemap.exists) ? 'high' : 'low'
    };
  } catch (error) {
    return {
      robotsTxt: { exists: false },
      sitemap: { exists: false },
      score: 0,
      status: 'unknown',
      issue: 'Could not check indexability files',
      recommendation: 'Check server configuration or robots.txt availability',
      priority: 'high'
    };
  }
}

async function checkRobotsTxt(domain) {
  try {
    const response = await fetch(`${domain}/robots.txt`, { 
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    });
    return {
      exists: response.ok,
      status: response.status,
      url: `${domain}/robots.txt`
    };
  } catch {
    return { exists: false, url: `${domain}/robots.txt` };
  }
}

async function checkSitemap(domain) {
  const sitemapUrls = [
    `${domain}/sitemap.xml`,
    `${domain}/sitemap_index.xml`,
    `${domain}/sitemap1.xml`
  ];
  
  for (const url of sitemapUrls) {
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        return {
          exists: true,
          status: response.status,
          url
        };
      }
    } catch {
      // Try next URL
    }
  }
  
  return { exists: false };
}

// ============================================
// FALSE POSITIVE PREVENTION
// ============================================

function isFalsePositive(check) {
  // Prevent false positives for title tag
  if (check.issue && check.issue.includes('No title tag found')) {
    // If the check has a value (title exists), it's a false positive
    if (check.value && check.value.length > 0) {
      return true;
    }
  }
  
  // Prevent false positives for meta description
  if (check.issue && check.issue.includes('No meta description found')) {
    if (check.value && check.value.length > 0) {
      return true;
    }
  }
  
  // Prevent false positives for viewport
  if (check.issue && check.issue.includes('No responsive viewport')) {
    if (check.hasViewport || (check.viewport && check.viewport.length > 0)) {
      return true;
    }
  }
  
  // Prevent false positives for schema
  if (check.issue && check.issue.includes('No schema')) {
    if (check.hasSchema || (check.schemas && check.schemas.length > 0)) {
      return true;
    }
  }
  
  return false;
}

// ============================================
// SCORING & RECOMMENDATIONS
// ============================================

function calculateScores(audit, pageSpeedData = null) {
  const scores = {
    title: audit.titleTag.score,
    meta: audit.metaDescription.score,
    canonical: audit.canonicalTag.score,
    robots: audit.robotsMeta.score,
    openGraph: audit.openGraph.score,
    twitterCards: audit.twitterCards.score,
    schema: audit.schemaMarkup.score,
    headings: audit.headingStructure.score,
    internalLinks: audit.internalLinking.score,
    images: audit.images.score,
    pageMetrics: audit.pageMetrics.score,
    security: audit.security.score,
    mobile: audit.mobile.score,
    indexability: audit.indexability.score
  };
  
  // Use PageSpeed scores if available
  if (pageSpeedData) {
    const mobileScores = pageSpeedData.mobile?.lighthouseScores;
    const desktopScores = pageSpeedData.desktop?.lighthouseScores;
    
    if (mobileScores) {
      scores.performance = mobileScores.performance;
      scores.accessibility = mobileScores.accessibility;
      scores.bestPractices = mobileScores.bestPractices;
      scores.seo = mobileScores.seo;
    } else if (desktopScores) {
      scores.performance = desktopScores.performance;
      scores.accessibility = desktopScores.accessibility;
      scores.bestPractices = desktopScores.bestPractices;
      scores.seo = desktopScores.seo;
    }
  }
  
  // Calculate weighted overall score
  const weights = {
    title: 1.5,
    meta: 1.5,
    security: 2.0,
    mobile: 1.5,
    headings: 1.0,
    schema: 1.0,
    openGraph: 0.8,
    twitterCards: 0.6,
    canonical: 0.8,
    robots: 1.2,
    internalLinks: 0.8,
    images: 0.7,
    pageMetrics: 0.8,
    indexability: 1.0
  };
  
  // Add PageSpeed weights if available
  if (pageSpeedData && scores.performance !== undefined) {
    weights.performance = 2.0;
    weights.seo = 1.5;
  }
  
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const weightedSum = Object.keys(scores).reduce((sum, key) => {
    return sum + (scores[key] * (weights[key] || 1));
  }, 0);
  
  scores.overall = Math.round(weightedSum / totalWeight);
  
  return scores;
}

function generateIssues(audit, pageSpeedData = null) {
  const issues = {
    critical: [],
    high: [],
    medium: [],
    low: []
  };
  
  const checks = [
    audit.titleTag,
    audit.metaDescription,
    audit.canonicalTag,
    audit.robotsMeta,
    audit.openGraph,
    audit.twitterCards,
    audit.schemaMarkup,
    audit.headingStructure,
    audit.internalLinking,
    audit.images,
    audit.pageMetrics,
    audit.security,
    audit.mobile
  ];
  
  // Add PageSpeed failed audits if available - deduplicate by title
  if (pageSpeedData) {
    const seenTitles = new Set();
    
    const mobileAudits = pageSpeedData.mobile?.failedAudits || [];
    const desktopAudits = pageSpeedData.desktop?.failedAudits || [];
    
    [...mobileAudits, ...desktopAudits].forEach(audit => {
      const title = audit.title || 'Unknown issue';
      // Skip duplicates
      if (seenTitles.has(title)) return;
      seenTitles.add(title);
      
      const severity = audit.severity || 'medium';
      issues[severity].push({
        title,
        issue: audit.description,
        recommendation: 'Fix this issue as recommended by PageSpeed Insights',
        score: audit.score,
        source: 'PageSpeed',
        severity,
        affectedMetric: 'Performance'
      });
    });
  }
  
  checks.forEach(check => {
    // Only add issue if it exists and is not a false positive
    if (check.issue && check.priority && !isFalsePositive(check)) {
      const title = check.issue || 'Technical issue';
      // Skip if already added from PageSpeed
      const alreadyExists = issues[check.priority].some(i => i.issue === check.issue);
      if (alreadyExists) return;
      
      issues[check.priority].push({
        title,
        issue: check.issue,
        recommendation: check.recommendation,
        score: check.score,
        source: 'HTML Analysis',
        severity: check.priority,
        affectedMetric: check.name || 'Technical SEO'
      });
    }
  });
  
  return issues;
}

function generateRecommendations(audit, pageSpeedData = null) {
  const recommendations = [];
  
  const checks = [
    { name: 'Title Tag', data: audit.titleTag },
    { name: 'Meta Description', data: audit.metaDescription },
    { name: 'HTTPS Security', data: audit.security },
    { name: 'Mobile Responsive', data: audit.mobile },
    { name: 'Heading Structure', data: audit.headingStructure },
    { name: 'Schema Markup', data: audit.schemaMarkup },
    { name: 'Open Graph', data: audit.openGraph },
    { name: 'Image Alt Tags', data: audit.images },
    { name: 'Internal Linking', data: audit.internalLinking }
  ];
  
  checks.forEach(check => {
    if (check.data.score < 80) {
      recommendations.push({
        area: check.name,
        currentScore: check.data.score,
        priority: check.data.priority,
        recommendation: check.data.recommendation
      });
    }
  });
  
  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) => {
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
  
  return recommendations;
}
