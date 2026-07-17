import fetch from 'node-fetch';
import { isDataForSEOConfigured } from '../dataforseo.service.js';
import { asArray, isValidKeyword } from '../../utils/text.util.js';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const JUNK_KEYWORDS = new Set([
  'started', 'menu', 'next', 'previous', 'learn', 'submit', 'copyright',
  'login', 'sign', 'click', 'home', 'about', 'contact', 'blog', 'faq',
  'general', 'account', 'undefined', 'custom', 'business', 'systems',
  'platform for', 'for building', 'shell', 'studio', 'free', 'best',
  'premium', 'plan', 'month', 'features', 'get', 'make', 'use', 'work',
  'time', 'new', 'good', 'great', 'top', 'trial', 'try', 'demo', 'video',
  'image', 'started'
]);

// ============================================
// CONTENT GAP ENGINE
// ============================================

/**
 * Generate comprehensive content gap analysis
 * @param {Object} params - { websiteData, keywordIntelligence, geoIntelligence, competitorIntelligence, identity }
 * @returns {Object} - Complete content gap intelligence
 */
export async function generateContentGapIntelligence({
  websiteData,
  keywordIntelligence = {},
  geoIntelligence = {},
  competitorIntelligence = {},
  identity = {}
}) {
  console.log('📝 [Content Gap] Starting content gap analysis...');

  // Ensure identity has required fields
  const productName = identity.productName || identity.brandName || 'Product';
  const industry = identity.industry || 'Technology';

  // Filter competitors: only use direct business competitors and high-relevance SERP competitors
  // Exclude directory/research sites (Similarweb, Gartner, etc.) from content gap analysis
  const filteredCompetitorIntelligence = {
    ...competitorIntelligence,
    competitorProfiles: (competitorIntelligence.competitorProfiles || []).filter(c => {
      const competitorType = c.competitorType || 'unknown';
      // Only allow direct, serp, and emerging competitors - exclude directory/research
      return ['direct', 'serp', 'emerging'].includes(competitorType);
    })
  };

  console.log('📝 [Content Gap] Filtered competitors for content analysis:', {
    total: competitorIntelligence.competitorProfiles?.length || 0,
    filtered: filteredCompetitorIntelligence.competitorProfiles.length,
    excluded: (competitorIntelligence.competitorProfiles?.length || 0) - filteredCompetitorIntelligence.competitorProfiles.length
  });

  try {
    // Step 1: Analyze existing pages from Firecrawl
    console.log('🔍 [Content Gap] Step 1: Analyzing existing pages...');
    const existingPages = analyzeExistingPages(websiteData);

    // Step 2: Analyze keyword opportunities from DataForSEO
    console.log('🎯 [Content Gap] Step 2: Analyzing keyword opportunities...');
    const keywordGaps = analyzeKeywordOpportunities(keywordIntelligence, existingPages, productName);

    // Step 3: Analyze SERP competitor ranking pages (using filtered competitors)
    console.log('⚔️ [Content Gap] Step 3: Analyzing competitor ranking pages...');
    const competitorPageGaps = analyzeCompetitorPages(filteredCompetitorIntelligence, existingPages, productName);

    // Step 4: Identify missing service pages
    console.log('🛠️ [Content Gap] Step 4: Identifying missing service pages...');
    const servicePageGaps = identifyMissingServicePages(websiteData, keywordIntelligence, productName);

    // Step 5: Identify missing FAQ pages
    console.log('❓ [Content Gap] Step 5: Identifying FAQ opportunities...');
    const faqGaps = identifyFaqOpportunities(keywordIntelligence, geoIntelligence, existingPages);

    // Step 6: Identify missing comparison pages (using filtered competitors)
    console.log('⚖️ [Content Gap] Step 6: Identifying comparison page opportunities...');
    const comparisonGaps = identifyComparisonOpportunities(keywordIntelligence, filteredCompetitorIntelligence, existingPages);

    // Step 7: Identify missing resource/blog pages
    console.log('📚 [Content Gap] Step 7: Identifying resource page opportunities...');
    const resourceGaps = identifyResourceOpportunities(keywordIntelligence, existingPages);

    // Compile all gaps with proper structure
    const allGaps = [
      ...keywordGaps,
      ...competitorPageGaps,
      ...servicePageGaps,
      ...faqGaps,
      ...comparisonGaps,
      ...resourceGaps
    ];

    // Deduplicate content gaps by targetKeyword + pageType + title
    console.log('🔄 [Content Gap] Deduplicating content gaps...');
    const deduplicatedGaps = deduplicateContentGaps(allGaps);
    console.log(`✅ [Content Gap] Deduplicated: ${allGaps.length} → ${deduplicatedGaps.length} gaps`);

    // Step 8: Generate content calendar
    console.log('📅 [Content Gap] Step 8: Creating content calendar...');
    const contentCalendar = generateContentCalendar(deduplicatedGaps);

    // Compile result
    const result = {
      contentGaps: deduplicatedGaps,
      landingPageIdeas: deduplicatedGaps.filter(g => g.pageType === 'landing_page'),
      comparisonPageIdeas: deduplicatedGaps.filter(g => g.pageType === 'comparison'),
      faqOpportunities: deduplicatedGaps.filter(g => g.pageType === 'faq'),
      geoContentIdeas: deduplicatedGaps.filter(g => g.pageType === 'geo'),
      resourcePageIdeas: deduplicatedGaps.filter(g => g.pageType === 'resource'),
      contentCalendar: contentCalendar || {},
      summary: {
        totalGaps: deduplicatedGaps.length,
        totalOpportunities: deduplicatedGaps.length,
        criticalPriority: deduplicatedGaps.filter(g => g.priority === 'critical').length,
        highPriority: deduplicatedGaps.filter(g => g.priority === 'high').length
      },
      metadata: {
        analyzedAt: new Date().toISOString(),
        hasKeywordData: isDataForSEOConfigured(),
        hasCompetitorData: competitorIntelligence.competitorProfiles?.length > 0
      }
    };

    console.log('✅ [Content Gap] Analysis complete:', {
      totalGaps: result.summary.totalGaps,
      opportunities: result.summary.totalOpportunities,
      hasKeywordData: result.metadata.hasKeywordData,
      hasCompetitorData: result.metadata.hasCompetitorData
    });

    return result;

  } catch (error) {
    console.error('❌ [Content Gap] Error:', error);
    return {
      contentGaps: [],
      landingPageIdeas: [],
      comparisonPageIdeas: [],
      faqOpportunities: [],
      geoContentIdeas: [],
      resourcePageIdeas: [],
      contentCalendar: {},
      summary: {
        totalGaps: 0,
        totalOpportunities: 0,
        criticalPriority: 0,
        highPriority: 0
      },
      metadata: {
        analyzedAt: new Date().toISOString(),
        source: 'Unavailable',
        error: error.message,
        message: 'Content gap intelligence unavailable due to processing error'
      }
    };
  }
}

// ============================================
// EXISTING PAGES ANALYSIS
// ============================================

function analyzeExistingPages(websiteData) {
  const userContent = (websiteData.text || '').toLowerCase();
  const userHeadings = (websiteData.content?.headings || []).map(h => h.text.toLowerCase());
  const userLinks = (websiteData.content?.links || []).map(l => l.href?.toLowerCase() || '');
  const userTitle = (websiteData.content?.title || '').toLowerCase();
  const userMeta = (websiteData.content?.metaDescription || '').toLowerCase();

  return {
    hasPricing: /pricing|price|cost|plan|subscription/i.test(userContent) ||
               userHeadings.some(h => /pricing|price|plan/i.test(h)),
    hasFeatures: userHeadings.some(h => /features|capabilities|what we offer/i.test(h)),
    hasComparison: /vs|versus|compared to|alternative to|comparison/i.test(userContent),
    hasFaq: /faq|frequently asked|questions|q&a/i.test(userContent) ||
            userHeadings.some(h => /faq|questions/i.test(h)),
    hasUseCase: /use case|customer story|case study|success story/i.test(userContent),
    hasIndustry: /industry|vertical|sector|for [a-z]+ industry/i.test(userContent),
    hasRole: /role|student|fresher|professional|executive/i.test(userContent),
    hasTemplate: /template|example|sample|format/i.test(userContent),
    hasIntegrations: /integration|integrate with|connect with|api|partner/i.test(userContent),
    hasResource: /blog|resource|guide|whitepaper|ebook/i.test(userContent),
    hasAbout: /about|who we are|our story|our mission/i.test(userContent),
    hasContact: /contact|reach out|get in touch/i.test(userContent),
    headings: userHeadings,
    links: userLinks,
    title: userTitle,
    meta: userMeta
  };
}

// ============================================
// KEYWORD OPPORTUNITY ANALYSIS
// ============================================

function analyzeKeywordOpportunities(keywordIntelligence, existingPages, productName) {
  const gaps = [];
  
  // Only generate gaps if we have real keyword data
  const allKeywords = [
    ...(keywordIntelligence.primaryKeywords || []),
    ...(keywordIntelligence.secondaryKeywords || []),
    ...(keywordIntelligence.longTailKeywords || [])
  ];
  
  if (!allKeywords || allKeywords.length === 0) {
    console.log('⚠️ [Content Gap] No keyword data available for gap analysis');
    return gaps;
  }

  console.log(`✅ [Content Gap] Using ${allKeywords.length} keywords for gap analysis`);

  // Filter to only VERIFIED or HEURISTICALLY_VALIDATED keywords
  const validatedKeywords = allKeywords.filter(kw => {
    const status = kw.validationStatus || '';
    if (status === 'VERIFIED' || status === 'HEURISTICALLY_VALIDATED') return true;
    return false;
  });
  
  if (validatedKeywords.length === 0) {
    console.log('⚠️ [Content Gap] No validated keywords (VERIFIED/HEURISTICALLY_VALIDATED) available');
    gaps.status = 'PARTIAL';
    gaps.warnings = [{ code: 'NO_VALIDATED_KEYWORDS', message: 'No validated keywords available for content gap analysis.' }];
    return gaps;
  }
  
  console.log(`✅ [Content Gap] Using ${validatedKeywords.length} validated keywords out of ${allKeywords.length} total`);

  const productLower = productName.toLowerCase();

  // Analyze each keyword for content opportunities
  validatedKeywords.forEach(kw => {
    const keyword = kw.keyword || kw;
    const volume = kw.searchVolume;
    const difficulty = kw.difficulty || kw.keywordDifficulty;
    const intent = kw.intent || 'informational';

    // Skip if keyword is already covered in existing content
    if (isKeywordCovered(keyword, existingPages)) {
      return;
    }
    
    // Skip malformed titles (sentence fragments, stopword-starting/ending)
    const words = keyword.split(' ');
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this',
      'that', 'these', 'those']);
    if (stopWords.has(words[0]) || stopWords.has(words[words.length - 1])) {
      return;
    }
    
    // Skip generic weak terms
    const weakTerms = ['general', 'account', 'tools', 'competitors', 'alternatives', 'platform for', 'for building', 'the collaborative'];
    if (weakTerms.some(wt => keyword.includes(wt))) {
      return;
    }

    // Generate content gap based on keyword type and intent
    if (intent === 'transactional' && (volume > 100 || !volume)) {
      gaps.push({
        title: generateTitleFromKeyword(keyword, productName),
        pageType: 'landing_page',
        targetKeyword: keyword,
        searchVolume: volume,
        keywordDifficulty: difficulty,
        intent: intent,
        evidence: volume ? `Keyword has ${volume} monthly searches with ${intent} intent` : `Seed keyword with ${intent} intent`,
        source: volume ? 'DataForSEO' : 'Seed Generation',
        confidence: calculateConfidence(volume, difficulty),
        businessImpact: volume > 1000 ? 'high' : 'medium',
        priority: volume > 1000 ? 'critical' : 'high',
        recommendedSections: generateSectionsFromIntent(intent),
        competitorEvidence: []
      });
    } else if (intent === 'informational' && (volume > 500 || !volume)) {
      gaps.push({
        title: generateTitleFromKeyword(keyword, productName),
        pageType: 'resource',
        targetKeyword: keyword,
        searchVolume: volume,
        keywordDifficulty: difficulty,
        intent: intent,
        evidence: volume ? `Informational keyword with ${volume} monthly searches` : `Seed informational keyword`,
        source: volume ? 'DataForSEO' : 'Seed Generation',
        confidence: calculateConfidence(volume, difficulty),
        businessImpact: 'medium',
        priority: 'medium',
        recommendedSections: generateSectionsFromIntent(intent),
        competitorEvidence: []
      });
    }
  });

  return gaps;
}

// ============================================
// COMPETITOR PAGE ANALYSIS
// ============================================

function analyzeCompetitorPages(competitorIntelligence, existingPages, productName) {
  const gaps = [];
  
  if (!competitorIntelligence.competitorProfiles || competitorIntelligence.competitorProfiles.length === 0) {
    console.log('⚠️ [Content Gap] No competitor data available for page analysis');
    return gaps;
  }

  const competitors = competitorIntelligence.competitorProfiles;

  // Analyze competitor pages for missing content
  competitors.forEach(comp => {
    if (comp.strongestPages && comp.strongestPages.length > 0) {
      comp.strongestPages.forEach(page => {
        const pageLower = page.toLowerCase();
        
        // Skip if we already have similar content
        if (isPageCovered(pageLower, existingPages)) {
          return;
        }

        // Generate gap based on competitor page
        if (pageLower.includes('pricing') && !existingPages.hasPricing) {
          gaps.push({
            title: `${productName} Pricing`,
            pageType: 'landing_page',
            targetKeyword: `${productName} pricing`,
            searchVolume: null,
            keywordDifficulty: null,
            intent: 'transactional',
            evidence: `Competitor ${comp.name} has pricing page`,
            source: 'SERP',
            confidence: 80,
            businessImpact: 'high',
            priority: 'critical',
            recommendedSections: ['Plan tiers', 'Feature comparison', 'FAQ'],
            competitorEvidence: [comp.name]
          });
        } else if (pageLower.includes('features') && !existingPages.hasFeatures) {
          gaps.push({
            title: `${productName} Features`,
            pageType: 'landing_page',
            targetKeyword: `${productName} features`,
            searchVolume: null,
            keywordDifficulty: null,
            intent: 'informational',
            evidence: `Competitor ${comp.name} has features page`,
            source: 'SERP',
            confidence: 75,
            businessImpact: 'medium',
            priority: 'high',
            recommendedSections: ['Core features', 'Advanced capabilities', 'Integrations'],
            competitorEvidence: [comp.name]
          });
        }
      });
    }
  });

  return gaps;
}

// ============================================
// MISSING SERVICE PAGES
// ============================================

function identifyMissingServicePages(websiteData, keywordIntelligence, productName) {
  const gaps = [];
  const existingPages = analyzeExistingPages(websiteData);
  
  // Only generate service pages if we have keyword evidence
  if (!keywordIntelligence.primaryKeywords || keywordIntelligence.primaryKeywords.length === 0) {
    return gaps;
  }

  const keywords = keywordIntelligence.primaryKeywords || [];
  const serviceKeywords = keywords.filter(kw => {
    const keyword = kw.keyword || kw;
    return keyword.includes('service') || keyword.includes('development') || 
           keyword.includes('custom') || keyword.includes('software');
  });

  serviceKeywords.forEach(kw => {
    const keyword = kw.keyword || kw;
    const volume = kw.searchVolume;
    
    if (!isKeywordCovered(keyword, existingPages) && volume > 50) {
      gaps.push({
        title: generateTitleFromKeyword(keyword, productName),
        pageType: 'landing_page',
        targetKeyword: keyword,
        searchVolume: volume,
        keywordDifficulty: kw.difficulty,
        intent: kw.intent || 'commercial',
        evidence: `Service-related keyword with ${volume} monthly searches`,
        source: 'DataForSEO',
        confidence: calculateConfidence(volume, kw.difficulty),
        businessImpact: 'high',
        priority: 'high',
        recommendedSections: ['Service overview', 'Process', 'Pricing', 'Case studies'],
        competitorEvidence: []
      });
    }
  });

  return gaps;
}

// ============================================
// FAQ OPPORTUNITIES
// ============================================

function identifyFaqOpportunities(keywordIntelligence, geoIntelligence, existingPages) {
  const gaps = [];
  
  // Only generate FAQ pages if we have question keywords or GEO data
  const questionKeywords = keywordIntelligence.primaryKeywords?.filter(kw => {
    const keyword = kw.keyword || kw;
    return keyword.startsWith('how') || keyword.startsWith('what') || 
           keyword.startsWith('why') || keyword.startsWith('when') ||
           keyword.includes('?');
  }) || [];

  const geoQuestions = geoIntelligence.geoKeywords || [];

  if (questionKeywords.length === 0 && geoQuestions.length === 0) {
    return gaps;
  }

  // Generate FAQ gaps from question keywords
  questionKeywords.forEach(kw => {
    const keyword = kw.keyword || kw;
    const volume = kw.searchVolume;
    
    if (volume > 100) {
      gaps.push({
        title: generateTitleFromKeyword(keyword, productName),
        pageType: 'faq',
        targetKeyword: keyword,
        searchVolume: volume,
        keywordDifficulty: kw.difficulty,
        intent: 'informational',
        evidence: `Question keyword with ${volume} monthly searches`,
        source: 'DataForSEO',
        confidence: calculateConfidence(volume, kw.difficulty),
        businessImpact: 'medium',
        priority: 'medium',
        recommendedSections: ['Answer', 'Examples', 'Related questions'],
        competitorEvidence: []
      });
    }
  });

  // Generate FAQ gaps from GEO questions
  geoQuestions.forEach(gq => {
    const question = gq.question || gq.keyword || gq;
    
    if (!isKeywordCovered(question, existingPages)) {
      gaps.push({
        title: generateTitleFromKeyword(question, productName),
        pageType: 'faq',
        targetKeyword: question,
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'informational',
        evidence: 'AI search question from GEO analysis',
        source: 'GEO',
        confidence: 70,
        businessImpact: 'high',
        priority: 'high',
        recommendedSections: ['Direct answer', 'Context', 'Examples'],
        competitorEvidence: []
      });
    }
  });

  return gaps;
}

// ============================================
// COMPARISON OPPORTUNITIES
// ============================================

function identifyComparisonOpportunities(keywordIntelligence, competitorIntelligence, existingPages) {
  const gaps = [];
  
  // Only generate comparison pages if we have comparison keywords or competitors
  const comparisonKeywords = keywordIntelligence.primaryKeywords?.filter(kw => {
    const keyword = kw.keyword || kw;
    return keyword.includes('vs') || keyword.includes('versus') || 
           keyword.includes('alternative') || keyword.includes('comparison');
  }) || [];

  if (comparisonKeywords.length === 0 && !competitorIntelligence.competitorProfiles?.length) {
    return gaps;
  }

  comparisonKeywords.forEach(kw => {
    const keyword = kw.keyword || kw;
    const volume = kw.searchVolume;
    
    if (volume > 50) {
      gaps.push({
        title: generateTitleFromKeyword(keyword, productName),
        pageType: 'comparison',
        targetKeyword: keyword,
        searchVolume: volume,
        keywordDifficulty: kw.difficulty,
        intent: 'commercial',
        evidence: `Comparison keyword with ${volume} monthly searches`,
        source: 'DataForSEO',
        confidence: calculateConfidence(volume, kw.difficulty),
        businessImpact: 'high',
        priority: 'high',
        recommendedSections: ['Feature comparison', 'Pricing', 'Pros and cons', 'Verdict'],
        competitorEvidence: []
      });
    }
  });

  return gaps;
}

// ============================================
// RESOURCE OPPORTUNITIES
// ============================================

function identifyResourceOpportunities(keywordIntelligence, existingPages) {
  const gaps = [];
  
  // Only generate resource pages if we have informational keywords
  const resourceKeywords = keywordIntelligence.primaryKeywords?.filter(kw => {
    const keyword = kw.keyword || kw;
    const intent = kw.intent || 'informational';
    return intent === 'informational' && keyword.length > 5 && 
           (keyword.includes('guide') || keyword.includes('tutorial') || 
            keyword.includes('how to') || keyword.includes('best'));
  }) || [];

  if (resourceKeywords.length === 0) {
    return gaps;
  }

  resourceKeywords.forEach(kw => {
    const keyword = kw.keyword || kw;
    const volume = kw.searchVolume;
    
    if (volume > 200 && !isKeywordCovered(keyword, existingPages)) {
      gaps.push({
        title: generateTitleFromKeyword(keyword, productName),
        pageType: 'resource',
        targetKeyword: keyword,
        searchVolume: volume,
        keywordDifficulty: kw.difficulty,
        intent: 'informational',
        evidence: `High-volume informational keyword (${volume} searches)`,
        source: 'DataForSEO',
        confidence: calculateConfidence(volume, kw.difficulty),
        businessImpact: 'medium',
        priority: 'medium',
        recommendedSections: ['Introduction', 'Step-by-step guide', 'Examples', 'FAQ'],
        competitorEvidence: []
      });
    }
  });

  return gaps;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function isKeywordCovered(keyword, existingPages) {
  const keywordLower = keyword.toLowerCase();
  return existingPages.headings.some(h => h.includes(keywordLower)) ||
         existingPages.links.some(l => l.includes(keywordLower)) ||
         existingPages.title.includes(keywordLower) ||
         existingPages.meta.includes(keywordLower);
}

function isPageCovered(page, existingPages) {
  return existingPages.headings.some(h => h.includes(page)) ||
         existingPages.links.some(l => l.includes(page));
}

function generateTitleFromKeyword(keyword, productName) {
  if (!keyword) return null;
  if (!isValidKeyword(keyword)) return null;
  const lower = keyword.trim();
  const words = lower.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1));
  const title = words.join(' ');
  if (lower.startsWith('how') || lower.startsWith('what') || lower.startsWith('why') || lower.startsWith('when') || lower.startsWith('where') || lower.startsWith('which') || lower.startsWith('who') || lower.startsWith('is') || lower.startsWith('can') || lower.startsWith('does') || lower.includes('?')) {
    return title.endsWith('?') ? title : title + '?';
  }
  if (words.length <= 2) {
    return `${title} - Guide for ${productName}`;
  }
  return title;
}

function generateSectionsFromIntent(intent) {
  const base = ['Introduction', 'Key benefits', 'How it works', 'Use cases', 'Next steps'];
  if (intent === 'commercial' || intent === 'transactional') {
    return ['Overview', 'Pricing & Plans', 'Feature comparison', 'ROI analysis', 'Testimonials', 'FAQ', 'Get started'];
  }
  if (intent === 'informational') {
    return ['What is this', 'How it works', 'Step-by-step guide', 'Best practices', 'Common mistakes', 'FAQ', 'Related resources'];
  }
  return base;
}

function calculateConfidence(volume, difficulty) {
  if (!volume || !difficulty) return 50;
  if (volume > 1000 && difficulty < 50) return 90;
  if (volume > 500 && difficulty < 70) return 80;
  if (volume > 100) return 70;
  return 60;
}

// Deduplicate content gaps by targetKeyword + pageType + title
function deduplicateContentGaps(gaps) {
  const seen = new Map();
  const deduplicated = [];

  gaps.forEach(gap => {
    const key = `${gap.targetKeyword || ''}|${gap.pageType || ''}|${gap.title || ''}`;
    
    if (seen.has(key)) {
      // Merge competitor evidence instead of creating duplicate
      const existing = seen.get(key);
      if (gap.competitorEvidence && !existing.competitorEvidence) {
        existing.competitorEvidence = gap.competitorEvidence;
      } else if (gap.competitorEvidence && existing.competitorEvidence) {
        // Combine evidence arrays
        const combined = Array.isArray(existing.competitorEvidence) 
          ? [...existing.competitorEvidence] 
          : [existing.competitorEvidence];
        const newEvidence = Array.isArray(gap.competitorEvidence) 
          ? gap.competitorEvidence 
          : [gap.competitorEvidence];
        existing.competitorEvidence = [...combined, ...newEvidence];
      }
    } else {
      seen.set(key, gap);
      deduplicated.push(gap);
    }
  });

  return deduplicated;
}

function generateContentCalendar(gaps) {
  return {};
}



export default {
  generateContentGapIntelligence
};
