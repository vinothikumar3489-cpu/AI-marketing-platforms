export function resolveCanonicalProductIdentity({ chat, productIntelligence, websiteEvidence }) {
  const errors = [];
  let resolved = false;

  const chatProductName = chat?.productName || '';
  const chatTitle = chat?.title || '';

  const inputJson = productIntelligence?.inputJson || {};
  const productAnalysis = productIntelligence?.productAnalysis || {};
  const marketDiscovery = productIntelligence?.marketDiscovery || {};

  const websiteTitle = websiteEvidence?.title || '';
  const metaDesc = websiteEvidence?.metaDescription || '';
  const h1 = Array.isArray(websiteEvidence?.headings) ? websiteEvidence.headings[0] : (websiteEvidence?.h1 || '');

  let productName = '';
  let brandName = '';
  let companyName = '';
  let websiteUrl = '';
  let domain = '';
  let industry = '';
  let category = '';

  function isGenericProjectName(name) {
    if (!name) return true;
    const generics = [
      'new project', 'untitled', 'my project', 'project', 'analysis',
      'new analysis', 'growth analysis', 'marketing analysis',
      'new chat', 'chat', 'default', 'test', 'demo'
    ];
    const lower = name.trim().toLowerCase();
    if (generics.includes(lower)) return true;
    if (lower.length < 3) return true;
    return false;
  }

  function isLikelyProductEvidence(text) {
    if (!text) return false;
    const lower = text.toLowerCase();
    if (lower.includes('sign up') || lower.includes('login') || lower.includes('log in')) return false;
    if (lower.includes('cookie') || lower.includes('privacy') || lower.includes('terms')) return false;
    if (lower.includes('newsletter') || lower.includes('subscribe')) return false;
    return true;
  }

  function extractBestName(candidates) {
    const valid = candidates.filter(c => c && c.trim().length >= 3 && !isGenericProjectName(c));
    if (valid.length === 0) return null;
    const sorted = valid.sort((a, b) => b.length - a.length);
    return sorted[0];
  }

  const productCandidates = [
    productAnalysis?.productName,
    productAnalysis?.name,
    productAnalysis?.productSummary?.split('.')[0]?.trim(),
    marketDiscovery?.productName,
    marketDiscovery?.name,
    inputJson?.productName,
    chatProductName,
  ];

  const brandCandidates = [
    productAnalysis?.brandName,
    productAnalysis?.brand,
    inputJson?.brandName,
    inputJson?.brand,
    marketDiscovery?.brandName,
  ];

  const companyCandidates = [
    productAnalysis?.companyName,
    productAnalysis?.company,
    inputJson?.companyName,
    inputJson?.company,
    inputJson?.organization,
  ];

  const websiteCandidates = [websiteTitle, h1, metaDesc?.split('.')[0]?.trim()].filter(Boolean);

  if (!isGenericProjectName(chatTitle)) {
    productCandidates.push(chatTitle);
  }

  productName = extractBestName(productCandidates) || '';
  brandName = extractBestName(brandCandidates) || '';
  companyName = extractBestName(companyCandidates) || '';

  websiteUrl = inputJson?.websiteUrl || productIntelligence?.inputJson?.websiteUrl || websiteEvidence?.url || '';

  if (websiteUrl) {
    try {
      const urlObj = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`);
      domain = urlObj.hostname.replace(/^www\./, '');
    } catch {
      domain = websiteUrl.replace(/^www\./, '').split('/')[0];
    }
  }

  industry = productAnalysis?.industry || inputJson?.industry || marketDiscovery?.industry || '';
  category = productAnalysis?.category || productAnalysis?.productCategory || marketDiscovery?.category || '';

  if (!productName && !brandName && !companyName && websiteCandidates.length > 0) {
    const bestWebsite = extractBestName(websiteCandidates);
    if (bestWebsite) {
      const words = bestWebsite.split(/[\s\-–—|:]+/).filter(w => w.length > 2 && !['the','and','for','with','from','that','this'].includes(w.toLowerCase()));
      if (words.length >= 1) {
        productName = words.slice(0, 2).join(' ');
      }
    }
  }

  if (productName && productName.toLowerCase() === (brandName || '').toLowerCase()) {
    if (websiteCandidates.length > 0) {
      const fromWebsite = extractBestName(websiteCandidates.filter(c => c.toLowerCase() !== productName.toLowerCase()));
      if (fromWebsite) {
        const words = fromWebsite.split(/[\s\-–—|:]+/).filter(w => w.length > 2);
        if (words.length >= 2) {
          productName = words.slice(0, 2).join(' ');
        }
      }
    }
  }

  if (!companyName && brandName) {
    companyName = brandName;
  }

  if (!companyName && domain) {
    const parts = domain.split('.');
    if (parts.length >= 2) {
      companyName = parts[parts.length - 2].charAt(0).toUpperCase() + parts[parts.length - 2].slice(1);
    }
  }

  const source = productAnalysis ? 'product_analysis' : (inputJson ? 'input_json' : 'chat');

  if (productName || brandName || companyName) {
    resolved = true;
  } else {
    errors.push('Unable to resolve product identity from available data');
  }

  const result = {
    resolved,
    productName: productName || '',
    brandName: brandName || '',
    companyName: companyName || '',
    websiteUrl,
    domain,
    industry,
    category,
    source,
  };

  if (!productName && brandName) {
    result.productName = brandName;
  }

  if (errors.length > 0) {
    result.warnings = errors;
  }

  return result;
}
