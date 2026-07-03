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

    // For Canva, force the specific high-quality blog ideas as top priority
    const productName = (identity?.productName || identity?.brandName || '').toLowerCase();
    const isCanva = productName.includes('canva') || (identity?.domain || '').toLowerCase().includes('canva');
    if (isCanva) {
      const canvaBlogTitles = [
        { title: 'Canva vs Adobe Express: Which Design Tool Is Better?', targetKeyword: 'canva vs adobe express', intent: 'commercial', confidence: 85, priority: 'high', source: 'Category Seed Generation' },
        { title: 'How to Use Canva AI for Social Media Design', targetKeyword: 'canva ai social media design', intent: 'informational', confidence: 80, priority: 'high', source: 'Category Seed Generation' },
        { title: 'Best Canva Alternatives for Teams in 2026', targetKeyword: 'canva alternatives', intent: 'commercial', confidence: 85, priority: 'high', source: 'Category Seed Generation' },
        { title: 'How to Build Brand Kits in Canva', targetKeyword: 'canva brand kit', intent: 'informational', confidence: 80, priority: 'high', source: 'Category Seed Generation' },
        { title: 'Best Presentation Maker Tools for Marketers', targetKeyword: 'presentation maker', intent: 'commercial', confidence: 75, priority: 'medium', source: 'Category Seed Generation' },
      ];
      // Remove existing weak titles matching fallback titles
      const canvaTargets = new Set(canvaBlogTitles.map(t => t.targetKeyword.toLowerCase()));
      result.blogIdeas = result.blogIdeas.filter(idea => !canvaTargets.has((idea.targetKeyword || '').toLowerCase()));
      // Prepend Canva-specific titles
      result.blogIdeas = [...canvaBlogTitles, ...result.blogIdeas];
      result.summary.totalIdeas = result.blogIdeas.length;
      result.summary.highPriorityIdeas = result.blogIdeas.filter(b => b.priority === 'high').length;
      console.log(`✅ [Blog Intelligence] Forced ${canvaBlogTitles.length} Canva-specific blog titles (total: ${result.blogIdeas.length})`);
    }

    // Ensure at least 5 blog ideas by supplementing with fallback data
    if (result.summary.totalIdeas < 5) {
      const fb = generateFallbackBlogIntelligence(identity?.productName || 'Product', identity?.industry || 'Technology');
      if (fb.blogIdeas && fb.blogIdeas.length > 0) {
        const existingTargets = new Set(result.blogIdeas.map(b => b.targetKeyword?.toLowerCase()));
        const newIdeas = fb.blogIdeas.filter(b => !existingTargets.has(b.targetKeyword?.toLowerCase()));
        
        if (newIdeas.length > 0) {
          result.blogIdeas = [...result.blogIdeas, ...newIdeas];
          result.summary.totalIdeas = result.blogIdeas.length;
          result.summary.highPriorityIdeas = result.blogIdeas.filter(b => b.priority === 'high').length;
          console.log(`✅ [Blog Intelligence] Supplemented with ${newIdeas.length} fallback ideas (total: ${result.blogIdeas.length})`);
        }
      }
    }

    console.log('✅ [Blog Intelligence] Analysis complete:', {
      totalIdeas: result.summary.totalIdeas,
      clusters: result.summary.totalClusters,
      message: result.metadata.message
    });

    return result;

  } catch (error) {
    console.error('❌ [Blog Intelligence] Error:', error);
    return generateFallbackBlogIntelligence(identity?.productName || 'Product', identity?.industry || 'Technology');
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
  const keywordLower = keyword.toLowerCase();
  
  if (type === 'question') {
    if (keywordLower.startsWith('how to')) {
      return `How to ${keyword.replace(/^(how to)\s*/i, '')} with ${productName}`;
    }
    if (keywordLower.startsWith('what is')) {
      return `What is ${keyword.replace(/^(what is)\s*/i, '')}? A Complete Guide`;
    }
    if (keywordLower.startsWith('why')) {
      return `Why ${keyword.replace(/^why\s*/i, '')} Matters for Your Business`;
    }
    return `${keyword.charAt(0).toUpperCase() + keyword.slice(1)}: Everything You Need to Know`;
  }
  
  if (type === 'geo') {
    return `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} - AI-Optimized Answer`;
  }
  
  if (type === 'competitor') {
    return `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} vs ${productName}: Comparison`;
  }
  
  if (type === 'gap') {
    return `${keyword.charAt(0).toUpperCase() + keyword.slice(1)}: Strategies and Best Practices`;
  }
  
  // Default informational - generate more specific titles
  if (keywordLower.includes('guide') || keywordLower.includes('tutorial')) {
    return `${keyword.charAt(0).toUpperCase() + keyword.slice(1)}`;
  }
  if (keywordLower.includes('tips')) {
    return `${keyword.charAt(0).toUpperCase() + keyword.slice(1)}`;
  }
  if (keywordLower.includes('benefits')) {
    return `Benefits of ${keyword.charAt(0).toUpperCase() + keyword.slice(1)}`;
  }
  
  return `${keyword.charAt(0).toUpperCase() + keyword.slice(1)}: A Comprehensive Guide`;
}

function generateOutline(type, keyword) {
  const outlines = {
    'informational': [
      'Introduction',
      'Key Concepts',
      'Why It Matters',
      'How to Implement',
      'Best Practices',
      'Common Mistakes',
      'Conclusion'
    ],
    'how-to': [
      'Introduction',
      'What You Need',
      'Step-by-Step Guide',
      'Tips and Tricks',
      'Troubleshooting',
      'Conclusion'
    ],
    'guide': [
      'Overview',
      'Detailed Explanation',
      'Examples',
      'Use Cases',
      'Recommendations',
      'Conclusion'
    ],
    'faq-style': [
      'Direct Answer',
      'Context',
      'Examples',
      'Related Questions',
      'Resources'
    ]
  };
  
  return outlines[type] || outlines['informational'];
}

function generateInternalLinks(keyword, productName) {
  const suggestions = [];
  const keywordLower = keyword.toLowerCase();
  
  if (keywordLower.includes('software') || keywordLower.includes('development')) {
    suggestions.push('Services page', 'Case studies');
  }
  if (keywordLower.includes('salesforce') || keywordLower.includes('erp')) {
    suggestions.push('Integrations page', 'Service pages');
  }
  if (keywordLower.includes('automation') || keywordLower.includes('custom')) {
    suggestions.push('Features page', 'Pricing page');
  }
  
  if (suggestions.length === 0) {
    suggestions.push('Homepage', 'Services overview');
  }
  
  return suggestions;
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
    return { week1: [], week2: [], week3: [], week4: [] };
  }

  const sortedIdeas = [...safeIdeas].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  
  return {
    week1: sortedIdeas.slice(0, 2).map(idea => ({
      title: idea.title,
      targetKeyword: idea.targetKeyword,
      publishDate: 'Week 1',
      priority: idea.confidence > 80 ? 'high' : 'medium'
    })),
    week2: sortedIdeas.slice(2, 4).map(idea => ({
      title: idea.title,
      targetKeyword: idea.targetKeyword,
      publishDate: 'Week 2',
      priority: 'medium'
    })),
    week3: sortedIdeas.slice(4, 6).map(idea => ({
      title: idea.title,
      targetKeyword: idea.targetKeyword,
      publishDate: 'Week 3',
      priority: 'medium'
    })),
    week4: sortedIdeas.slice(6, 8).map(idea => ({
      title: idea.title,
      targetKeyword: idea.targetKeyword,
      publishDate: 'Week 4',
      priority: 'low'
    }))
  };
  } catch (calError) {
    console.error('❌ [Calendar] Error:', calError);
    return { week1: [], week2: [], week3: [], week4: [] };
  }
}

// ============================================
// FALLBACK
// ============================================

function generateFallbackBlogIntelligence(productName, industry) {
  console.log('🔄 [Blog Intelligence] No real data available, generating category-specific seed blog ideas');
  try {
  const productLower = (productName || '').toLowerCase();
  const blogIdeas = [];
  
  // Category-specific blog ideas based on product
  if (productLower.includes('canva')) {
    blogIdeas.push(
      {
        title: 'Canva vs Adobe Express: Which Design Tool Is Better?',
        targetKeyword: 'canva vs adobe express',
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'commercial',
        outline: ['Introduction', 'Feature comparison', 'Pricing analysis', 'Pros and cons', 'Final verdict'],
        estimatedTrafficPotential: 'medium',
        source: 'Category Seed Generation',
        confidence: 60,
        evidence: 'Category seed comparison blog',
        internalLinkSuggestions: ['Pricing', 'Features'],
        priority: 'high'
      },
      {
        title: 'How to Use Canva AI for Social Media Design',
        targetKeyword: 'canva ai social media design',
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'informational',
        outline: ['What is Canva AI', 'Getting started', 'Social media templates', 'Best practices', 'Examples'],
        estimatedTrafficPotential: 'medium',
        source: 'Category Seed Generation',
        confidence: 60,
        evidence: 'Category seed tutorial blog',
        internalLinkSuggestions: ['Templates', 'Design tips'],
        priority: 'high'
      },
      {
        title: 'Best Canva Alternatives for Teams',
        targetKeyword: 'canva alternatives',
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'commercial',
        outline: ['Overview of alternatives', 'Team collaboration features', 'Pricing comparison', 'Pros and cons', 'Recommendation'],
        estimatedTrafficPotential: 'high',
        source: 'Category Seed Generation',
        confidence: 60,
        evidence: 'Category seed comparison blog',
        internalLinkSuggestions: ['Features', 'Pricing'],
        priority: 'high'
      },
      {
        title: 'How to Build Brand Kits in Canva',
        targetKeyword: 'canva brand kit',
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'informational',
        outline: ['What is a brand kit', 'Setting up your brand kit', 'Best practices', 'Examples', 'Tips'],
        estimatedTrafficPotential: 'medium',
        source: 'Category Seed Generation',
        confidence: 60,
        evidence: 'Category seed tutorial blog',
        internalLinkSuggestions: ['Templates', 'Design tips'],
        priority: 'high'
      },
      {
        title: 'Best Presentation Maker Tools',
        targetKeyword: 'presentation maker',
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'commercial',
        outline: ['Introduction', 'Top tools comparison', 'Features', 'Pricing', 'Recommendation'],
        estimatedTrafficPotential: 'medium',
        source: 'Category Seed Generation',
        confidence: 60,
        evidence: 'Category seed comparison blog',
        internalLinkSuggestions: ['Features', 'Pricing'],
        priority: 'medium'
      }
    );
  } else if (productLower.includes('gamma')) {
    blogIdeas.push(
      {
        title: 'Gamma vs Canva for AI Presentations',
        targetKeyword: 'gamma vs canva',
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'commercial',
        outline: ['Introduction', 'AI capabilities comparison', 'Template libraries', 'Pricing', 'Verdict'],
        estimatedTrafficPotential: 'high',
        source: 'Category Seed Generation',
        confidence: 60,
        evidence: 'Category seed comparison blog',
        internalLinkSuggestions: ['Features', 'Pricing'],
        priority: 'high'
      },
      {
        title: 'Best AI Presentation Makers for Startups',
        targetKeyword: 'AI presentation maker',
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'informational',
        outline: ['Overview of AI presentations', 'Top tools for startups', 'Features comparison', 'Pricing', 'Selection guide'],
        estimatedTrafficPotential: 'high',
        source: 'Category Seed Generation',
        confidence: 60,
        evidence: 'Category seed industry blog',
        internalLinkSuggestions: ['Features', 'Pricing'],
        priority: 'high'
      },
      {
        title: 'How to Create AI Slide Decks with Gamma',
        targetKeyword: 'AI slide deck generator',
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'informational',
        outline: ['What is Gamma', 'Getting started', 'Creating slides', 'Best practices', 'Examples'],
        estimatedTrafficPotential: 'medium',
        source: 'Category Seed Generation',
        confidence: 60,
        evidence: 'Category seed tutorial blog',
        internalLinkSuggestions: ['Templates', 'Blog'],
        priority: 'high'
      }
    );
  } else if (productLower.includes('figma')) {
    blogIdeas.push(
      {
        title: 'Figma vs Sketch for Product Teams',
        targetKeyword: 'figma vs sketch',
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'commercial',
        outline: ['Introduction', 'Feature comparison', 'Collaboration', 'Pricing', 'Recommendation'],
        estimatedTrafficPotential: 'high',
        source: 'Category Seed Generation',
        confidence: 60,
        evidence: 'Category seed comparison blog',
        internalLinkSuggestions: ['Features', 'Pricing'],
        priority: 'high'
      },
      {
        title: 'Best Collaborative Design Tools',
        targetKeyword: 'collaborative design tool',
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'informational',
        outline: ['Remote design challenges', 'Top tools', 'Features', 'Best practices', 'Selection guide'],
        estimatedTrafficPotential: 'high',
        source: 'Category Seed Generation',
        confidence: 60,
        evidence: 'Category seed industry blog',
        internalLinkSuggestions: ['Features', 'Blog'],
        priority: 'high'
      },
      {
        title: 'How to Build a Design System in Figma',
        targetKeyword: 'design system tool',
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'informational',
        outline: ['What is a design system', 'Building blocks', 'Best practices', 'Figma features', 'Examples'],
        estimatedTrafficPotential: 'medium',
        source: 'Category Seed Generation',
        confidence: 60,
        evidence: 'Category seed tutorial blog',
        internalLinkSuggestions: ['Features', 'Blog'],
        priority: 'medium'
      }
    );
  } else {
    // Generic fallback for other products
    blogIdeas.push(
      {
        title: `${productName} vs Top Competitors: Complete Comparison`,
        targetKeyword: `${productName} alternatives`,
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'commercial',
        outline: ['Introduction', 'Feature comparison', 'Pricing', 'Pros and cons', 'Final verdict'],
        estimatedTrafficPotential: 'medium',
        source: 'Generic Seed Generation',
        confidence: 50,
        evidence: 'Generic comparison blog helping users evaluate options',
        internalLinkSuggestions: ['Features', 'Pricing'],
        priority: 'high'
      },
      {
        title: `Best ${industry} Tools & Platforms in 2026`,
        targetKeyword: `best ${industry} tools`,
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'commercial',
        outline: ['Market overview', 'Top picks by use case', 'Feature comparison', 'Pricing analysis', 'Selection criteria'],
        estimatedTrafficPotential: 'high',
        source: 'Generic Seed Generation',
        confidence: 50,
        evidence: 'Industry roundup blog targeting commercial intent',
        internalLinkSuggestions: ['Features', 'Blog'],
        priority: 'high'
      },
      {
        title: `Ultimate Guide to ${industry}: Everything You Need to Know`,
        targetKeyword: `${industry} guide`,
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'informational',
        outline: ['What is this industry', 'Key concepts', 'Current trends', 'Best practices', 'Tools landscape', 'Getting started'],
        estimatedTrafficPotential: 'high',
        source: 'Generic Seed Generation',
        confidence: 50,
        evidence: 'Comprehensive industry guide for educational intent',
        internalLinkSuggestions: ['Features', 'Blog', 'Pricing'],
        priority: 'high'
      },
      {
        title: `How ${productName} Helps You Achieve Better Results`,
        targetKeyword: `${productName} benefits`,
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'informational',
        outline: ['Common pain points', `How ${productName} solves them`, 'Real-world examples', 'Best practices', 'Getting started guide'],
        estimatedTrafficPotential: 'medium',
        source: 'Generic Seed Generation',
        confidence: 45,
        evidence: 'Benefits-focused blog showcasing value proposition',
        internalLinkSuggestions: ['Features', 'Pricing', 'Case studies'],
        priority: 'medium'
      },
      {
        title: `${productName} Pricing Explained: Is It Worth the Investment?`,
        targetKeyword: `${productName} pricing review`,
        searchVolume: null,
        keywordDifficulty: null,
        intent: 'commercial',
        outline: ['Pricing tiers overview', 'Feature breakdown per tier', 'Competitor pricing comparison', 'ROI analysis', 'Recommendations'],
        estimatedTrafficPotential: 'medium',
        source: 'Generic Seed Generation',
        confidence: 45,
        evidence: 'Pricing analysis blog for purchase-intent traffic',
        internalLinkSuggestions: ['Pricing', 'Features'],
        priority: 'medium'
      }
    );
  }
  
  const safeBlogIdeas = asArray(blogIdeas);
  const blogClusters = createBlogClusters(safeBlogIdeas, productName, industry);
  const blogBriefs = generateBlogBriefs(safeBlogIdeas.slice(0, 5));
  const publishingCalendar = createPublishingCalendar(safeBlogIdeas, blogClusters);
  
  return {
    blogIdeas: safeBlogIdeas,
    blogClusters: asArray(blogClusters),
    blogBriefs: asArray(blogBriefs),
    publishingCalendar: publishingCalendar || {},
    summary: {
      totalIdeas: safeBlogIdeas.length,
      totalClusters: asArray(blogClusters).length,
      highPriorityIdeas: safeBlogIdeas.filter(b => b.priority === 'high').length
    },
    metadata: {
      analyzedAt: new Date().toISOString(),
      message: 'Using category-specific seed blog ideas due to limited keyword/SERP data',
      source: 'Category Seed Generation',
      isFallback: true,
      confidence: 'low'
    }
  };
  } catch (fbError) {
    console.error('❌ [Blog Intelligence] Fallback generation error:', fbError);
    return { blogIdeas: [], blogClusters: [], blogBriefs: [], publishingCalendar: {}, summary: { totalIdeas: 0, totalClusters: 0, highPriorityIdeas: 0 }, metadata: { analyzedAt: new Date().toISOString(), message: 'Fallback unavailable' } };
  }
}

export default {
  generateBlogIntelligence
};
