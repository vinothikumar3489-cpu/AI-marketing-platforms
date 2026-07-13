/**
 * Tests for product identity resolver
 */

import { resolveProductIdentity } from '../resolvers/product-identity.resolver.js';

describe('Product Identity Resolver', () => {
  describe('resolveProductIdentity', () => {
    test('prioritizes ProductIntelligence.productName', () => {
      const chat = { title: 'New Analysis', productName: 'Chat Product' };
      const productIntelligence = { productName: 'Virlo', brandName: 'Virlo' };
      
      const result = resolveProductIdentity({ chat, productIntelligence });
      
      expect(result.productName).toBe('Virlo');
      expect(result.brandName).toBe('Virlo');
      expect(result.source).toBe('productIntelligence');
    });

    test('falls back to productAnalysis.name', () => {
      const chat = { title: 'New Analysis' };
      const productIntelligence = { productAnalysis: { name: 'Virlo' } };
      
      const result = resolveProductIdentity({ chat, productIntelligence });
      
      expect(result.productName).toBe('Virlo');
      expect(result.source).toBe('productAnalysis');
    });

    test('falls back to evidenceSnapshot brand', () => {
      const chat = { title: 'New Analysis' };
      const evidenceSnapshot = { evidence: { brand: { name: 'Virlo' } } };
      
      const result = resolveProductIdentity({ chat, evidenceSnapshot });
      
      expect(result.productName).toBe('Virlo');
      expect(result.source).toBe('evidenceSnapshot');
    });

    test('extracts domain from websiteUrl', () => {
      const chat = { websiteUrl: 'https://virlo.ai' };
      
      const result = resolveProductIdentity({ chat });
      
      expect(result.domain).toBe('virlo.ai');
      expect(result.productName).toBe('Virlo');
      expect(result.source).toBe('domain');
    });

    test('uses chat.productName if explicitly set (not default)', () => {
      const chat = { title: 'New Analysis', productName: 'Custom Product' };
      
      const result = resolveProductIdentity({ chat });
      
      expect(result.productName).toBe('Custom Product');
      expect(result.source).toBe('chat');
    });

    test('uses chat.title as final fallback', () => {
      const chat = { title: 'My Project' };
      
      const result = resolveProductIdentity({ chat });
      
      expect(result.productName).toBe('My Project');
      expect(result.source).toBe('titleFallback');
    });

    test('sets brandName from productName if not set', () => {
      const chat = { title: 'My Project' };
      
      const result = resolveProductIdentity({ chat });
      
      expect(result.brandName).toBe('My Project');
    });

    test('sets companyName from brandName if not set', () => {
      const chat = { title: 'My Project' };
      
      const result = resolveProductIdentity({ chat });
      
      expect(result.companyName).toBe('My Project');
    });

    test('returns projectTitle from chat.title', () => {
      const chat = { title: 'New Analysis' };
      
      const result = resolveProductIdentity({ chat });
      
      expect(result.projectTitle).toBe('New Analysis');
    });

    test('handles malformed URL gracefully', () => {
      const chat = { websiteUrl: 'invalid-url' };
      
      const result = resolveProductIdentity({ chat });
      
      expect(result.domain).toBe('invalid-url');
    });
  });
});
