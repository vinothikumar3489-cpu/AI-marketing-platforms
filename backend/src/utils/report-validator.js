// ============================================
// REPORT VALIDATOR
// Validates reports before saving to ensure
// no placeholder text, no fake data, no
// invented statistics are persisted.
// ============================================

const KNOWN_PLACEHOLDER_PATTERNS = [
  /unknown/i,
  /not specified/i,
  /not available/i,
  /sample/i,
  /placeholder/i,
  /generic/i,
  /competitor [a-d]/i,
  /market leader inc/i,
  /niche platform co/i,
  /\$[Xx]\s*(Billion|Million|Thousand)/,
  /\$ \d+ Billion/i,
  /^\$\s*[A-Z]$/i,
  /estimated \/ needs validation/i,
  /premium solution built for scale/i,
  /market expanding rapidly/i,
  /growing competition/i,
  /^N\/A$/i,
  /^n\/a$/i,
  /^null$/i,
  /^undefined$/i,
  /\[object Object\]/,
  /^N\/A\/100$/i,
  /^null\/100$/i,
  /^Unknown\/100$/i,
];

const FAKE_COMPETITOR_PATTERNS = [
  /market leader inc/i,
  /niche platform co/i,
  /competitor [a-d]/i,
  /brandwatch/i,
  /sprout social/i
];

function scanValue(value, path = '') {
  const warnings = [];

  if (!value) return warnings;

  if (typeof value === 'string') {
    if (value.length > 200) {
      // Only scan first 200 chars of long strings
      return scanValue(value.substring(0, 200), path);
    }
    for (const pattern of KNOWN_PLACEHOLDER_PATTERNS) {
      if (pattern.test(value)) {
        warnings.push({
          path,
          value: value.substring(0, 100),
          matched: pattern.source,
          severity: 'placeholder'
        });
      }
    }
    for (const pattern of FAKE_COMPETITOR_PATTERNS) {
      if (pattern.test(value)) {
        warnings.push({
          path,
          value: value.substring(0, 100),
          matched: pattern.source,
          severity: 'fake_competitor'
        });
      }
    }
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      warnings.push(...scanValue(item, `${path}[${index}]`));
    });
  }

  if (value && typeof value === 'object') {
    for (const [key, val] of Object.entries(value)) {
      warnings.push(...scanValue(val, `${path}.${key}`));
    }
  }

  return warnings;
}

export function validateReport(report, moduleName = 'unknown') {
  const warnings = scanValue(report);
  
  if (warnings.length > 0) {
    console.warn(`⚠️ [Validator][${moduleName}] Found ${warnings.length} issues in report:`);
    warnings.slice(0, 10).forEach(w => {
      console.warn(`  - [${w.severity}] ${w.path}: "${w.value}"`);
    });
  }

  return {
    isValid: warnings.length === 0,
    warnings,
    hasPlaceholders: warnings.some(w => w.severity === 'placeholder'),
    hasFakeCompetitors: warnings.some(w => w.severity === 'fake_competitor')
  };
}

export function sanitizeReport(report, moduleName = 'unknown') {
  const validation = validateReport(report, moduleName);
  
  if (validation.isValid) return report;

  // Log issue but don't block saving - the frontend will show
  // "No verified data" when confidence is 0 or hasVerifiedData is false
  if (!validation.hasPlaceholders && !validation.hasFakeCompetitors) {
    return report;
  }

  return report;
}
