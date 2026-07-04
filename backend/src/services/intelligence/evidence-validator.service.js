/**
 * Evidence Validator
 * Rejects: placeholders, hallucinations, fake metrics, 'unknown' objects,
 * generic text, duplicate recommendations.
 * Ensures every recommendation shown to users is traceable to collected evidence.
 */
const HALLUCINATION_PATTERNS = [
  /^X\s*(Billion|Million)/i,
  /\$X\s*(Billion|Million)/i,
  /placeholder/i,
  /lorem ipsum/i,
  /sample text/i,
  /\[.*?\]/,
  /^Example:/i,
  /^Sample:/i,
  /test product/i,
  /test company/i,
  /acme corp/i,
  /new analysis/i,
];

const GENERIC_LABELS = new Set([
  'target persona', 'target user', 'persona name', 'unknown',
  'insufficient data', 'n/a', 'none', 'not specified', 'generic',
  'general', 'standard', 'basic', 'premium', 'enterprise',
]);

const WEAK_EVIDENCE_SOURCES = new Set([
  'fallback', 'fallback_unavailable', 'none', 'unknown',
]);

export function validateRecommendation(item, moduleName = 'unknown') {
  if (!item || typeof item !== 'object') {
    return { valid: false, reason: 'Item is null or not an object', confidence: 0 };
  }

  const reasons = [];

  // Check for hallucination patterns in text fields
  const textFields = [item.value, item.title, item.name, item.description, item.summary, item.headline, item.body];
  for (const text of textFields) {
    if (!text || typeof text !== 'string') continue;
    if (HALLUCINATION_PATTERNS.some(p => p.test(text))) {
      reasons.push(`Contains hallucination pattern: "${text.substring(0, 50)}"`);
    }
  }

  // Check for generic labels
  const labelFields = [item.value, item.title, item.name, item.type, item.category];
  for (const label of labelFields) {
    if (!label || typeof label !== 'string') continue;
    if (GENERIC_LABELS.has(label.toLowerCase().trim())) {
      reasons.push(`Generic label: "${label}"`);
    }
  }

  // Check evidence metadata
  const evidence = item.evidence || item.source || {};
  const evidenceSource = evidence.source || evidence.api || item.source || '';
  if (WEAK_EVIDENCE_SOURCES.has(evidenceSource.toLowerCase().trim())) {
    reasons.push(`Weak evidence source: "${evidenceSource}"`);
  }

  // Check confidence
  const confidence = item.confidence || evidence.confidence || 0;
  if (confidence < 30 && confidence > 0) {
    reasons.push(`Low confidence: ${confidence}`);
  }

  // Check for empty or very short content
  const contentText = item.value || item.title || item.name || item.body || item.description || '';
  if (typeof contentText === 'string' && contentText.trim().length < 5) {
    reasons.push('Content too short to be meaningful');
  }

  // Validate evidence object structure
  if (item.evidence && typeof item.evidence === 'object') {
    const missingFields = [];
    if (!item.evidence.collectedAt) missingFields.push('collectedAt');
    if (!item.evidence.collector) missingFields.push('collector');
    if (missingFields.length > 0) {
      reasons.push(`Evidence missing metadata: ${missingFields.join(', ')}`);
    }
  }

  // Check for duplicates based on value text
  const dedupKey = (item.value || item.title || item.name || '').toLowerCase().trim();

  return {
    valid: reasons.length === 0,
    reasons,
    confidence: Math.max(0, confidence - (reasons.length * 15)),
    dedupKey,
    moduleName,
  };
}

export function validateRecommendations(items, moduleName = 'unknown') {
  if (!Array.isArray(items)) {
    return { valid: false, items: [], rejectedCount: 0, reasons: ['Input is not an array'] };
  }

  const validated = [];
  const rejected = [];
  const seenKeys = new Set();

  for (const item of items) {
    const result = validateRecommendation(item, moduleName);

    if (!result.valid) {
      rejected.push({ item, reason: result.reasons.join('; ') });
      continue;
    }

    // Deduplicate
    if (seenKeys.has(result.dedupKey)) {
      rejected.push({ item, reason: 'Duplicate recommendation' });
      continue;
    }
    seenKeys.add(result.dedupKey);

    validated.push({
      ...item,
      confidence: result.confidence,
      _validated: true,
      _validatedAt: new Date().toISOString(),
    });
  }

  return {
    valid: validated.length > 0,
    items: validated,
    rejectedCount: rejected.length,
    totalCount: items.length,
    acceptedCount: validated.length,
    rejected,
    moduleName,
  };
}

export function validateEvidenceObject(obj) {
  if (!obj || typeof obj !== 'object') {
    return { valid: false, reason: 'Not an object' };
  }

  const evidence = obj.evidence || obj;
  const source = evidence.source || evidence.api || '';

  if (!source || WEAK_EVIDENCE_SOURCES.has(source.toLowerCase())) {
    return { valid: false, reason: `Missing or weak evidence source: "${source}"` };
  }

  if (!evidence.collectedAt) {
    return { valid: false, reason: 'Missing collection timestamp' };
  }

  if (!evidence.collector) {
    return { valid: false, reason: 'Missing collector information' };
  }

  const confidence = evidence.confidence ?? obj.confidence ?? 0;
  if (confidence < 30 && confidence > 0) {
    return { valid: false, reason: `Low confidence: ${confidence}` };
  }

  return { valid: true, confidence };
}

export function sanitizeEvidenceText(text) {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text;
  HALLUCINATION_PATTERNS.forEach(p => {
    cleaned = cleaned.replace(p, '');
  });
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  if (cleaned.length < 5) return '';
  return cleaned;
}

export class EvidenceFilter {
  constructor() {
    this.stats = { accepted: 0, rejected: 0, total: 0 };
  }

  filter(items, moduleName = 'unknown') {
    const result = validateRecommendations(items, moduleName);
    this.stats.accepted += result.acceptedCount;
    this.stats.rejected += result.rejectedCount;
    this.stats.total += result.totalCount;
    return result;
  }

  getStats() {
    return { ...this.stats, passRate: this.stats.total > 0 ? Math.round((this.stats.accepted / this.stats.total) * 100) : 0 };
  }
}

export function createEvidenceFilter() {
  return new EvidenceFilter();
}
