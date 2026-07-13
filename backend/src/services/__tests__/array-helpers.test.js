/**
 * Tests for array-helpers normalizer
 */

import { asArray, takeArray, safeMap, safeFilter, safeLength } from '../normalizers/array-helpers.js';

describe('Array Helpers', () => {
  describe('asArray', () => {
    test('returns array as-is', () => {
      expect(asArray([1, 2, 3])).toEqual([1, 2, 3]);
    });

    test('returns empty array for null', () => {
      expect(asArray(null)).toEqual([]);
    });

    test('returns empty array for undefined', () => {
      expect(asArray(undefined)).toEqual([]);
    });

    test('extracts nested array from object with items key', () => {
      expect(asArray({ items: [1, 2, 3] })).toEqual([1, 2, 3]);
    });

    test('extracts nested array from object with data key', () => {
      expect(asArray({ data: [1, 2, 3] })).toEqual([1, 2, 3]);
    });

    test('extracts nested array from object with keywords key', () => {
      expect(asArray({ keywords: ['kw1', 'kw2'] })).toEqual(['kw1', 'kw2']);
    });

    test('returns array for string', () => {
      expect(asArray('test')).toEqual(['test']);
    });

    test('returns empty array for object without nested arrays', () => {
      expect(asArray({ name: 'test' })).toEqual([]);
    });
  });

  describe('takeArray', () => {
    test('limits array to specified length', () => {
      expect(takeArray([1, 2, 3, 4, 5], 3)).toEqual([1, 2, 3]);
    });

    test('handles null', () => {
      expect(takeArray(null, 3)).toEqual([]);
    });

    test('handles object with nested array', () => {
      expect(takeArray({ items: [1, 2, 3, 4, 5] }, 2)).toEqual([1, 2]);
    });

    test('defaults to limit 10', () => {
      expect(takeArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });
  });

  describe('safeMap', () => {
    test('maps array successfully', () => {
      expect(safeMap([1, 2, 3], x => x * 2)).toEqual([2, 4, 6]);
    });

    test('handles null', () => {
      expect(safeMap(null, x => x * 2)).toEqual([]);
    });

    test('filters out null results from mapper', () => {
      expect(safeMap([1, null, 3], x => x ? x * 2 : null)).toEqual([2, 6]);
    });

    test('handles mapper errors', () => {
      const result = safeMap([1, 'invalid', 3], x => {
        if (typeof x === 'string') throw new Error('Invalid');
        return x * 2;
      });
      expect(result).toEqual([2, 6]);
    });
  });

  describe('safeFilter', () => {
    test('filters array successfully', () => {
      expect(safeFilter([1, 2, 3, 4], x => x % 2 === 0)).toEqual([2, 4]);
    });

    test('handles null', () => {
      expect(safeFilter(null, x => x % 2 === 0)).toEqual([]);
    });
  });

  describe('safeLength', () => {
    test('returns array length', () => {
      expect(safeLength([1, 2, 3])).toBe(3);
    });

    test('returns 0 for null', () => {
      expect(safeLength(null)).toBe(0);
    });

    test('extracts length from nested array', () => {
      expect(safeLength({ items: [1, 2, 3] })).toBe(3);
    });
  });
});
