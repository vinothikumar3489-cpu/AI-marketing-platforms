/**
 * Safe array helpers for normalizing Prisma JSON fields
 * Prevents crashes when JSON fields are objects, strings, null, or unexpected shapes
 */

/**
 * Safely convert any value to an array
 * Handles arrays, objects with nested arrays, strings, null, undefined
 */
export function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];

  if (typeof value === "object") {
    const candidateKeys = [
      "items",
      "data",
      "keywords",
      "opportunities",
      "primary",
      "secondary",
      "results",
      "list",
      "features",
      "benefits",
      "painPoints",
      "goals",
      "competitors",
      "channels",
      "objectives",
      "ctas",
      "technologies"
    ];

    for (const key of candidateKeys) {
      if (Array.isArray(value[key])) {
        return value[key];
      }
    }
  }

  if (typeof value === "string") {
    return [value];
  }

  return [];
}

/**
 * Take first N items from a value, safely converting to array first
 */
export function takeArray(value, limit = 10) {
  return asArray(value).slice(0, limit);
}

/**
 * Safely map over an array, handling null/undefined items
 */
export function safeMap(array, mapper) {
  return asArray(array).map((item, index) => {
    try {
      return mapper(item, index);
    } catch (e) {
      console.warn('[safeMap] Mapper failed for item at index', index, e);
      return null;
    }
  }).filter(Boolean);
}

/**
 * Safely filter an array
 */
export function safeFilter(array, predicate) {
  return asArray(array).filter(predicate);
}

/**
 * Get array length safely
 */
export function safeLength(value) {
  return asArray(value).length;
}

export default {
  asArray,
  takeArray,
  safeMap,
  safeFilter,
  safeLength
};
