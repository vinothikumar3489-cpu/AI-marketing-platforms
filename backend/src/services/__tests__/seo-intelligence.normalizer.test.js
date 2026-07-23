/**
 * Tests for SEO Intelligence normalizer
 */

import { normalizeSeoForExecution } from "../normalizers/seo-intelligence.normalizer.js";

describe('SEO Intelligence Normalizer', () => {
  describe('normalizeSeoForExecution', () => {
    test('handles null input', () => {
      const result = normalizeSeoForExecution(null);
      expect(result.available).toBe(false);
      expect(result.keywords).toEqual([]);
      expect(result.warnings).toContain('SEO intelligence not available');
    });

    test('handles undefined input', () => {
      const result = normalizeSeoForExecution(undefined);
      expect(result.available).toBe(false);
      expect(result.keywords).toEqual([]);
    });

    test('normalizes keywordOpportunities as array', () => {
      const seoInfo = {
        keywordOpportunities: [
          { keyword: 'test', volume: 100, difficulty: 50 }
        ]
      };
      const result = normalizeSeoForExecution(seoInfo);
      expect(result.available).toBe(true);
      expect(result.keywords.length).toBe(1);
      expect(result.keywords[0].keyword).toBe('test');
    });

    test('normalizes keywordOpportunities as object with opportunities array', () => {
      const seoInfo = {
        keywordIntelligence: {
          opportunities: [
            { keyword: 'test', volume: 100, difficulty: 50 }
          ]
        }
      };
      const result = normalizeSeoForExecution(seoInfo);
      expect(result.available).toBe(true);
      expect(result.keywords.length).toBe(1);
    });

    test('normalizes keywordOpportunities as object with keywords array', () => {
      const seoInfo = {
        keywordIntelligence: {
          keywords: [
            { keyword: 'test', volume: 100, difficulty: 50 }
          ]
        }
      };
      const result = normalizeSeoForExecution(seoInfo);
      expect(result.available).toBe(true);
      expect(result.keywords.length).toBe(1);
    });

    test('handles keywordOpportunities as object (no array)', () => {
      const seoInfo = {
        keywordOpportunities: { count: 10 }
      };
      const result = normalizeSeoForExecution(seoInfo);
      expect(result.available).toBe(true);
      expect(result.keywords).toEqual([]);
      expect(result.warnings).toContain('No keyword data available in SEO intelligence');
    });

    test('normalizes contentGaps', () => {
      const seoInfo = {
        contentGaps: [
          { topic: 'test topic', reason: 'test reason' }
        ]
      };
      const result = normalizeSeoForExecution(seoInfo);
      expect(result.contentGaps.length).toBe(1);
      expect(result.contentGaps[0].topic).toBe('test topic');
    });

    test('normalizes blogIdeas', () => {
      const seoInfo = {
        blogIdeas: [
          { topic: 'test idea', reason: 'test reason' }
        ]
      };
      const result = normalizeSeoForExecution(seoInfo);
      expect(result.blogIdeas.length).toBe(1);
      expect(result.blogIdeas[0].topic).toBe('test idea');
    });

    test('adds warning when no keywords available', () => {
      const seoInfo = {
        contentGaps: [{ topic: 'test' }]
      };
      const result = normalizeSeoForExecution(seoInfo);
      expect(result.warnings).toContain('No keyword data available in SEO intelligence');
    });

    test('adds warning when no content gaps available', () => {
      const seoInfo = {
        keywordOpportunities: [{ keyword: 'test' }]
      };
      const result = normalizeSeoForExecution(seoInfo);
      expect(result.warnings).toContain('No content gap analysis available');
    });

    test('normalizes primaryKeywords', () => {
      const seoInfo = {
        primaryKeywords: ['kw1', 'kw2']
      };
      const result = normalizeSeoForExecution(seoInfo);
      expect(result.primaryKeywords.length).toBe(2);
    });

    test('normalizes secondaryKeywords', () => {
      const seoInfo = {
        secondaryKeywords: ['kw1', 'kw2']
      };
      const result = normalizeSeoForExecution(seoInfo);
      expect(result.secondaryKeywords.length).toBe(2);
    });

    test('normalizes longTailKeywords', () => {
      const seoInfo = {
        longTailKeywords: ['kw1', 'kw2']
      };
      const result = normalizeSeoForExecution(seoInfo);
      expect(result.longTailKeywords.length).toBe(2);
    });
  });
});
