import { prisma } from '../../config/prisma.js';
import fetch from 'node-fetch';
import { scrapeWebsite } from '../../domains/research/services/scraper.service.js';
import { callAI } from '../../ai/services/aiRouter.service.js';
import { deriveWebsiteIdentity, isValidProductIdentity } from '../../utils/seo-identity.util.js';
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

// Every result and score carries a provenance label so the frontend can show
// WHY a value should be trusted (or treated as a hypothesis to validate).
const EVIDENCE_BASED = 'EVIDENCE_BASED';
const HYPOTHESIS = 'HYPOTHESIS';

/**
 * Labels each module's results with its data provenance.
 * Evidence-backed modules are those whose outputs were derived from collected
 * evidence (website scan, research orchestrator, BI layer). Everything else is
 * labeled HYPOTHESIS so the UI can surface "estimate — validate" states.
 */
function labelResultSources(results, evidenceFlags = {}) {
  if (!results || typeof results !== 'object') return results;
  const modules = ['product', 'market', 'audience', 'competitor', 'intent', 'positioning', 'campaign', 'channel'];
  for (const key of modules) {
    const mod = results[key];
    if (mod && typeof mod === 'object') {
      mod._dataSource = evidenceFlags[key] ? EVIDENCE_BASED : HYPOTHESIS;
    }
  }
  return results;
}

/**
 * Computes a dimension sub-score with provenance and confidence penalty.
 * Evidence-backed scores keep their raw value; hypothesis scores are lowered
 * by the penalty so estimates never masquerade as verified data.
 */
function calculateSubScore(evidenceSource, rawScore, penalty = 0) {
  const isEvidenceBased = evidenceSource === EVIDENCE_BASED;
  const numericScore = Number(rawScore);
  const value = Number.isFinite(numericScore)
    ? Math.max(0, Math.min(100, Math.round(numericScore - (isEvidenceBased ? 0 : penalty))))
    : null;
  return {
    value,
    evidenceSource: isEvidenceBased ? EVIDENCE_BASED : HYPOTHESIS,
    penalty: isEvidenceBased ? 0 : penalty
  };
}

/**
 * Builds a market-sizing evidence block from real keyword volume data.
 * TAM/SAM/SOM are only ever suggested from this verified data — never invented.
 */
function buildMarketSizingEvidence(researchData) {
  if (!researchData || !Array.isArray(researchData.keywords)) return '';
  const verified = researchData.keywords.filter((k) => k && k.keyword && Number(k.searchVolume) > 0);
  if (verified.length === 0) return '';
  const top = verified.slice(0, 25);
  const totalMonthly = top.reduce((sum, k) => sum + Number(k.searchVolume), 0);
  return `\n\n[VERIFIED MARKET-SIZING EVIDENCE — derived from ${verified.length} real keyword volumes]
Combined monthly search volume (top ${top.length} keywords): ${totalMonthly.toLocaleString()}
Sample keywords: ${top.slice(0, 8).map((k) => `${k.keyword} (${Number(k.searchVolume).toLocaleString()}/mo)`).join(', ')}
You MAY provide TAM/SAM/SOM estimates ONLY when derived from this real data and clearly labeled as estimates. Never invent market sizing numbers. If the evidence is insufficient, omit TAM/SAM/SOM and use growthSignals instead.`;
}

const firstStringValue = (list) => {
  const item = Array.isArray(list) ? list[0] : null;
  if (item == null) return null;
  if (typeof item === 'string') return item.trim() || null;
  return (item.value || item.title || item.name || item.goal || item.opportunity || item.channel || '').trim() || null;
};

export async function runFullGrowthAnalysis({ chatId, userId, input }) {
  console.log('Ã°Å¸Å¡â‚¬ [Growth Workspace] Starting full analysis:', { chatId, userId, productName: input.productName });

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
    console.log('Ã°Å¸â€œÂ [Growth Workspace] No valid chat found, creating new chat automatically...');
    
    const title = input.productName || input.companyName || 'New Project';
    
    chat = await prisma.chat.create({
      data: {
        userId: userId,
        title: title,
        productName: input.productName || title,
      }
    });

    console.log('Ã¢Å“â€¦ [Growth Workspace] New chat created automatically:', { 
      chatId: chat.id, 
      title: chat.title 
    });
  } else {
    console.log('Ã¢Å“â€¦ [Growth Workspace] Chat validated:', { chatId: chat.id });
  }

  // Use the valid chat ID for all operations
  const validChatId = chat.id;

  // IMPROVED: Don't delete old data immediately - we'll use upsert operations instead
  // This prevents data loss if analysis fails mid-way
  // Old approach (REMOVED): await prisma.productIntelligence.deleteMany({ where: { chatId: validChatId } });
  console.log('Ã°Å¸â€™Â¾ [Growth Workspace] Using transactional upsert approach (old data preserved until success)');

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
    { key: 'product', label: 'Product Analysis', status: 'pending', startTime: null, endTime: null, duration: null, provider: null, statusCode: null, failureType: null, responseReceived: false, jsonParsed: false, schemaValidated: false },
    { key: 'market', label: 'Market Discovery', status: 'pending', startTime: null, endTime: null, duration: null, provider: null, statusCode: null, failureType: null, responseReceived: false, jsonParsed: false, schemaValidated: false },
    { key: 'audience', label: 'Audience Intelligence', status: 'pending', startTime: null, endTime: null, duration: null, provider: null, statusCode: null, failureType: null, responseReceived: false, jsonParsed: false, schemaValidated: false },
    { key: 'competitor', label: 'Competitor Analysis', status: 'pending', startTime: null, endTime: null, duration: null, provider: null, statusCode: null, failureType: null, responseReceived: false, jsonParsed: false, schemaValidated: false },
    { key: 'intent', label: 'Intent Prediction', status: 'pending', startTime: null, endTime: null, duration: null, provider: null, statusCode: null, failureType: null, responseReceived: false, jsonParsed: false, schemaValidated: false },
    { key: 'positioning', label: 'Positioning Engine', status: 'pending', startTime: null, endTime: null, duration: null, provider: null, statusCode: null, failureType: null, responseReceived: false, jsonParsed: false, schemaValidated: false },
    { key: 'campaign', label: 'Campaign Generator', status: 'pending', startTime: null, endTime: null, duration: null, provider: null, statusCode: null, failureType: null, responseReceived: false, jsonParsed: false, schemaValidated: false },
    { key: 'channel', label: 'Channel Recommendation', status: 'pending', startTime: null, endTime: null, duration: null, provider: null, statusCode: null, failureType: null, responseReceived: false, jsonParsed: false, schemaValidated: false }
  ];

  let results = {};
  const warnings = [];
  let overallStatus = 'in_progress';
  let websiteData = null;

  try {
    // Step 0: Collect research data using orchestrator (single source of truth)
    let researchData = null;
    if (input.websiteUrl) {
      console.log('Ã°Å¸â€Â [Growth Workspace] Collecting research data via orchestrator:', input.websiteUrl);
      try {
        researchData = await collectResearchData({
          websiteUrl: input.websiteUrl,
          productName: input.productName || '',
          companyName: input.companyName || '',
          userId,
          chatId: validChatId
        });
        console.log('Ã¢Å“â€¦ [Growth Workspace] Research data collected:', {
          hasWebsite: !!researchData.websiteContent,
          hasTechnical: !!researchData.technical,
          competitorsCount: researchData.competitors.length,
          keywordsCount: researchData.keywords.length
        });
      } catch (researchError) {
        console.log('Ã¢Å¡Â Ã¯Â¸Â [Growth Workspace] Research orchestrator failed, falling back to direct scrape:', researchError.message);
      }
    }

    // Step 1: Scrape website if not already done by orchestrator
    if (input.websiteUrl && !researchData?.websiteContent) {
      console.log('Ã°Å¸â€Â [Growth Workspace] Scraping website (fallback):', input.websiteUrl);
      try {
        const scrapeResult = await scrapeWebsite({
          websiteUrl: input.websiteUrl,
          userId,
          chatId: validChatId
        });
        
        if (scrapeResult.success && scrapeResult.scrapedData) {
          websiteData = scrapeResult.scrapedData;
          console.log('Ã¢Å“â€¦ [Growth Workspace] Website scraped successfully:', {
            titleLength: websiteData.metadata?.title?.length,
            contentLength: websiteData.text?.length,
            hasDescription: !!websiteData.metadata?.description
          });
          
          // Enrich input with scraped data if description is missing
          if (!input.description && websiteData.metadata?.description) {
            input.description = websiteData.metadata.description;
          }
        } else {
          console.log('Ã¢Å¡Â Ã¯Â¸Â [Growth Workspace] Website scraping failed, continuing without scraped data');
        }
      } catch (scrapeError) {
        console.log('Ã¢Å¡Â Ã¯Â¸Â [Growth Workspace] Scraping error:', scrapeError.message);
      }
    } else if (researchData?.websiteContent) {
      websiteData = researchData.websiteContent;
      console.log('Ã¢Å“â€¦ [Growth Workspace] Using website content from orchestrator');
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
    console.log('Ã¢Å“â€¦ [Growth Workspace] Derived Identity:', identity);
    
    // Inject identity into input but prefer user inputs from the new multi-step form
    // Validate user-provided names against tagline/UI patterns to prevent leakage
    const validatedBrandName = input.brandName && isValidProductIdentity(input.brandName) ? input.brandName : null;
    const validatedCompanyName = input.companyName && isValidProductIdentity(input.companyName) ? input.companyName : null;
    // Never overwrite verified identity with placeholders â€” fall back in priority order:
    // user-validated > derived identity > raw user input
    input.productName = validatedBrandName || identity.productName || (input.productName && isValidProductIdentity(input.productName) ? input.productName : '') || 'Unnamed Product';
    input.companyName = validatedCompanyName || identity.companyName || (input.companyName && isValidProductIdentity(input.companyName) ? input.companyName : '') || input.productName;
    input.industry = input.industry || identity.industry || '';
    input.businessModel = identity.businessModel || input.businessModel || '';
    input.businessCategory = identity.businessCategory || '';
    input.companySize = identity.companySize || '';

    // [Business Intelligence] Collect enterprise-grade intelligence
    console.log('[Business Intelligence] Starting enterprise intelligence collection');
    let businessIntelligence = null;
    let synthesizedIntel = null;
    let biWarnings = [];
    try {
      businessIntelligence = await collectBusinessIntelligence({
        chatId: validChatId,
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
          researchData.pricingTiers = synthesizedIntel.pricingIntelligence.tiers || [];
          researchData.pricingSignals = [synthesizedIntel.pricingIntelligence];
          researchData.audienceSignals = [synthesizedIntel.audienceIntelligence];
          researchData.competitorSignals = [synthesizedIntel.competitorIntelligence];
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
    console.log('Ã¢Å“Â¨ [Growth Workspace] Running Product Analysis...');
    steps[0].status = 'running';
    steps[0].startTime = Date.now();
    try {
      const rawResult = await runProductAnalysis(input, websiteData, evidenceGrowthData);
      results.product = validateProductAnalysis(rawResult, input);
      steps[0].status = 'completed';
      steps[0].endTime = Date.now();
      steps[0].duration = steps[0].endTime - steps[0].startTime;
      steps[0].provider = results.product.provider || 'groq';
      steps[0].statusCode = rawResult.statusCode || 200;
      steps[0].failureType = rawResult.success ? null : (rawResult.status || 'UNKNOWN');
      steps[0].responseReceived = !!rawResult.data;
      steps[0].jsonParsed = !!rawResult.data;
      steps[0].schemaValidated = true;
      steps[0].confidenceScore = results.product.confidenceScore ?? null;
      console.log('Ã¢Å“â€¦ [Growth Workspace] Product Analysis complete & validated:', {
        hasUSP: !!results.product.usp,
        featuresCount: results.product.features?.length || 0,
        provider: results.product.provider,
        duration: steps[0].duration,
        failureType: steps[0].failureType
      });
    } catch (error) {
      steps[0].endTime = Date.now();
      steps[0].duration = steps[0].endTime - steps[0].startTime;
      steps[0].failureType = error.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_FAILED';
      steps[0].statusCode = 0;
      steps[0].responseReceived = false;
      steps[0].jsonParsed = false;
      steps[0].schemaValidated = false;
      console.log('Ã¢Å¡Â Ã¯Â¸Â [Growth Workspace] Product Analysis failed:', error.message);
      warnings.push(`Product Analysis fallback: ${error.message}`);
      results.product = validateProductAnalysis(null, input);
      steps[0].status = 'completed';
      steps[0].provider = 'fallback';
      steps[0].confidenceScore = results.product.confidenceScore ?? null;
    }

    // Step 2: Market Discovery
    await new Promise(resolve => setTimeout(resolve, 4000));
    console.log('Ã¢Å“Â¨ [Growth Workspace] Running Market Discovery...');
    steps[1].status = 'running';
    steps[1].startTime = Date.now();
    try {
      const rawResult = await runMarketDiscovery(input, results.product, evidenceGrowthData, researchData);
      results.market = validateMarketDiscovery(rawResult, input);
      steps[1].status = 'completed';
      steps[1].endTime = Date.now();
      steps[1].duration = steps[1].endTime - steps[1].startTime;
      steps[1].provider = results.market.provider || 'groq';
      steps[1].statusCode = rawResult.statusCode || 200;
      steps[1].failureType = rawResult.success ? null : (rawResult.status || 'UNKNOWN');
      steps[1].responseReceived = !!rawResult.data;
      steps[1].jsonParsed = !!rawResult.data;
      steps[1].schemaValidated = true;
      steps[1].confidenceScore = results.market.confidenceScore ?? null;
      console.log('Ã¢Å“â€¦ [Growth Workspace] Market Discovery complete & validated:', {
        trendsCount: results.market.marketTrends?.length || 0,
        opportunitiesCount: results.market.opportunities?.length || 0,
        provider: results.market.provider,
        duration: steps[1].duration,
        failureType: steps[1].failureType
      });
    } catch (error) {
      steps[1].endTime = Date.now();
      steps[1].duration = steps[1].endTime - steps[1].startTime;
      steps[1].failureType = error.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_FAILED';
      steps[1].statusCode = 0;
      steps[1].responseReceived = false;
      steps[1].jsonParsed = false;
      steps[1].schemaValidated = false;
      console.log('Ã¢Å¡Â Ã¯Â¸Â [Growth Workspace] Market Discovery failed:', error.message);
      warnings.push(`Market Discovery fallback: ${error.message}`);
      results.market = validateMarketDiscovery(null, input);
      steps[1].status = 'completed';
      steps[1].provider = 'fallback';
      steps[1].confidenceScore = results.market.confidenceScore ?? null;
    }

    // Step 3: Audience Intelligence
    await new Promise(resolve => setTimeout(resolve, 4000));
    console.log('Ã¢Å“Â¨ [Growth Workspace] Running Audience Intelligence...');
    steps[2].status = 'running';
    steps[2].startTime = Date.now();
    try {
      const rawResult = await runAudienceIntelligence(input, results.product, evidenceGrowthData, researchData);
      results.audience = validateAudienceIntelligence(rawResult, input);
      steps[2].status = 'completed';
      steps[2].endTime = Date.now();
      steps[2].duration = steps[2].endTime - steps[2].startTime;
      steps[2].provider = results.audience.provider || 'groq';
      steps[2].statusCode = rawResult.statusCode || 200;
      steps[2].failureType = rawResult.success ? null : (rawResult.status || 'UNKNOWN');
      steps[2].responseReceived = !!rawResult.data;
      steps[2].jsonParsed = !!rawResult.data;
      steps[2].schemaValidated = true;
      steps[2].confidenceScore = results.audience.confidenceScore ?? null;
      console.log('Ã¢Å“â€¦ [Growth Workspace] Audience Intelligence complete & validated:', {
        personasCount: results.audience.buyerPersonas?.length || 0,
        channelsCount: results.audience.bestChannels?.length || 0,
        provider: results.audience.provider,
        duration: steps[2].duration,
        failureType: steps[2].failureType
      });
    } catch (error) {
      steps[2].endTime = Date.now();
      steps[2].duration = steps[2].endTime - steps[2].startTime;
      steps[2].failureType = error.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_FAILED';
      steps[2].statusCode = 0;
      steps[2].responseReceived = false;
      steps[2].jsonParsed = false;
      steps[2].schemaValidated = false;
      console.log('Ã¢Å¡Â Ã¯Â¸Â [Growth Workspace] Audience Intelligence failed:', error.message);
      warnings.push(`Audience Intelligence fallback: ${error.message}`);
      results.audience = validateAudienceIntelligence(null, input);
      steps[2].status = 'completed';
      steps[2].provider = 'fallback';
      steps[2].confidenceScore = results.audience.confidenceScore ?? null;
    }

    // Step 4: Competitor Analysis
    await new Promise(resolve => setTimeout(resolve, 4000));
    console.log('Ã¢Å“Â¨ [Growth Workspace] Running Competitor Analysis...');
    steps[3].status = 'running';
    steps[3].startTime = Date.now();
    try {
      const rawResult = await runCompetitorAnalysis(input, results.product, researchData?.competitors || [], evidenceGrowthData, researchData);
      results.competitor = validateCompetitorAnalysis(rawResult, input);
      steps[3].status = 'completed';
      steps[3].endTime = Date.now();
      steps[3].duration = steps[3].endTime - steps[3].startTime;
      steps[3].provider = results.competitor.provider || 'groq';
      steps[3].statusCode = rawResult.statusCode || 200;
      steps[3].failureType = rawResult.success ? null : (rawResult.status || 'UNKNOWN');
      steps[3].responseReceived = !!rawResult.data;
      steps[3].jsonParsed = !!rawResult.data;
      steps[3].schemaValidated = true;
      steps[3].confidenceScore = results.competitor.confidenceScore ?? null;
      console.log('Ã¢Å“â€¦ [Growth Workspace] Competitor Analysis complete & validated:', {
        competitorsCount: results.competitor.directCompetitors?.length || 0,
        gapsCount: results.competitor.marketGaps?.length || 0,
        provider: results.competitor.provider,
        orchestratorCompetitorsUsed: researchData?.competitors?.length || 0,
        duration: steps[3].duration,
        failureType: steps[3].failureType
      });
    } catch (error) {
      steps[3].endTime = Date.now();
      steps[3].duration = steps[3].endTime - steps[3].startTime;
      steps[3].failureType = error.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_FAILED';
      steps[3].statusCode = 0;
      steps[3].responseReceived = false;
      steps[3].jsonParsed = false;
      steps[3].schemaValidated = false;
      console.log('Ã¢Å¡Â Ã¯Â¸Â [Growth Workspace] Competitor Analysis failed:', error.message);
      warnings.push(`Competitor Analysis fallback: ${error.message}`);
      results.competitor = validateCompetitorAnalysis(null, input);
      steps[3].status = 'completed';
      steps[3].provider = 'fallback';
      steps[3].confidenceScore = results.competitor.confidenceScore ?? null;
    }

    // Step 5: Intent Prediction
    await new Promise(resolve => setTimeout(resolve, 4000));
    console.log('Ã¢Å“Â¨ [Growth Workspace] Running Intent Prediction...');
    steps[4].status = 'running';
    steps[4].startTime = Date.now();
    try {
      const rawResult = await runIntentPrediction(input, results.audience, evidenceGrowthData, researchData);
      results.intent = validateIntentPrediction(rawResult, input);
      steps[4].status = 'completed';
      steps[4].endTime = Date.now();
      steps[4].duration = steps[4].endTime - steps[4].startTime;
      steps[4].provider = results.intent.provider || 'groq';
      steps[4].statusCode = rawResult.statusCode || 200;
      steps[4].failureType = rawResult.success ? null : (rawResult.status || 'UNKNOWN');
      steps[4].responseReceived = !!rawResult.data;
      steps[4].jsonParsed = !!rawResult.data;
      steps[4].schemaValidated = true;
      steps[4].confidenceScore = results.intent.confidenceScore ?? null;
      console.log('Ã¢Å“â€¦ [Growth Workspace] Intent Prediction complete & validated:', {
        hotSegmentsCount: results.intent.hotSegments?.length || 0,
        signalsCount: results.intent.buyingSignals?.length || 0,
        provider: results.intent.provider,
        duration: steps[4].duration,
        failureType: steps[4].failureType
      });
    } catch (error) {
      steps[4].endTime = Date.now();
      steps[4].duration = steps[4].endTime - steps[4].startTime;
      steps[4].failureType = error.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_FAILED';
      steps[4].statusCode = 0;
      steps[4].responseReceived = false;
      steps[4].jsonParsed = false;
      steps[4].schemaValidated = false;
      console.log('Ã¢Å¡Â Ã¯Â¸Â [Growth Workspace] Intent Prediction failed:', error.message);
      warnings.push(`Intent Prediction fallback: ${error.message}`);
      results.intent = validateIntentPrediction(null, input);
      steps[4].status = 'completed';
      steps[4].provider = 'fallback';
      steps[4].confidenceScore = results.intent.confidenceScore ?? null;
    }

    // Step 6: Positioning Engine
    await new Promise(resolve => setTimeout(resolve, 4000));
    console.log('Ã¢Å“Â¨ [Growth Workspace] Running Positioning Engine...');
    steps[5].status = 'running';
    steps[5].startTime = Date.now();
    try {
      const rawResult = await runPositioningEngine(input, results.product, results.competitor, evidenceGrowthData, researchData);
      results.positioning = validatePositioningEngine(rawResult, input);
      steps[5].status = 'completed';
      steps[5].endTime = Date.now();
      steps[5].duration = steps[5].endTime - steps[5].startTime;
      steps[5].provider = results.positioning.provider || 'groq';
      steps[5].statusCode = rawResult.statusCode || 200;
      steps[5].failureType = rawResult.success ? null : (rawResult.status || 'UNKNOWN');
      steps[5].responseReceived = !!rawResult.data;
      steps[5].jsonParsed = !!rawResult.data;
      steps[5].schemaValidated = true;
      steps[5].confidenceScore = results.positioning.confidenceScore ?? null;
      console.log('Ã¢Å“â€¦ [Growth Workspace] Positioning Engine complete & validated:', {
        hasStatement: !!results.positioning.positioningStatement,
        pillarsCount: results.positioning.messagingPillars?.length || 0,
        provider: results.positioning.provider,
        duration: steps[5].duration,
        failureType: steps[5].failureType
      });
    } catch (error) {
      steps[5].endTime = Date.now();
      steps[5].duration = steps[5].endTime - steps[5].startTime;
      steps[5].failureType = error.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_FAILED';
      steps[5].statusCode = 0;
      steps[5].responseReceived = false;
      steps[5].jsonParsed = false;
      steps[5].schemaValidated = false;
      console.log('Ã¢Å¡Â Ã¯Â¸Â [Growth Workspace] Positioning Engine failed:', error.message);
      warnings.push(`Positioning Engine fallback: ${error.message}`);
      results.positioning = validatePositioningEngine(null, input);
      steps[5].status = 'completed';
      steps[5].provider = 'fallback';
      steps[5].confidenceScore = results.positioning.confidenceScore ?? null;
    }

    // Step 7: Campaign Generator
    await new Promise(resolve => setTimeout(resolve, 4000));
    console.log('Ã¢Å“Â¨ [Growth Workspace] Running Campaign Generator...');
    steps[6].status = 'running';
    steps[6].startTime = Date.now();
    try {
      const rawResult = await runCampaignGenerator(input, results, evidenceGrowthData, researchData);
      results.campaign = validateCampaignGenerator(rawResult, input);
      steps[6].status = 'completed';
      steps[6].endTime = Date.now();
      steps[6].duration = steps[6].endTime - steps[6].startTime;
      steps[6].provider = results.campaign.provider || 'groq';
      steps[6].statusCode = rawResult.statusCode || 200;
      steps[6].failureType = rawResult.success ? null : (rawResult.status || 'UNKNOWN');
      steps[6].responseReceived = !!rawResult.data;
      steps[6].jsonParsed = !!rawResult.data;
      steps[6].schemaValidated = true;
      steps[6].confidenceScore = results.campaign.confidenceScore ?? null;
      console.log('Ã¢Å“â€¦ [Growth Workspace] Campaign Generator complete & validated:', {
        anglesCount: results.campaign.creativeAngles?.length || 0,
        hooksCount: results.campaign.copyHooks?.length || 0,
        hasActionPlan: !!(results.campaign.actionPlan?.sevenDay?.length || results.campaign.actionPlan?.thirtyDay?.length),
        provider: results.campaign.provider,
        duration: steps[6].duration,
        failureType: steps[6].failureType
      });
    } catch (error) {
      steps[6].endTime = Date.now();
      steps[6].duration = steps[6].endTime - steps[6].startTime;
      steps[6].failureType = error.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_FAILED';
      steps[6].statusCode = 0;
      steps[6].responseReceived = false;
      steps[6].jsonParsed = false;
      steps[6].schemaValidated = false;
      console.log('Ã¢Å¡Â Ã¯Â¸Â [Growth Workspace] Campaign Generator failed:', error.message);
      warnings.push(`Campaign Generator fallback: ${error.message}`);
      results.campaign = validateCampaignGenerator(null, input);
      steps[6].status = 'completed';
      steps[6].provider = 'fallback';
      steps[6].confidenceScore = results.campaign.confidenceScore ?? null;
    }

    // Step 8: Channel Recommendation
    await new Promise(resolve => setTimeout(resolve, 4000));
    console.log('Ã¢Å“Â¨ [Growth Workspace] Running Channel Recommendation...');
    steps[7].status = 'running';
    steps[7].startTime = Date.now();
    try {
      const rawResult = await runChannelRecommendation(input, results.audience, results.campaign, evidenceGrowthData, researchData);
      results.channel = validateChannelRecommendation(rawResult, input);
      steps[7].status = 'completed';
      steps[7].endTime = Date.now();
      steps[7].duration = steps[7].endTime - steps[7].startTime;
      steps[7].provider = results.channel.provider || 'groq';
      steps[7].statusCode = rawResult.statusCode || 200;
      steps[7].failureType = rawResult.success ? null : (rawResult.status || 'UNKNOWN');
      steps[7].responseReceived = !!rawResult.data;
      steps[7].jsonParsed = !!rawResult.data;
      steps[7].schemaValidated = true;
      steps[7].confidenceScore = results.channel.confidenceScore ?? null;
      console.log('Ã¢Å“â€¦ [Growth Workspace] Channel Recommendation complete & validated:', {
        channelsCount: results.channel.recommendedChannels?.length || 0,
        primaryChannel: results.channel.primaryChannel,
        provider: results.channel.provider,
        duration: steps[7].duration,
        failureType: steps[7].failureType
      });
    } catch (error) {
      steps[7].endTime = Date.now();
      steps[7].duration = steps[7].endTime - steps[7].startTime;
      steps[7].failureType = error.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_FAILED';
      steps[7].statusCode = 0;
      steps[7].responseReceived = false;
      steps[7].jsonParsed = false;
      steps[7].schemaValidated = false;
      console.log('Ã¢Å¡Â Ã¯Â¸Â [Growth Workspace] Channel Recommendation failed:', error.message);
      warnings.push(`Channel Recommendation fallback: ${error.message}`);
      results.channel = validateChannelRecommendation(null, input);
      steps[7].status = 'completed';
      steps[7].provider = 'fallback';
      steps[7].confidenceScore = results.channel.confidenceScore ?? null;
    }

    overallStatus = warnings.length > 0 ? 'completed_with_warnings' : 'completed';

    // Apply quality filters to ensure evidence-based data
    results = enforceGrowthQualityFilters(results);

    // Normalize all results
    const normalizedResults = normalizeGrowthResults(results, input);
    console.log('[Growth Workspace] Results normalized');
    console.log('[Growth Normalize] normalizedResults keys', Object.keys(normalizedResults || {}));

    // Label provenance: which modules are evidence-backed vs hypotheses
    const evidenceFlags = {
      product: !!(evidenceGrowthData?.productIntelligence?.features?.length || websiteData?.features?.length),
      market: !!(researchData?.keywords?.length || evidenceGrowthData?.growthSignals?.length || researchData?.newsSignals?.length),
      audience: !!researchData?.audienceSignals?.length,
      competitor: !!researchData?.competitors?.length || !!evidenceGrowthData?.competitors?.length,
      intent: !!researchData?.audienceSignals?.length,
      positioning: !!(evidenceGrowthData?.productIntelligence?.features?.length || researchData?.competitors?.length),
      campaign: !!researchData?.keywords?.length || !!evidenceGrowthData?.growthSignals?.length,
      channel: !!researchData?.audienceSignals?.length,
    };
    labelResultSources(normalizedResults, evidenceFlags);

    // ============================================
    // ENTERPRISE GROWTH SCORING ENGINE (12 components, never null)
    // Every score is evidence-backed; when a component lacks direct evidence
    // it uses conservative heuristic estimates with LOW confidence - never null.
    // ============================================

    // Inject research/technology/pricing/competitor evidence into normalized results
    if (researchData) {
      if (researchData.technologyStack?.length) {
        normalizedResults.product = normalizedResults.product || {};
        normalizedResults.product.technologyStack = researchData.technologyStack;
      }
      if (researchData.pricing?.tiers?.length) {
        normalizedResults.market = normalizedResults.market || {};
        normalizedResults.market.pricing = researchData.pricing;
      }
      if (researchData.competitors?.length && !(normalizedResults.competitor?.directCompetitors || []).length) {
        normalizedResults.competitor = normalizedResults.competitor || {};
        normalizedResults.competitor.directCompetitors = researchData.competitors.map((c) => ({
          name: c.name,
          website: c.website,
          domain: c.domain,
          category: c.category,
          strengths: c.strengths || [],
          weaknesses: c.weaknesses || [],
          pricing: c.pricing,
          trafficEstimate: c.trafficEstimate,
          seoAuthority: c.seoAuthority,
          confidence: c.confidence,
          evidence: c.evidence,
          source: c.source,
        }));
      }
    }

    const productData = normalizedResults.product || {};
    const marketData = normalizedResults.market || {};
    const audienceData = normalizedResults.audience || {};
    const competitorData = normalizedResults.competitor || {};
    const campaignData = normalizedResults.campaign || {};
    const channelData = normalizedResults.channel || {};
    const intentData = normalizedResults.intent || {};
    const positioningData = normalizedResults.positioning || {};

    const socialLinks = evidenceGrowthData?.socialLinks?.length || websiteData?.socialLinks?.length || 0;
    const techStack = researchData?.technologyStack || productData.technologyStack || [];
    const pricing = researchData?.pricing || marketData.pricing || null;
    const pricingTiers = pricing?.tiers || [];
    const hasWebsite = !!websiteData;
    const domain = (input.websiteUrl || '').replace(/^https?:\/\//, '').replace(/^www\./, '');

    const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));

    const scoreFromCounts = (positive, total, maxPerItem, cap = 100) => {
      const score = positive * maxPerItem;
      return { value: clamp(score), count: positive, total: total || positive };
    };

    // 1) Market Opportunity Ã¢â‚¬â€ growthSignals + opportunities + trends + tam presence
    const marketSignals = (marketData.growthSignals || []).filter((s) => s && (s.signal || s.value));
    const opportunities = (marketData.opportunities || []).filter((o) => o && o.value);
    const marketTrends = (marketData.marketTrends || []).filter((t) => t && (t.title || t.value));
    const marketRaw = scoreFromCounts(marketSignals.length * 12 + opportunities.length * 10 + marketTrends.length * 5, marketSignals.length + opportunities.length, 12);
    const marketOpportunityScore = marketRaw.value;

    // 2) Competitive Position Ã¢â‚¬â€ real competitors + gaps + positioning strength
    const realCompetitors = (competitorData.directCompetitors || []).filter(
      (c) => c && c.name && !/competitor|unknown|^\s*$/i.test(c.name) && !c.name.includes(',')
    );
    const marketGaps = (competitorData.marketGaps || []).filter((g) => g && (g.value || g.gap));
    const compPositionRaw = scoreFromCounts(realCompetitors.length * 12 + marketGaps.length * 10, realCompetitors.length, 15);
    const competitivePositionScore = compPositionRaw.value;

    // 3) Audience Clarity Ã¢â‚¬â€ real personas + triggers + best channels
    const realPersonas = (audienceData.buyerPersonas || []).filter(
      (p) => p && p.name && !/persona|unknown|^\s*$/i.test(p.name) && !p.name.includes(',')
    );
    const audienceTriggers = (audienceData.buyingTriggers || []).filter((t) => t && (t.value || t.trigger));
    const audienceRaw = scoreFromCounts(realPersonas.length * 15 + audienceTriggers.length * 8, realPersonas.length, 18);
    const audienceClarityScore = audienceRaw.value;

    // 4) Campaign Readiness Ã¢â‚¬â€ angles + hooks + action plan buckets
    const creativeAngles = (campaignData.creativeAngles || []).filter((a) => a && (a.value || a.title) && !/angle/i.test(a.value || a.title || ''));
    const copyHooks = (campaignData.copyHooks || []).filter((h) => h && (h.value || h.hook));
    const actionBuckets = (campaignData.actionPlan || {});
    const bucketCount = Object.values(actionBuckets).filter((b) => Array.isArray(b) && b.length > 0).length;
    const campaignRaw = scoreFromCounts(creativeAngles.length * 12 + copyHooks.length * 6 + bucketCount * 8, creativeAngles.length, 14);
    const campaignReadinessScore = campaignRaw.value;

    // 5) Brand Authority Ã¢â‚¬â€ social links + tech credibility + site presence + news signals
    let brandAuthorityScore;
    {
      const socialCount = socialLinks;
      const newsCount = researchData?.newsSignals?.length || 0;
      const domainScore = hasWebsite ? 30 : 0;
      const socialScore = Math.min(socialCount * 8, 35);
      const newsScore = Math.min(newsCount * 10, 25);
      brandAuthorityScore = clamp(domainScore + socialScore + newsScore + (techStack.length > 0 ? 10 : 0));
    }

    // 6) Revenue Potential Ã¢â‚¬â€ pricing tiers + market opportunity + business model
    let revenuePotentialScore;
    {
      const tierScore = Math.min(pricingTiers.length * 14, 45);
      const marketFactor = marketOpportunityScore > 0 ? 30 : 15;
      const modelScore = input.businessModel && !/unknown/i.test(input.businessModel) ? 15 : 5;
      revenuePotentialScore = clamp(tierScore + marketFactor + modelScore + (opportunities.length ? 10 : 0));
    }

    // 7) Product Maturity Ã¢â‚¬â€ features + benefits + USP + tech stack depth
    const features = (productData.features || []).filter((f) => f && (f.value || f.feature));
    const benefits = (productData.benefits || []).filter((b) => b && b.value);
    let productMaturityScore;
    {
      const featureScore = Math.min(features.length * 10, 40);
      const benefitScore = Math.min(benefits.length * 8, 25);
      const uspScore = productData.usp && !/unknown/i.test(productData.usp) ? 15 : 5;
      const techScore = Math.min(techStack.length * 3, 15);
      productMaturityScore = clamp(featureScore + benefitScore + uspScore + techScore);
    }

    // 8) GTM Readiness Ã¢â‚¬â€ positioning + campaign + channel + intent
    let goToMarketReadinessScore;
    {
      const positioningScore = positioningData.positioningStatement && !/unknown/i.test(positioningData.positioningStatement) ? 30 : 10;
      const campaignFactor = campaignReadinessScore > 0 ? 30 : 15;
      const channelFactor = (channelData.recommendedChannels || []).length ? 25 : 10;
      const intentFactor = (intentData.hotSegments || []).length ? 15 : 5;
      goToMarketReadinessScore = clamp(positioningScore + campaignFactor + channelFactor + intentFactor);
    }

    // 9) Channel Readiness Ã¢â‚¬â€ real recommended channels + primary channel
    const realChannels = (channelData.recommendedChannels || []).filter(
      (c) => c && (c.channel || c.name) && !/channel|unknown/i.test(c.channel || c.name || '')
    );
    let channelReadinessScore;
    {
      const channelCountScore = Math.min(realChannels.length * 16, 70);
      const primaryScore = channelData.primaryChannel && !/unknown/i.test(channelData.primaryChannel) ? 20 : 10;
      const budgetScore = input.budget && !/unknown/i.test(input.budget) ? 10 : 5;
      channelReadinessScore = clamp(channelCountScore + primaryScore + budgetScore);
    }

    // 10) Pricing Competitiveness Ã¢â‚¬â€ tier count + price points found + free tier
    let pricingCompetitivenessScore;
    {
      const hasFree = pricingTiers.some((t) => /free/i.test(t.name));
      const tierScore = Math.min(pricingTiers.length * 15, 50);
      const freeScore = hasFree ? 20 : 10;
      const evidenceScore = pricingTiers.length > 0 ? 20 : 5;
      const competitorPricing = realCompetitors.filter((c) => c.pricing).length;
      const competitorScore = Math.min(competitorPricing * 6, 15);
      pricingCompetitivenessScore = clamp(tierScore + freeScore + evidenceScore + competitorScore);
    }

    // 11) Virality Ã¢â‚¬â€ social links + campaign hooks + shareable positioning
    let viralityScore;
    {
      const socialScore = Math.min(socialLinks * 12, 40);
      const hookScore = Math.min(copyHooks.length * 12, 35);
      const angleScore = Math.min(creativeAngles.length * 6, 15);
      viralityScore = clamp(socialScore + hookScore + angleScore + (hasWebsite ? 10 : 0));
    }

    // 12) Confidence Score Ã¢â‚¬â€ how many components had direct evidence vs estimates
    const evidenceComponents = [
      marketSignals.length || opportunities.length,
      realCompetitors.length,
      realPersonas.length,
      creativeAngles.length || copyHooks.length,
      realChannels.length,
      pricingTiers.length,
      features.length,
      techStack.length,
      socialLinks,
    ].filter((v) => v > 0).length;
    const confidenceScore = clamp(25 + evidenceComponents * 8);

    const overallGrowthScore = clamp(
      (marketOpportunityScore +
        competitivePositionScore +
        audienceClarityScore +
        campaignReadinessScore +
        brandAuthorityScore +
        revenuePotentialScore +
        productMaturityScore +
        goToMarketReadinessScore +
        channelReadinessScore +
        pricingCompetitivenessScore +
        viralityScore) / 11
    );

    const growthScoreStatus = confidenceScore >= 60 ? null : NOT_ENOUGH_EVIDENCE;

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

    console.log('[Growth Scores]', {
      overallGrowthScore,
      marketOpportunityScore,
      competitivePositionScore,
      audienceClarityScore,
      campaignReadinessScore,
      brandAuthorityScore,
      revenuePotentialScore,
      productMaturityScore,
      goToMarketReadinessScore,
      channelReadinessScore,
      pricingCompetitivenessScore,
      viralityScore,
      confidenceScore
    });

    // Dimension-level provenance: every score is labeled with its evidence
    // source so consumers can see estimates vs verified measurements.
    const scoreDimensions = [
      { dimension: 'Market Opportunity', raw: marketOpportunityScore, evidenceSource: evidenceFlags.market ? EVIDENCE_BASED : HYPOTHESIS, penalty: evidenceFlags.market ? 0 : 8 },
      { dimension: 'Competitive Position', raw: competitivePositionScore, evidenceSource: evidenceFlags.competitor ? EVIDENCE_BASED : HYPOTHESIS, penalty: evidenceFlags.competitor ? 0 : 8 },
      { dimension: 'Audience Clarity', raw: audienceClarityScore, evidenceSource: evidenceFlags.audience ? EVIDENCE_BASED : HYPOTHESIS, penalty: evidenceFlags.audience ? 0 : 8 },
      { dimension: 'Campaign Readiness', raw: campaignReadinessScore, evidenceSource: evidenceFlags.campaign ? EVIDENCE_BASED : HYPOTHESIS, penalty: evidenceFlags.campaign ? 0 : 6 },
      { dimension: 'Brand Authority', raw: brandAuthorityScore, evidenceSource: (hasWebsite || evidenceFlags.market) ? EVIDENCE_BASED : HYPOTHESIS, penalty: 0 },
      { dimension: 'Revenue Potential', raw: revenuePotentialScore, evidenceSource: evidenceFlags.market ? EVIDENCE_BASED : HYPOTHESIS, penalty: 0 },
      { dimension: 'Product Maturity', raw: productMaturityScore, evidenceSource: evidenceFlags.product ? EVIDENCE_BASED : HYPOTHESIS, penalty: evidenceFlags.product ? 0 : 6 },
      { dimension: 'Go-To-Market Readiness', raw: goToMarketReadinessScore, evidenceSource: evidenceFlags.campaign ? EVIDENCE_BASED : HYPOTHESIS, penalty: 0 },
      { dimension: 'Channel Readiness', raw: channelReadinessScore, evidenceSource: evidenceFlags.channel ? EVIDENCE_BASED : HYPOTHESIS, penalty: evidenceFlags.channel ? 0 : 6 },
      { dimension: 'Pricing Competitiveness', raw: pricingCompetitivenessScore, evidenceSource: pricingTiers.length > 0 ? EVIDENCE_BASED : HYPOTHESIS, penalty: 0 },
      { dimension: 'Virality', raw: viralityScore, evidenceSource: HYPOTHESIS, penalty: 0 },
      { dimension: 'Confidence', raw: confidenceScore, evidenceSource: HYPOTHESIS, penalty: 0 },
    ];
    const dimensionScores = scoreDimensions.map((d) => {
      const sub = calculateSubScore(d.evidenceSource, d.raw, d.penalty);
      return { dimension: d.dimension, score: sub.value, evidenceSource: sub.evidenceSource, penalty: sub.penalty };
    });
    const evidenceBasedCount = dimensionScores.filter((d) => d.evidenceSource === EVIDENCE_BASED).length;
    const hypothesisCount = dimensionScores.filter((d) => d.evidenceSource === HYPOTHESIS).length;

    // Generate growth summary with calculated scores and recommendations
    const growthSummary = {
      overallGrowthScore,
      marketOpportunityScore,
      competitivePositionScore,
      audienceClarityScore,
      campaignReadinessScore,
      brandAuthorityScore,
      revenuePotentialScore,
      productMaturityScore,
      goToMarketReadinessScore,
      channelReadinessScore,
      pricingCompetitivenessScore,
      viralityScore,
      confidenceScore,
      dimensionScores,
      evidenceBasedCount,
      hypothesisCount,
      campaignViabilityScore: campaignReadinessScore,
      dataConfidenceScore: confidenceScore,
      productFitScore: productMaturityScore,
      marketSizeScore: marketOpportunityScore,
      competitiveDefensibilityScore: competitivePositionScore,
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
    const companyName = input.companyName || input.productName || '';
    const formattedCompanyName = companyName.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
    
    let growthExecutiveStory;
    try {
      if (synthesizedIntel) {
        growthExecutiveStory = generateExecutiveStory(synthesizedIntel, {
          growthSummary,
          evidenceGrowthData,
          researchData,
          websiteUrl: input.websiteUrl || '',
          productName: input.productName || ''
        });
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
            weaknesses: [{ value: 'Business intelligence layer unavailable - data may be incomplete', confidence: 0, impact: 'High' }],
            opportunities: [{ value: 'Run full analysis with website URL for complete intelligence', confidence: 0, impact: 'High' }],
            threats: [{ value: 'Insufficient evidence to determine threats', confidence: 0, impact: 'Low' }]
          },
          keyFindings: [{ finding: 'Limited data available without website scraping and intelligence collection.', confidence: 0, evidence: 'Analysis mode', impact: 'High' }],
          topPriorities: [{ priority: 1, action: 'Re-run analysis with website URL and complete product details', rationale: 'Full intelligence requires website data', roi: 'Complete enterprise intelligence', timeline: 'Immediate', owner: 'User', kpi: 'Complete intelligence report', evidence: 'Current analysis ran without business intelligence layer', confidence: 0 }],
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
    console.log('Ã°Å¸â€™Â¾ [Growth Workspace] Saving core intelligence to database...');
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
            evidence: normalizedResults.evidence || null,
            metadata: {
              growthSummary,
              steps: steps.map(({ status, provider, failureType, responseReceived, jsonParsed, confidenceScore }) => ({
                status, provider, failureType: failureType || null,
                responseReceived, jsonParsed, confidenceScore: confidenceScore ?? null,
              })),
              warnings,
              overallStatus,
              usedFallback: steps.some(s => s.provider === 'fallback'),
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
            evidence: normalizedResults.evidence || null,
            metadata: {
              growthSummary,
              steps: steps.map(({ status, provider, failureType, responseReceived, jsonParsed, confidenceScore }) => ({
                status, provider, failureType: failureType || null,
                responseReceived, jsonParsed, confidenceScore: confidenceScore ?? null,
              })),
              warnings,
              overallStatus,
              usedFallback: steps.some(s => s.provider === 'fallback'),
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

    // Preserve evidence snapshot after successful analysis
    try {
      if (input.websiteUrl && (researchData || websiteData)) {
        console.log('Ã°Å¸â€™Â¾ [Growth Workspace] Preserving evidence snapshot after analysis...');
        
        // Build evidence from research data if available
        const preservedEvidence = {
          website: researchData?.websiteContent || websiteData || null,
          openGraph: researchData?.websiteContent?.openGraph || websiteData?.openGraph || null,
          schemas: researchData?.websiteContent?.schemas || websiteData?.schemas || null,
          technology: researchData?.technologyStack || [],
          keywords: researchData?.keywords || [],
          robots: researchData?.technical?.robots || null,
          sitemap: researchData?.technical?.sitemap || null,
          pageSpeed: researchData?.technical?.pageSpeed || null,
          github: researchData?.github || null,
        };

        const sourcesCollected = [];
        if (preservedEvidence.website) sourcesCollected.push('website');
        if (preservedEvidence.technology && preservedEvidence.technology.length > 0) sourcesCollected.push('technology');
        if (preservedEvidence.robots) sourcesCollected.push('robots');
        if (preservedEvidence.sitemap) sourcesCollected.push('sitemap');
        if (preservedEvidence.pageSpeed) sourcesCollected.push('pageSpeed');
        if (preservedEvidence.github && preservedEvidence.github.repos) sourcesCollected.push('github');

        const savedSnapshot = await saveEvidenceSnapshot({
          chatId: validChatId,
          userId,
          analysisId: null,
          websiteUrl: input.websiteUrl,
          companyName: input.companyName || '',
          evidence: preservedEvidence,
          sourcesCollected
        });

        if (savedSnapshot) {
          console.log('Ã¢Å“â€¦ [Growth Workspace] Evidence snapshot preserved:', {
            snapshotId: savedSnapshot.id,
            sourcesCollected: sourcesCollected.length,
            sources: sourcesCollected
          });
        }
      }
    } catch (evidenceError) {
      console.error('Ã¢Å¡Â Ã¯Â¸Â [Growth Workspace] Evidence preservation failed (non-fatal):', evidenceError.message);
      warnings.push({ code: 'EVIDENCE_PRESERVATION_FAILED', message: 'Analysis completed successfully, but evidence snapshot could not be preserved.' });
    }

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

    console.log('Ã°Å¸â€™Â¾ [Growth Workspace] Core intelligence saved to database');
    console.log(`Ã¢Å“â€¦ [Growth Workspace] hasActionPlan: ${!!normalizedResults.campaign.actionPlan}`);

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
        content: overallGrowthScore != null
          ? `Full growth analysis completed for ${input.productName}. Growth Score: ${overallGrowthScore}/100`
          : `Full growth analysis completed for ${input.productName}.`,
        analysisData: { summary: { overallGrowthScore, stepsCompleted: 8 } }
      }
    });

    // Add BI warnings to the overall warnings
    if (biWarnings && biWarnings.length > 0) {
      warnings.push(...biWarnings.map(w => `[Business Intelligence] ${w}`));
    }

    const actionPlanBuckets = Object.values(campaignData.actionPlan || {}).find(b => Array.isArray(b) && b.length > 0) || [];
    const summary = {
      overallGrowthScore,
      marketOpportunityScore,
      competitivePositionScore,
      audienceClarityScore,
      campaignReadinessScore,
      brandAuthorityScore,
      revenuePotentialScore,
      productMaturityScore,
      goToMarketReadinessScore,
      channelReadinessScore,
      pricingCompetitivenessScore,
      viralityScore,
      confidenceScore,
      growthScoreStatus,
      topRecommendation: growthSummary.topRecommendation || null,
      primaryRisk: growthSummary.primaryRisk || null,
      immediateAction: growthSummary.immediateAction || null,
      bestChannel: normalizedResults.channel?.primaryChannel || normalizedResults.channel?.recommendedChannels?.[0]?.channel || normalizedResults.channel?.recommendedChannels?.[0]?.name || null,
      topOpportunity: firstStringValue(marketData.opportunities) || firstStringValue(marketData.growthOpportunities) || null,
      topRisk: firstStringValue(marketData.risks) || firstStringValue(marketData.marketRisks) || null,
      nextAction: firstStringValue(campaignData.nextActions) || firstStringValue(actionPlanBuckets) || firstStringValue(campaignData.creativeAngles) || firstStringValue(campaignData.campaignIdeas) || null,
      completedSteps: steps.filter(s => s.status === 'completed').length,
      progress: Math.round((steps.filter(s => s.status === 'completed').length / steps.length) * 100)
    };

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
      summary
    };

  } catch (error) {
    console.error('Ã¢ÂÅ’ [Growth Workspace] Error:', error);
    
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

  const aiResult = await callBestAI(prompt, 1200, 'Product Analysis', null);

  if (aiResult.provider === 'fallback') {
    return {
      ...generateProductFallback(input, websiteData, evidenceGrowthData),
      provider: 'fallback',
      confidenceScore: null
    };
  }
  
  return {
    ...aiResult,
    provider: aiResult.provider || 'fallback',
    confidenceScore: aiResult.confidenceScore ?? null
  };
}

async function runMarketDiscovery(input, productData, evidenceGrowthData, researchData) {
  const marketSizingEvidence = buildMarketSizingEvidence(researchData);
  const evidenceBlocks = [];
  if (marketSizingEvidence) evidenceBlocks.push(marketSizingEvidence);
  if (evidenceGrowthData?.growthSignals?.length) {
    evidenceBlocks.push(`\n[EVIDENCE - website growth signals] ${evidenceGrowthData.growthSignals.map((s) => s.signal).join(' | ')}`);
  }
  if (researchData?.newsSignals?.length) {
    evidenceBlocks.push(`\n[EVIDENCE - news signals] ${researchData.newsSignals.slice(0, 5).map((n) => n.title || n.headline).filter(Boolean).join(' | ')}`);
  }
  const evidenceSection = evidenceBlocks.join('\n');

  const prompt = `Analyze the market for this product:

Product: ${input.productName}
Industry: ${input.industry}
Target Country: ${input.targetCountry}
Business Stage: ${input.businessStage}

Context: ${productData.productSummary}
${evidenceSection}

IMPORTANT: Use the VERIFIED evidence above as the primary source for market signals and, where present, market sizing. Do NOT invent market size numbers (TAM/SAM/SOM). If you have no verified market-sizing evidence, use "Growth Signals" instead.

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

CRITICAL INSTRUCTION: Do NOT fabricate market sizing numbers. Use growthSignals instead of TAM/SAM/SOM unless the verified keyword-volume evidence supports a labeled estimate. Return only valid JSON.`;

  const aiResult = await callBestAI(prompt, 1200, 'Market Discovery', null);

  if (aiResult.provider === 'fallback') {
    return {
      ...generateMarketFallback(input, productData, researchData),
      provider: 'fallback',
      confidenceScore: null
    };
  }
  
  return {
    ...aiResult,
    provider: aiResult.provider || 'fallback',
    confidenceScore: aiResult.confidenceScore ?? null
  };
}

async function runAudienceIntelligence(input, productData, evidenceGrowthData, researchData) {
  let evidenceContextStr = '';
  if (researchData?.audienceSignals?.length) {
    const signals = researchData.audienceSignals[0] || {};
    const personas = signals.personas || [];
    const triggers = signals.buyingTriggers || signals.triggers || [];
    const personaNames = personas.map((p) => p.name || p.title).filter(Boolean).join(', ');
    const triggerValues = triggers.map((t) => t.value || t.trigger).filter(Boolean).join(', ');
    evidenceContextStr = `\n\n[VERIFIED AUDIENCE EVIDENCE - from Business Intelligence]
Verified ICPs: ${personaNames || 'None collected'}
Buying triggers: ${triggerValues || 'None collected'}`;
  }

  const prompt = `Analyze the target audience for this product:

Product: ${input.productName}
Industry: ${input.industry}
USP: ${normalizeTextList(productData.usp)}${evidenceContextStr}

Audience hints (from the user's form Ã¢â‚¬â€ treat ONLY as starting hints, NEVER echo them as persona names):
${normalizeTextList(input.targetAudience)}

Provide JSON response:
{
  "buyerPersonas": [
    {
      "name": "Role-based persona name INVENTED by you (e.g. 'Growth Marketer', 'Ops Lead') Ã¢â‚¬â€ never a comma-separated list",
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

CRITICAL INSTRUCTION: NEVER use generic text. NEVER use the audience hints list verbatim as a persona name. Personas must deeply reflect the real problems ${input.productName} solves. Return only valid JSON.`;

  const aiResult = await callBestAI(prompt, 1200, 'Audience Intelligence', null);

  if (aiResult.provider === 'fallback') {
    return {
      ...generateAudienceFallback(input, productData, evidenceGrowthData, researchData),
      provider: 'fallback',
      confidenceScore: null
    };
  }
  
  return {
    ...aiResult,
    provider: aiResult.provider || 'fallback',
    confidenceScore: aiResult.confidenceScore ?? null
  };
}

async function runCompetitorAnalysis(input, productData, orchestratorCompetitors = [], evidenceGrowthData, researchData) {
  const competitors = input.competitors || '';

  const evidenceCompetitors = [];
  if (evidenceGrowthData?.competitors?.length) {
    evidenceGrowthData.competitors.forEach((c) => {
      if (c && c.name) evidenceCompetitors.push(c.name);
    });
  }
  if (researchData?.competitorSignals?.length) {
    const cs = researchData.competitorSignals[0] || {};
    (cs.direct || []).forEach((c) => {
      if (c && c.name) evidenceCompetitors.push(c.name);
    });
  }

  // Verified competitors: orchestrator list first, then BI/evidence names
  const verifiedCompetitors = [
    ...orchestratorCompetitors.map(c => `${c.name} (${c.domain})`),
    ...evidenceCompetitors.filter((name) => !orchestratorCompetitors.some((c) => c.name === name))
  ].join(', ');

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

CRITICAL INSTRUCTION: NEVER use generic placeholders like "Competitor 1". Use the Known Competitors list when provided. ONLY infer competitor names when you are highly confident they are real players in the ${input.industry || 'unknown'} space; if unsure, return an empty "directCompetitors" array rather than inventing names. Never list companies unrelated to the product's actual use case. Return only valid JSON.`;

  const aiResult = await callBestAI(prompt, 1200, 'Competitor Analysis', null);

  if (aiResult.provider === 'fallback') {
    return {
      ...generateCompetitorFallback(input, productData, orchestratorCompetitors),
      provider: 'fallback',
      confidenceScore: null,
      orchestratorCompetitorsUsed: orchestratorCompetitors.length
    };
  }
  
  return {
    ...aiResult,
    provider: aiResult.provider || 'fallback',
    confidenceScore: aiResult.confidenceScore ?? null,
    orchestratorCompetitorsUsed: orchestratorCompetitors.length
  };
}

async function runIntentPrediction(input, audienceData, evidenceGrowthData, researchData) {
  let evidenceContextStr = '';
  const signals = evidenceGrowthData?.growthSignals || [];
  if (signals.length) {
    evidenceContextStr += `\n\n[EVIDENCE - website growth signals]\n${signals.slice(0, 5).map((s) => s.signal).join(' | ')}`;
  }
  if (researchData?.newsSignals?.length) {
    evidenceContextStr += `\n[EVIDENCE - recent market news]\n${researchData.newsSignals.slice(0, 3).map((n) => n.title || n.headline).filter(Boolean).join(' | ')}`;
  }

  const prompt = `Predict buyer intent and readiness for this product:

Product: ${input.productName}
Target Audience: ${input.targetAudience}
Campaign Goal: ${input.campaignGoal}

Audience Insights: ${JSON.stringify(audienceData.buyingTriggers)}${evidenceContextStr}

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

  const aiResult = await callBestAI(prompt, 1000, 'Intent Prediction', null);

  if (aiResult.provider === 'fallback') {
    return {
      ...generateIntentFallback(input, audienceData, researchData),
      provider: 'fallback',
      confidenceScore: null
    };
  }
  
  return {
    ...aiResult,
    provider: aiResult.provider || 'fallback',
    confidenceScore: aiResult.confidenceScore ?? null
  };
}

async function runPositioningEngine(input, productData, competitorData, evidenceGrowthData, researchData) {
  let evidenceContextStr = '';
  const pi = evidenceGrowthData?.productIntelligence || {};
  if (pi.features?.length) {
    evidenceContextStr += `\n\n[EVIDENCE - verified features]\n${pi.features.map((f) => f.value).join(', ')}`;
  }
  if (pi.ctaTexts?.length) {
    evidenceContextStr += `\n[EVIDENCE - existing CTAs]\n${pi.ctaTexts.join(', ')}`;
  }
  if (evidenceGrowthData?.competitors?.length) {
    evidenceContextStr += `\n[EVIDENCE - verified competitors]\n${evidenceGrowthData.competitors.map((c) => c.name).join(', ')}`;
  }

  const prompt = `Create positioning strategy for this product:

Product: ${input.productName}
USP: ${normalizeTextList(productData.usp)}
Market Gaps: ${normalizeTextList(competitorData.marketGaps)}
${evidenceContextStr}

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

  const aiResult = await callBestAI(prompt, 1000, 'Positioning Engine', null);

  if (aiResult.provider === 'fallback') {
    return {
      ...generatePositioningFallback(input, productData, competitorData, evidenceGrowthData),
      provider: 'fallback',
      confidenceScore: null
    };
  }
  
  return {
    ...aiResult,
    provider: aiResult.provider || 'fallback',
    confidenceScore: aiResult.confidenceScore ?? null
  };
}

async function runCampaignGenerator(input, allResults, evidenceGrowthData, researchData) {
  const duration = input.duration || '7 days';

  let evidenceContextStr = '';
  const signals = evidenceGrowthData?.growthSignals || [];
  if (signals.length) {
    evidenceContextStr += `\n\n[EVIDENCE - growth signals]\n${signals.slice(0, 5).map((s) => s.signal).join(' | ')}`;
  }
  if (allResults?.audience?.bestChannels?.length) {
    evidenceContextStr += `\n[EVIDENCE - audience channel preferences]\n${allResults.audience.bestChannels.map((c) => c.value || c.channel || c).filter(Boolean).join(', ')}`;
  }
  if (researchData?.newsSignals?.length) {
    evidenceContextStr += `\n[EVIDENCE - recent market news]\n${researchData.newsSignals.slice(0, 3).map((n) => n.title || n.headline).filter(Boolean).join(' | ')}`;
  }
  
  const prompt = `Generate a ${duration} marketing campaign:

Product: ${input.productName}
Campaign Goal: ${input.campaignGoal}
Target: ${input.targetAudience}
Preferred Channel: ${input.preferredChannels}
Tone: ${input.tone}
Budget: ${input.budgetRange}

  Positioning: ${allResults.positioning?.valueProposition || allResults.positioning?.brandPromise || ''}${evidenceContextStr}

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

  const aiResult = await callBestAI(prompt, 1200, 'Campaign Generator', null);

  if (aiResult.provider === 'fallback') {
    return {
      ...generateCampaignFallback(input, allResults, allResults?.campaign, evidenceGrowthData),
      provider: 'fallback',
      confidenceScore: null
    };
  }
  
  return {
    ...aiResult,
    provider: aiResult.provider || 'fallback',
    confidenceScore: aiResult.confidenceScore ?? null
  };
}

async function runChannelRecommendation(input, audienceData, campaignData, evidenceGrowthData, researchData) {
  let evidenceContextStr = '';
  if (researchData?.audienceSignals?.length) {
    const personas = researchData.audienceSignals[0]?.personas || [];
    const channels = [];
    personas.forEach((p) => {
      (p.channels || []).forEach((c) => {
        if (c) channels.push(typeof c === 'string' ? c : c.name || c.channel);
      });
    });
    if (channels.length) {
      evidenceContextStr = `\n\n[EVIDENCE - channels used by verified ICPs]\n${[...new Set(channels)].join(', ')}`;
    }
  }

  const prompt = `Recommend marketing channels:

Product: ${input.productName}
Target Audience: ${input.targetAudience}
  Preferred: ${input.preferredChannel}
Budget info: ${input.budgetRange}
Campaign Goal: ${input.campaignGoal}

Best Channels from Audience Analysis: ${(audienceData.bestChannels || []).map(c => c?.value || c).join(', ')}
${evidenceContextStr}

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

  const aiResult = await callBestAI(prompt, 1000, 'Channel Recommendation', null);

  if (aiResult.provider === 'fallback') {
    return {
      ...generateChannelFallback(input, audienceData, campaignData, evidenceGrowthData),
      provider: 'fallback',
      confidenceScore: null
    };
  }
  
  return {
    ...aiResult,
    provider: aiResult.provider || 'fallback',
    confidenceScore: aiResult.confidenceScore ?? null
  };
}





async function callBestAI(prompt, maxTokens = 2000, moduleName = 'unknown') {
  const start = Date.now();
  console.log(`[AI][${moduleName}] Calling AI...`);
  const result = await callAI(prompt, maxTokens);
  const durationMs = Date.now() - start;
  if (result.success && result.data) {
    console.log(`[AI][${moduleName}] ${result.provider} succeeded in ${durationMs}ms`);
    return { ...result.data, provider: result.provider };
  }
  const diag = result.diagnostics || [];
  console.log(`[AI][${moduleName}] All ${diag.length} provider(s) failed in ${durationMs}ms:`, JSON.stringify(diag));
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
    console.log('Ã°Å¸â€â€ž [Growth Workspace] Loaded results normalized');

    // Restore provenance labels from persisted data
    labelResultSources(results, {
      product: !!(results.product?.features?.length || results.product?.keyFeatures?.length),
      market: !!(results.market?.growthSignals?.length || results.market?.marketTrends?.length),
      audience: !!results.audience?.buyerPersonas?.length,
      competitor: !!results.competitor?.directCompetitors?.length,
      intent: !!results.intent?.hotSegments?.length,
      positioning: !!results.positioning?.positioningStatement,
      campaign: !!(results.campaign?.creativeAngles?.length || results.campaign?.copyHooks?.length),
      channel: !!results.channel?.recommendedChannels?.length
    });

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

    // Compute component scores from persisted results (defensive: may be null)
    const computeScore = (val) => (val !== null && val !== undefined && Number.isFinite(Number(val))) ? Math.round(Number(val)) : null;
    const productFitScore = computeScore(results.product?.score || (results.product?.features?.length ? Math.min(100, results.product.features.length * 20) : null));
    const marketOpportunityScore = computeScore(results.market?.score || (results.market?.growthSignals?.length ? Math.min(100, results.market.growthSignals.length * 15) : null));
    const audienceClarityScore = computeScore(results.audience?.score || (() => { const rp = (results.audience?.buyerPersonas || []).filter(p => p.name && p.name !== 'Target Persona' && p.name !== 'Persona Name'); return rp.length ? Math.min(100, rp.length * 20 + (results.audience?.buyingTriggers?.length || 0) * 10) : null; })());
    const competitiveDefensibilityScore = computeScore(results.competitor?.score || (() => { const rc = (results.competitor?.directCompetitors || []).filter(c => c.name && !c.name.includes('Competitor')); return rc.length ? Math.min(100, rc.length * 15 + (results.competitor?.marketGaps?.length || 0) * 10) : null; })());
    const campaignReadinessScore = computeScore(results.campaign?.score || (() => { const angles = (results.campaign?.creativeAngles || []).filter(a => a.value && !a.value.includes('Angle')); const channels = (results.channel?.recommendedChannels || []).filter(c => c.channel && !c.channel.includes('Channel')); return (angles.length || channels.length) ? Math.min(100, angles.length * 15 + channels.length * 15) : null; })());

    const componentScores = [productFitScore, marketOpportunityScore, audienceClarityScore, competitiveDefensibilityScore, campaignReadinessScore].filter(s => s !== null && s !== undefined);
    const measurableComponents = componentScores.length;
    const overallGrowthScore = measurableComponents >= 2 ? Math.round(componentScores.reduce((a, b) => a + b, 0) / measurableComponents) : null;

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
        productFitScore,
        marketOpportunityScore,
        audienceClarityScore,
        competitiveDefensibilityScore,
        campaignReadinessScore,
        bestChannel: results.channel?.primaryChannel || results.channel?.recommendedChannels?.[0]?.channel || results.channel?.recommendedChannels?.[0]?.name || null,
        topOpportunity: firstStringValue(results.market?.opportunities) || firstStringValue(results.market?.growthOpportunities) || null,
        topRisk: firstStringValue(results.market?.risks) || firstStringValue(results.market?.marketRisks) || null,
        nextAction: firstStringValue(results.campaign?.nextActions) || firstStringValue(Object.values(results.campaign?.actionPlan || {}).find(b => Array.isArray(b) && b.length > 0)) || firstStringValue(results.campaign?.creativeAngles) || firstStringValue(results.campaign?.campaignIdeas) || null,
        completedSteps,
        progress: Math.round((completedSteps / 8) * 100)
      }
    };

  } catch (error) {
    console.error('Ã¢ÂÅ’ [Growth Workspace] Error fetching results:', error);
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
    // Only strip fabricated market sizing (placeholders), never real values
    const UNAVAILABLE = ['Unknown', 'Insufficient Data', 'insufficient data', 'N/A', 'unknown'];
    ['tam', 'sam', 'som', 'cagr'].forEach(key => {
      if (market[key] == null || UNAVAILABLE.includes(String(market[key]))) {
        delete market[key];
      }
    });
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
      // Reject personas that echo the raw comma-joined form inputs with no substance
      const hasSubstance = (p.goals && p.goals.length > 0) || (p.painPoints && p.painPoints.length > 0) || (p.demographics && p.demographics.length > 10);
      if (!hasSubstance) return false;
      if (name.includes(',') && !hasSubstance) return false;
      return true;
    });
    // Sanitize persona goals: remove fabricated numeric targets, add inferenceStatus
    audience.buyerPersonas.forEach(p => {
      if (p.goals && Array.isArray(p.goals)) {
        p.goals = p.goals.map(g => {
          if (typeof g === 'string') {
            // Detect fabricated numeric targets (percentages, counts)
            const hasNumericTarget = /\b\d+%|\bincrease\s+\w+\s+by\s+\d+|\bacquire\s+[\d,]+\s+|Improve\s+\w+\s+by\s+\d+/i.test(g);
            if (hasNumericTarget) {
              // Remove the numeric portion but keep the qualitative direction
              const cleaned = g.replace(/\s+by\s+\d+%?/i, '').replace(/\b\d+%/, '').trim();
              return {
                goal: cleaned || g,
                timeframe: null,
                numericTarget: null,
                evidence: null,
                inferenceStatus: 'AI_INFERRED'
              };
            }
            return {
              goal: g,
              timeframe: null,
              numericTarget: null,
              evidence: null,
              inferenceStatus: 'AI_INFERRED'
            };
          }
          if (typeof g === 'object') {
            if (g.numericTarget || g.timeframe) {
              return {
                goal: g.goal || '',
                timeframe: null,
                numericTarget: null,
                evidence: g.evidence || null,
                inferenceStatus: 'AI_INFERRED'
              };
            }
            return {
              goal: g.goal || '',
              timeframe: g.timeframe || null,
              numericTarget: null,
              evidence: g.evidence || null,
              inferenceStatus: g.inferenceStatus || 'AI_INFERRED'
            };
          }
          return g;
        });
      }
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

  // Phase 7 (RELAXED): Only remove clearly hallucinated roadmap actions; keep
  // legitimate marketing actions (pricing optimization, partnerships, etc.)
  const GENERIC_ACTIONS = [
    'commission market sizing report',
    'build predictive market intelligence models',
    'build predictive intelligence',
    'develop predictive models',
    'create market sizing',
  ];
  if (results.campaign?.actionPlan) {
    Object.keys(results.campaign.actionPlan).forEach(key => {
      const items = results.campaign.actionPlan[key];
      if (Array.isArray(items)) {
        results.campaign.actionPlan[key] = items.filter(item => {
          const text = (item.action || item.title || item.task || item.recommendation || '').toLowerCase().trim();
          return !GENERIC_ACTIONS.some(g => text.includes(g));
        });
      }
    });
    // Remove empty buckets
    Object.keys(results.campaign.actionPlan).forEach(key => {
      if (Array.isArray(results.campaign.actionPlan[key]) && results.campaign.actionPlan[key].length === 0) {
        delete results.campaign.actionPlan[key];
      }
    });
  }

  return results;
}

// ============================================
// RESULT NORMALIZATION
// ============================================

function normalizeGrowthResults(results, input) {
  console.log('Ã°Å¸â€â€ž [Normalize] Normalizing growth results');
  
  const normalized = {};
  
  // Normalize Product Analysis
  if (results.product || results.productAnalysis) {
    const data = results.product || results.productAnalysis;
    normalized.product = {
      productSummary: ensureString(data.summary || data.productSummary, 'Insufficient Data'),
      usp: ensureString(data.usp || data.valuePropositions?.[0]?.value, null),
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
  
  // Normalize Market Discovery (TAM/SAM/SOM kept only when real data exists)
  if (results.market || results.marketDiscovery) {
    const data = results.market || results.marketDiscovery;
    normalized.market = {
      marketTrends: ensureArray(data.marketTrends),
      opportunities: ensureArray(data.opportunities || data.growthOpportunities),
      risks: ensureArray(data.risks || data.marketRisks),
      growthSignals: ensureArray(data.growthSignals),
      entryStrategy: ensureString(data.entryStrategy, null),
      demandScore: data.demandScore ?? data.demand ?? null,
      tam: data.tam || null,
      sam: data.sam || null,
      som: data.som || null,
      cagr: data.cagr || null,
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
      positioningStatement: ensureString(data.positioningStatement, null),
      valueProposition: ensureString(data.valueProposition, null),
      brandPromise: ensureString(data.brandPromise, null),
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
        const channelName = ch.name || ch.channel || ch.value || null;
        return {
          name: channelName,
          channel: channelName,
          fit: ch.fit || ch.reason || '',
          reason: ch.reason || ch.fit || '',
          budgetAllocation: ch.budgetAllocation || ch.budgetSplit || null,
          budgetSplit: ch.budgetSplit || ch.budgetAllocation || null,
          postingFrequency: ch.postingFrequency || null,
          bestPostingTime: ch.bestPostingTime || null,
          contentTypes: ensureArray(ch.contentTypes),
          expectedReach: ch.expectedReach || null,
          difficultyScore: ch.difficultyScore || ch.difficulty || 3
        };
      }
      return ch;
    }).filter(ch => {
      if (typeof ch === 'string') return !!ch.trim();
      return !!(ch && (ch.name || ch.channel));
    });
    
    normalized.channel = {
      recommendedChannels: normalizedChannels,
      primaryChannel: ensureString(data.primaryChannel || normalizedChannels[0]?.name || normalizedChannels[0]?.channel, null),
      channelStrategy: ensureString(data.channelStrategy, null),
      budgetRecommendation: ensureString(data.budgetRecommendation, null),
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
