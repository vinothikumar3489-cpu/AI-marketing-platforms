import prisma from "../../config/prisma.js";
import fetch from 'node-fetch';
import { 
  generateProductFallback, 
  generateMarketFallback, 
  generateAudienceFallback, 
  generateCompetitorFallback, 
  generateIntentFallback, 
  generatePositioningFallback, 
  generateCampaignFallback,
  generateChannelFallback 
} from "./fallback.generators.js";
import { callAI } from "../../domains/ai/services/aiOrchestrator.service.js";
import { deriveWebsiteIdentity } from "../../utils/seo-identity.util.js";
import {
  validateProductAnalysis,
  validateMarketDiscovery,
  validateAudienceIntelligence,
  validateCompetitorAnalysis,
  validateIntentPrediction,
  validatePositioningEngine,
  validateCampaignGenerator,
  validateChannelRecommendation
} from "../../utils/ai-response-validator.js";
import { collectBusinessIntelligence, synthesizeWithAI } from "../../services/intelligence/business-intelligence.service.js";
import { generateExecutiveStory } from "../../services/intelligence/executive-story.service.js";
import { generateActionPlan } from "../../services/intelligence/action-plan.service.js";
import {
  logCompanyCollected, logTechnologyCollected, logPricingCollected,
  logCompetitorsCollected, logMarketCollected, logAudienceCollected,
  logStrategyGenerated, logReportGenerated
} from "../../services/intelligence/business-intelligence-logger.js";
import { getLatestEvidenceSnapshot, saveEvidenceSnapshot, collectEvidence } from '../evidence/evidence.service.js';
import { buildGrowthWorkspaceDataFromEvidence, buildEvidenceContext } from "../evidence/evidence.normalizer.js";
import { NOT_ENOUGH_EVIDENCE } from "../../utils/evidence-level.util.js";
import { generateCompleteSeoIntelligence } from "../../domains/seo/services/seoIntelligence.service.js";



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

const VERIFIED = 'VERIFIED';
const SUPPORTED_INFERENCE = 'SUPPORTED_INFERENCE';
const HYPOTHESIS = 'HYPOTHESIS';
const EVIDENCE_BASED = 'EVIDENCE_BASED';

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
  } catch (evErr) {
    console.log('[Growth Workspace] Evidence load error:', evErr.message);
  }

  // Auto-trigger evidence collection if none exists
  if (!evidenceSnapshot && input.websiteUrl) {
    try {
      console.log('[Growth Workspace] No evidence found — auto-triggering collection for', input.websiteUrl);
      const collected = await collectEvidence(input.websiteUrl, { companyName: input.companyName || input.productName });
      if (collected.success && collected.evidence) {
        const saved = await saveEvidenceSnapshot({
          chatId: validChatId, userId,
          websiteUrl: input.websiteUrl,
          companyName: input.companyName || input.productName,
          evidence: collected.evidence,
          sourcesCollected: collected.sourcesCollected || []
        });
        if (saved) {
          evidenceSnapshot = saved;
          console.log('[Growth Workspace] Auto-collected evidence saved, sources:', collected.sourcesCollected?.length || 0);
        }
      }
    } catch (autoEvErr) {
      console.warn('[Growth Workspace] Auto-evidence collection failed (non-fatal):', autoEvErr.message);
    }
  }

  if (evidenceSnapshot) {
    try {
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
    } catch (evErr) {
      console.log('[Growth Workspace] Evidence parse skipped:', evErr.message);
    }
  }

  const steps = [
    { key: 'product', label: 'Product Analysis', status: 'pending', diagnostics: [] },
    { key: 'market', label: 'Market Discovery', status: 'pending', diagnostics: [] },
    { key: 'seo', label: 'SEO Intelligence', status: 'pending', diagnostics: [] },
    { key: 'audience', label: 'Audience Intelligence', status: 'pending', diagnostics: [] },
    { key: 'competitor', label: 'Competitor Analysis', status: 'pending', diagnostics: [] },
    { key: 'intent', label: 'Intent Prediction', status: 'pending', diagnostics: [] },
    { key: 'positioning', label: 'Positioning Engine', status: 'pending', diagnostics: [] },
    { key: 'campaign', label: 'Campaign Generator', status: 'pending', diagnostics: [] },
    { key: 'channel', label: 'Channel Recommendation', status: 'pending', diagnostics: [] }
  ];

  let results = {};
  const warnings = [];
  let overallStatus = 'in_progress';
  let websiteData = null;

  try {
    // Step 0: Ensure we have evidence data
    let researchData = { keywords: [], competitors: [] };
    
    if (evidenceSnapshot) {
      websiteData = {
        text: evidenceSnapshot.contentEvidence?.cleanedText || evidenceSnapshot.rawEvidence?.rawMarkdown || '',
        html: evidenceSnapshot.rawEvidence?.rawHtml || '',
        metadata: {
          title: evidenceSnapshot.websiteEvidence?.title || '',
          description: evidenceSnapshot.websiteEvidence?.metaDescription || ''
        },
        title: evidenceSnapshot.websiteEvidence?.title || ''
      };
      
      console.log('✅ [Growth Workspace] Using website content from EvidenceSnapshot');
      
      if (!input.description && websiteData.metadata?.description) {
        input.description = websiteData.metadata.description;
      }
    } else {
      console.log('⚠️ [Growth Workspace] No EvidenceSnapshot found, continuing without websiteData');
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
        chatId: validChatId,
        websiteUrl: input.websiteUrl,
        productName: input.productName || '',
        companyName: input.companyName || '',
        industry: input.industry || '',
        targetCountry: input.targetCountry || 'United States',
        category: input.category || '',
        domain: input.domain || (identity ? identity.domain : ''),
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

    function runStep(stepIndex, label, runner, validator, fallbackFn, key) {
      const step = steps[stepIndex];
      step.status = 'running';
      step.diagnostics = [{ ts: new Date().toISOString(), msg: `Starting ${label}...` }];
      console.log(`[GW] Running ${label}...`);
      return runner()
        .then(async rawResult => {
          const validated = validator(rawResult, input);
          results[key] = validated;
          step.status = 'completed';
          step.provider = validated.provider || 'groq';
          step.confidenceScore = validated.confidenceScore ?? null;
          step.diagnostics.push({ ts: new Date().toISOString(), msg: `${label} completed via ${step.provider}`, provider: step.provider });
          console.log(`[GW] ${label} complete`, { provider: step.provider });
        })
        .catch(error => {
          step.status = 'PARTIAL';
          step.provider = 'fallback';
          step.confidenceScore = null;
          step.diagnostics.push({ ts: new Date().toISOString(), msg: `${label} failed: ${error.message}. Using fallback.` });
          warnings.push(`${label} fallback: ${error.message}`);
          results[key] = fallbackFn ? fallbackFn(input, results) : { provider: 'fallback' };
          console.warn(`[GW] ${label} failed, fallback used:`, error.message);
        });
    }

    const stepRunners = [
      // Step 0: Product Analysis
      () => runStep(0, 'Product Analysis',
        () => runProductAnalysis(input, websiteData, evidenceGrowthData),
        validateProductAnalysis,
        () => generateProductFallback(input, websiteData),
        'product'
      ),
      // Step 1: Market Discovery
      () => runStep(1, 'Market Discovery',
        () => runMarketDiscovery(input, results.product || {}),
        validateMarketDiscovery,
        () => generateMarketFallback(input, results.product || {}),
        'market'
      ),
      // Step 2: SEO Intelligence (NEW — between market and audience)
      () => runStep(2, 'SEO Intelligence',
        async () => {
          const seoResult = await generateCompleteSeoIntelligence({
            chatId: validChatId, userId,
            websiteUrl: input.websiteUrl,
            chat
          });
          return {
            ...(seoResult.data || seoResult || {}),
            provider: seoResult.provider || 'groq',
            confidenceScore: seoResult.data?.overallScore != null ? Math.min(100, Math.round(seoResult.data.overallScore * 0.8)) : null
          };
        },
        (raw) => {
          if (!raw || typeof raw !== 'object') return { keywords: [], competitors: [], seoScore: null, provider: 'fallback', confidenceScore: null };
          return {
            keywords: raw.keywordIntelligence?.primaryKeywords || raw.topicCandidates || [],
            keywordOpportunities: raw.keywordIntelligence || null,
            competitors: raw.competitorIntelligence?.competitors || [],
            competitorProfiles: raw.competitorIntelligence?.competitorProfiles || [],
            contentGaps: raw.contentGapAnalysis?.contentGaps || [],
            blogIdeas: raw.blogIntelligence?.blogIdeas || [],
            technicalAudit: raw.technicalAudit || null,
            pageSpeed: raw.pageSpeed || null,
            seoScore: raw.overallScore ?? null,
            scoreConfidence: raw.scoreConfidence || null,
            seoReport: raw.seoReport || null,
            provider: raw.provider || 'groq',
            confidenceScore: raw.overallScore != null ? Math.min(100, Math.round(raw.overallScore * 0.8)) : null,
            warnings: raw.warnings || []
          };
        },
        () => ({ seoScore: null, keywords: [], competitors: [], contentGaps: [], provider: 'fallback', confidenceScore: null }),
        'seo'
      ),
      // Step 3: Audience Intelligence (uses product + SEO keyword context)
      () => runStep(3, 'Audience Intelligence',
        () => runAudienceIntelligence(input, { ...results.product, ...(results.seo ? { seoKeywords: results.seo.keywords } : {}) }),
        validateAudienceIntelligence,
        () => generateAudienceFallback(input, results.product || {}),
        'audience'
      ),
      // Step 4: Competitor Analysis (uses SEO competitors)
      () => runStep(4, 'Competitor Analysis',
        () => {
          const seoCompetitors = (results.seo?.competitors || []).map(c => ({ name: c.name, domain: c.domain || c.website }));
          return runCompetitorAnalysis(input, results.product || {}, seoCompetitors);
        },
        validateCompetitorAnalysis,
        () => generateCompetitorFallback(input, results.product || {}, results.seo?.competitors || []),
        'competitor'
      ),
      // Step 5: Intent Prediction
      () => runStep(5, 'Intent Prediction',
        () => runIntentPrediction(input, results.audience || {}),
        validateIntentPrediction,
        () => generateIntentFallback(input, results.audience || {}),
        'intent'
      ),
      // Step 6: Positioning Engine
      () => runStep(6, 'Positioning Engine',
        () => runPositioningEngine(input, results.product || {}, results.competitor || {}),
        validatePositioningEngine,
        () => generatePositioningFallback(input, results.product || {}, results.competitor || {}),
        'positioning'
      ),
      // Step 7: Campaign Generator
      () => runStep(7, 'Campaign Generator',
        () => runCampaignGenerator(input, results),
        validateCampaignGenerator,
        () => generateCampaignFallback(input, websiteData, results),
        'campaign'
      ),
      // Step 8: Channel Recommendation
      () => runStep(8, 'Channel Recommendation',
        () => runChannelRecommendation(input, results.audience || {}, results.campaign || {}),
        validateChannelRecommendation,
        () => generateChannelFallback(input, results.audience || {}, results.campaign || {}),
        'channel'
      ),
    ];

    for (const runner of stepRunners) {
      await runner();
    }

    const partialSteps = steps.filter(s => s.status === 'PARTIAL').length;
    const completedSteps = steps.filter(s => s.status === 'completed').length;
    const totalSteps = steps.length;
    overallStatus = partialSteps > 0 && completedSteps > 0 ? 'PARTIAL' : completedSteps === totalSteps ? 'completed' : 'PARTIAL';

    // Persist partial results incrementally to survive later-stage failures
    try {
      await prisma.productIntelligence.upsert({
        where: { chatId: validChatId },
        create: {
          chatId: validChatId, userId,
          productAnalysis: results.product,
          marketDiscovery: results.market,
          audienceIntelligence: results.audience,
          status: overallStatus,
          inputJson: input
        },
        update: {
          productAnalysis: results.product,
          marketDiscovery: results.market,
          audienceIntelligence: results.audience,
          status: overallStatus,
          inputJson: input,
          updatedAt: new Date()
        }
      });
    } catch (piError) {
      console.error('[Growth Workspace] Product intelligence partial save failed:', piError.message);
    }

    try {
      await prisma.competitorIntelligence.upsert({
        where: { chatId: validChatId },
        create: {
          chatId: validChatId, userId,
          competitorAnalysis: results.competitor,
          intentPrediction: results.intent,
          positioningEngine: results.positioning,
          status: overallStatus,
          inputJson: input
        },
        update: {
          competitorAnalysis: results.competitor,
          intentPrediction: results.intent,
          positioningEngine: results.positioning,
          status: overallStatus,
          inputJson: input,
          updatedAt: new Date()
        }
      });
    } catch (ciError) {
      console.error('[Growth Workspace] Competitor intelligence partial save failed:', ciError.message);
    }

    // Apply quality filters to ensure evidence-based data
    results = enforceGrowthQualityFilters(results);

    // Label each module as EVIDENCE_BASED or HYPOTHESIS based on provider and evidence availability
    results = labelResultSources(results, evidenceGrowthData);

    // Normalize all results
    const normalizedResults = normalizeGrowthResults(results, input);
    console.log('🔄 [Growth Workspace] Results normalized');
    console.log('[Growth Normalize] normalizedResults keys', Object.keys(normalizedResults || {}));

    function calculateSubScore(moduleKey, moduleData, evidenceGrowthData) {
      if (!moduleData) return null;

      const isHypothesis = moduleData._dataSource === HYPOTHESIS;
      const provider = moduleData.provider || '';
      const isPureFallback = provider === 'fallback';

      let baseScore = 0;
      let detailBreakdown = [];

      if (moduleKey === 'product' && evidenceGrowthData?.productIntelligence?.features?.length) {
        baseScore = Math.min(100, Math.round(evidenceGrowthData.productIntelligence.features.length * 20));
        detailBreakdown.push(`features:${evidenceGrowthData.productIntelligence.features.length}`);
      }
      if (moduleKey === 'market' && (moduleData.growthSignals?.length || moduleData.opportunities?.length)) {
        baseScore = Math.min(100, Math.round(Math.max(moduleData.growthSignals?.length || 0, moduleData.opportunities?.length || 0) * 15));
        detailBreakdown.push(`signals:${moduleData.growthSignals?.length || 0}`);
      }
      if (moduleKey === 'audience') {
        const realPersonas = (moduleData.buyerPersonas || []).filter(p => p.name && p.name !== 'Target Persona' && p.name !== 'Persona Name');
        if (realPersonas.length) {
          baseScore = Math.min(100, Math.round(realPersonas.length * 20 + (moduleData.buyingTriggers?.length || 0) * 10));
          detailBreakdown.push(`personas:${realPersonas.length}`);
        }
      }
      if (moduleKey === 'competitor') {
        const realCompetitors = (moduleData.directCompetitors || []).filter(c => c.name && !c.name.includes('Competitor') && !c.name.includes('competitor'));
        if (realCompetitors.length) {
          baseScore = Math.min(100, Math.round(realCompetitors.length * 15 + (moduleData.marketGaps?.length || 0) * 10));
          detailBreakdown.push(`competitors:${realCompetitors.length}`);
        }
      }
      if (moduleKey === 'seo' && moduleData?.seoScore != null) {
        baseScore = Math.min(100, moduleData.seoScore);
        detailBreakdown.push(`seoScore:${moduleData.seoScore}`);
      }
      if (moduleKey === 'campaign' || moduleKey === 'channel') {
        const angles = (moduleData.creativeAngles || []).filter(a => a.value && !a.value.includes('Angle'));
        const channels = (moduleData.recommendedChannels || []).filter(c => c.channel && !c.channel.includes('Channel'));
        if (angles.length || channels.length) {
          baseScore = Math.min(100, Math.round(angles.length * 15 + channels.length * 15));
          detailBreakdown.push(`angles:${angles.length}`);
        }
      }

      if (isPureFallback) {
        return {
          value: null,
          evidenceSource: HYPOTHESIS,
          status: HYPOTHESIS,
          breakdown: detailBreakdown,
          penalty: 'pure_fallback'
        };
      }

      if (isHypothesis) {
        return {
          value: baseScore > 0 ? Math.min(50, Math.round(baseScore * 0.5)) : null,
          evidenceSource: HYPOTHESIS,
          status: SUPPORTED_INFERENCE,
          breakdown: detailBreakdown,
          penalty: 'ai_inferred_no_evidence'
        };
      }

      const realEvidenceCount = moduleData._evidenceCount ||
        (moduleKey === 'product' ? evidenceGrowthData?.productIntelligence?.features?.length || 0 : 0);

      if (realEvidenceCount > 0 || baseScore > 0) {
        return {
          value: baseScore > 0 ? baseScore : null,
          evidenceSource: EVIDENCE_BASED,
          status: realEvidenceCount > 0 ? VERIFIED : SUPPORTED_INFERENCE,
          breakdown: detailBreakdown,
          penalty: null
        };
      }

      return {
        value: null,
        evidenceSource: HYPOTHESIS,
        status: HYPOTHESIS,
        breakdown: detailBreakdown,
        penalty: 'no_data'
      };
    }

    function recommendationStatus(signalCount, featureCount, competitorCount, personaCount) {
      if (signalCount > 0 || featureCount > 0 || competitorCount > 0 || personaCount > 0) return VERIFIED;
      if (signalCount > 0 || featureCount > 0) return SUPPORTED_INFERENCE;
      return HYPOTHESIS;
    }

    function generateTopRecommendation(results, input) {
      const productName = input.companyName || input.productName || 'the product';
      const signals = evidenceGrowthData?.growthSignals || [];
      const features = (evidenceGrowthData?.productIntelligence?.features || []).map(f => f.value);
      const topPersona = results.audience?.buyerPersonas?.[0]?.name || '';
      const realPersonas = (results.audience?.buyerPersonas || []).filter(p => p.name && p.name !== 'Target Persona' && p.name !== 'Persona Name');

      let text;
      if (signals.length > 0) {
        text = `Based on evidence: ${signals[0]?.signal || ''}. Leverage this opportunity for ${productName}.`;
      } else if (features.length > 0) {
        text = `Prioritize marketing the key features found: ${features.slice(0, 3).join(', ')} for ${productName}.`;
      } else {
        const primaryChannel = results.channel?.primaryChannel || results.channel?.recommendedChannels?.[0]?.channel || 'digital channels';
        text = `Focus on ${primaryChannel} to reach ${topPersona || 'target audience'} for ${productName}.`;
      }
      return {
        text,
        status: recommendationStatus(signals.length, features.length, 0, realPersonas.length)
      };
    }

    function generatePrimaryRisk(results, input) {
      const topCompetitor = results.competitor?.directCompetitors?.[0]?.name;
      const realCompetitors = (results.competitor?.directCompetitors || []).filter(c => c.name && !c.name.includes('Competitor') && !c.name.includes('competitor'));
      const productName = input.companyName || input.productName || 'the product';

      let text;
      if (topCompetitor) {
        text = `Competitive pressure from ${topCompetitor} in the market.`;
      } else {
        text = `Data insufficient to identify primary risk for ${productName}.`;
      }
      return {
        text,
        status: realCompetitors.length > 0 ? VERIFIED : HYPOTHESIS
      };
    }

    function generateImmediateAction(results, input) {
      const features = (evidenceGrowthData?.productIntelligence?.features || []).map(f => f.value);
      const ctas = evidenceGrowthData?.productIntelligence?.ctaTexts || [];
      const productName = input.companyName || input.productName || 'the product';

      let text;
      if (ctas.length > 0) {
        text = `Test and optimize existing CTAs from website: "${ctas[0]}" to improve conversion for ${productName}.`;
      } else if (features.length > 0) {
        text = `Build landing pages highlighting top features: ${features.slice(0, 2).join(', ')} for ${productName}.`;
      } else {
        const primaryChannel = results.channel?.primaryChannel || results.channel?.recommendedChannels?.[0]?.channel || 'marketing';
        text = `Launch ${primaryChannel} campaign to validate ${productName} positioning.`;
      }
      return {
        text,
        status: ctas.length > 0 || features.length > 0 ? VERIFIED : HYPOTHESIS
      };
    }

    const dimensionConfig = {
      productFitScore: { key: 'product', label: 'Product Evidence' },
      marketOpportunityScore: { key: 'market', label: 'Market Opportunity' },
      seoReadinessScore: { key: 'seo', label: 'SEO Readiness' },
      audienceClarityScore: { key: 'audience', label: 'Audience Clarity' },
      competitiveDefensibilityScore: { key: 'competitor', label: 'Competitive Position' },
      campaignReadinessScore: { key: 'campaign', label: 'Campaign Readiness' },
    };

    const rawScores = {};
    const dimensionScoreDetails = {};
    for (const [dimName, cfg] of Object.entries(dimensionConfig)) {
      const sub = calculateSubScore(cfg.key, normalizedResults[cfg.key], evidenceGrowthData);
      rawScores[dimName] = sub.value;
      dimensionScoreDetails[dimName] = {
        value: sub.value,
        label: cfg.label,
        evidenceSource: sub.evidenceSource,
        status: sub.status,
        breakdown: sub.breakdown,
        penalty: sub.penalty
      };
    }

    const nonNullScores = Object.entries(rawScores).filter(([, v]) => v !== null && v !== undefined);
    const nullScores = Object.entries(rawScores).filter(([, v]) => v === null || v === undefined);
    const measurableComponents = nonNullScores.length;
    const totalDimensions = Object.keys(rawScores).length;

    const dataAvailability = totalDimensions > 0 ? Math.round((measurableComponents / totalDimensions) * 100) : 0;

    const statuses = Object.values(dimensionScoreDetails).map(d => d.status);
    const verifiedEvidenceCoverage = statuses.filter(s => s === VERIFIED).length;
    const inferredEvidenceCoverage = statuses.filter(s => s === SUPPORTED_INFERENCE).length;
    const hypothesisCoverage = statuses.filter(s => s === HYPOTHESIS).length;

    const evidenceBasedCount = Object.values(dimensionScoreDetails).filter(d => d.evidenceSource === EVIDENCE_BASED).length;
    const hypothesisCount = Object.values(dimensionScoreDetails).filter(d => d.evidenceSource === HYPOTHESIS).length;

    let overallGrowthScore = null;
    let growthScoreStatus = null;
    let scoreConfidence = null;

    if (measurableComponents >= 3) {
      const rawAverage = Math.round(nonNullScores.reduce((a, [, v]) => a + v, 0) / measurableComponents);
      const evidenceRatio = measurableComponents > 0 ? evidenceBasedCount / measurableComponents : 0;
      const completenessRatio = measurableComponents / totalDimensions;
      // When evidenceBasedCount is 0, confidence stays below 40%
      const verifiedBoost = verifiedEvidenceCoverage / totalDimensions;
      const penalty = Math.round((completenessRatio * 0.5 + evidenceRatio * 0.3 + verifiedBoost * 0.2) * 100) / 100;
      overallGrowthScore = Math.round(rawAverage * penalty);
      scoreConfidence = Math.round(penalty * 100);
    } else {
      growthScoreStatus = NOT_ENOUGH_EVIDENCE;
      scoreConfidence = 0;
    }

    console.log('[Growth Scores]', {
      overallGrowthScore,
      dataAvailability,
      scoreConfidence,
      measurableComponents,
      totalDimensions,
      evidenceBasedCount,
      hypothesisCount,
      verifiedEvidenceCoverage,
      inferredEvidenceCoverage,
      hypothesisCoverage,
    });

    const dimensionScores = {};
    for (const [dimName, detail] of Object.entries(dimensionScoreDetails)) {
      dimensionScores[dimName] = {
        value: detail.value,
        label: detail.label,
        available: detail.value !== null && detail.value !== undefined,
        evidenceSource: detail.evidenceSource,
        status: detail.status,
        breakdown: detail.breakdown,
        penalty: detail.penalty
      };
    }

    const topRec = generateTopRecommendation(normalizedResults, input);
    const risk = generatePrimaryRisk(normalizedResults, input);
    const action = generateImmediateAction(normalizedResults, input);

    const growthSummary = {
      overallGrowthScore,
      productFitScore: rawScores.productFitScore,
      marketOpportunityScore: rawScores.marketOpportunityScore,
      seoReadinessScore: rawScores.seoReadinessScore,
      audienceClarityScore: rawScores.audienceClarityScore,
      competitiveDefensibilityScore: rawScores.competitiveDefensibilityScore,
      campaignReadinessScore: rawScores.campaignReadinessScore,
      growthScoreStatus,
      scoreConfidence,
      dataAvailability,
      verifiedEvidenceCoverage,
      inferredEvidenceCoverage,
      hypothesisCoverage,
      dimensionScores,
      evidenceBasedCount,
      hypothesisCount,
      availableDimensions: nonNullScores.map(([k]) => k),
      unavailableDimensions: nullScores.map(([k]) => ({ key: k, label: dimensionConfig[k]?.label || k, reason: 'Insufficient evidence' })),
      topRecommendation: topRec.text,
      topRecommendationStatus: topRec.status,
      primaryRisk: risk.text,
      primaryRiskStatus: risk.status,
      immediateAction: action.text,
      immediateActionStatus: action.status,
      sourceModules: ['Product Analysis', 'Market Discovery', 'SEO Intelligence', 'Audience Intelligence', 'Competitor Analysis', 'Intent Prediction', 'Positioning Engine', 'Campaign Generator', 'Channel Recommendation'],
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

    // Save campaign intelligence (product and competitor already saved incrementally)
    console.log('💾 [Growth Workspace] Saving campaign intelligence to database...');
    console.info('[Growth Stage]', { stage: 'CAMPAIGN_SAVE_STARTED', status: 'running', chatId: validChatId });
    
    try {
      await prisma.campaignIntelligence.upsert({
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
          status: overallStatus,
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
          status: overallStatus,
          inputJson: input,
          updatedAt: new Date()
        }
      });
      console.info('[Growth Stage]', { stage: 'CAMPAIGN_SAVE_COMMITTED', status: 'completed', chatId: validChatId });
    } catch (campaignError) {
      console.error('[Growth Workspace] Campaign intelligence save failed (non-fatal):', campaignError.message);
      warnings.push({ code: 'CAMPAIGN_SAVE_FAILED', message: 'Product and competitor data saved, campaign persistence failed.' });
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

    console.log('💾 [Growth Workspace] Core intelligence saved to database');
    console.log(`✅ [Growth Workspace] hasActionPlan: ${!!normalizedResults.campaign.actionPlan}`);

    // Refetch persisted data — return DB truth, not in-memory
    try {
      const [dbProductIntel, dbCompetitorIntel, dbCampaignIntel] = await Promise.all([
        prisma.productIntelligence.findFirst({ where: { userId, chatId: validChatId } }),
        prisma.competitorIntelligence.findFirst({ where: { userId, chatId: validChatId } }),
        prisma.campaignIntelligence.findFirst({ where: { userId, chatId: validChatId } }),
      ]);
      if (dbProductIntel || dbCompetitorIntel || dbCampaignIntel) {
        const dbResults = {};
        if (dbProductIntel) {
          dbResults.product = dbProductIntel.productAnalysis;
          dbResults.market = dbProductIntel.marketDiscovery;
          dbResults.audience = dbProductIntel.audienceIntelligence;
        }
        if (dbCompetitorIntel) {
          dbResults.competitor = dbCompetitorIntel.competitorAnalysis;
          dbResults.intent = dbCompetitorIntel.intentPrediction;
          dbResults.positioning = dbCompetitorIntel.positioningEngine;
        }
        if (dbCampaignIntel) {
          const gen = dbCampaignIntel.campaignGenerator;
          if (gen) {
            dbResults.campaign = typeof gen === 'object' ? { ...gen, growthSummary: undefined, metadata: undefined } : gen;
          }
          dbResults.channel = dbCampaignIntel.channelRecommendation;
        }
        Object.assign(results, dbResults);
        const refetchedNormalized = normalizeGrowthResults(results, input);
        Object.assign(normalizedResults, refetchedNormalized);
      }
      console.info('[Growth Stage]', { stage: 'PERSISTENCE_REFETCHED', status: 'completed', chatId: validChatId });
    } catch (refetchError) {
      console.error('[Growth Stage]', {
        stage: 'PERSISTENCE_REFETCH_FAILED',
        status: 'warning',
        chatId: validChatId,
        error: refetchError.message,
      });
    }

    // Add message to chat
    await prisma.message.create({
      data: {
        chatId: validChatId,
        role: 'assistant',
        content: `Full growth analysis completed for ${input.productName}. Growth Score: ${overallGrowthScore}/100`,
        analysisData: { summary: { overallGrowthScore, stepsCompleted: completedSteps } }
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
      },
      diagnostics: steps.map(s => ({ key: s.key, label: s.label, status: s.status, provider: s.provider, diagnostics: s.diagnostics }))
    };

  } catch (error) {
    console.error('❌ [Growth Workspace] Error:', error);
    
    // Mark failed step
    const failedStepIndex = steps.findIndex(s => s.status === 'running');
    if (failedStepIndex !== -1) {
      steps[failedStepIndex].status = 'failed';
    }

    // Attempt to persist partial results before returning
    const partialChatId = chat?.id || chatId;
    if (partialChatId && results) {
      try {
        if (results.product || results.market || results.audience) {
          await prisma.productIntelligence.upsert({
            where: { chatId: partialChatId },
            create: {
              chatId: partialChatId, userId,
              productAnalysis: results.product || null,
              marketDiscovery: results.market || null,
              audienceIntelligence: results.audience || null,
              status: 'PARTIAL',
              inputJson: input
            },
            update: {
              productAnalysis: results.product,
              marketDiscovery: results.market,
              audienceIntelligence: results.audience,
              status: 'PARTIAL',
              inputJson: input,
              updatedAt: new Date()
            }
          });
        }
      } catch (piError) {
        console.error('[Growth Workspace] Partial save (product) failed in outer catch:', piError.message);
      }
      try {
        if (results.competitor || results.intent || results.positioning) {
          await prisma.competitorIntelligence.upsert({
            where: { chatId: partialChatId },
            create: {
              chatId: partialChatId, userId,
              competitorAnalysis: results.competitor || null,
              intentPrediction: results.intent || null,
              positioningEngine: results.positioning || null,
              status: 'PARTIAL',
              inputJson: input
            },
            update: {
              competitorAnalysis: results.competitor,
              intentPrediction: results.intent,
              positioningEngine: results.positioning,
              status: 'PARTIAL',
              inputJson: input,
              updatedAt: new Date()
            }
          });
        }
      } catch (ciError) {
        console.error('[Growth Workspace] Partial save (competitor) failed in outer catch:', ciError.message);
      }
    }

    const completedStepCount = steps.filter(s => s.status === 'completed').length;
    const hasPartialResults = completedStepCount > 0;
    return {
      success: hasPartialResults,
      error: hasPartialResults ? null : error.message,
      results: normalizeGrowthResults(results, input),
      steps,
      overallStatus: hasPartialResults ? 'PARTIAL' : 'failed',
      warnings: hasPartialResults ? [`Analysis incomplete: ${error.message}`] : []
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

  function safeText(obj, ...fields) {
    if (obj == null) return '';
    if (typeof obj === 'string') return obj;
    if (typeof obj === 'object') {
      for (const f of fields) {
        const v = obj[f];
        if (v != null && typeof v === 'string') return v;
        if (v != null && typeof v === 'number') return String(v);
      }
      return JSON.stringify(obj);
    }
    return String(obj);
  }

  function safeArray(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.filter(Boolean);
  }

  const productFeatures = allResults?.product?.features ? safeArray(allResults.product.features) : safeArray(allResults?.product?.keyFeatures);
  const featuresText = productFeatures.length > 0
    ? productFeatures.map(f => `- ${safeText(f, 'name', 'title', 'value')}: ${safeText(f, 'description', 'benefit', 'impact', 'value')}`).join('\n')
    : 'No verified features available';

  const audiencePersonas = safeArray(allResults?.audience?.buyerPersonas);
  const personasText = audiencePersonas.length > 0
    ? audiencePersonas.map(p => `- ${safeText(p, 'name', 'role', 'title')} (${safeText(p, 'role', 'title', 'name')}): ${safeArray(p.goals).join(', ')}`).join('\n')
    : 'No verified audience personas available';

  const competitorGaps = safeArray(allResults?.competitor?.marketGaps || allResults?.competitor?.differentiationOpportunities);
  const gapsText = competitorGaps.length > 0
    ? competitorGaps.map(g => `- ${safeText(g, 'opportunity', 'gap', 'description', 'value')}`).join('\n')
    : 'No competitor gap analysis available';

  const intentSignals = safeArray(allResults?.intent?.buyingSignals || allResults?.intent?.highIntentSegments);
  const signalsText = intentSignals.length > 0
    ? intentSignals.map(s => `- ${safeText(s, 'signal', 'name', 'segment', 'value')}`).join('\n')
    : 'No intent signals available';

  const usp = allResults?.product?.usp || allResults?.product?.valueProposition || '';
  const positioning = allResults?.positioning?.valueProposition || allResults?.positioning?.positioningStatement || '';
  const painPoints = (allResults?.product?.painPoints || []).slice(0, 5).join(', ');

  const prompt = `Generate a ${duration} marketing campaign using ALL available evidence:

Product: ${input.productName || 'unknown'}
Campaign Goal: ${input.campaignGoal || 'brand awareness'}
Target Audience: ${input.targetAudience || 'ideal customer profile'}
Preferred Channel: ${input.preferredChannels || 'multiple channels'}
Tone: ${input.tone || 'professional'}
Budget: ${input.budgetRange || 'not specified'}
Duration: ${duration}

EVIDENCE — Product Features:
${featuresText}

EVIDENCE — USP / Value Proposition:
${usp || positioning || 'Not available'}

EVIDENCE — Audience Personas:
${personasText}

EVIDENCE — Competitor Gaps / Opportunities:
${gapsText}

EVIDENCE — Intent Signals:
${signalsText}

EVIDENCE — Customer Pain Points:
${painPoints || 'Not available'}

EVIDENCE — Positioning:
${positioning || 'Not available'}

Analyze the evidence above to determine:
1. BUYING STAGE: Based on intent signals and pain points, determine whether the audience is in awareness, consideration, or decision stage. If intent signals include purchase-ready terms, use 'decision'.
2. FUNNEL CHANNELS: Recommend top-of-funnel, middle-of-funnel, and bottom-of-funnel channels based on audience personas and product type.
3. KPIs: Define specific, measurable KPIs tied to the campaign goal. Status must be one of: 'on_track', 'at_risk', 'needs_attention'.

Provide JSON response:
{
  "campaignPhases": [
    {"phase": "Phase name", "duration": "Timeline", "objective": "Phase goal", "channels": ["channel1"], "kpis": [{"metric": "KPI name", "target": "Target value", "status": "on_track"}]}
  ],
  "creativeAngles": [{"value": "Angle derived from evidence", "confidence": null, "impact": null}],
  "copyHooks": [{"value": "Hook tied to USP or pain point", "confidence": null, "impact": null}],
  "ctaSuggestions": [{"value": "CTA aligned with buying stage", "confidence": null, "impact": null}],
  "emailSequence": [{"value": "Email Idea with stage context", "confidence": null, "impact": null}],
  "socialPostIdeas": [{"value": "Post Idea targeting specific persona", "confidence": null, "impact": null}],
  "videoIdeas": [{"value": "Video Idea for specific funnel stage", "confidence": null, "impact": null}],
  "buyingStage": "awareness|consideration|decision",
  "funnelChannels": {
    "topOfFunnel": ["channel1"],
    "middleOfFunnel": ["channel2"],
    "bottomOfFunnel": ["channel3"]
  },
  "kpiSummary": [{"metric": "KPI name", "target": "Target", "status": "on_track"}],
  "actionPlan": {
    "sevenDay": [{"title": "Task", "problem": "What problem this solves", "evidence": "Data evidence", "researchSource": "Source module", "businessImpact": "Business impact", "difficulty": "Low/Medium/High", "priority": "High", "estimatedTimeline": "1 week", "owner": "Role"}],
    "thirtyDay": [{"title": "Task", "problem": "What problem this solves", "evidence": "Data evidence", "researchSource": "Source module", "businessImpact": "Business impact", "difficulty": "Low/Medium/High", "priority": "High", "estimatedTimeline": "2-4 weeks", "owner": "Role"}],
    "sixtyDay": [{"title": "Task", "problem": "What problem this solves", "evidence": "Data evidence", "researchSource": "Source module", "businessImpact": "Business impact", "difficulty": "Low/Medium/High", "priority": "High", "estimatedTimeline": "1-2 months", "owner": "Role"}],
    "ninetyDay": [{"title": "Task", "problem": "What problem this solves", "evidence": "Data evidence", "researchSource": "Source module", "businessImpact": "Business impact", "difficulty": "Low/Medium/High", "priority": "High", "estimatedTimeline": "3 months", "owner": "Role"}]
  },
  "confidenceScore": null
}

CRITICAL INSTRUCTION: Base every recommendation on the evidence provided above. Do NOT invent ROI, CTR, CPA, or conversion numbers. Action plan MUST use 'sevenDay', 'thirtyDay', 'sixtyDay', 'ninetyDay' timelines. Every task MUST explain WHY it exists using the problem, evidence, and researchSource fields. If evidence is marked as "Not available", omit that dimension rather than inventing data.`;

  const fallbackData = generateCampaignFallback(input, allResults.product, allResults);
  const aiResult = await callBestAI(prompt, 1600, 'Campaign Generator', fallbackData);
  
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
  console.log(`[GW][AI][${moduleName}] Calling AI...`);
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${moduleName} timed out after 120s`)), 120000);
  });
  try {
    const result = await Promise.race([callAI(prompt), timeout]);
    clearTimeout(timer);
    if (result.success && result.data) {
      let parsed = result.data;
      if (typeof parsed === 'string') {
        const match = parsed.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (match) {
          try { parsed = JSON.parse(match[0]); } catch { parsed = null; }
        } else {
          parsed = null;
        }
      }
      if (parsed && typeof parsed === 'object') {
        return { ...parsed, provider: result.provider };
      }
    }
    console.log(`[AI][${moduleName}] AI returned no parseable data, using fallback.`);
  } catch (err) {
    clearTimeout(timer);
    console.warn(`[AI][${moduleName}] failed: ${err.message}`);
  }
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

    function buildStep(key, label) {
      const live = steps.find(s => s.key === key);
      return {
        key, label,
        status: results[key] ? (live?.status || 'completed') : 'pending',
        provider: results[key]?.provider || live?.provider,
        confidenceScore: results[key]?.confidenceScore ?? live?.confidenceScore ?? null,
        diagnostics: live?.diagnostics || []
      };
    }

    const resultSteps = [
      buildStep('product', 'Product Analysis'),
      buildStep('market', 'Market Discovery'),
      buildStep('seo', 'SEO Intelligence'),
      buildStep('audience', 'Audience Intelligence'),
      buildStep('competitor', 'Competitor Analysis'),
      buildStep('intent', 'Intent Prediction'),
      buildStep('positioning', 'Positioning Engine'),
      buildStep('campaign', 'Campaign Generator'),
      buildStep('channel', 'Channel Recommendation'),
    ];
    const steps = resultSteps;

    const completedSteps = steps.filter(s => s.status === 'completed').length;
    const totalSteps = steps.length;
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
        progress: Math.round((completedSteps / totalSteps) * 100)
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
    // Replace TAM/SAM/SOM with explanation instead of deleting
    if (market.tam && market.tam !== 'Unknown') {
      market.tam = market.tam;
      market._tamNote = 'Estimated — not verified from financial reports';
    } else {
      delete market.tam;
    }
    if (market.sam && market.sam !== 'Unknown') {
      market.sam = market.sam;
      market._samNote = 'Estimated — derived from TAM and audience segment';
    } else {
      delete market.sam;
    }
    if (market.som && market.som !== 'Unknown') {
      market.som = market.som;
      market._somNote = 'Estimated — based on stage-adjusted projection';
    } else {
      delete market.som;
    }
    if (market.demandScore != null && (market.demandScore < 0 || market.demandScore > 100)) {
      market.demandScore = null;
    }
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
    }).map(p => ({
      ...p,
      _evidenceNote: p.name ? 'AI-inferred persona based on industry patterns' : 'Placeholder — replace with verified data'
    }));
    if (audience.buyerPersonas.length === 0) {
      audience._note = 'No verified personas — AI was unable to derive specific audience profiles from available data';
    }
  }

  ['channel', 'campaign'].forEach(area => {
    const data = results[area];
    if (!data) return;
    if (data.recommendedChannels && Array.isArray(data.recommendedChannels)) {
      data.recommendedChannels = data.recommendedChannels.map(ch => {
        const clean = { ...ch };
        if (clean.budgetAllocation) { clean._budgetNote = 'Estimated — not verified'; delete clean.budgetAllocation; }
        if (clean.expectedRoi) { clean._roiNote = 'Removed — ROI cannot be verified'; delete clean.expectedRoi; }
        if (clean.roi) { clean._roiNote = 'Removed — ROI cannot be verified'; delete clean.roi; }
        if (clean.budgetSplit) { clean._budgetNote = 'Estimated — not verified'; delete clean.budgetSplit; }
        return clean;
      });
    }
    if (data.primaryChannel && data.primaryChannel.toLowerCase() === 'google ads') {
      data.primaryChannel = data.recommendedChannels?.[0]?.channel || data.recommendedChannels?.[0]?.name || null;
    }
  });

  if (results.campaign?.actionPlan) {
    ['day7', 'day30', 'day60', 'day90', 'day180', 'day365', 'sevenDay', 'thirtyDay', 'sixtyDay', 'ninetyDay'].forEach(key => {
      if (results.campaign.actionPlan[key]) {
        results.campaign.actionPlan[key] = results.campaign.actionPlan[key].map(item => {
          if (item.roi) { item._roiNote = 'Removed — ROI cannot be verified'; delete item.roi; }
          if (item.expectedGain) { item._gainNote = 'Estimated — not verified'; delete item.expectedGain; }
          if (item.expectedKPI && item.expectedKPI.includes('%')) { item._kpiNote = 'Percentage removed — use absolute values'; delete item.expectedKPI; }
          return item;
        });
      }
    });
  }

  const seo = results.seo;
  if (seo && seo.seoScore == null) {
    seo._note = 'SEO analysis completed but no score was calculated (insufficient data sources)';
  }

  return results;
}

// ============================================
// SOURCE LABELING (EVIDENCE_BASED vs HYPOTHESIS)
// ============================================

function labelResultSources(results, evidenceGrowthData) {
  if (!results || typeof results !== 'object') return results;

  const evidenceFeatures = evidenceGrowthData?.productIntelligence?.features?.length || 0;
  const evidenceSchemas = evidenceGrowthData?.productIntelligence?.schemaTypes?.length || 0;
  const evidenceGrowthSignals = evidenceGrowthData?.growthSignals?.length || 0;
  const hasEvidenceSnapshot = !!evidenceGrowthData?.sourceSummary;

  const moduleEvidenceMap = {
    product: evidenceFeatures > 0 || evidenceSchemas > 0,
    market: evidenceGrowthSignals > 0,
    seo: (results.seo?.seoScore != null) || (results.seo?.keywords?.length > 0),
    audience: false,
    competitor: false,
    intent: false,
    positioning: evidenceSchemas > 0,
    campaign: false,
    channel: false,
  };

  for (const [moduleKey, moduleData] of Object.entries(results)) {
    if (!moduleData || typeof moduleData !== 'object') continue;

    const provider = moduleData.provider || '';
    const hasEvidence = moduleEvidenceMap[moduleKey] || false;

    if (provider === 'fallback' || provider === 'fallback_unavailable') {
      moduleData._dataSource = HYPOTHESIS;
      moduleData._dataSourceReason = 'Fallback generator used - no real analysis performed';
    } else if (!hasEvidence || !hasEvidenceSnapshot) {
      moduleData._dataSource = HYPOTHESIS;
      moduleData._dataSourceReason = 'AI-inferred without supporting website evidence';
    } else {
      moduleData._dataSource = EVIDENCE_BASED;
      moduleData._dataSourceReason = 'Derived from real website evidence';
    }
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
  
  // Normalize SEO Intelligence
  if (results.seo || results.seoIntelligence) {
    const data = results.seo || results.seoIntelligence;
    normalized.seo = {
      seoScore: data.seoScore ?? null,
      keywords: ensureArray(data.keywords || data.keywordOpportunities?.primaryKeywords || []),
      keywordOpportunities: data.keywordOpportunities || null,
      seoCompetitors: ensureArray(data.competitors || data.competitorProfiles || []),
      contentGaps: ensureArray(data.contentGaps || []),
      blogIdeas: ensureArray(data.blogIdeas || []),
      technicalAudit: data.technicalAudit || null,
      pageSpeed: data.pageSpeed || null,
      scoreConfidence: data.scoreConfidence || null,
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
  
  // Propagate _dataSource from source results to normalized output
  const sourceKeys = ['product', 'market', 'audience', 'competitor', 'intent', 'positioning', 'campaign', 'channel'];
  for (const key of sourceKeys) {
    const sourceData = results[key] || results[key + 'Analysis'] || results[key + 'Discovery'] || results[key + 'Intelligence'] || results[key + 'Recommendation'] || results[key + 'Prediction'] || results[key + 'Engine'] || results[key + 'Generator'];
    if (sourceData && sourceData._dataSource && normalized[key]) {
      normalized[key]._dataSource = sourceData._dataSource;
      normalized[key]._dataSourceReason = sourceData._dataSourceReason || '';
    }
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
