/**
 * AI Response Validator
 * Ensures all AI responses conform to expected schemas and never return undefined/null
 */

/**
 * Validate and normalize Product Analysis response
 */
export function validateProductAnalysis(data, input) {
  if (!data || typeof data !== 'object') {
    return generateProductFallback(input);
  }

  return {
    usp: ensureString(data.usp || data.uniqueSellingProposition),
    summary: ensureString(data.summary || data.productSummary),
    productSummary: ensureString(data.summary || data.productSummary),
    keyFeatures: ensureInsightArray(data.keyFeatures || data.features || []),
    features: ensureInsightArray(data.keyFeatures || data.features || []),
    coreBenefits: ensureInsightArray(data.coreBenefits || data.benefits || []),
    painPointsSolved: ensureInsightArray(data.painPointsSolved || data.painPoints || []),
    painPoints: ensureInsightArray(data.painPointsSolved || data.painPoints || []),
    targetUsers: ensureInsightArray(data.targetUsers || []),
    differentiators: ensureInsightArray(data.differentiators || []),
    jobsToBeDone: ensureInsightArray(data.jobsToBeDone || data.jtbd || []),
    confidenceScore: ensureNumber(data.confidenceScore, 0),
    provider: ensureString(data.provider, 'fallback')
  };
}

/**
 * Validate and normalize Market Discovery response
 */
export function validateMarketDiscovery(data, input) {
  if (!data || typeof data !== 'object') {
    return generateMarketFallback(input);
  }

  return {
    demandScore: ensureNumber(data.demandScore, 0),
    confidence: ensureNumber(data.confidence || data.confidenceScore, 0),
    confidenceScore: ensureNumber(data.confidence || data.confidenceScore, 0),
    tam: ensureString(data.tam, 'Unknown'),
    sam: ensureString(data.sam, 'Unknown'),
    som: ensureString(data.som, 'Unknown'),
    cagr: ensureString(data.cagr, 'Unknown'),
    marketTrends: ensureInsightArray(data.marketTrends || data.trends || []),
    opportunities: ensureInsightArray(data.opportunities || data.growthOpportunities || []),
    growthOpportunities: ensureInsightArray(data.opportunities || data.growthOpportunities || []),
    risks: ensureInsightArray(data.risks || data.marketRisks || []),
    marketRisks: ensureInsightArray(data.risks || data.marketRisks || []),
    entryStrategy: ensureString(data.entryStrategy),
    provider: ensureString(data.provider, 'fallback')
  };
}

/**
 * Validate and normalize Audience Intelligence response
 */
export function validateAudienceIntelligence(data, input) {
  if (!data || typeof data !== 'object') {
    return generateAudienceFallback(input);
  }

  return {
    buyerPersonas: ensurePersonaArray(data.buyerPersonas || data.personas || []),
    personas: ensurePersonaArray(data.buyerPersonas || data.personas || []),
    buyingTriggers: ensureInsightArray(data.buyingTriggers || []),
    commonObjections: ensureInsightArray(data.commonObjections || data.objections || []),
    bestChannels: ensureInsightArray(data.bestChannels || data.recommendedChannels || []),
    decisionMakers: ensureInsightArray(data.decisionMakers || []),
    confidenceScore: ensureNumber(data.confidenceScore, 0),
    provider: ensureString(data.provider, 'fallback')
  };
}

/**
 * Validate and normalize Competitor Analysis response
 */
export function validateCompetitorAnalysis(data, input) {
  if (!data || typeof data !== 'object') {
    return generateCompetitorFallback(input);
  }

  return {
    directCompetitors: ensureCompetitorArray(data.directCompetitors || data.competitors || []),
    competitorMatrix: ensureString(data.competitorMatrix),
    differentiationOpportunities: ensureInsightArray(data.differentiationOpportunities || []),
    marketGaps: ensureInsightArray(data.marketGaps || []),
    competitorWeaknesses: ensureInsightArray(data.competitorWeaknesses || []),
    confidenceScore: ensureNumber(data.confidenceScore, 0),
    provider: ensureString(data.provider, 'fallback')
  };
}

/**
 * Validate and normalize Intent Prediction response
 */
export function validateIntentPrediction(data, input) {
  if (!data || typeof data !== 'object') {
    return generateIntentFallback(input);
  }

  return {
    hotSegments: ensureInsightArray(data.hotSegments || data.highIntentSegments || []),
    highIntentSegments: ensureInsightArray(data.hotSegments || data.highIntentSegments || []),
    warmSegments: ensureInsightArray(data.warmSegments || data.mediumIntentSegments || []),
    coldSegments: ensureInsightArray(data.coldSegments || data.lowIntentSegments || []),
    buyingSignals: ensureInsightArray(data.buyingSignals || []),
    triggerEvents: ensureInsightArray(data.triggerEvents || []),
    leadScoringRules: ensureInsightArray(data.leadScoringRules || []),
    confidenceScore: ensureNumber(data.confidenceScore, 0),
    provider: ensureString(data.provider, 'fallback')
  };
}

/**
 * Validate and normalize Positioning Engine response
 */
export function validatePositioningEngine(data, input) {
  if (!data || typeof data !== 'object') {
    return generatePositioningFallback(input);
  }

  return {
    positioningStatement: ensureString(data.positioningStatement || data.statement),
    statement: ensureString(data.positioningStatement || data.statement),
    valueProposition: ensureString(data.valueProposition),
    brandPromise: ensureString(data.brandPromise),
    messagingPillars: ensureInsightArray(data.messagingPillars || data.pillars || []),
    pillars: ensureInsightArray(data.messagingPillars || data.pillars || []),
    competitorWeaknessesToAttack: ensureInsightArray(data.competitorWeaknessesToAttack || []),
    confidenceScore: ensureNumber(data.confidenceScore, 0),
    provider: ensureString(data.provider, 'fallback')
  };
}

/**
 * Validate and normalize Campaign Generator response
 */
export function validateCampaignGenerator(data, input) {
  if (!data || typeof data !== 'object') {
    return generateCampaignFallback(input);
  }

  return {
    creativeAngles: ensureInsightArray(data.creativeAngles || data.angles || []),
    copyHooks: ensureInsightArray(data.copyHooks || data.hooks || []),
    ctaSuggestions: ensureInsightArray(data.ctaSuggestions || data.ctas || []),
    emailSequence: ensureInsightArray(data.emailSequence || []),
    socialPostIdeas: ensureInsightArray(data.socialPostIdeas || data.socialPosts || []),
    videoIdeas: ensureInsightArray(data.videoIdeas || []),
    actionPlan: validateActionPlan(data.actionPlan || {}),
    nextActions: ensureStringArray(data.nextActions || []),
    campaignIdeas: ensureInsightArray(data.campaignIdeas || []),
    confidenceScore: ensureNumber(data.confidenceScore, 0),
    provider: ensureString(data.provider, 'fallback')
  };
}

/**
 * Validate and normalize Action Plan
 */
export function validateActionPlan(actionPlan) {
  if (!actionPlan || typeof actionPlan !== 'object') {
    return {
      sevenDay: [],
      thirtyDay: [],
      sixtyDay: [],
      ninetyDay: []
    };
  }

  return {
    sevenDay: ensureActionArray(actionPlan.sevenDay || actionPlan.day7 || []),
    thirtyDay: ensureActionArray(actionPlan.thirtyDay || actionPlan.day30 || []),
    sixtyDay: ensureActionArray(actionPlan.sixtyDay || actionPlan.day60 || []),
    ninetyDay: ensureActionArray(actionPlan.ninetyDay || actionPlan.day90 || [])
  };
}

/**
 * Validate and normalize Channel Recommendation response
 */
export function validateChannelRecommendation(data, input) {
  if (!data || typeof data !== 'object') {
    return generateChannelFallback(input);
  }

  return {
    recommendedChannels: ensureChannelArray(data.recommendedChannels || data.channels || []),
    channels: ensureChannelArray(data.recommendedChannels || data.channels || []),
    primaryChannel: ensureString(data.primaryChannel || data.recommendedChannels?.[0]?.channel || data.channels?.[0]?.name),
    budgetSplit: ensureInsightArray(data.budgetSplit || []),
    channelFitScores: ensureInsightArray(data.channelFitScores || []),
    postingFrequency: ensureInsightArray(data.postingFrequency || []),
    contentTypes: ensureInsightArray(data.contentTypes || []),
    confidenceScore: ensureNumber(data.confidenceScore, 0),
    provider: ensureString(data.provider, 'fallback')
  };
}

/**
 * Known placeholder values that indicate AI failed to generate real content.
 * Only match exact strings or strings that ARE these values (not substring matches).
 */
const PLACEHOLDER_PHRASES = [
  'compelling headline here',
  'untitled brief',
  'general audience',
  'to be determined',
  'lorem ipsum',
  'your brand here',
  'your company here',
  'your product here',
  'your business here',
  'new analysis',
  'growth analysis',
  'problem introduction',
  'solution presentation',
  'proof and social proof',
  'get started',
];

/**
 * Check if a string contains placeholder content
 * @param {string} str - String to check
 * @returns {boolean} - True if contains placeholder
 */
export function containsPlaceholder(str) {
  if (!str || typeof str !== 'string') return true;
  const cleaned = str.trim().toLowerCase();
  if (cleaned.length === 0) return true;
  return PLACEHOLDER_PHRASES.some(phrase => {
    if (cleaned === phrase) return true;
    if (cleaned.startsWith(phrase + ' ') || cleaned.startsWith(phrase + '.')) return true;
    if (cleaned.endsWith(' ' + phrase) || cleaned.endsWith(' ' + phrase + '.')) return true;
    return false;
  });
}

/**
 * Validate creative content (posters, videos, ads) for placeholder values
 * @param {Object} content - Creative content object
 * @returns {Object} - { valid: boolean, issues: string[] }
 */
export function validateCreativeContent(content) {
  const issues = [];
  if (!content || typeof content !== 'object') {
    return { valid: false, issues: ['Content is null or not an object'] };
  }

  const fieldsToCheck = ['headline', 'subheadline', 'cta', 'title', 'description', 'prompt'];
  for (const field of fieldsToCheck) {
    if (content[field] !== undefined && containsPlaceholder(content[field])) {
      issues.push(`${field} contains placeholder value: "${content[field]}"`);
    }
  }

  if (content.scenes && Array.isArray(content.scenes)) {
    content.scenes.forEach((scene, i) => {
      if (scene.visual && containsPlaceholder(scene.visual)) {
        issues.push(`scene[${i}].visual contains placeholder value`);
      }
      if (scene.voiceover && containsPlaceholder(scene.voiceover)) {
        issues.push(`scene[${i}].voiceover contains placeholder value`);
      }
    });
  }

  if (content.audience && containsPlaceholder(content.audience)) {
    issues.push('audience contains placeholder value');
  }

  return { valid: issues.length === 0, issues };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Ensure value is a non-empty string
 */
function ensureString(value, fallback = '') {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  if (typeof value === 'object' && value?.value) {
    return ensureString(value.value, fallback);
  }
  return fallback;
}

/**
 * Ensure value is a valid number
 */
function ensureNumber(value, fallback = 0) {
  const num = Number(value);
  if (isNaN(num) || num < 0) {
    return fallback;
  }
  return Math.min(100, Math.max(0, Math.round(num)));
}

/**
 * Ensure value is an array of strings
 */
function ensureStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(v => typeof v === 'string' && v.trim().length > 0).map(v => v.trim());
}

/**
 * Ensure value is an array of insight objects
 */
function ensureInsightArray(value) {
  if (!Array.isArray(value)) return [];
  
  return value.map(item => {
    // If it's already a string, convert to insight object
    if (typeof item === 'string') {
      return {
        value: item,
        confidence: 75,
        impact: 'Medium'
      };
    }
    
    // If it's an object, normalize it
    if (typeof item === 'object' && item !== null) {
      return {
        value: ensureString(item.value || item.insight || item.recommendation || item.opportunity || item.risk || item.trend || item),
        confidence: ensureNumber(item.confidence, 0),
        impact: ensureString(item.impact || item.priority, 'Low')
      };
    }
    
    return null;
  }).filter(item => item !== null && item.value.length > 0);
}

/**
 * Ensure value is an array of persona objects
 */
function ensurePersonaArray(value) {
  if (!Array.isArray(value)) return [];
  
  return value.map(persona => {
    if (typeof persona !== 'object' || persona === null) return null;
    
    return {
      name: ensureString(persona.name || persona.personaName, 'Target Persona'),
      demographics: ensureString(persona.demographics || persona.description),
      intentScore: ensureNumber(persona.intentScore || persona.score, 0),
      goals: ensureStringArray(persona.goals || []),
      painPoints: ensureStringArray(persona.painPoints || []),
      buyingMotivations: ensureStringArray(persona.buyingMotivations || persona.motivations || [])
    };
  }).filter(p => p !== null);
}

/**
 * Ensure value is an array of competitor objects
 */
function ensureCompetitorArray(value) {
  if (!Array.isArray(value)) return [];
  
  return value.map(comp => {
    if (typeof comp !== 'object' || comp === null) return null;
    
    return {
      name: ensureString(comp.name || comp.competitorName, 'Competitor'),
      domain: ensureString(comp.domain || comp.url || comp.website),
      opportunityScore: ensureNumber(comp.opportunityScore || comp.score, 0),
      strengths: ensureStringArray(comp.strengths || []),
      weaknesses: ensureStringArray(comp.weaknesses || []),
      positioning: ensureString(comp.positioning || comp.description)
    };
  }).filter(c => c !== null);
}

/**
 * Ensure value is an array of channel objects
 */
function ensureChannelArray(value) {
  if (!Array.isArray(value)) return [];
  
  return value.map(channel => {
    if (typeof channel === 'string') {
      return {
        channel: channel,
        name: channel,
        budgetAllocation: 0,
        expectedRoi: 0,
        confidence: 0
      };
    }
    
    if (typeof channel === 'object' && channel !== null) {
      return {
        channel: ensureString(channel.channel || channel.name, 'Channel'),
        name: ensureString(channel.channel || channel.name, 'Channel'),
        budgetAllocation: ensureNumber(channel.budgetAllocation || channel.budget, 0),
        expectedRoi: ensureNumber(channel.expectedRoi || channel.roi, 0),
        confidence: ensureNumber(channel.confidence, 0),
        reasoning: ensureString(channel.reasoning || channel.reason)
      };
    }
    
    return null;
  }).filter(c => c !== null);
}

/**
 * Ensure value is an array of action item objects
 */
function ensureActionArray(value) {
  if (!Array.isArray(value)) return [];
  
  return value.map(action => {
    if (typeof action === 'string') {
      return {
        title: action,
        priority: 'Medium',
        difficulty: 'Medium',
        estimatedTimeline: '1-2 weeks',
        owner: 'Team'
      };
    }
    
    if (typeof action === 'object' && action !== null) {
      return {
        title: ensureString(action.title || action.task || action.action, 'Action Item'),
        problem: ensureString(action.problem),
        evidence: ensureString(action.evidence),
        researchSource: ensureString(action.researchSource || action.source),
        businessImpact: ensureString(action.businessImpact || action.impact),
        expectedGain: ensureString(action.expectedGain || action.gain),
        difficulty: ensureString(action.difficulty, 'Low'),
        priority: ensureString(action.priority, 'low'),
        estimatedTimeline: ensureString(action.estimatedTimeline || action.timeline, '1-2 weeks'),
        owner: ensureString(action.owner, 'Team')
      };
    }
    
    return null;
  }).filter(a => a !== null);
}

// ============================================
// SIMPLE FALLBACK GENERATORS
// ============================================

function generateProductFallback(input) {
  const productName = input?.productName || input?.brandName || 'Product';
  return {
    usp: `Innovative solution for ${input?.industry || 'market'}`,
    summary: `${productName} provides value to customers`,
    productSummary: `${productName} provides value to customers`,
    keyFeatures: [
      { value: 'Core functionality', confidence: 0, impact: 'Low' }
    ],
    features: [
      { value: 'Core functionality', confidence: 0, impact: 'Low' }
    ],
    coreBenefits: [
      { value: 'Saves time', confidence: 0, impact: 'Low' }
    ],
    painPointsSolved: [
      { value: 'Inefficiency', confidence: 0, impact: 'Low' }
    ],
    painPoints: [
      { value: 'Inefficiency', confidence: 0, impact: 'Low' }
    ],
    targetUsers: [
      { value: input?.targetAudience || 'Business users', confidence: 0, impact: 'Low' }
    ],
    differentiators: [
      { value: 'Unique approach', confidence: 0, impact: 'Low' }
    ],
    jobsToBeDone: [
      { value: 'Solve core problem', confidence: 0, impact: 'Low' }
    ],
    confidenceScore: 0,
    provider: 'fallback'
  };
}

function generateMarketFallback(input) {
  return {
    demandScore: 0,
    confidence: 0,
    confidenceScore: 0,
    tam: 'Insufficient Data',
    sam: 'Insufficient Data',
    som: 'Insufficient Data',
    cagr: 'Insufficient Data',
    marketTrends: [
      { value: 'Market trend data unavailable. No verified source found.', confidence: 0, impact: 'Low' }
    ],
    opportunities: [
      { value: 'Market opportunity data unavailable. No verified source found.', confidence: 0, impact: 'Low' }
    ],
    growthOpportunities: [
      { value: 'Growth opportunity data unavailable. No verified source found.', confidence: 0, impact: 'Low' }
    ],
    risks: [
      { value: 'Market risk data unavailable. No verified source found.', confidence: 0, impact: 'Low' }
    ],
    marketRisks: [
      { value: 'Market risk data unavailable. No verified source found.', confidence: 0, impact: 'Low' }
    ],
    entryStrategy: 'Market entry strategy unavailable. No verified source found.',
    provider: 'fallback'
  };
}

function generateAudienceFallback(input) {
  return {
    buyerPersonas: [
      {
        name: input?.targetAudience || 'Target User',
        demographics: 'Audience data unavailable. No verified source found.',
        intentScore: 0,
        goals: [],
        painPoints: [],
        buyingMotivations: []
      }
    ],
    personas: [
      {
        name: input?.targetAudience || 'Target User',
        demographics: 'Audience data unavailable. No verified source found.',
        intentScore: 0,
        goals: [],
        painPoints: [],
        buyingMotivations: []
      }
    ],
    buyingTriggers: [
      { value: 'Buying trigger data unavailable. No verified source found.', confidence: 0, impact: 'Low' }
    ],
    commonObjections: [
      { value: 'Objection data unavailable. No verified source found.', confidence: 0, impact: 'Low' }
    ],
    bestChannels: [
      { value: 'Channel data unavailable. No verified source found.', confidence: 0, impact: 'Low' }
    ],
    decisionMakers: [
      { value: 'Decision maker data unavailable. No verified source found.', confidence: 0, impact: 'Low' }
    ],
    confidenceScore: 0,
    provider: 'fallback'
  };
}

function generateCompetitorFallback(input) {
  return {
    directCompetitors: [],
    competitorMatrix: 'Competitive landscape analysis unavailable - SERP API required',
    differentiationOpportunities: [
      { value: 'Competitor data unavailable. No verified source found.', confidence: 0, impact: 'Low' }
    ],
    marketGaps: [
      { value: 'Market gap analysis unavailable. No verified source found.', confidence: 0, impact: 'Low' }
    ],
    competitorWeaknesses: [
      { value: 'Competitor analysis unavailable. No verified source found.', confidence: 0, impact: 'Low' }
    ],
    confidenceScore: 0,
    provider: 'fallback'
  };
}

function generateIntentFallback(input) {
  return {
    hotSegments: [
      { value: 'Intent data unavailable. No verified source found.', confidence: 0, impact: 'Low' }
    ],
    highIntentSegments: [
      { value: 'Intent data unavailable. No verified source found.', confidence: 0, impact: 'Low' }
    ],
    warmSegments: [
      { value: 'Intent data unavailable. No verified source found.', confidence: 0, impact: 'Low' }
    ],
    coldSegments: [
      { value: 'Intent data unavailable. No verified source found.', confidence: 0, impact: 'Low' }
    ],
    buyingSignals: [
      { value: 'Buying signal data unavailable. No verified source found.', confidence: 0, impact: 'Low' }
    ],
    triggerEvents: [
      { value: 'Trigger event data unavailable. No verified source found.', confidence: 0, impact: 'Low' }
    ],
    leadScoringRules: [
      { value: 'Lead scoring data unavailable. No verified source found.', confidence: 0, impact: 'Low' }
    ],
    confidenceScore: 0,
    provider: 'fallback'
  };
}

function generatePositioningFallback(input) {
  const productName = input?.productName || input?.brandName || 'Product';
  return {
    positioningStatement: `${productName} positioning unavailable. No verified source found.`,
    statement: `${productName} positioning unavailable. No verified source found.`,
    valueProposition: 'Value proposition unavailable. No verified source found.',
    brandPromise: 'Brand promise unavailable. No verified source found.',
    messagingPillars: [
      { value: 'Messaging pillar data unavailable. No verified source found.', confidence: 0, impact: 'Low' }
    ],
    pillars: [
      { value: 'Messaging pillar data unavailable. No verified source found.', confidence: 0, impact: 'Low' }
    ],
    competitorWeaknessesToAttack: [
      { value: 'Competitor weakness data unavailable. No verified source found.', confidence: 0, impact: 'Low' }
    ],
    confidenceScore: 0,
    provider: 'fallback'
  };
}

function generateCampaignFallback(input) {
  return {
    creativeAngles: [
      { value: 'Creative angle data unavailable. No verified source found.', confidence: 0, impact: 'Low' }
    ],
    copyHooks: [
      { value: 'Copy hook data unavailable. No verified source found.', confidence: 0, impact: 'Low' }
    ],
    ctaSuggestions: [
      { value: 'CTA data unavailable. No verified source found.', confidence: 0, impact: 'Low' }
    ],
    emailSequence: [
      { value: 'Email sequence data unavailable. No verified source found.', confidence: 0, impact: 'Low' }
    ],
    socialPostIdeas: [
      { value: 'Social post data unavailable. No verified source found.', confidence: 0, impact: 'Low' }
    ],
    videoIdeas: [
      { value: 'Video idea data unavailable. No verified source found.', confidence: 0, impact: 'Low' }
    ],
    actionPlan: {
      sevenDay: [],
      thirtyDay: [],
      sixtyDay: [],
      ninetyDay: []
    },
    nextActions: ['Campaign data unavailable. No verified source found.'],
    campaignIdeas: [
      { value: 'Campaign idea data unavailable. No verified source found.', confidence: 0, impact: 'Low' }
    ],
    confidenceScore: 0,
    provider: 'fallback'
  };
}

function generateChannelFallback(input) {
  return {
    recommendedChannels: [],
    channels: [],
    primaryChannel: 'Channel data unavailable. No verified source found.',
    budgetSplit: [
      { value: 'Budget split data unavailable. No verified source found.', confidence: 0, impact: 'Low' }
    ],
    channelFitScores: [
      { value: 'Channel fit data unavailable. No verified source found.', confidence: 0, impact: 'Low' }
    ],
    postingFrequency: [
      { value: 'Posting frequency data unavailable. No verified source found.', confidence: 0, impact: 'Low' }
    ],
    contentTypes: [
      { value: 'Content type data unavailable. No verified source found.', confidence: 0, impact: 'Low' }
    ],
    confidenceScore: 0,
    provider: 'fallback'
  };
}
