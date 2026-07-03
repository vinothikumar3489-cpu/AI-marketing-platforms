import { prisma } from '../../config/prisma.js';
import fetch from 'node-fetch';
import { scrapeWebsite } from '../../services/scraping/unified-scraper.service.js';
import { 
  generateProductFallback, 
  generateMarketFallback, 
  generateAudienceFallback, 
  generateCompetitorFallback, 
  generateIntentFallback, 
  generatePositioningFallback, 
  generateCampaignFallback,
  generateChannelFallback 
} from './fallback.generators.js';
import { deriveWebsiteIdentity } from '../../utils/seo-identity.util.js';
import { collectResearchData } from '../../services/intelligence/research-orchestrator.service.js';
import {
  validateProductAnalysis,
  validateMarketDiscovery,
  validateAudienceIntelligence,
  validateCompetitorAnalysis,
  validateIntentPrediction,
  validatePositioningEngine,
  validateCampaignGenerator,
  validateChannelRecommendation
} from '../../utils/ai-response-validator.js';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;
const CEREBRAS_API_URL = process.env.CEREBRAS_API_URL || 'https://api.cerebras.net/v1/generate';
const CEREBRAS_MODEL = process.env.CEREBRAS_MODEL || 'cerebras-c1-mini';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.ai/v1/completions';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-business-intel';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const MAX_CONTEXT_CHARS = 8000;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Normalizes text list to array format and safely joins with separator
 * Handles: string, array, undefined, null, object
 */
function normalizeTextList(value, separator = ', ') {
  if (!value) return '';
  if (Array.isArray(value)) return value.filter(Boolean).join(separator);
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Safely converts value to array
 * Handles: array, undefined, null, string, object
 */
function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object') return Object.values(parsed);
      return value.trim() ? [value] : [];
    } catch {
      return value.trim() ? [value] : [];
    }
  }
  if (typeof value === 'object') return Object.values(value);
  return [];
}

// ============================================
// MAIN UNIFIED ANALYSIS FUNCTION
// ============================================

export async function runFullGrowthAnalysis({ chatId, userId, input }) {
  console.log('🚀 [Growth Workspace] Starting full analysis:', { chatId, userId, productName: input.productName });

  // STEP 1: Validate chat exists - do NOT auto-create
  if (!chatId || chatId === 'temp-' || chatId.startsWith('temp-')) {
    console.error('❌ [Growth Workspace] No valid chatId provided');
    return {
      success: false,
      error: 'No valid project selected. Please select or create a project first.',
      results: {},
      steps: []
    };
  }

  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId }
  });

  if (!chat) {
    console.error('❌ [Growth Workspace] Chat not found or not owned by user');
    return {
      success: false,
      error: 'Project not found. Please select a valid project.',
      results: {},
      steps: []
    };
  }

  console.log('✅ [Growth Workspace] Chat validated:', { chatId: chat.id });

  // Use the valid chat ID for all operations
  const validChatId = chat.id;

  // IMPROVED: Don't delete old data immediately - we'll use upsert operations instead
  // This prevents data loss if analysis fails mid-way
  // Old approach (REMOVED): await prisma.productIntelligence.deleteMany({ where: { chatId: validChatId } });
  console.log('💾 [Growth Workspace] Using transactional upsert approach (old data preserved until success)');

  const steps = [
    { key: 'product', label: 'Product Analysis', status: 'pending' },
    { key: 'market', label: 'Market Discovery', status: 'pending' },
    { key: 'audience', label: 'Audience Intelligence', status: 'pending' },
    { key: 'competitor', label: 'Competitor Analysis', status: 'pending' },
    { key: 'intent', label: 'Intent Prediction', status: 'pending' },
    { key: 'positioning', label: 'Positioning Engine', status: 'pending' },
    { key: 'campaign', label: 'Campaign Generator', status: 'pending' },
    { key: 'channel', label: 'Channel Recommendation', status: 'pending' }
  ];

  const results = {};
  const warnings = [];
  let overallStatus = 'in_progress';
  let websiteData = null;

  try {
    // Step 0: Collect research data using orchestrator (single source of truth)
    let researchData = null;
    if (input.websiteUrl) {
      console.log('🔍 [Growth Workspace] Collecting research data via orchestrator:', input.websiteUrl);
      try {
        researchData = await collectResearchData({
          websiteUrl: input.websiteUrl,
          productName: input.productName || '',
          companyName: input.companyName || ''
        });
        console.log('✅ [Growth Workspace] Research data collected:', {
          hasWebsite: !!researchData.websiteContent,
          hasTechnical: !!researchData.technical,
          competitorsCount: researchData.competitors.length,
          keywordsCount: researchData.keywords.length
        });
      } catch (researchError) {
        console.log('⚠️ [Growth Workspace] Research orchestrator failed, falling back to direct scrape:', researchError.message);
      }
    }

    // Step 1: Scrape website if not already done by orchestrator
    if (input.websiteUrl && !researchData?.websiteContent) {
      console.log('🔍 [Growth Workspace] Scraping website (fallback):', input.websiteUrl);
      try {
        const scrapeResult = await scrapeWebsite(input.websiteUrl, {
          timeout: 20000,
          extractSchema: true
        });
        
        if (scrapeResult.success) {
          websiteData = scrapeResult.data;
          console.log('✅ [Growth Workspace] Website scraped successfully:', {
            titleLength: websiteData.metadata?.title?.length,
            contentLength: websiteData.text?.length,
            hasDescription: !!websiteData.metadata?.description
          });
          
          // Enrich input with scraped data if description is missing
          if (!input.description && websiteData.metadata?.description) {
            input.description = websiteData.metadata.description;
          }
        } else {
          console.log('⚠️ [Growth Workspace] Website scraping failed, continuing without scraped data');
        }
      } catch (scrapeError) {
        console.log('⚠️ [Growth Workspace] Scraping error:', scrapeError.message);
      }
    } else if (researchData?.websiteContent) {
      websiteData = researchData.websiteContent;
      console.log('✅ [Growth Workspace] Using website content from orchestrator');
    }

    // Limit scraped content size to prevent 429 token limits
    if (websiteData) {
      if (websiteData.text && websiteData.text.length > 5000) {
        websiteData.text = websiteData.text.substring(0, 5000) + '...';
      }
      if (websiteData.html && websiteData.html.length > 5000) {
        websiteData.html = websiteData.html.substring(0, 5000) + '...';
      }
    }

    // Derive proper identity from scraped data and URL
    const identity = deriveWebsiteIdentity({ websiteUrl: input.websiteUrl, scrapedData: websiteData || {}, chat });
    console.log('✅ [Growth Workspace] Derived Identity:', identity);
    
    // Inject identity into input but prefer user inputs from the new multi-step form
    input.productName = input.brandName || identity.productName;
    input.companyName = input.companyName || identity.companyName;
    input.industry = input.industry || identity.industry;
    input.businessModel = identity.businessModel;
    input.businessCategory = identity.businessCategory;
    input.companySize = identity.companySize;

    // Step 1: Product Analysis
    console.log('✨ [Growth Workspace] Running Product Analysis...');
    steps[0].status = 'running';
    try {
      const rawResult = await runProductAnalysis(input, websiteData);
      results.product = validateProductAnalysis(rawResult, input);
      steps[0].status = 'completed';
      steps[0].provider = results.product.provider || 'groq';
      steps[0].confidenceScore = results.product.confidenceScore || 75;
      console.log('✅ [Growth Workspace] Product Analysis complete & validated:', {
        hasUSP: !!results.product.usp,
        featuresCount: results.product.features?.length || 0,
        provider: results.product.provider
      });
    } catch (error) {
      console.log('⚠️ [Growth Workspace] Product Analysis failed:', error.message);
      warnings.push(`Product Analysis fallback: ${error.message}`);
      results.product = validateProductAnalysis(null, input);
      steps[0].status = 'completed';
      steps[0].provider = 'fallback';
      steps[0].confidenceScore = results.product.confidenceScore || 55;
    }

    // Step 2: Market Discovery
    await new Promise(resolve => setTimeout(resolve, 4000));
    console.log('✨ [Growth Workspace] Running Market Discovery...');
    steps[1].status = 'running';
    try {
      const rawResult = await runMarketDiscovery(input, results.product);
      results.market = validateMarketDiscovery(rawResult, input);
      steps[1].status = 'completed';
      steps[1].provider = results.market.provider || 'groq';
      steps[1].confidenceScore = results.market.confidenceScore || 70;
      console.log('✅ [Growth Workspace] Market Discovery complete & validated:', {
        trendsCount: results.market.marketTrends?.length || 0,
        opportunitiesCount: results.market.opportunities?.length || 0,
        provider: results.market.provider
      });
    } catch (error) {
      console.log('⚠️ [Growth Workspace] Market Discovery failed:', error.message);
      warnings.push(`Market Discovery fallback: ${error.message}`);
      results.market = validateMarketDiscovery(null, input);
      steps[1].status = 'completed';
      steps[1].provider = 'fallback';
      steps[1].confidenceScore = results.market.confidenceScore || 55;
    }

    // Step 3: Audience Intelligence
    await new Promise(resolve => setTimeout(resolve, 4000));
    console.log('✨ [Growth Workspace] Running Audience Intelligence...');
    steps[2].status = 'running';
    try {
      const rawResult = await runAudienceIntelligence(input, results.product);
      results.audience = validateAudienceIntelligence(rawResult, input);
      steps[2].status = 'completed';
      steps[2].provider = results.audience.provider || 'groq';
      steps[2].confidenceScore = results.audience.confidenceScore || 75;
      console.log('✅ [Growth Workspace] Audience Intelligence complete & validated:', {
        personasCount: results.audience.buyerPersonas?.length || 0,
        channelsCount: results.audience.bestChannels?.length || 0,
        provider: results.audience.provider
      });
    } catch (error) {
      console.log('⚠️ [Growth Workspace] Audience Intelligence failed:', error.message);
      warnings.push(`Audience Intelligence fallback: ${error.message}`);
      results.audience = validateAudienceIntelligence(null, input);
      steps[2].status = 'completed';
      steps[2].provider = 'fallback';
      steps[2].confidenceScore = results.audience.confidenceScore || 55;
    }

    // Step 4: Competitor Analysis
    await new Promise(resolve => setTimeout(resolve, 4000));
    console.log('✨ [Growth Workspace] Running Competitor Analysis...');
    steps[3].status = 'running';
    try {
      const rawResult = await runCompetitorAnalysis(input, results.product, researchData?.competitors || []);
      results.competitor = validateCompetitorAnalysis(rawResult, input);
      steps[3].status = 'completed';
      steps[3].provider = results.competitor.provider || 'groq';
      steps[3].confidenceScore = results.competitor.confidenceScore || 70;
      console.log('✅ [Growth Workspace] Competitor Analysis complete & validated:', {
        competitorsCount: results.competitor.directCompetitors?.length || 0,
        gapsCount: results.competitor.marketGaps?.length || 0,
        provider: results.competitor.provider,
        orchestratorCompetitorsUsed: researchData?.competitors?.length || 0
      });
    } catch (error) {
      console.log('⚠️ [Growth Workspace] Competitor Analysis failed:', error.message);
      warnings.push(`Competitor Analysis fallback: ${error.message}`);
      results.competitor = validateCompetitorAnalysis(null, input);
      steps[3].status = 'completed';
      steps[3].provider = 'fallback';
      steps[3].confidenceScore = results.competitor.confidenceScore || 55;
    }

    // Step 5: Intent Prediction
    await new Promise(resolve => setTimeout(resolve, 4000));
    console.log('✨ [Growth Workspace] Running Intent Prediction...');
    steps[4].status = 'running';
    try {
      const rawResult = await runIntentPrediction(input, results.audience);
      results.intent = validateIntentPrediction(rawResult, input);
      steps[4].status = 'completed';
      steps[4].provider = results.intent.provider || 'groq';
      steps[4].confidenceScore = results.intent.confidenceScore || 68;
      console.log('✅ [Growth Workspace] Intent Prediction complete & validated:', {
        hotSegmentsCount: results.intent.hotSegments?.length || 0,
        signalsCount: results.intent.buyingSignals?.length || 0,
        provider: results.intent.provider
      });
    } catch (error) {
      console.log('⚠️ [Growth Workspace] Intent Prediction failed:', error.message);
      warnings.push(`Intent Prediction fallback: ${error.message}`);
      results.intent = validateIntentPrediction(null, input);
      steps[4].status = 'completed';
      steps[4].provider = 'fallback';
      steps[4].confidenceScore = results.intent.confidenceScore || 55;
    }

    // Step 6: Positioning Engine
    await new Promise(resolve => setTimeout(resolve, 4000));
    console.log('✨ [Growth Workspace] Running Positioning Engine...');
    steps[5].status = 'running';
    try {
      const rawResult = await runPositioningEngine(input, results.product, results.competitor);
      results.positioning = validatePositioningEngine(rawResult, input);
      steps[5].status = 'completed';
      steps[5].provider = results.positioning.provider || 'groq';
      steps[5].confidenceScore = results.positioning.confidenceScore || 72;
      console.log('✅ [Growth Workspace] Positioning Engine complete & validated:', {
        hasStatement: !!results.positioning.positioningStatement,
        pillarsCount: results.positioning.messagingPillars?.length || 0,
        provider: results.positioning.provider
      });
    } catch (error) {
      console.log('⚠️ [Growth Workspace] Positioning Engine failed:', error.message);
      warnings.push(`Positioning Engine fallback: ${error.message}`);
      results.positioning = validatePositioningEngine(null, input);
      steps[5].status = 'completed';
      steps[5].provider = 'fallback';
      steps[5].confidenceScore = results.positioning.confidenceScore || 55;
    }

    // Step 7: Campaign Generator
    await new Promise(resolve => setTimeout(resolve, 4000));
    console.log('✨ [Growth Workspace] Running Campaign Generator...');
    steps[6].status = 'running';
    try {
      const rawResult = await runCampaignGenerator(input, results);
      results.campaign = validateCampaignGenerator(rawResult, input);
      steps[6].status = 'completed';
      steps[6].provider = results.campaign.provider || 'groq';
      steps[6].confidenceScore = results.campaign.confidenceScore || 75;
      console.log('✅ [Growth Workspace] Campaign Generator complete & validated:', {
        anglesCount: results.campaign.creativeAngles?.length || 0,
        hooksCount: results.campaign.copyHooks?.length || 0,
        hasActionPlan: !!(results.campaign.actionPlan?.sevenDay?.length || results.campaign.actionPlan?.thirtyDay?.length),
        provider: results.campaign.provider
      });
    } catch (error) {
      console.log('⚠️ [Growth Workspace] Campaign Generator failed:', error.message);
      warnings.push(`Campaign Generator fallback: ${error.message}`);
      results.campaign = validateCampaignGenerator(null, input);
      steps[6].status = 'completed';
      steps[6].provider = 'fallback';
      steps[6].confidenceScore = results.campaign.confidenceScore || 55;
    }

    // Step 8: Channel Recommendation
    await new Promise(resolve => setTimeout(resolve, 4000));
    console.log('✨ [Growth Workspace] Running Channel Recommendation...');
    steps[7].status = 'running';
    try {
      const rawResult = await runChannelRecommendation(input, results.audience, results.campaign);
      results.channel = validateChannelRecommendation(rawResult, input);
      steps[7].status = 'completed';
      steps[7].provider = results.channel.provider || 'groq';
      steps[7].confidenceScore = results.channel.confidenceScore || 73;
      console.log('✅ [Growth Workspace] Channel Recommendation complete & validated:', {
        channelsCount: results.channel.recommendedChannels?.length || 0,
        primaryChannel: results.channel.primaryChannel,
        provider: results.channel.provider
      });
    } catch (error) {
      console.log('⚠️ [Growth Workspace] Channel Recommendation failed:', error.message);
      warnings.push(`Channel Recommendation fallback: ${error.message}`);
      results.channel = validateChannelRecommendation(null, input);
      steps[7].status = 'completed';
      steps[7].provider = 'fallback';
      steps[7].confidenceScore = results.channel.confidenceScore || 55;
    }

    overallStatus = 'completed';

    // Normalize all results
    const normalizedResults = normalizeGrowthResults(results, input);
    console.log('🔄 [Growth Workspace] Results normalized');
    console.log('[Growth Normalize] normalizedResults keys', Object.keys(normalizedResults || {}));

    // Calculate growth scores from actual module outputs
    function calculateGrowthScore(results) {
      const modules = [
        results?.product,
        results?.market,
        results?.audience,
        results?.competitor,
        results?.intent,
        results?.positioning,
        results?.campaign,
        results?.channel
      ].filter(Boolean);

      if (!modules.length) return null;

      // Use actual module outputs instead of generic confidence scores
      const scores = {
        productFit: calculateProductFitScore(results?.product),
        marketOpportunity: calculateMarketOpportunityScore(results?.market),
        audienceClarity: calculateAudienceClarityScore(results?.audience),
        competitiveDefensibility: calculateCompetitiveDefensibilityScore(results?.competitor),
        campaignReadiness: calculateCampaignReadinessScore(results?.campaign, results?.channel)
      };

      const validScores = Object.values(scores).filter(s => s !== null && s > 0);
      
      if (validScores.length) {
        return Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);
      }

      return Math.round((modules.length / 8) * 100);
    }

    function calculateProductFitScore(product) {
      if (!product) return null;
      // Score based on product maturity, value propositions, and differentiators
      const maturityScore = product.productMaturity === 'Growth' ? 80 : product.productMaturity === 'Mature' ? 90 : 60;
      const valuePropScore = (product.valuePropositions?.length || 0) * 10;
      const differentiatorScore = (product.keyDifferentiators?.length || 0) * 8;
      return Math.min(100, Math.round((maturityScore + valuePropScore + differentiatorScore) / 3));
    }

    function calculateMarketOpportunityScore(market) {
      if (!market) return null;
      // Score based on market size, growth rate, and demand
      const demandScore = market.demandScore || 0;
      const growthRateScore = (market.marketGrowthRate || 0) * 10;
      const opportunityScore = (market.growthOpportunities?.length || 0) * 12;
      return Math.min(100, Math.round((demandScore + growthRateScore + opportunityScore) / 3));
    }

    function calculateAudienceClarityScore(audience) {
      if (!audience) return null;
      // Score based on buyer personas, segments, and clarity
      const personaScore = (audience.buyerPersonas?.length || 0) * 15;
      const segmentScore = (audience.audienceSegments?.length || 0) * 12;
      const clarityScore = audience.audienceClarity === 'High' ? 90 : audience.audienceClarity === 'Medium' ? 70 : 50;
      return Math.min(100, Math.round((personaScore + segmentScore + clarityScore) / 3));
    }

    function calculateCompetitiveDefensibilityScore(competitor) {
      if (!competitor) return null;
      // Score based on differentiation opportunities and market gaps
      const differentiationScore = (competitor.differentiationOpportunities?.length || 0) * 15;
      const gapScore = (competitor.marketGaps?.length || 0) * 12;
      const weaknessScore = (competitor.competitorWeaknesses?.length || 0) * 10;
      return Math.min(100, Math.round((differentiationScore + gapScore + weaknessScore) / 3));
    }

    function calculateCampaignReadinessScore(campaign, channel) {
      if (!campaign && !channel) return null;
      // Score based on campaign angles, hooks, and channel fit
      const angleScore = (campaign?.creativeAngles?.length || 0) * 12;
      const hookScore = (campaign?.copyHooks?.length || 0) * 10;
      const channelScore = (channel?.recommendedChannels?.length || 0) * 15;
      return Math.min(100, Math.round((angleScore + hookScore + channelScore) / 3));
    }

    // Generate product-specific top recommendation
    function generateTopRecommendation(results, input) {
      const productName = input.companyName || input.productName || 'the product';
      const primaryChannel = results.channel?.primaryChannel || results.channel?.recommendedChannels?.[0] || 'content marketing';
      const topPersona = results.audience?.buyerPersonas?.[0]?.name || 'target audience';
      const topAngle = results.campaign?.creativeAngles?.[0]?.value || results.campaign?.copyHooks?.[0]?.value || 'compelling messaging';
      const topOpportunity = results.market?.growthOpportunities?.[0]?.value || results.market?.opportunities?.[0]?.value || 'market growth';
      
      return `Focus on ${primaryChannel} to reach ${topPersona} with ${topAngle}, leveraging ${topOpportunity} for ${productName}.`;
    }

    // Generate product-specific primary risk
    function generatePrimaryRisk(results, input) {
      const topRisk = results.market?.risks?.[0]?.value || results.competitor?.competitorWeaknesses?.[0]?.value;
      const topCompetitor = results.competitor?.directCompetitors?.[0]?.name || 'competitors';
      const productName = input.companyName || input.productName || 'the product';
      
      if (topRisk) {
        return `${topRisk} affecting ${productName}.`;
      }
      return `Competitive pressure from ${topCompetitor} in the market.`;
    }

    // Generate product-specific immediate action
    function generateImmediateAction(results, input) {
      const primaryChannel = results.channel?.primaryChannel || results.channel?.recommendedChannels?.[0] || 'marketing';
      const topPersona = results.audience?.buyerPersonas?.[0]?.name || 'target audience';
      const productName = input.companyName || input.productName || 'the product';
      
      return `Launch ${primaryChannel} campaign targeting ${topPersona} to validate ${productName} positioning.`;
    }

    const overallGrowthScore = calculateGrowthScore(normalizedResults);
    const marketOpportunityScore = calculateMarketOpportunityScore(normalizedResults.market);
    const campaignViabilityScore = calculateCampaignReadinessScore(normalizedResults.campaign, normalizedResults.channel);
    const productFitScore = calculateProductFitScore(normalizedResults.product);
    const audienceClarityScore = calculateAudienceClarityScore(normalizedResults.audience);
    const competitiveDefensibilityScore = calculateCompetitiveDefensibilityScore(normalizedResults.competitor);
    const campaignReadinessScore = campaignViabilityScore;

    console.log('[Growth Scores]', {
      overallGrowthScore,
      marketOpportunityScore,
      campaignViabilityScore
    });

    // Generate growth summary with calculated scores and recommendations
    const growthSummary = {
      overallGrowthScore,
      marketOpportunityScore,
      campaignViabilityScore,
      productFitScore,
      marketSizeScore: marketOpportunityScore,
      audienceClarityScore,
      competitiveDefensibilityScore,
      campaignReadinessScore,
      // Generate product-specific recommendations
      topRecommendation: generateTopRecommendation(normalizedResults, input),
      primaryRisk: generatePrimaryRisk(normalizedResults, input),
      immediateAction: generateImmediateAction(normalizedResults, input),
      sourceModules: ['Product Analysis', 'Market Discovery', 'Audience Intelligence', 'Competitor Analysis', 'Intent Prediction', 'Positioning Engine', 'Campaign Generator', 'Channel Recommendation']
    };

    console.log('[Growth Summary]', {
      overallGrowthScore: growthSummary.overallGrowthScore,
      marketOpportunityScore: growthSummary.marketOpportunityScore,
      campaignViabilityScore: growthSummary.campaignViabilityScore,
      topRecommendation: growthSummary.topRecommendation
    });
    console.log('[Growth Snapshot Source]', growthSummary.sourceModules || ['All 8 modules']);

    // Generate executive story from all modules
    const companyName = input.companyName || input.productName || 'Unknown';
    // Fix brand casing - capitalize first letter of each word
    const formattedCompanyName = companyName.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
    
    const growthExecutiveStory = {
      companyOverview: {
        name: formattedCompanyName,
        website: input.websiteUrl || '',
        industry: input.industry || 'Not specified',
      },
      productSummary: {
        usp: normalizedResults.product?.usp || 'Not available',
        features: asArray(normalizedResults.product?.keyFeatures || normalizedResults.product?.features).slice(0, 5),
        targetUsers: asArray(normalizedResults.product?.targetUsers).slice(0, 3),
      },
      marketSummary: {
        demandScore: normalizedResults.market?.demandScore || 70,
        tam: normalizedResults.market?.tam?.value || normalizedResults.market?.tam || 'Not available',
        trends: asArray(normalizedResults.market?.marketTrends).slice(0, 3),
        opportunities: asArray(normalizedResults.market?. growthOpportunities || normalizedResults.market?.opportunities).slice(0, 3),
      },
      audienceSummary: {
        personas: asArray(normalizedResults.audience?.buyerPersonas).slice(0, 3),
        bestChannels: asArray(normalizedResults.audience?.bestChannels).slice(0, 3),
      },
      competitorSummary: {
        competitors: asArray(normalizedResults.competitor?.directCompetitors).slice(0, 3),
        marketGaps: asArray(normalizedResults.competitor?.marketGaps).slice(0, 3),
      },
      positioningSummary: {
        statement: normalizedResults.positioning?.positioningStatement || 'Not available',
        messagingPillars: asArray(normalizedResults.positioning?.messagingPillars).slice(0, 3),
      },
      campaignSummary: {
        creativeAngles: asArray(normalizedResults.campaign?.creativeAngles).slice(0, 3),
        copyHooks: asArray(normalizedResults.campaign?.copyHooks).slice(0, 3),
      },
      channelSummary: {
        primaryChannel: normalizedResults.channel?.primaryChannel || 'Not specified',
        recommendedChannels: asArray(normalizedResults.channel?.recommendedChannels).slice(0, 3),
      },
      keyRisks: asArray(normalizedResults.market?.risks || normalizedResults.competitor?.competitorWeaknesses).slice(0, 3),
      keyOpportunities: asArray(normalizedResults.market?.opportunities || normalizedResults.competitor?.differentiationOpportunities).slice(0, 3),
      finalRecommendation: `For ${formattedCompanyName}, prioritize ${normalizedResults.channel?.primaryChannel || 'content marketing'} to engage ${normalizedResults.audience?.buyerPersonas?.[0]?.name || 'target audience'}. Leverage ${normalizedResults.campaign?.creativeAngles?.[0]?.value || 'compelling messaging'} to capitalize on ${normalizedResults.market?.growthOpportunities?.[0]?.value || 'market opportunities'} while addressing ${normalizedResults.competitor?.directCompetitors?.[0]?.name || 'competitive dynamics'}.`,
      sourceModules: ['Product Analysis', 'Market Discovery', 'Audience Intelligence', 'Competitor Analysis', 'Intent Prediction', 'Positioning Engine', 'Campaign Generator', 'Channel Recommendation'],
      confidence: overallGrowthScore
    };

    // Generate action plan from all modules
    const growthActionPlan = {
      immediate: [],
      day7: [],
      day30: [],
      day60: [],
      day90: []
    };

    // Add actions from campaign generator if available
    if (normalizedResults.campaign?.actionPlan) {
      if (normalizedResults.campaign.actionPlan.sevenDay) {
        growthActionPlan.day7.push(...normalizedResults.campaign.actionPlan.sevenDay);
      }
      if (normalizedResults.campaign.actionPlan.thirtyDay) {
        growthActionPlan.day30.push(...normalizedResults.campaign.actionPlan.thirtyDay);
      }
      if (normalizedResults.campaign.actionPlan.sixtyDay) {
        growthActionPlan.day60.push(...normalizedResults.campaign.actionPlan.sixtyDay);
      }
    }

    // Add generated actions from other modules based on real data
    const productName = input.companyName || input.productName || 'the product';
    const primaryChannel = normalizedResults.channel?.primaryChannel || normalizedResults.channel?.recommendedChannels?.[0]?.channelName || 'marketing';
    const topPersona = normalizedResults.audience?.buyerPersonas?.[0]?.name || 'target audience';
    const topCompetitor = normalizedResults.competitor?.directCompetitors?.[0]?.name || 'competitors';
    const topOpportunity = normalizedResults.market?.growthOpportunities?.[0]?.value || normalizedResults.market?.opportunities?.[0]?.value || 'market growth';
    const topAngle = normalizedResults.campaign?.creativeAngles?.[0]?.value || normalizedResults.campaign?.copyHooks?.[0]?.value || 'compelling messaging';
    const industry = input.industry || 'industry';

    if (growthActionPlan.day7.length === 0) {
      growthActionPlan.day7.push({
        title: `Validate ${productName} positioning for ${topPersona}`,
        problem: `Ensure ${productName} messaging aligns with ${topPersona} needs in ${industry}`,
        evidence: `Based on product analysis: ${normalizedResults.product?.productSummary?.substring(0, 100) || 'product analysis'}`,
        researchSource: 'Product Analysis',
        businessImpact: 'Higher conversion rates from target audience',
        expectedGain: '15-20% improvement in messaging resonance',
        difficulty: 'Medium',
        priority: 'High',
        estimatedTimeline: '1 week',
        owner: 'Marketing Team'
      });
      
      growthActionPlan.day7.push({
        title: `Research ${topCompetitor} positioning and messaging`,
        problem: 'Understand competitive landscape to differentiate effectively',
        evidence: `Competitor analysis identified ${normalizedResults.competitor?.directCompetitors?.length || 0} direct competitors`,
        researchSource: 'Competitor Analysis',
        businessImpact: 'Clear differentiation strategy',
        expectedGain: 'Improved competitive positioning',
        difficulty: 'Low',
        priority: 'High',
        estimatedTimeline: '1 week',
        owner: 'Product Marketing'
      });
    }

    if (growthActionPlan.day30.length === 0) {
      growthActionPlan.day30.push({
        title: `Launch ${primaryChannel} campaign targeting ${topPersona}`,
        problem: `Generate awareness and leads among ${topPersona} using ${topAngle}`,
        evidence: `Channel recommendation shows ${primaryChannel} with fit score of ${normalizedResults.channel?.recommendedChannels?.[0]?.fitScore || 80}`,
        researchSource: 'Channel Recommendation',
        businessImpact: `Increased brand awareness and lead generation`,
        expectedGain: '50-100 qualified leads per month',
        difficulty: 'Medium',
        priority: 'High',
        estimatedTimeline: '2-4 weeks',
        owner: 'Growth Team'
      });
      
      growthActionPlan.day30.push({
        title: `Capitalize on ${topOpportunity}`,
        problem: 'Leverage identified market opportunity for growth',
        evidence: `Market discovery identified: ${topOpportunity}`,
        researchSource: 'Market Discovery',
        businessImpact: 'Accelerated market penetration',
        expectedGain: '20-30% increase in market share',
        difficulty: 'High',
        priority: 'High',
        estimatedTimeline: '2-4 weeks',
        owner: 'Strategy Team'
      });
    }

    if (growthActionPlan.day60.length === 0) {
      const topGap = normalizedResults.competitor?.marketGaps?.[0]?.value || 'market gaps';
      growthActionPlan.day60.push({
        title: `Address ${topGap} in ${industry}`,
        problem: 'Fill identified market gaps to gain competitive advantage',
        evidence: `Competitor analysis found ${normalizedResults.competitor?.marketGaps?.length || 0} market gaps`,
        researchSource: 'Competitor Analysis',
        businessImpact: 'Differentiated market position',
        expectedGain: '15-25% competitive advantage',
        difficulty: 'High',
        priority: 'Medium',
        estimatedTimeline: '1-2 months',
        owner: 'Product Team'
      });
      
      growthActionPlan.day60.push({
        title: `Expand ${primaryChannel} reach based on initial performance`,
        problem: 'Scale successful channel strategies',
        evidence: `Initial ${primaryChannel} campaign performance data`,
        researchSource: 'Campaign Generator',
        businessImpact: 'Scaled lead generation',
        expectedGain: '2-3x increase in qualified leads',
        difficulty: 'Medium',
        priority: 'Medium',
        estimatedTimeline: '1-2 months',
        owner: 'Growth Team'
      });
    }

    console.log('[Growth Save] executiveStory exists', !!growthExecutiveStory);
    console.log('[Growth Save] actionPlan keys', Object.keys(growthActionPlan || {}));

    // Save to database using validated chat.id
    console.log('💾 [Growth Workspace] Saving results to database...');
    
    await prisma.productIntelligence.upsert({
      where: { chatId: validChatId },
      create: {
        chatId: validChatId,
        userId,
        productAnalysis: normalizedResults.product,
        marketDiscovery: normalizedResults.market,
        audienceIntelligence: normalizedResults.audience,
        status: 'completed',
        inputJson: input
      },
      update: {
        productAnalysis: normalizedResults.product,
        marketDiscovery: normalizedResults.market,
        audienceIntelligence: normalizedResults.audience,
        status: 'completed',
        inputJson: input,
        updatedAt: new Date()
      }
    });

    await prisma.competitorIntelligence.upsert({
      where: { chatId: validChatId },
      create: {
        chatId: validChatId,
        userId,
        competitorAnalysis: normalizedResults.competitor,
        intentPrediction: normalizedResults.intent,
        positioningEngine: normalizedResults.positioning,
        status: 'completed',
        inputJson: input
      },
      update: {
        competitorAnalysis: normalizedResults.competitor,
        intentPrediction: normalizedResults.intent,
        positioningEngine: normalizedResults.positioning,
        status: 'completed',
        inputJson: input,
        updatedAt: new Date()
      }
    });

    // Store growth summary inside campaignGenerator metadata
    const campaignGeneratorWithMetadata = {
      ...normalizedResults.campaign,
      growthSummary,
      executiveStory: growthExecutiveStory,
      actionPlan: growthActionPlan,
      metadata: {
        growthSummary,
        executiveStory: growthExecutiveStory,
        actionPlan: growthActionPlan,
        generatedAt: new Date().toISOString()
      }
    };

    await prisma.campaignIntelligence.upsert({
      where: { chatId: validChatId },
      create: {
        chatId: validChatId,
        userId,
        campaignGenerator: campaignGeneratorWithMetadata,
        channelRecommendation: normalizedResults.channel,
        executiveStory: growthExecutiveStory,
        actionPlan: growthActionPlan,
        status: 'completed',
        inputJson: input
      },
      update: {
        campaignGenerator: campaignGeneratorWithMetadata,
        channelRecommendation: normalizedResults.channel,
        executiveStory: growthExecutiveStory,
        actionPlan: growthActionPlan,
        status: 'completed',
        inputJson: input,
        updatedAt: new Date()
      }
    });

    console.log('💾 [Growth Workspace] Results saved to database');
    console.log(`✅ [Growth Workspace] hasActionPlan: ${!!normalizedResults.campaign.actionPlan}`);

    // Add message to chat
    await prisma.message.create({
      data: {
        chatId: validChatId,
        role: 'assistant',
        content: `Full growth analysis completed for ${input.productName}. Growth Score: ${overallGrowthScore}/100`,
        analysisData: { summary: { overallGrowthScore, stepsCompleted: 8 } }
      }
    });

    return {
      success: true,
      chatId: validChatId, // Return the actual chat ID
      results: normalizedResults,
      steps,
      overallStatus,
      warnings,
      summary: {
        overallGrowthScore,
        growthPotential: Math.min(100, Math.round((normalizedResults.market?.demandScore || 70 + overallGrowthScore) / 2)),
        marketReadiness: Math.min(100, Math.round((normalizedResults.market?.demandScore || 70) * 0.95)),
        competitiveStrength: Math.min(100, Math.round(65 + (normalizedResults.competitor?.differentiationOpportunities?.length || 2) * 5)),
        customerDemand: normalizedResults.market?.demandScore || 70,
        brandPosition: Math.min(100, Math.round(overallGrowthScore * 0.9)),
        bestChannel: normalizedResults.channel.primaryChannel || normalizedResults.channel.recommendedChannels?.[0]?.channel || normalizedResults.channel.recommendedChannels?.[0]?.name || 'LinkedIn',
        topOpportunity: normalizedResults.market.growthOpportunities?.[0] || 'Market expansion',
        topRisk: normalizedResults.market.marketRisks?.[0] || 'Competition',
        nextAction: normalizedResults.campaign.nextActions?.[0] || normalizedResults.campaign.campaignIdeas?.[0] || 'Launch campaign',
        completedSteps: steps.filter(s => s.status === 'completed').length,
        progress: Math.round((steps.filter(s => s.status === 'completed').length / steps.length) * 100)
      }
    };

  } catch (error) {
    console.error('❌ [Growth Workspace] Error:', error);
    
    // Mark failed step
    const failedStepIndex = steps.findIndex(s => s.status === 'running');
    if (failedStepIndex !== -1) {
      steps[failedStepIndex].status = 'failed';
    }

    return {
      success: false,
      error: error.message,
      results: normalizeGrowthResults(results, input),
      steps,
      overallStatus: 'failed'
    };
  }
}

// ============================================
// MODULE SERVICES
// ============================================

async function runProductAnalysis(input, websiteData) {
  // Build context from scraped website if available
  let websiteContext = '';
  if (websiteData) {
    websiteContext = `\n\nScraped Website Data:
Title: ${websiteData.metadata?.title || 'N/A'}
Description: ${websiteData.metadata?.description || 'N/A'}
Content Summary: ${websiteData.text?.substring(0, 1500) || 'N/A'}
AI Extracted Data: ${websiteData.extract ? JSON.stringify(websiteData.extract) : 'N/A'}
Key Features Found: ${websiteData.content?.headings?.slice(0, 5).map(h => h.text).join(', ') || 'N/A'}`;
  }

  const prompt = `Analyze this product comprehensively:

Product: ${input.productName}
Company: ${input.companyName}
Website: ${input.websiteUrl}
Description: ${input.description}
Industry: ${input.industry}${websiteContext}

Based on the above information, provide a detailed product analysis. Use the actual website content to extract REAL features, benefits, and USPs.

Provide a JSON response with:
{
  "usp": "Actual Unique Selling Proposition",
  "summary": "comprehensive 2-3 sentence summary based on real website content",
  "keyFeatures": [{"value": "Feature 1", "confidence": 90, "impact": "High"}],
  "coreBenefits": [{"value": "Benefit 1", "confidence": 90, "impact": "High"}],
  "painPointsSolved": [{"value": "Pain Point", "confidence": 90, "impact": "High"}],
  "targetUsers": [{"value": "User Segment", "confidence": 90, "impact": "High"}],
  "differentiators": [{"value": "Differentiator", "confidence": 85, "impact": "Medium"}],
  "jobsToBeDone": [{"value": "Actual JTBD", "confidence": 90, "impact": "High"}],
  "confidenceScore": 85
}

CRITICAL INSTRUCTION: Extract REAL information from the website content. NEVER use generic placeholders. Analyze the actual product, its features, target audience, and competitive positioning based on the website data provided. Return only valid JSON.`;

  const fallbackData = generateProductFallback(input, websiteData);
  const aiResult = await callBestAI(prompt, 1200, 'Product Analysis', fallbackData);
  
  return {
    ...aiResult,
    provider: aiResult.provider || 'fallback',
    confidenceScore: aiResult.confidenceScore || (websiteData ? 85 : 70)
  };
}

async function runMarketDiscovery(input, productData) {
  const prompt = `Analyze the market for this product:

Product: ${input.productName}
Industry: ${input.industry}
Target Country: ${input.targetCountry}
Business Stage: ${input.businessStage}

Context: ${productData.productSummary}

Provide JSON response:
{
  "demandScore": 75,
  "confidence": 80,
  "tam": {"value": "$X Billion", "source": "API/Industry Report", "confidence": 60, "method": "Top-down market sizing"},
  "sam": {"value": "$Y Billion", "source": "API/Industry Report", "confidence": 55, "method": "Serviceable market subset"},
  "som": {"value": "$Z Million", "source": "API/Industry Report", "confidence": 45, "method": "Achievable market estimation"},
  "cagr": "XX%",
  "marketTrends": [{"value": "Trend description", "confidence": 80, "impact": "High"}],
  "opportunities": [{"value": "Opportunity description", "confidence": 75, "impact": "High"}],
  "risks": [{"value": "Risk description", "confidence": 85, "impact": "High"}],
  "entryStrategy": "Detailed description of entry strategy"
}

CRITICAL INSTRUCTION: NEVER use generic placeholders like "$X Billion". Use realistic market size estimates for the ${input.industry || 'this'} industry. TAM/SAM/SOM must include value, source, confidence, and method fields. Return only valid JSON.`;

  const fallbackData = generateMarketFallback(input, productData);
  const aiResult = await callBestAI(prompt, 1200, 'Market Discovery', fallbackData);
  
  return {
    ...aiResult,
    provider: aiResult.provider || 'fallback',
    confidenceScore: aiResult.confidenceScore || 75
  };
}

async function runAudienceIntelligence(input, productData) {
  const prompt = `Analyze the target audience for this product:

Product: ${input.productName}
Target Audience: ${input.targetAudience}
Industry: ${input.industry}
USP: ${normalizeTextList(productData.usp)}

Provide JSON response:
{
  "buyerPersonas": [
    {
      "name": "Persona Name",
      "demographics": "Detailed description",
      "intentScore": 85,
      "goals": ["Goal 1"],
      "painPoints": ["Pain 1"]
    }
  ],
  "buyingTriggers": [{"value": "Trigger", "confidence": 85, "impact": "High"}],
  "commonObjections": [{"value": "Objection", "confidence": 85, "impact": "High"}],
  "bestChannels": [{"value": "Channel", "confidence": 85, "impact": "High"}],
  "decisionMakers": [{"value": "Title", "confidence": 85, "impact": "High"}],
  "confidenceScore": 75
}

CRITICAL INSTRUCTION: NEVER use generic text. Personas must deeply reflect the real problems ${input.productName} solves. Return only valid JSON.`;

  const fallbackData = generateAudienceFallback(input, productData);
  const aiResult = await callBestAI(prompt, 1200, 'Audience Intelligence', fallbackData);
  
  return {
    ...aiResult,
    provider: aiResult.provider || 'fallback',
    confidenceScore: aiResult.confidenceScore || 75
  };
}

async function runCompetitorAnalysis(input, productData, orchestratorCompetitors = []) {
  const competitors = input.competitors || '';
  
  // If orchestrator provided verified competitors, use them
  const verifiedCompetitors = orchestratorCompetitors.length > 0 
    ? orchestratorCompetitors.map(c => `${c.name} (${c.domain})`).join(', ')
    : competitors;

  const prompt = `Analyze competitors for this product:

Product: ${input.productName}
Known Competitors: ${verifiedCompetitors}
Industry: ${input.industry}

Provide JSON response:
{
  "directCompetitors": [
    {
      "name": "Competitor 1",
      "domain": "competitor1.com",
      "opportunityScore": 75,
      "strengths": ["s1"],
      "weaknesses": ["w1"]
    }
  ],
  "competitorMatrix": "Matrix description",
  "differentiationOpportunities": [{"value": "Opp", "confidence": 85, "impact": "High"}],
  "marketGaps": [{"value": "Gap", "confidence": 80, "impact": "High"}],
  "competitorWeaknesses": [{"value": "Weakness", "confidence": 80, "impact": "High"}],
  "confidenceScore": 70
}

CRITICAL INSTRUCTION: NEVER use generic placeholders like "Competitor 1". Use real competitor names if known, or infer real players in the ${input.industry} space. Return only valid JSON.`;

  const fallbackData = generateCompetitorFallback(input, productData, orchestratorCompetitors);
  const aiResult = await callBestAI(prompt, 1200, 'Competitor Analysis', fallbackData);
  
  return {
    ...aiResult,
    provider: aiResult.provider || 'fallback',
    confidenceScore: aiResult.confidenceScore || 68,
    orchestratorCompetitorsUsed: orchestratorCompetitors.length
  };
}

async function runIntentPrediction(input, audienceData) {
  const prompt = `Predict buyer intent and readiness for this product:

Product: ${input.productName}
Target Audience: ${input.targetAudience}
Campaign Goal: ${input.campaignGoal}

Audience Insights: ${JSON.stringify(audienceData.buyingTriggers)}

Provide JSON response:
{
  "hotSegments": [{"value": "Segment", "confidence": 90, "impact": "High"}],
  "warmSegments": [{"value": "Segment", "confidence": 75, "impact": "Medium"}],
  "coldSegments": [{"value": "Segment", "confidence": 50, "impact": "Low"}],
  "buyingSignals": [{"value": "Signal", "confidence": 90, "impact": "High"}],
  "triggerEvents": [{"value": "Event", "confidence": 90, "impact": "High"}],
  "leadScoringRules": [{"value": "Rule", "confidence": 90, "impact": "High"}],
  "confidenceScore": 75
}

CRITICAL INSTRUCTION: Return ONLY valid JSON in the exact schema specified. Use the value/confidence/impact schema.`;

  const fallbackData = generateIntentFallback(input, audienceData);
  const aiResult = await callBestAI(prompt, 1000, 'Intent Prediction', fallbackData);
  
  return {
    ...aiResult,
    provider: aiResult.provider || 'fallback',
    confidenceScore: aiResult.confidenceScore || 68
  };
}

async function runPositioningEngine(input, productData, competitorData) {
  const prompt = `Create positioning strategy for this product:

Product: ${input.productName}
USP: ${normalizeTextList(productData.usp)}
Market Gaps: ${normalizeTextList(competitorData.marketGaps)}

Provide JSON response:
{
  "positioningStatement": "A single powerful positioning statement",
  "valueProposition": "Core value proposition",
  "brandPromise": "Brand promise statement",
  "messagingPillars": [{"value": "Pillar description", "confidence": 85, "impact": "High"}],
  "competitorWeaknessesToAttack": [{"value": "Weakness", "confidence": 85, "impact": "High"}],
  "confidenceScore": 80
}

CRITICAL INSTRUCTION: Return ONLY valid JSON using the exact schema above.`;

  const fallbackData = generatePositioningFallback(input, productData, competitorData);
  const aiResult = await callBestAI(prompt, 1000, 'Positioning Engine', fallbackData);
  
  return {
    ...aiResult,
    provider: aiResult.provider || 'fallback',
    confidenceScore: aiResult.confidenceScore || 75
  };
}

async function runCampaignGenerator(input, allResults) {
  const duration = input.duration || '7 days';
  
  const prompt = `Generate a ${duration} marketing campaign:

Product: ${input.productName}
Campaign Goal: ${input.campaignGoal}
Target: ${input.targetAudience}
Preferred Channel: ${input.preferredChannels}
Tone: ${input.tone}
Budget: ${input.budgetRange}

  Positioning: ${allResults.positioning?.valueProposition || allResults.positioning?.valueProposition || ''}

Provide JSON response:
{
  "creativeAngles": [{"value": "Angle", "confidence": 85, "impact": "High"}],
  "copyHooks": [{"value": "Hook", "confidence": 85, "impact": "High"}],
  "ctaSuggestions": [{"value": "CTA", "confidence": 85, "impact": "High"}],
  "emailSequence": [{"value": "Email Idea", "confidence": 85, "impact": "High"}],
  "socialPostIdeas": [{"value": "Post Idea", "confidence": 85, "impact": "High"}],
  "videoIdeas": [{"value": "Video Idea", "confidence": 85, "impact": "High"}],
  "actionPlan": {
    "sevenDay": [{"title": "Task", "problem": "What problem this solves", "evidence": "Data evidence", "researchSource": "Source module", "businessImpact": "Business impact", "expectedGain": "Expected gain", "difficulty": "Low/Medium/High", "priority": "High", "estimatedTimeline": "1 week", "owner": "Role"}],
    "thirtyDay": [{"title": "Task", "problem": "What problem this solves", "evidence": "Data evidence", "researchSource": "Source module", "businessImpact": "Business impact", "expectedGain": "Expected gain", "difficulty": "Low/Medium/High", "priority": "High", "estimatedTimeline": "2-4 weeks", "owner": "Role"}],
    "sixtyDay": [{"title": "Task", "problem": "What problem this solves", "evidence": "Data evidence", "researchSource": "Source module", "businessImpact": "Business impact", "expectedGain": "Expected gain", "difficulty": "Low/Medium/High", "priority": "High", "estimatedTimeline": "1-2 months", "owner": "Role"}],
    "ninetyDay": [{"title": "Task", "problem": "What problem this solves", "evidence": "Data evidence", "researchSource": "Source module", "businessImpact": "Business impact", "expectedGain": "Expected gain", "difficulty": "Low/Medium/High", "priority": "High", "estimatedTimeline": "3 months", "owner": "Role"}]
  },
  "confidenceScore": 75
}

CRITICAL INSTRUCTION: Return ONLY valid JSON. Provide realistic CTR and CPA. Action plan MUST use 'sevenDay', 'thirtyDay', 'sixtyDay', 'ninetyDay' timelines. Every task MUST explain WHY it exists using the problem, evidence, and researchSource fields. Do not use generic placeholders.`;

  const fallbackData = generateCampaignFallback(input, allResults.product, allResults);
  const aiResult = await callBestAI(prompt, 1200, 'Campaign Generator', fallbackData);
  
  return {
    ...aiResult,
    provider: aiResult.provider || 'fallback',
    confidenceScore: aiResult.confidenceScore || 75
  };
}

async function runChannelRecommendation(input, audienceData, campaignData) {
  const prompt = `Recommend marketing channels:

Product: ${input.productName}
Target Audience: ${input.targetAudience}
  Preferred: ${input.preferredChannel}
Budget: ${input.budgetRange}
Campaign Goal: ${input.campaignGoal}

Best Channels from Audience Analysis: ${audienceData.bestChannels?.join(', ')}

Provide JSON response:
{
  "recommendedChannels": [
    {"channel": "Channel Name (replace with actual channel)", "budgetAllocation": 0, "expectedRoi": 0}
  ],
  "budgetSplit": [{"value": "Split Details", "confidence": 85, "impact": "High"}],
  "channelFitScores": [{"value": "Score Details", "confidence": 85, "impact": "High"}],
  "postingFrequency": [{"value": "Frequency Details", "confidence": 85, "impact": "High"}],
  "contentTypes": [{"value": "Content Type", "confidence": 85, "impact": "High"}],
  "confidenceScore": 75
}

CRITICAL INSTRUCTION: Return ONLY valid JSON. Budget allocations must sum to 100.`;

  const fallbackData = generateChannelFallback(input, audienceData, campaignData);
  const aiResult = await callBestAI(prompt, 1000, 'Channel Recommendation', fallbackData);
  
  return {
    ...aiResult,
    provider: aiResult.provider || 'fallback',
    confidenceScore: aiResult.confidenceScore || 73
  };
}

async function callGeminiAI(prompt, maxTokens = 2000, moduleName = 'unknown') {
  if (!GEMINI_API_KEY) {
    console.log(`⚠️ [AI][${moduleName}] No Gemini API key`);
    return null;
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.4
        }
      })
    });

    if (!response.ok) {
      console.log(`⚠️ [AI][${moduleName}] Gemini API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) return null;
    
    const parsed = safeParseAIJson(content);
    if (!parsed) return null;
    
    return {
      ...parsed,
      provider: 'gemini'
    };
  } catch (error) {
    console.log(`⚠️ [AI][${moduleName}] Gemini fallback failed:`, error.message);
    return null;
  }
}

async function callCerebrasAI(prompt) {
  if (!CEREBRAS_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(CEREBRAS_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CEREBRAS_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: CEREBRAS_MODEL,
        prompt,
        max_tokens: 2000,
        temperature: 0.3
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('⚠️ [AI] Cerebras API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const content = data?.output || data?.text || data?.result;
    const parsed = safeParseAIJson(typeof content === 'string' ? content : JSON.stringify(content));
    if (!parsed) return null;
    return {
      ...parsed,
      provider: 'cerebras'
    };
  } catch (error) {
    console.log('⚠️ [AI] Cerebras fallback failed:', error.message);
    return null;
  }
}

async function callDeepSeekAI(prompt) {
  if (!DEEPSEEK_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        prompt,
        max_tokens: 2000,
        temperature: 0.3
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('⚠️ [AI] DeepSeek API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const content = data?.output || data?.text || data?.result;
    const parsed = safeParseAIJson(typeof content === 'string' ? content : JSON.stringify(content));
    if (!parsed) return null;
    return {
      ...parsed,
      provider: 'deepseek'
    };
  } catch (error) {
    console.log('⚠️ [AI] DeepSeek fallback failed:', error.message);
    return null;
  }
}

async function callBestAI(prompt, maxTokens = 2000, moduleName = 'unknown', fallbackData = null) {
  try {
    return await callGroqAI(prompt, maxTokens, moduleName);
  } catch (error) {
    console.log(`⚠️ [AI][${moduleName}] Groq failed, falling back to Gemini...`, error.message);
    try {
      const geminiResponse = await callGeminiAI(prompt, maxTokens, moduleName);
      if (geminiResponse) {
        console.log(`✅ [AI][${moduleName}] Gemini succeeded as fallback`);
        return geminiResponse;
      }
    } catch (geminiError) {
      console.log(`⚠️ [AI][${moduleName}] Gemini fallback failed:`, geminiError.message);
    }
    
    // Try OpenAI if configured
    if (OPENAI_API_KEY) {
      try {
        console.log(`🤖 [AI][${moduleName}] Gemini failed, falling back to OpenAI...`);
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.5,
            response_format: { type: "json_object" }
          }),
          signal: AbortSignal.timeout(45000)
        });
        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            console.log(`✅ [AI][${moduleName}] OpenAI succeeded as fallback`);
            const parsed = JSON.parse(content);
            parsed.provider = 'openai';
            return parsed;
          }
        }
      } catch (openAiError) {
        console.log(`⚠️ [AI][${moduleName}] OpenAI fallback failed:`, openAiError.message);
      }
    }
    
    // If all fail or return null, use rule-based fallback
    console.log(`🛡️ [AI][${moduleName}] All AI providers failed, using rule-based fallback.`);
    if (fallbackData) {
       return { ...fallbackData, provider: 'fallback' };
    }
    return { provider: 'fallback' };
  }
}

// ============================================
// AI HELPER
// ============================================

async function callGroqAI(prompt, maxTokens = 2000, moduleName = 'unknown') {
  if (!GROQ_API_KEY) {
    console.log(`⚠️ [AI][${moduleName}] No Groq API key, using fallback`);
    throw new Error('Groq API key is not configured.');
  }

  const estimateTokens = Math.ceil(prompt.length / 4);
  console.log(`🚀 [AI][${moduleName}] Calling Groq... (Prompt: ~${estimateTokens} tokens, MaxOut: ${maxTokens})`);

  let retries = 1;
  while (retries >= 0) {
    try {
      let response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.7,
          max_tokens: maxTokens
        })
      });

      if (!response.ok && response.status === 400) {
        console.log(`⚠️ [AI][${moduleName}] Groq JSON mode failed, retrying without JSON mode...`);
        response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: maxTokens
          })
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle 429 Rate Limit
        if (response.status === 429 && retries > 0) {
          const retryMsg = errorData.error?.message || '';
          let waitTime = 5000; // default 5s
          // Extract time from message like "Please try again in 3.42s"
          const match = retryMsg.match(/try again in ([\d.]+)s/i);
          if (match && match[1]) {
            waitTime = Math.ceil(parseFloat(match[1]) * 1000);
          }
          const totalWait = waitTime + 2000;
          console.log(`⏳ [AI][${moduleName}] Groq Rate Limit (429). Waiting ${totalWait}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, totalWait));
          retries--;
          continue;
        }

        throw new Error(`Groq API error ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) throw new Error('No content in response');

      // Parse JSON
      try {
        const parsed = safeParseAIJson(content);
        if (parsed) {
          console.log(`✅ [AI][${moduleName}] Groq success!`);
          return { ...parsed, provider: 'groq' };
        }
        throw new Error('Unable to parse AI response JSON');
      } catch (parseError) {
        throw new Error('AI response could not be parsed as JSON.');
      }

    } catch (error) {
      if (retries > 0) {
        retries--;
        continue;
      }
      console.log(`❌ [AI][${moduleName}] Groq failed completely:`, error.message);
      throw error;
    }
  }
}

// ============================================
// GET SAVED RESULTS
// ============================================

export async function getGrowthWorkspaceResults({ chatId, userId }) {
  try {
    const [productIntel, competitorIntel, campaignIntel] = await Promise.all([
      prisma.productIntelligence.findUnique({ where: { chatId } }),
      prisma.competitorIntelligence.findUnique({ where: { chatId } }),
      prisma.campaignIntelligence.findUnique({ where: { chatId } })
    ]);

    if (!productIntel || productIntel.userId !== userId) {
      return { success: false, exists: false };
    }

    // Reconstruct results object
    const rawResults = {
      product: productIntel.productAnalysis,
      market: productIntel.marketDiscovery,
      audience: productIntel.audienceIntelligence,
      competitor: competitorIntel?.competitorAnalysis,
      intent: competitorIntel?.intentPrediction,
      positioning: competitorIntel?.positioningEngine,
      campaign: campaignIntel?.campaignGenerator,
      channel: campaignIntel?.channelRecommendation
    };

    // Normalize results to ensure consistent format
    const results = normalizeGrowthResults(rawResults, productIntel.inputJson || {});
    console.log('🔄 [Growth Workspace] Loaded results normalized');

    const steps = [
      { key: 'product', label: 'Product Analysis', status: results.product ? 'completed' : 'pending', provider: results.product?.provider, confidenceScore: results.product?.confidenceScore },
      { key: 'market', label: 'Market Discovery', status: results.market ? 'completed' : 'pending', provider: results.market?.provider, confidenceScore: results.market?.confidenceScore },
      { key: 'audience', label: 'Audience Intelligence', status: results.audience ? 'completed' : 'pending', provider: results.audience?.provider, confidenceScore: results.audience?.confidenceScore },
      { key: 'competitor', label: 'Competitor Analysis', status: results.competitor ? 'completed' : 'pending', provider: results.competitor?.provider, confidenceScore: results.competitor?.confidenceScore },
      { key: 'intent', label: 'Intent Prediction', status: results.intent ? 'completed' : 'pending', provider: results.intent?.provider, confidenceScore: results.intent?.confidenceScore },
      { key: 'positioning', label: 'Positioning Engine', status: results.positioning ? 'completed' : 'pending', provider: results.positioning?.provider, confidenceScore: results.positioning?.confidenceScore },
      { key: 'campaign', label: 'Campaign Generator', status: results.campaign ? 'completed' : 'pending', provider: results.campaign?.provider, confidenceScore: results.campaign?.confidenceScore },
      { key: 'channel', label: 'Channel Recommendation', status: results.channel ? 'completed' : 'pending', provider: results.channel?.provider, confidenceScore: results.channel?.confidenceScore }
    ];

    // Calculate summary
    const completedSteps = steps.filter(s => s.status === 'completed').length;
    const avgConfidence = completedSteps > 0 ? 
      Math.round(Object.values(results).reduce((sum, r) => sum + (r?.confidenceScore || 0), 0) / completedSteps) : 0;

    return {
      success: true,
      exists: true,
      results,
      steps,
      input: productIntel.inputJson,
      summary: {
        overallGrowthScore: avgConfidence,
        growthPotential: Math.min(100, Math.round((results.market?.demandScore || 70 + avgConfidence) / 2)),
        marketReadiness: Math.min(100, Math.round((results.market?.demandScore || 70) * 0.95)),
        competitiveStrength: Math.min(100, Math.round(65 + (results.competitor?.differentiationOpportunities?.length || 2) * 5)),
        customerDemand: results.market?.demandScore || 70,
        brandPosition: Math.min(100, Math.round(avgConfidence * 0.9)),
        bestChannel: results.channel?.primaryChannel || results.channel?.recommendedChannels?.[0]?.channel || results.channel?.recommendedChannels?.[0]?.name || 'LinkedIn',
        topOpportunity: results.market?.growthOpportunities?.[0] || 'Market expansion',
        topRisk: results.market?.marketRisks?.[0] || 'Competition',
        nextAction: results.campaign?.nextActions?.[0] || results.campaign?.campaignIdeas?.[0] || 'Run full analysis',
        completedSteps,
        progress: Math.round((completedSteps / 8) * 100)
      }
    };

  } catch (error) {
    console.error('❌ [Growth Workspace] Error fetching results:', error);
    return { success: false, error: error.message };
  }
}


// ============================================
// SAFE JSON PARSING
// ============================================

function safeParseAIJson(text) {
  if (!text) return null;
  
  try {
    // Remove markdown code fences
    let cleanText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Extract first JSON object
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Try direct parse
    return JSON.parse(cleanText);
  } catch (error) {
    console.log('⚠️ [Parse] JSON parsing failed:', error.message);
    return null;
  }
}

// ============================================
// RESULT NORMALIZATION
// ============================================

function normalizeGrowthResults(results, input) {
  console.log('🔄 [Normalize] Normalizing growth results');
  
  const normalized = {};
  
  // Normalize Product Analysis
  if (results.product || results.productAnalysis) {
    const data = results.product || results.productAnalysis;
    normalized.product = {
      productSummary: ensureString(data.summary || data.productSummary, ''),
      usp: ensureString(data.usp || data.valuePropositions?.[0]?.value, ''),
      features: ensureArray(data.keyFeatures || data.features),
      benefits: ensureArray(data.coreBenefits || data.benefits),
      painPoints: ensureArray(data.painPointsSolved || data.painPoints),
      targetUsers: ensureArray(data.targetUsers || data.buyerPersonas),
      differentiators: ensureArray(data.differentiators || data.keyDifferentiators),
      jobsToBeDone: ensureArray(data.jobsToBeDone),
      confidenceScore: ensureNumber(data.confidenceScore, 0),
      provider: ensureString(data.provider, 'groq')
    };
  }
  
  // Normalize Market Discovery
  if (results.market || results.marketDiscovery) {
    const data = results.market || results.marketDiscovery;
    normalized.market = {
      tam: ensureString(data.tam, ''),
      sam: ensureString(data.sam, ''),
      som: ensureString(data.som, ''),
      cagr: ensureString(data.cagr, ''),
      marketTrends: ensureArray(data.marketTrends),
      opportunities: ensureArray(data.opportunities || data.growthOpportunities),
      risks: ensureArray(data.risks || data.marketRisks),
      entryStrategy: ensureString(data.entryStrategy, ''),
      demandScore: ensureNumber(data.demandScore, 0),
      confidenceScore: ensureNumber(data.confidenceScore, 0),
      provider: ensureString(data.provider, 'groq')
    };
  }
  
  // Normalize Audience Intelligence
  if (results.audience || results.audienceIntelligence) {
    const data = results.audience || results.audienceIntelligence;
    normalized.audience = {
      buyerPersonas: ensureArray(data.buyerPersonas || data.personas),
      buyingTriggers: ensureArray(data.buyingTriggers),
      commonObjections: ensureArray(data.commonObjections || data.objections),
      bestChannels: ensureArray(data.bestChannels),
      decisionMakers: ensureArray(data.decisionMakers),
      confidenceScore: ensureNumber(data.confidenceScore, 0),
      provider: ensureString(data.provider, 'groq')
    };
  }
  
  // Normalize Competitor Analysis
  if (results.competitor || results.competitorAnalysis) {
    const data = results.competitor || results.competitorAnalysis;
    normalized.competitor = {
      directCompetitors: ensureArray(data.directCompetitors || data.competitors),
      competitorMatrix: ensureString(data.competitorMatrix, ''),
      differentiationOpportunities: ensureArray(data.differentiationOpportunities),
      marketGaps: ensureArray(data.marketGaps),
      competitorWeaknesses: ensureArray(data.competitorWeaknesses || data.weaknesses),
      confidenceScore: ensureNumber(data.confidenceScore, 0),
      provider: ensureString(data.provider, 'groq')
    };
  }
  
  // Normalize Intent Prediction
  if (results.intent || results.intentPrediction) {
    const data = results.intent || results.intentPrediction;
    normalized.intent = {
      hotSegments: ensureArray(data.hotSegments || data.highIntentSegments),
      warmSegments: ensureArray(data.warmSegments || data.mediumIntentSegments),
      coldSegments: ensureArray(data.coldSegments || data.lowIntentSegments),
      buyingSignals: ensureArray(data.buyingSignals),
      triggerEvents: ensureArray(data.triggerEvents),
      leadScoringRules: ensureArray(data.leadScoringRules),
      confidenceScore: ensureNumber(data.confidenceScore, 0),
      provider: ensureString(data.provider, 'groq')
    };
  }
  
  // Normalize Positioning Engine
  if (results.positioning || results.positioningEngine) {
    const data = results.positioning || results.positioningEngine;
    normalized.positioning = {
      positioningStatement: ensureString(data.positioningStatement, ''),
      valueProposition: ensureString(data.valueProposition, ''),
      brandPromise: ensureString(data.brandPromise, ''),
      messagingPillars: ensureArray(data.messagingPillars),
      competitorWeaknessesToAttack: ensureArray(data.competitorWeaknessesToAttack),
      confidenceScore: ensureNumber(data.confidenceScore, 0),
      provider: ensureString(data.provider, 'groq')
    };
  }
  
  // Normalize Campaign Generator
  if (results.campaign || results.campaignGenerator) {
    const data = results.campaign || results.campaignGenerator;
    normalized.campaign = {
      creativeAngles: ensureArray(data.creativeAngles),
      copyHooks: ensureArray(data.copyHooks || data.adHooks),
      ctaSuggestions: ensureArray(data.ctaSuggestions),
      emailSequence: ensureArray(data.emailSequence),
      socialPostIdeas: ensureArray(data.socialPostIdeas),
      videoIdeas: ensureArray(data.videoIdeas || data.videoAdScriptIdeas),
      actionPlan: data.actionPlan || null,
      confidenceScore: ensureNumber(data.confidenceScore, 0),
      provider: ensureString(data.provider, 'groq')
    };
  }
  
  // Normalize Channel Recommendation
  if (results.channel || results.channelRecommendation) {
    const data = results.channel || results.channelRecommendation;
    
    // Normalize recommendedChannels array - map both 'channel' and 'name' fields
    let normalizedChannels = ensureArray(data.recommendedChannels);
    normalizedChannels = normalizedChannels.map(ch => {
      if (typeof ch === 'string') return ch;
      if (typeof ch === 'object') {
        return {
          name: ch.name || ch.channel || 'Unknown Channel',
          channel: ch.channel || ch.name || 'Unknown Channel',
          fit: ch.fit || ch.reason || '',
          reason: ch.reason || ch.fit || '',
          budgetAllocation: ch.budgetAllocation || ch.budgetSplit || 'N/A',
          budgetSplit: ch.budgetSplit || ch.budgetAllocation || 'N/A',
          postingFrequency: ch.postingFrequency || 'N/A',
          bestPostingTime: ch.bestPostingTime || 'N/A',
          contentTypes: ensureArray(ch.contentTypes),
          expectedReach: ch.expectedReach || 'N/A',
          difficultyScore: ch.difficultyScore || ch.difficulty || 3
        };
      }
      return ch;
    });
    
    normalized.channel = {
      recommendedChannels: normalizedChannels,
      primaryChannel: ensureString(data.primaryChannel || normalizedChannels[0]?.name || normalizedChannels[0]?.channel, ''),
      channelStrategy: ensureString(data.channelStrategy, ''),
      budgetRecommendation: ensureString(data.budgetRecommendation, ''),
      confidenceScore: ensureNumber(data.confidenceScore, 0),
      provider: ensureString(data.provider, 'groq')
    };
  }
  
  return normalized;
}

// Helper functions for normalization
function ensureString(value, fallback = '') {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value) && value.length > 0) return value[0];
  return fallback;
}

function ensureArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value.includes(',')) {
    return value.split(',').map(v => v.trim()).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function ensureNumber(value, fallback = 60) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : fallback;
}
