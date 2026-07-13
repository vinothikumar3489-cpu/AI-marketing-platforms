import { prisma } from '../../config/prisma.js';

// ============================================
// EXECUTIVE SEO DASHBOARD ENGINE
// ============================================

/**
 * Generate comprehensive executive dashboard
 * @param {Object} params - { seoIntelligenceId, chatId }
 * @returns {Object} - Complete executive dashboard data
 */
export async function generateExecutiveDashboard({ seoIntelligenceId, chatId }) {
  console.log('📊 [Executive Dashboard] Starting dashboard generation...');

  try {
    // Fetch all SEO intelligence data
    const seoData = await prisma.seoIntelligence.findUnique({
      where: { id: seoIntelligenceId },
      include: {
        technicalAuditDetail: true,
        scoreBreakdown: true,
        keywordIntelligence: true,
        geoIntelligence: true,
        competitorSeoRecord: true,
        contentGapRecord: true,
        blogIntelligenceRecord: true
      }
    });

    if (!seoData) {
      throw new Error('SEO Intelligence data not found');
    }

    // Step 1: Generate executive overview scores
    console.log('📈 [Executive Dashboard] Step 1: Calculating overview scores...');
    const executiveOverview = generateExecutiveOverview(seoData);

    // Step 2: Generate SEO health summary
    console.log('🏥 [Executive Dashboard] Step 2: Analyzing SEO health...');
    const seoHealthSummary = generateSeoHealthSummary(seoData);

    // Step 3: Identify key opportunities
    console.log('💡 [Executive Dashboard] Step 3: Identifying opportunities...');
    const keyOpportunities = generateKeyOpportunities(seoData);


    // Step 4: Create competitor snapshot
    console.log('🎯 [Executive Dashboard] Step 4: Creating competitor snapshot...');
    const competitorSnapshot = generateCompetitorSnapshot(seoData);

    // Step 5: Calculate AI search visibility
    console.log('🤖 [Executive Dashboard] Step 5: Calculating AI visibility...');
    const aiSearchVisibility = generateAiSearchVisibility(seoData);

    // Step 6: Create content strategy summary
    console.log('📝 [Executive Dashboard] Step 6: Summarizing content strategy...');
    const contentStrategySummary = generateContentStrategySummary(seoData);

    // Step 7: Generate executive action plan
    console.log('📋 [Executive Dashboard] Step 7: Creating action plan...');
    const executiveActionPlan = generateExecutiveActionPlan(seoData);

    // Step 8: Assess measurement readiness
    console.log('📊 [Executive Dashboard] Step 8: Assessing measurement readiness...');
    const measurementReadiness = generateMeasurementReadiness(seoData);

    // Compile dashboard
    const dashboard = {
      executiveOverview,
      seoHealthSummary,
      keyOpportunities,
      competitorSnapshot,
      aiSearchVisibility,
      contentStrategySummary,
      executiveActionPlan,
      measurementReadiness,
      metadata: {
        generatedAt: new Date().toISOString(),
        dataCompleteness: calculateDataCompleteness(seoData)
      }
    };

    console.log('✅ [Executive Dashboard] Dashboard generation complete');
    return dashboard;

  } catch (error) {
    console.error('❌ [Executive Dashboard] Error:', error);
    throw error;
  }
}

// ============================================
// EXECUTIVE OVERVIEW
// ============================================

function generateExecutiveOverview(seoData) {
  console.log('📊 [Overview] Calculating executive scores from verified data...');

  const scoreBreakdown = seoData.scoreBreakdown || {};
  const keywordIntelligence = seoData.keywordIntelligence || {};
  const geoIntelligence = seoData.geoIntelligence || {};
  const competitorRecord = seoData.competitorSeoRecord || {};
  const contentGapRecord = seoData.contentGapRecord || {};
  const blogIntelligenceRecord = seoData.blogIntelligenceRecord || {};
  const technicalAudit = seoData.technicalAuditDetail || {};

  // Check if we have sufficient data
  const hasTechnicalData = scoreBreakdown.overallScore !== undefined && scoreBreakdown.overallScore !== null;
  const hasKeywordData = keywordIntelligence.primaryKeywords && keywordIntelligence.primaryKeywords.length > 0;
  const hasGeoData = geoIntelligence.aiVisibilityScore !== undefined && geoIntelligence.aiVisibilityScore !== null;
  const hasCompetitorData = competitorRecord.competitorProfiles && competitorRecord.competitorProfiles.length > 0;
  const hasContentData = contentGapRecord.contentGaps && contentGapRecord.contentGaps.length > 0;

  const dataCompleteness = {
    technical: hasTechnicalData,
    keyword: hasKeywordData,
    geo: hasGeoData,
    competitor: hasCompetitorData,
    content: hasContentData
  };

  const hasSufficientData = Object.values(dataCompleteness).filter(Boolean).length >= 2;

  if (!hasSufficientData) {
    return {
      overallSeoScore: { value: null, source: 'Unavailable', calculationMethod: 'Insufficient data', inputsUsed: [], confidence: 0, evidence: 'Not enough verified data to calculate score' },
      technicalHealth: { value: null, source: 'Unavailable', calculationMethod: 'Insufficient data', inputsUsed: [], confidence: 0, evidence: 'Technical audit data unavailable' },
      contentAuthority: { value: null, source: 'Unavailable', calculationMethod: 'Insufficient data', inputsUsed: [], confidence: 0, evidence: 'Content data unavailable' },
      aiVisibility: { value: null, source: 'Unavailable', calculationMethod: 'Insufficient data', inputsUsed: [], confidence: 0, evidence: 'GEO data unavailable' },
      opportunityScore: { value: null, source: 'Unavailable', calculationMethod: 'Insufficient data', inputsUsed: [], confidence: 0, evidence: 'Keyword/competitor data unavailable' },
      riskScore: { value: null, source: 'Unavailable', calculationMethod: 'Insufficient data', inputsUsed: [], confidence: 0, evidence: 'Risk data unavailable' },
      dataCompleteness,
      message: 'Insufficient verified data to calculate executive scores'
    };
  }

  // Overall SEO Score - from technical audit
  const overallSeoScore = {
    value: hasTechnicalData ? Math.round(scoreBreakdown.overallScore) : null,
    source: 'Technical SEO Audit',
    calculationMethod: 'Weighted average of technical SEO factors',
    inputsUsed: hasTechnicalData ? ['onPageScore', 'performanceScore', 'mobileScore', 'securityScore'] : [],
    confidence: hasTechnicalData ? 85 : 0,
    evidence: hasTechnicalData ? `Based on ${Object.keys(scoreBreakdown).length} technical SEO factors` : 'Technical audit data unavailable'
  };

  // Technical Health - from technical audit
  const technicalHealth = {
    value: hasTechnicalData ? Math.round((scoreBreakdown.onPageScore || 0 + scoreBreakdown.performanceScore || 0) / 2) : null,
    source: 'Technical SEO Audit',
    calculationMethod: 'Average of on-page and performance scores',
    inputsUsed: hasTechnicalData ? ['onPageScore', 'performanceScore'] : [],
    confidence: hasTechnicalData ? 90 : 0,
    evidence: hasTechnicalData ? `On-page: ${scoreBreakdown.onPageScore}, Performance: ${scoreBreakdown.performanceScore}` : 'Technical audit data unavailable'
  };

  // Content Authority - from content gaps and blog intelligence
  const contentGapsCount = hasContentData ? contentGapRecord.contentGaps.length : 0;
  const blogIdeasCount = blogIntelligenceRecord.blogIdeas ? blogIntelligenceRecord.blogIdeas.length : 0;
  const contentAuthority = {
    value: hasContentData ? Math.max(0, Math.min(100, 100 - (contentGapsCount * 5) + (blogIdeasCount * 2))) : null,
    source: 'Content Gap + Blog Intelligence',
    calculationMethod: 'Base 100 minus gaps penalty plus blog ideas bonus',
    inputsUsed: hasContentData ? ['contentGaps', 'blogIdeas'] : [],
    confidence: hasContentData ? 75 : 0,
    evidence: hasContentData ? `${contentGapsCount} content gaps, ${blogIdeasCount} blog ideas available` : 'Content data unavailable'
  };

  // AI Visibility - from GEO intelligence
  const aiVisibility = {
    value: hasGeoData ? Math.round(geoIntelligence.aiVisibilityScore) : null,
    source: 'GEO Intelligence',
    calculationMethod: 'AI search visibility score from entity analysis',
    inputsUsed: hasGeoData ? ['aiVisibilityScore', 'citationReadinessScore', 'answerabilityScore'] : [],
    confidence: hasGeoData ? 80 : 0,
    evidence: hasGeoData ? `AI visibility: ${geoIntelligence.aiVisibilityScore}, Citation readiness: ${geoIntelligence.citationReadinessScore}` : 'GEO data unavailable'
  };

  // Opportunity Score - from keyword and competitor data
  const keywordCount = hasKeywordData ? keywordIntelligence.primaryKeywords.length : 0;
  const highOpportunityKeywords = hasKeywordData ? keywordIntelligence.primaryKeywords.filter(k => k.opportunity === 'high').length : 0;
  const opportunityScore = {
    value: hasKeywordData ? Math.min(100, Math.round((highOpportunityKeywords / Math.max(1, keywordCount)) * 100)) : null,
    source: 'Keyword Intelligence',
    calculationMethod: 'Percentage of high-opportunity keywords',
    inputsUsed: hasKeywordData ? ['primaryKeywords', 'opportunityScore'] : [],
    confidence: hasKeywordData ? 85 : 0,
    evidence: hasKeywordData ? `${highOpportunityKeywords}/${keywordCount} high-opportunity keywords` : 'Keyword data unavailable'
  };

  // Risk Score - from technical issues and competitor threats
  const technicalIssues = technicalAudit.criticalIssues ? technicalAudit.criticalIssues.length : 0;
  const competitorThreats = hasCompetitorData ? competitorRecord.competitorProfiles.length : 0;
  const riskScore = {
    value: (hasTechnicalData || hasCompetitorData) ? Math.min(100, Math.round((technicalIssues * 10) + (competitorThreats * 5))) : null,
    source: 'Technical Audit + Competitor Intelligence',
    calculationMethod: 'Technical issues penalty plus competitor threat penalty',
    inputsUsed: (hasTechnicalData || hasCompetitorData) ? ['criticalIssues', 'competitorProfiles'] : [],
    confidence: (hasTechnicalData || hasCompetitorData) ? 70 : 0,
    evidence: (hasTechnicalData || hasCompetitorData) ? `${technicalIssues} critical technical issues, ${competitorThreats} competitor threats` : 'Risk data unavailable'
  };

  // Priority Actions - derived from all data sources
  const priorityActions = [];
  if (technicalIssues > 0) {
    priorityActions.push({
      action: 'Fix critical technical SEO issues',
      priority: 'critical',
      source: 'Technical Audit',
      evidence: `${technicalIssues} critical issues found`
    });
  }
  if (hasKeywordData && highOpportunityKeywords > 0) {
    priorityActions.push({
      action: 'Target high-opportunity keywords',
      priority: 'high',
      source: 'Keyword Intelligence',
      evidence: `${highOpportunityKeywords} high-opportunity keywords available`
    });
  }
  if (hasContentData && contentGapsCount > 0) {
    priorityActions.push({
      action: 'Address content gaps',
      priority: 'high',
      source: 'Content Gap Analysis',
      evidence: `${contentGapsCount} content gaps identified`
    });
  }
  if (hasGeoData && geoIntelligence.aiVisibilityScore < 70) {
    priorityActions.push({
      action: 'Improve AI search visibility',
      priority: 'medium',
      source: 'GEO Intelligence',
      evidence: `AI visibility score: ${geoIntelligence.aiVisibilityScore}`
    });
  }

  return {
    overallSeoScore,
    technicalHealth,
    contentAuthority,
    aiVisibility,
    opportunityScore,
    riskScore,
    priorityActions: priorityActions.slice(0, 5),
    dataCompleteness
  };
}

// ============================================
// SEO HEALTH SUMMARY
// ============================================

function generateSeoHealthSummary(seoData) {
  console.log('🏥 [Health] Analyzing SEO health from verified data...');

  const scoreBreakdown = seoData.scoreBreakdown || {};
  const technicalAudit = seoData.technicalAuditDetail || {};
  const geoIntelligence = seoData.geoIntelligence || {};
  const keywordIntelligence = seoData.keywordIntelligence || {};
  const competitorRecord = seoData.competitorSeoRecord || {};

  const hasTechnicalData = scoreBreakdown.overallScore !== undefined && scoreBreakdown.overallScore !== null;
  const hasGeoData = geoIntelligence.aiVisibilityScore !== undefined && geoIntelligence.aiVisibilityScore !== null;
  const hasKeywordData = keywordIntelligence.primaryKeywords && keywordIntelligence.primaryKeywords.length > 0;

  const categories = {
    technicalSeo: {
      score: hasTechnicalData ? (scoreBreakdown.technicalScore || technicalAudit.overallScore || scoreBreakdown.overallScore || 0) : null,
      source: hasTechnicalData ? 'Technical SEO Audit' : 'Unavailable',
      status: '',
      topIssues: []
    },
    onPageSeo: {
      score: hasTechnicalData ? (scoreBreakdown.onPageScore || 0) : null,
      source: hasTechnicalData ? 'Technical SEO Audit' : 'Unavailable',
      status: '',
      topIssues: []
    },
    contentSeo: {
      score: hasTechnicalData ? (scoreBreakdown.contentScore || 0) : null,
      source: hasTechnicalData ? 'Technical SEO Audit' : 'Unavailable',
      status: '',
      topIssues: []
    },
    authoritySeo: {
      score: scoreBreakdown.authorityScore !== undefined ? scoreBreakdown.authorityScore : null,
      source: scoreBreakdown.authorityScore !== undefined ? 'Technical SEO Audit' : 'Unavailable',
      status: '',
      topIssues: []
    },
    aiVisibility: {
      score: hasGeoData ? (geoIntelligence.aiVisibilityScore || 0) : null,
      source: hasGeoData ? 'GEO Intelligence' : 'Unavailable',
      status: '',
      topIssues: []
    },
    keywordOpportunity: {
      score: hasKeywordData ? Math.min(100, Math.round((keywordIntelligence.primaryKeywords.filter(k => k.opportunity === 'high').length / keywordIntelligence.primaryKeywords.length) * 100)) : null,
      source: hasKeywordData ? 'Keyword Intelligence' : 'Unavailable',
      status: '',
      topIssues: []
    }
  };

  // Set status for each category
  Object.keys(categories).forEach(key => {
    const cat = categories[key];
    if (cat.score === null) {
      cat.status = 'unavailable';
    } else if (cat.score >= 80) {
      cat.status = 'excellent';
    } else if (cat.score >= 60) {
      cat.status = 'good';
    } else if (cat.score >= 40) {
      cat.status = 'needs_improvement';
    } else {
      cat.status = 'critical';
    }
  });

  // Extract top issues from technical audit
  if (hasTechnicalData && technicalAudit.criticalIssues) {
    categories.technicalSeo.topIssues = technicalAudit.criticalIssues.slice(0, 3).map(issue => ({
      issue: issue.issue || issue.title || issue,
      severity: 'critical',
      source: 'Technical Audit'
    }));
  }

  // Identify strengths and weaknesses
  const strengths = [];
  const weaknesses = [];
  const topIssues = [];

  Object.entries(categories).forEach(([name, data]) => {
    if (data.score !== null && data.score >= 70) {
      strengths.push({
        category: formatCategoryName(name),
        score: data.score,
        source: data.source,
        status: 'strength'
      });
    } else if (data.score !== null && data.score < 50) {
      weaknesses.push({
        category: formatCategoryName(name),
        score: data.score,
        source: data.source,
        status: 'weakness',
        priority: data.score < 30 ? 'critical' : 'high'
      });
    }
  });

  // Collect top issues
  if (hasTechnicalData && technicalAudit.criticalIssues) {
    technicalAudit.criticalIssues.slice(0, 5).forEach(issue => {
      topIssues.push({
        category: 'Technical SEO',
        issue: issue.issue || issue.title || issue,
        severity: 'critical',
        impact: 'high',
        source: 'Technical Audit'
      });
    });
  }

  if (hasGeoData && geoIntelligence.aiVisibilityScore < 50) {
    topIssues.push({
      category: 'AI Visibility',
      issue: 'Low AI search visibility',
      severity: 'high',
      impact: 'medium',
      source: 'GEO Intelligence'
    });
  }

  return {
    categories,
    strengths,
    weaknesses,
    topIssues,
    hasSufficientData: hasTechnicalData || hasGeoData || hasKeywordData
  };
}

function formatCategoryName(name) {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

// ============================================
// KEY OPPORTUNITIES
// ============================================

function generateKeyOpportunities(seoData) {
  console.log('💡 [Opportunities] Identifying key opportunities from verified data...');

  const opportunities = [];
  const keywordIntelligence = seoData.keywordIntelligence || {};
  const geoIntelligence = seoData.geoIntelligence || {};
  const contentGapRecord = seoData.contentGapRecord || {};
  const blogIntelligenceRecord = seoData.blogIntelligenceRecord || {};

  const hasKeywordData = keywordIntelligence.primaryKeywords && keywordIntelligence.primaryKeywords.length > 0;
  const hasGeoData = geoIntelligence.aiContentOpportunities && geoIntelligence.aiContentOpportunities.length > 0;
  const hasContentData = contentGapRecord.contentGaps && contentGapRecord.contentGaps.length > 0;
  const hasBlogData = blogIntelligenceRecord.blogIdeas && blogIntelligenceRecord.blogIdeas.length > 0;

  // From keyword intelligence
  if (hasKeywordData) {
    const highOpportunityKeywords = keywordIntelligence.primaryKeywords
      .filter(k => k.opportunity === 'high' || k.searchVolume > 500)
      .slice(0, 5);
    
    highOpportunityKeywords.forEach(kw => {
      opportunities.push({
        title: `Target keyword: ${kw.keyword}`,
        impact: kw.searchVolume > 1000 ? 'high' : 'medium',
        effort: kw.difficulty < 50 ? 'low' : kw.difficulty < 70 ? 'medium' : 'high',
        priority: kw.searchVolume > 1000 && kw.difficulty < 50 ? 'high' : 'medium',
        recommendation: `Create content targeting ${kw.keyword} (${kw.searchVolume} monthly searches)`,
        category: 'keyword',
        source: 'Keyword Intelligence',
        evidence: `Volume: ${kw.searchVolume}, Difficulty: ${kw.difficulty}`
      });
    });
  }

  // From GEO intelligence
  if (hasGeoData) {
    geoIntelligence.aiContentOpportunities
      .filter(opp => opp.impact === 'high' || opp.priority >= 7)
      .slice(0, 3)
      .forEach(opp => {
        opportunities.push({
          title: opp.opportunity || opp.type,
          impact: opp.impact === 'high' ? 'high' : 'medium',
          effort: 'medium',
          priority: opp.priority >= 8 ? 'high' : 'medium',
          recommendation: opp.reason || 'Optimize for AI search visibility',
          category: 'ai_search',
          source: 'GEO Intelligence',
          evidence: `Priority: ${opp.priority}, Impact: ${opp.impact}`
        });
      });
  }

  // From content gaps
  if (hasContentData) {
    contentGapRecord.contentGaps
      .filter(g => g.priority === 'critical' || g.priority === 'high')
      .slice(0, 4)
      .forEach(gap => {
        opportunities.push({
          title: gap.title || gap.pageTitle,
          impact: gap.businessImpact === 'high' || gap.priority === 'critical' ? 'high' : 'medium',
          effort: 'medium',
          priority: gap.priority,
          recommendation: `Create missing ${gap.pageType || 'content'} page`,
          category: 'content',
          source: 'Content Gap Analysis',
          evidence: gap.evidence || `Keyword: ${gap.targetKeyword}`
        });
      });
  }

  // From blog intelligence
  if (hasBlogData) {
    blogIntelligenceRecord.blogIdeas
      .filter(b => b.confidence > 70 && b.searchVolume > 100)
      .slice(0, 3)
      .forEach(idea => {
        opportunities.push({
          title: `Blog: ${idea.title}`,
          impact: idea.searchVolume > 500 ? 'high' : 'medium',
          effort: 'medium',
          priority: idea.confidence > 85 ? 'high' : 'medium',
          recommendation: `Write blog post targeting ${idea.targetKeyword}`,
          category: 'content',
          source: 'Blog Intelligence',
          evidence: `Volume: ${idea.searchVolume}, Confidence: ${idea.confidence}%`
        });
      });
  }

  // Sort by priority and impact
  opportunities.sort((a, b) => {
    const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
    const impactWeight = { high: 3, medium: 2, low: 1 };
    
    const scoreA = (priorityWeight[a.priority] || 2) * 10 + (impactWeight[a.impact] || 2);
    const scoreB = (priorityWeight[b.priority] || 2) * 10 + (impactWeight[b.impact] || 2);
    
    return scoreB - scoreA;
  });

  return opportunities.slice(0, 10);
}

// ============================================
// COMPETITOR SNAPSHOT
// ============================================

function generateCompetitorSnapshot(seoData) {
  console.log('🎯 [Competitors] Creating competitor snapshot from verified data...');

  const competitorRecord = seoData.competitorSeoRecord || {};
  const competitorProfiles = competitorRecord.competitorProfiles || [];

  if (!competitorProfiles || competitorProfiles.length === 0) {
    return {
      topCompetitors: [],
      hasSufficientData: false,
      message: 'No competitor data available'
    };
  }

  const topCompetitors = competitorProfiles
    .slice(0, 5)
    .map(comp => ({
      name: comp.name || comp.domain,
      website: comp.website || comp.domain,
      threatScore: comp.overallThreatScore || 50,
      marketPosition: determineMarketPosition(comp.overallThreatScore),
      keywordGapScore: comp.keywordStrength || 50,
      authorityGapScore: comp.authorityStrength || 50,
      weaknessToExploit: comp.weaknessToExploit || 'Not identified',
      recommendedStrategy: comp.recommendedStrategy || 'Monitor and analyze',
      source: 'Competitor Intelligence'
    }));

  return {
    topCompetitors,
    hasSufficientData: true
  };
}

function determineMarketPosition(threatScore) {
  if (threatScore >= 80) return 'Dominant';
  if (threatScore >= 60) return 'Strong';
  if (threatScore >= 40) return 'Moderate';
  return 'Weak';
}

// ============================================
// AI SEARCH VISIBILITY
// ============================================

function generateAiSearchVisibility(seoData) {
  console.log('🤖 [AI Visibility] Calculating AI search scores from verified data...');

  const geoIntelligence = seoData.geoIntelligence || {};
  const hasGeoData = geoIntelligence.aiVisibilityScore !== undefined && geoIntelligence.aiVisibilityScore !== null;

  if (!hasGeoData) {
    return {
      platformScores: {
        chatGptScore: null,
        geminiScore: null,
        claudeScore: null,
        perplexityScore: null,
        googleAiOverviewScore: null
      },
      componentScores: {
        entityCoverageScore: null,
        knowledgeGraphReadinessScore: null,
        citationReadinessScore: null,
        answerabilityScore: null,
        topicalAuthorityScore: null
      },
      overallAiVisibility: null,
      platformRecommendations: [],
      componentRecommendations: [],
      hasSufficientData: false,
      message: 'GEO data unavailable'
    };
  }

  const platformScores = {
    chatGptScore: geoIntelligence.chatGptScore || null,
    geminiScore: geoIntelligence.geminiScore || null,
    claudeScore: geoIntelligence.claudeScore || null,
    perplexityScore: geoIntelligence.perplexityScore || null,
    googleAiOverviewScore: geoIntelligence.googleAiOverviewScore || null
  };

  const componentScores = {
    entityCoverageScore: geoIntelligence.entityCoverageScore || null,
    knowledgeGraphReadinessScore: geoIntelligence.knowledgeGraphReadinessScore || null,
    citationReadinessScore: geoIntelligence.citationReadinessScore || null,
    answerabilityScore: geoIntelligence.answerabilityScore || null,
    topicalAuthorityScore: geoIntelligence.topicalAuthorityScore || null
  };

  // Generate platform-specific recommendations
  const platformRecommendations = [];
  
  Object.entries(platformScores).forEach(([platform, score]) => {
    if (score !== null && score < 60) {
      platformRecommendations.push({
        platform: formatPlatformName(platform),
        score,
        priority: score < 40 ? 'high' : 'medium',
        recommendation: `Improve ${formatPlatformName(platform)} visibility through ${getImprovementStrategy(platform, score)}`,
        source: 'GEO Intelligence'
      });
    }
  });

  // Generate component recommendations
  const componentRecommendations = [];
  
  if (componentScores.entityCoverageScore !== null && componentScores.entityCoverageScore < 70) {
    componentRecommendations.push({
      component: 'Entity Coverage',
      recommendation: 'Add more structured data and entity markup to improve AI understanding',
      priority: 'high',
      impact: 'high',
      source: 'GEO Intelligence'
    });
  }

  if (componentScores.citationReadinessScore !== null && componentScores.citationReadinessScore < 70) {
    componentRecommendations.push({
      component: 'Citation Readiness',
      recommendation: 'Improve content citations and authoritative references',
      priority: 'high',
      impact: 'medium',
      source: 'GEO Intelligence'
    });
  }

  if (componentScores.answerabilityScore !== null && componentScores.answerabilityScore < 70) {
    componentRecommendations.push({
      component: 'Answerability',
      recommendation: 'Structure content to directly answer common questions',
      priority: 'medium',
      impact: 'high',
      source: 'GEO Intelligence'
    });
  }

  return {
    platformScores,
    componentScores,
    overallAiVisibility: geoIntelligence.aiVisibilityScore,
    platformRecommendations: platformRecommendations.slice(0, 5),
    componentRecommendations: componentRecommendations.slice(0, 5),
    hasSufficientData: true
  };
}

function formatPlatformName(platform) {
  return platform
    .replace('Score', '')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function getImprovementStrategy(platform, score) {
  if (platform.includes('chatGpt')) return 'conversational Q&A content and clear definitions';
  if (platform.includes('gemini')) return 'structured data and comprehensive guides';
  if (platform.includes('claude')) return 'detailed explanations and context-rich content';
  if (platform.includes('perplexity')) return 'citation-worthy content and authoritative sources';
  if (platform.includes('google')) return 'featured snippet optimization and FAQ schema';
  return 'comprehensive content and structured markup';
}

// ============================================
// CONTENT STRATEGY SUMMARY
// ============================================

function generateContentStrategySummary(seoData) {
  console.log('📝 [Content] Summarizing content strategy from verified data...');

  const contentGapRecord = seoData.contentGapRecord || {};
  const blogIntelligenceRecord = seoData.blogIntelligenceRecord || {};

  const hasContentData = contentGapRecord.contentGaps && contentGapRecord.contentGaps.length > 0;
  const hasBlogData = blogIntelligenceRecord.blogIdeas && blogIntelligenceRecord.blogIdeas.length > 0;

  if (!hasContentData && !hasBlogData) {
    return {
      missingPages: { total: 0, critical: 0, high: 0, list: [] },
      blogOpportunities: { total: 0, highPriority: 0, list: [] },
      faqOpportunities: { total: 0, highValue: 0, list: [] },
      highPriorityContent: [],
      contentCalendarSummary: { day30: 0, day60: 0, day90: 0, totalScheduled: 0 },
      hasSufficientData: false,
      message: 'Content data unavailable'
    };
  }

  // Missing pages summary
  const missingPages = hasContentData ? contentGapRecord.contentGaps : [];
  const criticalPages = missingPages.filter(p => p.priority === 'critical');
  const highPriorityPages = missingPages.filter(p => p.priority === 'high');

  // Blog opportunities
  const blogIdeas = hasBlogData ? blogIntelligenceRecord.blogIdeas : [];
  const highPriorityBlogs = blogIdeas.filter(b => b.priority === 'high' || b.confidence > 80);

  // High priority content
  const highPriorityContent = [
    ...criticalPages.map(p => ({ ...p, type: 'page', category: 'critical_page', source: 'Content Gap Analysis' })),
    ...highPriorityPages.slice(0, 3).map(p => ({ ...p, type: 'page', category: 'high_priority_page', source: 'Content Gap Analysis' })),
    ...highPriorityBlogs.slice(0, 3).map(b => ({ ...b, type: 'blog', category: 'high_priority_blog', source: 'Blog Intelligence' }))
  ];

  // Content calendar summary
  const contentCalendar = contentGapRecord.contentCalendar || {};
  const calendarSummary = {
    day30: (contentCalendar.day30 || []).length,
    day60: (contentCalendar.day60 || []).length,
    day90: (contentCalendar.day90 || []).length,
    totalScheduled: (contentCalendar.day30 || []).length + (contentCalendar.day60 || []).length + (contentCalendar.day90 || []).length
  };

  return {
    missingPages: {
      total: missingPages.length,
      critical: criticalPages.length,
      high: highPriorityPages.length,
      list: [...criticalPages, ...highPriorityPages].slice(0, 5).map(p => ({
        title: p.title || p.pageTitle,
        priority: p.priority,
        opportunityScore: p.opportunityScore,
        source: 'Content Gap Analysis'
      }))
    },
    blogOpportunities: {
      total: blogIdeas.length,
      highPriority: highPriorityBlogs.length,
      list: highPriorityBlogs.slice(0, 5).map(b => ({
        title: b.title,
        targetKeyword: b.targetKeyword,
        estimatedImpact: b.estimatedTrafficPotential || b.estimatedImpact,
        source: 'Blog Intelligence'
      }))
    },
    faqOpportunities: {
      total: 0,
      highValue: 0,
      list: []
    },
    highPriorityContent: highPriorityContent.slice(0, 10),
    contentCalendarSummary: calendarSummary,
    hasSufficientData: true
  };
}

// ============================================
// EXECUTIVE ACTION PLAN
// ============================================

function generateExecutiveActionPlan(seoData) {
  console.log('📋 [Action Plan] Creating executive action plan from verified data...');

  const actions = [];
  const technicalAudit = seoData.technicalAuditDetail || {};
  const keywordIntelligence = seoData.keywordIntelligence || {};
  const contentGapRecord = seoData.contentGapRecord || {};
  const geoIntelligence = seoData.geoIntelligence || {};

  const hasTechnicalData = technicalAudit.criticalIssues && technicalAudit.criticalIssues.length > 0;
  const hasKeywordData = keywordIntelligence.primaryKeywords && keywordIntelligence.primaryKeywords.length > 0;
  const hasContentData = contentGapRecord.contentGaps && contentGapRecord.contentGaps.length > 0;
  const hasGeoData = geoIntelligence.aiVisibilityScore !== undefined && geoIntelligence.aiVisibilityScore !== null;

  // From technical issues
  if (hasTechnicalData) {
    technicalAudit.criticalIssues.slice(0, 3).forEach(issue => {
      actions.push({
        task: `Fix: ${issue.issue || issue.title || issue}`,
        problem: `Critical technical issue: ${issue.issue || issue.title || issue}`,
        priority: 'critical',
        timeline: '7 days',
        impact: 'high',
        source: 'Technical Audit'
      });
    });
  }

  // From keyword opportunities
  if (hasKeywordData) {
    const highOpportunityKeywords = keywordIntelligence.primaryKeywords
      .filter(k => k.opportunity === 'high' && k.difficulty < 50)
      .slice(0, 2);
    
    highOpportunityKeywords.forEach(kw => {
      actions.push({
        task: `Create content for: ${kw.keyword}`,
        problem: `High-opportunity keyword with low difficulty`,
        priority: 'high',
        timeline: '30 days',
        impact: 'high',
        source: 'Keyword Intelligence',
        evidence: `Volume: ${kw.searchVolume}, Difficulty: ${kw.difficulty}`
      });
    });
  }

  // From content gaps
  if (hasContentData) {
    const criticalGaps = contentGapRecord.contentGaps.filter(g => g.priority === 'critical').slice(0, 2);
    criticalGaps.forEach(gap => {
      actions.push({
        task: `Create missing page: ${gap.title || gap.pageTitle}`,
        problem: `Critical content gap identified`,
        priority: 'critical',
        timeline: '30 days',
        impact: 'high',
        source: 'Content Gap Analysis',
        evidence: gap.evidence || `Keyword: ${gap.targetKeyword}`
      });
    });
  }

  // From GEO intelligence
  if (hasGeoData && geoIntelligence.aiVisibilityScore < 60) {
    actions.push({
      task: 'Improve AI search visibility',
      problem: 'Low AI search visibility score',
      priority: 'high',
      timeline: '60 days',
      impact: 'medium',
      source: 'GEO Intelligence',
      evidence: `Current score: ${geoIntelligence.aiVisibilityScore}`
    });
  }

  // Organize by timeline
  const day7Actions = actions.filter(a => a.timeline === '7 days');
  const day30Actions = actions.filter(a => a.timeline === '30 days');
  const day60Actions = actions.filter(a => a.timeline === '60 days');
  const day90Actions = actions.filter(a => a.timeline === '90 days');

  return {
    day7: day7Actions.slice(0, 5),
    day30: day30Actions.slice(0, 5),
    day60: day60Actions.slice(0, 5),
    day90: day90Actions.slice(0, 5),
    hasSufficientData: hasTechnicalData || hasKeywordData || hasContentData || hasGeoData
  };
}

// ============================================
// MEASUREMENT READINESS (replaces fabricated ROI forecast)
// ============================================

function generateMeasurementReadiness(seoData) {
  const analyticsConnected = !!(process.env.GA_API_KEY || process.env.GA_MEASUREMENT_ID);
  const searchConsoleConnected = !!(process.env.GSC_CLIENT_EMAIL || process.env.SEARCH_CONSOLE_CREDENTIALS);
  const conversionTrackingConnected = !!(process.env.GA_API_KEY);
  const revenueDataConnected = false; // Requires ecommerce integration

  return {
    potentialTrafficGain: null,
    estimatedRevenueImpact: null,
    timeToResults: null,
    status: 'NOT_MEASURED',
    measurementReadiness: {
      analyticsConnected,
      searchConsoleConnected,
      conversionTrackingConnected,
      revenueDataConnected
    },
    message: analyticsConnected
      ? 'Analytics connected. Connect revenue data for ROI measurement.'
      : 'Connect analytics, Search Console, and revenue data before ROI can be measured.'
  };
}

// ============================================
// DATA COMPLETENESS
// ============================================

function calculateDataCompleteness(seoData) {
  const checks = {
    technical: seoData.scoreBreakdown && seoData.scoreBreakdown.overallScore !== undefined,
    keyword: seoData.keywordIntelligence && seoData.keywordIntelligence.primaryKeywords && seoData.keywordIntelligence.primaryKeywords.length > 0,
    geo: seoData.geoIntelligence && seoData.geoIntelligence.aiVisibilityScore !== undefined,
    competitor: seoData.competitorSeoRecord && seoData.competitorSeoRecord.competitorProfiles && seoData.competitorSeoRecord.competitorProfiles.length > 0,
    content: seoData.contentGapRecord && seoData.contentGapRecord.contentGaps && seoData.contentGapRecord.contentGaps.length > 0
  };

  const available = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;

  return {
    percentage: Math.round((available / total) * 100),
    checks,
    available,
    total
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export default {
  generateExecutiveDashboard
};
