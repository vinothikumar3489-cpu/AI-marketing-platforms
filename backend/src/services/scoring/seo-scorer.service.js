// ============================================
// SEO SCORER SERVICE
// Multi-dimensional SEO scoring system
// ============================================

export function calculateSeoScores(data) {
  const {
    technicalAudit,
    scrapedData,
    keywordData,
    competitorData,
    geoData,
    contentData
  } = data;

  console.log('📊 [SEO Scorer] Calculating multi-dimensional scores');

  const scores = {
    technical: calculateTechnicalScore(technicalAudit),
    onPage: calculateOnPageScore(scrapedData, technicalAudit),
    content: calculateContentScore(scrapedData, contentData),
    authority: calculateAuthorityScore(scrapedData, competitorData),
    aiVisibility: calculateAiVisibilityScore(geoData, scrapedData),
    localSeo: calculateLocalSeoScore(scrapedData),
    overall: 0
  };

  // Calculate weighted overall score
  const weights = {
    technical: 0.25,    // 25% - Critical foundation
    onPage: 0.20,       // 20% - Optimization quality
    content: 0.20,      // 20% - Content quality
    authority: 0.15,    // 15% - Domain strength
    aiVisibility: 0.15, // 15% - AI/GEO readiness
    localSeo: 0.05      // 5% - Local signals
  };

  scores.overall = Math.round(
    scores.technical * weights.technical +
    scores.onPage * weights.onPage +
    scores.content * weights.content +
    scores.authority * weights.authority +
    scores.aiVisibility * weights.aiVisibility +
    scores.localSeo * weights.localSeo
  );

  console.log('✅ [SEO Scorer] Overall score:', scores.overall);

  scores.dataQuality = {
    dataSources: [],
    confidence: 'low',
    isFallback: true
  };
  if (technicalAudit && technicalAudit.source === 'pagespeed_api') {
    scores.dataQuality.dataSources.push('pagespeed_api');
  }
  if (scrapedData && scrapedData.text) {
    scores.dataQuality.dataSources.push('website_scrape');
  }
  if (geoData && geoData.aiVisibilityScore !== undefined && geoData.aiVisibilityScore !== null) {
    scores.dataQuality.dataSources.push('geo_intelligence');
  }
  if (competitorData && competitorData.competitors && competitorData.competitors.length > 0) {
    scores.dataQuality.dataSources.push('competitor_data');
  }
  if (keywordData && keywordData.primaryKeywords && keywordData.primaryKeywords.length > 0) {
    scores.dataQuality.dataSources.push('keyword_intelligence');
  }
  scores.dataQuality.isFallback = scores.dataQuality.dataSources.length === 0;
  scores.dataQuality.confidence =
    scores.dataQuality.dataSources.length >= 3 ? 'high' :
    scores.dataQuality.dataSources.length >= 1 ? 'medium' : 'low';

  return scores;
}

// ============================================
// TECHNICAL SEO SCORE
// ============================================

function calculateTechnicalScore(technicalAudit) {
  if (!technicalAudit) return 50;

  const scores = technicalAudit.scores || {};
  
  // Critical factors (must have)
  const criticalFactors = {
    security: scores.security || 0,      // HTTPS
    mobile: scores.mobile || 0,          // Mobile-friendly
    indexability: scores.indexability || 0 // Robots.txt, sitemap
  };

  // Important factors
  const importantFactors = {
    title: scores.title || 0,
    meta: scores.meta || 0,
    headings: scores.headings || 0,
    canonical: scores.canonical || 0
  };

  // Optimization factors
  const optimizationFactors = {
    schema: scores.schema || 0,
    openGraph: scores.openGraph || 0,
    images: scores.images || 0,
    internalLinks: scores.internalLinks || 0,
    pageMetrics: scores.pageMetrics || 0
  };

  // Weighted calculation
  const criticalScore = Object.values(criticalFactors).reduce((a, b) => a + b, 0) / 3;
  const importantScore = Object.values(importantFactors).reduce((a, b) => a + b, 0) / 4;
  const optimizationScore = Object.values(optimizationFactors).reduce((a, b) => a + b, 0) / 5;

  // Critical issues significantly impact score
  const technicalScore = Math.round(
    criticalScore * 0.50 +      // 50% weight on critical
    importantScore * 0.35 +     // 35% weight on important
    optimizationScore * 0.15    // 15% weight on optimization
  );

  return Math.max(0, Math.min(100, technicalScore));
}

// ============================================
// ON-PAGE SEO SCORE
// ============================================

function calculateOnPageScore(scrapedData, technicalAudit) {
  if (!scrapedData || !technicalAudit) return 50;

  let score = 0;
  let maxScore = 0;

  // Title optimization (15 points)
  maxScore += 15;
  if (technicalAudit.titleTag) {
    score += (technicalAudit.titleTag.score / 100) * 15;
  }

  // Meta description (15 points)
  maxScore += 15;
  if (technicalAudit.metaDescription) {
    score += (technicalAudit.metaDescription.score / 100) * 15;
  }

  // Heading structure (20 points)
  maxScore += 20;
  if (technicalAudit.headingStructure) {
    const headingScore = technicalAudit.headingStructure.score;
    score += (headingScore / 100) * 20;
  }

  // Content quality (20 points)
  maxScore += 20;
  const wordCount = scrapedData.content?.wordCount || 0;
  if (wordCount >= 1500) score += 20;
  else if (wordCount >= 1000) score += 15;
  else if (wordCount >= 500) score += 10;
  else if (wordCount >= 300) score += 5;

  // Internal linking (15 points)
  maxScore += 15;
  const internalLinks = scrapedData.content?.internalLinks?.length || 0;
  if (internalLinks >= 10) score += 15;
  else if (internalLinks >= 5) score += 10;
  else if (internalLinks >= 3) score += 5;

  // Image optimization (15 points)
  maxScore += 15;
  if (technicalAudit.images) {
    score += (technicalAudit.images.score / 100) * 15;
  }

  return Math.round((score / maxScore) * 100);
}

// ============================================
// CONTENT SEO SCORE
// ============================================

function calculateContentScore(scrapedData, contentData) {
  if (!scrapedData) return 50;

  let score = 0;
  let maxScore = 0;

  // Content length (25 points)
  maxScore += 25;
  const wordCount = scrapedData.content?.wordCount || 0;
  if (wordCount >= 2000) score += 25;
  else if (wordCount >= 1500) score += 20;
  else if (wordCount >= 1000) score += 15;
  else if (wordCount >= 500) score += 10;
  else if (wordCount >= 300) score += 5;

  // Content structure (25 points)
  maxScore += 25;
  const paragraphs = scrapedData.content?.paragraphCount || 0;
  const headings = scrapedData.content?.headings?.length || 0;
  if (paragraphs >= 10 && headings >= 5) score += 25;
  else if (paragraphs >= 5 && headings >= 3) score += 15;
  else if (paragraphs >= 3 && headings >= 1) score += 10;

  // Multimedia (20 points)
  maxScore += 20;
  const images = scrapedData.content?.imageCount || 0;
  if (images >= 5) score += 20;
  else if (images >= 3) score += 15;
  else if (images >= 1) score += 10;

  // Readability (15 points) - estimated from structure
  maxScore += 15;
  const avgParagraphLength = wordCount / Math.max(paragraphs, 1);
  if (avgParagraphLength <= 150) score += 15;
  else if (avgParagraphLength <= 200) score += 10;
  else if (avgParagraphLength <= 300) score += 5;

  // Freshness indicator (15 points)
  maxScore += 15;
  // If we have content gap data, use it
  if (contentData && contentData.contentGaps) {
    const gaps = contentData.contentGaps.length || 0;
    if (gaps === 0) score += 15;
    else if (gaps <= 3) score += 10;
    else if (gaps <= 5) score += 5;
  } else {
    score += 10; // Default score
  }

  return Math.round((score / maxScore) * 100);
}

// ============================================
// AUTHORITY SCORE
// ============================================

function calculateAuthorityScore(scrapedData, competitorData) {
  // This is an estimation based on available signals
  let score = 50; // Base score

  // External links (backlink indicators)
  const externalLinks = scrapedData?.content?.externalLinks?.length || 0;
  if (externalLinks >= 10) score += 10;
  else if (externalLinks >= 5) score += 5;

  // Domain age indicator (from technical data)
  // Note: Would need actual backlink API for real data
  
  // Content depth
  const wordCount = scrapedData?.content?.wordCount || 0;
  if (wordCount >= 2000) score += 15;
  else if (wordCount >= 1000) score += 10;
  else if (wordCount >= 500) score += 5;

  // Schema markup (authority signal)
  const schemas = scrapedData?.structured?.jsonLd || [];
  const hasOrganization = schemas.some(s => s['@type'] === 'Organization');
  if (hasOrganization) score += 10;

  // Competitor comparison
  if (competitorData && competitorData.competitors) {
    const competitorCount = competitorData.competitors.length || 0;
    if (competitorCount >= 5) score += 10;
    else if (competitorCount >= 3) score += 5;
  }

  // Social signals (from Open Graph)
  const og = scrapedData?.technical?.openGraph || {};
  if (og.image && og.title && og.description) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ============================================
// AI VISIBILITY SCORE (GEO)
// ============================================

function calculateAiVisibilityScore(geoData, scrapedData) {
  if (geoData && geoData.aiVisibilityScore) {
    return geoData.aiVisibilityScore;
  }

  // Estimate based on structured data and content
  let score = 0;
  let maxScore = 0;

  // Structured data (30 points)
  maxScore += 30;
  const schemas = scrapedData?.structured?.jsonLd || [];
  if (schemas.length >= 3) score += 30;
  else if (schemas.length >= 2) score += 20;
  else if (schemas.length >= 1) score += 10;

  // FAQ content (20 points)
  maxScore += 20;
  const hasFAQ = schemas.some(s => s['@type'] === 'FAQPage');
  if (hasFAQ) score += 20;

  // Content depth (20 points)
  maxScore += 20;
  const wordCount = scrapedData?.content?.wordCount || 0;
  if (wordCount >= 1500) score += 20;
  else if (wordCount >= 1000) score += 15;
  else if (wordCount >= 500) score += 10;

  // Clear structure (15 points)
  maxScore += 15;
  const headings = scrapedData?.content?.headings || [];
  const hasH1 = headings.some(h => h.level === 1);
  const hasMultipleH2 = headings.filter(h => h.level === 2).length >= 2;
  if (hasH1 && hasMultipleH2) score += 15;
  else if (hasH1) score += 10;

  // Definition-style content (15 points)
  maxScore += 15;
  // Check for definition patterns in headings
  const definitionHeadings = headings.filter(h => 
    h.text.toLowerCase().includes('what is') ||
    h.text.toLowerCase().includes('how to') ||
    h.text.toLowerCase().includes('why')
  );
  if (definitionHeadings.length >= 2) score += 15;
  else if (definitionHeadings.length >= 1) score += 10;

  return Math.round((score / maxScore) * 100);
}

// ============================================
// LOCAL SEO SCORE
// ============================================

function calculateLocalSeoScore(scrapedData) {
  let score = 0;
  let maxScore = 0;

  // Local business schema (40 points)
  maxScore += 40;
  const schemas = scrapedData?.structured?.jsonLd || [];
  const hasLocalBusiness = schemas.some(s => 
    s['@type']?.includes('LocalBusiness') || 
    s['@type'] === 'Organization' && s.address
  );
  if (hasLocalBusiness) score += 40;

  // NAP (Name, Address, Phone) signals (30 points)
  maxScore += 30;
  const text = scrapedData?.text || '';
  const hasAddress = /\d+\s+[\w\s]+,\s+[A-Z]{2}\s+\d{5}/.test(text);
  const hasPhone = /\(\d{3}\)\s*\d{3}-\d{4}|\d{3}-\d{3}-\d{4}/.test(text);
  if (hasAddress && hasPhone) score += 30;
  else if (hasAddress || hasPhone) score += 15;

  // Location keywords (30 points)
  maxScore += 30;
  const locationKeywords = /(city|location|address|near me|local|area)/i;
  if (locationKeywords.test(text)) score += 30;

  // If no local signals, score is low (expected for non-local businesses)
  if (maxScore === 0) return 50; // Neutral score

  return Math.round((score / maxScore) * 100);
}

// ============================================
// SCORE TRENDS
// ============================================

export function calculateScoreTrend(currentScores, previousScores) {
  if (!previousScores) return null;

  return {
    overall: currentScores.overall - previousScores.overall,
    technical: currentScores.technical - previousScores.technical,
    onPage: currentScores.onPage - previousScores.onPage,
    content: currentScores.content - previousScores.content,
    authority: currentScores.authority - previousScores.authority,
    aiVisibility: currentScores.aiVisibility - previousScores.aiVisibility,
    localSeo: currentScores.localSeo - previousScores.localSeo
  };
}

// ============================================
// SCORE INTERPRETATION
// ============================================

export function interpretScore(score) {
  if (score >= 90) return { level: 'excellent', color: 'green', message: 'Outstanding SEO performance' };
  if (score >= 75) return { level: 'good', color: 'blue', message: 'Strong SEO foundation' };
  if (score >= 60) return { level: 'fair', color: 'yellow', message: 'Room for improvement' };
  if (score >= 40) return { level: 'poor', color: 'orange', message: 'Needs significant work' };
  return { level: 'critical', color: 'red', message: 'Critical issues present' };
}

// ============================================
// PRIORITY RECOMMENDATIONS
// ============================================

export function generatePriorityRecommendations(scores, technicalAudit) {
  const recommendations = [];

  // Technical score
  if (scores.technical < 70) {
    recommendations.push({
      area: 'Technical SEO',
      score: scores.technical,
      priority: scores.technical < 50 ? 'critical' : 'high',
      action: 'Fix critical technical issues (HTTPS, mobile, indexability)',
      impact: 'high',
      effort: 'medium'
    });
  }

  // On-page score
  if (scores.onPage < 70) {
    recommendations.push({
      area: 'On-Page Optimization',
      score: scores.onPage,
      priority: 'high',
      action: 'Optimize title tags, meta descriptions, and heading structure',
      impact: 'high',
      effort: 'low'
    });
  }

  // Content score
  if (scores.content < 70) {
    recommendations.push({
      area: 'Content Quality',
      score: scores.content,
      priority: 'medium',
      action: 'Expand content length and improve structure',
      impact: 'medium',
      effort: 'high'
    });
  }

  // Authority score
  if (scores.authority < 60) {
    recommendations.push({
      area: 'Domain Authority',
      score: scores.authority,
      priority: 'medium',
      action: 'Build backlinks and establish topical authority',
      impact: 'high',
      effort: 'high'
    });
  }

  // AI Visibility score
  if (scores.aiVisibility < 60) {
    recommendations.push({
      area: 'AI Visibility (GEO)',
      score: scores.aiVisibility,
      priority: 'medium',
      action: 'Add structured data, FAQ sections, and clear definitions',
      impact: 'medium',
      effort: 'medium'
    });
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations;
}
