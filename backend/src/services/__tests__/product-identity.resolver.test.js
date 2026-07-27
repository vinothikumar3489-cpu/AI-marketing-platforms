import { resolveProductIdentity } from '../resolvers/product-identity.resolver.js';

describe('Product Identity Resolver', () => {
  describe('resolveProductIdentity', () => {
    test('prioritizes inputJson.productName from ProductIntelligence', () => {
      const chat = { title: 'New Analysis', productName: 'Chat Product' };
      const productIntelligence = { inputJson: { productName: 'Virlo' }, productName: 'Virlo', brandName: 'Virlo' };

      const result = resolveProductIdentity({ chat, productIntelligence });

      expect(result.productName).toBe('Virlo');
      expect(result.brandName).toBe('Virlo');
      expect(result.source).toBe('inputJson_productName');
      expect(result.resolved).toBe(true);
    });

    test('falls back to productAnalysis.productName', () => {
      const chat = { title: 'New Analysis' };
      const productIntelligence = { productAnalysis: { productName: 'Virlo' } };

      const result = resolveProductIdentity({ chat, productIntelligence });

      expect(result.productName).toBe('Virlo');
      expect(result.source).toBe('pi_analysis_productName');
      expect(result.resolved).toBe(true);
    });

    test('falls back to evidenceSnapshot product data', () => {
      const chat = { title: 'New Analysis' };
      const evidenceSnapshot = { evidence: { product: { name: 'Virlo' } } };

      const result = resolveProductIdentity({ chat, evidenceSnapshot });

      expect(result.productName).toBe('Virlo');
      expect(result.source).toBe('evidence_product_name');
      expect(result.resolved).toBe(true);
    });

    test('extracts domain from websiteUrl', () => {
      const chat = { websiteUrl: 'https://virlo.ai' };

      const result = resolveProductIdentity({ chat });

      expect(result.domain).toBe('virlo.ai');
      expect(result.productName).toBe('Virlo');
      expect(result.source).toBe('domain');
      expect(result.resolved).toBe(true);
    });

    test('uses chat.productName if explicitly set', () => {
      const chat = { title: 'New Analysis', productName: 'Custom Product' };

      const result = resolveProductIdentity({ chat });

      expect(result.productName).toBe('Custom Product');
      expect(result.source).toBe('chat_productName');
      expect(result.resolved).toBe(true);
    });

    test('returns unresolved with null names when chat.title is generic', () => {
      const chat = { title: 'New Analysis' };

      const result = resolveProductIdentity({ chat });

      expect(result.resolved).toBe(false);
      expect(result.productName).toBeNull();
      expect(result.brandName).toBeNull();
      expect(result.source).toBe('unresolved');
    });

    test('uses chat.title as product name when it is specific', () => {
      const chat = { title: 'My Project' };

      const result = resolveProductIdentity({ chat: { productName: 'My Project' } });

      expect(result.productName).toBe('My Project');
      expect(result.resolved).toBe(true);
    });

    test('sets brandName from productName if not set', () => {
      const chat = { productName: 'Virlo' };
      const productIntelligence = { inputJson: { productName: 'Virlo' } };

      const result = resolveProductIdentity({ chat, productIntelligence });

      expect(result.brandName).toBe('Virlo');
    });

    test('sets companyName from brandName if not set', () => {
      const chat = { productName: 'Virlo' };
      const productIntelligence = { inputJson: { productName: 'Virlo' } };

      const result = resolveProductIdentity({ chat, productIntelligence });

      expect(result.companyName).toBe('Virlo');
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

    test('rejects generic values like "General", "Technology", "SaaS", "none"', () => {
      const chat = { title: 'New Analysis' };
      const productIntelligence = { inputJson: { productName: 'General' } };

      const result = resolveProductIdentity({ chat, productIntelligence });

      expect(result.resolved).toBe(false);
      expect(result.productName).toBeNull();
    });

    test('rejects "unknown" as a product name', () => {
      const chat = { title: 'New Analysis' };
      const productIntelligence = { productName: 'unknown' };

      const result = resolveProductIdentity({ chat, productIntelligence });

      expect(result.resolved).toBe(false);
      expect(result.productName).toBeNull();
    });
  });
});
