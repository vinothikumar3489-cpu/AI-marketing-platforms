import { getKeywordMetrics, isDataForSEOConfigured } from '../dataforseo.service.js';
import { isValidKeyword } from '../../utils/text.util.js';
import { asArray } from '../../utils/text.util.js';
import { logEvidenceError } from '../../utils/evidence-logger.js';

// ============================================
// KEYWORD INTELLIGENCE ENGINE
// ============================================

/**
 * Generate comprehensive keyword intelligence
 * @param {Object} params - { websiteData, competitorData, identity, seoIntelligence, orchestratorKeywords }
 * @returns {Object} - Complete keyword intelligence
 */
export async function generateKeywordIntelligence({
  websiteData,
  competitorData = [],
  identity,
  seoIntelligence = null,
  orchestratorKeywords = []
}) {
  console.log('🔍 [Keyword Intelligence] Starting analysis...', { orchestratorKeywordsCount: orchestratorKeywords.length });

  const safeIdentity = identity || {};
  const safeProductName =
    safeIdentity.productName ||
    safeIdentity.brandName ||
    safeIdentity.companyName ||
    'Unknown Product';
  const safeCompanyName =
    safeIdentity.companyName ||
    safeIdentity.brandName ||
    safeProductName;
  const safeIndustry =
    safeIdentity.industry ||
    safeIdentity.category ||
    'Unknown Industry';

  try {
    // Step 1: Use orchestrator keywords if available (verified data)
    let extractedKeywords = { primary: [], secondary: [], longTail: [], questions: [] };
    if (orchestratorKeywords && orchestratorKeywords.length > 0) {
      console.log('📝 [Keyword Intelligence] Using verified keywords from orchestrator');
      const filteredKeywords = filterJunkKeywords(orchestratorKeywords.map(k => ({
        keyword: k.keyword,
        volume: k.volume ?? null,
        cpc: k.cpc ?? null,
        difficulty: k.difficulty ?? null,
        confidence: k.confidence || 50
      })), 'orchestrator');

      extractedKeywords.primary = filteredKeywords.filter(k => k.confidence >= 50).slice(0, 10);
      extractedKeywords.secondary = filteredKeywords.filter(k => k.confidence >= 30 && k.confidence < 50).slice(0, 20);
      extractedKeywords.longTail = filteredKeywords.filter(k => k.confidence < 30).slice(0, 30);
    }

    const hasValidKeywords = extractedKeywords.primary.length > 0 ||
      extractedKeywords.secondary.length > 0 ||
      extractedKeywords.longTail.length > 0;

    if (!hasValidKeywords) {
      console.log('📝 [Keyword Intelligence] No valid orchestrator keywords, extracting from website...');
      extractedKeywords = await extractKeywordsFromWebsite({
        websiteData,
        identity: safeIdentity,
        productName: safeProductName,
        companyName: safeCompanyName,
        industry: safeIndustry
      });
    }

    // Step 2: Build clusters if we have keywords
    const clusters = hasValidKeywords
      ? await generateTopicClusters(extractedKeywords, safeProductName)
      : [];

    const result = {
      primaryKeywords: markAsTopicIdeas(extractedKeywords.primary || []),
      secondaryKeywords: markAsTopicIdeas(extractedKeywords.secondary || []),
      longTailKeywords: markAsTopicIdeas(extractedKeywords.longTail || []),
      questionKeywords: markAsTopicIdeas(extractedKeywords.questions || []),
      clusters: clusters || [],
      competitorKeywords: [],
      contentOpportunities: [],
      geoKeywords: [],
      metadata: {
        totalKeywords:
          (extractedKeywords.primary?.length || 0) +
          (extractedKeywords.secondary?.length || 0) +
          (extractedKeywords.longTail?.length || 0),
        clustersCount: clusters?.length || 0,
        opportunitiesCount: 0,
        analyzedAt: new Date().toISOString(),
        dataForSeoConfigured: isDataForSEOConfigured(),
      }
    };

    // Step 3: Enrich with DataForSEO metrics if configured
    if (isDataForSEOConfigured() && hasValidKeywords) {
      await enrichWithDataForSEO(result, extractedKeywords);
    }

    const normalizedResult = normalizeKeywordBuckets(result, safeIdentity);

    console.log('✅ [Keyword Intelligence] Analysis complete:', {
      totalKeywords: normalizedResult.metadata.totalKeywords,
      primary: normalizedResult.primaryKeywords.length,
      secondary: normalizedResult.secondaryKeywords.length,
      longTail: normalizedResult.longTailKeywords.length,
      dataForSeoConfigured: isDataForSEOConfigured(),
    });

    return normalizedResult;

  } catch (error) {
    logEvidenceError("keywordIntelligence", null, error);
    return {
      primaryKeywords: [],
      secondaryKeywords: [],
      longTailKeywords: [],
      questionKeywords: [],
      clusters: [],
      competitorKeywords: [],
      contentOpportunities: [],
      geoKeywords: [],
      metadata: {
        totalKeywords: 0,
        clustersCount: 0,
        opportunitiesCount: 0,
        analyzedAt: new Date().toISOString(),
        message: 'Keyword intelligence unavailable due to processing error',
        source: 'Unavailable',
        error: error.message
      }
    };
  }
}

function markAsTopicIdeas(keywords) {
  return keywords.map(k => ({
    keyword: k.keyword || k,
    searchVolume: null,
    keywordDifficulty: null,
    cpc: null,
    competition: null,
    source: k.source || 'topic_idea_only',
    confidence: k.confidence || null,
    metricType: 'topic_idea_only',
    label: 'topic idea only',
    intent: k.intent || null,
  }));
}

async function enrichWithDataForSEO(result, extractedKeywords) {
  try {
    console.log('🔍 [Keyword Intelligence] Enriching with DataForSEO metrics...');
    const allKeywords = [
      ...(extractedKeywords.primary || []).map(k => k.keyword),
      ...(extractedKeywords.secondary || []).map(k => k.keyword),
      ...(extractedKeywords.longTail || []).map(k => k.keyword),
      ...(extractedKeywords.questions || []).map(k => k.keyword),
    ].filter(Boolean);

    if (allKeywords.length === 0) return;

    const metricsResult = await getKeywordMetrics(allKeywords, 'United States', 'English');

    if (metricsResult.success && metricsResult.data) {
      const metricsMap = new Map(metricsResult.data.map(m => [m.keyword.toLowerCase(), m]));

      const enrichKeyword = (kw) => {
        const metrics = metricsMap.get(kw.keyword?.toLowerCase());
        return {
          ...kw,
          searchVolume: metrics?.volume ?? null,
          keywordDifficulty: metrics?.keywordDifficulty ?? null,
          cpc: metrics?.cpc ?? null,
          competition: metrics?.competition ?? null,
          source: metrics?.source || 'verified',
          confidence: metrics?.confidence || null,
          metricType: metrics ? 'verified_keyword_metric' : 'topic_idea_only',
          label: metrics ? 'verified keyword metric' : 'topic idea only',
        };
      };

      result.primaryKeywords = result.primaryKeywords.map(enrichKeyword);
      result.secondaryKeywords = result.secondaryKeywords.map(enrichKeyword);
      result.longTailKeywords = result.longTailKeywords.map(enrichKeyword);
      result.questionKeywords = result.questionKeywords.map(enrichKeyword);
    }
  } catch (err) {
    logEvidenceError("keywordIntelligence.enrich", null, err);
  }
}

// ============================================
// KEYWORD EXTRACTION FROM WEBSITE
// ============================================

const JUNK_KEYWORDS = new Set([
  'custom', 'business', 'systems', 'built', 'everything', 'design', 'services', 'right', 'before', 'whatever', 'take', 'used', 'use', 'using', 'make', 'made', 'get', 'got', 'see', 'seen', 'look', 'looking', 'find', 'found', 'need', 'needs', 'want', 'wants', 'like', 'likes', 'love', 'loves', 'best', 'better', 'good', 'great', 'top', 'high', 'low', 'free', 'premium', 'plan', 'plans', 'month', 'monthly', 'year', 'yearly', 'day', 'daily', 'week', 'weekly', 'price', 'pricing', 'cost', 'costs', 'cheap', 'expensive', 'affordable', 'quality', 'professional', 'expert', 'experts', 'team', 'teams', 'company', 'companies', 'world', 'global', 'international', 'local', 'online', 'web', 'website', 'websites', 'site', 'sites', 'page', 'pages', 'home', 'about', 'contact', 'info', 'information', 'help', 'support', 'service', 'services', 'product', 'products', 'solution', 'solutions', 'tool', 'tools', 'software', 'softwares', 'app', 'apps', 'application', 'applications', 'system', 'systems', 'platform', 'platforms', 'technology', 'technologies', 'tech', 'digital', 'data', 'management', 'manager', 'managers', 'development', 'developer', 'developers', 'create', 'creating', 'created', 'build', 'building', 'built', 'provide', 'providing', 'provided', 'offer', 'offering', 'offered', 'feature', 'features', 'benefit', 'benefits', 'advantage', 'advantages', 'value', 'values', 'result', 'results', 'success', 'successful', 'work', 'working', 'worked', 'time', 'times', 'way', 'ways', 'thing', 'things', 'something', 'nothing', 'anything', 'everything', 'someone', 'anyone', 'everyone', 'any', 'all', 'some', 'most', 'many', 'much', 'more', 'less', 'few', 'little', 'big', 'small', 'large', 'huge', 'tiny', 'new', 'old', 'latest', 'recent', 'current', 'modern', 'simple', 'easy', 'hard', 'difficult', 'complex', 'fast', 'quick', 'slow', 'secure', 'safe', 'reliable', 'trusted', 'leading', 'major', 'main', 'primary', 'secondary', 'important', 'essential', 'key', 'core', 'basic', 'advanced', 'complete', 'full', 'partial', 'total', 'absolute', 'relative', 'specific', 'general', 'common', 'typical', 'standard', 'normal', 'regular', 'popular', 'famous', 'known', 'unknown', 'various', 'multiple', 'several', 'different', 'unique', 'special', 'particular', 'individual', 'separate', 'single', 'double', 'triple', 'multiple', 'average', 'standard', 'typical', 'usual', 'regular'
]);

function filterJunkKeywords(keywords, source = 'unknown') {
  return keywords.filter(kw => {
    const keyword = typeof kw === 'string' ? kw : kw.keyword;
    if (!keyword) return false;

    const lowerKeyword = keyword.toLowerCase().trim();
    const junkPatterns = [
      'canva\'s', 'templates', 'designing', 'design',
      'undefined', 'account', 'semrush', 'general',
      'homepage', 'url', 'self link', 'page title', 'meta title',
      'month', 'year', 'day', 'week'
    ];

    if (/^\[/.test(lowerKeyword)) return false;
    if (junkPatterns.includes(lowerKeyword)) return false;
    if (lowerKeyword.includes(':') && lowerKeyword.split(':')[0].trim().length > 0) return false;
    if (lowerKeyword.includes('homepage') || lowerKeyword.includes('url') ||
        lowerKeyword.includes('social profile') || lowerKeyword.includes('self link') ||
        lowerKeyword.includes('instagram') || lowerKeyword.includes('title') ||
        lowerKeyword.includes('facebook') || lowerKeyword.includes('twitter') ||
        lowerKeyword.includes('linkedin') || lowerKeyword.includes('youtube')) return false;
    if (lowerKeyword.includes("'s") || lowerKeyword.includes("'")) return false;
    if (lowerKeyword.includes('http') || lowerKeyword.includes('www.') || lowerKeyword.includes('.com') ||
        lowerKeyword.includes('.me/') || lowerKeyword.includes('.app') || lowerKeyword.includes('.io')) return false;
    if (/^[a-z]{15,}$/.test(lowerKeyword) || /^[a-z]+[A-Z][a-z]/.test(lowerKeyword)) return false;
    if (/^[\d,+.$\-‰%]+$/.test(keyword.trim())) return false;

    const wordCount = keyword.split(' ').length;
    if (wordCount === 1 && JUNK_KEYWORDS.has(lowerKeyword)) return false;
    if (wordCount > 8) return false;

    if (!isValidKeyword(keyword)) return false;

    return true;
  }).map(kw => {
    if (typeof kw === 'string') {
      return {
        keyword: kw,
        volume: null,
        keywordDifficulty: null,
        cpc: null,
        source: source,
        confidence: source === 'category_seeds' ? 70 : 40
      };
    }
    return {
      ...kw,
      volume: kw.volume ?? null,
      keywordDifficulty: kw.keywordDifficulty ?? null,
      cpc: kw.cpc ?? null,
      source: kw.source || source,
      confidence: kw.confidence || (source === 'category_seeds' ? 70 : 40)
    };
  });
}

async function extractKeywordsFromWebsite({
  websiteData,
  identity = {},
  productName = '',
  companyName = '',
  industry = ''
}) {
  console.log('📊 [Keyword Extraction] Analyzing website content...');

  const text = websiteData.text || '';
  const title = websiteData.metadata?.title || '';
  const description = websiteData.metadata?.description || '';
  const h1 = websiteData.h1?.[0] || '';
  
  const allText = `${title}\n${description}\n${h1}\n${text.substring(0, 3000)}`;

  // Detect product category from content
  const detectCategory = () => {
    const content = allText.toLowerCase();

    if (content.includes('canva') || (content.includes('graphic design') && content.includes('social media'))) return 'canva';
    if (content.includes('gamma') || (content.includes('ai presentation') && (content.includes('maker') || content.includes('tool')))) return 'gamma';
    if (content.includes('figma') || (content.includes('design') && (content.includes('prototyp') || content.includes('collaborat') || content.includes('ui') || content.includes('ux')))) return 'figma';
    if (content.includes('notion') || content.includes('workspace') || content.includes('productivity') || content.includes('wiki') || content.includes('knowledge base')) return 'notion';
    if (content.includes('orkyn') || content.includes('software development') || content.includes('erp') || content.includes('salesforce') || content.includes('crm') || content.includes('custom software') || content.includes('consulting')) return 'orkyn';
    return 'general';
  };

  const category = detectCategory();

  // Category-based topic ideas (no fake metrics)
  const categoryTopicIdeas = {
    canva: ['graphic design tool', 'online design platform', 'AI design tool', 'presentation maker', 'social media design tool', 'logo maker', 'brand kit software', 'Canva alternatives', 'Canva pricing', 'Canva vs Adobe Express'],
    gamma: ['AI presentation maker', 'AI presentation tool', 'presentation software', 'Gamma alternatives', 'Gamma vs Canva', 'AI website builder', 'slide deck generator'],
    figma: ['collaborative design tool', 'UI design software', 'UX design tool', 'design prototyping tool', 'design system tool', 'Figma alternatives'],
    notion: ['productivity workspace', 'project management tool', 'Notion alternatives', 'team wiki software', 'knowledge base software'],
    orkyn: ['custom software development', 'ERP consulting', 'Salesforce consulting', 'business automation', 'CRM integration services'],
    general: ['software solution', 'business tool', 'productivity software', 'collaboration platform']
  };
  
  const topicIdeas = categoryTopicIdeas[category] || [];

  // Try AI extraction with GROQ
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (GROQ_API_KEY) {
    try {
      const prompt = `Extract topic ideas and keyword phrases from this website content for "${productName}" in "${industry}" industry.

Website Content:
${allText}

Return ONLY valid JSON:
{
  "primary": ["keyword1", "keyword2"],
  "secondary": ["keyword3", "keyword4"],
  "longTail": ["keyword5", "keyword6"],
  "questions": ["question1", "question2"]
}

Rules:
- DO NOT generate fake search volume, difficulty, CPC, or competition metrics
- DO NOT return generic terms like "software", "business", "platform", "solution"
- DO NOT return the product name alone
- Return topic ideas only — all metrics will be null
- Max 5 per category`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: 'You are an SEO specialist. Return valid JSON only. Never generate fake metrics.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const parsed = JSON.parse(data.choices[0].message.content);
        if (parsed.primary || parsed.secondary) {
          return {
            primary: (parsed.primary || []).map(k => ({ keyword: k, source: 'ai_extracted', confidence: 50 })),
            secondary: (parsed.secondary || []).map(k => ({ keyword: k, source: 'ai_extracted', confidence: 40 })),
            longTail: (parsed.longTail || []).map(k => ({ keyword: k, source: 'ai_extracted', confidence: 35 })),
            questions: (parsed.questions || []).map(k => ({ keyword: k, source: 'ai_extracted', confidence: 40 })),
          };
        }
      }
    } catch (e) {
      console.log('⚠️ [Keyword Extraction] AI extraction failed:', e.message);
    }
  }

  // Fallback: return topic ideas from category (no fake metrics)
  console.log('⚠️ [Keyword Extraction] Using category-based topic ideas');

  const result = {
    primary: topicIdeas.slice(0, 5).map(k => ({ keyword: k, source: 'topic_idea', confidence: 40 })),
    secondary: topicIdeas.slice(5, 10).map(k => ({ keyword: k, source: 'topic_idea', confidence: 35 })),
    longTail: topicIdeas.slice(10, 15).map(k => ({ keyword: k, source: 'topic_idea', confidence: 30 })),
    questions: [],
  };

  return result;
}

// ============================================
// TOPIC CLUSTERS
// ============================================

async function generateTopicClusters(extracted, productName) {
  console.log('🗂️ [Clustering] Creating topic clusters...');

  const allKeywords = [
    ...(extracted.primary || []).map(k => k.keyword),
    ...(extracted.secondary || []).map(k => k.keyword),
    ...(extracted.longTail || []).map(k => k.keyword)
  ].filter(Boolean).slice(0, 20);

  if (allKeywords.length < 2) return [];

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (GROQ_API_KEY) {
    try {
      const prompt = `Group these topics for "${productName}" into 1-3 clusters:
${allKeywords.join(', ')}

Return ONLY valid JSON:
[{"name": "cluster name", "keywords": ["kw1", "kw2"], "priority": 1}]`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: 'Return valid JSON only.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const result = JSON.parse(data.choices[0].message.content);
        const clusters = Array.isArray(result) ? result : (result.clusters || []);
        return clusters.slice(0, 3);
      }
    } catch (error) {
      console.log('⚠️ [Clustering] AI clustering failed:', error.message);
    }
  }

  // Simple rule-based clustering
  if (allKeywords.length >= 2) {
    return [{
      name: `${productName} Topics`,
      keywords: allKeywords.slice(0, 8),
      priority: 1,
    }];
  }

  return [];
}

// ============================================
// BUCKET NORMALIZATION
// ============================================

function normalizeKeywordBuckets(result, identity) {
  const safe = { ...result };
  safe.primaryKeywords = asArray(safe.primaryKeywords);
  safe.secondaryKeywords = asArray(safe.secondaryKeywords);
  safe.longTailKeywords = asArray(safe.longTailKeywords);
  safe.questionKeywords = asArray(safe.questionKeywords);

  if (safe.primaryKeywords.length === 0 && safe.secondaryKeywords.length > 0) {
    safe.primaryKeywords = safe.secondaryKeywords.slice(0, 5);
    safe.secondaryKeywords = safe.secondaryKeywords.slice(5);
  }

  safe.metadata = {
    totalKeywords: safe.primaryKeywords.length + safe.secondaryKeywords.length + safe.longTailKeywords.length,
    clustersCount: asArray(safe.clusters).length,
    opportunitiesCount: asArray(safe.contentOpportunities).length,
    analyzedAt: new Date().toISOString(),
    dataForSeoConfigured: isDataForSEOConfigured(),
  };

  return safe;
}
