import fetch from 'node-fetch';
import { isDataForSEOConfigured } from '../dataforseo.service.js';
import { asArray } from '../../utils/text.util.js';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// ============================================
// BLOG INTELLIGENCE ENGINE
// ============================================

/**
 * Generate comprehensive blog intelligence
 * @param {Object} params - { keywordIntelligence, competitorIntelligence, geoIntelligence, identity, orchestratorData }
 * @returns {Object} - Complete blog intelligence
 */
export async function generateBlogIntelligence({
  keywordIntelligence = {},
  competitorIntelligence = {},
  geoIntelligence = {},
  identity,
  orchestratorData = {}
}) {
  console.log('📝 [Blog Intelligence] Starting blog analysis...', { 
    newsCount: orchestratorData.newsSignals?.length || 0,
    marketCount: orchestratorData.marketSignals?.length || 0 
  });

  // Filter competitors: only use direct business competitors and high-relevance SERP competitors
  // Exclude directory/research sites (Similarweb, Gartner, etc.) from blog intelligence
  const filteredCompetitorIntelligence = {
    ...competitorIntelligence,
    competitorProfiles: (competitorIntelligence.competitorProfiles || []).filter(c => {
      const competitorType = c.competitorType || 'unknown';
      // Only allow direct, serp, and emerging competitors - exclude directory/research
      return ['direct', 'serp', 'emerging'].includes(competitorType);
    })
  };

  console.log('📝 [Blog Intelligence] Filtered competitors for blog analysis:', {
    total: competitorIntelligence.competitorProfiles?.length || 0,
    filtered: filteredCompetitorIntelligence.competitorProfiles.length,
    excluded: (competitorIntelligence.competitorProfiles?.length || 0) - filteredCompetitorIntelligence.competitorProfiles.length
  });

  try {
    // Step 1: Generate blog ideas from real data only (using filtered competitors and orchestrator data)
    console.log('💡 [Blog Intelligence] Step 1: Generating blog ideas from real data...');
    const blogIdeas = await generateBlogIdeas({
      keywordIntelligence,
      competitorIntelligence: filteredCompetitorIntelligence,
      geoIntelligence,
      productName: identity.productName,
      industry: identity.industry,
      newsSignals: orchestratorData.newsSignals || [],
      marketSignals: orchestratorData.marketSignals || []
    });

    // Step 2: Create blog clusters
    console.log('🗂️ [Blog Intelligence] Step 2: Creating blog clusters...');
    const blogClusters = createBlogClusters(blogIdeas, identity.productName, identity.industry);

    // Step 3: Generate top blog briefs
    console.log('📋 [Blog Intelligence] Step 3: Generating blog briefs...');
    const blogBriefs = generateBlogBriefs(blogIdeas.slice(0, 5));

    // Step 4: Create publishing calendar
    console.log('📅 [Blog Intelligence] Step 4: Creating publishing calendar...');
    const publishingCalendar = createPublishingCalendar(blogIdeas, blogClusters);

    // Compile result
    const result = {
      blogIdeas: blogIdeas || [],
      blogClusters: blogClusters || [],
      blogBriefs: blogBriefs || [],
      publishingCalendar: publishingCalendar || {},
      summary: {
        totalIdeas: blogIdeas?.length || 0,
        totalClusters: blogClusters?.length || 0,
        highPriorityIdeas: blogIdeas?.filter(b => b.priority === 'high').length || 0
      },
      metadata: {
        analyzedAt: new Date().toISOString(),
        hasKeywordData: isDataForSEOConfigured(),
        hasCompetitorData: competitorIntelligence.competitorProfiles?.length > 0,
        hasGeoData: geoIntelligence.geoKeywords?.length > 0,
        message: blogIdeas?.length === 0 ? 'Real blog opportunities unavailable until valid keyword/SERP data is available.' : null
      }
    };

    // Filter out weak DataForSEO topics (e.g., "decoding canva", "canva seo", "pdf decoding canva", "canva seo case")
    const weakTopicPatterns = ['decoding canva', 'canva seo', 'pdf decoding', 'canva seo case', 'canva seo analysis'];
    result.blogIdeas = (result.blogIdeas || []).filter(idea => {
      const title = (idea.title || '').toLowerCase();
      const keyword = (idea.targetKeyword || '').toLowerCase();
      return !weakTopicPatterns.some(pattern => title.includes(pattern) || keyword.includes(pattern));
    });
    result.summary.totalIdeas = result.blogIdeas.length;



    console.log('✅ [Blog Intelligence] Analysis complete:', {
      totalIdeas: result.summary.totalIdeas,
      clusters: result.summary.totalClusters,
      message: result.metadata.message
    });

    return result;

  } catch (error) {
    console.error('❌ [Blog Intelligence] Error:', error);
    return {
      blogIdeas: [],
      blogClusters: [],
      blogBriefs: [],
      publishingCalendar: {},
      summary: { totalIdeas: 0, totalClusters: 0, highPriorityIdeas: 0 },
      metadata: {
        analyzedAt: new Date().toISOString(),
        source: 'Unavailable',
        error: error.message,
        message: 'Blog intelligence unavailable due to processing error'
      }
    };
  }
}

// ============================================
// BLOG IDEAS GENERATION
// ============================================

async function generateBlogIdeas({ keywordIntelligence, competitorIntelligence, geoIntelligence, productName, industry, newsSignals = [], marketSignals = [] }) {
  console.log('💡 [Blog Ideas] Generating blog titles from real data...');
  try {
  const ideas = [];

  // Use only validated keywords (confidence ≥ 70 or from DataForSEO)
  const allKeywords = [
    ...(keywordIntelligence.primaryKeywords || []),
    ...(keywordIntelligence.secondaryKeywords || []),
    ...(keywordIntelligence.longTailKeywords || [])
  ];
  
  if (!allKeywords || allKeywords.length === 0) {
    console.log('⚠️ [Blog Ideas] No keyword data available');
    return ideas;
  }

  console.log(`✅ [Blog Ideas] Using ${allKeywords.length} keywords for blog generation`);

  // Filter to only validated keywords (confidence ≥ 50 or from DataForSEO)
  // Also allow clean category-based seed keywords with lower confidence
  const validatedKeywords = allKeywords.filter(kw => {
    const confidence = kw.confidence || 0;
    const source = kw.source || '';

    // Accept DataForSEO keywords (high confidence by default)
    if (source === 'DataForSEO') return true;

    // Accept keywords with confidence ≥ 50 (lowered from 70)
    if (confidence >= 50) return true;

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
    console.log('⚠️ [Blog Ideas] No validated keywords (confidence ≥ 50 or DataForSEO) available');
    // Fall back to allKeywords if they exist (category seeds, AI-extracted)
    if (allKeywords.length > 0) {
      console.log(`🔄 [Blog Ideas] Falling back to ${allKeywords.length} unvalidated keywords for blog ideas`);
      const validKeywords = allKeywords.filter(kw => {
        const keyword = (kw.keyword || kw || '').toLowerCase().trim();
        if (!keyword || keyword.length < 4) return false;
        const rejectTerms = ['general', 'account', 'semrush', 'whatever', 'tools', 'compare'];
        if (rejectTerms.some(t => keyword.includes(t))) return false;
        const words = keyword.split(' ');
        const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
          'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
          'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this',
          'that', 'these', 'those']);
        if (stopWords.has(words[0]) || stopWords.has(words[words.length - 1])) return false;
        return true;
      });
      
      validKeywords.slice(0, 10).forEach(kw => {
        const keyword = kw.keyword || kw;
        const volume = kw.searchVolume;
        const difficulty = kw.difficulty || kw.keywordDifficulty;
        ideas.push({
          title: generateBlogTitle(keyword, productName, 'informational'),
          targetKeyword: keyword,
          searchVolume: volume,
          keywordDifficulty: difficulty,
          intent: 'informational',
          outline: generateOutline('informational', keyword),
          estimatedTrafficPotential: null,
          source: 'CategorySeed',
          confidence: 55,
          evidence: 'Seed keyword for blog content opportunity',
          internalLinkSuggestions: generateInternalLinks(keyword, productName)
        });
      });
      
      if (ideas.length > 0) {
        console.log(`✅ [Blog Ideas] Generated ${ideas.length} blog ideas from fallback keywords`);
        return ideas.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
      }
    }
    return ideas;
  }
  
  console.log(`✅ [Blog Ideas] Using ${validatedKeywords.length} validated keywords out of ${allKeywords.length} total`);

  // Filter out junk keywords before generating blog ideas
  const validKeywords = validatedKeywords.filter(kw => {
    const keyword = kw.keyword?.toLowerCase().trim();
    if (!keyword) return false;
    
    // Reject concatenated junk keywords (no spaces, camelCase, or all-lowercase word-soup)
    if (/^[a-z]{15,}$/.test(keyword) || /^[a-z]+[A-Z]/.test(keyword) || /^[a-z]{2,}[A-Z]{2,}/.test(keyword)) {
      return false;
    }
    const concatenatedBrandPatterns = ['canva', 'gamma', 'figma', 'notion', 'adobe', 'google'];
    if (concatenatedBrandPatterns.some(p => keyword.includes(p)) && !keyword.includes(' ')) {
      return false;
    }
    
    // Reject tool names, UI words, and generic terms
    const rejectTerms = ['shell', 'clipagent', 'studio', 'assistbot', 'fluxframe', 'motionly', 'whatever', 'what', 'used', 'take', 'google', 'tools', 'compare', 'home', 'about', 'contact', 'services', 'products', 'blog', 'news', 'careers', 'pricing', 'login', 'signup', 'register', 'dashboard', 'profile', 'settings', 'help', 'support', 'faq', 'terms', 'privacy', 'cookie', 'legal', 'sitemap', 'search', 'menu', 'nav', 'header', 'footer', 'sidebar'];
    if (rejectTerms.some(term => keyword.includes(term))) {
      return false;
    }
    
    // Reject very short words
    if (keyword.length < 4) {
      return false;
    }
    
    // Reject single generic words
    const genericWords = ['software', 'system', 'platform', 'service', 'solution', 'tool', 'app', 'product', 'company', 'business', 'team', 'data', 'tech', 'code', 'cloud', 'web', 'site', 'page', 'user', 'client', 'general', 'account', 'semrush'];
    if (keyword.split(' ').length === 1 && genericWords.includes(keyword)) {
      return false;
    }
    
    // Reject stopword-starting or stopword-ending phrases
    const words = keyword.split(' ');
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this',
      'that', 'these', 'those']);
    if (stopWords.has(words[0]) || stopWords.has(words[words.length - 1])) {
      return false;
    }
    
    return true;
  });

  if (validKeywords.length === 0) {
    console.log('⚠️ [Blog Ideas] No valid keywords available after filtering');
    return ideas;
  }

  console.log(`✅ [Blog Ideas] Using ${validKeywords.length} valid keywords out of ${validatedKeywords.length} validated`);

  const keywords = validKeywords || [];

  // Filter out weak keywords that generate generic blog topics
  const weakKeywords = [
    'general', 'account', 'semrush', 'competitors', 'alternatives',
    'strategies', 'best practices', 'platform for', 'for building',
    'gamma app', 'figma com', 'notion com', 'shell', 'studio', 'assistbot'
  ];

  const filteredKeywords = keywords.filter(kw => {
    const keyword = (kw.keyword || kw).toLowerCase();
    return !weakKeywords.includes(keyword) && !weakKeywords.some(weak => keyword.startsWith(weak + ' '));
  });

  // From informational keywords with high volume or seed keywords
  const informationalKeywords = filteredKeywords.filter(kw => {
    const intent = kw.intent || 'informational';
    const volume = kw.searchVolume || 0;
    return intent === 'informational' && (volume > 200 || !volume);
  });

  informationalKeywords.slice(0, 15).forEach(kw => {
    const keyword = kw.keyword || kw;
    const volume = kw.searchVolume;
    const difficulty = kw.difficulty || kw.keywordDifficulty;
    
    if (!isDuplicateKeyword(keyword, ideas)) {
      ideas.push({
        title: generateBlogTitle(keyword, productName, 'informational'),
        targetKeyword: keyword,
        searchVolume: volume,
        keywordDifficulty: difficulty,
        intent: 'informational',
        outline: generateOutline('informational', keyword),
        estimatedTrafficPotential: volume ? Math.round(volume * 0.15) : null,
        source: volume ? 'DataForSEO' : 'Seed Generation',
        confidence: calculateConfidence(volume, difficulty),
        evidence: volume ? `Informational keyword with ${volume} monthly searches` : `Seed informational keyword`,
        internalLinkSuggestions: generateInternalLinks(keyword, productName)
      });
    }
  });

  // From question keywords
  const questionKeywords = filteredKeywords.filter(kw => {
    const keyword = kw.keyword || kw;
    return keyword.startsWith('how') || keyword.startsWith('what') ||
           keyword.startsWith('why') || keyword.startsWith('when') ||
           keyword.includes('?');
  });

  questionKeywords.slice(0, 10).forEach(kw => {
    const keyword = kw.keyword || kw;
    const volume = kw.searchVolume;
    const difficulty = kw.difficulty || kw.keywordDifficulty;
    
    if (!isDuplicateKeyword(keyword, ideas)) {
      ideas.push({
        title: generateBlogTitle(keyword, productName, 'question'),
        targetKeyword: keyword,
        searchVolume: volume,
        keywordDifficulty: difficulty,
        intent: 'informational',
        outline: generateOutline('how-to', keyword),
        estimatedTrafficPotential: volume ? Math.round(volume * 0.2) : null,
        source: 'DataForSEO',
        confidence: calculateConfidence(volume, difficulty),
        evidence: `Question keyword with ${volume} monthly searches`,
        internalLinkSuggestions: generateInternalLinks(keyword, productName)
      });
    }
  });

  // From competitor ranking pages (if available)
  if (competitorIntelligence.competitorProfiles && competitorIntelligence.competitorProfiles.length > 0) {
    competitorIntelligence.competitorProfiles.forEach(comp => {
      if (comp.mainKeywords && comp.mainKeywords.length > 0) {
        comp.mainKeywords.slice(0, 3).forEach(kw => {
          const keyword = typeof kw === 'string' ? kw : kw.keyword || kw;
          const volume = typeof kw === 'object' ? kw.searchVolume : null;
          
          if (!isDuplicateKeyword(keyword, ideas) && keyword.length > 5) {
            ideas.push({
              title: generateBlogTitle(keyword, productName, 'competitor'),
              targetKeyword: keyword,
              searchVolume: volume,
              keywordDifficulty: null,
              intent: 'informational',
              outline: generateOutline('guide', keyword),
              estimatedTrafficPotential: volume ? Math.round(volume * 0.1) : null,
              source: 'SERP',
              confidence: 70,
              evidence: `Competitor ${comp.name} ranks for this keyword`,
              internalLinkSuggestions: generateInternalLinks(keyword, productName)
            });
          }
        });
      }
    });
  }

  // From GEO keywords (if available)
  if (geoIntelligence.geoKeywords && geoIntelligence.geoKeywords.length > 0) {
    geoIntelligence.geoKeywords.slice(0, 10).forEach(geoKw => {
      const question = geoKw.question || geoKw.keyword || geoKw;
      
      if (!isDuplicateKeyword(question, ideas)) {
        ideas.push({
          title: generateBlogTitle(question, productName, 'geo'),
          targetKeyword: question,
          searchVolume: null,
          keywordDifficulty: null,
          intent: 'informational',
          outline: generateOutline('faq-style', question),
          estimatedTrafficPotential: null,
          source: 'GEO',
          confidence: 75,
          evidence: 'AI search question from GEO analysis',
          internalLinkSuggestions: generateInternalLinks(question, productName)
        });
      }
    });
  }

  // From content gaps (if available)
  if (keywordIntelligence.contentOpportunities && keywordIntelligence.contentOpportunities.length > 0) {
    keywordIntelligence.contentOpportunities
      .filter(co => co.impact === 'high' || co.priority === 'high')
      .slice(0, 10)
      .forEach(co => {
        const keyword = co.keyword || co;
        
        if (!isDuplicateKeyword(keyword, ideas)) {
          ideas.push({
            title: generateBlogTitle(keyword, productName, 'gap'),
            targetKeyword: keyword,
            searchVolume: co.searchVolume || null,
            keywordDifficulty: co.difficulty || null,
            intent: co.intent || 'informational',
            outline: generateOutline('guide', keyword),
            estimatedTrafficPotential: co.searchVolume ? Math.round(co.searchVolume * 0.12) : null,
            source: 'DataForSEO',
            confidence: 80,
            evidence: 'High-impact content opportunity from keyword analysis',
            internalLinkSuggestions: generateInternalLinks(keyword, productName)
          });
        }
      });
  }

  console.log(`✅ [Blog Ideas] Generated ${ideas.length} blog ideas from real data`);
  return ideas.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  } catch (blogIdeasError) {
    console.error('❌ [Blog Ideas] Error generating ideas:', blogIdeasError);
    return [];
  }
}

function isDuplicateKeyword(keyword, existingIdeas) {
  const keywordLower = (keyword || '').toLowerCase();
  const safeIdeas = asArray(existingIdeas);
  return safeIdeas.some(idea => 
    (idea.targetKeyword || '').toLowerCase() === keywordLower ||
    (idea.title || '').toLowerCase().includes(keywordLower)
  );
}

function generateBlogTitle(keyword, productName, type) {
  return '';
}

function generateOutline(type, keyword) {
  return [];
}

function generateInternalLinks(keyword, productName) {
  return [];
}

function calculateConfidence(volume, difficulty) {
  if (!volume || !difficulty) return 60;
  if (volume > 1000 && difficulty < 50) return 95;
  if (volume > 500 && difficulty < 70) return 85;
  if (volume > 200) return 75;
  return 65;
}

// ============================================
// BLOG CLUSTERS
// ============================================

function createBlogClusters(blogIdeas, productName, industry) {
  console.log('🗂️ [Blog Clusters] Creating clusters...');
  try {
  const safeIdeas = asArray(blogIdeas);
  if (safeIdeas.length === 0) {
    return [];
  }

  const clusters = {};
  
  safeIdeas.forEach(idea => {
    const keyword = idea.targetKeyword || '';
    const clusterKey = keyword.split(' ')[0].toLowerCase();
    
    if (!clusters[clusterKey]) {
      clusters[clusterKey] = {
        clusterName: clusterKey.charAt(0).toUpperCase() + clusterKey.slice(1),
        topic: clusterKey,
        blogIdeas: [],
        totalVolume: 0,
        avgDifficulty: 0
      };
    }
    
    clusters[clusterKey].blogIdeas.push(idea);
    clusters[clusterKey].totalVolume += idea.searchVolume || 0;
  });

  // Calculate averages
  Object.values(clusters).forEach(cluster => {
    const ideas = asArray(cluster.blogIdeas);
    cluster.avgDifficulty = ideas.reduce((sum, idea) => sum + (idea.keywordDifficulty || 0), 0) / Math.max(ideas.length, 1);
  });

  return Object.values(clusters).slice(0, 10);
  } catch (clusterError) {
    console.error('❌ [Blog Clusters] Error:', clusterError);
    return [];
  }
}

// ============================================
// BLOG BRIEFS
// ============================================

function generateBlogBriefs(blogIdeas) {
  console.log('📋 [Blog Briefs] Generating briefs...');
  try {
  const safeIdeas = asArray(blogIdeas);
  if (safeIdeas.length === 0) {
    return [];
  }

  return safeIdeas.slice(0, 5).map(idea => ({
    title: idea.title,
    targetKeyword: idea.targetKeyword,
    searchVolume: idea.searchVolume,
    keywordDifficulty: idea.keywordDifficulty,
    intent: idea.intent,
    outline: idea.outline,
    estimatedTrafficPotential: idea.estimatedTrafficPotential,
    source: idea.source,
    confidence: idea.confidence,
    evidence: idea.evidence,
    internalLinkSuggestions: idea.internalLinkSuggestions,
    wordCountEstimate: 1500,
    targetAudience: 'Business professionals',
    primaryGoal: 'Educate and convert',
    ctaSuggestion: 'Contact us for a demo'
  }));
  } catch (briefError) {
    console.error('❌ [Blog Briefs] Error:', briefError);
    return [];
  }
}

// ============================================
// PUBLISHING CALENDAR
// ============================================

function createPublishingCalendar(blogIdeas, blogClusters) {
  console.log('📅 [Calendar] Creating publishing calendar...');
  try {
  const safeIdeas = asArray(blogIdeas);
  if (safeIdeas.length === 0) {
    return {};
  }

  return {};
  } catch (calError) {
    console.error('❌ [Calendar] Error:', calError);
    return {};
  }
}



export default {
  generateBlogIntelligence
};
