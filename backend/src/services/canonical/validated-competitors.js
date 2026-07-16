const GENERIC_NAMES = new Set([
  'Competitor', 'Unknown', 'Not specified', 'N/A', 'None', 'TBD',
  'competitor', 'unknown', 'not specified',
]);

const APP_STORE_DOMAINS = [
  'appstore', 'play.google', 'apps.apple', 'chrome.google',
];

const REVIEW_SITE_DOMAINS = [
  'g2.com', 'capterra', 'trustpilot', 'reviews',
];

const SOCIAL_DOMAINS = [
  'facebook.com', 'twitter.com', 'linkedin.com', 'instagram.com',
  'youtube.com', 'tiktok.com',
];

function isValidDomain(domain) {
  if (!domain || typeof domain !== 'string') return false;
  const lower = domain.toLowerCase();
  if ([...APP_STORE_DOMAINS, ...REVIEW_SITE_DOMAINS, ...SOCIAL_DOMAINS].some(d => lower.includes(d))) return false;
  if (lower.includes('blog/') || lower.includes('article/')) return false;
  return true;
}

function isGenericName(name) {
  if (!name || typeof name !== 'string') return true;
  const trimmed = name.trim();
  if (trimmed.length < 2) return true;
  if (GENERIC_NAMES.has(trimmed)) return true;
  return false;
}

export function extractValidCompetitors(competitorAnalysis) {
  if (!competitorAnalysis || typeof competitorAnalysis !== 'object') return [];

  const competitors = [];

  const sources = [
    competitorAnalysis.directCompetitors,
    competitorAnalysis.competitors,
    competitorAnalysis.allCompetitors,
  ];

  for (const source of sources) {
    if (Array.isArray(source)) {
      for (const c of source) {
        if (typeof c === 'string') {
          if (!isGenericName(c)) {
            competitors.push({ name: c, validationStatus: 'VALIDATED', type: 'direct', source: 'competitor_analysis' });
          }
        } else if (c && typeof c === 'object') {
          const name = c.name || c.brand || '';
          const domain = c.domain || '';
          if (!isGenericName(name) && isValidDomain(domain)) {
            competitors.push({
              name,
              domain,
              type: c.type || c.competitorType || 'direct',
              sharedUseCase: c.sharedUseCase || c.useCase || '',
              source: c.source || 'competitor_analysis',
              sourceUrl: c.websiteUrl || c.sourceUrl || domain ? `https://${domain}` : '',
              evidence: c.evidence || '',
              validationStatus: 'VALIDATED',
              confidence: c.confidence || c.confidenceScore || null,
            });
          } else if (!isGenericName(name)) {
            competitors.push({
              name,
              domain: '',
              type: c.type || c.competitorType || 'direct',
              source: c.source || 'competitor_analysis',
              validationStatus: 'VALIDATED',
              confidence: c.confidence || c.confidenceScore || null,
            });
          }
        }
      }
    }
  }

  const indirect = competitorAnalysis.indirectCompetitors;
  if (Array.isArray(indirect)) {
    for (const c of indirect) {
      const name = typeof c === 'string' ? c : (c.name || c.brand || '');
      if (!isGenericName(name)) {
        competitors.push({
          name,
          domain: typeof c === 'object' ? (c.domain || '') : '',
          type: 'indirect',
          source: 'competitor_analysis',
          validationStatus: 'VALIDATED',
        });
      }
    }
  }

  const seen = new Set();
  return competitors.filter(c => {
    const key = c.name.toLowerCase() + (c.domain || '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeCompetitorForSeo(comp, productDomain) {
  if (!comp) return null;
  if (comp.domain && productDomain) {
    const ownDomain = productDomain.replace(/^www\./, '').toLowerCase();
    const compDomain = comp.domain.replace(/^www\./, '').toLowerCase();
    if (compDomain === ownDomain) return null;
  }

  return {
    name: comp.name || '',
    domain: comp.domain || '',
    type: comp.type || 'direct',
    sharedUseCase: comp.sharedUseCase || '',
    source: comp.source || '',
    sourceUrl: comp.sourceUrl || (comp.domain ? `https://${comp.domain}` : ''),
    evidence: comp.evidence || '',
    validationStatus: comp.validationStatus || 'VALIDATED',
    confidence: comp.confidence || null,
  };
}
