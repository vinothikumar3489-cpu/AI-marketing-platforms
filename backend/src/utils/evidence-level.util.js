export const EVIDENCE_LEVELS = {
  verified: "verified",
  evidence_backed: "evidence_backed",
  ai_inferred: "ai_inferred",
  topic_idea_only: "topic_idea_only",
  not_verified: "not_verified"
};

export const EVIDENCE_LABELS = {
  verified: "Verified",
  evidence_backed: "Evidence-backed",
  ai_inferred: "AI-inferred",
  topic_idea_only: "Topic idea only",
  not_verified: "Not verified"
};

export function getEvidenceLabel(level) {
  return EVIDENCE_LABELS[level] || EVIDENCE_LABELS.not_verified;
}

export function isVerified(level) {
  return level === EVIDENCE_LEVELS.verified || level === EVIDENCE_LEVELS.evidence_backed;
}

export function determineEvidenceLevel(hasDirectSource, hasApiData, hasAiInference) {
  if (hasDirectSource) return EVIDENCE_LEVELS.verified;
  if (hasApiData) return EVIDENCE_LEVELS.evidence_backed;
  if (hasAiInference) return EVIDENCE_LEVELS.ai_inferred;
  return EVIDENCE_LEVELS.topic_idea_only;
}

export function scoreToEvidenceLevel(score) {
  if (score === null || score === undefined) return EVIDENCE_LEVELS.not_verified;
  if (score >= 80) return EVIDENCE_LEVELS.verified;
  if (score >= 50) return EVIDENCE_LEVELS.evidence_backed;
  if (score >= 25) return EVIDENCE_LEVELS.ai_inferred;
  return EVIDENCE_LEVELS.topic_idea_only;
}

export const NOT_MEASURED = "Not measured";
export const NOT_ENOUGH_EVIDENCE = "Not enough evidence";
export const DATA_UNAVAILABLE = "Data unavailable";

export function displayScore(score) {
  if (score === null || score === undefined) return NOT_MEASURED;
  if (typeof score === 'number' && !isNaN(score)) return Math.round(score);
  return NOT_MEASURED;
}

export function displayScoreWithSuffix(score) {
  if (score === null || score === undefined) return NOT_MEASURED;
  if (typeof score === 'number' && !isNaN(score)) return `${Math.round(score)}/100`;
  return NOT_MEASURED;
}

export function scoreCategory(score) {
  if (score === null || score === undefined) return NOT_MEASURED;
  if (score >= 80) return 'Strong';
  if (score >= 50) return 'Developing';
  if (score >= 1) return 'Needs Improvement';
  if (score === 0) return 'Critical';
  return NOT_MEASURED;
}

export function computeComponentScore(components) {
  const validScores = (components || []).filter(c => c && typeof c.score === 'number' && !isNaN(c.score));
  if (validScores.length < 3) return null;
  const total = validScores.reduce((sum, c) => sum + c.score, 0);
  return Math.round(total / validScores.length);
}

export function createEvidenceItem(value, evidenceLevel, source) {
  return {
    value,
    evidenceLevel: evidenceLevel || EVIDENCE_LEVELS.not_verified,
    source: source || null,
    retrievedAt: source ? new Date().toISOString() : null
  };
}
