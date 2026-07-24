/**
 * Shared Enums for Content Studio and Intelligence modules.
 * Prevents string duplication and ensures consistency between generators and validators.
 */

export const InferenceStatus = {
  EVIDENCE_BACKED: 'EVIDENCE_BACKED',
  AI_INFERRED: 'AI_INFERRED',
  USER_PROVIDED: 'USER_PROVIDED',
  NOT_MEASURED: 'NOT_MEASURED',
  BEST_PRACTICE: 'BEST_PRACTICE'
};

export default { InferenceStatus };
