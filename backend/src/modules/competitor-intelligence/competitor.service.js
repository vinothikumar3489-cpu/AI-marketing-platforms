

import prisma from "../../config/prisma.js";
import { generateCompetitorAnalysis } from "../../ai/services/competitorAnalysis.service.js";

export async function runCompetitorAnalysis({ chatId, userId, input } = {}) {
  try {
    // Verify chat ownership
    let finalChat = await prisma.chat.findFirst({
      where: { id: chatId, userId }
    });
    if (!finalChat) {
      return { success: false, error: "Chat not found or not owned by user" };
    }
    const finalChatId = finalChat.id;
    
    // Parse competitorUrls if it's a string (comma-separated)
    let competitorUrls = input.competitorUrls;
    if (typeof competitorUrls === "string" && competitorUrls.trim()) {
      competitorUrls = competitorUrls.split(",").map(url => url.trim()).filter(url => url);
    } else if (!Array.isArray(competitorUrls)) {
      competitorUrls = [];
    }
    const processedInput = { ...input, competitorUrls };

    // Generate analysis using our new AI router
    const aiResult = await generateCompetitorAnalysis(processedInput);

    if (!aiResult.success) {
      return { success: false, error: aiResult.error || "Failed to generate competitor analysis" };
    }

    // Save to CompetitorIntelligence table
    const saved = await prisma.competitorIntelligence.upsert({
      where: { chatId: finalChatId },
      create: {
        chatId: finalChatId,
        userId,
        competitorAnalysis: aiResult.data,
        provider: aiResult.provider,
        fallbackUsed: aiResult.fallbackUsed,
        inputJson: processedInput,
        status: "completed"
      },
      update: {
        competitorAnalysis: aiResult.data,
        provider: aiResult.provider,
        fallbackUsed: aiResult.fallbackUsed,
        inputJson: processedInput,
        status: "completed",
        updatedAt: new Date()
      }
    });

    // Also save a message to chat
    await prisma.message.create({
      data: {
        chatId: finalChatId,
        role: "assistant",
        content: `Competitor Analysis complete for ${input.productName || "your product"}`,
        analysisData: aiResult.data
      }
    });

    return {
      success: true,
      result: {
        ...aiResult.data,
        provider: aiResult.provider,
        fallbackUsed: aiResult.fallbackUsed
      },
      saved
    };

  } catch (e) {
    console.error("Competitor Analysis error:", e);
    return { success: false, error: e.message };
  }
}

/**
 * Derive buyer intent signals from the verified competitor analysis.
 * Deterministic — never invents data; empty when no analysis exists yet.
 */
function deriveIntentFromAnalysis(analysis) {
  const signals = [];
  const buyingTriggers = [];
  let buyerIntentScore = null;
  let audience = null;

  const pricing = Array.isArray(analysis?.pricingInsights) ? analysis.pricingInsights : [];
  const gaps = Array.isArray(analysis?.featureGapAnalysis) ? analysis.featureGapAnalysis : [];
  const opportunities = Array.isArray(analysis?.opportunitiesToBeatCompetitors) ? analysis.opportunitiesToBeatCompetitors : [];
  const weaknesses = Array.isArray(analysis?.competitorWeaknesses) ? analysis.competitorWeaknesses : [];
  const strengths = Array.isArray(analysis?.competitorStrengths) ? analysis.competitorStrengths : [];

  if (pricing.length > 0) {
    signals.push('pricing_comparison');
    buyingTriggers.push('Comparing pricing across alternatives');
  }
  if (gaps.length > 0) {
    signals.push('feature_research');
    buyingTriggers.push('Evaluating feature coverage');
  }
  if (opportunities.length > 0) {
    signals.push('differentiation_search');
    buyingTriggers.push('Looking for an alternative to current vendor');
  }
  if (weaknesses.length > 0) {
    signals.push('vendor_switch_intent');
  }
  if (strengths.length > 0) {
    signals.push('consideration_set_expansion');
  }

  const evidenceCount = pricing.length + gaps.length + opportunities.length + weaknesses.length + strengths.length;
  if (evidenceCount > 0) {
    buyerIntentScore = Math.min(40 + Math.round((evidenceCount / 10) * 60), 95);
  }

  if (analysis?.competitorList?.length > 0) {
    audience = `Audience evaluating ${analysis.competitorList.length} identified competitors`;
  }

  return {
    intents: signals,
    signals: signals.length > 0 ? signals : [],
    buyingTriggers,
    buyerIntentScore,
    audience,
    evidence: {
      competitorCount: analysis?.competitorList?.length || 0,
      pricingInsights: pricing.length,
      featureGaps: gaps.length,
      opportunities: opportunities.length,
      derivedFrom: 'verified_competitor_analysis'
    }
  };
}

/**
 * Build a positioning statement from verified competitor analysis.
 * Deterministic — composed from real weaknesses/opportunities, never fabricated.
 */
function derivePositioningFromAnalysis(analysis, productName) {
  const weaknesses = Array.isArray(analysis?.competitorWeaknesses) ? analysis.competitorWeaknesses : [];
  const opportunities = Array.isArray(analysis?.opportunitiesToBeatCompetitors) ? analysis.opportunitiesToBeatCompetitors : [];
  const gaps = Array.isArray(analysis?.featureGapAnalysis) ? analysis.featureGapAnalysis : [];
  const positioningComparison = analysis?.positioningComparison || '';
  const recommendedStrategy = analysis?.recommendedStrategy || '';

  if (weaknesses.length === 0 && opportunities.length === 0 && !positioningComparison) {
    return null;
  }

  const angle = opportunities[0] || `Address the gap of ${gaps[0] || 'an underserved segment'}`;
  const wedge = weaknesses[0] || positioningComparison;

  return {
    positioningStatement: `${productName || 'This product'} positioned as ${angle.toLowerCase().startsWith('a ') || angle.toLowerCase().startsWith('an ') ? angle : 'the ' + angle.toLowerCase()}`,
    differentiation: opportunities.slice(0, 3).join('. ') || positioningComparison,
    messagingAngles: opportunities.slice(0, 4),
    competitiveGaps: gaps.slice(0, 4),
    marketWedge: wedge,
    recommendedStrategy,
    evidence: {
      derivedFrom: 'verified_competitor_analysis',
      weaknessesUsed: weaknesses.length,
      opportunitiesUsed: opportunities.length
    }
  };
}

export async function runIntentPrediction({ chatId, userId, input } = {}) {
  try {
    const ci = await prisma.competitorIntelligence.findUnique({ where: { chatId } });
    const analysis = ci?.competitorAnalysis;
    const result = deriveIntentFromAnalysis(analysis);

    if (result.intents.length === 0) {
      return { success: false, error: "No competitor analysis available. Run competitor analysis first." };
    }

    await prisma.competitorIntelligence.upsert({
      where: { chatId },
      create: { chatId, userId, intentPrediction: result },
      update: { intentPrediction: result, updatedAt: new Date() }
    });
    return { success: true, result };
  } catch (e) {
    console.error("runIntentPrediction", e);
    return { success: false, error: e.message };
  }
}

export async function runPositioning({ chatId, userId, input } = {}) {
  try {
    const ci = await prisma.competitorIntelligence.findUnique({ where: { chatId } });
    const analysis = ci?.competitorAnalysis;
    const result = derivePositioningFromAnalysis(analysis, input?.productName || ci?.inputJson?.productName || '');

    if (!result) {
      return { success: false, error: "No competitor analysis available. Run competitor analysis first." };
    }

    await prisma.competitorIntelligence.upsert({
      where: { chatId },
      create: { chatId, userId, positioningEngine: result },
      update: { positioningEngine: result, updatedAt: new Date() }
    });
    return { success: true, result };
  } catch (e) {
    console.error("runPositioning", e);
    return { success: false, error: e.message };
  }
}
