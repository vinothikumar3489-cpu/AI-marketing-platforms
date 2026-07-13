/**
 * Tests for Content Brief schema validation
 */

import { validateContentBrief } from '../validators/content-brief.schema.js';

describe('Content Brief Schema Validation', () => {
  describe('validateContentBrief', () => {
    test('validates complete content brief', () => {
      const brief = {
        success: true,
        data: {
          company: {
            name: 'Test Company',
            productName: 'Test Product',
            brandName: 'Test Brand',
            websiteUrl: 'https://example.com',
            domain: 'example.com',
            industry: 'Technology'
          },
          product: {
            name: 'Test Product',
            brandName: 'Test Brand',
            summary: 'Test summary',
            features: ['feature1', 'feature2'],
            benefits: ['benefit1', 'benefit2'],
            usp: 'Test USP'
          },
          website: {
            title: 'Test Title',
            metaDescription: 'Test description',
            heroText: 'Test hero',
            ctaTexts: ['CTA1', 'CTA2'],
            pageTypes: 'landing',
            technologyHints: ['react', 'node']
          },
          targetPersonas: [
            { name: 'Persona1', role: 'Developer', painPoints: ['pain1'], goals: ['goal1'] }
          ],
          painPoints: ['pain1', 'pain2'],
          objections: ['objection1'],
          validatedCompetitors: [
            { name: 'Competitor1', domain: 'competitor1.com', strengths: ['strength1'], weaknesses: ['weakness1'] }
          ],
          verifiedKeywords: [
            { keyword: 'test', volume: 100, difficulty: 50 }
          ],
          topicIdeas: [
            { topic: 'Topic1', reason: 'Reason1', contentType: 'blog' }
          ],
          contentGaps: [
            { topic: 'Gap1', reason: 'Reason1', priority: 'high' }
          ],
          tone: 'professional',
          CTA: ['CTA1'],
          evidenceSources: {
            hasEvidenceSnapshot: true,
            hasProductIntel: true,
            hasCompetitorIntel: true,
            hasSeoIntel: true
          },
          limitations: [],
          warnings: [],
          _briefId: 'brief_123',
          _chatId: 'chat123',
          _userId: 'user123',
          _builtAt: new Date().toISOString()
        },
        warnings: []
      };

      const result = validateContentBrief(brief);
      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
    });

    test('validates content brief with minimal data', () => {
      const brief = {
        success: true,
        data: {
          company: {
            name: null,
            productName: null,
            brandName: null,
            websiteUrl: null,
            domain: null,
            industry: null
          },
          product: {
            name: null,
            brandName: null,
            summary: null,
            features: [],
            benefits: [],
            usp: null
          },
          website: {
            title: null,
            metaDescription: null,
            heroText: null,
            ctaTexts: [],
            pageTypes: null,
            technologyHints: []
          },
          targetPersonas: [],
          painPoints: [],
          objections: [],
          validatedCompetitors: [],
          verifiedKeywords: [],
          topicIdeas: [],
          contentGaps: [],
          tone: 'professional',
          CTA: [],
          evidenceSources: {
            hasEvidenceSnapshot: false,
            hasProductIntel: false,
            hasCompetitorIntel: false,
            hasSeoIntel: false
          },
          limitations: [],
          warnings: [],
          _briefId: 'brief_123',
          _chatId: 'chat123',
          _userId: 'user123',
          _builtAt: new Date().toISOString()
        },
        warnings: []
      };

      const result = validateContentBrief(brief);
      expect(result.valid).toBe(true);
    });

    test('rejects invalid websiteUrl', () => {
      const brief = {
        success: true,
        data: {
          company: {
            name: 'Test',
            productName: 'Test',
            brandName: 'Test',
            websiteUrl: 'not-a-valid-url',
            domain: 'example.com',
            industry: 'Technology'
          },
          product: {
            name: 'Test',
            brandName: 'Test',
            summary: 'Test',
            features: [],
            benefits: [],
            usp: null
          },
          website: {
            title: null,
            metaDescription: null,
            heroText: null,
            ctaTexts: [],
            pageTypes: null,
            technologyHints: []
          },
          targetPersonas: [],
          painPoints: [],
          objections: [],
          validatedCompetitors: [],
          verifiedKeywords: [],
          topicIdeas: [],
          contentGaps: [],
          tone: 'professional',
          CTA: [],
          evidenceSources: {
            hasEvidenceSnapshot: false,
            hasProductIntel: false,
            hasCompetitorIntel: false,
            hasSeoIntel: false
          },
          limitations: [],
          warnings: [],
          _briefId: 'brief_123',
          _chatId: 'chat123',
          _userId: 'user123',
          _builtAt: new Date().toISOString()
        },
        warnings: []
      };

      const result = validateContentBrief(brief);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    test('rejects missing required fields', () => {
      const brief = {
        success: true,
        data: {
          // Missing required fields
        },
        warnings: []
      };

      const result = validateContentBrief(brief);
      expect(result.valid).toBe(false);
    });
  });
});
