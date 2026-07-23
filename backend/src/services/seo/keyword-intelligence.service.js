import { getKeywordMetrics, isDataForSEOConfigured } from "../../providers/dataforseo.service.js";
import { isValidKeyword } from "../../utils/text.util.js";
import { asArray } from "../../utils/text.util.js";
import { logEvidenceError } from "../../utils/evidence-logger.js";

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
    confidence: null,
    metricType: 'topic_idea_only',
    label: 'topic idea only',
    intent: null,
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

const CORRUPTION_PATTERNS = [
  /^undefined$/i,
  /^null$/i,
  /^\[object object\]$/i,
  /^\[.*image.*\]/i,
  /!\[.*\]/,
  /^\[.*\]$/,
  /^[.!?,\-:;]+$/,
  /^[0-9+\-.,%]+$/,
  /^[a-z]$/i,
];

function isCorruptedKeyword(keyword) {
  if (!keyword || typeof keyword !== 'string') return true;
  if (keyword.length < 2) return true;
  const trimmed = keyword.trim();
  if (trimmed.length < 2) return true;
  if (CORRUPTION_PATTERNS.some(p => p.test(trimmed))) return true;
  if (trimmed.includes('undefined') || trimmed.includes('null')) return true;
  const nonAlpha = trimmed.replace(/[a-zA-Z0-9\s\-&'.,#+]/g, '');
  if (nonAlpha.length > trimmed.length * 0.3) return true;
  return false;
}

function filterJunkKeywords(keywords, source = 'unknown') {
  return keywords.filter(kw => {
    const keyword = typeof kw === 'string' ? kw : kw.keyword;
    if (!keyword) return false;

    const lowerKeyword = keyword.toLowerCase().trim();
    const junkPatterns = [
      'canva\'s', 'templates', 'designing', 'design',
      'undefined', 'account', 'semrush', 'general',
      'homepage', 'url', 'self link', 'page title', 'meta title',
      'month', 'year', 'day', 'week',
      'started', 'menu', 'next', 'previous', 'learn', 'submit', 'copyright'
    ];

    if (isCorruptedKeyword(lowerKeyword)) return false;
    if (/^\[/.test(lowerKeyword)) return false;
    if (junkPatterns.includes(lowerKeyword)) return false;
    if (lowerKeyword.includes(':') && lowerKeyword.split(':')[0].trim().length > 0) return false;
    if (lowerKeyword.includes('homepage') || lowerKeyword.includes('url') ||
      lowerKeyword.includes('social profile') || lowerKeyword.includes('self link') ||
      lowerKeyword.includes('app store') || lowerKeyword.includes('google play')) return false;
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
    const isDataForSEO = (typeof kw === 'object' ? (kw.source || source) : source) === 'DataForSEO';
    const validationStatus = isDataForSEO ? 'VERIFIED' : 'HEURISTICALLY_VALIDATED';
    if (typeof kw === 'string') {
      return {
        keyword: kw,
        volume: null,
        keywordDifficulty: null,
        cpc: null,
        source: source,
        confidence: null,
        metricType: 'topic_idea_only',
        validationStatus
      };
    }
    return {
      ...kw,
      volume: kw.volume ?? null,
      keywordDifficulty: kw.keywordDifficulty ?? null,
      cpc: kw.cpc ?? null,
      source: kw.source || source,
      confidence: null,
      metricType: kw.metricType || 'topic_idea_only',
      validationStatus: validationStatus
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
  console.log('📊 [Keyword Extraction] Building keyword candidates from website content...');

  const text = websiteData.text || '';
  const title = websiteData.metadata?.title || '';
  const description = websiteData.metadata?.description || '';
  const h1Texts = websiteData.h1 || [];
  const h2Texts = websiteData.h2 || [];
  const headings = websiteData.content?.headings || [];
  const schemaTypes = websiteData.schema?.types || websiteData.extract?.schemaTypes || [];
  const featuresText = websiteData.featuresText || websiteData.content?.features || [];

  const contentSources = [];

  if (title) contentSources.push({ text: title, weight: 10 });
  if (description) contentSources.push({ text: description, weight: 8 });
  h1Texts.forEach(h => contentSources.push({ text: typeof h === 'string' ? h : (h.text || h), weight: 6 }));
  h2Texts.forEach(h => contentSources.push({ text: typeof h === 'string' ? h : (h.text || h), weight: 4 }));
  (headings || []).forEach(h => contentSources.push({ text: h.text || h, weight: 3 }));
  featuresText.forEach(f => contentSources.push({ text: f, weight: 5 }));

  const STOPWORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'shall',
    'can', 'need', 'dare', 'ought', 'used', 'this', 'that', 'these', 'those', 'it', 'its',
    'we', 'you', 'they', 'he', 'she', 'what', 'which', 'who', 'whom', 'when', 'where', 'why',
    'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'some', 'any', 'no', 'not',
    'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'because', 'about', 'into',
    'over', 'after', 'before', 'between', 'under', 'above', 'below', 'up', 'down', 'out',
    'off', 'through', 'during', 'without', 'within', 'along', 'around', 'among',
    'our', 'your', 'their', 'my', 'his', 'her', 'get', 'gets', 'got', 'getting',
    'make', 'makes', 'made', 'making', 'use', 'uses', 'used', 'using', 'find',
    'found', 'finding', 'see', 'sees', 'saw', 'seen', 'come', 'comes', 'came', 'coming',
    'take', 'takes', 'took', 'taking', 'know', 'knows', 'knew', 'known', 'like', 'likes',
    'go', 'goes', 'went', 'gone', 'going', 'want', 'wants', 'wanted', 'look', 'looks',
    'help', 'helps', 'helped', 'work', 'works', 'worked', 'working', 'seem', 'seems',
    'try', 'tries', 'tried', 'leave', 'leaves', 'call', 'calls', 'called'
  ]);

  const BOILERPLATE_PHRASES = [
    'sign in', 'sign up', 'log in', 'login', 'register', 'create account',
    'forgot password', 'reset password', 'terms of service', 'privacy policy',
    'cookie policy', 'accept cookies', 'manage cookies', 'subscribe',
    'newsletter', 'unsubscribe', 'all rights reserved', 'powered by',
    'get started free', 'start free trial', 'free trial', 'download now',
    'learn more', 'read more', 'contact us', 'contact sales', 'get in touch',
    'follow us', 'share this', 'copyright', 'legal notice', 'sitemap',
    'search', 'menu', 'navigation', 'skip to content', 'back to top',
    'loading', 'please wait', 'under construction', 'coming soon',
    'stay connected', 'join our community', 'follow on social',
    'download on app store', 'get it on google play', 'available on',
    'workspace', 'google workspace', 'admin console', 'google admin'
  ];

  function normalizeText(t) {
    return t.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()"]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function isMostlyStopWords(words) {
    if (words.length === 0) return true;
    const stopCount = words.filter(w => STOPWORDS.has(w)).length;
    return stopCount / words.length > 0.6;
  }

  function extractPhrases(text, maxWords = 5, minWords = 2) {
    const normalized = normalizeText(text);
    const rawWords = normalized.split(' ').filter(w => w.length > 0);
    const phrases = new Set();

    for (let len = Math.min(maxWords, rawWords.length); len >= minWords; len--) {
      for (let i = 0; i <= rawWords.length - len; i++) {
        const window = rawWords.slice(i, i + len);
        if (isMostlyStopWords(window)) continue;
        const contentWords = window.filter(w => !STOPWORDS.has(w) && w.length > 1);
        if (contentWords.length < minWords) continue;
        if (contentWords.some(w => w.length > 20)) continue;
        const phrase = window.join(' ');
        if (phrase.length < 5) continue;
        const isBoilerplate = BOILERPLATE_PHRASES.some(bp => phrase.includes(bp));
        if (!isBoilerplate) {
          phrases.add(phrase);
        }
      }
    }
    return [...phrases];
  }

  function scoreRelevance(phrase, productName, companyName, industry) {
    let score = 50;
    const lowerPhrase = phrase.toLowerCase();
    const lowerProduct = (productName || '').toLowerCase();
    const lowerCompany = (companyName || '').toLowerCase();
    const lowerIndustry = (industry || '').toLowerCase();

    if (lowerProduct && lowerPhrase.includes(lowerProduct)) score += 30;
    if (lowerCompany && lowerPhrase.includes(lowerCompany)) score += 20;
    if (lowerIndustry && lowerPhrase.includes(lowerIndustry)) score += 15;

    const productTerms = ['software', 'platform', 'tool', 'solution', 'app', 'service', 'product',
      'cloud', 'saas', 'enterprise', 'business', 'professional', 'collaboration',
      'analytics', 'automation', 'management', 'integration', 'security', 'performance'];

    const termScore = productTerms.filter(t => lowerPhrase.includes(t)).length * 5;
    score += Math.min(termScore, 20);

    if (/\d/.test(lowerPhrase)) score += 5;

    return Math.min(100, score);
  }

  function deduplicateSimilar(phrases) {
    const result = [];
    const seen = new Set();
    for (const phrase of phrases) {
      const key = phrase.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!seen.has(key)) {
        seen.add(key);
        let isDuplicate = false;
        for (const existing of result) {
          const existingKey = existing.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (existingKey.includes(key) || key.includes(existingKey)) {
            if (key.length > existingKey.length) {
              result[result.indexOf(existing)] = phrase;
            }
            isDuplicate = true;
            break;
          }
        }
        if (!isDuplicate) result.push(phrase);
      }
    }
    return result;
  }

  // Try AI extraction with GROQ
  const allText = `${title}\n${description}\n${h1Texts.join('\n')}\n${text.substring(0, 3000)}`;
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
- DO NOT return the product name alone without context
- Return topic ideas only — all metrics will be null
- Prioritize product-specific phrases that describe what the product DOES (e.g., "TikTok social listening", "short-form video analytics", "creator analytics", "trend tracking")
- Include use-case phrases (e.g., "competitor monitoring for TikTok", "viral content research", "ad research for Reels")
- Include audience pain-point phrases (e.g., "track TikTok trends", "find viral creators", "monitor short-form video performance")
- Max 8 per category`;

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
          // Filter through heuristic pipeline too
          const allAi = [
            ...(parsed.primary || []).map(k => ({ phrase: k, score: 80 })),
            ...(parsed.secondary || []).map(k => ({ phrase: k, score: 65 })),
            ...(parsed.longTail || []).map(k => ({ phrase: k, score: 50 })),
          ];
          const cleanPhrases = allAi
            .filter(p => {
              const lower = p.phrase.toLowerCase();
              const isBoilerplate = BOILERPLATE_PHRASES.some(bp => lower.includes(bp));
              return !isBoilerplate && lower.split(' ').every(w => !STOPWORDS.has(w) || w.length <= 1);
            })
            .filter(p => p.phrase.length >= 5);
          const deduped = deduplicateSimilar(cleanPhrases.map(p => p.phrase));
          const scored = deduped.map(phrase => {
            const found = cleanPhrases.find(p => p.phrase === phrase);
            return { phrase, score: found ? found.score : 50 };
          }).filter(p => p.score >= 50);

          if (scored.length > 0) {
            const mapAiCandidate = (p) => ({
              phrase: p.phrase,
              keyword: p.phrase,
              source: 'ai_extracted',
              sourceUrl: websiteData.url || '',
              intent: null,
              productRelevance: p.score || 50,
              searchRelevance: null,
              validationStatus: 'PENDING',
              metricsStatus: 'NO_METRICS',
              confidence: null,
              metricType: 'topic_idea_only',
              label: 'topic idea only',
              relevanceScore: p.score || 50
            });
            const primaryKeywords = scored.slice(0, 8).map(mapAiCandidate);
            const secondaryKeywords = scored.slice(8, 20).map(mapAiCandidate);
            const longTailKeywords = scored.slice(20, 30).map(mapAiCandidate);
            console.log(`[Keyword Extraction] AI extracted ${scored.length} keyword candidates`);
            return {
              primary: primaryKeywords, secondary: secondaryKeywords, longTail: longTailKeywords, questions: parsed.questions || [],
            };
          }
        }
      }
    } catch (e) {
      console.log('⚠️ [Keyword Extraction] AI extraction failed:', e.message);
    }
  }

  // Heuristic keyword candidate pipeline
  console.log('[Keyword Extraction] Generating keyword candidates from website content...');

  let allPhrases = [];
  for (const source of contentSources) {
    const phrases = extractPhrases(source.text);
    const scored = phrases.map(p => ({
      phrase: p,
      score: scoreRelevance(p, productName, companyName, industry) + source.weight,
      source: source.text.substring(0, 50)
    }));
    allPhrases = allPhrases.concat(scored);
  }

  allPhrases.sort((a, b) => b.score - a.score);
  const uniquePhrases = deduplicateSimilar(allPhrases.map(p => p.phrase));

  const relevant = uniquePhrases
    .map(phrase => {
      const existing = allPhrases.find(p => p.phrase === phrase);
      return { phrase, score: existing ? existing.score : 50 };
    })
    .filter(p => p.score >= 50)
    .slice(0, 30);

  const mapCandidate = (p) => ({
    phrase: p.phrase,
    keyword: p.phrase,
    source: p.source || 'website_content',
    sourceUrl: websiteData.url || '',
    intent: null,
    productRelevance: p.score || 50,
    searchRelevance: null,
    validationStatus: 'PENDING',
    metricsStatus: 'NO_METRICS',
    searchVolume: null,
    keywordDifficulty: null,
    cpc: null,
    competition: null,
    confidence: null,
    metricType: 'topic_idea_only',
    label: 'topic idea only',
    relevanceScore: p.score || 50
  });

  const primary = relevant.slice(0, 8).map(mapCandidate);
  const secondary = relevant.slice(8, 20).map(mapCandidate);
  const longTail = relevant.slice(20, 30).map(mapCandidate);

  console.log(`[Keyword Extraction] Generated ${relevant.length} keyword candidates: ${primary.length} primary, ${secondary.length} secondary, ${longTail.length} long-tail`);

  return { primary, secondary, longTail, questions: [] };
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

function removeCorruptedKeywords(keywords) {
  return keywords.filter(kw => {
    const phrase = kw.keyword || kw.phrase || kw;
    if (!phrase || typeof phrase !== 'string') return false;
    return !isCorruptedKeyword(phrase);
  });
}

function normalizeKeywordBuckets(result, identity) {
  const safe = { ...result };
  safe.primaryKeywords = removeCorruptedKeywords(asArray(safe.primaryKeywords));
  safe.secondaryKeywords = removeCorruptedKeywords(asArray(safe.secondaryKeywords));
  safe.longTailKeywords = removeCorruptedKeywords(asArray(safe.longTailKeywords));
  safe.questionKeywords = removeCorruptedKeywords(asArray(safe.questionKeywords));

  if (safe.primaryKeywords.length === 0 && safe.secondaryKeywords.length > 0) {
    safe.primaryKeywords = safe.secondaryKeywords.slice(0, 5);
    safe.secondaryKeywords = safe.secondaryKeywords.slice(5);
  }

  safe.metadata = {
    totalKeywords: safe.primaryKeywords.length + safe.secondaryKeywords.length + safe.longTailKeywords.length + safe.questionKeywords.length,
    primaryCount: safe.primaryKeywords.length,
    secondaryCount: safe.secondaryKeywords.length,
    longTailCount: safe.longTailKeywords.length,
    questionCount: safe.questionKeywords.length,
    clustersCount: asArray(safe.clusters).length,
    opportunitiesCount: asArray(safe.contentOpportunities).length,
    analyzedAt: new Date().toISOString(),
    dataForSeoConfigured: isDataForSEOConfigured(),
  };

  return safe;
}
