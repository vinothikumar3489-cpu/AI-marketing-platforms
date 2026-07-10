export const EVIDENCE_LEVELS = {
  verified: "verified",
  evidence_backed: "evidence_backed",
  ai_inferred: "ai_inferred",
  topic_idea_only: "topic_idea_only",
  not_verified: "not_verified"
} as const;

export type EvidenceLevel = typeof EVIDENCE_LEVELS[keyof typeof EVIDENCE_LEVELS];

export const EVIDENCE_LABELS: Record<string, string> = {
  verified: "Verified",
  evidence_backed: "Evidence-backed",
  ai_inferred: "AI-inferred",
  topic_idea_only: "Topic idea only",
  not_verified: "Not verified"
};

export function getEvidenceLabel(level: string): string {
  return EVIDENCE_LABELS[level] || EVIDENCE_LABELS.not_verified;
}

export const NOT_MEASURED = "Not measured";
export const NOT_ENOUGH_EVIDENCE = "Not enough evidence";
export const DATA_UNAVAILABLE = "Data unavailable";

export function displayScore(score: number | null | undefined): string | number {
  if (score === null || score === undefined) return NOT_MEASURED;
  if (typeof score === 'number' && !isNaN(score)) return Math.round(score);
  return NOT_MEASURED;
}

export function displayScoreWithSuffix(score: number | null | undefined): string {
  if (score === null || score === undefined) return NOT_MEASURED;
  if (typeof score === 'number' && !isNaN(score)) return `${Math.round(score)}/100`;
  return NOT_MEASURED;
}

export function scoreCategory(score: number | null | undefined): string {
  if (score === null || score === undefined) return NOT_MEASURED;
  if (score >= 80) return 'Strong';
  if (score >= 50) return 'Developing';
  if (score >= 1) return 'Needs Improvement';
  if (score === 0) return 'Critical';
  return NOT_MEASURED;
}

export function computeComponentScore(components: Array<{score: number | null}>): number | null {
  const validScores = (components || []).filter(c => typeof c.score === 'number' && !isNaN(c.score));
  if (validScores.length < 3) return null;
  const total = validScores.reduce((sum, c) => sum + c.score, 0);
  return Math.round(total / validScores.length);
}
