import { callAI } from "../../domains/ai/services/aiOrchestrator.service.js";
import { resolveProductIdentity } from "../resolvers/product-identity.resolver.js";
import { createStableHash } from "../../utils/stable-hash.js";

/**
 * Safely extract JSON from AI response with repair logic
 * Handles markdown code blocks, trailing commas, and common JSON errors
 */
function safeExtractJSON(data) {
  if (!data) return null;
  
  let jsonString = data;
  
  // If already an object, return it
  if (typeof data === 'object') {
    return data;
  }
  
  // If string, try to extract JSON
  if (typeof data === 'string') {
    // Remove markdown code blocks
    jsonString = jsonString.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Remove leading/trailing whitespace
    jsonString = jsonString.trim();
    
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      // Try to repair common JSON errors
      
      // Remove trailing commas
      jsonString = jsonString.replace(/,\s*([}\]])/g, '$1');
      
      // Fix unquoted keys (basic)
      jsonString = jsonString.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
      
      try {
        return JSON.parse(jsonString);
      } catch (e2) {
        console.warn('[CampaignIntelligence] JSON repair failed', { error: e2.message });
        return null;
      }
    }
  }
  
  return null;
}

export async function generateCampaignIntelligence({ userId, chatId, evidenceContext }) {
  const ec = evidenceContext || {};

  if (!ec || ec.rejected) {
    return { _noData: true, reason: ec?.reason || "No evidence context available" };
  }

  const product = ec.product || {};
  const company = ec.company || {};
  const website = ec.website || {};
  const audience = ec.audience || {};
  const competitors = ec.competitors || {};
  const seo = ec.seo || {};
  const channels = ec.channels || [];
  const growth = ec.growth || {};
  const sources = ec.sourceSummary || {};
  const market = ec.market || null;
  const technology = ec.technology || null;
  const positioning = ec.positioning || null;
  const pricing = ec.pricing || null;

  // PART 13: Use canonical product identity resolver for product-specific campaigns
  const productIdentity = resolveProductIdentity({
    chat: ec.chatId ? { id: ec.chatId, title: company.name?.value || company.productName?.value, websiteUrl: company.websiteUrl?.value } : null,
    productIntelligence: product.name?.value ? { productName: product.name.value, brandName: product.brandName?.value, companyName: company.name?.value } : null,
    evidenceSnapshot: ec._raw?.evidence || null,
    website: website
  });

  console.info("[CampaignIntelligence] Product identity resolved for campaign", {
    userId, chatId,
    productName: productIdentity.productName,
    brandName: productIdentity.brandName,
    source: productIdentity.source
  });

  // Validate product identity is not generic before proceeding
  const INVALID_PRODUCT_IDENTITIES = new Set([
    'unknown product', 'new analysis', 'new & featured', 'untitled',
    'new project', 'growth analysis', 'featured', 'home',
  ]);
  
  const normalizedName = (productIdentity.productName || '').toLowerCase().trim();
  if (!productIdentity.productName || INVALID_PRODUCT_IDENTITIES.has(normalizedName) || normalizedName.length < 2) {
    console.warn("[CampaignIntelligence] Invalid product identity - blocking campaign generation", {
      userId, chatId,
      productName: productIdentity.productName,
      normalizedName
    });
    return {
      _noData: true,
      reason: `Invalid product identity: "${productIdentity.productName || 'none'}" â€” campaign generation requires verified product`,
      code: 'INVALID_PRODUCT_IDENTITY'
    };
  }

  // PART 12: Reconcile evidence before generation
  const evidenceReconciliation = reconcileEvidence({
    product, company, website, audience, competitors, seo, channels, growth, sources, market, technology, positioning
  });
  
  console.info("[CampaignIntelligence] Evidence reconciliation", {
    userId, chatId,
    contradictions: evidenceReconciliation.contradictions.length,
    warnings: evidenceReconciliation.warnings.length,
    quality: evidenceReconciliation.overallQuality
  });

  let lastError = null;
  let attempt = 0;
  const maxAttempts = 2; // One retry on failure

  // PART 11: Implement retry logic with JSON repair
  while (attempt < maxAttempts) {
    attempt++;
    try {
      const prompt = buildCampaignPrompt({
        product, company, website, audience, competitors, seo, channels, growth, sources, productIdentity, market, technology, positioning
      });

      const aiResult = await callAI(prompt);

      if (aiResult.success && aiResult.data) {
        const parsed = safeExtractJSON(aiResult.data);
        
        if (parsed) {
          const validated = validateCampaignOutput(parsed, evidenceReconciliation);
          if (validated && !validated._noData) {
            // Override metadata with attempt info
            validated._metadata.attempts = attempt;
            validated._metadata.evidenceReconciliation = evidenceReconciliation;
            console.info("[CampaignIntelligence] AI generation succeeded", { userId, chatId, attempts: attempt });
            return validated;
          }
        }
        
        lastError = "AI returned invalid or malformed JSON";
        console.warn("[CampaignIntelligence] AI returned invalid JSON", { userId, chatId, attempt });
      }
    } catch (err) {
      lastError = err.message;
      console.warn("[CampaignIntelligence] AI generation attempt failed", { userId, chatId, attempt, error: err.message });
    }
  }

  // PART 11: Use deterministic evidence-based fallback with proper metadata
  console.warn("[CampaignIntelligence] Using fallback after AI failures", { userId, chatId, attempts: maxAttempts, lastError });
  
  const fallbackResult = generateEvidenceBasedCampaign({
    product, company, website, audience, competitors, seo, channels, growth, sources, productIdentity, market, technology, positioning
  });

  // Mark as partially generated with fallback
  fallbackResult._metadata = {
    generatedAt: new Date().toISOString(),
    provider: "RULE_BASED_FALLBACK",
    fallbackUsed: true,
    generationStatus: "PARTIALLY_GENERATED",
    generationMode: "FALLBACK",
    attempts: maxAttempts,
    warnings: [
      `AI provider failed after ${maxAttempts} attempts`,
      lastError || "Malformed provider output",
      "Campaign generated using evidence-based rules"
    ],
    fallbackReason: lastError || "AI generation failed, used evidence-based fallback",
    evidenceReconciliation
  };

  return fallbackResult;
}

function buildCampaignPrompt(context) {
  const { product, company, website, audience, competitors, seo, channels, growth, sources, productIdentity, market, technology, positioning } = context;

  const evidenceLines = [];

  // PART 13: Use canonical product identity for product-specific campaigns
  if (productIdentity?.productName) evidenceLines.push(`Product Name: ${productIdentity.productName}`);
  if (productIdentity?.brandName) evidenceLines.push(`Brand Name: ${productIdentity.brandName}`);
  if (productIdentity?.companyName) evidenceLines.push(`Company Name: ${productIdentity.companyName}`);
  if (company.industry?.value) evidenceLines.push(`Industry: ${company.industry.value}`);
  if (company.websiteUrl?.value) evidenceLines.push(`Website: ${company.websiteUrl.value}`);
  if (product.usp?.value) evidenceLines.push(`USP: ${product.usp.value}`);
  if (product.description?.value) evidenceLines.push(`Description: ${product.description.value}`);
  if (product.features?.value?.length) evidenceLines.push(`Features: ${product.features.value.slice(0, 8).join(", ")}`);
  if (product.benefits?.value?.length) evidenceLines.push(`Benefits: ${product.benefits.value.slice(0, 5).join(", ")}`);
  if (website.heroText?.value) evidenceLines.push(`Hero Text: ${website.heroText.value}`);
  if (website.ctaTexts?.value?.length) evidenceLines.push(`CTAs Found: ${website.ctaTexts.value.join(", ")}`);
  if (website.title?.value) evidenceLines.push(`Website Title: ${website.title.value}`);
  if (website.metaDescription?.value) evidenceLines.push(`Meta Description: ${website.metaDescription.value}`);

  if (audience) {
    if (audience.primary?.value) evidenceLines.push(`Primary Audience: ${audience.primary.value}`);
    if (audience.personas?.value?.length) {
      audience.personas.value.slice(0, 3).forEach(p => {
        evidenceLines.push(`Persona: ${p.name || p.title || p.role || "Unnamed"} â€” ${(p.painPoints || []).slice(0, 2).join(", ")}`);
      });
    }
    if (audience.painPoints?.value?.length) evidenceLines.push(`Pain Points: ${audience.painPoints.value.slice(0, 5).join(", ")}`);
  }

  if (competitors?.list?.value?.length) {
    evidenceLines.push(`Competitors: ${competitors.list.value.slice(0, 5).map(c => c.name || c.domain || "Unknown").join(", ")}`);
  }

  if (seo) {
    if (seo.issues?.value?.length) evidenceLines.push(`SEO Issues: ${seo.issues.value.slice(0, 5).map(i => i.action || i.title || i).join("; ")}`);
    if (seo.contentOpportunities?.value?.length) evidenceLines.push(`SEO Content Opportunities: ${seo.contentOpportunities.value.slice(0, 5).map(o => o.opportunity || o.title || o).join("; ")}`);
    if (seo.keywords?.value?.length) evidenceLines.push(`SEO Keywords: ${seo.keywords.value.slice(0, 10).map(k => k.keyword || k).join(", ")}`);
  }

  if (channels?.length) {
    evidenceLines.push(`Suggested Channels: ${channels.map(c => c.channel || c.name).join(", ")}`);
  }

  if (growth?.overallScore?.value != null) {
    evidenceLines.push(`Growth Score: ${growth.overallScore.value}/100`);
  }

  // ==== MARKET RESEARCH ====
  if (market && market.status === 'measured') {
    if (market.overview) evidenceLines.push(`Market Overview: ${market.overview}`);
    if (market.size != null) evidenceLines.push(`Market Size: ${market.size}`);
    if (market.growthRate != null) evidenceLines.push(`Market Growth Rate: ${market.growthRate}`);
    if (market.segments?.length) evidenceLines.push(`Market Segments: ${market.segments.slice(0, 5).map(s => typeof s === 'string' ? s : (s.name || s.segment || JSON.stringify(s))).join(", ")}`);
    if (market.trends?.length) evidenceLines.push(`Market Trends: ${market.trends.slice(0, 5).map(t => typeof t === 'string' ? t : (t.trend || t.name || JSON.stringify(t))).join(", ")}`);
    if (market.drivers?.length) evidenceLines.push(`Market Drivers: ${market.drivers.slice(0, 5).map(d => typeof d === 'string' ? d : (d.driver || d.name || JSON.stringify(d))).join(", ")}`);
    if (market.opportunities?.length) evidenceLines.push(`Market Opportunities: ${market.opportunities.slice(0, 5).map(o => typeof o === 'string' ? o : (o.opportunity || o.title || JSON.stringify(o))).join(", ")}`);
  }

  // ==== TECHNOLOGY RESEARCH ====
  if (technology && technology.status === 'measured') {
    if (technology.stack?.length) evidenceLines.push(`Technology Stack: ${technology.stack.slice(0, 8).join(", ")}`);
    if (technology.integrations?.length) evidenceLines.push(`Integrations: ${technology.integrations.slice(0, 6).join(", ")}`);
    if (technology.platforms?.length) evidenceLines.push(`Platforms: ${technology.platforms.slice(0, 5).join(", ")}`);
  }

  // ==== POSITIONING RESEARCH ====
  if (positioning) {
    const posText = typeof positioning === 'string' ? positioning : JSON.stringify(positioning);
    evidenceLines.push(`Competitive Positioning: ${posText.substring(0, 300)}`);
  }
  if (competitors?.positioning?.value) {
    evidenceLines.push(`Competitor Positioning: ${String(competitors.positioning.value).substring(0, 300)}`);
  }

  // ==== PRICING RESEARCH ====
  const pricingValue = product.pricing?.value ?? product.pricing;
  if (pricingValue) {
    evidenceLines.push(`Pricing: ${typeof pricingValue === 'string' ? pricingValue : (pricingValue.model || pricingValue.type || pricingValue.plan || JSON.stringify(pricingValue))}`);
  }

  evidenceLines.push(`Evidence Sources: ${sources.sourcesCollected?.join(", ") || "none"}`);

  const fingerprint = generateFingerprint(context);

  return `You are the Campaign Intelligence Engine for an AI Marketing Platform. Your role is to plan evidence-based marketing campaigns.

CAMPAIGN FINGERPRINT: ${fingerprint}

EVIDENCE FROM ANALYSIS:
${evidenceLines.join("\n")}

RULES (ABSOLUTE):
1. Use ONLY the evidence above. Do NOT invent any data.
2. Do NOT fabricate ROI, conversion rates, budgets, revenue numbers, or statistics.
3. Every field MUST include "reason" (why this was chosen) and "evidence" (what data supports it).
4. If evidence is insufficient, use "Insufficient evidence" as the reason.
5. Never use placeholder text, lorem ipsum, or filler content.
6. Do NOT generate fake percentages, fake growth numbers, or fake performance metrics.
7. CRITICAL: This campaign is for a SPECIFIC product with a unique identity. DO NOT generate a generic 90-day skeleton. Derive the actual strategy from the evidence provided. The campaign name, theme, channels, funnel, and KPIs must be uniquely derived from THIS product's evidence.
8. For marketingFunnel, only include stages that the evidence genuinely supports. Do NOT generate all six standard stages (awareness/interest/consideration/conversion/retention/advocacy). Instead, create only 2-4 stages that match the campaign goal, audience, and product evidence. Each stage must reference specific evidence for its inclusion. If the funnel would be empty, set it to an empty object.
9. For kpiFramework, each KPI must include: name, businessDefinition, formula, eventSource, analyticsTool, baselineStatus (one of BASELINE_REQUIRED/TRACKABLE_NOT_CONNECTED/CONNECTED/UNAVAILABLE), targetStatus, reportingFrequency, owner, attributionWindow. Do NOT invent baseline or target values.
10. For channelRecommendations, each channel must include: channel, role, targetSegment, buyingStage, objective, targeting, message, contentFormats, landingDestination, cta, budgetLogic, kpis, testIdeas, evidence, confidence. Do NOT default to Google Ads + LinkedIn.
11. The campaign may be for an early-stage product with limited evidence. In that case, focus on validation and learning, not a full-funnel rollout.
12. For marketingStrategy: derive the strategy narrative, pillars, positioning and differentiation ONLY from the evidence provided (market research, audience, competitors, SEO, pricing, technology, product). Do NOT write generic strategy statements. Every pillar must name the evidence that supports it. If market/technology/positioning evidence is missing, say so explicitly in the researchCoverage list.
13. For budget: NEVER fabricate a total budget or absolute spend numbers. Provide percentage allocation across channels with "basis" (the evidence/logic behind the split) and mark budget.status as "proposed" with an inputSummary requiring the user's actual budget to be set.
14. For forecast: NEVER fabricate numeric outcomes (conversion rates, revenue, leads). Provide qualitative scenarios (conservative/moderate/aggressive) with assumptions derived from evidence and explicitly state "no numeric forecast" when metrics are absent.
15. For roi: define the ROI framework with formula and inputs. Every input must have a "source" naming the evidence (or "not yet measured"). No invented numbers.
16. For emailCampaigns, ads, landingPages, socialPosts: every piece of copy must reference evidence (pain points, competitors, SEO keywords, pricing, positioning). Include the specific subject lines, headlines, hooks and CTAs. Do not repeat the same angle across campaigns — vary by audience/segment.

Return valid JSON with this exact structure (no markdown, no code fences):

{
  "executiveSummary": {
    "campaignName": "Evidence-based campaign name derived from product + goal",
    "campaignTheme": "Central theme based on evidence",
    "campaignGoal": "Primary campaign goal derived from evidence",
    "recommendedDuration": "Duration based on goals (e.g. 90 days, 60 days)",
    "primaryAudience": { "value": "audience name", "reason": "why", "evidence": "what data" },
    "primaryChannels": [{ "channel": "name", "reason": "why", "evidence": "what data" }],
    "topOpportunities": [{ "title": "opp", "reason": "why", "evidence": "what data" }],
    "topRisks": [{ "risk": "risk", "reason": "why", "evidence": "what data" }],
    "nextActions": [{ "action": "what to do", "owner": "who", "priority": "high/medium/low", "evidence": "what data" }]
  },
  "businessGoal": {
    "goal": "One of: Launch Product, Increase Leads, Increase Sales, Brand Awareness, SEO Growth, Product Adoption, Retention, Upsell, Community Growth, Enterprise Sales, Hiring, Funding",
    "confidence": "high/medium/low",
    "reason": "why this goal was determined",
    "evidence": "what evidence supports it"
  },
  "campaignObjective": {
    "primary": { "value": "primary objective", "reason": "why", "evidence": "what data" },
    "secondary": { "value": "secondary objective or null", "reason": "why", "evidence": "what data" },
    "successDefinition": { "value": "how success is measured", "reason": "why", "evidence": "what data" },
    "targetAudience": { "value": "target audience description", "reason": "why", "evidence": "what data" },
    "idealCustomer": { "value": "ideal customer profile or null", "reason": "why", "evidence": "what data" },
    "timeline": { "value": "campaign timeline", "reason": "why", "evidence": "what data" },
    "priority": "high/medium/low",
    "dependencies": [{ "dependency": "what depends", "reason": "why" }]
  },
  "audienceSelection": {
    "primaryAudience": { "value": "audience", "reason": "why", "evidence": "what data" },
    "secondaryAudience": { "value": "audience or null", "reason": "why", "evidence": "what data" },
    "buyingStage": { "value": "awareness/consideration/decision or null", "reason": "why", "evidence": "what data" },
    "painPoints": [{ "value": "pain point", "evidence": "what data" }],
    "decisionDrivers": [{ "value": "driver", "evidence": "what data" }],
    "objections": [{ "value": "objection", "evidence": "what data" }],
    "contentPreferences": [{ "value": "content type", "evidence": "what data" }]
  },
  "channelRecommendations": [
    {
      "channel": "channel name",
      "fit": "high/medium/low",
      "priority": "high/medium/low",
      "reason": "why this channel fits",
      "evidence": "what evidence supports it",
      "recommendedContent": "what content to create",
      "recommendedCTA": "what call to action",
      "organicOrPaid": "organic/paid/both"
    }
  ],
  "timeline": {
    "week1": [{ "title": "task", "description": "details", "dependency": "what depends on this", "ownerRole": "who", "evidence": "why" }],
    "week2": [{ "title": "task", "description": "details", "dependency": "what depends on this", "ownerRole": "who", "evidence": "why" }],
    "week3": [{ "title": "task", "description": "details", "dependency": "what depends on this", "ownerRole": "who", "evidence": "why" }],
    "week4": [{ "title": "task", "description": "details", "dependency": "what depends on this", "ownerRole": "who", "evidence": "why" }],
    "month2": [{ "title": "task", "description": "details", "dependency": "what depends on this", "ownerRole": "who", "evidence": "why" }],
    "month3": [{ "title": "task", "description": "details", "dependency": "what depends on this", "ownerRole": "who", "evidence": "why" }]
  },
  "marketingFunnel": {
    "[stage_name]": { "objective": "goal", "channels": ["ch1"], "content": "content type", "cta": "call to action", "measurement": "how to measure" }
  },
  "kpiFramework": [
    { "kpi": "KPI name", "howToMeasure": "method", "tool": "tool name", "frequency": "weekly/monthly", "status": "Measured or Estimated or Not Yet Measured" }
  ],
  "riskAssessment": [
    { "risk": "risk description", "cause": "what causes it", "evidence": "evidence", "severity": "high/medium/low", "mitigation": "how to mitigate" }
  ],
  "opportunityAssessment": [
    { "opportunity": "opportunity description", "reason": "why", "evidence": "evidence", "effort": "high/medium/low", "priority": "high/medium/low", "expectedBusinessImpact": "impact description (no revenue numbers)" }
  ],
  "marketingStrategy": {
    "narrative": "strategy narrative derived from evidence (not generic)",
    "pillars": [{ "name": "pillar name", "description": "what it covers", "evidence": "supporting evidence" }],
    "positioning": { "statement": "positioning statement", "basis": "evidence for it", "differentiators": [{ "differentiator": "x", "evidence": "evidence" }] },
    "researchCoverage": [{ "area": "research/audience/competitors/seo/pricing/technology/market/product/positioning", "status": "measured/unavailable", "note": "what data was used" }]
  },
  "emailCampaigns": [
    { "name": "campaign name", "objective": "objective", "audience": "segment", "sequence": ["Email 1 subject", "Email 2 subject", "Email 3 subject"], "angles": ["angle per email"], "cta": "call to action", "evidence": "supporting evidence" }
  ],
  "ads": [
    { "platform": "ad platform", "objective": "objective", "headline": "ad headline", "primaryText": "ad copy", "audience": "targeting description", "cta": "call to action", "angle": "angle used", "evidence": "supporting evidence" }
  ],
  "landingPages": [
    { "name": "page name", "purpose": "conversion goal", "headline": "hero headline", "sections": ["section outline"], "seoKeywords": ["keywords"], "cta": "call to action", "evidence": "supporting evidence" }
  ],
  "socialPosts": [
    { "platform": "LinkedIn/Instagram/X/Facebook", "hook": "opening hook", "body": "post body", "cta": "call to action", "angle": "angle used", "audience": "segment", "evidence": "supporting evidence" }
  ],
  "creativeAngles": [
    { "angle": "angle name", "source": "where it comes from (pain point, competitor gap, USP, trend)", "evidence": "supporting evidence", "bestFor": "channel or format it fits" }
  ],
  "budget": {
    "status": "proposed",
    "total": null,
    "currency": null,
    "allocation": [{ "category": "channel/area", "percentage": 0, "basis": "logic and evidence for the split" }],
    "notes": ["assumptions and dependencies"],
    "inputSummary": "what the user must provide to finalize the budget"
  },
  "forecast": {
    "status": "qualitative",
    "disclaimer": "explicit statement that no numeric outcomes are fabricated",
    "scenarios": [{ "scenario": "conservative/moderate/aggressive", "description": "what could happen", "assumptions": ["assumptions from evidence"], "evidence": "supporting evidence" }],
    "metricsToTrack": ["metrics that must be tracked to build a numeric forecast later"]
  },
  "roi": {
    "formula": "ROI formula",
    "inputs": [{ "name": "input name", "description": "what it measures", "source": "evidence source or 'not yet measured'" }],
    "limitations": ["what cannot be estimated yet"],
    "measurementPlan": ["steps to measure ROI"]
  }
}

Return ONLY valid JSON. No markdown. No code fences. No explanations.`;
}

function validateCampaignOutput(data, evidenceReconciliation) {
  if (!data || typeof data !== "object") {
    return { _noData: true, reason: "Invalid AI output" };
  }

  // PART 12: Post-generation consistency validator to remove contradictions
  const contradictions = detectCampaignContradictions(data, evidenceReconciliation);

  // Remove contradictory risks and next actions
  contradictions.forEach(contradiction => {
    if (contradiction.message === 'Risk states SEO intelligence missing but SEO data exists') {
      data.riskAssessment = data.riskAssessment?.filter(r =>
        !(r.risk?.toLowerCase().includes('seo') && r.cause?.toLowerCase().includes('missing'))
      );
    }
    if (contradiction.message === 'Risk states competitor intelligence missing but competitor data exists') {
      data.riskAssessment = data.riskAssessment?.filter(r =>
        !(r.risk?.toLowerCase().includes('competitor') && r.cause?.toLowerCase().includes('missing'))
      );
    }
    if (contradiction.message === 'Next action says run SEO but SEO intelligence already exists') {
      data.nextActions = data.nextActions?.filter(a =>
        !(a.action?.toLowerCase().includes('seo') && a.action?.toLowerCase().includes('run'))
      );
    }
    if (contradiction.message === 'Next action says run competitor analysis but competitor data exists') {
      data.nextActions = data.nextActions?.filter(a =>
        !(a.action?.toLowerCase().includes('competitor') && a.action?.toLowerCase().includes('analysis'))
      );
    }
  });

  // PART 10: Add versioning metadata
  const validated = {
    executiveSummary: data.executiveSummary || null,
    businessGoal: data.businessGoal || null,
    campaignObjective: data.campaignObjective || null,
    audienceSelection: data.audienceSelection || null,
    channelRecommendations: data.channelRecommendations || null,
    timeline: data.timeline || null,
    marketingFunnel: data.marketingFunnel || null,
    kpiFramework: data.kpiFramework || null,
    riskAssessment: data.riskAssessment || null,
    opportunityAssessment: data.opportunityAssessment || null,
    marketingStrategy: data.marketingStrategy || null,
    emailCampaigns: data.emailCampaigns || null,
    ads: data.ads || null,
    landingPages: data.landingPages || null,
    socialPosts: data.socialPosts || null,
    creativeAngles: data.creativeAngles || null,
    budget: data.budget || null,
    forecast: data.forecast || null,
    roi: data.roi || null,
    nextActions: data.executiveSummary?.nextActions || null,
    _metadata: {
      generatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      provider: "ai",
      fallbackUsed: false,
      generationStatus: "FULLY_GENERATED",
      generationMode: "AI",
      versionNumber: 1,
      evidenceHash: generateEvidenceHash(evidenceReconciliation),
      contradictionsDetected: contradictions.length,
      contradictions: contradictions,
      attempts: 1,
      warnings: [],
      fallbackReason: null
    }
  };

  return validated;
}

/**
 * Detect contradictions in generated campaign output
 * PART 12: Post-generation consistency validator
 */
function detectCampaignContradictions(campaign, evidenceReconciliation) {
  const contradictions = [];
  const evidenceStatus = evidenceReconciliation?.evidenceStatus || {};
  
  // Check: Primary audience says TBD while audienceSelection has real persona
  if (campaign.audienceSelection?.primaryAudience?.value?.toLowerCase().includes('tbd') && 
      campaign.audienceSelection?.primaryAudience?.value !== 'TBD') {
    contradictions.push({
      type: 'audience_tbd_contradiction',
      message: 'Primary audience marked as TBD but real persona data exists',
      severity: 'medium'
    });
  }
  
  // Check: Risks say competitor intelligence missing while competitor data exists
  if (evidenceStatus.hasCompetitorData) {
    const competitorMissingRisk = campaign.riskAssessment?.find(r => 
      r.risk?.toLowerCase().includes('competitor') && 
      r.cause?.toLowerCase().includes('missing')
    );
    if (competitorMissingRisk) {
      contradictions.push({
        type: 'competitor_intelligence_contradiction',
        message: 'Risk states competitor intelligence missing but competitor data exists',
        severity: 'medium'
      });
    }
  }
  
  // Check: Risks say SEO intelligence missing while SeoIntelligence exists
  if (evidenceStatus.hasSeoData) {
    const seoMissingRisk = campaign.riskAssessment?.find(r => 
      r.risk?.toLowerCase().includes('seo') && 
      r.cause?.toLowerCase().includes('missing')
    );
    if (seoMissingRisk) {
      contradictions.push({
        type: 'seo_intelligence_contradiction',
        message: 'Risk states SEO intelligence missing but SEO data exists',
        severity: 'medium'
      });
    }
  }
  
  // Check: Next Actions say run SEO when SEO is already complete
  if (evidenceStatus.hasSeoData) {
    const seoAction = campaign.nextActions?.find(a => 
      a.action?.toLowerCase().includes('seo') && 
      a.action?.toLowerCase().includes('run')
    );
    if (seoAction) {
      contradictions.push({
        type: 'seo_already_complete_contradiction',
        message: 'Next action says run SEO but SEO intelligence already exists',
        severity: 'low'
      });
    }
  }
  
  // Check: Next Actions say run competitor analysis when it already exists
  if (evidenceStatus.hasCompetitorData) {
    const competitorAction = campaign.nextActions?.find(a => 
      a.action?.toLowerCase().includes('competitor') && 
      a.action?.toLowerCase().includes('analysis')
    );
    if (competitorAction) {
      contradictions.push({
        type: 'competitor_already_complete_contradiction',
        message: 'Next action says run competitor analysis but competitor data exists',
        severity: 'low'
      });
    }
  }
  
  // Check: Website evidence says missing while product evidence is available
  if (evidenceStatus.hasProductData && !evidenceStatus.hasWebsiteData) {
    const websiteMissingRisk = campaign.riskAssessment?.find(r => 
      r.risk?.toLowerCase().includes('website') && 
      r.cause?.toLowerCase().includes('missing')
    );
    if (websiteMissingRisk) {
      contradictions.push({
        type: 'website_evidence_contradiction',
        message: 'Risk states website evidence missing but product evidence is available',
        severity: 'low'
      });
    }
  }
  
  // Check: Business goal says insufficient evidence while objective claims it was detected
  if (campaign.businessGoal?.confidence === 'low' && 
      campaign.businessGoal?.reason?.toLowerCase().includes('insufficient') &&
      campaign.campaignObjective?.primary?.value) {
    contradictions.push({
      type: 'evidence_confidence_contradiction',
      message: 'Business goal states insufficient evidence but campaign objective was detected',
      severity: 'medium'
    });
  }
  
  return contradictions;
}

/**
 * Generate evidence hash for versioning
 * PART 10: Campaign versioning
 */
function generateEvidenceHash(evidenceReconciliation) {
  if (!evidenceReconciliation) return 'no-evidence';
  
  const evidenceString = JSON.stringify({
    hasProductData: evidenceReconciliation.evidenceStatus?.hasProductData,
    hasAudienceData: evidenceReconciliation.evidenceStatus?.hasAudienceData,
    hasCompetitorData: evidenceReconciliation.evidenceStatus?.hasCompetitorData,
    hasSeoData: evidenceReconciliation.evidenceStatus?.hasSeoData,
    hasChannelData: evidenceReconciliation.evidenceStatus?.hasChannelData,
    hasWebsiteData: evidenceReconciliation.evidenceStatus?.hasWebsiteData,
    hasGrowthData: evidenceReconciliation.evidenceStatus?.hasGrowthData,
    hasMarketData: evidenceReconciliation.evidenceStatus?.hasMarketData,
    hasTechnologyData: evidenceReconciliation.evidenceStatus?.hasTechnologyData,
    hasPositioningData: evidenceReconciliation.evidenceStatus?.hasPositioningData,
    hasPricingData: evidenceReconciliation.evidenceStatus?.hasPricingData,
  });
  
  let hash = 0;
  for (let i = 0; i < evidenceString.length; i++) {
    const char = evidenceString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function generateFingerprint(context) {
  const parts = [
    context.company?.name?.value || '',
    context.product?.category?.value || context.product?.industry?.value || '',
    context.company?.businessModel?.value || '',
    JSON.stringify(context.audience?.segments?.value || context.audience?.primary?.value || ''),
    context.product?.conversionEvent?.value || '',
    context.company?.pricing?.value || '',
    context.company?.buyingCycle?.value || '',
    JSON.stringify((context.channels || []).map(c => c.name || c).sort()),
    context.evidence?.hash || '',
  ];
  return createStableHash(parts.join('::'));
}

function detectCampaignSimilarity(fingerprint1, fingerprint2) {
  if (!fingerprint1 || !fingerprint2) return { similar: false, similarityScore: 0 };
  let matches = 0;
  const minLen = Math.min(fingerprint1.length, fingerprint2.length);
  for (let i = 0; i < minLen; i++) {
    if (fingerprint1[i] === fingerprint2[i]) matches++;
  }
  const score = Math.round((matches / Math.max(fingerprint1.length, fingerprint2.length)) * 100);
  return { similar: score >= 70, similarityScore: score };
}

/**
 * Reconcile evidence across sources and detect contradictions
 * Returns evidence status and warnings about data quality
 */
function reconcileEvidence(context) {
  const { product, company, website, audience, competitors, seo, channels, growth, sources, market, technology, positioning } = context;
  
  const contradictions = [];
  const warnings = [];
  const evidenceStatus = {
    hasProductData: !!(product.usp?.value || product.features?.value?.length),
    hasAudienceData: !!(audience?.primary?.value || audience?.personas?.value?.length),
    hasCompetitorData: !!(competitors?.list?.value?.length),
    hasSeoData: !!(seo?.keywords?.value?.length || seo?.issues?.value?.length),
    hasChannelData: !!(channels?.length),
    hasWebsiteData: !!(website.title?.value || website.heroText?.value),
    hasGrowthData: growth?.overallScore?.value != null,
    hasMarketData: !!(market && (market.overview || market.trends?.length || market.segments?.length)),
    hasTechnologyData: !!(technology && technology.stack?.length),
    hasPositioningData: !!(positioning || competitors?.positioning?.value),
    hasPricingData: !!(product.pricing?.value ?? product.pricing),
  };
  
  // Check for contradictions between product name sources
  const productNameSources = [
    { source: 'product.name', value: product.name?.value },
    { source: 'company.productName', value: company.productName?.value },
    { source: 'website.title', value: website.title?.value },
  ].filter(s => s.value);
  
  if (productNameSources.length > 1) {
    const uniqueNames = [...new Set(productNameSources.map(s => s.value))];
    if (uniqueNames.length > 1) {
      contradictions.push({
        type: 'product_name_mismatch',
        sources: productNameSources.map(s => s.source).join(', '),
        values: uniqueNames.join(', '),
        severity: 'medium'
      });
    }
  }
  
  // Check for contradictions between industry sources
  const industrySources = [
    { source: 'company.industry', value: company.industry?.value },
    { source: 'product.industry', value: product.industry?.value },
  ].filter(s => s.value);
  
  if (industrySources.length > 1) {
    const uniqueIndustries = [...new Set(industrySources.map(s => s.value))];
    if (uniqueIndustries.length > 1) {
      contradictions.push({
        type: 'industry_mismatch',
        sources: industrySources.map(s => s.source).join(', '),
        values: uniqueIndustries.join(', '),
        severity: 'low'
      });
    }
  }
  
  // Check for audience data consistency
  if (evidenceStatus.hasAudienceData) {
    const primaryAudience = audience?.primary?.value;
    const personaNames = audience?.personas?.value?.map(p => p.name || p.title || p.role).filter(Boolean);
    
    if (primaryAudience && personaNames.length > 0) {
      const personaMatches = personaNames.some(p => 
        primaryAudience.toLowerCase().includes(p.toLowerCase()) || 
        p.toLowerCase().includes(primaryAudience.toLowerCase())
      );
      if (!personaMatches) {
        warnings.push({
          type: 'audience_mismatch',
          message: 'Primary audience does not match persona names',
          primaryAudience,
          personaNames: personaNames.join(', ')
        });
      }
    }
  }
  
  // Check for competitor data consistency
  if (evidenceStatus.hasCompetitorData) {
    const competitorCount = competitors?.list?.value?.length || 0;
    if (competitorCount === 0) {
      warnings.push({
        type: 'competitor_data_incomplete',
        message: 'Competitor intelligence exists but no competitors listed'
      });
    }
  }
  
  // Check for SEO data consistency
  if (evidenceStatus.hasSeoData) {
    const keywordCount = seo?.keywords?.value?.length || 0;
    const issueCount = seo?.issues?.value?.length || 0;
    
    if (keywordCount === 0 && issueCount === 0) {
      warnings.push({
        type: 'seo_data_incomplete',
        message: 'SEO intelligence exists but no keywords or issues found'
      });
    }
  }
  
  // Check for evidence source completeness
  const availableSources = sources?.sourcesCollected || [];
  const expectedSources = ['productIntelligence', 'competitorIntelligence', 'seoIntelligence', 'evidenceSnapshot'];
  const missingSources = expectedSources.filter(s => !availableSources.includes(s));
  
  if (missingSources.length > 0) {
    warnings.push({
      type: 'missing_evidence_sources',
      message: 'Some expected evidence sources not collected',
      missing: missingSources.join(', ')
    });
  }
  
  return {
    contradictions,
    warnings,
    evidenceStatus,
    overallQuality: contradictions.length === 0 && warnings.length <= 2 ? 'good' : 
                   contradictions.length === 0 ? 'acceptable' : 'needs_review'
  };
}

/**
 * Filter campaign recommendations to exclude those requiring unavailable proof
 * Ensures campaign safety by only recommending actions with available evidence
 */
function applyCampaignSafety(campaignResult, evidenceStatus) {
  const safeResult = JSON.parse(JSON.stringify(campaignResult));
  
  // Filter channel recommendations
  if (safeResult.channelRecommendations) {
    safeResult.channelRecommendations = safeResult.channelRecommendations.filter(channel => {
      // Keep channels that don't require specific evidence or have evidence available
      const requiresSeo = channel.evidence === 'seo_intelligence';
      const requiresCompetitor = channel.evidence === 'competitor_intelligence';
      const requiresProduct = channel.evidence === 'product_intelligence';
      const requiresAudience = channel.evidence === 'audience_intelligence';
      
      if (requiresSeo && !evidenceStatus.hasSeoData) {
        console.warn('[Campaign Safety] Filtering channel requiring unavailable SEO evidence', { channel: channel.channel });
        return false;
      }
      if (requiresCompetitor && !evidenceStatus.hasCompetitorData) {
        console.warn('[Campaign Safety] Filtering channel requiring unavailable competitor evidence', { channel: channel.channel });
        return false;
      }
      if (requiresProduct && !evidenceStatus.hasProductData) {
        console.warn('[Campaign Safety] Filtering channel requiring unavailable product evidence', { channel: channel.channel });
        return false;
      }
      if (requiresAudience && !evidenceStatus.hasAudienceData) {
        console.warn('[Campaign Safety] Filtering channel requiring unavailable audience evidence', { channel: channel.channel });
        return false;
      }
      
      return true;
    });
    
    // Add warning if channels were filtered
    if (safeResult.channelRecommendations.length < campaignResult.channelRecommendations.length) {
      const filteredCount = campaignResult.channelRecommendations.length - safeResult.channelRecommendations.length;
      if (!safeResult._metadata.warnings) safeResult._metadata.warnings = [];
      safeResult._metadata.warnings.push(
        `${filteredCount} channel recommendation(s) filtered due to unavailable evidence`
      );
    }
  }
  
  // Filter timeline tasks that require unavailable evidence
  const filterTimelineTasks = (tasks) => {
    return tasks.filter(task => {
      const requiresAudience = task.evidence === 'audience_intelligence' || task.evidence === 'needs_audience_analysis';
      const requiresSeo = task.evidence === 'seo_keyword_analysis';
      const requiresProduct = task.evidence === 'product_intelligence';
      
      if (requiresAudience && !evidenceStatus.hasAudienceData) {
        return false;
      }
      if (requiresSeo && !evidenceStatus.hasSeoData) {
        return false;
      }
      if (requiresProduct && !evidenceStatus.hasProductData) {
        return false;
      }
      
      return true;
    });
  };
  
  if (safeResult.timeline) {
    if (safeResult.timeline.week1) safeResult.timeline.week1 = filterTimelineTasks(safeResult.timeline.week1);
    if (safeResult.timeline.week2) safeResult.timeline.week2 = filterTimelineTasks(safeResult.timeline.week2);
    if (safeResult.timeline.week3) safeResult.timeline.week3 = filterTimelineTasks(safeResult.timeline.week3);
    if (safeResult.timeline.week4) safeResult.timeline.week4 = filterTimelineTasks(safeResult.timeline.week4);
    if (safeResult.timeline.month2) safeResult.timeline.month2 = filterTimelineTasks(safeResult.timeline.month2);
    if (safeResult.timeline.month3) safeResult.timeline.month3 = filterTimelineTasks(safeResult.timeline.month3);
  }
  
  // Filter KPIs that require unavailable measurement infrastructure
  if (safeResult.kpiFramework) {
    safeResult.kpiFramework = safeResult.kpiFramework.filter(kpi => {
      // Keep KPIs that don't require specific data or have data available
      const requiresSeo = kpi.tool === 'Google Search Console';
      const requiresEmail = kpi.tool === 'Email Marketing Platform';
      const requiresProduct = kpi.tool === 'Product Analytics';
      
      if (requiresSeo && !evidenceStatus.hasSeoData) {
        return false;
      }
      if (requiresEmail && !evidenceStatus.hasAudienceData) {
        return false;
      }
      if (requiresProduct && !evidenceStatus.hasProductData) {
        return false;
      }
      
      return true;
    });
  }
  
  // Filter funnel stages that require unavailable channels
  if (safeResult.marketingFunnel) {
    const availableChannels = safeResult.channelRecommendations.map(c => c.channel);
    
    Object.keys(safeResult.marketingFunnel).forEach(stage => {
      const stageData = safeResult.marketingFunnel[stage];
      if (stageData.channels && Array.isArray(stageData.channels)) {
        stageData.channels = stageData.channels.filter(channel => {
          // Keep if channel is available or is a general channel type
          return availableChannels.includes(channel) || 
                 ['Email', 'Direct'].includes(channel);
        });
      }
    });
  }
  
  // Add safety metadata
  safeResult._metadata.safetyApplied = true;
  safeResult._metadata.safetyFilter = {
    channelsFiltered: campaignResult.channelRecommendations.length - safeResult.channelRecommendations.length,
    timelineTasksFiltered: 'applied',
    kpisFiltered: campaignResult.kpiFramework.length - safeResult.kpiFramework.length,
    evidenceStatus
  };
  
  return safeResult;
}

function generateEvidenceBasedCampaign(context) {
  const { product, company, website, audience, competitors, seo, channels, growth, sources, productIdentity, market, technology, positioning } = context;

  // PART 13: Use canonical product identity for product-specific campaigns
  const companyName = productIdentity?.companyName || company.name?.value || product.name?.value || "Project";
  const productName = productIdentity?.productName || product.name?.value || companyName;
  const brandName = productIdentity?.brandName || productName;
  const industry = company.industry?.value || product.industry?.value || "Unknown";
  const websiteTitle = website.title?.value || companyName;

  const hasProductData = !!(product.usp?.value || product.features?.value?.length);
  const hasAudienceData = !!(audience?.primary?.value || audience?.personas?.value?.length);
  const hasCompetitorData = !!(competitors?.list?.value?.length);
  const hasSeoData = !!(seo?.keywords?.value?.length || seo?.issues?.value?.length);
  const hasChannelData = !!(channels?.length);
  const hasGrowthData = growth?.overallScore?.value != null;

  const goal = determineBusinessGoal(context);
  const channelRecs = determineChannels(context);

  // PART 13: Add evidence status labels to all inferences and make product-specific
  const labelledResult = {
    executiveSummary: {
      campaignName: `${productName} Evidence-Based Campaign`,
      campaignTheme: `Growth through ${goal.goal || "strategic marketing"}`,
      campaignGoal: goal.goal || "Brand Awareness",
      recommendedDuration: "Proposed planning horizon â€” to be confirmed by user",
      primaryAudience: {
        value: audience?.primary?.value || "Not yet determined from available evidence",
        reason: hasAudienceData ? "Derived from audience intelligence analysis" : "Audience intelligence not yet available â€” run audience analysis first",
        evidence: hasAudienceData ? "audience_intelligence" : "insufficient_evidence",
        _evidenceStatus: hasAudienceData ? "EVIDENCE_BACKED" : "NOT_MEASURED"
      },
      primaryChannels: channelRecs.slice(0, 3).map(c => ({
        channel: c.channel,
        reason: c.reason,
        evidence: c.evidence,
        _evidenceStatus: c.evidence !== "channel_best_practices" ? "EVIDENCE_BACKED" : "BEST_PRACTICE"
      })),
      topOpportunities: buildOpportunities(context).slice(0, 3).map(o => ({
        title: o.opportunity,
        reason: o.reason,
        evidence: o.evidence,
        _evidenceStatus: o.evidence !== "best_practice" ? "EVIDENCE_BACKED" : "BEST_PRACTICE"
      })),
      topRisks: buildRisks(context).slice(0, 3).map(r => ({
        risk: r.risk,
        reason: r.cause,
        evidence: r.evidence,
        _evidenceStatus: r.evidence !== "best_practice" ? "EVIDENCE_BACKED" : "BEST_PRACTICE"
      })),
      nextActions: buildNextActions(context).slice(0, 5).map(a => ({
        action: a.action,
        owner: a.owner,
        priority: a.priority,
        evidence: a.evidence,
        _evidenceStatus: a.evidence !== "best_practice" ? "EVIDENCE_BACKED" : "BEST_PRACTICE"
      }))
    },
    businessGoal: {
      ...goal,
      _evidenceStatus: goal.evidence !== "best_practice" && goal.evidence !== "insufficient_evidence" ? "EVIDENCE_BACKED" : goal.evidence === "insufficient_evidence" ? "NOT_MEASURED" : "BEST_PRACTICE"
    },
    campaignObjective: buildCampaignObjective(context, goal),
    audienceSelection: buildAudienceSelection(context),
    channelRecommendations: channelRecs.map(c => ({
      ...c,
      _evidenceStatus: c.evidence !== "channel_best_practices" ? "EVIDENCE_BACKED" : "BEST_PRACTICE"
    })),
    timeline: buildTimeline(context, channelRecs),
    marketingFunnel: buildFunnel(context, channelRecs),
    kpiFramework: buildKPIs(context).map(k => ({
      ...k,
      _evidenceStatus: k.status === "MEASURED" ? "EVIDENCE_BACKED" : k.status === "CONNECTED" ? "EVIDENCE_BACKED" : "NOT_MEASURED"
    })),
    riskAssessment: buildRisks(context).map(r => ({
      ...r,
      _evidenceStatus: r.evidence !== "best_practice" && r.evidence.includes("missing") ? "NOT_MEASURED" : "EVIDENCE_BACKED"
    })),
    opportunityAssessment: buildOpportunities(context).map(o => ({
      ...o,
      _evidenceStatus: o.evidence !== "best_practice" ? "EVIDENCE_BACKED" : "BEST_PRACTICE"
    })),
    marketingStrategy: buildMarketingStrategy(context),
    emailCampaigns: buildEmailCampaigns(context),
    ads: buildAds(context),
    landingPages: buildLandingPages(context),
    socialPosts: buildSocialPosts(context),
    creativeAngles: buildCreativeAngles(context),
    budget: buildBudget(context),
    forecast: buildForecast(context),
    roi: buildROI(context),
    _metadata: {
      generatedAt: new Date().toISOString(),
      provider: "evidence-based",
      fallbackUsed: true,
      generationStatus: "PARTIALLY_GENERATED",
      generationMode: "FALLBACK",
      attempts: 2,
      warnings: ["Campaign generated using evidence-based rules (no AI)"],
      fallbackReason: "AI generation not available, used evidence-based fallback",
      evidenceQuality: {
        hasProductData,
        hasAudienceData,
        hasCompetitorData,
        hasSeoData,
        hasChannelData,
        hasGrowthData,
        overallQuality: hasProductData && hasAudienceData ? "good" : "acceptable"
      }
    }
  };
  
  // Add evidence status to nested objects
  labelledResult.campaignObjective.primary._evidenceStatus = labelledResult.campaignObjective.primary.evidence !== "insufficient_evidence" ? "EVIDENCE_BACKED" : "NOT_MEASURED";
  labelledResult.campaignObjective.secondary._evidenceStatus = labelledResult.campaignObjective.secondary.evidence !== "insufficient_evidence" ? "EVIDENCE_BACKED" : "NOT_MEASURED";
  labelledResult.campaignObjective.successDefinition._evidenceStatus = "BEST_PRACTICE";
  labelledResult.campaignObjective.targetAudience._evidenceStatus = labelledResult.campaignObjective.targetAudience.evidence !== "insufficient_evidence" ? "EVIDENCE_BACKED" : "NOT_MEASURED";
  labelledResult.campaignObjective.idealCustomer._evidenceStatus = "NOT_MEASURED";
  labelledResult.campaignObjective.timeline._evidenceStatus = "BEST_PRACTICE";
  
  labelledResult.audienceSelection.primaryAudience._evidenceStatus = hasAudienceData ? "EVIDENCE_BACKED" : "NOT_MEASURED";
  labelledResult.audienceSelection.secondaryAudience._evidenceStatus = hasAudienceData ? "EVIDENCE_BACKED" : "NOT_MEASURED";
  labelledResult.audienceSelection.buyingStage._evidenceStatus = "BEST_PRACTICE";
  labelledResult.audienceSelection.painPoints.forEach(p => p._evidenceStatus = hasAudienceData ? "EVIDENCE_BACKED" : "NOT_MEASURED");
  labelledResult.audienceSelection.decisionDrivers.forEach(d => d._evidenceStatus = hasAudienceData ? "EVIDENCE_BACKED" : "NOT_MEASURED");
  labelledResult.audienceSelection.objections.forEach(o => o._evidenceStatus = hasAudienceData ? "EVIDENCE_BACKED" : "NOT_MEASURED");
  labelledResult.audienceSelection.contentPreferences.forEach(c => c._evidenceStatus = hasAudienceData ? "EVIDENCE_BACKED" : "NOT_MEASURED");
  
  // PART 14: Apply campaign safety filter
  const evidenceStatus = {
    hasProductData,
    hasAudienceData,
    hasCompetitorData,
    hasSeoData,
    hasChannelData,
    hasGrowthData
  };
  
  const safeResult = applyCampaignSafety(labelledResult, evidenceStatus);
  
  return safeResult;
}

// ============================================================
// RESEARCH-DRIVEN EXECUTION SECTIONS (fallback builders)
// Every field references evidence; no fabricated numbers.
// ============================================================

function firstText(values, fallback = null) {
  if (!Array.isArray(values)) return fallback;
  for (const v of values) {
    if (!v) continue;
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'object' && v.value && typeof v.value === 'string' && v.value.trim()) return v.value.trim();
    if (typeof v === 'object') {
      const text = v.name || v.trend || v.segment || v.driver || v.opportunity || v.barrier || v.topic || v.title || null;
      if (text && typeof text === 'string' && text.trim()) return text.trim();
    }
  }
  return fallback;
}

function buildMarketingStrategy(context) {
  const { product, company, audience, competitors, seo, market, technology, positioning, productIdentity } = context;
  const productName = productIdentity?.productName || product.name?.value || company.name?.value || 'this product';
  const brandName = productIdentity?.brandName || productName;
  const painPoint = audience?.painPoints?.value?.[0] || audience?.personas?.value?.[0]?.painPoints?.[0] || null;
  const competitorNames = (competitors?.list?.value || []).slice(0, 3).map(c => c.name || c.domain).filter(Boolean);
  const marketTrends = market?.trends?.length ? market.trends.slice(0, 3) : [];
  const marketOverview = market?.overview || null;
  const techStack = technology?.stack?.length ? technology.stack.slice(0, 4) : [];

  const researchCoverage = [
    { area: 'product', status: product?.usp?.value || product?.features?.value?.length ? 'measured' : 'unavailable', note: product?.usp?.value ? `USP: ${product.usp.value}` : 'No USP evidence' },
    { area: 'audience', status: audience?.primary?.value || audience?.personas?.value?.length ? 'measured' : 'unavailable', note: audience?.primary?.value || 'No audience evidence' },
    { area: 'competitors', status: competitorNames.length ? 'measured' : 'unavailable', note: competitorNames.join(', ') || 'No competitor evidence' },
    { area: 'seo', status: seo?.keywords?.value?.length ? 'measured' : 'unavailable', note: seo?.keywords?.value?.slice(0, 3).map(k => k.keyword || k).join(', ') || 'No SEO keyword evidence' },
    { area: 'market', status: market?.status === 'measured' ? 'measured' : 'unavailable', note: marketOverview || (marketTrends.length ? firstText(marketTrends) : null) || 'No market research' },
    { area: 'technology', status: techStack.length ? 'measured' : 'unavailable', note: techStack.join(', ') || 'No technology evidence' },
    { area: 'positioning', status: positioning || competitors?.positioning?.value ? 'measured' : 'unavailable', note: typeof positioning === 'string' ? positioning : null },
    { area: 'pricing', status: product.pricing?.value ?? product.pricing ? 'measured' : 'unavailable', note: String(product.pricing?.value ?? product.pricing ?? '').substring(0, 120) || null },
  ];

  const pillars = [];
  if (painPoint) pillars.push({ name: `Solve ${String(painPoint).substring(0, 60)}`, description: `Lead with the audience's most documented pain point and show how ${brandName} addresses it.`, evidence: 'audience_intelligence' });
  if (product?.usp?.value) pillars.push({ name: 'Own the differentiator', description: `Anchor messaging on the verified USP: ${product.usp.value}`, evidence: 'product_intelligence' });
  if (seo?.keywords?.value?.length) pillars.push({ name: 'Search-led organic growth', description: `Build content and landing experiences around the verified keyword set.`, evidence: 'seo_intelligence' });
  if (marketTrends.length) pillars.push({ name: 'Ride the documented market trend', description: firstText(marketTrends) || 'Position against an identified market trend', evidence: 'market_research' });
  if (competitorNames.length) pillars.push({ name: 'Differentiate against named competitors', description: `Target gaps versus ${competitorNames.join(', ')} in messaging and product story.`, evidence: 'competitor_intelligence' });
  if (techStack.length) pillars.push({ name: 'Technical credibility', description: `Signal the documented technology stack (${techStack.join(', ')}) to technical buyers.`, evidence: 'technology_research' });
  if (pillars.length === 0) pillars.push({ name: 'Evidence-based validation phase', description: 'With limited research, run a focused validation campaign before scaling spend.', evidence: 'insufficient_evidence' });

  return {
    narrative: `The strategy for ${brandName} is derived from the available research: audience evidence defines who to target, competitor evidence defines where to differentiate, SEO evidence defines the entry keywords, and ${market?.status === 'measured' ? 'market research defines the opportunity context' : 'market research is not yet available (run market discovery to strengthen this strategy)'}.`,
    pillars,
    positioning: {
      statement: positioning ? (typeof positioning === 'string' ? positioning : (positioning.statement || positioning.positioningStatement || null)) : `${brandName} positions against ${competitorNames.join(', ') || 'the incumbent players'} by leading with ${product?.usp?.value || 'its verified strengths'}.`,
      basis: positioning ? 'competitor_intelligence' : product?.usp?.value ? 'product_intelligence' : 'insufficient_evidence',
      differentiators: (product?.benefits?.value || []).slice(0, 3).map(b => ({ differentiator: typeof b === 'string' ? b : (b.value || b.benefit || b.text || ''), evidence: 'product_intelligence' })),
    },
    researchCoverage,
  };
}

function buildEmailCampaigns(context) {
  const { product, audience, competitors, seo, productIdentity, company } = context;
  const productName = productIdentity?.productName || product.name?.value || company.name?.value || 'this solution';
  const painPoint = audience?.painPoints?.value?.[0] || audience?.personas?.value?.[0]?.painPoints?.[0] || null;
  const persona = audience?.personas?.value?.[0]?.name || audience?.primary?.value || 'target audience';
  const keyword = seo?.keywords?.value?.[0]?.keyword || seo?.keywords?.value?.[0] || null;
  const campaigns = [];

  if (painPoint) {
    campaigns.push({
      name: `${productName} pain-point onboarding`,
      objective: `Introduce ${productName} as the answer to "${painPoint}"`,
      audience: persona,
      sequence: [
        `Why "${painPoint}" keeps costing your team`,
        `How ${productName} addresses this directly`,
        `A concrete walkthrough of the fix`,
        `The offer: start with a focused pilot`,
      ],
      angles: ['problem-first', 'education', 'capability proof', 'low-risk trial'],
      cta: 'Request a guided walkthrough',
      evidence: 'audience_intelligence',
    });
  }
  if (keyword || seo?.contentOpportunities?.value?.length) {
    campaigns.push({
      name: `${productName} search-intent nurture`,
      objective: 'Convert organic search visitors into leads with content-aligned email',
      audience: 'Organic search audience (awareness stage)',
      sequence: [
        `The ${keyword ? `${keyword} ` : ''}guide your team needs`,
        `What most teams miss about ${keyword ? keyword.split(' ').slice(0, 2).join(' ') : 'this topic'}`,
        `How ${productName} fits the workflow`,
      ],
      angles: ['educational', 'gap-based', 'product-fit'],
      cta: 'Read the guide and get a demo',
      evidence: 'seo_intelligence',
    });
  }
  if (competitors?.list?.value?.length) {
    campaigns.push({
      name: `${productName} competitor-switch campaign`,
      objective: 'Target teams evaluating alternatives by naming the switch criteria',
      audience: persona,
      sequence: [
        `What to compare before renewing with ${competitors.list.value[0]?.name || 'your current vendor'}`,
        `${productName} on the criteria that matter most`,
        'Migration made simple: the practical path',
      ],
      angles: ['comparison', 'objective-criteria', 'risk-reduction'],
      cta: 'See the comparison',
      evidence: 'competitor_intelligence',
    });
  }
  if (campaigns.length === 0) {
    campaigns.push({
      name: `${productName} evidence-based launch email`,
      objective: 'Introduce the product to a defined audience once research is complete',
      audience: persona,
      sequence: ['Introducing what we learned', 'How it changes your workflow', 'Let us show you'],
      angles: ['story-led'],
      cta: 'Book an introduction',
      evidence: 'product_intelligence',
    });
  }
  return campaigns;
}

function buildAds(context) {
  const { product, audience, competitors, productIdentity, company } = context;
  const productName = productIdentity?.productName || product.name?.value || company.name?.value || 'this solution';
  const painPoint = audience?.painPoints?.value?.[0] || null;
  const persona = audience?.primary?.value || audience?.personas?.value?.[0]?.name || null;
  const ads = [];

  if (product?.usp?.value) {
    ads.push({
      platform: 'Google Search',
      objective: 'Capture high-intent searches',
      headline: productName,
      primaryText: product.usp.value,
      audience: persona || 'High-intent searchers',
      cta: 'Learn more',
      angle: 'USP-led',
      evidence: 'product_intelligence',
    });
  }
  if (painPoint && persona) {
    ads.push({
      platform: 'LinkedIn',
      objective: 'Reach decision-makers with a problem-first angle',
      headline: `Still dealing with ${String(painPoint).substring(0, 60)}?`,
      primaryText: `Teams like yours use ${productName} to change that.`,
      audience: persona,
      cta: 'See how',
      angle: 'pain-point-led',
      evidence: 'audience_intelligence',
    });
  }
  if (competitors?.list?.value?.length) {
    const rival = competitors.list.value[0];
    ads.push({
      platform: 'Google Search',
      objective: 'Capture competitor-intent searches',
      headline: `${rival.name || 'The leading tool'} vs ${productName}`,
      primaryText: `Compare honestly before you buy. ${productName} was built for ${persona || 'your team'}.`,
      audience: `Searchers comparing ${rival.name || 'alternatives'}`,
      cta: 'Read the comparison',
      angle: 'comparison-led',
      evidence: 'competitor_intelligence',
    });
  }
  if (ads.length === 0) {
    ads.push({
      platform: 'Google Search',
      objective: 'Establish a presence on verified keywords once SEO research is complete',
      headline: productName,
      primaryText: `Discover what ${productName} can do for your team.`,
      audience: 'High-intent searchers',
      cta: 'Learn more',
      angle: 'brand-led',
      evidence: 'product_intelligence',
    });
  }
  return ads;
}

function buildLandingPages(context) {
  const { product, seo, audience, productIdentity, company } = context;
  const productName = productIdentity?.productName || product.name?.value || company.name?.value || 'this solution';
  const painPoint = audience?.painPoints?.value?.[0] || null;
  const keyword = seo?.keywords?.value?.[0]?.keyword || seo?.keywords?.value?.[0] || null;
  const pages = [];

  pages.push({
    name: `${productName} product overview`,
    purpose: 'Educate and capture leads from general research traffic',
    headline: product?.usp?.value ? `${productName}: ${product.usp.value}` : `${productName} — overview`,
    sections: ['Hero with verified value proposition', 'How it works', 'Key capabilities from product evidence', 'Outcome stories (once available)', 'CTA'],
    seoKeywords: keyword ? [String(keyword)] : [],
    cta: 'Book a walkthrough',
    evidence: 'product_intelligence',
  });
  if (keyword) {
    pages.push({
      name: `${keyword} guide page`,
      purpose: 'Rank for a verified primary keyword and convert research traffic',
      headline: `${String(keyword).replace(/^\w/, c => c.toUpperCase())} — a practical guide`,
      sections: ['Answer the core question first', 'Common pitfalls', 'How teams approach it today', 'Where tools like ' + productName + ' fit', 'CTA'],
      seoKeywords: [String(keyword)],
      cta: 'Get the full guide',
      evidence: 'seo_intelligence',
    });
  }
  if (painPoint) {
    pages.push({
      name: `${productName} pain-point landing`,
      purpose: 'Convert problem-focused traffic from ads and social',
      headline: `Fix ${String(painPoint).substring(0, 70)}`,
      sections: ['Acknowledge the problem', 'Show the mechanism', 'Proof points from product evidence', 'Objection handling', 'CTA'],
      seoKeywords: [],
      cta: 'See how it works',
      evidence: 'audience_intelligence',
    });
  }
  return pages;
}

function buildSocialPosts(context) {
  const { product, audience, competitors, seo, productIdentity, company } = context;
  const productName = productIdentity?.productName || product.name?.value || company.name?.value || 'this solution';
  const painPoint = audience?.painPoints?.value?.[0] || null;
  const persona = audience?.primary?.value || audience?.personas?.value?.[0]?.name || null;
  const keyword = seo?.keywords?.value?.[0]?.keyword || seo?.keywords?.value?.[0] || null;
  const posts = [];

  if (product?.usp?.value) {
    posts.push({
      platform: 'LinkedIn',
      hook: `Most teams don't have a ${String(painPoint || 'core challenge').substring(0, 50)} problem. They have an approach problem.`,
      body: `${productName} was built around a different assumption: ${product.usp.value}`,
      cta: 'Reply "curious" and we will share how.',
      angle: 'contrarian/thought-leadership',
      audience: persona || 'Founders and team leads',
      evidence: 'product_intelligence',
    });
  }
  if (painPoint) {
    posts.push({
      platform: 'LinkedIn',
      hook: `"${String(painPoint).substring(0, 80)}" is the #1 blocker our research found.`,
      body: `We analyzed the problem space before building. Here is the pattern: the fix is usually upstream, not in the tooling. ${productName} targets the root cause.`,
      cta: 'Follow for the full breakdown.',
      angle: 'research-led',
      audience: persona || 'Operations and product teams',
      evidence: 'audience_intelligence',
    });
  }
  if (keyword) {
    posts.push({
      platform: 'X',
      hook: `${String(keyword).substring(0, 70)} — a thread.`,
      body: `1. Most guides skip the setup reality\n2. The workflow gap nobody talks about\n3. Where tools like ${productName} actually help`,
      cta: 'Save this thread.',
      angle: 'educational-thread',
      audience: 'Search-driven professionals',
      evidence: 'seo_intelligence',
    });
  }
  if (competitors?.list?.value?.length) {
    posts.push({
      platform: 'X',
      hook: `Choosing between ${competitors.list.value.slice(0, 2).map(c => c.name || c.domain).filter(Boolean).join(' and ') || 'vendors'}?`,
      body: `Add these 3 criteria to your comparison — most teams skip them, and they decide the outcome. ${productName} scores well because of them.`,
      cta: 'Grab the criteria list.',
      angle: 'comparison-led',
      audience: 'Evaluation-stage buyers',
      evidence: 'competitor_intelligence',
    });
  }
  if (posts.length === 0) {
    posts.push({
      platform: 'LinkedIn',
      hook: `What we learned building ${productName}`,
      body: 'Sharing our research-driven approach to the problem we are solving — and inviting your perspective.',
      cta: 'Share your experience in the comments.',
      angle: 'story-led',
      audience: null,
      evidence: 'product_intelligence',
    });
  }
  return posts;
}

function buildCreativeAngles(context) {
  const { product, audience, competitors, market, productIdentity, company } = context;
  const productName = productIdentity?.productName || product.name?.value || company.name?.value || 'this solution';
  const angles = [];
  const painPoint = audience?.painPoints?.value?.[0] || null;

  if (painPoint) angles.push({ angle: `Problem-first: name the pain and make it visible`, source: 'audience pain points', evidence: 'audience_intelligence', bestFor: 'Ads, email subject lines, social hooks' });
  if (product?.usp?.value) angles.push({ angle: `Differentiator-led: own "${product.usp.value}"`, source: 'product USP', evidence: 'product_intelligence', bestFor: 'Landing pages, product page, LinkedIn' });
  if (competitors?.list?.value?.length) angles.push({ angle: 'Comparison honesty: give buyers objective criteria', source: 'competitor research', evidence: 'competitor_intelligence', bestFor: 'Search ads, X threads, comparison page' });
  if (market?.trends?.length) angles.push({ angle: `Trend-aligned: connect to "${firstText(market.trends) || 'the documented trend'}"`, source: 'market research', evidence: 'market_research', bestFor: 'Whitepapers, thought leadership, PR' });
  if (product?.features?.value?.length) angles.push({ angle: 'Capability proof: show the mechanism, not just the outcome', source: 'product features', evidence: 'product_intelligence', bestFor: 'Video scripts, demo-led emails' });
  if (angles.length === 0) angles.push({ angle: `Origin story: why ${productName} exists`, source: 'company identity', evidence: 'product_intelligence', bestFor: 'Social launch posts' });
  return angles;
}

function buildBudget(context) {
  const { channels, seo, audience, competitors } = context;
  const allocation = [];
  const hasSeo = seo?.keywords?.value?.length || seo?.issues?.value?.length;
  const hasAudience = audience?.primary?.value || audience?.personas?.value?.length;
  const hasCompetitors = competitors?.list?.value?.length;

  if (hasSeo) allocation.push({ category: 'Organic SEO & Content', percentage: 40, basis: 'Verified keyword and issue evidence exists — organic compounding is the highest-confidence channel' });
  if (hasAudience) allocation.push({ category: 'Email & Lifecycle', percentage: 20, basis: 'Audience evidence enables targeted nurture sequences' });
  if (hasCompetitors) allocation.push({ category: 'Search Ads', percentage: 15, basis: 'Competitor evidence supports comparison-led paid capture' });
  allocation.push({ category: 'Social & Community', percentage: 15, basis: 'Social posts are low-cost and reuse research angles' });
  allocation.push({ category: 'Measurement & Tools', percentage: 10, basis: 'KPIs require tracking infrastructure before spend scales' });

  return {
    status: 'proposed',
    total: null,
    currency: null,
    allocation,
    notes: [
      'No total budget or absolute spend is fabricated — percentages are a starting split, not a commitment.',
      'Re-allocate once real channel data (CPA, conversion) is measured.',
      'Prioritize channels with the strongest evidence; add channels only when research supports them.',
    ],
    inputSummary: 'Provide the total campaign budget and currency to finalize the allocation.',
  };
}

function buildForecast(context) {
  const { market, seo, audience } = context;
  const scenarios = [];
  const marketTrend = market?.growthRate != null ? `the documented market growth (${market.growthRate})` : null;

  scenarios.push({
    scenario: 'Conservative',
    description: `Validation-first: spend only on measured channels and iterate. ${marketTrend ? `Outcome is bounded by ${marketTrend}, with spend limited to high-confidence activities.` : 'Market size data is unavailable — outcomes stay qualitative until baseline metrics exist.'}`,
    assumptions: ['Start with organic and email, no paid scale', 'Spend is capped at what the team can measure'],
    evidence: market?.status === 'measured' ? 'market_research' : 'insufficient_evidence',
  });
  scenarios.push({
    scenario: 'Moderate',
    description: seo?.keywords?.value?.length
      ? 'Add paid search on verified keywords once organic foundations are in place and baseline conversion data exists.'
      : 'Add paid channels only after SEO research provides verified keywords to target.',
    assumptions: ['Baseline conversion metrics are tracked for 30 days before scaling', 'Landing pages from research drive all paid traffic'],
    evidence: 'seo_intelligence',
  });
  scenarios.push({
    scenario: 'Aggressive',
    description: audience?.primary?.value
      ? 'Full multi-channel rollout across the defined audience once the first measurement cycle proves unit economics.'
      : 'Full rollout is deferred until audience evidence defines targeting.',
    assumptions: ['KPIs are connected to measurement tools', 'Channel-level ROAS is verified before further spend'],
    evidence: 'audience_intelligence',
  });

  return {
    status: 'qualitative',
    disclaimer: 'No numeric outcomes (leads, revenue, conversion rates) are fabricated. Forecasts are scenario-based and must be replaced by real measured data.',
    scenarios,
    metricsToTrack: ['Sessions and ranking positions per keyword', 'Email open and reply rates', 'Conversion rate per landing page', 'Cost per lead per paid channel', 'Product activation rate'],
  };
}

function buildROI(context) {
  const { seo, audience } = context;
  return {
    formula: 'ROI = (Attributed Revenue − Campaign Cost) / Campaign Cost',
    inputs: [
      { name: 'Campaign Cost', description: 'Actual spend across all channels', source: 'not yet measured — track in the measurement tool' },
      { name: 'Attributed Revenue', description: 'Revenue attributed to the campaign via tracked conversions', source: 'not yet measured — connect analytics and CRM' },
      { name: 'Leads Generated', description: 'Qualified leads from campaign sources', source: 'not yet measured — requires lead tracking' },
      { name: 'Conversion Rate', description: 'Visitors to leads to customers at each stage', source: seo?.keywords?.value?.length ? 'partially measurable — SEO baseline exists' : 'not yet measured — requires analytics' },
      { name: 'Customer Value', description: 'Value per converted customer over the measurement window', source: audience?.primary?.value ? 'product context available, value not yet measured' : 'not yet measured' },
    ],
    limitations: [
      'No ROI figure is produced until real cost and revenue data exist.',
      'Attribution across organic, email, ads, and social requires a connected measurement stack.',
    ],
    measurementPlan: [
      'Connect analytics and conversion tracking before launch',
      'Define the attribution window per channel',
      'Report ROI monthly with measured inputs only',
    ],
  };
}

function determineBusinessGoal(context) {
  const { product, company, website, audience, competitors, seo, channels, growth, sources } = context;

  const text = [
    website.heroText?.value || "",
    website.metaDescription?.value || "",
    product.description?.value || "",
    product.usp?.value || "",
    website.title?.value || "",
    company.name?.value || "",
  ].filter(Boolean).join(" ").toLowerCase();

  const ctaTexts = (website.ctaTexts?.value || []).join(" ").toLowerCase();

  const industry = (company.industry?.value || product.industry?.value || "").toLowerCase();
  const hasProductData = !!(product.usp?.value || product.features?.value?.length);
  const hasCompetitorData = !!(competitors?.list?.value?.length);
  const hasSeoIssues = !!(seo?.issues?.value?.length);

  let goal = "Brand Awareness";
  let confidence = "low";
  let reason = "Insufficient evidence to determine specific business goal";
  let evidence = "insufficient_evidence";

  if (text.includes("launch") || text.includes("coming soon") || text.includes("new product")) {
    goal = "Launch Product";
    confidence = "medium";
    reason = "Website evidence suggests a product launch";
    evidence = "website_content_language";
  } else if (ctaTexts.includes("get started") || ctaTexts.includes("sign up") || ctaTexts.includes("try free")) {
    goal = "Increase Leads";
    confidence = "high";
    reason = "CTA evidence shows lead generation focus";
    evidence = "website_cta_analysis";
  } else if (ctaTexts.includes("buy") || ctaTexts.includes("shop") || ctaTexts.includes("purchase") || ctaTexts.includes("subscribe")) {
    goal = "Increase Sales";
    confidence = "high";
    reason = "CTA evidence shows direct sales focus";
    evidence = "website_cta_analysis";
  } else if (hasSeoIssues) {
    goal = "SEO Growth";
    confidence = "medium";
    reason = "SEO issues detected, indicating growth opportunity through organic search";
    evidence = "seo_technical_audit";
  } else if (industry.includes("saas") || industry.includes("software")) {
    goal = "Product Adoption";
    confidence = "low";
    reason = "Industry pattern suggests product adoption as primary goal (requires approval)";
    evidence = "industry_pattern_assumption";
  } else if (industry.includes("ecommerce") || industry.includes("retail")) {
    goal = "Increase Sales";
    confidence = "low";
    reason = "Industry pattern suggests sales as primary goal (requires approval)";
    evidence = "industry_pattern_assumption";
  } else if (text.includes("enterprise") || text.includes("for teams") || text.includes("business")) {
    goal = "Enterprise Sales";
    confidence = "low";
    reason = "Language targets enterprise audience (requires approval)";
    evidence = "content_language_assumption";
  } else if (hasProductData && hasCompetitorData) {
    goal = "Increase Leads";
    confidence = "medium";
    reason = "Product and competitor data available â€” lead generation is recommended starting point";
    evidence = "product_and_competitor_analysis";
  }

  return { goal, confidence, reason, evidence };
}

function buildCampaignObjective(context, goal) {
  const { product, company, audience } = context;
  const goalText = goal?.goal || "Brand Awareness";

  return {
    primary: {
      value: `Drive ${goalText.toLowerCase()} through evidence-based multi-channel marketing`,
      reason: "Derived from detected business goal and available evidence",
      evidence: "business_goal_detection"
    },
    secondary: {
      value: "Establish measurable marketing operations and data-driven decision making",
      reason: "All campaigns should establish measurement infrastructure",
      evidence: "campaign_best_practices"
    },
    successDefinition: {
      value: "Campaign KPIs measured and reported with actual data",
      reason: "Success must be defined by measurable outcomes",
      evidence: "kpi_framework_definition"
    },
    targetAudience: {
      value: audience?.primary?.value || null,
      reason: audience?.primary?.value ? "Derived from audience intelligence" : "Awaiting audience intelligence analysis",
      evidence: audience?.primary?.value ? "audience_intelligence" : "insufficient_evidence"
    },
    idealCustomer: {
      value: null,
      reason: "Insufficient data to construct ideal customer profile",
      evidence: "insufficient_evidence"
    },
    timeline: {
      value: (goal?.goal?.toLowerCase().includes('launch') || goal?.goal?.toLowerCase().includes('product')) ? "60 days" : "90 days (proposed planning horizon)",
      reason: "Proposed planning horizon based on campaign objectives",
      evidence: "ai_inferred: planning_horizon"
    },
    priority: "high",
    dependencies: [
      { dependency: "Complete audience intelligence analysis", reason: "Campaign targeting requires defined audience" },
      { dependency: "Set up measurement infrastructure", reason: "KPIs require tracking tools" }
    ]
  };
}

function buildAudienceSelection(context) {
  const { audience } = context;
  const hasData = !!(audience?.primary?.value || audience?.personas?.value?.length);

  const painPoints = audience?.painPoints?.value?.map(p => ({
    value: typeof p === "string" ? p : (p.value || p),
    evidence: "audience_intelligence"
  })) || [];

  if (!hasData) {
    return {
      primaryAudience: { value: "Insufficient evidence", reason: "No audience intelligence available", evidence: "insufficient_evidence" },
      secondaryAudience: null,
      buyingStage: { value: null, reason: "Insufficient evidence", evidence: "insufficient_evidence" },
      painPoints: [],
      decisionDrivers: [],
      objections: [],
      contentPreferences: []
    };
  }

  const personas = audience?.personas?.value || [];
  const firstPersona = personas[0] || {};

  return {
    primaryAudience: {
      value: audience?.primary?.value || firstPersona.name || "Unknown",
      reason: "Derived from audience intelligence analysis",
      evidence: "audience_intelligence"
    },
    secondaryAudience: personas.length > 1 ? {
      value: personas[1].name || "Secondary segment",
      reason: "Secondary segment from audience analysis",
      evidence: "audience_intelligence"
    } : null,
    buyingStage: {
      value: "awareness",
      reason: "Initial campaigns should focus on awareness before conversion",
      evidence: "funnel_strategy"
    },
    painPoints: painPoints.length > 0 ? painPoints : (firstPersona.painPoints || []).slice(0, 5).map(p => ({
      value: typeof p === "string" ? p : (p.value || "Unknown"),
      evidence: "audience_intelligence"
    })),
    decisionDrivers: (firstPersona.goals || []).slice(0, 5).map(g => ({
      value: typeof g === "string" ? g : (g.value || g),
      evidence: "audience_intelligence"
    })),
    objections: (firstPersona.objections || []).slice(0, 5).map(o => ({
      value: typeof o === "string" ? o : (o.value || o),
      evidence: "audience_intelligence"
    })),
    contentPreferences: (firstPersona.preferredContent || []).slice(0, 5).map(c => ({
      value: typeof c === "string" ? c : (c.value || c),
      evidence: "audience_intelligence"
    }))
  };
}

function makeChannelPlan(channel, role, fit, priority, reason, evidence, targetSegment, buyingStage, primaryAudience) {
  return {
    channel,
    role,
    targetSegment: targetSegment || primaryAudience || null,
    buyingStage: buyingStage || null,
    objective: '',
    targeting: '',
    message: '',
    contentFormats: [],
    landingDestination: '',
    cta: '',
    budgetLogic: '',
    kpis: [],
    testIdeas: [],
    fit,
    priority,
    reason,
    evidence,
    confidence: evidence !== 'best_practice' ? 'high' : 'medium',
    recommendedContent: '',
    recommendedCTA: '',
    organicOrPaid: 'organic'
  };
}

function determineChannels(context) {
  const { product, company, website, audience, competitors, seo, channels, growth } = context;
  const recs = [];

  const text = (website.heroText?.value || "") + " " +
    (website.metaDescription?.value || "") + " " +
    (product.description?.value || "") + " " +
    (company.name?.value || "");

  const lower = text.toLowerCase();
  const hasProductData = !!(product.usp?.value || product.features?.value?.length);
  const hasSeoKeywords = !!(seo?.keywords?.value?.length);
  const hasCompetitorData = !!(competitors?.list?.value?.length);
  const hasAudienceData = !!(audience?.personas?.value?.length || audience?.primary?.value);
  const primaryAudience = audience?.primary?.value || null;
  const productName = product.name?.value || company.name?.value || null;

  if (hasSeoKeywords || seo?.issues?.value?.length) {
    const plan = makeChannelPlan(
      'Organic SEO', 'Drive organic discovery', 'high', 'high',
      'SEO opportunities detected in analysis', 'seo_intelligence',
      'search audience', 'awareness', primaryAudience
    );
    plan.objective = 'Increase organic visibility for target keywords';
    plan.targeting = 'Search intent based on keyword clusters';
    plan.message = 'Educational and solution-oriented content';
    plan.contentFormats = ['Blog posts', 'Landing pages', 'How-to guides'];
    plan.landingDestination = '/blog/ /resources/';
    plan.organicOrPaid = 'organic';
    recs.push(plan);
  }

  if (hasProductData) {
    const plan = makeChannelPlan(
      'Content Marketing', 'Educate and build authority', 'high', 'high',
      'Product features and USPs identified', 'product_intelligence',
      'in-market buyers', 'consideration', primaryAudience
    );
    plan.objective = 'Showcase product value through educational content';
    plan.targeting = 'Topic clusters around product use cases';
    plan.message = 'Product benefits, comparisons, and thought leadership';
    plan.contentFormats = ['Case studies', 'Comparison guides', 'Feature highlights', 'Whitepapers'];
    plan.landingDestination = '/resources/ /product/';
    plan.organicOrPaid = 'organic';
    recs.push(plan);

    const emailPlan = makeChannelPlan(
      'Email Marketing', 'Nurture leads through lifecycle', 'medium', 'medium',
      'Product data available for nurture sequences', 'product_intelligence',
      'known leads and prospects', 'consideration', primaryAudience
    );
    emailPlan.objective = 'Move prospects through consideration to conversion';
    emailPlan.targeting = 'Segmented by behavior and lead source';
    emailPlan.message = 'Relevant product education and social proof';
    emailPlan.contentFormats = ['Drip sequences', 'Newsletter', 'Product updates'];
    emailPlan.landingDestination = '/product/ /demo/';
    emailPlan.organicOrPaid = 'organic';
    recs.push(emailPlan);
  }

  if (hasCompetitorData) {
    const plan = makeChannelPlan(
      'Paid Search', 'Capture competitor audience', 'high', 'high',
      'Competitor presence indicates paid search opportunity', 'competitor_intelligence',
      'competitor searchers', 'consideration', primaryAudience
    );
    plan.objective = 'Capture in-market audience searching for alternatives';
    plan.targeting = 'Competitor brand terms + category keywords';
    plan.message = 'Comparison messaging and unique value proposition';
    plan.contentFormats = ['Search ads', 'Comparison landing pages'];
    plan.landingDestination = '/vs-competitor/ /product/';
    plan.organicOrPaid = 'paid';
    recs.push(plan);
  }

  if (hasAudienceData) {
    const linkedinPlan = makeChannelPlan(
      'LinkedIn', 'B2B audience targeting', 'high', 'high',
      'Audience data enables precise LinkedIn targeting', 'audience_intelligence',
      'professional segments', 'awareness', primaryAudience
    );
    linkedinPlan.objective = 'Build brand awareness among target professional segments';
    linkedinPlan.targeting = 'Job titles, industries, company size, seniority';
    linkedinPlan.message = 'Thought leadership and industry insights';
    linkedinPlan.contentFormats = ['Sponsored content', 'InMail', 'Thought leadership posts'];
    linkedinPlan.landingDestination = '/product/ /resources/';
    linkedinPlan.organicOrPaid = 'both';
    recs.push(linkedinPlan);
  }

  if (hasAudienceData) {
    const xPlan = makeChannelPlan(
      'X (Twitter)', 'Community engagement and trends', 'medium', 'medium',
      'Audience insights available for community conversations', 'audience_intelligence',
      'industry followers and influencers', 'awareness', primaryAudience
    );
    xPlan.objective = 'Participate in industry conversations and build following';
    xPlan.targeting = 'Industry hashtags and relevant conversations';
    xPlan.message = 'Quick insights, industry news, community engagement';
    xPlan.contentFormats = ['Short posts', 'Threads', 'Visual content'];
    xPlan.landingDestination = '/product/ /blog/';
    xPlan.organicOrPaid = 'organic';
    recs.push(xPlan);
  }

  if (lower.includes("enterprise") || lower.includes("business") || lower.includes("team")) {
    const plan = makeChannelPlan(
      'Webinars / Events', 'Deep engagement with qualified prospects', 'high', 'medium',
      'Enterprise positioning detected â€” webinars effective for B2B', 'content_language_analysis',
      'enterprise decision-makers', 'consideration', primaryAudience
    );
    plan.objective = 'Generate qualified leads through educational events';
    plan.targeting = 'Decision-makers in target industries';
    plan.message = 'Solve specific industry challenges with product';
    plan.contentFormats = ['Live demos', 'Industry panels', 'Educational sessions'];
    plan.landingDestination = '/webinars/ /events/';
    plan.organicOrPaid = 'both';
    recs.push(plan);
  }

  if (lower.includes("youtube") || lower.includes("video") || lower.includes("demo") || lower.includes("visual")) {
    const plan = makeChannelPlan(
      'YouTube', 'Visual product demonstration', 'high', 'medium',
      'Video content referenced on website â€” YouTube showcases product visually', 'website_content_analysis',
      'visual learners and researchers', 'awareness', primaryAudience
    );
    plan.objective = 'Build product understanding through visual content';
    plan.targeting = 'Search intent around product category';
    plan.message = 'Visual demonstration of value and ease of use';
    plan.contentFormats = ['Product demos', 'Tutorials', 'Customer testimonials'];
    plan.landingDestination = '/product/ /demo/';
    plan.organicOrPaid = 'both';
    recs.push(plan);
  }

  if (channels?.length) {
    channels.forEach(suggested => {
      const channelName = suggested.channel || suggested.name;
      if (channelName && !recs.some(r => r.channel.toLowerCase() === channelName.toLowerCase())) {
        recs.push(makeChannelPlan(
          channelName, 'Evidence-suggested channel', 'medium', 'medium',
          'Suggested by channel analysis module', 'channel_analysis',
          primaryAudience, 'awareness', primaryAudience
        ));
      }
    });
  }

  return recs;
}

function buildTimeline(context, channels) {
  const { product, company, audience, seo } = context;
  const companyName = company.name?.value || product.name?.value || "Project";
  const hasAudienceData = !!(audience?.primary?.value || audience?.personas?.value?.length);
  const hasSeoData = !!(seo?.keywords?.value?.length || seo?.issues?.value?.length);
  const hasProductData = !!(product.usp?.value || product.features?.value?.length);

  return {
    week1: [
      { title: "Set up measurement infrastructure", description: "Configure analytics tools and KPI tracking for all channels", dependency: "None", ownerRole: "Marketing Operations", evidence: "best_practice" },
      { title: "Finalize audience segments", description: "Review and refine audience intelligence for campaign targeting", dependency: "Complete audience intelligence", ownerRole: "Marketing Strategist", evidence: hasAudienceData ? "audience_intelligence" : "needs_audience_analysis" },
      { title: "Create content calendar", description: "Plan first 30 days of content across priority channels", dependency: "Channel selection complete", ownerRole: "Content Manager", evidence: "channel_recommendations" },
    ],
    week2: [
      { title: "Launch organic SEO content", description: "Publish first batch of SEO-optimized content targeting identified keywords", dependency: "Content calendar created", ownerRole: "SEO Specialist", evidence: hasSeoData ? "seo_keyword_analysis" : "best_practice" },
      { title: "Set up LinkedIn company page", description: "Optimize LinkedIn presence and begin organic posting", dependency: "None", ownerRole: "Social Media Manager", evidence: "channel_recommendation" },
      { title: "Build email nurture sequence", description: "Create initial email workflow for lead nurturing", dependency: "Measurement infrastructure ready", ownerRole: "Email Marketer", evidence: "channel_recommendation" },
    ],
    week3: [
      { title: "Publish content marketing assets", description: "Release product-focused content and feature highlights", dependency: "Content production complete", ownerRole: "Content Manager", evidence: hasProductData ? "product_intelligence" : "best_practice" },
      { title: "Begin community engagement", description: "Start participating in relevant industry communities", dependency: "Brand guidelines finalized", ownerRole: "Community Manager", evidence: "channel_recommendation" },
      { title: "Review week 1-2 analytics", description: "Analyze initial data and adjust strategy", dependency: "Measurement infrastructure live", ownerRole: "Marketing Operations", evidence: "best_practice" },
    ],
    week4: [
      { title: "Optimize based on early data", description: "Adjust content strategy and channel mix based on performance", dependency: "Week 1-3 data collected", ownerRole: "Marketing Strategist", evidence: "best_practice" },
      { title: "Scale high-performing channels", description: "Double down on channels showing early traction", dependency: "Performance data collected", ownerRole: "Channel Manager", evidence: "best_practice" },
      { title: "Plan month 2 campaigns", description: "Develop detailed plan for second month based on learnings", dependency: "First month data", ownerRole: "Campaign Manager", evidence: "best_practice" },
    ],
    month2: [
      { title: "Expand content distribution", description: "Extend content reach through partnerships and syndication", dependency: "Content library established", ownerRole: "Content Manager", evidence: "best_practice" },
      { title: "Optimize landing pages", description: "Refine landing pages for engaged audience segments", dependency: "Sufficient traffic data", ownerRole: "SEO Specialist", evidence: "best_practice" },
      { title: "Deepen community presence", description: "Increase engagement in industry communities", dependency: "Community presence established", ownerRole: "Community Manager", evidence: "best_practice" },
    ],
    month3: [
      { title: "Full campaign performance review", description: "Comprehensive analysis of all channels and KPIs", dependency: "3 months of data", ownerRole: "Marketing Strategist", evidence: "best_practice" },
      { title: "Develop next quarter strategy", description: "Evidence-based plan for next campaign cycle", dependency: "Performance review complete", ownerRole: "Campaign Manager", evidence: "best_practice" },
      { title: "Document learnings", description: "Create playbook from campaign insights for future campaigns", dependency: "Campaign complete", ownerRole: "Marketing Operations", evidence: "best_practice" },
    ]
  };
}

function buildFunnel(context, channels) {
  const { product, company, audience } = context;
  const channelNames = channels.map(c => c.channel);
  const hasProductData = !!(product.usp?.value || product.features?.value?.length);
  const hasAudienceData = !!(audience?.primary?.value || audience?.personas?.value?.length);
  const hasCompetitorData = !!(context.competitors?.list?.value?.length);
  const goal = determineBusinessGoal(context).goal || '';
  const isLaunch = goal.toLowerCase().includes('launch');

  const funnel = {};

  if (hasAudienceData || hasCompetitorData || isLaunch) {
    funnel.awareness = {
      objective: isLaunch ? "Introduce the product to the market and build initial awareness" : "Build brand visibility and reach new audience segments",
      audience: audience?.primary?.value || null,
      barrier: isLaunch ? "Unknown brand, no market presence" : "Low brand recall",
      message: isLaunch ? "New solution for known problem" : "Thought leadership and industry insights",
      channel: channelNames.filter(c => ['LinkedIn', 'X (Twitter)', 'Organic SEO', 'YouTube'].includes(c)),
      content: "Educational content, thought leadership, SEO-optimized articles",
      cta: null,
      event: 'first_visit',
      kpi: null,
      evidence: hasAudienceData ? 'audience_intelligence' : 'campaign_goal'
    };
  }

  if (hasProductData || hasAudienceData) {
    funnel.consideration = {
      objective: "Educate prospects on product value and differentiation",
      audience: audience?.personas?.value?.[0]?.name || null,
      barrier: "Lack of product understanding vs competitors",
      message: "Product benefits, comparisons, and proof points",
      channel: channelNames.filter(c => ['Content Marketing', 'Email Marketing', 'Paid Search', 'Webinars / Events'].includes(c)),
      content: "Case studies, comparison guides, feature highlights, demo content",
      cta: null,
      event: 'demo_request',
      kpi: null,
      evidence: hasProductData ? 'product_intelligence' : 'audience_intelligence'
    };
  }

  if (hasProductData) {
    funnel.conversion = {
      objective: "Convert qualified prospects into customers",
      audience: null,
      barrier: "Price objection, implementation concerns",
      message: "Social proof, risk reduction, time-limited offers",
      channel: channelNames.filter(c => ['Email Marketing', 'Paid Search'].includes(c)),
      content: "Testimonials, free trial offers, case studies",
      cta: null,
      event: 'signup',
      kpi: null,
      evidence: 'product_intelligence'
    };
  }

  if (!isLaunch) {
    funnel.retention = {
      objective: "Drive product adoption and reduce churn",
      audience: null,
      barrier: "Low feature adoption, lack of ongoing engagement",
      message: "Value realization and continuous improvement",
      channel: channelNames.filter(c => ['Email Marketing', 'X (Twitter)', 'Webinars / Events'].includes(c)),
      content: "Onboarding sequences, product tips, success stories",
      cta: null,
      event: 'feature_adoption',
      kpi: null,
      evidence: 'best_practice'
    };
  }

  if (Object.keys(funnel).length === 0) {
    return {};
  }

  return funnel;
}

function buildKPIs(context) {
  const { product, company, seo, audience, competitors } = context;
  const kpis = [];

  const hasSeoData = !!(seo?.keywords?.value?.length || seo?.issues?.value?.length);
  const hasAudienceData = !!(audience?.primary?.value || audience?.personas?.value?.length);
  const hasCompetitorData = !!(competitors?.list?.value?.length);
  const hasProductData = !!(product.usp?.value || product.features?.value?.length);

  function makeKPI(name, businessDefinition, formula, eventSource, analyticsTool, integrationStatus, reportingFrequency, owner, attributionWindow, objective, funnelStage, eventName) {
    return {
      name,
      objective: objective || 'Measure campaign performance',
      funnelStage: funnelStage || 'full_funnel',
      definition: businessDefinition,
      businessDefinition,
      formula,
      eventName: eventName || eventSource || 'web_session',
      dataSource: analyticsTool || 'Not configured',
      integrationStatus: integrationStatus || 'TRACKABLE_NOT_CONNECTED',
      baselineStatus: integrationStatus || 'TRACKABLE_NOT_CONNECTED',
      targetStatus: 'TO_BE_DEFINED',
      reportingFrequency: reportingFrequency || 'weekly',
      owner: owner || 'Marketing Operations',
      attributionWindow: attributionWindow || '30 days',
      status: integrationStatus === 'CONNECTED' ? 'MEASURED' : integrationStatus === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'NOT_CONFIGURED'
    };
  }

  if (hasSeoData) {
    kpis.push(makeKPI('Organic Traffic', 'Number of visitors arriving via organic search', 'Sessions from organic search / Time period', 'Google Search Console + GA4', 'Google Search Console / Google Analytics', 'TRACKABLE_NOT_CONNECTED', 'weekly', 'SEO Specialist', '30 days'));
    kpis.push(makeKPI('Organic CTR', 'Click-through rate from search engine results', 'Clicks / Impressions * 100', 'Google Search Console', 'Google Search Console', 'TRACKABLE_NOT_CONNECTED', 'weekly', 'SEO Specialist', '30 days'));
    kpis.push(makeKPI('Organic Keyword Rankings', 'Average position of target keywords in SERP', 'Sum of positions / Number of tracked keywords', 'Google Search Console / DataForSEO', 'Google Search Console / DataForSEO', 'TRACKABLE_NOT_CONNECTED', 'weekly', 'SEO Specialist', '30 days'));
  }

  if (hasAudienceData) {
    kpis.push(makeKPI('Email Open Rate', 'Percentage of delivered emails that were opened', 'Unique opens / Delivered * 100', 'Email marketing platform', 'Brevo / Email Platform', 'TRACKABLE_NOT_CONNECTED', 'weekly', 'Email Marketer', '7 days'));
    kpis.push(makeKPI('Email CTR', 'Percentage of email recipients who clicked a link', 'Unique clicks / Delivered * 100', 'Email marketing platform', 'Brevo / Email Platform', 'TRACKABLE_NOT_CONNECTED', 'weekly', 'Email Marketer', '7 days'));
  }

  if (hasProductData) {
    kpis.push(makeKPI('Lead Count', 'Number of new leads generated from campaign', 'Count of form submissions + content downloads', 'CRM / Form submissions', 'CRM', 'TRACKABLE_NOT_CONNECTED', 'weekly', 'Marketing Operations', '30 days'));
    kpis.push(makeKPI('Demo Requests', 'Number of demo booking form submissions', 'Count of demo requests / Time period', 'CRM / Booking System', 'CRM', 'TRACKABLE_NOT_CONNECTED', 'weekly', 'Sales Development', '30 days'));
    kpis.push(makeKPI('Signup Rate', 'Percentage of visitors who create an account', 'Signups / Unique visitors * 100', 'Product Analytics', 'Product Analytics', 'TRACKABLE_NOT_CONNECTED', 'weekly', 'Product Marketing', '30 days'));
    kpis.push(makeKPI('Activation Rate', 'Percentage of signups reaching key activation milestone', 'Activated users / Signups * 100', 'Product Analytics', 'Product Analytics', 'TRACKABLE_NOT_CONNECTED', 'monthly', 'Product Marketing', '90 days'));
  }

  kpis.push(makeKPI('Website Traffic', 'Total website sessions', 'Sessions / Time period', 'Google Analytics 4', 'Google Analytics', 'TRACKABLE_NOT_CONNECTED', 'weekly', 'Marketing Operations', '30 days'));

  if (kpis.length === 0) {
    kpis.push(makeKPI('Website Traffic', 'Total website sessions', 'Sessions / Time period', 'Google Analytics 4', 'Google Analytics', 'TRACKABLE_NOT_CONNECTED', 'weekly', 'Marketing Operations', '30 days'));
  }

  return kpis;
}

function buildRisks(context) {
  const { product, company, website, audience, competitors, seo } = context;
  const risks = [];

  const hasProductData = !!(product.usp?.value || product.features?.value?.length);
  const hasAudienceData = !!(audience?.primary?.value || audience?.personas?.value?.length);
  const hasCompetitorData = !!(competitors?.list?.value?.length);
  const hasSeoData = !!(seo?.keywords?.value?.length || seo?.issues?.value?.length);
  const hasWebsiteData = !!(website.title?.value || website.heroText?.value);

  if (!hasAudienceData) {
    risks.push({
      risk: "Campaign targeting may be imprecise without defined audience segments",
      cause: "No audience intelligence data collected",
      evidence: "audience_intelligence_missing",
      severity: "high",
      mitigation: "Run audience intelligence analysis before campaign launch"
    });
  }

  if (!hasProductData) {
    risks.push({
      risk: "Messaging may lack differentiation without clear product positioning",
      cause: "No product USPs or features identified",
      evidence: "product_intelligence_missing",
      severity: "high",
      mitigation: "Complete product analysis to define key messaging pillars"
    });
  }

  if (!hasCompetitorData) {
    risks.push({
      risk: "Competitive blind spot may lead to undifferentiated positioning",
      cause: "No competitor intelligence collected",
      evidence: "competitor_intelligence_missing",
      severity: "medium",
      mitigation: "Run competitor analysis to understand market positioning"
    });
  }

  if (!hasWebsiteData) {
    risks.push({
      risk: "Website evidence may be insufficient for accurate campaign context",
      cause: "Website scraping or evidence collection did not return data",
      evidence: "website_evidence_missing",
      severity: "medium",
      mitigation: "Verify website URL is correct and accessible, then re-run evidence collection"
    });
  }

  if (!hasSeoData) {
    risks.push({
      risk: "SEO opportunities may be missed without search data",
      cause: "No SEO intelligence collected",
      evidence: "seo_intelligence_missing",
      severity: "low",
      mitigation: "Run SEO intelligence analysis to identify organic growth opportunities"
    });
  }

  return risks;
}

function buildOpportunities(context) {
  const { product, company, website, audience, competitors, seo } = context;
  const opportunities = [];

  const hasSeoData = !!(seo?.keywords?.value?.length || seo?.issues?.value?.length);
  const hasAudienceData = !!(audience?.primary?.value || audience?.personas?.value?.length);
  const hasCompetitorData = !!(competitors?.list?.value?.length);
  const hasProductData = !!(product.usp?.value || product.features?.value?.length);

  if (hasSeoData) {
    const keywords = seo?.keywords?.value?.slice(0, 3).map(k => k.keyword || k).filter(Boolean) || [];
    if (keywords.length > 0) {
      opportunities.push({
        opportunity: `Target SEO keywords: ${keywords.join(", ")}`,
        reason: "Keywords identified in SEO analysis with verified search potential",
        evidence: "seo_keyword_intelligence",
        effort: "medium",
        priority: "high",
        expectedBusinessImpact: "Increased organic traffic and search visibility"
      });
    }
  }

  if (hasAudienceData && audience?.primary?.value) {
    opportunities.push({
      opportunity: `Build targeted campaigns for ${audience.primary.value}`,
      reason: "Audience segments identified with defined pain points and preferences",
      evidence: "audience_intelligence",
      effort: "medium",
      priority: "high",
      expectedBusinessImpact: "Improved campaign relevance and conversion rates"
    });
  }

  if (hasProductData) {
    opportunities.push({
      opportunity: `Content marketing around product USP: ${product.usp?.value || "differentiated features"}`,
      reason: "Product USPs and features identified for compelling content creation",
      evidence: "product_intelligence",
      effort: "medium",
      priority: "high",
      expectedBusinessImpact: "Stronger brand positioning and customer acquisition"
    });
  }

  if (hasCompetitorData && competitors?.list?.value?.length > 0) {
    opportunities.push({
      opportunity: `Competitive differentiation against ${competitors.list.value[0]?.name || "identified competitors"}`,
      reason: "Competitors identified â€” opportunity to capture untapped market segments",
      evidence: "competitor_intelligence",
      effort: "medium",
      priority: "medium",
      expectedBusinessImpact: "Stronger competitive position and market share growth"
    });
  }

  return opportunities;
}

function buildNextActions(context) {
  const { product, company, website, audience, competitors, seo } = context;
  const actions = [];

  const hasAudienceData = !!(audience?.primary?.value || audience?.personas?.value?.length);
  const hasSeoData = !!(seo?.keywords?.value?.length || seo?.issues?.value?.length);
  const hasProductData = !!(product.usp?.value || product.features?.value?.length);
  const hasCompetitorData = !!(competitors?.list?.value?.length);

  if (!hasAudienceData) {
    actions.push({ action: "Run audience intelligence analysis", owner: "Marketing Operations", priority: "high", evidence: "required_for_targeting" });
  }
  if (!hasProductData) {
    actions.push({ action: "Complete product analysis with USP identification", owner: "Product Marketing", priority: "high", evidence: "required_for_messaging" });
  }
  if (!hasSeoData) {
    actions.push({ action: "Run SEO intelligence analysis", owner: "SEO Specialist", priority: "medium", evidence: "required_for_organic_growth" });
  }
  if (!hasCompetitorData) {
    actions.push({ action: "Run competitor intelligence analysis", owner: "Competitive Intelligence", priority: "medium", evidence: "required_for_positioning" });
  }

  actions.push({ action: "Set up measurement infrastructure for campaign KPIs", owner: "Marketing Operations", priority: "high", evidence: "required_for_all_kpis" });
  actions.push({ action: "Create content calendar for first 30 days", owner: "Content Manager", priority: "high", evidence: "channel_recommendations" });
  actions.push({ action: "Review and approve campaign plan", owner: "Marketing Director", priority: "high", evidence: "campaign_intelligence_complete" });

  return actions;
}
