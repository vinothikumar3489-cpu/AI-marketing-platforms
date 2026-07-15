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
import { getLatestEvidenceSnapshot, saveEvidenceSnapshot } from '../evidence/evidence.service.js';
import { buildGrowthWorkspaceDataFromEvidence, buildEvidenceContext } from '../evidence/evidence.normalizer.js';
import { NOT_ENOUGH_EVIDENCE } from '../../utils/evidence-level.util.js';



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

  // Phase 1: Load latest EvidenceSnapshot as primary data source
  let evidenceSnapshot = null;
  let evidenceGrowthData = null;
  let evidenceContext = '';
  try {
    evidenceSnapshot = await getLatestEvidenceSnapshot({ chatId: validChatId, userId });
    if (evidenceSnapshot) {
      const parsedEvidence = {
        website: evidenceSnapshot.websiteEvidence,
        openGraph: evidenceSnapshot.contentEvidence?.openGraph || null,
        schemas: evidenceSnapshot.contentEvidence?.schemas || null,
        robots: evidenceSnapshot.technicalSeoEvidence?.robots || null,
        sitemap: evidenceSnapshot.technicalSeoEvidence?.sitemap || null,
        pageSpeed: evidenceSnapshot.technicalSeoEvidence?.pageSpeed || null,
        github: evidenceSnapshot.githubEvidence || null,
        technology: evidenceSnapshot.contentEvidence?.technology || null,
      };
      evidenceGrowthData = buildGrowthWorkspaceDataFromEvidence(parsedEvidence);
      evidenceContext = buildEvidenceContext(parsedEvidence);
      console.log('[Growth Workspace] Evidence snapshot loaded:', {
        sourcesCollected: evidenceSnapshot.sourceSummary?.sourcesCollected?.length || 0,
        completenessScore: evidenceGrowthData?.sourceSummary?.completenessScore || 0,
      });
    }
  } catch (evErr) {
    console.log('[Growth Workspace] Evidence load skipped:', evErr.message);
  }

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

    // Step 1: Product Analysis (evidence-backed)
    console.log('✨ [Growth Workspace] Running Product Analysis...');
    steps[0].status = 'running';
    try {
      const rawResult = await runProductAnalysis(input, websiteData, evidenceGrowthData);
      results.product = validateProductAnalysis(rawResult, input);
      steps[0].status = 'completed';
      steps[0].provider = results.product.provider || 'groq';
      steps[0].confidenceScore = results.product.confidenceScore ?? null;
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
      steps[0].confidenceScore = results.product.confidenceScore ?? null;
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
      steps[1].confidenceScore = results.market.confidenceScore ?? null;
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
      steps[1].confidenceScore = results.market.confidenceScore ?? null;
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
      steps[2].confidenceScore = results.audience.confidenceScore ?? null;
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
      steps[2].confidenceScore = results.audience.confidenceScore ?? null;
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
      steps[3].confidenceScore = results.competitor.confidenceScore ?? null;
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
      steps[3].confidenceScore = results.competitor.confidenceScore ?? null;
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
      steps[4].confidenceScore = results.intent.confidenceScore ?? null;
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
      steps[4].confidenceScore = results.intent.confidenceScore ?? null;
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
      steps[5].confidenceScore = results.positioning.confidenceScore ?? null;
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
      steps[5].confidenceScore = results.positioning.confidenceScore ?? null;
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
      steps[6].confidenceScore = results.campaign.confidenceScore ?? null;
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
      steps[6].confidenceScore = results.campaign.confidenceScore ?? null;
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
      steps[7].confidenceScore = results.channel.confidenceScore ?? null;
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
      steps[7].confidenceScore = results.channel.confidenceScore ?? null;
    }

    overallStatus = 'completed';

    // Apply quality filters to ensure evidence-based data
    results = enforceGrowthQualityFilters(results);

    // Normalize all results
    const normalizedResults = normalizeGrowthResults(results, input);
    console.log('🔄 [Growth Workspace] Results normalized');
    console.log('[Growth Normalize] normalizedResults keys', Object.keys(normalizedResults || {}));

    // Calculate growth scores from evidence completeness, not AI guesses
    function calculateEvidenceBasedScore(evidenceGrowthData) {
      if (!evidenceGrowthData?.sourceSummary) return null;
      return evidenceGrowthData.sourceSummary.completenessScore || null;
    }

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

      // Use evidence completeness as basis, or null if no evidence
      if (evidenceGrowthData?.sourceSummary?.completenessScore != null) {
        return evidenceGrowthData.sourceSummary.completenessScore;
      }

      return null;
    }

    function calculateProductFitScore(product) {
      if (!product) return null;
      // Only score based on real features from evidence
      if (evidenceGrowthData?.productIntelligence?.features?.length) {
        return Math.min(100, Math.round(evidenceGrowthData.productIntelligence.features.length * 20));
      }
      return null;
    }

    function calculateMarketOpportunityScore(market) {
      if (!market) return null;
      // Only if we have real growth signals
      if (market.growthSignals?.length) {
        return Math.min(100, Math.round(market.growthSignals.length * 15));
      }
      return null;
    }

    function calculateAudienceClarityScore(audience) {
      if (!audience) return null;
      // Only if personas have substance
      const realPersonas = (audience.buyerPersonas || []).filter(p => p.name && p.name !== 'Target Persona' && p.name !== 'Persona Name');
      if (realPersonas.length) {
        return Math.min(100, Math.round(realPersonas.length * 20 + (audience.buyingTriggers?.length || 0) * 10));
      }
      return null;
    }

    function calculateCompetitiveDefensibilityScore(competitor) {
      if (!competitor) return null;
      // Only if we have real competitor data
      const realCompetitors = (competitor.directCompetitors || []).filter(c => c.name && !c.name.includes('Competitor') && !c.name.includes('competitor'));
      if (realCompetitors.length) {
        return Math.min(100, Math.round(realCompetitors.length * 15 + (competitor.marketGaps?.length || 0) * 10));
      }
      return null;
    }

    function calculateCampaignReadinessScore(campaign, channel) {
      if (!campaign && !channel) return null;
      // Only if we have evidence-backed campaign data
      const angles = (campaign?.creativeAngles || []).filter(a => a.value && !a.value.includes('Angle'));
      const channels = (channel?.recommendedChannels || []).filter(c => c.channel && !c.channel.includes('Channel'));
      if (angles.length || channels.length) {
        return Math.min(100, Math.round(angles.length * 15 + channels.length * 15));
      }
      return null;
    }

    // Generate product-specific top recommendation from evidence
    function generateTopRecommendation(results, input) {
      const productName = input.companyName || input.productName || 'the product';
      const signals = evidenceGrowthData?.growthSignals || [];
      const features = (evidenceGrowthData?.productIntelligence?.features || []).map(f => f.value);
      
      if (signals.length > 0) {
        return `Based on evidence: ${signals[0]?.signal || ''}. Leverage this opportunity for ${productName}.`;
      }
      if (features.length > 0) {
        return `Prioritize marketing the key features found: ${features.slice(0, 3).join(', ')} for ${productName}.`;
      }
      
      const primaryChannel = results.channel?.primaryChannel || results.channel?.recommendedChannels?.[0]?.channel || 'digital channels';
      const topPersona = results.audience?.buyerPersonas?.[0]?.name || 'target audience';
      return `Focus on ${primaryChannel} to reach ${topPersona} for ${productName}.`;
    }

    function generatePrimaryRisk(results, input) {
      const topCompetitor = results.competitor?.directCompetitors?.[0]?.name;
      const productName = input.companyName || input.productName || 'the product';
      
      if (topCompetitor) {
        return `Competitive pressure from ${topCompetitor} in the market.`;
      }
      return `Data insufficient to identify primary risk for ${productName}.`;
    }

    function generateImmediateAction(results, input) {
      const features = (evidenceGrowthData?.productIntelligence?.features || []).map(f => f.value);
      const ctas = evidenceGrowthData?.productIntelligence?.ctaTexts || [];
      const productName = input.companyName || input.productName || 'the product';
      
      if (ctas.length > 0) {
        return `Test and optimize existing CTAs from website: "${ctas[0]}" to improve conversion for ${productName}.`;
      }
      if (features.length > 0) {
        return `Build landing pages highlighting top features: ${features.slice(0, 2).join(', ')} for ${productName}.`;
      }
      
      const primaryChannel = results.channel?.primaryChannel || results.channel?.recommendedChannels?.[0]?.channel || 'marketing';
      return `Launch ${primaryChannel} campaign to validate ${productName} positioning.`;
    }

    const marketOpportunityScore = calculateMarketOpportunityScore(normalizedResults.market);
    const campaignViabilityScore = calculateCampaignReadinessScore(normalizedResults.campaign, normalizedResults.channel);
    const productFitScore = calculateProductFitScore(normalizedResults.product);
    const audienceClarityScore = calculateAudienceClarityScore(normalizedResults.audience);
    const competitiveDefensibilityScore = calculateCompetitiveDefensibilityScore(normalizedResults.competitor);
    const campaignReadinessScore = campaignViabilityScore;
    const componentScores = [productFitScore, marketOpportunityScore, audienceClarityScore, competitiveDefensibilityScore, campaignReadinessScore].filter(s => s !== null && s !== undefined);
    const measurableComponents = componentScores.length;
    const overallGrowthScore = measurableComponents >= 3 ? Math.round(componentScores.reduce((a, b) => a + b, 0) / measurableComponents) : null;
    const growthScoreStatus = measurableComponents >= 3 ? null : NOT_ENOUGH_EVIDENCE;

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
      growthScoreStatus,
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
    try {
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
            evidence: { source: 'User input', confidence: null, collectedAt: new Date().toISOString() }
          },
          businessModel: { type: input.businessModel || 'Unknown', evidence: { source: 'User input', confidence: null, collectedAt: new Date().toISOString() } },
          revenueModel: { pricingTiers: [], evidence: { source: 'Not collected', confidence: 0, collectedAt: new Date().toISOString() } },
          growthStage: { fundingStage: 'Unknown', evidence: { source: 'Not collected', confidence: 0, collectedAt: new Date().toISOString() } },
          productMaturity: { stage: 'Unknown', evidence: { source: 'Not collected', confidence: 0, collectedAt: new Date().toISOString() } },
          marketPosition: { tam: normalizedResults.market?.tam || 'Unknown', competitiveIntensity: 'Unknown', evidence: { source: 'Growth Workspace modules', confidence: null, collectedAt: new Date().toISOString() } },
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
    } catch (storyError) {
      console.error('[Growth Workspace] Executive story generation failed (non-fatal):', storyError.message);
      warnings.push({ code: 'EXECUTIVE_STORY_GENERATION_FAILED', message: 'Core intelligence was saved, but the executive narrative could not be completed.' });
      growthExecutiveStory = {
        executiveSummary: {
          title: `Enterprise Business Intelligence Report: ${formattedCompanyName}`,
          company: formattedCompanyName,
          industry: input.industry || 'Not specified',
          assessmentDate: new Date().toISOString().split('T')[0],
          confidenceLevel: 'Low',
          evidenceSourcesUsed: 0,
          dataGaps: 0
        },
        companyOverview: { name: formattedCompanyName, domain: '' },
        evidenceReferences: { totalSources: 0, dataQuality: 'Unavailable', confidence: 0 },
        _error: storyError.message
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

    // Add evidence-backed data to results
    if (evidenceGrowthData) {
      normalizedResults.evidence = {
        companyOverview: evidenceGrowthData.companyOverview,
        productIntelligence: evidenceGrowthData.productIntelligence,
        technicalSeo: evidenceGrowthData.technicalSeo,
        growthSignals: evidenceGrowthData.growthSignals,
        sourceSummary: evidenceGrowthData.sourceSummary,
        githubRepos: evidenceGrowthData.githubRepos || null,
      };
      // Add data completeness score to summary
      growthSummary.dataCompletenessScore = evidenceGrowthData.sourceSummary.completenessScore || null;
      growthSummary.evidenceSourcesCount = evidenceGrowthData.sourceSummary.sourcesCollected || 0;
      growthSummary.evidenceBased = true;
    } else {
      growthSummary.dataCompletenessScore = null;
      growthSummary.evidenceSourcesCount = 0;
      growthSummary.evidenceBased = false;
    }

    console.log('[Growth Save] executiveStory exists', !!growthExecutiveStory);
    console.log('[Growth Save] actionPlan keys', Object.keys(growthActionPlan || {}));

    // Save to database using validated chat.id
    console.log('💾 [Growth Workspace] Saving core intelligence to database...');
    console.info('[Growth Stage]', { stage: 'TRANSACTION_STARTED', status: 'running', chatId: validChatId });
    
    await prisma.$transaction([
      prisma.productIntelligence.upsert({
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
      }),

      prisma.competitorIntelligence.upsert({
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
      }),

      prisma.campaignIntelligence.upsert({
        where: { chatId: validChatId },
        create: {
          chatId: validChatId,
          userId,
          campaignGenerator: {
            ...normalizedResults.campaign,
            growthSummary,
            metadata: {
              growthSummary,
              generatedAt: new Date().toISOString()
            }
          },
          channelRecommendation: normalizedResults.channel,
          status: 'completed',
          inputJson: input
        },
        update: {
          campaignGenerator: {
            ...normalizedResults.campaign,
            growthSummary,
            metadata: {
              growthSummary,
              generatedAt: new Date().toISOString()
            }
          },
          channelRecommendation: normalizedResults.channel,
          status: 'completed',
          inputJson: input,
          updatedAt: new Date()
        }
      })
    ]);

    console.info('[Growth Stage]', { stage: 'TRANSACTION_COMMITTED', status: 'completed', chatId: validChatId });

    // Save optional derived data (executive story, action plan) separately
    try {
      await prisma.campaignIntelligence.update({
        where: { chatId: validChatId },
        data: {
          executiveStory: growthExecutiveStory,
          actionPlan: growthActionPlan,
          campaignGenerator: {
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
          }
        }
      });
    } catch (derivedError) {
      console.error('[Growth Workspace] Derived data save failed (non-fatal):', derivedError.message);
      warnings.push({ code: 'DERIVED_DATA_SAVE_FAILED', message: 'Core intelligence was saved, but narrative data could not be persisted.' });
    }

    console.log('💾 [Growth Workspace] Core intelligence saved to database');
    console.log(`✅ [Growth Workspace] hasActionPlan: ${!!normalizedResults.campaign.actionPlan}`);

    // Verify database records
    try {
      const [product, audience, competitor, campaign] = await Promise.all([
        prisma.productIntelligence.findFirst({ where: { userId, chatId: validChatId }, select: { id: true } }),
        prisma.competitorIntelligence.findFirst({ where: { userId, chatId: validChatId }, select: { id: true } }),
        prisma.campaignIntelligence.findFirst({ where: { userId, chatId: validChatId }, select: { id: true } }),
      ]);
      console.info('[Growth Stage]', {
        stage: 'PERSISTENCE_VERIFIED',
        status: 'completed',
        chatId: validChatId,
        persistence: {
          hasProductIntelligence: !!product,
          hasAudienceIntelligence: !!audience,
          hasCompetitorIntelligence: !!competitor,
          hasCampaignIntelligence: !!campaign,
        }
      });
    } catch (verifyError) {
      console.error('[Growth Stage]', {
        stage: 'PERSISTENCE_VERIFY_FAILED',
        status: 'warning',
        chatId: validChatId,
        errorName: verifyError.name,
        errorMessage: verifyError.message,
      });
    }

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
        growthPotential: null,
        marketReadiness: null,
        competitiveStrength: null,
        customerDemand: null,
        brandPosition: null,
        bestChannel: normalizedResults.channel?.primaryChannel || normalizedResults.channel?.recommendedChannels?.[0]?.channel || null,
        topOpportunity: null,
        topRisk: null,
        nextAction: null,
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

async function runProductAnalysis(input, websiteData, evidenceGrowthData) {
  let websiteContext = '';
  if (websiteData) {
    websiteContext = `\n\nScraped Website Data:
Title: ${websiteData.metadata?.title || 'N/A'}
Description: ${websiteData.metadata?.description || 'N/A'}
Content Summary: ${websiteData.text?.substring(0, 1500) || 'N/A'}
AI Extracted Data: ${websiteData.extract ? JSON.stringify(websiteData.extract) : 'N/A'}
Key Features Found: ${websiteData.content?.headings?.slice(0, 5).map(h => h.text).join(', ') || 'N/A'}`;
  }

  let evidenceContextStr = '';
  if (evidenceGrowthData) {
    const pi = evidenceGrowthData.productIntelligence || {};
    const co = evidenceGrowthData.companyOverview || {};
    const features = pi.features || [];
    const ctas = pi.ctaTexts || [];
    const techs = pi.technologiesDetected || [];
    evidenceContextStr = `\n\n[EVIDENCE - REAL DATA FROM WEBSITE SCAN]
Features detected: ${features.map(f => f.value).join(', ') || 'None'}
CTAs found: ${ctas.join(', ') || 'None'}
Technologies detected: ${techs.join(', ') || 'None'}
Schema types: ${(pi.schemaTypes || []).join(', ') || 'None'}
Has Product schema: ${pi.hasProduct || false}
Has Reviews/Ratings: ${pi.hasReview || pi.hasAggregateRating || false}
Has FAQ: ${pi.hasFAQPage || false}
Has Organization: ${pi.hasOrganization || false}
Sitemap URLs: ${evidenceGrowthData.technicalSeo?.sitemapUrlCount || 'Unknown'}
Has blog: ${co.hasBlog ? 'Yes' : 'Not detected'}
Has pricing page: ${co.hasPricingPage ? 'Yes' : 'Not detected'}
Has contact page: ${co.hasContactPage ? 'Yes' : 'Not detected'}
PageSpeed score: ${evidenceGrowthData.technicalSeo?.performanceScore != null ? evidenceGrowthData.technicalSeo.performanceScore + '/100' : 'Not available'}
Growth signals: ${(evidenceGrowthData.growthSignals || []).map(s => s.signal).join(' | ') || 'None'}`;
  }

  const prompt = `Analyze this product comprehensively:

Product: ${input.productName}
Company: ${input.companyName}
Website: ${input.websiteUrl}
Description: ${input.description}
Industry: ${input.industry}${websiteContext}${evidenceContextStr}

Based on the above information, provide a detailed product analysis. Use the EVIDENCE data as primary source (it was collected from real website scanning). Only use AI reasoning for areas where evidence is missing.

Provide a JSON response with:
{
  "usp": "Actual Unique Selling Proposition from website evidence",
  "summary": "comprehensive 2-3 sentence summary based on evidence",
  "keyFeatures": [{"value": "Feature 1", "confidence": null, "impact": null}],
  "coreBenefits": [{"value": "Benefit 1", "confidence": null, "impact": null}],
  "painPointsSolved": [{"value": "Pain Point", "confidence": null, "impact": null}],
  "targetUsers": [{"value": "User Segment", "confidence": null, "impact": null}],
  "differentiators": [{"value": "Differentiator", "confidence": null, "impact": null}],
  "jobsToBeDone": [{"value": "Actual JTBD", "confidence": null, "impact": null}],
  "confidenceScore": null
}

CRITICAL INSTRUCTION: Extract REAL information from the evidence and website content. NEVER use generic placeholders. Return only valid JSON.`;

  const fallbackData = generateProductFallback(input, websiteData);
  const aiResult = await callBestAI(prompt, 1200, 'Product Analysis', fallbackData);
  
  return {
    ...aiResult,
    provider: aiResult.provider || 'fallback',
    confidenceScore: aiResult.confidenceScore ?? null
  };
}

async function runMarketDiscovery(input, productData) {
  const prompt = `Analyze the market for this product:

Product: ${input.productName}
Industry: ${input.industry}
Target Country: ${input.targetCountry}
Business Stage: ${input.businessStage}

Context: ${productData.productSummary}

IMPORTANT: Do NOT invent market size numbers (TAM/SAM/SOM). If you don't have verified data, use "Growth Signals" instead.

Provide JSON response:
{
  "demandScore": null,
  "confidence": null,
  "marketTrends": [{"value": "Trend description based on industry knowledge", "confidence": null, "impact": null}],
  "opportunities": [{"value": "Opportunity description", "confidence": null, "impact": null}],
  "risks": [{"value": "Risk description", "confidence": null, "impact": null}],
  "growthSignals": [{"signal": "Observable market signal from product positioning", "source": "AI-inferred", "confidence": null}],
  "entryStrategy": "Detailed description of entry strategy"
}

CRITICAL INSTRUCTION: Do NOT fabricate market sizing numbers. Use growthSignals instead of TAM/SAM/SOM. Return only valid JSON.`;

  const fallbackData = generateMarketFallback(input, productData);
  const aiResult = await callBestAI(prompt, 1200, 'Market Discovery', fallbackData);
  
  return {
    ...aiResult,
    provider: aiResult.provider || 'fallback',
    confidenceScore: aiResult.confidenceScore ?? null
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
      "intentScore": null,
      "goals": ["Goal 1"],
      "painPoints": ["Pain 1"]
    }
  ],
  "buyingTriggers": [{"value": "Trigger", "confidence": null, "impact": null}],
  "commonObjections": [{"value": "Objection", "confidence": null, "impact": null}],
  "bestChannels": [{"value": "Channel", "confidence": null, "impact": null}],
  "decisionMakers": [{"value": "Title", "confidence": null, "impact": null}],
  "confidenceScore": null
}

CRITICAL INSTRUCTION: NEVER use generic text. Personas must deeply reflect the real problems ${input.productName} solves. Return only valid JSON.`;

  const fallbackData = generateAudienceFallback(input, productData);
  const aiResult = await callBestAI(prompt, 1200, 'Audience Intelligence', fallbackData);
  
  return {
    ...aiResult,
    provider: aiResult.provider || 'fallback',
    confidenceScore: aiResult.confidenceScore ?? null
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
      "opportunityScore": null,
      "strengths": ["s1"],
      "weaknesses": ["w1"]
    }
  ],
  "competitorMatrix": "Matrix description",
  "differentiationOpportunities": [{"value": "Opp", "confidence": null, "impact": null}],
  "marketGaps": [{"value": "Gap", "confidence": null, "impact": null}],
  "competitorWeaknesses": [{"value": "Weakness", "confidence": null, "impact": null}],
  "confidenceScore": null
}

CRITICAL INSTRUCTION: NEVER use generic placeholders like "Competitor 1". Use real competitor names if known, or infer real players in the ${input.industry} space. Return only valid JSON.`;

  const fallbackData = generateCompetitorFallback(input, productData, orchestratorCompetitors);
  const aiResult = await callBestAI(prompt, 1200, 'Competitor Analysis', fallbackData);
  
  return {
    ...aiResult,
    provider: aiResult.provider || 'fallback',
    confidenceScore: aiResult.confidenceScore ?? null,
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
  "hotSegments": [{"value": "Segment", "confidence": null, "impact": null}],
  "warmSegments": [{"value": "Segment", "confidence": null, "impact": null}],
  "coldSegments": [{"value": "Segment", "confidence": null, "impact": null}],
  "buyingSignals": [{"value": "Signal", "confidence": null, "impact": null}],
  "triggerEvents": [{"value": "Event", "confidence": null, "impact": null}],
  "leadScoringRules": [{"value": "Rule", "confidence": null, "impact": null}],
  "confidenceScore": null
}

CRITICAL INSTRUCTION: Return ONLY valid JSON in the exact schema specified. Use the value/confidence/impact schema.`;

  const fallbackData = generateIntentFallback(input, audienceData);
  const aiResult = await callBestAI(prompt, 1000, 'Intent Prediction', fallbackData);
  
  return {
    ...aiResult,
    provider: aiResult.provider || 'fallback',
    confidenceScore: aiResult.confidenceScore ?? null
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
  "messagingPillars": [{"value": "Pillar description", "confidence": null, "impact": null}],
  "competitorWeaknessesToAttack": [{"value": "Weakness", "confidence": null, "impact": null}],
  "confidenceScore": null
}

CRITICAL INSTRUCTION: Return ONLY valid JSON using the exact schema above.`;

  const fallbackData = generatePositioningFallback(input, productData, competitorData);
  const aiResult = await callBestAI(prompt, 1000, 'Positioning Engine', fallbackData);
  
  return {
    ...aiResult,
    provider: aiResult.provider || 'fallback',
    confidenceScore: aiResult.confidenceScore ?? null
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
  "creativeAngles": [{"value": "Angle", "confidence": null, "impact": null}],
  "copyHooks": [{"value": "Hook", "confidence": null, "impact": null}],
  "ctaSuggestions": [{"value": "CTA", "confidence": null, "impact": null}],
  "emailSequence": [{"value": "Email Idea", "confidence": null, "impact": null}],
  "socialPostIdeas": [{"value": "Post Idea", "confidence": null, "impact": null}],
  "videoIdeas": [{"value": "Video Idea", "confidence": null, "impact": null}],
  "actionPlan": {
    "sevenDay": [{"title": "Task", "problem": "What problem this solves", "evidence": "Data evidence", "researchSource": "Source module", "businessImpact": "Business impact", "difficulty": "Low/Medium/High", "priority": "High", "estimatedTimeline": "1 week", "owner": "Role"}],
    "thirtyDay": [{"title": "Task", "problem": "What problem this solves", "evidence": "Data evidence", "researchSource": "Source module", "businessImpact": "Business impact", "difficulty": "Low/Medium/High", "priority": "High", "estimatedTimeline": "2-4 weeks", "owner": "Role"}],
    "sixtyDay": [{"title": "Task", "problem": "What problem this solves", "evidence": "Data evidence", "researchSource": "Source module", "businessImpact": "Business impact", "difficulty": "Low/Medium/High", "priority": "High", "estimatedTimeline": "1-2 months", "owner": "Role"}],
    "ninetyDay": [{"title": "Task", "problem": "What problem this solves", "evidence": "Data evidence", "researchSource": "Source module", "businessImpact": "Business impact", "difficulty": "Low/Medium/High", "priority": "High", "estimatedTimeline": "3 months", "owner": "Role"}]
  },
  "confidenceScore": null
}

CRITICAL INSTRUCTION: Do NOT invent ROI, CTR, CPA, or conversion numbers. Action plan MUST use 'sevenDay', 'thirtyDay', 'sixtyDay', 'ninetyDay' timelines. Every task MUST explain WHY it exists using the problem, evidence, and researchSource fields. Do not use generic placeholders.`;

  const fallbackData = generateCampaignFallback(input, allResults.product, allResults);
  const aiResult = await callBestAI(prompt, 1200, 'Campaign Generator', fallbackData);
  
  return {
    ...aiResult,
    provider: aiResult.provider || 'fallback',
    confidenceScore: aiResult.confidenceScore ?? null
  };
}

async function runChannelRecommendation(input, audienceData, campaignData) {
  const prompt = `Recommend marketing channels:

Product: ${input.productName}
Target Audience: ${input.targetAudience}
  Preferred: ${input.preferredChannel}
Budget info: ${input.budgetRange}
Campaign Goal: ${input.campaignGoal}

Best Channels from Audience Analysis: ${audienceData.bestChannels?.join(', ')}

IMPORTANT: Do NOT invent budget allocations or ROI numbers. Use channel fit reasoning instead.

Provide JSON response:
{
  "recommendedChannels": [
    {"channel": "Channel Name", "fit": "Why this channel fits the product/audience", "reasoning": "Channel fit reasoning"}
  ],
  "channelFitScores": [{"value": "Channel fit reasoning based on evidence", "confidence": null, "impact": null}],
  "postingFrequency": [{"value": "Recommended frequency", "confidence": null, "impact": null}],
  "contentTypes": [{"value": "Content Type", "confidence": null, "impact": null}],
  "confidenceScore": null
}

CRITICAL INSTRUCTION: Do NOT invent budget allocations or ROI percentages. Return only valid JSON.`;

  const fallbackData = generateChannelFallback(input, audienceData, campaignData);
  const aiResult = await callBestAI(prompt, 1000, 'Channel Recommendation', fallbackData);
  
  return {
    ...aiResult,
    provider: aiResult.provider || 'fallback',
    confidenceScore: aiResult.confidenceScore ?? null
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
    const [productIntel, competitorIntel, campaignIntel, evidenceSnapshot] = await Promise.all([
      prisma.productIntelligence.findUnique({ where: { chatId } }),
      prisma.competitorIntelligence.findUnique({ where: { chatId } }),
      prisma.campaignIntelligence.findUnique({ where: { chatId } }),
      prisma.evidenceSnapshot.findFirst({
        where: { chatId, userId },
        orderBy: { createdAt: 'desc' },
      }),
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

    // Add evidence data if available
    if (evidenceSnapshot) {
      const parsedEvidence = {
        website: evidenceSnapshot.websiteEvidence,
        openGraph: evidenceSnapshot.contentEvidence?.openGraph || null,
        schemas: evidenceSnapshot.contentEvidence?.schemas || null,
        robots: evidenceSnapshot.technicalSeoEvidence?.robots || null,
        sitemap: evidenceSnapshot.technicalSeoEvidence?.sitemap || null,
        pageSpeed: evidenceSnapshot.technicalSeoEvidence?.pageSpeed || null,
        github: evidenceSnapshot.githubEvidence || null,
        technology: evidenceSnapshot.contentEvidence?.technology || null,
      };
      const evGrowthData = buildGrowthWorkspaceDataFromEvidence(parsedEvidence);
      if (evGrowthData) {
        results.evidence = {
          companyOverview: evGrowthData.companyOverview,
          productIntelligence: evGrowthData.productIntelligence,
          technicalSeo: evGrowthData.technicalSeo,
          growthSignals: evGrowthData.growthSignals,
          sourceSummary: evGrowthData.sourceSummary,
          githubRepos: evGrowthData.githubRepos || null,
        };
      }
    }

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

    const completedSteps = steps.filter(s => s.status === 'completed').length;
    const evidenceScore = results.evidence?.sourceSummary?.completenessScore || null;
    const overallGrowthScore = evidenceScore || null;

    return {
      success: true,
      exists: true,
      results,
      steps,
      input: productIntel.inputJson,
      evidenceSnapshot: evidenceSnapshot ? {
        sourcesCollected: evidenceSnapshot.sourceSummary?.sourcesCollected || [],
        collectedAt: evidenceSnapshot.createdAt,
      } : null,
      summary: {
        overallGrowthScore,
        dataCompletenessScore: evidenceScore,
        evidenceBased: !!evidenceScore,
        bestChannel: results.channel?.primaryChannel || results.channel?.recommendedChannels?.[0]?.channel || results.channel?.recommendedChannels?.[0]?.name || 'Unknown',
        topOpportunity: results.market?.growthOpportunities?.[0] || null,
        topRisk: results.market?.marketRisks?.[0] || null,
        nextAction: results.campaign?.nextActions?.[0] || results.campaign?.campaignIdeas?.[0] || null,
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
    // Remove TAM/SAM/SOM fields entirely - they are always invented
    delete market.tam;
    delete market.sam;
    delete market.som;
    delete market.cagr;
    // If demandScore exists and looks made up, null it
    if (market.demandScore != null && (market.demandScore < 0 || market.demandScore > 100)) {
      market.demandScore = null;
    }
    // If no growthSignals, set empty array
    if (!market.growthSignals) {
      market.growthSignals = [];
    }
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
      data.recommendedChannels = data.recommendedChannels.map(ch => {
        // Remove invented budget/ROI fields
        const clean = { ...ch };
        delete clean.budgetAllocation;
        delete clean.expectedRoi;
        delete clean.roi;
        delete clean.budgetSplit;
        return clean;
      });
    }
    if (data.primaryChannel && data.primaryChannel.toLowerCase() === 'google ads') {
      data.primaryChannel = data.recommendedChannels?.[0]?.channel || data.recommendedChannels?.[0]?.name || null;
    }
  });

  // Remove invented percentages from campaign items
  if (results.campaign?.actionPlan) {
    ['day7', 'day30', 'day60', 'day90', 'day180', 'day365', 'sevenDay', 'thirtyDay', 'sixtyDay', 'ninetyDay'].forEach(key => {
      if (results.campaign.actionPlan[key]) {
        results.campaign.actionPlan[key] = results.campaign.actionPlan[key].map(item => {
          if (item.roi) delete item.roi;
          if (item.expectedGain) delete item.expectedGain;
          if (item.expectedKPI && item.expectedKPI.includes('%')) delete item.expectedKPI;
          return item;
        });
      }
    });
  }

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
      confidenceScore: data.confidenceScore ?? null,
      provider: ensureString(data.provider, 'unknown')
    };
  }
  
  // Normalize Market Discovery (no TAM/SAM/SOM - always invented)
  if (results.market || results.marketDiscovery) {
    const data = results.market || results.marketDiscovery;
    normalized.market = {
      marketTrends: ensureArray(data.marketTrends),
      opportunities: ensureArray(data.opportunities || data.growthOpportunities),
      risks: ensureArray(data.risks || data.marketRisks),
      growthSignals: ensureArray(data.growthSignals),
      entryStrategy: ensureString(data.entryStrategy, null),
      demandScore: data.demandScore ?? data.demand ?? null,
      confidenceScore: data.confidenceScore ?? null,
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
      confidenceScore: data.confidenceScore ?? null,
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
      confidenceScore: data.confidenceScore ?? null,
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
      confidenceScore: data.confidenceScore ?? null,
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
      confidenceScore: data.confidenceScore ?? null,
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
      confidenceScore: data.confidenceScore ?? null,
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
      confidenceScore: data.confidenceScore ?? null,
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

function ensureNumber(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
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
