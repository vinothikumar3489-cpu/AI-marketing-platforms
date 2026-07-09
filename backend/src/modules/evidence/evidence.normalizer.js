export function normalizeEvidenceResponse(raw) {
  const sourcesCollected = [];
  const missingSources = [];

  if (!raw) return { sourcesCollected, missingSources, evidence: null };

  const evidence = {};

  if (raw.website) {
    evidence.website = {
      title: raw.website.title || null,
      metaDescription: raw.website.metaDescription || null,
      headings: raw.website.headings || [],
      heroText: raw.website.heroText || null,
      ctaTexts: raw.website.ctaTexts || [],
      featuresText: raw.website.featuresText || [],
      pageTypes: {
        hasPricingPage: raw.website.hasPricingPage || null,
        hasFaqSection: raw.website.hasFaqSection || null,
        hasBlog: raw.website.hasBlog || null,
        hasContactPage: raw.website.hasContactPage || null,
        hasAboutPage: raw.website.hasAboutPage || null,
      },
      technologyHints: raw.website.technologyHints || [],
    };
    sourcesCollected.push("websiteScraper");
  } else {
    missingSources.push("websiteScraper");
  }

  if (raw.openGraph) {
    evidence.openGraph = {
      ogTitle: raw.openGraph.ogTitle || null,
      ogDescription: raw.openGraph.ogDescription || null,
      ogImage: raw.openGraph.ogImage || null,
      ogType: raw.openGraph.ogType || null,
      twitterTitle: raw.openGraph.twitterTitle || null,
      twitterDescription: raw.openGraph.twitterDescription || null,
      twitterImage: raw.openGraph.twitterImage || null,
      canonicalUrl: raw.openGraph.canonicalUrl || null,
    };
    sourcesCollected.push("openGraph");
  } else {
    missingSources.push("openGraph");
  }

  if (raw.schemas && raw.schemas.count > 0) {
    evidence.schemas = {
      types: raw.schemas.types || [],
      count: raw.schemas.count,
      hasOrganization: raw.schemas.hasOrganization || false,
      hasProduct: raw.schemas.hasProduct || false,
      hasFAQPage: raw.schemas.hasFAQPage || false,
      hasArticle: raw.schemas.hasArticle || false,
      hasBreadcrumbList: raw.schemas.hasBreadcrumbList || false,
      hasReview: raw.schemas.hasReview || false,
      hasAggregateRating: raw.schemas.hasAggregateRating || false,
    };
    sourcesCollected.push("schemaOrg");
  } else {
    missingSources.push("schemaOrg");
  }

  if (raw.robots) {
    evidence.robots = {
      exists: raw.robots.exists || false,
      sitemapUrls: raw.robots.sitemapUrls || [],
      blockedPaths: raw.robots.blockedPaths || [],
      crawlDelay: raw.robots.crawlDelay || null,
      rulesSummary: raw.robots.rulesSummary || null,
    };
    sourcesCollected.push("robotsTxt");
  } else {
    missingSources.push("robotsTxt");
  }

  if (raw.sitemap) {
    evidence.sitemap = {
      exists: raw.sitemap.exists || false,
      urlCount: raw.sitemap.urlCount || null,
      sampleUrls: raw.sitemap.sampleUrls || [],
      blogUrls: raw.sitemap.blogUrls || [],
      productUrls: raw.sitemap.productUrls || [],
      categoryUrls: raw.sitemap.categoryUrls || [],
      lastmodCount: raw.sitemap.lastmodValues?.length || 0,
    };
    sourcesCollected.push("sitemapXml");
  } else {
    missingSources.push("sitemapXml");
  }

  if (raw.pageSpeed && raw.pageSpeed.performanceScore != null) {
    evidence.pageSpeed = {
      performance: raw.pageSpeed.performanceScore,
      accessibility: raw.pageSpeed.accessibilityScore,
      bestPractices: raw.pageSpeed.bestPracticesScore,
      seo: raw.pageSpeed.seoScore,
      lcp: raw.pageSpeed.lcp,
      cls: raw.pageSpeed.cls,
      inp: raw.pageSpeed.inp,
      ttfb: raw.pageSpeed.ttfb,
      topOpportunities: raw.pageSpeed.topOpportunities?.slice(0, 5) || [],
    };
    sourcesCollected.push("pageSpeedInsights");
  } else {
    missingSources.push("pageSpeedInsights");
  }

  if (raw.github && raw.github.repos?.length > 0) {
    evidence.github = {
      repos: raw.github.repos.map(r => ({
        fullName: r.fullName,
        stars: r.stars,
        forks: r.forks,
        openIssues: r.openIssues,
        language: r.language,
        updatedAt: r.updatedAt,
        latestRelease: r.latestRelease?.tagName || null,
        contributorsCount: r.contributorsCount,
      })),
    };
    sourcesCollected.push("github");
  } else {
    missingSources.push("github");
  }

  if (raw.technology && raw.technology.detected?.length > 0) {
    evidence.technology = {
      detected: raw.technology.detected,
      hints: raw.technology.hints || [],
    };
    sourcesCollected.push("technologyDetection");
  } else {
    missingSources.push("technologyDetection");
  }

  return {
    sourcesCollected,
    missingSources: missingSources.filter(s => s !== "github"), // GitHub is optional
    evidence,
  };
}

export function buildGrowthWorkspaceDataFromEvidence(evidence) {
  if (!evidence) return null;

  const result = {
    sourceSummary: { sourcesCollected: [], missingSources: [], completenessScore: 0 },
    companyOverview: {},
    productIntelligence: {},
    technicalSeo: {},
    marketSignals: [],
    competitors: [],
    growthSignals: [],
  };

  const counts = { collected: 0, total: 0 };

  // --- Company Overview from website evidence ---
  if (evidence.website) {
    counts.collected++;
    result.companyOverview.title = evidence.website.title || null;
    result.companyOverview.metaDescription = evidence.website.metaDescription || null;
    result.companyOverview.heroText = evidence.website.heroText || null;
    result.companyOverview.hasPricingPage = evidence.website.pageTypes?.hasPricingPage || null;
    result.companyOverview.hasFaqSection = evidence.website.pageTypes?.hasFaqSection || null;
    result.companyOverview.hasBlog = evidence.website.pageTypes?.hasBlog || null;
    result.companyOverview.hasContactPage = evidence.website.pageTypes?.hasContactPage || null;
    result.companyOverview.hasAboutPage = evidence.website.pageTypes?.hasAboutPage || null;
    result.companyOverview.ctaTexts = evidence.website.ctaTexts || [];
    result.companyOverview.technologyHints = evidence.website.technologyHints || [];
  }
  counts.total++;

  // --- OpenGraph (content evidence) ---
  if (evidence.openGraph) {
    result.companyOverview.ogTitle = evidence.openGraph.ogTitle || null;
    result.companyOverview.ogDescription = evidence.openGraph.ogDescription || null;
    result.companyOverview.ogImage = evidence.openGraph.ogImage || null;
    result.companyOverview.canonicalUrl = evidence.openGraph.canonicalUrl || null;
  }

  // --- Schema evidence ---
  if (evidence.schemas && evidence.schemas.count > 0) {
    counts.collected++;
    result.productIntelligence.schemaTypes = evidence.schemas.types || [];
    result.productIntelligence.hasOrganization = evidence.schemas.hasOrganization || false;
    result.productIntelligence.hasProduct = evidence.schemas.hasProduct || false;
    result.productIntelligence.hasFAQPage = evidence.schemas.hasFAQPage || false;
    result.productIntelligence.hasArticle = evidence.schemas.hasArticle || false;
    result.productIntelligence.hasBreadcrumbList = evidence.schemas.hasBreadcrumbList || false;
    result.productIntelligence.hasReview = evidence.schemas.hasReview || false;
    result.productIntelligence.hasAggregateRating = evidence.schemas.hasAggregateRating || false;
  }
  counts.total++;

  // --- Robots.txt ---
  if (evidence.robots) {
    counts.collected++;
    result.technicalSeo.robotsExists = evidence.robots.exists || false;
    result.technicalSeo.robotsSitemapUrls = evidence.robots.sitemapUrls || [];
    result.technicalSeo.robotsBlockedPaths = evidence.robots.blockedPaths || [];
    result.technicalSeo.robotsCrawlDelay = evidence.robots.crawlDelay || null;
  }
  counts.total++;

  // --- Sitemap ---
  if (evidence.sitemap && evidence.sitemap.exists) {
    counts.collected++;
    result.technicalSeo.sitemapUrlCount = evidence.sitemap.urlCount || null;
    result.technicalSeo.sitemapSampleUrls = evidence.sitemap.sampleUrls || [];
    result.technicalSeo.sitemapBlogUrls = evidence.sitemap.blogUrls || [];
    result.technicalSeo.sitemapProductUrls = evidence.sitemap.productUrls || [];
    result.technicalSeo.sitemapCategoryUrls = evidence.sitemap.categoryUrls || [];
  }
  counts.total++;

  // --- PageSpeed ---
  if (evidence.pageSpeed) {
    counts.collected++;
    result.technicalSeo.performanceScore = evidence.pageSpeed.performance;
    result.technicalSeo.accessibilityScore = evidence.pageSpeed.accessibility;
    result.technicalSeo.bestPracticesScore = evidence.pageSpeed.bestPractices;
    result.technicalSeo.seoScore = evidence.pageSpeed.seo;
    result.technicalSeo.lcp = evidence.pageSpeed.lcp;
    result.technicalSeo.cls = evidence.pageSpeed.cls;
    result.technicalSeo.inp = evidence.pageSpeed.inp;
    result.technicalSeo.ttfb = evidence.pageSpeed.ttfb;
    result.technicalSeo.topOpportunities = evidence.pageSpeed.topOpportunities || [];
  }
  counts.total++;

  // --- GitHub ---
  if (evidence.github && evidence.github.repos?.length > 0) {
    counts.collected++;
    result.githubRepos = evidence.github.repos.map(r => ({
      fullName: r.fullName,
      stars: r.stars,
      forks: r.forks,
      openIssues: r.openIssues,
      language: r.language,
    }));
  }
  counts.total++;

  // --- Technology ---
  if (evidence.technology && evidence.technology.detected?.length > 0) {
    counts.collected++;
    result.companyOverview.technologies = evidence.technology.detected;
    result.companyOverview.technologyHints = evidence.technology.hints || [];
  }
  counts.total++;

  // Build growth signals from all evidence sources
  if (evidence.website?.featuresText?.length) {
    result.growthSignals.push({
      signal: `Extracted ${evidence.website.featuresText.length} features/benefits from website text`,
      source: 'Website Content',
      evidence: 'Direct extraction',
    });
  }

  if (evidence.website?.ctaTexts?.length) {
    result.growthSignals.push({
      signal: `Found ${evidence.website.ctaTexts.length} CTAs on homepage`,
      source: 'Website Content',
      evidence: evidence.website.ctaTexts.join(', '),
    });
  }

  if (evidence.schemas?.hasProduct) {
    result.growthSignals.push({
      signal: 'Product schema detected - structured product data available',
      source: 'Schema.org',
      evidence: 'JSON-LD Product markup',
    });
  }

  if (evidence.schemas?.hasReview || evidence.schemas?.hasAggregateRating) {
    result.growthSignals.push({
      signal: 'Reviews/ratings schema detected - social proof available',
      source: 'Schema.org',
      evidence: 'Review/AggregateRating markup',
    });
  }

  if (evidence.sitemap?.exists) {
    result.growthSignals.push({
      signal: `Sitemap with ${evidence.sitemap.urlCount || '?'} URLs found`,
      source: 'Sitemap XML',
      evidence: `${evidence.sitemap.blogUrls?.length || 0} blog URLs, ${evidence.sitemap.productUrls?.length || 0} product URLs`,
    });
  }

  if (evidence.github?.repos?.length) {
    result.growthSignals.push({
      signal: `${evidence.github.repos.length} open source GitHub repos found`,
      source: 'GitHub API',
      evidence: evidence.github.repos.map(r => `${r.fullName} (${r.stars}★)`).join(', '),
    });
  }

  if (evidence.technology?.detected?.length) {
    result.growthSignals.push({
      signal: `Tech stack detected: ${evidence.technology.detected.join(', ')}`,
      source: 'Technology Detection',
      evidence: 'HTTP headers / HTML analysis',
    });
  }

  if (evidence.pageSpeed) {
    if (evidence.pageSpeed.performance != null && evidence.pageSpeed.performance < 50) {
      result.growthSignals.push({
        signal: `Low PageSpeed score (${evidence.pageSpeed.performance}) - optimization opportunity`,
        source: 'PageSpeed Insights',
        evidence: `Performance: ${evidence.pageSpeed.performance}, LCP: ${(evidence.pageSpeed.lcp / 1000).toFixed(1)}s` ,
      });
    }
    if (evidence.pageSpeed.seo != null && evidence.pageSpeed.seo < 80) {
      result.growthSignals.push({
        signal: `SEO score ${evidence.pageSpeed.seo} - technical SEO improvements needed`,
        source: 'PageSpeed Insights',
        evidence: `SEO score: ${evidence.pageSpeed.seo}`,
      });
    }
  }

  // Build feature list from website evidence
  if (evidence.website?.featuresText?.length) {
    result.productIntelligence.features = evidence.website.featuresText.map(f => ({
      value: f,
      source: 'website_text',
      confidence: 100,
    }));
  }

  // Build CTA list
  if (evidence.website?.ctaTexts?.length) {
    result.productIntelligence.ctaTexts = evidence.website.ctaTexts;
  }

  // Technology as product intelligence
  if (evidence.technology?.detected?.length) {
    result.productIntelligence.technologiesDetected = evidence.technology.detected;
  }

  result.sourceSummary = {
    sourcesCollected: counts.collected,
    totalSources: counts.total,
    completenessScore: counts.total > 0 ? Math.round((counts.collected / counts.total) * 100) : 0,
  };

  return result;
}

export function buildSEOEvidenceData(evidence) {
  if (!evidence) return null;

  const counts = { collected: 0, total: 0 };

  const result = {
    pageSpeed: null,
    robots: null,
    sitemap: null,
    schemas: null,
    openGraph: null,
    metadata: null,
    headingsStructure: null,
    sourceSummary: { sourcesCollected: 0, totalSources: 0, completenessScore: 0 },
    technicalIssues: [],
    contentOpportunities: [],
  };

  // PageSpeed from technicalSeoEvidence
  if (evidence.pageSpeed) {
    counts.collected++;
    result.pageSpeed = {
      performance: evidence.pageSpeed.performance ?? null,
      accessibility: evidence.pageSpeed.accessibility ?? null,
      bestPractices: evidence.pageSpeed.bestPractices ?? null,
      seo: evidence.pageSpeed.seo ?? null,
      lcp: evidence.pageSpeed.lcp ?? null,
      cls: evidence.pageSpeed.cls ?? null,
      inp: evidence.pageSpeed.inp ?? null,
      ttfb: evidence.pageSpeed.ttfb ?? null,
      topOpportunities: evidence.pageSpeed.topOpportunities || [],
      source: 'Google PageSpeed Insights API',
    };
    if (result.pageSpeed.performance != null && result.pageSpeed.performance < 50) {
      result.technicalIssues.push({
        action: 'Improve PageSpeed performance score',
        reason: `Current score: ${result.pageSpeed.performance}/100`,
        evidence: 'PageSpeed Insights',
        priority: 'high',
        effort: 'medium',
        impact: 'User Experience, SEO Rankings',
      });
    }
    if (result.pageSpeed.lcp != null && result.pageSpeed.lcp > 2500) {
      result.technicalIssues.push({
        action: 'Optimize Largest Contentful Paint (LCP)',
        reason: `Current LCP: ${(result.pageSpeed.lcp / 1000).toFixed(1)}s (target: <2.5s)`,
        evidence: 'PageSpeed Insights',
        priority: 'high',
        effort: 'medium',
        impact: 'Core Web Vitals, User Experience',
      });
    }
    if (result.pageSpeed.cls != null && result.pageSpeed.cls > 0.1) {
      result.technicalIssues.push({
        action: 'Improve Cumulative Layout Shift (CLS)',
        reason: `Current CLS: ${result.pageSpeed.cls.toFixed(2)} (target: <0.1)`,
        evidence: 'PageSpeed Insights',
        priority: 'high',
        effort: 'medium',
        impact: 'Core Web Vitals, User Experience',
      });
    }
  }
  counts.total++;

  // Robots.txt
  if (evidence.robots) {
    counts.collected++;
    result.robots = {
      exists: evidence.robots.exists || false,
      sitemapUrls: evidence.robots.sitemapUrls || [],
      blockedPaths: evidence.robots.blockedPaths || [],
      crawlDelay: evidence.robots.crawlDelay || null,
      source: 'robots.txt fetch',
    };
    if (evidence.robots.blockedPaths?.length) {
      result.technicalIssues.push({
        action: 'Review robots.txt blocked paths',
        reason: `${evidence.robots.blockedPaths.length} paths are blocked from crawling`,
        evidence: 'robots.txt',
        priority: 'medium',
        effort: 'low',
        impact: 'Crawlability, Indexation',
      });
    }
  }
  counts.total++;

  // Sitemap
  if (evidence.sitemap && evidence.sitemap.exists) {
    counts.collected++;
    result.sitemap = {
      urlCount: evidence.sitemap.urlCount || null,
      sampleUrls: evidence.sitemap.sampleUrls || [],
      blogUrls: evidence.sitemap.blogUrls || [],
      productUrls: evidence.sitemap.productUrls || [],
      categoryUrls: evidence.sitemap.categoryUrls || [],
      source: 'sitemap.xml fetch',
    };
    if (!evidence.sitemap.urlCount || evidence.sitemap.urlCount === 0) {
      result.technicalIssues.push({
        action: 'Create or update sitemap.xml',
        reason: 'No URLs found in sitemap',
        evidence: 'sitemap.xml fetch',
        priority: 'high',
        effort: 'low',
        impact: 'Indexation, Crawl Efficiency',
      });
    }
  } else {
    result.technicalIssues.push({
      action: 'Create sitemap.xml',
      reason: 'No sitemap detected',
      evidence: 'sitemap.xml fetch',
      priority: 'high',
      effort: 'low',
      impact: 'Indexation, Crawl Efficiency',
    });
  }
  counts.total++;

  // Schema
  if (evidence.schemas && evidence.schemas.count > 0) {
    counts.collected++;
    result.schemas = {
      types: evidence.schemas.types || [],
      count: evidence.schemas.count,
      hasOrganization: evidence.schemas.hasOrganization || false,
      hasProduct: evidence.schemas.hasProduct || false,
      hasFAQPage: evidence.schemas.hasFAQPage || false,
      hasArticle: evidence.schemas.hasArticle || false,
      hasBreadcrumbList: evidence.schemas.hasBreadcrumbList || false,
      hasReview: evidence.schemas.hasReview || false,
      hasAggregateRating: evidence.schemas.hasAggregateRating || false,
      source: 'JSON-LD / Schema.org extraction',
    };

    if (!evidence.schemas.hasOrganization) {
      result.technicalIssues.push({
        action: 'Add Organization schema markup',
        reason: 'Organization schema not detected',
        evidence: 'Schema.org extraction',
        priority: 'medium',
        effort: 'low',
        impact: 'Rich Results, Knowledge Graph',
      });
    }
    if (!evidence.schemas.hasBreadcrumbList && evidence.schemas.count > 0) {
      result.technicalIssues.push({
        action: 'Add BreadcrumbList schema markup',
        reason: 'BreadcrumbList schema not detected',
        evidence: 'Schema.org extraction',
        priority: 'low',
        effort: 'low',
        impact: 'Rich Results, Navigation',
      });
    }
  } else {
    result.technicalIssues.push({
      action: 'Implement structured data markup',
      reason: 'No schema markup detected on the website',
      evidence: 'Schema.org extraction',
      priority: 'high',
      effort: 'medium',
      impact: 'Rich Results, SERP Features',
    });
  }
  counts.total++;

  // OpenGraph / meta
  if (evidence.openGraph) {
    result.openGraph = {
      ogTitle: evidence.openGraph.ogTitle || null,
      ogDescription: evidence.openGraph.ogDescription || null,
      ogImage: evidence.openGraph.ogImage || null,
      ogType: evidence.openGraph.ogType || null,
      twitterTitle: evidence.openGraph.twitterTitle || null,
      twitterDescription: evidence.openGraph.twitterDescription || null,
      canonicalUrl: evidence.openGraph.canonicalUrl || null,
      source: 'HTML meta tags extraction',
    };

    if (!evidence.openGraph.ogTitle) {
      result.technicalIssues.push({
        action: 'Add Open Graph title meta tag',
        reason: 'og:title not found',
        evidence: 'HTML meta tags',
        priority: 'medium',
        effort: 'low',
        impact: 'Social Sharing, Rich Previews',
      });
    }
    if (!evidence.openGraph.ogDescription) {
      result.technicalIssues.push({
        action: 'Add Open Graph description meta tag',
        reason: 'og:description not found',
        evidence: 'HTML meta tags',
        priority: 'medium',
        effort: 'low',
        impact: 'Social Sharing, Rich Previews',
      });
    }
  }
  counts.total++;

  // Website metadata from websiteEvidence
  if (evidence.website) {
    result.metadata = {
      title: evidence.website.title || null,
      metaDescription: evidence.website.metaDescription || null,
      heroText: evidence.website.heroText || null,
      ctaTexts: evidence.website.ctaTexts || [],
      featuresText: evidence.website.featuresText || [],
      hasPricingPage: evidence.website.pageTypes?.hasPricingPage || null,
      hasFaqSection: evidence.website.pageTypes?.hasFaqSection || null,
      hasBlog: evidence.website.pageTypes?.hasBlog || null,
      hasContactPage: evidence.website.pageTypes?.hasContactPage || null,
      hasAboutPage: evidence.website.pageTypes?.hasAboutPage || null,
      technologyHints: evidence.website.technologyHints || [],
    };

    if (!evidence.website.title) {
      result.technicalIssues.push({
        action: 'Add a descriptive title tag',
        reason: 'Title tag is missing or empty',
        evidence: 'HTML extraction',
        priority: 'critical',
        effort: 'low',
        impact: 'SEO Rankings, CTR',
      });
    }
    if (!evidence.website.metaDescription) {
      result.technicalIssues.push({
        action: 'Add a compelling meta description',
        reason: 'Meta description is missing or empty',
        evidence: 'HTML extraction',
        priority: 'high',
        effort: 'low',
        impact: 'CTR from Search Results',
      });
    }

    // Content opportunities from features and CTAs
    if (evidence.website.featuresText?.length) {
      result.contentOpportunities.push({
        opportunity: `Create content around website features: ${evidence.website.featuresText.slice(0, 3).join(', ')}`,
        source: 'Website Content',
        label: 'evidence-backed',
        priority: 'high',
      });
    }
    if (evidence.website.ctaTexts?.length) {
      result.contentOpportunities.push({
        opportunity: `Optimize landing pages for CTAs found: ${evidence.website.ctaTexts.slice(0, 3).join(', ')}`,
        source: 'Website Content',
        label: 'evidence-backed',
        priority: 'medium',
      });
    }
    if (!evidence.website.pageTypes?.hasBlog) {
      result.contentOpportunities.push({
        opportunity: 'Start a blog to target informational keywords and build topical authority',
        source: 'Sitemap/Crawl Analysis',
        label: 'evidence-backed',
        priority: 'high',
      });
    }
  }
  counts.total++;

  // Technology
  if (evidence.technology?.detected?.length) {
    result.metadata = result.metadata || {};
    result.metadata.technologies = evidence.technology.detected;
  }

  result.sourceSummary = {
    sourcesCollected: counts.collected,
    totalSources: counts.total,
    completenessScore: counts.total > 0
      ? Math.round((counts.collected / counts.total) * 100)
      : 0,
    note: 'Based on evidence collection — only real data from live website scan',
  };

  return result;
}

export function buildEvidenceContext(evidence) {
  if (!evidence) return "";

  const parts = [];

  if (evidence.website) {
    parts.push(`Website Title: ${evidence.website.title || "N/A"}`);
    parts.push(`Meta Description: ${evidence.website.metaDescription || "N/A"}`);
    if (evidence.website.heroText) parts.push(`Hero: ${evidence.website.heroText.slice(0, 300)}`);
    if (evidence.website.ctaTexts?.length) parts.push(`CTAs: ${evidence.website.ctaTexts.join(", ")}`);
    if (evidence.website.featuresText?.length) parts.push(`Features/Benefits: ${evidence.website.featuresText.slice(0, 5).join(" | ")}`);
  }

  if (evidence.openGraph) {
    if (evidence.openGraph.ogTitle) parts.push(`OG Title: ${evidence.openGraph.ogTitle}`);
    if (evidence.openGraph.ogDescription) parts.push(`OG Description: ${evidence.openGraph.ogDescription}`);
    if (evidence.openGraph.twitterTitle) parts.push(`Twitter Title: ${evidence.openGraph.twitterTitle}`);
  }

  if (evidence.schemas && evidence.schemas.count > 0) {
    parts.push(`Schema Types: ${evidence.schemas.types.join(", ")}`);
  }

  if (evidence.robots) {
    parts.push(`Robots: ${evidence.robots.exists ? "Found" : "Not found"}${evidence.robots.sitemapUrls?.length ? `, ${evidence.robots.sitemapUrls.length} sitemaps referenced` : ""}`);
  }

  if (evidence.sitemap && evidence.sitemap.exists) {
    parts.push(`Sitemap: ${evidence.sitemap.urlCount || 0} URLs${evidence.sitemap.blogUrls?.length ? `, ${evidence.sitemap.blogUrls.length} blog URLs` : ""}${evidence.sitemap.productUrls?.length ? `, ${evidence.sitemap.productUrls.length} product URLs` : ""}`);
  }

  if (evidence.pageSpeed) {
    parts.push(`PageSpeed: Performance=${evidence.pageSpeed.performance ?? "N/A"}%, Accessibility=${evidence.pageSpeed.accessibility ?? "N/A"}%, SEO=${evidence.pageSpeed.seo ?? "N/A"}%`);
    if (evidence.pageSpeed.lcp) parts.push(`LCP: ${(evidence.pageSpeed.lcp / 1000).toFixed(1)}s`);
    if (evidence.pageSpeed.cls != null) parts.push(`CLS: ${evidence.pageSpeed.cls.toFixed(2)}`);
  }

  if (evidence.github?.repos?.length) {
    for (const repo of evidence.github.repos) {
      parts.push(`GitHub: ${repo.fullName} (${repo.stars ?? "?"} stars, ${repo.forks ?? "?"} forks, ${repo.openIssues ?? "?"} issues)`);
    }
  }

  if (evidence.technology?.detected?.length) {
    parts.push(`Tech Stack: ${evidence.technology.detected.join(", ")}`);
  }

  return parts.join("\n");
}
