export function mapCampaignPlanToPersistence(generatedPlan, { userId, chatId, existingPlan }) {
  const d = generatedPlan || {};
  const meta = d._metadata || {};
  const nextVersion = (existingPlan?.version ?? 0) + 1;

  const base = {
    executiveSummary: d.executiveSummary ?? null,
    businessGoal: d.businessGoal ?? null,
    campaignObjective: d.campaignObjective ?? null,
    audienceSelection: d.audienceSelection ?? null,
    channelRecommendations: d.channelRecommendations ?? null,
    timeline: d.timeline ?? null,
    marketingFunnel: d.marketingFunnel ?? null,
    kpiFramework: d.kpiFramework ?? null,
    riskAssessment: d.riskAssessment ?? null,
    opportunityAssessment: d.opportunityAssessment ?? null,
    nextActions: d.nextActions ?? d.executiveSummary?.nextActions ?? null,
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
