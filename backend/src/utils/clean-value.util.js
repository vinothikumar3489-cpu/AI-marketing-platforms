/**
 * Clean Value Utility
 * Enterprise-grade normalization: removes placeholder junk ('Unknown', 'N/A',
 * 'Insufficient Data', 'null', 'undefined', '[object Object]'), fixes nested
 * objects, arrays, and produces display-safe values. Never throws.
 */

const PLACEHOLDER_PATTERN =
  /^(unknown|n\/?a|na|insufficient data|not available|not measured|not found|not provided|to be determined|tbd|n\/a?|null|undefined|none|none found|no data|n\/a\s*-\s*.+)$/i;

const OBJECT_STRING_PATTERN = /^\[object\s+[A-Za-z]+\]$/;

function isPlaceholder(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return true;
    if (OBJECT_STRING_PATTERN.test(trimmed)) return true;
    if (PLACEHOLDER_PATTERN.test(trimmed)) return true;
    // 'Unknown (reason)' style with only placeholder substance
    if (/^unknown\s*(\(|:|-)/i.test(trimmed)) return true;
    return false;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) return true;
  return false;
}

function isWhitespaceOnly(value) {
  return typeof value === 'string' && value.trim().length === 0;
}

/**
 * Deep-cleans a value: strips placeholder strings, empties placeholder objects/arrays,
 * preserves genuine data. Returns a NEW structure; never mutates input.
 * @param {*} value
 * @param {Object} [opts]
 * @param {boolean} [opts.keepArrays] - keep arrays even if all items are placeholders (default false)
 * @param {number} [opts.depth] - internal recursion guard
 */
export function cleanValue(value, opts = {}, depth = 0) {
  if (depth > 12) return null;

  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (isPlaceholder(trimmed)) return null;
    return trimmed;
  }

  if (Array.isArray(value)) {
    const cleaned = value.map((item) => cleanValue(item, opts, depth + 1));
    const hasReal = cleaned.some((item) => item !== null && item !== undefined && !(typeof item === 'object' && Object.keys(item).length === 0));
    if (!hasReal && opts.keepArrays !== true) return null;
    return cleaned.filter((item) => item !== null && item !== undefined && !(typeof item === 'object' && Object.keys(item).length === 0));
  }

  if (typeof value === 'object') {
    const out = {};
    let hasReal = false;
    for (const [key, val] of Object.entries(value)) {
      if (key.startsWith('_')) {
        out[key] = val;
        continue;
      }
      const cleaned = cleanValue(val, opts, depth + 1);
      const isReal =
        cleaned !== null &&
        cleaned !== undefined &&
        !(typeof cleaned === 'string' && isWhitespaceOnly(cleaned)) &&
        !(typeof cleaned === 'object' && !Array.isArray(cleaned) && Object.keys(cleaned).length === 0);
      if (isReal) hasReal = true;
      out[key] = isReal ? cleaned : null;
    }
    return hasReal ? out : null;
  }

  return value;
}

/**
 * Recursively strips placeholder STRINGS but keeps the parent object shape
 * (fields become null instead of the whole object vanishing).
 */
export function scrubPlaceholders(value, depth = 0) {
  if (depth > 12) return null;
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return isPlaceholder(value) ? null : value.trim() || null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    return value
      .map((item) => scrubPlaceholders(item, depth + 1))
      .filter((item) => item !== null && item !== undefined);
  }

  if (typeof value === 'object') {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      const cleaned = scrubPlaceholders(val, depth + 1);
      if (cleaned !== null && cleaned !== undefined) out[key] = cleaned;
      else out[key] = null;
    }
    return out;
  }

  return value;
}

/**
 * Safe stringifier for logging/reporting: objects become readable text, never '[object Object]'.
 */
export function safeStringify(value, fallback = 'Not provided') {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    if (isPlaceholder(trimmed)) return fallback;
    return trimmed;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    const parts = value.map((item) => safeStringify(item, '')).filter(Boolean);
    return parts.length ? parts.join(', ') : fallback;
  }
  if (typeof value === 'object') {
    const preferred = ['value', 'title', 'name', 'label', 'description', 'summary', 'text', 'keyword', 'channel', 'recommendation', 'action'];
    for (const key of preferred) {
      if (value[key] !== undefined && value[key] !== null) {
        const str = safeStringify(value[key], '');
        if (str) return str;
      }
    }
    try {
      const json = JSON.stringify(value);
      if (json && json !== '{}' && json !== '[]') return json;
    } catch {
      /* ignore */
    }
    return fallback;
  }
  return String(value);
}

/**
 * Coerces a value into a number, preserving null (never coerces placeholder text to 0).
 */
export function cleanNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const numeric = Number(trimmed.replace(/[,$%\s]/g, ''));
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
}

/**
 * Ensures a value is a display-ready text with a graceful fallback (never 'Unknown' leak).
 */
export function ensureText(value, fallback = null) {
  const cleaned = cleanValue(value);
  if (cleaned === null || cleaned === undefined) return fallback;
  if (typeof cleaned === 'string') return cleaned;
  return safeStringify(cleaned, fallback);
}

/**
 * Returns true when the value is genuine (not placeholder, not empty).
 */
export function hasRealValue(value) {
  return cleanValue(value) !== null;
}

export const CLEAN_VALUE_PLACEHOLDER_PATTERN = PLACEHOLDER_PATTERN;
