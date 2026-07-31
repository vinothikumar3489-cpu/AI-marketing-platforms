export function mapCampaignPlanToPersistence(generatedPlan, { userId, chatId, existingPlan }) {
  const d = generatedPlan || {};
  const meta = d._metadata || {};
  const nextVersion = (existingPlan?.version ?? 0) + 1;

  // Never null-out previously persisted values on regeneration — merge with prior record.
  const mergeField = (value, prior) => (value !== null && value !== undefined ? value : prior);

  const base = {
    executiveSummary: mergeField(d.executiveSummary, existingPlan?.executiveSummary),
    businessGoal: mergeField(d.businessGoal, existingPlan?.businessGoal),
    campaignObjective: mergeField(d.campaignObjective, existingPlan?.campaignObjective),
    audienceSelection: mergeField(d.audienceSelection, existingPlan?.audienceSelection),
    channelRecommendations: mergeField(d.channelRecommendations, existingPlan?.channelRecommendations),
    timeline: mergeField(d.timeline, existingPlan?.timeline),
    marketingFunnel: mergeField(d.marketingFunnel, existingPlan?.marketingFunnel),
    kpiFramework: mergeField(d.kpiFramework, existingPlan?.kpiFramework),
    riskAssessment: mergeField(d.riskAssessment, existingPlan?.riskAssessment),
    opportunityAssessment: mergeField(d.opportunityAssessment, existingPlan?.opportunityAssessment),
    nextActions: mergeField(d.nextActions ?? d.executiveSummary?.nextActions, existingPlan?.nextActions),
    status: "draft",
    provider: meta.provider ?? "ai",
    fallbackUsed: meta.fallbackUsed ?? false,
    version: nextVersion,
    inputJson: {
      _metadata: {
        generatedAt: meta.generatedAt ?? new Date().toISOString(),
        evidenceHash: meta.evidenceHash ?? null,
        contradictionsDetected: meta.contradictionsDetected ?? 0,
        contradictions: meta.contradictions ?? [],
        generationStatus: meta.generationStatus ?? "FULLY_GENERATED",
        generationMode: meta.generationMode ?? (meta.fallbackUsed ? "FALLBACK" : "AI"),
        attempts: meta.attempts ?? 1,
        warnings: meta.warnings ?? [],
        fallbackReason: meta.fallbackReason ?? null,
        updatedAt: meta.updatedAt ?? null,
      },
    },
  };

  const create = { ...base, userId, chatId };
  const update = { ...base };

  return { create, update };
}

export function extractMetadata(inputJson) {
  if (!inputJson || typeof inputJson === "string") {
    try { inputJson = JSON.parse(inputJson || "{}"); } catch { inputJson = {}; }
  }
  return inputJson?._metadata || {};
}
