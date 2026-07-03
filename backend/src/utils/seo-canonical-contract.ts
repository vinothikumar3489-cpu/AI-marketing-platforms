/**
 * CANONICAL SEO DATA CONTRACT
 * 
 * All backend SEO output must follow this exact structure.
 * Every field must be populated with either:
 * 1. verified API data,
 * 2. estimated fallback data with source label,
 * 3. professional unavailable reason.
 * 
 * Never return blank objects.
 */

export interface CanonicalSEOIntelligence {
  // Website identity
  identity: {
    websiteUrl: string;
    domain: string;
    productName: string;
    companyName: string;
    industry: string;
    category: string;
    websiteTitle: string;
    websiteDescription: string;
  };

  // Technical SEO audit (from PageSpeed)
  technicalAudit: {
    overallScore: number;
    performanceScore: number;  // 0-100 from PageSpeed
    seoScore: number;          // 0-100 from PageSpeed
    accessibilityScore: number; // 0-100 from PageSpeed
    bestPracticesScore: number; // 0-100 from PageSpeed
    mobileScore: number;       // 0-100 from PageSpeed mobile
    desktopScore: number;      // 0-100 from PageSpeed desktop
    coreWebVitals: {
      fcp: number | null;
      lcp: number | null;
      cls: number | null;
      inp: number | null;
      ttfb: number | null;
    };
    criticalIssues: Array<{
      issue: string;
      severity: 'critical' | 'high' | 'medium' | 'low';
      affectedMetric: string;
      recommendation: string;
    }>;
    highIssues: Array<{
      issue: string;
      severity: 'high' | 'medium' | 'low';
      affectedMetric: string;
      recommendation: string;
    }>;
    recommendations: Array<{
      title: string;
      description: string;
      priority: 'critical' | 'high' | 'medium' | 'low';
    }>;
    pageSpeed: any; // Raw PageSpeed data
    auditData: any; // Additional audit data
    analyzedAt: string;
  };

  // Keyword intelligence (from DataForSEO priority)
  keywordIntelligence: {
    primaryKeywords: Array<{
      keyword: string;
      intent: 'informational' | 'commercial' | 'transactional' | 'navigational';
      searchVolume: number | null;
      keywordDifficulty: number | null;
      cpc: number | null;
      contentType: string;
      opportunityScore: number;
      source: string;
      confidence: number;
    }>;
    secondaryKeywords: Array<{
      keyword: string;
      intent: string;
      searchVolume: number | null;
      keywordDifficulty: number | null;
      cpc: number | null;
      contentType: string;
      opportunityScore: number;
      source: string;
      confidence: number;
    }>;
    longTailKeywords: Array<{
      keyword: string;
      intent: string;
      searchVolume: number | null;
      keywordDifficulty: number | null;
      cpc: number | null;
      contentType: string;
      opportunityScore: number;
      source: string;
      confidence: number;
    }>;
    clusters: Array<{
      topic: string;
      keywords: string[];
      totalVolume: number;
      avgDifficulty: number;
      priority: string;
    }>;
    metadata: {
      totalKeywords: number;
      clustersCount: number;
      analyzedAt: string;
      source: string;
    };
  };

  // Competitor intelligence (from DataForSEO SERP priority)
  competitorIntelligence: {
    directCompetitors: Array<{
      domain: string;
      name: string;
      domainAuthority: number | null;
      traffic: number | null;
      competitorType: 'direct' | 'serp' | 'emerging';
      source: string;
      confidence: number;
    }>;
    serpCompetitors: Array<{
      domain: string;
      name: string;
      rank: number;
      competitorType: 'serp';
      source: string;
      confidence: number;
    }>;
    directories: Array<{
      domain: string;
      name: string;
      competitorType: 'directory';
      source: string;
    }>;
    estimatedCompetitors: Array<{
      domain: string;
      name: string;
      competitorType: 'estimated';
      source: string;
      confidence: number;
    }>;
    keywordGaps: {
      missingKeywords: Array<{
        keyword: string;
        competitorCount: number;
        difficulty: number;
        opportunity: string;
      }>;
    };
    authorityGaps: {
      targetAuthority: number | null;
      competitorAverage: number | null;
      gap: number | null;
    };
    contentGaps: Array<{
      topic: string;
      competitorCount: number;
      priority: string;
    }>;
    recommendations: Array<{
      title: string;
      description: string;
      priority: string;
    }>;
    sourcesUsed: string[];
  };

  // Content gap analysis (from clean keywords + competitor pages)
  contentGapAnalysis: {
    contentGaps: Array<{
      title: string;
      targetKeyword: string;
      pageType: 'landing_page' | 'comparison' | 'service' | 'faq' | 'resource' | 'geo';
      intent: string;
      priority: 'critical' | 'high' | 'medium' | 'low';
      evidence: string;
      recommendedSections: string[];
      source: string;
      confidence: number;
    }>;
    landingPageIdeas: Array<any>;
    comparisonPageIdeas: Array<any>;
    faqOpportunities: Array<any>;
    geoContentIdeas: Array<any>;
    resourcePageIdeas: Array<any>;
    contentCalendar: {
      month1: Array<any>;
      month2: Array<any>;
      month3: Array<any>;
    };
    summary: {
      totalGaps: number;
      criticalGaps: number;
      highPriorityGaps: number;
    };
  };

  // Blog intelligence (from clean keywords + content gaps)
  blogIntelligence: {
    blogIdeas: Array<{
      title: string;
      targetKeyword: string;
      intent: string;
      outline: string[];
      source: string;
      confidence: number;
      estimatedImpact: string;
      searchVolume: number | null;
      keywordDifficulty: number | null;
    }>;
    blogClusters: Array<{
      topic: string;
      blogIdeas: Array<any>;
      totalVolume: number;
      avgDifficulty: number;
    }>;
    blogBriefs: Array<{
      title: string;
      targetKeyword: string;
      searchVolume: number | null;
      keywordDifficulty: number | null;
      intent: string;
      outline: string[];
      estimatedTrafficPotential: string;
      source: string;
      confidence: number;
    }>;
    publishingCalendar: {
      week1: Array<any>;
      week2: Array<any>;
      week3: Array<any>;
      week4: Array<any>;
    };
    summary: {
      totalIdeas: number;
      totalClusters: number;
      highPriorityIdeas: number;
    };
  };

  // GEO intelligence (AI search visibility)
  geoIntelligence: {
    aiVisibilityScore: number | null;
    citationReadinessScore: number | null;
    answerabilityScore: number | null;
    geoKeywords: Array<{
      keyword: string;
      intent: string;
      opportunity: string;
    }>;
    aiContentOpportunities: Array<{
      topic: string;
      opportunity: string;
      priority: string;
    }>;
    metadata: {
      analyzedAt: string;
      source: string;
    };
  };

  // Executive dashboard (calculated from all modules)
  executiveDashboard: {
    executiveOverview: {
      overallSeoScore: {
        value: number | null;
        source: string;
        calculationMethod: string;
        inputsUsed: string[];
        confidence: number;
        evidence: string;
      };
      technicalHealth: {
        value: number | null;
        source: string;
        calculationMethod: string;
        inputsUsed: string[];
        confidence: number;
        evidence: string;
      };
      contentAuthority: {
        value: number | null;
        source: string;
        calculationMethod: string;
        inputsUsed: string[];
        confidence: number;
        evidence: string;
      };
      aiVisibility: {
        value: number | null;
        source: string;
        calculationMethod: string;
        inputsUsed: string[];
        confidence: number;
        evidence: string;
      };
      opportunityScore: {
        value: number | null;
        source: string;
        calculationMethod: string;
        inputsUsed: string[];
        confidence: number;
        evidence: string;
      };
      riskScore: {
        value: number | null;
        source: string;
        calculationMethod: string;
        inputsUsed: string[];
        confidence: number;
        evidence: string;
      };
      dataCompleteness: {
        technical: boolean;
        keyword: boolean;
        geo: boolean;
        competitor: boolean;
        content: boolean;
      };
      dataCompletenessPercentage: number;
    };
    seoHealthSummary: {
      categories: Array<{
        name: string;
        score: number | null;
        source: string;
        status: string;
        criticalIssues: number;
      }>;
      strengths: Array<{
        category: string;
        score: number;
        source: string;
        reason: string;
      }>;
      weaknesses: Array<{
        category: string;
        score: number;
        source: string;
        reason: string;
        priority: string;
      }>;
      topIssues: Array<{
        category: string;
        issue: string;
        severity: string;
        impact: string;
        source: string;
      }>;
      hasSufficientData: boolean;
    };
    keyOpportunities: Array<{
      title: string;
      impact: string;
      effort: string;
      priority: string;
      recommendation: string;
      category: string;
      source: string;
      evidence: string;
    }>;
    competitorSnapshot: {
      totalCompetitors: number;
      directCompetitors: number;
      serpCompetitors: number;
      averageAuthority: number | null;
      topCompetitors: Array<{
        domain: string;
        name: string;
        authority: number | null;
      }>;
    };
    aiSearchVisibility: {
      overallScore: number | null;
      citationReadiness: number | null;
      answerability: number | null;
      topOpportunities: Array<{
        topic: string;
        opportunity: string;
        priority: string;
      }>;
    };
    contentStrategySummary: {
      totalGaps: number;
      criticalGaps: number;
      highPriorityGaps: number;
      topGaps: Array<{
        title: string;
        targetKeyword: string;
        priority: string;
      }>;
    };
    executiveActionPlan: {
      day7: Array<{
        title: string;
        why: string;
        owner: string;
        dependencies: string[];
        estimatedEffort: number;
        seoImpact: string;
        businessImpact: string;
        confidence: number;
        source: string;
        completionCriteria: string;
      }>;
      day30: Array<any>;
      day60: Array<any>;
      day90: Array<any>;
      summary: {
        totalActions: number;
        criticalActions: number;
        dataSourcesUsed: string[];
      };
    };
    roiForecast: {
      estimatedTrafficIncrease: number | null;
      estimatedRevenueImpact: number | null;
      timeframe: string;
      assumptions: string[];
    };
    metadata: {
      generatedAt: string;
      dataCompleteness: any;
      executiveStory: any;
    };
  };

  // Executive story (AI-generated summary)
  executiveStory: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    priority: string;
  } | null;

  // Action plan (canonical structure)
  actionPlan: {
    immediate: Array<any>;
    day7: Array<any>;
    day30: Array<any>;
    day60: Array<any>;
    day90: Array<any>;
    summary: any;
  } | null;

  // Score breakdown (for frontend display)
  scoreBreakdown: {
    overallScore: number;
    performanceScore: number;
    seoScore: number;
    accessibilityScore: number;
    bestPracticesScore: number;
    mobileScore: number;
    desktopScore: number;
  };
}
