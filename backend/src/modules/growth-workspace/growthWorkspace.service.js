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
import { callAI } from '../../ai/services/aiRouter.service.js';
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
import { collectBusinessIntelligence, synthesizeWithAI } from '../../services/intelligence/business-intelligence.service.js';
import { generateExecutiveStory } from '../../services/intelligence/executive-story.service.js';
import { generateActionPlan } from '../../services/intelligence/action-plan.service.js';
import {
  logCompanyCollected, logTechnologyCollected, logPricingCollected,
  logCompetitorsCollected, logMarketCollected, logAudienceCollected,
  logStrategyGenerated, logReportGenerated
} from '../../services/intelligence/business-intelligence-logger.js';



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

  // STEP 1: Validate or create chat if needed
  let chat = null;
  
  // Check if chatId is provided and exists
  if (chatId && chatId !== 'temp-' && !chatId.startsWith('temp-')) {
    chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        userId: userId
      }
    });
  }

  // If chat doesn't exist or invalid chatId, create a new one
  if (!chat) {
    console.log('📝 [Growth Workspace] No valid chat found, creating new chat automatically...');
    
    const title = input.productName || input.companyName || 'New Project';
    
    chat = await prisma.chat.create({
      data: {
        userId: userId,
        title: title,
        productName: input.productName || title,
      }
    });

    console.log('✅ [Growth Workspace] New chat created automatically:', { 
      chatId: chat.id, 
      title: chat.title 
    });
  } else {
    console.log('✅ [Growth Workspace] Chat validated:', { chatId: chat.id });
  }

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

  let results = {};
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

    // [Business Intelligence] Collect enterprise-grade intelligence
    console.log('[Business Intelligence] Starting enterprise intelligence collection');
    let businessIntelligence = null;
    let synthesizedIntel = null;
    let biWarnings = [];
    try {
      businessIntelligence = await collectBusinessIntelligence({
        websiteUrl: input.websiteUrl,
        productName: input.productName || '',
        companyName: input.companyName || '',
        industry: input.industry || '',
        targetCountry: input.targetCountry || 'United States'
      });
      
      if (businessIntelligence) {
        synthesizedIntel = synthesizeWithAI(businessIntelligence);
        biWarnings = businessIntelligence.warnings || [];
        
        logCompanyCollected(synthesizedIntel.companyIntelligence);
        logTechnologyCollected(synthesizedIntel.technologyIntelligence.technologies);
        logPricingCollected(synthesizedIntel.pricingIntelligence);
        logCompetitorsCollected(synthesizedIntel.competitorIntelligence);
        logMarketCollected(synthesizedIntel.marketIntelligence);
        logAudienceCollected(synthesizedIntel.audienceIntelligence);
        
        // Inject BI data into researchData for downstream use
        if (researchData) {
          researchData.technologyStack = synthesizedIntel.technologyIntelligence.technologies || [];
          researchData.companySignals = [synthesizedIntel.companyIntelligence];
          researchData.marketSignals = researchData.marketSignals || [];
          researchData.marketSignals.push(synthesizedIntel.marketIntelligence);
        }
        
        console.log('[Business Intelligence] Collection complete:', {
          companyName: synthesizedIntel.companyIntelligence.name,
          industry: synthesizedIntel.companyIntelligence.industry,
          technologies: synthesizedIntel.technologyIntelligence.technologies.length,
          pricingTiers: synthesizedIntel.pricingIntelligence.tiers.length,
          competitors: synthesizedIntel.competitorIntelligence.direct?.length || 0,
          marketVerified: synthesizedIntel.marketIntelligence.tam !== 'Unknown',
          audiencePersonas: synthesizedIntel.audienceIntelligence.personas?.length || 0,
          sources: businessIntelligence.sources?.length || 0,
          warnings: biWarnings.length
        });
      }
    } catch (biError) {
      console.error('[Business Intelligence] Collection error:', biError.message);
      biWarnings.push(`Business Intelligence collection error: ${biError.message}`);
    }

    // Step 1: Product Analysis
    console.log('✨ [Growth Workspace] Running Product Analysis...');
    steps[0].status = 'running';
    try {
      const rawResult = await runProductAnalysis(input, websiteData);
      results.product = validateProductAnalysis(rawResult, input);
      steps[0].status = 'completed';
      steps[0].provider = results.product.provider || 'groq';
      steps[0].confidenceScore = results.product.confidenceScore ?? 75;
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
      steps[0].confidenceScore = results.product.confidenceScore ?? 55;
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
      steps[1].confidenceScore = results.market.confidenceScore ?? 70;
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
      steps[1].confidenceScore = results.market.confidenceScore ?? 55;
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
      steps[2].confidenceScore = results.audience.confidenceScore ?? 75;
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
      steps[2].confidenceScore = results.audience.confidenceScore ?? 55;
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
      steps[3].confidenceScore = results.competitor.confidenceScore ?? 70;
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
      steps[3].confidenceScore = results.competitor.confidenceScore ?? 55;
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
      steps[4].confidenceScore = results.intent.confidenceScore ?? 68;
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
      steps[4].confidenceScore = results.intent.confidenceScore ?? 55;
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
      steps[5].confidenceScore = results.positioning.confidenceScore ?? 72;
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
      steps[5].confidenceScore = results.positioning.confidenceScore ?? 55;
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
      steps[6].confidenceScore = results.campaign.confidenceScore ?? 75;
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
      steps[6].confidenceScore = results.campaign.confidenceScore ?? 55;
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
      steps[7].confidenceScore = results.channel.confidenceScore ?? 73;
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
      steps[7].confidenceScore = results.channel.confidenceScore ?? 55;
    }

    overallStatus = 'completed';

    // Apply quality filters to ensure evidence-based data
    results = enforceGrowthQualityFilters(results);

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

    // [Business Intelligence] Generate executive story (Enterprise BI 2.0)
    const companyName = input.companyName || input.productName || 'Unknown';
    const formattedCompanyName = companyName.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
    
    let growthExecutiveStory;
    if (synthesizedIntel) {
      growthExecutiveStory = generateExecutiveStory(synthesizedIntel);
      growthExecutiveStory.companyOverview.website = input.websiteUrl || '';
      growthExecutiveStory.evidenceReferences = {
        totalSources: (synthesizedIntel.evidence?.sources || []).length,
        dataQuality: synthesizedIntel.evidence?.sources?.length > 5 ? 'High - Multiple verified sources' : synthesizedIntel.evidence?.sources?.length > 0 ? 'Medium - Some verified sources' : 'Low - Limited verified sources',
        confidence: synthesizedIntel.evidence?.sources?.length > 5 ? 85 : synthesizedIntel.evidence?.sources?.length > 0 ? 65 : 40
      };
      logReportGenerated(growthExecutiveStory);
      console.log('[Business Intelligence] Enterprise BI 2.0 executive story generated with verified intelligence');
    } else {
      growthExecutiveStory = {
        executiveSummary: {
          title: `Enterprise Business Intelligence Report: ${formattedCompanyName}`,
          company: formattedCompanyName,
          industry: input.industry || 'Not specified',
          assessmentDate: new Date().toISOString().split('T')[0],
          methodology: 'Standard analysis via Growth Workspace modules',
          confidenceLevel: 'Low',
          evidenceSourcesUsed: 0,
          dataGaps: 1,
          reportType: 'Enterprise Business Intelligence 2.0',
          version: '2.0.0'
        },
        companyOverview: {
          name: formattedCompanyName,
          website: input.websiteUrl || '',
          industry: input.industry || 'Not specified',
          domain: input.websiteUrl ? extractDomainSimple(input.websiteUrl) : '',
          evidence: { source: 'User input', confidence: 50, collectedAt: new Date().toISOString() }
        },
        businessModel: { type: input.businessModel || 'Unknown', evidence: { source: 'User input', confidence: 50, collectedAt: new Date().toISOString() } },
        revenueModel: { pricingTiers: [], evidence: { source: 'Not collected', confidence: 0, collectedAt: new Date().toISOString() } },
        growthStage: { fundingStage: 'Unknown', evidence: { source: 'Not collected', confidence: 0, collectedAt: new Date().toISOString() } },
        productMaturity: { stage: 'Unknown', evidence: { source: 'Not collected', confidence: 0, collectedAt: new Date().toISOString() } },
        marketPosition: { tam: normalizedResults.market?.tam || 'Unknown', competitiveIntensity: 'Unknown', evidence: { source: 'Growth Workspace modules', confidence: 50, collectedAt: new Date().toISOString() } },
        swot: {
          strengths: [{ value: 'Insufficient evidence to determine strengths', confidence: 0, impact: 'Low' }],
          weaknesses: [{ value: 'Business intelligence layer unavailable - data may be incomplete', confidence: 100, impact: 'High' }],
          opportunities: [{ value: 'Run full analysis with website URL for complete intelligence', confidence: 90, impact: 'High' }],
          threats: [{ value: 'Insufficient evidence to determine threats', confidence: 0, impact: 'Low' }]
        },
        keyFindings: [{ finding: 'Limited data available without website scraping and intelligence collection.', confidence: 100, evidence: 'Analysis mode', impact: 'High' }],
        topPriorities: [{ priority: 1, action: 'Re-run analysis with website URL and complete product details', rationale: 'Full intelligence requires website data', roi: 'Complete enterprise intelligence', timeline: 'Immediate', owner: 'User', kpi: 'Complete intelligence report', evidence: 'Current analysis ran without business intelligence layer', confidence: 100 }],
        executiveRecommendation: {
          recommendation: `Data quality is insufficient for a definitive recommendation. Run a full analysis with website URL and complete product details to generate an enterprise-grade business intelligence report for ${formattedCompanyName}.`,
          confidenceLevel: 'Low',
          evidenceReferences: { dataQuality: 'Limited - Business intelligence layer unavailable' }
        },
        evidenceReferences: { totalSources: 0, dataQuality: 'Limited - Business intelligence layer unavailable', confidence: 0 }
      };
    }

    // [Business Intelligence] Generate action plan (Enterprise BI 2.0)
    let growthActionPlan;
    if (synthesizedIntel) {
      growthActionPlan = generateActionPlan(synthesizedIntel);
      logStrategyGenerated({ channels: [], recommendations: [], timeline: '7-365 days' });
      console.log('[Business Intelligence] Enterprise BI 2.0 action plan generated with verified intelligence');
    } else {
      growthActionPlan = {
        day7: [],
        day30: [],
        day60: [],
        day90: [],
        day180: [],
        day365: []
      };
    }

    // Add campaign-sourced actions if available (normalize to day7/day30/day60)
    if (normalizedResults.campaign?.actionPlan) {
      if (normalizedResults.campaign.actionPlan.day7 || normalizedResults.campaign.actionPlan.sevenDay) {
        const sevenDayActions = normalizedResults.campaign.actionPlan.day7 || normalizedResults.campaign.actionPlan.sevenDay || [];
        growthActionPlan.day7.push(...sevenDayActions);
      }
      if (normalizedResults.campaign.actionPlan.day30 || normalizedResults.campaign.actionPlan.thirtyDay) {
        const thirtyDayActions = normalizedResults.campaign.actionPlan.day30 || normalizedResults.campaign.actionPlan.thirtyDay || [];
        growthActionPlan.day30.push(...thirtyDayActions);
      }
      if (normalizedResults.campaign.actionPlan.day60 || normalizedResults.campaign.actionPlan.sixtyDay) {
        const sixtyDayActions = normalizedResults.campaign.actionPlan.day60 || normalizedResults.campaign.actionPlan.sixtyDay || [];
        growthActionPlan.day60.push(...sixtyDayActions);
      }
      if (normalizedResults.campaign.actionPlan.day90 || normalizedResults.campaign.actionPlan.ninetyDay) {
        const ninetyDayActions = normalizedResults.campaign.actionPlan.day90 || normalizedResults.campaign.actionPlan.ninetyDay || [];
        growthActionPlan.day90.push(...ninetyDayActions);
      }
      if (normalizedResults.campaign.actionPlan.day180) {
        growthActionPlan.day180.push(...normalizedResults.campaign.actionPlan.day180);
      }
      if (normalizedResults.campaign.actionPlan.day365) {
        growthActionPlan.day365.push(...normalizedResults.campaign.actionPlan.day365);
      }
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

    // Add BI warnings to the overall warnings
    if (biWarnings && biWarnings.length > 0) {
      warnings.push(...biWarnings.map(w => `[Business Intelligence] ${w}`));
    }

    return {
      success: true,
      chatId: validChatId,
      results: normalizedResults,
      steps,
      overallStatus,
      warnings,
      businessIntelligence: synthesizedIntel ? {
        company: synthesizedIntel.companyIntelligence,
        technology: synthesizedIntel.technologyIntelligence,
        pricing: synthesizedIntel.pricingIntelligence,
        market: synthesizedIntel.marketIntelligence,
        evidenceSources: synthesizedIntel.evidence?.sources?.length || 0,
        dataGaps: synthesizedIntel.evidence?.warnings?.length || 0
      } : null,
      summary: {
        overallGrowthScore,
        growthPotential: Math.min(100, Math.round(((normalizedResults.market?.demandScore || 50) + (overallGrowthScore || 50)) / 2)),
        marketReadiness: Math.min(100, Math.round((normalizedResults.market?.demandScore || 50) * 0.95)),
        competitiveStrength: Math.min(100, Math.round(50 + ((normalizedResults.competitor?.directCompetitors?.length || 0) * 5))),
        customerDemand: normalizedResults.market?.demandScore || 50,
        brandPosition: Math.min(100, Math.round((overallGrowthScore || 50) * 0.9)),
        bestChannel: normalizedResults.channel?.primaryChannel || normalizedResults.channel?.recommendedChannels?.[0]?.channel || normalizedResults.channel?.recommendedChannels?.[0]?.name || 'Unknown',
        topOpportunity: normalizedResults.market?.growthOpportunities?.[0] || 'Unknown',
        topRisk: normalizedResults.market?.marketRisks?.[0] || 'Unknown',
        nextAction: normalizedResults.campaign?.nextActions?.[0] || normalizedResults.campaign?.campaignIdeas?.[0] || 'Unknown',
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
    confidenceScore: aiResult.confidenceScore ?? (websiteData ? 85 : 70)
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
    confidenceScore: aiResult.confidenceScore ?? 75
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
    confidenceScore: aiResult.confidenceScore ?? 75
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
    confidenceScore: aiResult.confidenceScore ?? 68,
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
    confidenceScore: aiResult.confidenceScore ?? 68
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
    confidenceScore: aiResult.confidenceScore ?? 75
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
    confidenceScore: aiResult.confidenceScore ?? 75
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
    confidenceScore: aiResult.confidenceScore ?? 73
  };
}





async function callBestAI(prompt, maxTokens = 2000, moduleName = 'unknown', fallbackData = null) {
  console.log(`🚀 [AI][${moduleName}] Calling AI...`);
  const result = await callAI(prompt);
  if (result.success && result.data) {
    return { ...result.data, provider: result.provider };
  }
  console.log(`🗑️ [AI][${moduleName}] All providers failed, using rule-based fallback.`);
  if (fallbackData) {
    return { ...fallbackData, provider: 'fallback' };
  }
  return { provider: 'fallback' };
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
      Math.round(Object.values(results).reduce((sum, r) => sum + (r?.confidenceScore ?? 0), 0) / completedSteps) : 0;

    return {
      success: true,
      exists: true,
      results,
      steps,
      input: productIntel.inputJson,
      summary: {
        overallGrowthScore: avgConfidence,
        growthPotential: Math.min(100, Math.round(((results.market?.demandScore || 50) + avgConfidence) / 2)),
        marketReadiness: Math.min(100, Math.round((results.market?.demandScore || 50) * 0.95)),
        competitiveStrength: Math.min(100, Math.round(50 + ((results.competitor?.directCompetitors?.length || 0) * 5))),
        customerDemand: results.market?.demandScore || 50,
        brandPosition: Math.min(100, Math.round(avgConfidence * 0.9)),
        bestChannel: results.channel?.primaryChannel || results.channel?.recommendedChannels?.[0]?.channel || results.channel?.recommendedChannels?.[0]?.name || 'Unknown',
        topOpportunity: results.market?.growthOpportunities?.[0] || 'Unknown',
        topRisk: results.market?.marketRisks?.[0] || 'Unknown',
        nextAction: results.campaign?.nextActions?.[0] || results.campaign?.campaignIdeas?.[0] || 'Unknown',
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
// QUALITY FILTERS
// ============================================

function enforceGrowthQualityFilters(results) {
  if (!results || typeof results !== 'object') return results;

  const market = results.market;
  if (market) {
    ['tam', 'sam', 'som'].forEach(field => {
      const val = market[field];
      if (val && typeof val === 'object') {
        if (!val.source && !val.method && !val.evidence) {
          market[field] = 'Unknown';
        }
      } else if (val && typeof val === 'string') {
        if (val.includes('$') || val.match(/\d+/)) {
          market[field] = 'Unknown';
        }
      }
    });
  }

  const audience = results.audience;
  if (audience && audience.buyerPersonas && Array.isArray(audience.buyerPersonas)) {
    audience.buyerPersonas = audience.buyerPersonas.filter(p => {
      if (!p || !p.name) return false;
      const name = p.name.toLowerCase();
      if (name === 'target persona' || name === 'target user' || name === 'persona name') return false;
      return (p.goals && p.goals.length > 0) || (p.painPoints && p.painPoints.length > 0) || (p.demographics && p.demographics.length > 10);
    });
  }

  ['channel', 'campaign'].forEach(area => {
    const data = results[area];
    if (!data) return;
    if (data.recommendedChannels && Array.isArray(data.recommendedChannels)) {
      data.recommendedChannels = data.recommendedChannels.filter(ch => {
        const name = (ch.channel || ch.name || '').toLowerCase();
        if (name === 'google ads') return false;
        return true;
      });
    }
    if (data.primaryChannel && data.primaryChannel.toLowerCase() === 'google ads') {
      data.primaryChannel = data.recommendedChannels?.[0]?.channel || data.recommendedChannels?.[0]?.name || null;
    }
  });

  return results;
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
      productSummary: ensureString(data.summary || data.productSummary, 'Insufficient Data'),
      usp: ensureString(data.usp || data.valuePropositions?.[0]?.value, 'Unknown'),
      features: ensureArray(data.keyFeatures || data.features),
      benefits: ensureArray(data.coreBenefits || data.benefits),
      painPoints: ensureArray(data.painPointsSolved || data.painPoints),
      targetUsers: ensureArray(data.targetUsers || data.buyerPersonas),
      differentiators: ensureArray(data.differentiators || data.keyDifferentiators),
      jobsToBeDone: ensureArray(data.jobsToBeDone),
      confidenceScore: ensureNumber(data.confidenceScore, 0),
      provider: ensureString(data.provider, 'unknown')
    };
  }
  
  // Normalize Market Discovery
  if (results.market || results.marketDiscovery) {
    const data = results.market || results.marketDiscovery;
    normalized.market = {
      tam: ensureString(data.tam, 'Unknown'),
      sam: ensureString(data.sam, 'Unknown'),
      som: ensureString(data.som, 'Unknown'),
      cagr: ensureString(data.cagr, 'Unknown'),
      marketTrends: ensureArray(data.marketTrends),
      opportunities: ensureArray(data.opportunities || data.growthOpportunities),
      risks: ensureArray(data.risks || data.marketRisks),
      entryStrategy: ensureString(data.entryStrategy, 'Insufficient Data'),
      demandScore: ensureNumber(data.demandScore, 0),
      confidenceScore: ensureNumber(data.confidenceScore, 0),
      provider: ensureString(data.provider, 'unknown')
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
      provider: ensureString(data.provider, 'unknown')
    };
  }
  
  // Normalize Competitor Analysis
  if (results.competitor || results.competitorAnalysis) {
    const data = results.competitor || results.competitorAnalysis;
    normalized.competitor = {
      directCompetitors: ensureArray(data.directCompetitors || data.competitors),
      competitorMatrix: ensureString(data.competitorMatrix, 'Insufficient Data'),
      differentiationOpportunities: ensureArray(data.differentiationOpportunities),
      marketGaps: ensureArray(data.marketGaps),
      competitorWeaknesses: ensureArray(data.competitorWeaknesses || data.weaknesses),
      confidenceScore: ensureNumber(data.confidenceScore, 0),
      provider: ensureString(data.provider, 'unknown')
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
      provider: ensureString(data.provider, 'unknown')
    };
  }
  
  // Normalize Positioning Engine
  if (results.positioning || results.positioningEngine) {
    const data = results.positioning || results.positioningEngine;
    normalized.positioning = {
      positioningStatement: ensureString(data.positioningStatement, 'Unknown'),
      valueProposition: ensureString(data.valueProposition, 'Unknown'),
      brandPromise: ensureString(data.brandPromise, 'Unknown'),
      messagingPillars: ensureArray(data.messagingPillars),
      competitorWeaknessesToAttack: ensureArray(data.competitorWeaknessesToAttack),
      confidenceScore: ensureNumber(data.confidenceScore, 0),
      provider: ensureString(data.provider, 'unknown')
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
      provider: ensureString(data.provider, 'unknown')
    };
  }
  
  // Normalize Channel Recommendation
  if (results.channel || results.channelRecommendation) {
    const data = results.channel || results.channelRecommendation;
    
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
      primaryChannel: ensureString(data.primaryChannel || normalizedChannels[0]?.name || normalizedChannels[0]?.channel, 'Unknown'),
      channelStrategy: ensureString(data.channelStrategy, 'Insufficient Data'),
      budgetRecommendation: ensureString(data.budgetRecommendation, 'Unknown'),
      confidenceScore: ensureNumber(data.confidenceScore, 0),
      provider: ensureString(data.provider, 'unknown')
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

function extractDomainSimple(url) {
  if (!url) return '';
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}
