import fetch from 'node-fetch';
import { isDataForSEOConfigured } from '../dataforseo.service.js';
import { asArray } from '../../utils/text.util.js';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

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

    // Ensure at least 5 content gaps by supplementing with fallback data
    if (result.summary.totalGaps < 5) {
      const fallbackGaps = generateFallbackContentGaps(identity?.productName || 'Product', identity?.industry || 'Technology');
      if (fallbackGaps.contentGaps && fallbackGaps.contentGaps.length > 0) {
        // Merge fallback gaps into main result
        const existingTargets = new Set(result.contentGaps.map(g => g.targetKeyword?.toLowerCase()));
        const newGaps = fallbackGaps.contentGaps.filter(g => !existingTargets.has(g.targetKeyword?.toLowerCase()));
        
        if (newGaps.length > 0) {
          result.contentGaps = [...result.contentGaps, ...newGaps];
          result.landingPageIdeas = [...result.landingPageIdeas, ...newGaps.filter(g => g.pageType === 'landing_page')];
          result.comparisonPageIdeas = [...result.comparisonPageIdeas, ...newGaps.filter(g => g.pageType === 'comparison')];
          result.resourcePageIdeas = [...result.resourcePageIdeas, ...newGaps.filter(g => g.pageType === 'resource')];
          result.summary.totalGaps = result.contentGaps.length;
          result.summary.totalOpportunities = result.contentGaps.length;
          console.log(`✅ [Content Gap] Supplemented with ${newGaps.length} fallback gaps (total: ${result.contentGaps.length})`);
        }
      }
    }

    console.log('✅ [Content Gap] Analysis complete:', {
      totalGaps: result.summary.totalGaps,
      opportunities: result.summary.totalOpportunities,
      hasKeywordData: result.metadata.hasKeywordData,
      hasCompetitorData: result.metadata.hasCompetitorData
    });

    return result;

  } catch (error) {
    console.error('❌ [Content Gap] Error:', error);
    return generateFallbackContentGaps(identity?.productName || 'Product', identity?.industry || 'Technology');
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

  // Filter to only validated keywords (confidence ≥ 70 or from DataForSEO)
  // Also allow clean category-based seed keywords with lower confidence
  const validatedKeywords = allKeywords.filter(kw => {
    const confidence = kw.confidence || 0;
    const source = kw.source || '';
    
    // Accept DataForSEO keywords (high confidence by default)
    if (source === 'DataForSEO') return true;
    
    // Accept keywords with confidence ≥ 70
    if (confidence >= 70) return true;
    
    // Accept clean category-based seed keywords (source includes 'Category Seed' or similar)
    if (source && source.includes('Category Seed')) {
      const keyword = (kw.keyword || '').toLowerCase().trim();
      if (!keyword) return false;
      // Additional check: ensure keyword is not a bad phrase
      const badPhrases = ['general', 'account', 'semrush', 'platform for', 'for building', 'the collaborative interface', 'for building meaningful'];
      if (badPhrases.some(bp => keyword.includes(bp))) return false;
      // Reject concatenated junk keywords
      if (/^[a-z]{15,}$/.test(keyword) || /^[a-z]+[A-Z]/.test(keyword) || /^[a-z]{2,}[A-Z]{2,}/.test(keyword)) return false;
      const concatenatedBrands = ['canva', 'gamma', 'figma', 'notion', 'adobe', 'google'];
      if (concatenatedBrands.some(p => keyword.includes(p)) && !keyword.includes(' ')) return false;
      return true;
    }
    
    // Reject other seed/weak keywords
    return false;
  });
  
  if (validatedKeywords.length === 0) {
    console.log('⚠️ [Content Gap] No validated keywords (confidence ≥ 70 or DataForSEO) available');
    // Fall back to allKeywords if they exist (category seeds, AI-extracted)
    if (allKeywords.length > 0) {
      console.log(`🔄 [Content Gap] Falling back to ${allKeywords.length} unvalidated keywords for gap generation`);
      // Process all keywords with lowered confidence threshold
      allKeywords.forEach(kw => {
        const keyword = (kw.keyword || kw || '').toLowerCase().trim();
        if (!keyword) return;
        const volume = kw.searchVolume;
        const difficulty = kw.difficulty || kw.keywordDifficulty;
        const intent = kw.intent || 'informational';

        // Reject concatenated junk keywords (no spaces, camelCase, word-soup)
        if (/^[a-z]{15,}$/.test(keyword) || /^[a-z]+[A-Z]/.test(keyword) || /^[a-z]{2,}[A-Z]{2,}/.test(keyword)) return;
        const concatenatedBrands = ['canva', 'gamma', 'figma', 'notion', 'adobe', 'google'];
        if (concatenatedBrands.some(p => keyword.includes(p)) && !keyword.includes(' ')) return;
        
        if (isKeywordCovered(keyword, existingPages)) return;
        
        const words = keyword.split(' ');
        const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
          'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
          'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this',
          'that', 'these', 'those']);
        if (stopWords.has(words[0]) || stopWords.has(words[words.length - 1])) return;
        
        const weakTerms = ['general', 'account', 'tools', 'competitors', 'platform for', 'for building', 'the collaborative'];
        if (weakTerms.some(wt => keyword.includes(wt))) return;
        
        gaps.push({
          title: generateTitleFromKeyword(keyword, productName),
          pageType: intent === 'commercial' ? 'landing_page' : 'resource',
          targetKeyword: keyword,
          searchVolume: volume,
          keywordDifficulty: difficulty,
          intent: intent,
          evidence: volume ? `Keyword has ${volume} monthly searches` : 'Seed keyword for content opportunity',
          source: volume ? 'DataForSEO' : 'CategorySeed',
          confidence: 55,
          businessImpact: 'medium',
          priority: 'medium',
          recommendedSections: generateSectionsFromIntent(intent),
          competitorEvidence: []
        });
      });
      return gaps;
    }
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
  const keywordLower = keyword.toLowerCase();
  if (keywordLower.includes('vs') || keywordLower.includes('versus')) {
    return keyword.charAt(0).toUpperCase() + keyword.slice(1);
  }
  if (keywordLower.startsWith('how to') || keywordLower.startsWith('how')) {
    return `How to ${keyword.replace(/^(how to|how)\s*/i, '')} with ${productName}`;
  }
  if (keywordLower.startsWith('what is') || keywordLower.startsWith('what')) {
    return `What is ${keyword.replace(/^(what is|what)\s*/i, '')}?`;
  }
  return keyword.charAt(0).toUpperCase() + keyword.slice(1);
}

function generateSectionsFromIntent(intent) {
  const sections = {
    transactional: ['Overview', 'Features', 'Pricing', 'CTA'],
    informational: ['Introduction', 'Details', 'Examples', 'Conclusion'],
    commercial: ['Comparison', 'Benefits', 'Pricing', 'CTA'],
    navigational: ['Direct link', 'Overview', 'Related content']
  };
  return sections[intent] || ['Overview', 'Details', 'Conclusion'];
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
  const critical = gaps.filter(g => g.priority === 'critical');
  const high = gaps.filter(g => g.priority === 'high');
  const medium = gaps.filter(g => g.priority === 'medium');

  return {
    day30: critical.slice(0, 3).map(g => ({
      title: g.title,
      reason: g.evidence,
      priority: g.priority,
      effort: 'medium',
      impact: g.businessImpact
    })),
    day60: high.slice(0, 3).map(g => ({
      title: g.title,
      reason: g.evidence,
      priority: g.priority,
      effort: 'high',
      impact: g.businessImpact
    })),
    day90: medium.slice(0, 3).map(g => ({
      title: g.title,
      reason: g.evidence,
      priority: g.priority,
      effort: 'low',
      impact: g.businessImpact
    }))
  };
}

// ============================================
// FALLBACK GENERATION
// ============================================

function generateFallbackContentGaps(productName, industry) {
  console.log('🔄 [Content Gap] No real data available, generating category-specific seed gaps');
  
  const productLower = productName.toLowerCase();
  const gaps = [];
  
  // Category-specific content gaps based on product
  if (productLower.includes('canva')) {
    gaps.push(
      {
        title: 'Canva vs Adobe Express: Which Design Tool Is Better?',
        pageType: 'comparison',
        targetKeyword: 'canva vs adobe express',
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'commercial',
        evidence: 'Category seed comparison page',
        source: 'Category Seed Generation',
        confidence: 60,
        businessImpact: 'high',
        priority: 'high',
        recommendedSections: ['Feature comparison', 'Pricing', 'Pros and cons', 'Verdict'],
        competitorEvidence: []
      },
      {
        title: 'Canva Brand Kit Guide: Complete Setup Tutorial',
        pageType: 'landing_page',
        targetKeyword: 'canva brand kit',
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'informational',
        evidence: 'Category seed landing page',
        source: 'Category Seed Generation',
        confidence: 60,
        businessImpact: 'medium',
        priority: 'medium',
        recommendedSections: ['Overview', 'Setup guide', 'Best practices', 'Examples'],
        competitorEvidence: []
      },
      {
        title: 'AI Design Tool Landing Page: Best Solutions for Teams',
        pageType: 'landing_page',
        targetKeyword: 'AI design tool',
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'commercial',
        evidence: 'Category seed landing page',
        source: 'Category Seed Generation',
        confidence: 60,
        businessImpact: 'high',
        priority: 'high',
        recommendedSections: ['Overview', 'Features', 'Pricing', 'CTA'],
        competitorEvidence: []
      },
      {
        title: 'Social Media Template SEO Page: Best Practices',
        pageType: 'landing_page',
        targetKeyword: 'social media design tool',
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'commercial',
        evidence: 'Category seed landing page',
        source: 'Category Seed Generation',
        confidence: 60,
        businessImpact: 'medium',
        priority: 'medium',
        recommendedSections: ['Overview', 'Features', 'Pricing', 'CTA'],
        competitorEvidence: []
      },
      {
        title: 'Presentation Maker Page: Create Stunning Slides',
        pageType: 'landing_page',
        targetKeyword: 'presentation maker',
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'commercial',
        evidence: 'Category seed landing page',
        source: 'Category Seed Generation',
        confidence: 60,
        businessImpact: 'medium',
        priority: 'medium',
        recommendedSections: ['Overview', 'Features', 'Pricing', 'CTA'],
        competitorEvidence: []
      },
      {
        title: 'Logo Maker Page: Create Professional Logos',
        pageType: 'landing_page',
        targetKeyword: 'logo maker',
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'commercial',
        evidence: 'Category seed landing page',
        source: 'Category Seed Generation',
        confidence: 60,
        businessImpact: 'medium',
        priority: 'medium',
        recommendedSections: ['Overview', 'Features', 'Pricing', 'CTA'],
        competitorEvidence: []
      }
    );
  } else if (productLower.includes('gamma')) {
    gaps.push(
      {
        title: 'Gamma vs Canva for AI Presentations',
        pageType: 'comparison',
        targetKeyword: 'gamma vs canva',
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'commercial',
        evidence: 'Category seed comparison page',
        source: 'Category Seed Generation',
        confidence: 60,
        businessImpact: 'high',
        priority: 'high',
        recommendedSections: ['Feature comparison', 'Pricing', 'Pros and cons', 'Verdict'],
        competitorEvidence: []
      },
      {
        title: 'Gamma vs Beautiful.ai: AI Presentation Tools Compared',
        pageType: 'comparison',
        targetKeyword: 'gamma vs beautiful.ai',
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'commercial',
        evidence: 'Category seed comparison page',
        source: 'Category Seed Generation',
        confidence: 60,
        businessImpact: 'high',
        priority: 'high',
        recommendedSections: ['Feature comparison', 'Pricing', 'Pros and cons', 'Verdict'],
        competitorEvidence: []
      },
      {
        title: 'AI Presentation Maker Landing Page: Best Tools',
        pageType: 'landing_page',
        targetKeyword: 'AI presentation maker',
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'commercial',
        evidence: 'Category seed landing page',
        source: 'Category Seed Generation',
        confidence: 60,
        businessImpact: 'high',
        priority: 'high',
        recommendedSections: ['Overview', 'Features', 'Pricing', 'CTA'],
        competitorEvidence: []
      },
      {
        title: 'AI Website Builder Page: Create Sites with AI',
        pageType: 'landing_page',
        targetKeyword: 'AI website builder',
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'commercial',
        evidence: 'Category seed landing page',
        source: 'Category Seed Generation',
        confidence: 60,
        businessImpact: 'high',
        priority: 'high',
        recommendedSections: ['Overview', 'Features', 'Pricing', 'CTA'],
        competitorEvidence: []
      },
      {
        title: 'Pitch Deck Generator Guide: Create Winning Decks',
        pageType: 'landing_page',
        targetKeyword: 'pitch deck generator',
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'informational',
        evidence: 'Category seed landing page',
        source: 'Category Seed Generation',
        confidence: 60,
        businessImpact: 'medium',
        priority: 'medium',
        recommendedSections: ['Overview', 'Guide', 'Examples', 'FAQ'],
        competitorEvidence: []
      }
    );
  } else if (productLower.includes('figma')) {
    gaps.push(
      {
        title: 'Figma vs Sketch for Product Teams',
        pageType: 'comparison',
        targetKeyword: 'figma vs sketch',
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'commercial',
        evidence: 'Category seed comparison page',
        source: 'Category Seed Generation',
        confidence: 60,
        businessImpact: 'high',
        priority: 'high',
        recommendedSections: ['Feature comparison', 'Pricing', 'Pros and cons', 'Verdict'],
        competitorEvidence: []
      },
      {
        title: 'Collaborative Design Tool Page: Best Solutions',
        pageType: 'landing_page',
        targetKeyword: 'collaborative design tool',
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'commercial',
        evidence: 'Category seed landing page',
        source: 'Category Seed Generation',
        confidence: 60,
        businessImpact: 'high',
        priority: 'high',
        recommendedSections: ['Overview', 'Features', 'Pricing', 'CTA'],
        competitorEvidence: []
      },
      {
        title: 'Design System Guide: Build Scalable Systems in Figma',
        pageType: 'resource',
        targetKeyword: 'design system tool',
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'informational',
        evidence: 'Category seed resource page',
        source: 'Category Seed Generation',
        confidence: 60,
        businessImpact: 'medium',
        priority: 'medium',
        recommendedSections: ['Introduction', 'Step-by-step guide', 'Examples', 'FAQ'],
        competitorEvidence: []
      },
      {
        title: 'UI Prototyping Tool Page: Best Tools for Designers',
        pageType: 'landing_page',
        targetKeyword: 'UI design software',
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'commercial',
        evidence: 'Category seed landing page',
        source: 'Category Seed Generation',
        confidence: 60,
        businessImpact: 'medium',
        priority: 'medium',
        recommendedSections: ['Overview', 'Features', 'Pricing', 'CTA'],
        competitorEvidence: []
      }
    );
  } else {
    // Generic fallback for other products
    gaps.push(
      {
        title: `${productName} vs Top Competitors: Complete Comparison`,
        pageType: 'comparison',
        targetKeyword: `${productName} alternatives`,
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'commercial',
        evidence: 'Industry-standard comparison page',
        source: 'Generic Seed Generation',
        confidence: 50,
        businessImpact: 'high',
        priority: 'high',
        recommendedSections: ['Feature comparison', 'Pricing', 'Pros and cons', 'Verdict'],
        competitorEvidence: []
      },
      {
        title: `Ultimate Guide to ${industry} in 2026`,
        pageType: 'resource',
        targetKeyword: `${industry} guide`,
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'informational',
        evidence: 'Topical authority resource page',
        source: 'Generic Seed Generation',
        confidence: 50,
        businessImpact: 'high',
        priority: 'high',
        recommendedSections: ['Industry overview', 'Key trends', 'Best practices', 'Tool recommendations', 'FAQs'],
        competitorEvidence: []
      },
      {
        title: `Best ${industry} Tools & Platforms Compared`,
        pageType: 'landing_page',
        targetKeyword: `best ${industry} tools`,
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'commercial',
        evidence: 'Category landing page',
        source: 'Generic Seed Generation',
        confidence: 50,
        businessImpact: 'medium',
        priority: 'medium',
        recommendedSections: ['Overview', 'Top tools', 'Features comparison', 'Pricing', 'Selection guide'],
        competitorEvidence: []
      },
      {
        title: `${productName} Pricing vs Competitors: Is It Worth It?`,
        pageType: 'comparison',
        targetKeyword: `${productName} pricing`,
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'commercial',
        evidence: 'Pricing comparison page',
        source: 'Generic Seed Generation',
        confidence: 45,
        businessImpact: 'medium',
        priority: 'medium',
        recommendedSections: ['Pricing tiers', 'Competitor pricing', 'Value analysis', 'ROI calculator', 'Decision guide'],
        competitorEvidence: []
      },
      {
        title: `How ${productName} Solves ${targetAudience || 'Your'} Biggest ${industry} Challenges`,
        pageType: 'landing_page',
        targetKeyword: `${productName} for ${industry}`,
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'informational',
        evidence: 'Use-case landing page',
        source: 'Generic Seed Generation',
        confidence: 45,
        businessImpact: 'medium',
        priority: 'medium',
        recommendedSections: ['Common challenges', 'How we solve them', 'Case studies', 'Getting started', 'FAQ'],
        competitorEvidence: []
      },
      {
        title: `${productName} vs Category Leaders: Feature Deep Dive`,
        pageType: 'comparison',
        targetKeyword: `${productName} comparison`,
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'commercial',
        evidence: 'Detailed comparison page',
        source: 'Generic Seed Generation',
        confidence: 45,
        businessImpact: 'medium',
        priority: 'medium',
        recommendedSections: ['Feature matrix', 'Use case fit', 'Integration ecosystem', 'Support comparison', 'Final recommendation'],
        competitorEvidence: []
      }
    );
  }
  
  return {
    contentGaps: gaps,
    landingPageIdeas: gaps.filter(g => g.pageType === 'landing_page'),
    comparisonPageIdeas: gaps.filter(g => g.pageType === 'comparison'),
    faqOpportunities: [],
    geoContentIdeas: [],
    resourcePageIdeas: gaps.filter(g => g.pageType === 'resource'),
    contentCalendar: generateContentCalendar(gaps),
    summary: {
      totalGaps: gaps.length,
      totalOpportunities: gaps.length,
      criticalPriority: gaps.filter(g => g.priority === 'critical').length,
      highPriority: gaps.filter(g => g.priority === 'high').length
    },
    metadata: {
      analyzedAt: new Date().toISOString(),
      message: 'Using category-specific seed content gaps due to limited keyword/SERP data',
      source: 'Category Seed Generation',
      isFallback: true,
      confidence: 'low'
    }
  };
}

export default {
  generateContentGapIntelligence
};
