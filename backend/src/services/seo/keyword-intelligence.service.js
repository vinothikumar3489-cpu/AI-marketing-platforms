import fetch from 'node-fetch';
import { getKeywordMetrics, getKeywordSuggestions, getRelatedKeywords, isDataForSEOConfigured } from '../dataforseo.service.js';
import { isValidKeyword } from '../../utils/text.util.js';
import { asArray } from '../../utils/text.util.js';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const EXA_API_KEY = process.env.EXA_API_KEY;

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

  // Safely derive identity fields with fallbacks
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
          volume: k.volume,
          cpc: k.cpc,
          difficulty: k.difficulty,
          confidence: k.confidence || 50
        })), 'orchestrator');

        // Accept keywords from fallback sources with confidence >= 50
        extractedKeywords.primary = filteredKeywords.filter(k => k.confidence >= 50).slice(0, 10);
        extractedKeywords.secondary = filteredKeywords.filter(k => k.confidence >= 30 && k.confidence < 50).slice(0, 20);
        extractedKeywords.longTail = filteredKeywords.filter(k => k.confidence < 30).slice(0, 30);
      }

      // If orchestrator keywords exist but all were filtered as junk, fall through to website extraction
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

    // Step 2: Research industry keywords
    console.log('🔬 [Keyword Intelligence] Researching industry keywords...');
    const industryKeywords = await researchIndustryKeywords(safeIndustry, safeProductName);

    // Step 3: Analyze competitor keywords
    console.log('🎯 [Keyword Intelligence] Analyzing competitor keywords...');
    const competitorKeywordAnalysis = await analyzeCompetitorKeywords(
      competitorData,
      extractedKeywords,
      safeProductName
    );

    // Step 4: Generate keyword clusters
    console.log('🗂️ [Keyword Intelligence] Creating topic clusters...');
    const clusters = await generateTopicClusters(
      extractedKeywords,
      industryKeywords,
      competitorKeywordAnalysis,
      safeProductName
    );

    // Step 5: Identify content opportunities
    console.log('💡 [Keyword Intelligence] Identifying content opportunities...');
    const contentOpportunities = await identifyContentOpportunities(
      extractedKeywords,
      competitorKeywordAnalysis,
      clusters,
      websiteData
    );

    // Step 6: Generate GEO-specific keywords (for AI search engines)
    console.log('🤖 [Keyword Intelligence] Generating GEO keywords...');
    const geoKeywords = await generateGEOKeywords(
      safeProductName,
      safeIndustry,
      extractedKeywords,
      clusters
    );

    // Step 7: Compile final result
    const result = {
      primaryKeywords: extractedKeywords.primary || [],
      secondaryKeywords: extractedKeywords.secondary || [],
      longTailKeywords: extractedKeywords.longTail || [],
      questionKeywords: extractedKeywords.questions || [],
      clusters: clusters || [],
      competitorKeywords: competitorKeywordAnalysis || [],
      contentOpportunities: contentOpportunities || [],
      geoKeywords: geoKeywords || [],
      metadata: {
        totalKeywords: 
          (extractedKeywords.primary?.length || 0) +
          (extractedKeywords.secondary?.length || 0) +
          (extractedKeywords.longTail?.length || 0),
        clustersCount: clusters?.length || 0,
        opportunitiesCount: contentOpportunities?.length || 0,
        analyzedAt: new Date().toISOString()
      }
    };

    // Normalize keyword buckets: promote secondary→primary when primary is empty
    const normalizedResult = normalizeKeywordBuckets(result, safeIdentity);

    console.log('✅ [Keyword Intelligence] Analysis complete:', {
      totalKeywords: normalizedResult.metadata.totalKeywords,
      primary: normalizedResult.primaryKeywords.length,
      secondary: normalizedResult.secondaryKeywords.length,
      longTail: normalizedResult.longTailKeywords.length,
      clusters: normalizedResult.metadata.clustersCount,
      opportunities: normalizedResult.metadata.opportunitiesCount
    });

    return normalizedResult;

  } catch (error) {
    console.error('❌ [Keyword Intelligence] Error:', error);
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

// ============================================
// KEYWORD EXTRACTION FROM WEBSITE
// ============================================

// List of junk/stop words to reject
const JUNK_KEYWORDS = new Set([
  // Generic single words
  'custom', 'business', 'systems', 'built', 'everything', 'design', 'services', 'right', 'before', 'whatever', 'take', 'used', 'use', 'using', 'make', 'made', 'get', 'got', 'see', 'seen', 'look', 'looking', 'find', 'found', 'need', 'needs', 'want', 'wants', 'like', 'likes', 'love', 'loves', 'best', 'better', 'good', 'great', 'top', 'high', 'low', 'free', 'premium', 'plan', 'plans', 'month', 'monthly', 'year', 'yearly', 'day', 'daily', 'week', 'weekly', 'price', 'pricing', 'cost', 'costs', 'cheap', 'expensive', 'affordable', 'quality', 'professional', 'expert', 'experts', 'team', 'teams', 'company', 'companies', 'world', 'global', 'international', 'local', 'online', 'web', 'website', 'websites', 'site', 'sites', 'page', 'pages', 'home', 'about', 'contact', 'info', 'information', 'help', 'support', 'service', 'services', 'product', 'products', 'solution', 'solutions', 'tool', 'tools', 'software', 'softwares', 'app', 'apps', 'application', 'applications', 'system', 'systems', 'platform', 'platforms', 'technology', 'technologies', 'tech', 'digital', 'data', 'management', 'manager', 'managers', 'development', 'developer', 'developers', 'create', 'creating', 'created', 'build', 'building', 'built', 'provide', 'providing', 'provided', 'offer', 'offering', 'offered', 'feature', 'features', 'benefit', 'benefits', 'advantage', 'advantages', 'value', 'values', 'result', 'results', 'success', 'successful', 'work', 'working', 'worked', 'time', 'times', 'way', 'ways', 'thing', 'things', 'something', 'nothing', 'anything', 'everything', 'someone', 'anyone', 'everyone', 'any', 'all', 'some', 'most', 'many', 'much', 'more', 'less', 'few', 'little', 'big', 'small', 'large', 'huge', 'tiny', 'new', 'old', 'latest', 'recent', 'current', 'modern', 'simple', 'easy', 'hard', 'difficult', 'complex', 'fast', 'quick', 'slow', 'secure', 'safe', 'reliable', 'trusted', 'leading', 'major', 'main', 'primary', 'secondary', 'important', 'essential', 'key', 'core', 'basic', 'advanced', 'complete', 'full', 'total', 'whole', 'real', 'true', 'false', 'yes', 'no', 'not', 'never', 'always', 'only', 'just', 'also', 'too', 'very', 'really', 'actually', 'probably', 'maybe', 'possibly', 'likely', 'usually', 'generally', 'typically', 'often', 'sometimes', 'rarely', 'seldom', 'always', 'never', 'ever', 'already', 'still', 'yet', 'now', 'then', 'here', 'there', 'where', 'when', 'how', 'why', 'what', 'which', 'who', 'whom', 'whose', 'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'theirs', 'he', 'him', 'his', 'she', 'her', 'hers', 'we', 'us', 'our', 'ours', 'you', 'your', 'yours', 'i', 'me', 'my', 'mine', 'myself', 'yourself', 'himself', 'herself', 'itself', 'ourselves', 'yourselves', 'themselves', 'be', 'am', 'is', 'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must', 'ought', 'dare', 'need', 'https', 'http', 'www', 'com', 'org', 'net', 'io', 'co', 'apple', 'google', 'microsoft', 'amazon', 'facebook', 'twitter', 'linkedin', 'instagram', 'youtube', 'tiktok', 'snapchat', 'pinterest', 'reddit', 'quora', 'wikipedia', 'similarweb', 'gartner', 'rasa', 'retellai'
]);

// Filter out junk keywords using shared validation
function filterJunkKeywords(keywords, source = 'unknown') {
  return keywords.filter(kw => {
    const keyword = typeof kw === 'string' ? kw : kw.keyword;
    if (!keyword) return false;

    // Additional junk keyword checks from requirements
    const lowerKeyword = keyword.toLowerCase().trim();
    const junkPatterns = [
      'canva\'s', 'templates', 'designing', 'design',
      'undefined', 'account', 'semrush', 'general',
      'homepage', 'url', 'self link', 'page title', 'meta title',
      'month', 'year', 'day', 'week'
    ];

    // Reject any keyword starting with bracket patterns e.g. [use, [try, [skip
    if (/^\[/.test(lowerKeyword)) {
      return false;
    }

    // Reject single-word junk patterns
    if (junkPatterns.includes(lowerKeyword)) {
      return false;
    }

    // Reject homepage titles (contains colon like "Canva: Visual Suite for Everyone")
    if (lowerKeyword.includes(':') && lowerKeyword.split(':')[0].trim().length > 0) {
      return false;
    }

    // Reject homepage titles, URLs, social profile titles
    if (lowerKeyword.includes('homepage') || lowerKeyword.includes('url') ||
        lowerKeyword.includes('social profile') || lowerKeyword.includes('self link') ||
        lowerKeyword.includes('instagram') || lowerKeyword.includes('title') ||
        lowerKeyword.includes('facebook') || lowerKeyword.includes('twitter') ||
        lowerKeyword.includes('linkedin') || lowerKeyword.includes('youtube')) {
      return false;
    }

    // Reject possessive forms like "canva's"
    if (lowerKeyword.includes("'s") || lowerKeyword.includes("'")) {
      return false;
    }

    // Reject URLs and self-links
    if (lowerKeyword.includes('http') || lowerKeyword.includes('www.') || lowerKeyword.includes('.com') ||
        lowerKeyword.includes('.me/') || lowerKeyword.includes('.app') || lowerKeyword.includes('.io') ||
        lowerKeyword.includes('canva.me') || lowerKeyword.includes('figma.com') || lowerKeyword.includes('gamma.app')) {
      return false;
    }

    // Reject concatenated junk keywords like "educationCanva" (brand name glued to another word)
    const brandNamePrefixes = ['canva', 'gamma', 'figma', 'notion', 'adobe', 'google', 'microsoft'];
    const hasConcatenatedBrand = brandNamePrefixes.some(prefix =>
      lowerKeyword.startsWith(prefix) && lowerKeyword.length > prefix.length + 2 && /^[a-z]+[A-Z]/.test(lowerKeyword)
    );
    if (hasConcatenatedBrand) {
      return false;
    }

    // Reject keywords that are clearly concatenated without spaces (camelCase or all lowercase word-soup)
    if (/^[a-z]{15,}$/.test(lowerKeyword) || /^[a-z]+[A-Z][a-z]/.test(lowerKeyword) || /^[a-z]{2,}[A-Z]{2,}/.test(lowerKeyword)) {
      return false;
    }

    // Reject one-word generic junk (not industry keywords)
    const oneWordJunk = new Set([
      'start', 'create', 'template', 'social', 'media', 'easy', 'tools',
      'watch', 'turn', 'words', 'free', 'best', 'top', 'new', 'use',
      'get', 'see', 'find', 'need', 'want', 'like', 'love', 'make',
      'built', 'custom', 'business', 'service', 'services', 'product',
      'products', 'solution', 'solutions', 'platform', 'software',
      'application', 'applications', 'app', 'apps', 'tool', 'online',
      'web', 'website', 'site', 'home', 'about', 'contact', 'help',
      'support', 'info', 'information', 'blog', 'news', 'pricing',
      'price', 'cost', 'plan', 'plans', 'feature', 'features',
      'benefit', 'benefits', 'quality', 'value', 'team', 'teams',
      'company', 'companies', 'work', 'works', 'world', 'global',
      'digital', 'data', 'tech', 'technology', 'management',
      'development', 'developer', 'providers', 'provider',
      'month', 'yearly', 'monthly', 'annual', 'basic', 'premium',
      'enterprise', 'professional', 'pro', 'standard', 'plus',
      'users', 'chose', 'choose', 'days', 'trial', 'try', 'click',
      'sign', 'login', 'log', 'register', 'demo', 'video', 'image',
      'photo', 'picture', 'file', 'upload', 'download', 'submit',
      'send', 'receive', 'share', 'join', 'browse', 'search',
      'view', 'read', 'write', 'edit', 'delete', 'save', 'update',
      'change', 'add', 'remove', 'show', 'hide', 'open', 'close',
      'back', 'next', 'done', 'cancel', 'ok', 'yes', 'no',
      'started', 'daily', 'alerts', 'outlier', 'research',
      'credits', 'what', 'manage', 'content',
      'tiktok', 'shorts', 'trends', 'trending', 'seo', 'youtube',
      'review', 'reviews', 'instagram', 'reels', 'video', 'viral',
      'watch', 'customer', 'service', 'app', 'store', 'read'
    ]);

    const wordCount = keyword.split(' ').length;
    if (wordCount === 1 && oneWordJunk.has(lowerKeyword)) {
      return false;
    }

    // Reject random sentence fragments (very long keywords with no clear intent)
    if (keyword.split(' ').length > 8) {
      return false;
    }

    // Reject keywords that are purely numeric or numeric with symbols (e.g. "500+", "1,000", "$100")
    if (/^[\d,+.$\-‰%]+$/.test(keyword.trim())) {
      return false;
    }

    // Reject mixed-case random junk like "useResume", "tryNow"
    if (/^[a-z]+[A-Z]/.test(keyword) && keyword.length < 20) {
      return false;
    }

    // Reject keywords that are just the brand name repeated
    const brandNames = ['canva', 'figma', 'gamma', 'notion', 'orkyn'];
    if (brandNames.includes(lowerKeyword)) {
      return false;
    }

    // Use shared isValidKeyword for validation
    if (!isValidKeyword(keyword)) {
      return false;
    }

    // Additional source-specific filtering
    if (source === 'category_seeds') {
      // Category seed keywords are pre-validated, just check basic validity
      return true;
    }

    if (source === 'fallback') {
      // Fallback keywords should be more lenient but still valid
      return keyword.split(' ').length >= 2; // Prefer multi-word phrases for fallback
    }

    return true;
  }).map(kw => {
    // Ensure consistent output format
    if (typeof kw === 'string') {
      return {
        keyword: kw,
        volume: null,
        keywordDifficulty: null,
        cpc: null,
        source: source,
        confidence: source === 'category_seeds' ? 70 : source === 'fallback' ? 40 : 50
      };
    }
    // Preserve existing structure but add source if missing
    return {
      ...kw,
      source: kw.source || source,
      confidence: kw.confidence || (source === 'category_seeds' ? 70 : source === 'fallback' ? 40 : 50)
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
  console.log('📊 [Keyword Extraction] Analyzing website content with AI...');

  const text = websiteData.text || '';
  const title = websiteData.metadata?.title || '';
  const description = websiteData.metadata?.description || '';
  const h1 = websiteData.h1?.[0] || '';
  
  const allText = `${title}\n${description}\n${h1}\n${text.substring(0, 3000)}`;
  
  // Detect product category from title/meta/H1/content
  const detectCategory = () => {
    const content = allText.toLowerCase();

    // Canva category: graphic design, social media design, presentation maker
    if (content.includes('canva') || (content.includes('graphic design') && content.includes('social media'))) {
      return 'canva';
    }

    // Gamma category: AI presentation maker, AI presentation tool
    if (content.includes('gamma') || (content.includes('ai presentation') && (content.includes('maker') || content.includes('tool')))) {
      return 'gamma';
    }

    // Figma category: collaborative design tool, UI design software
    if (content.includes('figma') || (content.includes('design') && (content.includes('prototyp') || content.includes('collaborat') || content.includes('ui') || content.includes('ux')))) {
      return 'figma';
    }

    // Notion category: productivity workspace, project management tool
    if (content.includes('notion') || content.includes('workspace') || content.includes('productivity') || content.includes('wiki') || content.includes('knowledge base') || content.includes('collaborative docs') || content.includes('project management workspace')) {
      return 'notion';
    }

    // Orkyn category: custom software development, ERP consulting
    if (content.includes('orkyn') || content.includes('software development') || content.includes('erp') || content.includes('salesforce') || content.includes('crm') || content.includes('custom software') || content.includes('consulting')) {
      return 'orkyn';
    }

    // Virlo category: social media analytics, short-form video analytics, creator tools
    if (content.includes('virlo') || content.includes('analytics') || content.includes('social listening') || content.includes('creator analytics') || content.includes('short form video') || content.includes('trend tracking') || content.includes('influencer')) {
      return 'virlo';
    }

    return 'general';
  };

  const category = detectCategory();
  console.log('🔍 [Keyword Extraction] Detected category:', category);

  // Category-based seed keywords for fallback/enrichment (from requirements)
  const categorySeedKeywords = {
    canva: [
      'graphic design tool',
      'online design platform',
      'AI design tool',
      'presentation maker',
      'social media design tool',
      'logo maker',
      'brand kit software',
      'Canva alternatives',
      'Canva pricing',
      'Canva vs Adobe Express'
    ],
    gamma: [
      'AI presentation maker',
      'AI presentation tool',
      'presentation software',
      'Gamma alternatives',
      'Gamma vs Canva',
      'AI website builder',
      'slide deck generator'
    ],
    figma: [
      'collaborative design tool',
      'UI design software',
      'UX design tool',
      'design prototyping tool',
      'design system tool',
      'Figma alternatives'
    ],
    notion: [
      'productivity workspace',
      'project management tool',
      'Notion alternatives',
      'team wiki software',
      'knowledge base software'
    ],
    orkyn: [
      'custom software development',
      'ERP consulting',
      'Salesforce consulting',
      'business automation',
      'CRM integration services'
    ],
    virlo: [
      'tiktok analytics tool',
      'short form video analytics',
      'creator analytics platform',
      'social media trend tracking',
      'influencer marketing platform',
      'viral video analytics',
      'social listening platform',
      'instagram reels analytics',
      'youtube shorts analytics',
      'competitor video analysis'
    ],
    general: [
      'software solution',
      'business tool',
      'productivity software',
      'collaboration platform'
    ]
  };
  
  const seedKeywords = categorySeedKeywords[category] || [];
  
  if (GROQ_API_KEY) {
    try {
      const prompt = `As an expert SEO strategist, analyze the following website content and extract high-value SEO keywords for the product "${productName}" in the "${industry}" industry.
      
Website Content:
${allText}

Detected Category: ${category}
Category Seed Keywords (use these as inspiration for relevant keywords): ${seedKeywords.join(', ')}

CRITICAL: DO NOT return basic word-frequency terms like "software", "business", or "custom". DO NOT return weak words like "free", "features", "best", "premium", "plan", "month", software alone, or product name alone. DO NOT return sentence fragments like "platform for building", "the collaborative interface", "for building meaningful". DO NOT return bad keywords like "general", "account", "semrush", "competitors", "tools". Extract REAL, high-value, long-tail, commercial, and question-based keywords that a user would actually search for.

Return a JSON object strictly following this structure:
{
  "primary": [{"keyword": "...", "intent": "commercial|informational|navigational|transactional", "searchVolume": 0, "difficulty": 0, "competition": "Unknown", "trend": "Unknown", "trafficPotential": 0, "cpc": 0, "serpFeatures": [], "businessValue": "Unknown", "priority": "Unknown", "opportunity": 0, "rankingPotential": "Unknown", "intentConfidence": 0, "contentType": "Unknown", "suggestedUrl": "", "suggestedH1": "", "suggestedMetaTitle": "", "suggestedMetaDescription": "", "internalLinkingSuggestions": []}],
  "secondary": [{"keyword": "...", "intent": "commercial|informational|navigational|transactional", "searchVolume": 0, "difficulty": 0, "competition": "Unknown", "trend": "Unknown", "trafficPotential": 0, "cpc": 0, "serpFeatures": [], "businessValue": "Unknown", "priority": "Unknown", "opportunity": 0, "rankingPotential": "Unknown", "intentConfidence": 0, "contentType": "Unknown", "suggestedUrl": "", "suggestedH1": "", "suggestedMetaTitle": "", "suggestedMetaDescription": "", "internalLinkingSuggestions": []}],
  "longTail": [{"keyword": "...", "intent": "commercial|informational|navigational|transactional", "searchVolume": 0, "difficulty": 0, "competition": "Unknown", "trend": "Unknown", "trafficPotential": 0, "cpc": 0, "serpFeatures": [], "businessValue": "Unknown", "priority": "Unknown", "opportunity": 0, "rankingPotential": "Unknown", "intentConfidence": 0, "contentType": "Unknown", "suggestedUrl": "", "suggestedH1": "", "suggestedMetaTitle": "", "suggestedMetaDescription": "", "internalLinkingSuggestions": []}],
  "questions": [{"keyword": "...", "intent": "informational", "searchVolume": 0, "difficulty": 0, "competition": "Unknown", "trend": "Unknown", "trafficPotential": 0, "cpc": 0, "serpFeatures": [], "businessValue": "Unknown", "priority": "Unknown", "opportunity": 0, "rankingPotential": "Unknown", "intentConfidence": 0, "contentType": "Unknown", "suggestedUrl": "", "suggestedH1": "", "suggestedMetaTitle": "", "suggestedMetaDescription": "", "internalLinkingSuggestions": []}]
}
IMPORTANT: All metrics (searchVolume, difficulty, cpc, opportunity) must be 0 or "Unknown" unless provided by DataForSEO API. Do not generate fake metrics.
Provide exactly 8 primary, 10 secondary, 10 longTail, and 8 question keywords to stay within token limits.`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: 'You are an expert SEO specialist. Return valid JSON only.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const parsed = JSON.parse(data.choices[0].message.content);
        if (parsed.primary && parsed.secondary) {
          console.log('✅ [Keyword Extraction] AI extraction successful');
          
          // Filter out junk keywords
          parsed.primary = filterJunkKeywords(parsed.primary);
          parsed.secondary = filterJunkKeywords(parsed.secondary);
          parsed.longTail = filterJunkKeywords(parsed.longTail);
          parsed.questions = filterJunkKeywords(parsed.questions);
          
          console.log('✅ [Keyword Extraction] Junk keywords filtered:', {
            primary: parsed.primary.length,
            secondary: parsed.secondary.length,
            longTail: parsed.longTail.length,
            questions: parsed.questions.length
          });
          
          // Enrich with DataForSEO metrics if configured
          if (isDataForSEOConfigured()) {
            console.log('🔍 [Keyword Extraction] Enriching keywords with DataForSEO metrics...');
            const allKeywords = [
              ...parsed.primary.map(k => k.keyword),
              ...parsed.secondary.map(k => k.keyword),
              ...parsed.longTail.map(k => k.keyword),
              ...parsed.questions.map(k => k.keyword)
            ];
            
            const metricsResult = await getKeywordMetrics(allKeywords, 'United States', 'English');
            
            if (metricsResult.success && metricsResult.data) {
              const metricsMap = new Map(metricsResult.data.map(m => [m.keyword.toLowerCase(), m]));
              
              // Enrich primary keywords
              parsed.primary = parsed.primary.map(kw => {
                const metrics = metricsMap.get(kw.keyword.toLowerCase());
                return {
                  ...kw,
                  searchVolume: metrics?.volume ?? null,
                  difficulty: metrics?.keywordDifficulty ?? null,
                  cpc: metrics?.cpc ?? null,
                  competition: metrics?.competition ?? null,
                  source: metrics?.source || 'AI',
                  confidence: metrics?.confidence || 0,
                  evidence: metrics?.evidence || 'AI-generated keyword'
                };
              });
              
              // Enrich secondary keywords
              parsed.secondary = parsed.secondary.map(kw => {
                const metrics = metricsMap.get(kw.keyword.toLowerCase());
                return {
                  ...kw,
                  searchVolume: metrics?.volume ?? null,
                  difficulty: metrics?.keywordDifficulty ?? null,
                  cpc: metrics?.cpc ?? null,
                  competition: metrics?.competition ?? null,
                  source: metrics?.source || 'AI',
                  confidence: metrics?.confidence || 0,
                  evidence: metrics?.evidence || 'AI-generated keyword'
                };
              });
              
              // Enrich long-tail keywords
              parsed.longTail = parsed.longTail.map(kw => {
                const metrics = metricsMap.get(kw.keyword.toLowerCase());
                return {
                  ...kw,
                  searchVolume: metrics?.volume ?? null,
                  difficulty: metrics?.keywordDifficulty ?? null,
                  cpc: metrics?.cpc ?? null,
                  competition: metrics?.competition ?? null,
                  source: metrics?.source || 'AI',
                  confidence: metrics?.confidence || 0,
                  evidence: metrics?.evidence || 'AI-generated keyword'
                };
              });
              
              // Enrich question keywords
              parsed.questions = parsed.questions.map(kw => {
                const metrics = metricsMap.get(kw.keyword.toLowerCase());
                return {
                  ...kw,
                  searchVolume: metrics?.volume ?? null,
                  difficulty: metrics?.keywordDifficulty ?? null,
                  cpc: metrics?.cpc ?? null,
                  competition: metrics?.competition ?? null,
                  source: metrics?.source || 'AI',
                  confidence: metrics?.confidence || 0,
                  evidence: metrics?.evidence || 'AI-generated keyword'
                };
              });
              
              console.log('✅ [Keyword Extraction] DataForSEO enrichment complete');
            } else {
              console.log('⚠️ [Keyword Extraction] DataForSEO enrichment failed, using AI-only data');
            }
          }
          
          return parsed;
        }
      }
    } catch (e) {
      console.log('⚠️ [Keyword Extraction] AI extraction failed, falling back to legacy algorithm:', e.message);
    }
  }

  // Fallback to category-based seed generation (deterministic, business-specific)
  console.log('⚠️ [Keyword Extraction] AI extraction failed, using category-based seed keywords');

  // Category-based seed keywords for known domains (from requirements)
  const categorySeeds = {
    'canva.com': [
      'graphic design tool',
      'online design platform',
      'AI design tool',
      'presentation maker',
      'social media design tool',
      'logo maker',
      'brand kit software',
      'Canva alternatives',
      'Canva pricing',
      'Canva vs Adobe Express'
    ],
    'gamma.app': [
      'AI presentation maker',
      'AI presentation tool',
      'presentation software',
      'Gamma alternatives',
      'Gamma vs Canva',
      'AI website builder',
      'slide deck generator'
    ],
    'figma.com': [
      'collaborative design tool',
      'UI design software',
      'UX design tool',
      'design prototyping tool',
      'design system tool',
      'Figma alternatives'
    ],
    'notion.so': [
      'workspace productivity app',
      'project management workspace',
      'team knowledge base',
      'collaborative docs',
      'wiki software',
      'note taking app',
      'Notion templates',
      'Notion alternatives',
      'Notion pricing'
    ],
    'orkyn.ai': [
      'custom software development',
      'ERP implementation services',
      'Salesforce consulting',
      'CRM integration services',
      'API integration services',
      'business process automation',
      'custom ERP software',
      'software development company UAE',
      'software development company India',
      'Salesforce implementation partner'
    ],
    'virlo.ai': [
      'tiktok analytics tool',
      'short form video analytics',
      'social media trend tracking',
      'creator analytics platform',
      'influencer marketing platform',
      'viral video analytics',
      'social listening tool',
      'instagram reels analytics',
      'youtube shorts analytics',
      'competitor video analysis',
      'trend forecasting tool',
      'content analytics platform'
    ]
  };
  
  // Get domain from URL
  const domain = identity.domain || websiteData.url || '';
  const normalizedDomain = domain.replace('www.', '').replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
  
  // Use category-based seeds if available, otherwise use generic business terms
  let fallbackSeedKeywords = categorySeeds[normalizedDomain];
  
  if (!fallbackSeedKeywords) {
    // Generic business seeds based on industry/category
    if (identity.category === 'SaaS' || identity.businessCategory === 'Technology') {
      fallbackSeedKeywords = [
        'custom software development',
        'software implementation services',
        'business automation solutions',
        'enterprise software solutions',
        'software consulting services',
        'digital transformation services',
        'cloud software solutions',
        'business process optimization',
        'software integration services',
        'enterprise software platform'
      ];
    } else {
      fallbackSeedKeywords = [
        'business solutions',
        'professional services',
        'enterprise solutions',
        'business software',
        'digital solutions',
        'technology solutions',
        'business platform',
        'professional software',
        'enterprise platform',
        'business technology'
      ];
    }
  }
  
  // Filter out any weak terms from seeds
  const weakTerms = ['general', 'account', 'tools', 'competitors', 'alternatives', 'platform for', 'for building', 'the collaborative'];
  fallbackSeedKeywords = fallbackSeedKeywords.filter(kw => !weakTerms.some(wt => kw.toLowerCase().includes(wt)));
  
  console.log('🔍 [Keyword Extraction] Using category-based seeds:', fallbackSeedKeywords.slice(0, 5));
  
  const primary = [];
  const secondary = [];
  const longTail = [];
  const questions = [];
  
  fallbackSeedKeywords.forEach(term => {
    const wordCount = term.split(' ').length;
    const shared = {
      keyword: term,
      searchVolume: null,
      keywordDifficulty: null,
      cpc: null,
      source: 'CategorySeed',
      confidence: wordCount >= 3 ? 65 : 70,
      contentType: wordCount >= 3 ? 'Blog Post' : 'Landing Page',
      opportunityScore: wordCount >= 3 ? 65 : 70
    };
    
    if (wordCount === 1) {
      primary.push({ 
        ...shared,
        intent: 'commercial',
      });
    } else if (wordCount === 2) {
      secondary.push({ 
        ...shared,
        intent: 'commercial',
      });
    } else if (wordCount === 3) {
      longTail.push({ 
        ...shared,
        intent: 'commercial',
      });
    } else {
      // 4+ word phrases
      longTail.push({ 
        ...shared,
        intent: 'informational',
        confidence: 60,
        opportunityScore: 60
      });
    }
  });

  const result = {
    primary: primary.slice(0, 10),
    secondary: secondary.slice(0, 15),
    longTail: longTail.slice(0, 20),
    questions: questions.slice(0, 10)
  };
  
  console.log('✅ [Keyword Extraction] Category-based seed keywords generated:', {
    primary: result.primary.length,
    secondary: result.secondary.length,
    longTail: result.longTail.length,
    questions: result.questions.length
  });
  
  return result;
}

function extractPhrases(text) {
  // Remove special characters and extra spaces
  const cleaned = text.replace(/[^a-z0-9\s\?]/gi, ' ').replace(/\s+/g, ' ');
  const words = cleaned.split(' ').filter(w => w.length > 2);

  const phrases = new Set();
  
  // Extract 1-word phrases
  words.forEach(word => {
    if (word.length > 4 && !isStopWord(word)) {
      phrases.add(word);
    }
  });

  // Extract 2-word phrases
  for (let i = 0; i < words.length - 1; i++) {
    if (!isStopWord(words[i]) && !isStopWord(words[i + 1])) {
      phrases.add(`${words[i]} ${words[i + 1]}`);
    }
  }

  // Extract 3-word phrases
  for (let i = 0; i < words.length - 2; i++) {
    const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
    if (phrase.split(' ').some(w => !isStopWord(w))) {
      phrases.add(phrase);
    }
  }

  // Extract 4-word phrases (more selective)
  for (let i = 0; i < words.length - 3; i++) {
    const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]} ${words[i + 3]}`;
    if (phrase.split(' ').filter(w => !isStopWord(w)).length >= 3) {
      phrases.add(phrase);
    }
  }

  return Array.from(phrases);
}

function isStopWord(word) {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
    'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'them', 'their', 'what',
    'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every',
    'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
    'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just'
  ]);
  return stopWords.has(word.toLowerCase());
}

function determineIntent(keyword) {
  return classifyIntent(keyword);
}

// ============================================
// INDUSTRY KEYWORD RESEARCH (ENHANCED)
// ============================================

async function researchIndustryKeywords(industry, productName) {
  console.log('🔬 [Industry Research] Researching:', { industry, productName });

  const allKeywords = [];

  // Strategy 1: Research actual SEO keywords using Tavily
  if (TAVILY_API_KEY) {
    try {
      console.log('🔍 [Tavily] Searching for keyword opportunities...');
      
      // Search for keyword lists and SEO content
      const queries = [
        `best ${industry} keywords 2026`,
        `${productName} SEO keywords high volume`,
        `${industry} content marketing keywords`,
        `${productName} search terms ranking`
      ];

      for (const query of queries.slice(0, 2)) { // Limit to 2 queries to save API calls
        const tavilyResults = await searchWithTavily(query);
        
        tavilyResults.forEach(result => {
          // Extract keyword-like phrases from result content
          const text = `${result.title} ${result.snippet || result.content || ''}`.toLowerCase();
          const extracted = extractKeywordsFromResearch(text, productName, industry);
          
          extracted.forEach(kw => {
            allKeywords.push({
              ...kw,
              source: 'tavily',
              sourceUrl: result.url,
              relevance: 'high'
            });
          });
        });
      }
      
      console.log(`✅ [Tavily] Found ${allKeywords.length} keyword opportunities`);
    } catch (error) {
      console.log('⚠️ [Industry Research] Tavily failed:', error.message);
    }
  }

  // Strategy 2: Get competitor keywords using Exa
  if (EXA_API_KEY && allKeywords.length < 20) {
    try {
      console.log('🔍 [Exa] Searching for competitor keywords...');
      
      const exaResults = await searchWithExa(
        `${productName} ${industry} top ranking pages keywords`
      );
      
      exaResults.forEach(result => {
        const text = `${result.title} ${result.text || result.snippet || ''}`.toLowerCase();
        const extracted = extractKeywordsFromResearch(text, productName, industry);
        
        extracted.forEach(kw => {
          allKeywords.push({
            ...kw,
            source: 'exa',
            sourceUrl: result.url,
            relevance: 'medium'
          });
        });
      });
      
      console.log(`✅ [Exa] Found ${allKeywords.length} total keywords`);
    } catch (error) {
      console.log('⚠️ [Industry Research] Exa failed:', error.message);
    }
  }

  // Strategy 3: If no external data, generate smart keyword variations
  if (allKeywords.length < 5) {
    console.log('🔄 [Fallback] Generating smart keyword variations...');
    allKeywords.push(...generateSmartKeywordVariations(productName, industry));
  }

  // Deduplicate and rank by relevance
  const uniqueKeywords = deduplicateKeywords(allKeywords);
  
  return uniqueKeywords.slice(0, 30);
}

// Extract meaningful SEO keywords from research text
function extractKeywordsFromResearch(text, productName, industry) {
  const keywords = [];
  const productLower = productName.toLowerCase();
  const industryLower = industry.toLowerCase();
  
  // Look for patterns that indicate keywords
  const patterns = [
    // "keyword: xyz" or "keywords: xyz"
    /keywords?[:\s]+([a-z0-9\s\-]+?)(?:\.|,|;|\n|$)/gi,
    // "search for xyz" or "ranking for xyz"
    /(?:search|rank|ranking|optimize|target)(?:ing|ed)?\s+for[:\s]+([a-z0-9\s\-]+?)(?:\.|,|;|\n|$)/gi,
    // "top xyz keywords"
    /top\s+([a-z0-9\s\-]+?)\s+keywords?/gi,
    // "best xyz terms"
    /best\s+([a-z0-9\s\-]+?)\s+(?:terms?|keywords?)/gi,
    // Quote-surrounded terms
    /"([a-z0-9\s\-]{3,30})"/gi
  ];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const extracted = match[1].trim().toLowerCase();
      if (extracted.length > 2 && extracted.length < 50 && !isStopWord(extracted)) {
        keywords.push({
          keyword: extracted,
          intent: classifyIntent(extracted),
          difficulty: estimateDifficulty(extracted),
          opportunity: 'high',
          confidenceScore: 75,
          reason: 'Found in SEO research content'
        });
      }
    }
  });

  // Also extract product/industry related multi-word phrases
  const phrases = extractPhrases(text);
  phrases.forEach(phrase => {
    const lower = phrase.toLowerCase();
    if ((lower.includes(productLower) || lower.includes(industryLower)) && 
        lower.length > 5 && lower.length < 50) {
      keywords.push({
        keyword: phrase,
        intent: classifyIntent(phrase),
        difficulty: estimateDifficulty(phrase),
        opportunity: 'medium',
        confidenceScore: 60,
        reason: 'Relevant to product/industry'
      });
    }
  });

  return keywords;
}

// Generate smart keyword variations when external research unavailable
function generateSmartKeywordVariations(productName, industry) {
  const variations = [];
  const baseName = productName.toLowerCase();
  const baseIndustry = industry.toLowerCase();

  // Commercial intent keywords
  const commercialModifiers = ['best', 'top', 'vs', 'alternative', 'review', 'pricing', 'cost', 'free'];
  commercialModifiers.forEach(modifier => {
    variations.push({
      keyword: `${modifier} ${baseName}`,
      intent: 'commercial',
      difficulty: 'medium',
      opportunity: 'high',
      confidenceScore: 80,
      reason: 'High commercial intent variation'
    });
  });

  // Informational keywords
  const informationalModifiers = ['how to use', 'what is', 'guide', 'tutorial', 'tips'];
  informationalModifiers.forEach(modifier => {
    variations.push({
      keyword: `${modifier} ${baseName}`,
      intent: 'informational',
      difficulty: 'easy',
      opportunity: 'high',
      confidenceScore: 75,
      reason: 'Informational content opportunity'
    });
  });

  // Industry-specific keywords
  variations.push({
    keyword: `${baseName} for ${baseIndustry}`,
    intent: 'commercial',
    difficulty: 'medium',
    opportunity: 'high',
    confidenceScore: 85,
    reason: 'Industry-targeted keyword'
  });

  variations.push({
    keyword: `${baseName} ${baseIndustry} solution`,
    intent: 'commercial',
    difficulty: 'medium',
    opportunity: 'high',
    confidenceScore: 80,
    reason: 'Solution-focused keyword'
  });

  // Feature-based keywords
  ['features', 'benefits', 'advantages', 'capabilities'].forEach(term => {
    variations.push({
      keyword: `${baseName} ${term}`,
      intent: 'informational',
      difficulty: 'easy',
      opportunity: 'medium',
      confidenceScore: 70,
      reason: 'Feature discovery keyword'
    });
  });

  return variations;
}

// Classify search intent more accurately
function classifyIntent(keyword) {
  const lower = keyword.toLowerCase();
  
  // Transactional - buying intent
  if (/\b(buy|purchase|order|shop|deal|discount|coupon|trial|demo|signup|subscribe|download|get)\b/.test(lower)) {
    return 'transactional';
  }
  
  // Commercial - researching before buying
  if (/\b(best|top|vs|versus|alternative|compare|comparison|review|pricing|price|cost|cheap|affordable)\b/.test(lower)) {
    return 'commercial';
  }
  
  // Navigational - looking for specific brand/site
  if (/\b(login|sign in|website|official|portal|homepage|app)\b/.test(lower)) {
    return 'navigational';
  }
  
  // Informational - learning and research
  if (/\b(how|what|why|when|where|who|guide|tutorial|tips|learn|example|definition|meaning)\b/.test(lower)) {
    return 'informational';
  }
  
  // Default: informational
  return 'informational';
}

// Estimate keyword difficulty
function estimateDifficulty(keyword) {
  const wordCount = keyword.split(' ').length;
  const length = keyword.length;
  
  // Long-tail keywords (3+ words) are usually easier
  if (wordCount >= 4) return 'easy';
  if (wordCount === 3) return 'easy';
  
  // Very short keywords are harder
  if (wordCount === 1 && length < 8) return 'hard';
  
  // Medium difficulty for most 2-word phrases
  return 'medium';
}

// Deduplicate keywords and merge data
function deduplicateKeywords(keywords) {
  const map = new Map();
  
  keywords.forEach(kw => {
    const key = kw.keyword.toLowerCase().trim();
    if (map.has(key)) {
      const existing = map.get(key);
      // Keep the one with higher confidence
      if (kw.confidenceScore > existing.confidenceScore) {
        map.set(key, kw);
      }
    } else {
      map.set(key, kw);
    }
  });
  
  return Array.from(map.values())
    .sort((a, b) => b.confidenceScore - a.confidenceScore);
}

async function searchWithTavily(query) {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query,
      search_depth: 'basic',
      max_results: 5
    })
  });

  if (!response.ok) throw new Error('Tavily API error');
  
  const data = await response.json();
  return data.results || [];
}

async function searchWithExa(query) {
  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${EXA_API_KEY}`
    },
    body: JSON.stringify({
      query,
      num_results: 5,
      type: 'keyword'
    })
  });

  if (!response.ok) throw new Error('Exa API error');
  
  const data = await response.json();
  return data.results || [];
}

// ============================================
// COMPETITOR KEYWORD ANALYSIS (ENHANCED)
// ============================================

async function analyzeCompetitorKeywords(competitorData, ownKeywords, productName) {
  console.log('🎯 [Competitor Analysis] Analyzing competitor keywords...');

  const competitorKeywords = [];
  const ownKeywordSet = new Set(
    [...(ownKeywords.primary || []), ...(ownKeywords.secondary || [])]
      .map(k => k.keyword.toLowerCase())
  );

  // Strategy 1: Analyze provided competitor data
  if (competitorData && competitorData.length > 0) {
    competitorData.slice(0, 5).forEach((competitor, index) => {
      const compName = competitor.title || competitor.url || `Competitor ${index + 1}`;
      const compText = (competitor.snippet || competitor.text || competitor.content || '').toLowerCase();
      
      // Extract keywords from competitor content
      const phrases = extractPhrases(compText);
      
      phrases.slice(0, 15).forEach(phrase => {
        if (!ownKeywordSet.has(phrase) && phrase.length > 3 && phrase.length < 50) {
          const intent = classifyIntent(phrase);
          const difficulty = estimateDifficulty(phrase);
          
          competitorKeywords.push({
            keyword: phrase,
            competitorUsing: compName,
            competitorUrl: competitor.url,
            reason: `${compName} ranks for this keyword - gap opportunity`,
            opportunity: difficulty === 'easy' ? 'high' : 'medium',
            intent: intent,
            difficulty: difficulty,
            confidenceScore: 70
          });
        }
      });
    });
  }

  // Strategy 2: Research what keywords competitors typically rank for
  if (TAVILY_API_KEY && competitorKeywords.length < 10) {
    try {
      console.log('🔍 [Competitor Analysis] Researching competitor keyword strategies...');
      
      const tavilyResults = await searchWithTavily(
        `${productName} competitors ranking keywords SEO strategy`
      );
      
      tavilyResults.forEach(result => {
        const text = `${result.title} ${result.snippet || ''}`.toLowerCase();
        const extracted = extractKeywordsFromResearch(text, productName, 'competitor');
        
        extracted.slice(0, 5).forEach(kw => {
          if (!ownKeywordSet.has(kw.keyword)) {
            competitorKeywords.push({
              ...kw,
              competitorUsing: result.title || 'Industry competitors',
              competitorUrl: result.url,
              reason: 'Competitor keyword opportunity identified through market research',
              opportunity: 'high'
            });
          }
        });
      });
    } catch (error) {
      console.log('⚠️ [Competitor Analysis] Tavily research failed:', error.message);
    }
  }

  // Strategy 3: If still no data, generate smart competitive keywords
  if (competitorKeywords.length < 5) {
    console.log('🔄 [Fallback] Generating competitive keyword alternatives...');
    competitorKeywords.push(...generateCompetitiveKeywords(productName, ownKeywordSet));
  }

  // Deduplicate and return top opportunities
  const unique = deduplicateKeywords(competitorKeywords);
  return unique.slice(0, 20);
}

function generateCompetitiveKeywords(productName, ownKeywords) {
  const competitive = [];
  const baseName = productName.toLowerCase();

  // Competitive comparison keywords
  const comparisonTerms = [
    { keyword: `${baseName} alternative`, reason: 'Users searching for alternatives to your product' },
    { keyword: `${baseName} vs competitors`, reason: 'Direct comparison searches' },
    { keyword: `best ${baseName} alternatives`, reason: 'Competitive landscape research' },
    { keyword: `${baseName} competitor comparison`, reason: 'Feature comparison searches' },
    { keyword: `similar to ${baseName}`, reason: 'Product discovery searches' }
  ];

  comparisonTerms.forEach(term => {
    if (!ownKeywords.has(term.keyword)) {
      competitive.push({
        keyword: term.keyword,
        competitorUsing: 'Industry competitors',
        reason: term.reason,
        opportunity: 'high',
        intent: 'commercial',
        difficulty: 'medium',
        confidenceScore: 75
      });
    }
  });

  return competitive;
}

// ============================================
// TOPIC CLUSTERS
// ============================================

async function generateTopicClusters(extracted, industry, competitor, productName) {
  console.log('🗂️ [Clustering] Creating topic clusters...');

  // Use AI to create intelligent clusters
  if (GROQ_API_KEY) {
    try {
      const allKeywords = [
        ...(extracted.primary || []).map(k => k.keyword),
        ...(extracted.secondary || []).map(k => k.keyword),
        ...(extracted.longTail || []).map(k => k.keyword)
      ].slice(0, 30);

      const prompt = `Analyze these keywords for "${productName}" and group them into 3-5 topic clusters.

Keywords: ${allKeywords.join(', ')}

Create logical topic clusters with:
- Clear theme
- Related keywords grouped together
- Priority ranking
- Content suggestions

Return ONLY valid JSON:
[
  {
    "name": "Topic name",
    "keywords": ["keyword1", "keyword2"],
    "priority": 1-10,
    "contentSuggestions": ["suggestion1", "suggestion2"]
  }
]`;

      const aiResult = await callGroqAI(prompt);
      if (aiResult && Array.isArray(aiResult) && aiResult.length > 0) {
        return aiResult.slice(0, 5);
      }
    } catch (error) {
      console.log('⚠️ [Clustering] AI clustering failed:', error.message);
    }
  }

  // Fallback: Rule-based clustering
  return generateRuleBasedClusters(extracted, productName);
}

function generateRuleBasedClusters(extracted, productName) {
  const allKeywords = [
    ...(extracted.primary || []),
    ...(extracted.secondary || []),
    ...(extracted.longTail || [])
  ];

  // Group by common themes
  const clusters = [];

  // Cluster 1: Product/Brand
  const brandKeywords = allKeywords
    .filter(k => k.keyword.toLowerCase().includes(productName.toLowerCase().split(' ')[0]))
    .slice(0, 10);
  
  if (brandKeywords.length > 0) {
    clusters.push({
      name: `${productName} Core`,
      keywords: brandKeywords.map(k => k.keyword),
      priority: 10,
      contentSuggestions: [
        'Product landing page optimization',
        'Feature-focused content',
        'Use case documentation'
      ]
    });
  }

  // Cluster 2: Solutions/Features
  const solutionKeywords = allKeywords
    .filter(k => k.keyword.includes('solution') || k.keyword.includes('feature') || 
                  k.keyword.includes('tool') || k.keyword.includes('platform'))
    .slice(0, 10);
  
  if (solutionKeywords.length > 0) {
    clusters.push({
      name: 'Solutions & Features',
      keywords: solutionKeywords.map(k => k.keyword),
      priority: 9,
      contentSuggestions: [
        'Feature comparison pages',
        'Solution-focused blog posts',
        'Integration guides'
      ]
    });
  }

  // Cluster 3: How-to / Educational
  const educational = allKeywords
    .filter(k => k.keyword.includes('how') || k.keyword.includes('guide') ||
                  k.keyword.includes('tutorial') || k.keyword.includes('learn'))
    .slice(0, 10);
  
  if (educational.length > 0) {
    clusters.push({
      name: 'Educational Content',
      keywords: educational.map(k => k.keyword),
      priority: 8,
      contentSuggestions: [
        'How-to guides',
        'Tutorial videos',
        'Best practices documentation'
      ]
    });
  }

  return clusters.slice(0, 5);
}

// ============================================
// CONTENT OPPORTUNITIES
// ============================================

async function identifyContentOpportunities(extracted, competitor, clusters, websiteData) {
  console.log('💡 [Opportunities] Identifying content gaps...');

  const opportunities = [];

  // Missing landing pages for primary keywords
  (extracted.primary || []).slice(0, 5).forEach(kw => {
    opportunities.push({
      keyword: kw.keyword,
      pageSuggestion: `Landing page: "${kw.keyword}"`,
      reason: `High-value primary keyword with ${kw.opportunity} opportunity`,
      impact: 'high',
      type: 'landing_page',
      priority: 10
    });
  });

  // Blog opportunities for questions
  (extracted.questions || []).slice(0, 5).forEach(kw => {
    opportunities.push({
      keyword: kw.keyword,
      pageSuggestion: `Blog post: "${kw.keyword}"`,
      reason: 'Question-based keyword perfect for informational content',
      impact: 'medium',
      type: 'blog_post',
      priority: 7
    });
  });

  // Competitor keyword gaps
  (competitor || []).slice(0, 5).forEach(kw => {
    opportunities.push({
      keyword: kw.keyword,
      pageSuggestion: `Content targeting: "${kw.keyword}"`,
      reason: `Competitor ranks for this but you don't - ${kw.reason}`,
      impact: 'high',
      type: 'competitor_gap',
      priority: 9
    });
  });

  // Long-tail content opportunities
  (extracted.longTail || []).slice(0, 5).forEach(kw => {
    opportunities.push({
      keyword: kw.keyword,
      pageSuggestion: `Detailed guide: "${kw.keyword}"`,
      reason: 'Specific long-tail keyword with low competition',
      impact: 'medium',
      type: 'long_tail',
      priority: 6
    });
  });

  return opportunities
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 20);
}

// ============================================
// GEO KEYWORDS (AI Search Optimization) - ENHANCED
// ============================================

async function generateGEOKeywords(productName, industry, extracted, clusters) {
  console.log('🤖 [GEO] Generating AI search engine optimization keywords...');

  const geoKeywords = [];
  const baseName = productName.toLowerCase();
  const baseIndustry = industry.toLowerCase();

  // Strategy 1: Generate definition and explanation questions
  const definitionQuestions = [
    {
      question: `What is ${productName}?`,
      platform: 'chatgpt',
      answerOpportunity: 'high',
      contentSuggestion: `Create a clear, concise definition page with: What ${productName} does, key benefits, use cases, and who it's for`,
      intent: 'informational',
      priority: 10
    },
    {
      question: `How does ${productName} work?`,
      platform: 'gemini',
      answerOpportunity: 'high',
      contentSuggestion: `Step-by-step explanation with diagrams showing: Process flow, key features in action, integration steps`,
      intent: 'informational',
      priority: 9
    },
    {
      question: `What are the benefits of ${productName}?`,
      platform: 'perplexity',
      answerOpportunity: 'high',
      contentSuggestion: `Comprehensive benefits list with: Measurable outcomes, ROI examples, customer success stories`,
      intent: 'commercial',
      priority: 9
    },
    {
      question: `Is ${productName} worth it?`,
      platform: 'chatgpt',
      answerOpportunity: 'high',
      contentSuggestion: `Value analysis covering: Cost-benefit analysis, comparison with alternatives, ideal customer profiles`,
      intent: 'commercial',
      priority: 8
    }
  ];

  geoKeywords.push(...definitionQuestions);

  // Strategy 2: Generate "how to" questions from clusters
  if (clusters && clusters.length > 0) {
    clusters.slice(0, 3).forEach(cluster => {
      geoKeywords.push({
        question: `How to ${cluster.name.toLowerCase()} with ${productName}`,
        platform: 'all',
        answerOpportunity: 'high',
        contentSuggestion: `Tutorial covering: Prerequisites, step-by-step guide, common pitfalls, best practices`,
        intent: 'informational',
        priority: 7
      });
    });
  }

  // Strategy 3: Generate comparison and alternative questions
  const comparisonQuestions = [
    {
      question: `${productName} vs competitors comparison`,
      platform: 'all',
      answerOpportunity: 'high',
      contentSuggestion: `Detailed comparison matrix with: Feature comparison, pricing comparison, pros/cons, use case fit`,
      intent: 'commercial',
      priority: 9
    },
    {
      question: `Best alternatives to ${productName}`,
      platform: 'perplexity',
      answerOpportunity: 'medium',
      contentSuggestion: `Honest comparison including: When ${productName} is the best choice, when alternatives might be better, feature trade-offs`,
      intent: 'commercial',
      priority: 7
    },
    {
      question: `${productName} vs [top competitor]`,
      platform: 'all',
      answerOpportunity: 'high',
      contentSuggestion: `Head-to-head comparison with: Feature matrix, pricing breakdown, target audience differences`,
      intent: 'commercial',
      priority: 8
    }
  ];

  geoKeywords.push(...comparisonQuestions);

  // Strategy 4: Generate use case questions
  const useCaseQuestions = [
    {
      question: `${productName} for small businesses`,
      platform: 'gemini',
      answerOpportunity: 'high',
      contentSuggestion: `Small business guide with: Pricing for SMBs, setup time, ROI timeline, success stories`,
      intent: 'commercial',
      priority: 8
    },
    {
      question: `${productName} for ${baseIndustry}`,
      platform: 'all',
      answerOpportunity: 'high',
      contentSuggestion: `Industry-specific guide with: Industry challenges solved, relevant features, integration with industry tools`,
      intent: 'commercial',
      priority: 9
    },
    {
      question: `Best practices for ${productName}`,
      platform: 'perplexity',
      answerOpportunity: 'high',
      contentSuggestion: `Expert guide covering: Setup optimization, workflow recommendations, advanced tips, common mistakes to avoid`,
      intent: 'informational',
      priority: 7
    }
  ];

  geoKeywords.push(...useCaseQuestions);

  // Strategy 5: Generate problem-solution questions from primary keywords
  if (extracted && extracted.primary && extracted.primary.length > 0) {
    extracted.primary.slice(0, 3).forEach(kw => {
      geoKeywords.push({
        question: `How to ${kw.keyword}`,
        platform: 'chatgpt',
        answerOpportunity: 'medium',
        contentSuggestion: `Problem-solving guide showing how ${productName} helps with: Problem overview, ${productName} solution, step-by-step implementation`,
        intent: 'informational',
        priority: 6
      });
    });
  }

  // Strategy 6: Research AI search trends using Tavily
  if (TAVILY_API_KEY && geoKeywords.length < 20) {
    try {
      console.log('🔍 [GEO] Researching AI search trends...');
      
      const tavilyResults = await searchWithTavily(
        `${productName} ChatGPT Gemini AI search questions`
      );
      
      tavilyResults.forEach(result => {
        const text = `${result.title} ${result.snippet || ''}`;
        
        // Extract question-like patterns
        const questionPattern = /(?:what|how|why|when|where|who|is|are|can|should|does)\s+[^?.!]+\?/gi;
        let match;
        while ((match = questionPattern.exec(text)) !== null) {
          const question = match[0].trim();
          if (question.toLowerCase().includes(baseName) || 
              question.toLowerCase().includes(baseIndustry)) {
            geoKeywords.push({
              question: question,
              platform: 'all',
              answerOpportunity: 'medium',
              contentSuggestion: `Answer this question with facts, examples, and clear explanations`,
              intent: 'informational',
              priority: 6,
              source: 'tavily'
            });
          }
        }
      });
    } catch (error) {
      console.log('⚠️ [GEO] Tavily research failed:', error.message);
    }
  }

  // Deduplicate and sort by priority
  const uniqueGeoKeywords = deduplicateGeoKeywords(geoKeywords);
  
  return uniqueGeoKeywords
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 25);
}

function deduplicateGeoKeywords(keywords) {
  const map = new Map();
  
  keywords.forEach(kw => {
    const key = kw.question.toLowerCase().trim();
    if (!map.has(key)) {
      map.set(key, kw);
    } else {
      // Keep the one with higher priority
      const existing = map.get(key);
      if (kw.priority > existing.priority) {
        map.set(key, kw);
      }
    }
  });
  
  return Array.from(map.values());
}

// ============================================
// AI HELPER
// ============================================

async function callGroqAI(prompt) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!response.ok) throw new Error('Groq API error');

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) throw new Error('No content in response');

  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(content);
  } catch {
    throw new Error('Failed to parse JSON');
  }
}

// ============================================
// FALLBACK
// ============================================

function generateFallbackKeywordIntelligence(productName, industry) {
  console.log('🔄 [Fallback] Generating fallback keyword intelligence...');

  const baseName = productName.toLowerCase();

  return {
    primaryKeywords: [
      {
        keyword: productName,
        intent: 'navigational',
        difficulty: 'easy',
        opportunity: 'high',
        confidenceScore: 95,
        reason: 'Brand name - primary keyword'
      },
      {
        keyword: `${baseName} software`,
        intent: 'commercial',
        difficulty: 'medium',
        opportunity: 'high',
        confidenceScore: 85,
        reason: 'Commercial intent keyword for product category'
      },
      {
        keyword: `${baseName} platform`,
        intent: 'informational',
        difficulty: 'medium',
        opportunity: 'high',
        confidenceScore: 80,
        reason: 'Platform-focused keyword'
      }
    ],
    secondaryKeywords: [
      {
        keyword: `${baseName} features`,
        intent: 'informational',
        difficulty: 'easy',
        opportunity: 'medium',
        confidenceScore: 75,
        reason: 'Feature discovery keyword'
      },
      {
        keyword: `${baseName} pricing`,
        intent: 'commercial',
        difficulty: 'easy',
        opportunity: 'high',
        confidenceScore: 85,
        reason: 'High commercial intent'
      },
      {
        keyword: `${baseName} review`,
        intent: 'commercial',
        difficulty: 'medium',
        opportunity: 'medium',
        confidenceScore: 70,
        reason: 'Research phase keyword'
      }
    ],
    longTailKeywords: [
      {
        keyword: `how to use ${baseName}`,
        intent: 'informational',
        difficulty: 'easy',
        opportunity: 'high',
        confidenceScore: 80,
        reason: 'Tutorial/guide keyword with low competition'
      },
      {
        keyword: `${baseName} for small business`,
        intent: 'commercial',
        difficulty: 'easy',
        opportunity: 'high',
        confidenceScore: 75,
        reason: 'Niche targeting with specific audience'
      }
    ],
    questionKeywords: [
      {
        keyword: `what is ${productName}?`,
        intent: 'informational',
        difficulty: 'easy',
        opportunity: 'high',
        confidenceScore: 85,
        reason: 'FAQ keyword perfect for featured snippets'
      },
      {
        keyword: `how does ${baseName} work?`,
        intent: 'informational',
        difficulty: 'easy',
        opportunity: 'medium',
        confidenceScore: 75,
        reason: 'Explanation-seeking query'
      }
    ],
    clusters: [
      {
        name: `${productName} Core`,
        keywords: [productName, `${baseName} software`, `${baseName} platform`],
        priority: 10,
        contentSuggestions: [
          'Optimize homepage and product pages',
          'Create comprehensive product documentation',
          'Build feature showcase pages'
        ]
      },
      {
        name: 'Commercial Intent',
        keywords: [`${baseName} pricing`, `${baseName} review`, `${baseName} vs competitors`],
        priority: 9,
        contentSuggestions: [
          'Transparent pricing page',
          'Customer testimonials and case studies',
          'Competitive comparison pages'
        ]
      }
    ],
    competitorKeywords: [
      {
        keyword: `${baseName} alternative`,
        competitorUsing: 'Various competitors',
        reason: 'Competitors rank for alternative searches',
        opportunity: 'high',
        intent: 'commercial',
        difficulty: 'medium'
      }
    ],
    contentOpportunities: [
      {
        keyword: `${baseName} guide`,
        pageSuggestion: `Complete ${productName} Guide`,
        reason: 'Educational content gap',
        impact: 'high',
        type: 'blog_post',
        priority: 8
      }
    ],
    geoKeywords: [
      {
        question: `What is ${productName}?`,
        platform: 'chatgpt',
        answerOpportunity: 'high',
        contentSuggestion: 'Clear, concise product definition with use cases',
        intent: 'informational'
      },
      {
        question: `How to use ${productName}`,
        platform: 'gemini',
        answerOpportunity: 'high',
        contentSuggestion: 'Step-by-step tutorial with visuals',
        intent: 'informational'
      }
    ],
    metadata: {
      totalKeywords: 15,
      clustersCount: 2,
      opportunitiesCount: 1,
      analyzedAt: new Date().toISOString(),
      isFallback: true,
      source: 'heuristic_fallback',
      confidence: 'low'
    }
  };
}

// ============================================
// KEYWORD BUCKET NORMALIZATION
// ============================================

/**
 * Normalize keyword buckets: promote secondary→primary when primary is empty
 */
function normalizeKeywordBuckets(result, identity) {
  if (!result) return result;
  
  const safeIdentity = identity || {};
  const productName = (safeIdentity.productName || safeIdentity.brandName || '').toLowerCase();
  const domain = (safeIdentity.domain || '').toLowerCase();
  const isCanva = productName.includes('canva') || domain.includes('canva');
  
  // Step 1: Promote secondary → primary when primary is empty
  if ((result.primaryKeywords || []).length === 0 && (result.secondaryKeywords || []).length > 0) {
    const sorted = [...result.secondaryKeywords].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    result.primaryKeywords = sorted.slice(0, 5).map(k => ({ ...k, confidence: Math.max(k.confidence || 50, 70) }));
    result.secondaryKeywords = sorted.slice(5);
    console.log(`✅ [Keyword Normalizer] Promoted ${result.primaryKeywords.length} secondary keywords to primary`);
  }
  
  // Step 2: Promote longTail → secondary when secondary is now empty
  if ((result.secondaryKeywords || []).length === 0 && (result.longTailKeywords || []).length > 0) {
    const sorted = [...result.longTailKeywords].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    result.secondaryKeywords = sorted.slice(0, 10).map(k => ({ ...k, confidence: Math.max(k.confidence || 40, 60) }));
    result.longTailKeywords = sorted.slice(10);
    console.log(`✅ [Keyword Normalizer] Promoted ${result.secondaryKeywords.length} longTail keywords to secondary`);
  }
  
  // Step 3: For Canva, remove Orkyn/software keywords that leaked from generic fallbacks
  if (isCanva) {
    const orkynTerms = ['custom software', 'software implementation', 'business automation', 'enterprise software', 'software consulting', 'digital transformation', 'cloud software', 'business process', 'erp', 'salesforce', 'crm integration', 'business solutions', 'professional services'];
    const filterOrkyn = (kw) => {
      const keyword = (kw.keyword || '').toLowerCase();
      return !orkynTerms.some(term => keyword.includes(term));
    };
    result.primaryKeywords = (result.primaryKeywords || []).filter(filterOrkyn);
    result.secondaryKeywords = (result.secondaryKeywords || []).filter(filterOrkyn);
    result.longTailKeywords = (result.longTailKeywords || []).filter(filterOrkyn);
    console.log(`✅ [Keyword Normalizer] Filtered Orkyn/software keywords for Canva (primary: ${result.primaryKeywords.length}, secondary: ${result.secondaryKeywords.length}, longTail: ${result.longTailKeywords.length})`);
  }

  // Step 4: Force Canva seed keywords if still empty
  if ((result.primaryKeywords || []).length === 0 && isCanva) {
    result.primaryKeywords = [
      { keyword: 'graphic design tool', intent: 'commercial', confidence: 80, source: 'Seed', searchVolume: null, keywordDifficulty: null, cpc: null, contentType: 'Landing Page', opportunity: 85 },
      { keyword: 'online design platform', intent: 'commercial', confidence: 75, source: 'Seed', searchVolume: null, keywordDifficulty: null, cpc: null, contentType: 'Landing Page', opportunity: 80 },
      { keyword: 'presentation maker', intent: 'commercial', confidence: 80, source: 'Seed', searchVolume: null, keywordDifficulty: null, cpc: null, contentType: 'Landing Page', opportunity: 85 },
      { keyword: 'social media design tool', intent: 'commercial', confidence: 75, source: 'Seed', searchVolume: null, keywordDifficulty: null, cpc: null, contentType: 'Landing Page', opportunity: 80 },
      { keyword: 'Canva pricing plans', intent: 'commercial', confidence: 85, source: 'Seed', searchVolume: null, keywordDifficulty: null, cpc: null, contentType: 'Landing Page', opportunity: 90 },
    ];
    result.secondaryKeywords = result.secondaryKeywords.length > 0 ? result.secondaryKeywords : [
      { keyword: 'Canva vs Adobe Express', intent: 'commercial', confidence: 70, source: 'Seed', searchVolume: null, keywordDifficulty: null, cpc: null, contentType: 'Comparison', opportunity: 75 },
      { keyword: 'logo maker', intent: 'commercial', confidence: 70, source: 'Seed', searchVolume: null, keywordDifficulty: null, cpc: null, contentType: 'Landing Page', opportunity: 75 },
      { keyword: 'brand kit software', intent: 'commercial', confidence: 65, source: 'Seed', searchVolume: null, keywordDifficulty: null, cpc: null, contentType: 'Landing Page', opportunity: 70 },
      { keyword: 'Canva alternatives', intent: 'commercial', confidence: 75, source: 'Seed', searchVolume: null, keywordDifficulty: null, cpc: null, contentType: 'Comparison', opportunity: 80 },
    ];
    console.log(`✅ [Keyword Normalizer] Injected ${result.primaryKeywords.length} Canva-specific seed keywords`);
  }
  
  // Update metadata totals
  result.metadata = result.metadata || {};
  result.metadata.totalKeywords = 
    (result.primaryKeywords?.length || 0) +
    (result.secondaryKeywords?.length || 0) +
    (result.longTailKeywords?.length || 0);
  result.metadata.primaryCount = result.primaryKeywords?.length || 0;
  result.metadata.secondaryCount = result.secondaryKeywords?.length || 0;
  result.metadata.longTailCount = result.longTailKeywords?.length || 0;
  
  return result;
}

export default {
  generateKeywordIntelligence
};
