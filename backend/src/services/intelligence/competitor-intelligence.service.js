import { researchCompetitors } from '../tavily.service.js';
import { getSerpCompetitors, normalizeSerpCompetitors, getKeywordMetrics, isDataForSEOConfigured } from '../dataforseo.service.js';

export async function collectCompetitorIntelligence({ websiteUrl, productName, companyName, industry, marketData }) {
  const competitors = [];
  const sources = [];
  const warnings = [];
  const domain = extractDomain(websiteUrl);

  // Phase 1: SERP-based competitors via DataForSEO
  if (isDataForSEOConfigured()) {
    try {
      const searchTerms = [
        productName,
        companyName,
        `${industry} software`,
        `${industry} platform`,
        `${industry} tools`
      ].filter(Boolean);

      const serpResult = await getSerpCompetitors(searchTerms);
      if (serpResult?.success && serpResult?.data?.length > 0) {
        const identity = { domain, industry, productName };
        const serpCompetitors = normalizeSerpCompetitors(serpResult.data, identity);
        const filtered = serpCompetitors.filter(c => {
          if (!c.domain) return false;
          const compDomain = c.domain.toLowerCase();
          const currentDomain = domain.toLowerCase();
          if (compDomain === currentDomain) return false;
          if (compDomain.endsWith('.' + currentDomain)) return false;
          if (currentDomain.endsWith('.' + compDomain)) return false;

          const rejectedPatterns = ['support.', 'help.', 'docs.', 'login.', 'auth.', 'admin.', 'status.', 'api.', 'developers.', 'cloud.'];
          for (const pattern of rejectedPatterns) {
            if (compDomain.startsWith(pattern)) return false;
            if (compDomain.includes('.' + pattern.replace('.', ''))) return false;
          }

          const path = (c.url || '').toLowerCase();
          const rejectedPaths = ['/support', '/help', '/docs', '/login', '/signin', '/auth', '/status', '/pricing', '/blog', '/contact', '/about', '/careers', '/legal', '/privacy', '/terms', '/security', '/download', '/apps', '/app'];
          for (const rp of rejectedPaths) {
            if (path.startsWith(rp) || path.includes(rp + '/') || path.includes(rp + '?')) return false;
          }

          return c.relevanceScore >= 30;
        });
        for (const comp of filtered) {
          competitors.push({
            name: comp.name,
            domain: comp.domain,
            url: comp.url,
            type: comp.competitorType === 'directBusinessCompetitor' ? 'direct' : 'serp',
            similarityScore: comp.relevanceScore,
            featureOverlap: null,
            pricingOverlap: null,
            trafficEstimate: null,
            evidence: comp.evidence,
            source: 'DataForSEO_SERP',
            snippet: comp.snippet || '',
            confidence: comp.confidence,
            enterpriseFields: {
              pricing: null,
              funding: null,
              employeeCount: null,
              trafficEstimate: null,
              technologies: null,
              customerSegments: null,
              reviewScore: null,
              positioning: null,
              strengths: null,
              weaknesses: null,
              marketShare: null,
              estimatedARR: null,
              acquisitionStrategy: null,
              evidence: {
                source: 'DataForSEO SERP',
                confidence: comp.confidence || null,
                collectedAt: new Date().toISOString()
              }
            }
          });
        }
        sources.push({ type: 'competitor_serp', source: 'DataForSEO', count: filtered.length });
      }
    } catch (e) {
      warnings.push(`DataForSEO competitor search failed: ${e.message}`);
    }
  }

  // Phase 2: Tavily competitor research
  try {
    const tavilyResult = await researchCompetitors(productName || companyName || domain, industry || 'technology', 'software');
    if (tavilyResult?.success && tavilyResult?.competitors?.length > 0) {
      for (const comp of tavilyResult.competitors) {
        const compDomain = extractDomain(comp.website || comp.url || '');
        if (compDomain && compDomain !== domain && !competitors.find(c => c.domain === compDomain)) {
          competitors.push({
            name: comp.name || compDomain,
            domain: compDomain,
            url: comp.website || comp.url || '',
            type: 'direct',
            similarityScore: 70,
            featureOverlap: null,
            pricingOverlap: null,
            trafficEstimate: null,
            evidence: comp.description || 'Identified via Tavily competitive research',
            source: 'Tavily',
            snippet: comp.description || '',
            confidence: null,
            enterpriseFields: {
              pricing: null,
              funding: null,
              employeeCount: null,
              trafficEstimate: null,
              technologies: null,
              customerSegments: null,
              reviewScore: null,
              positioning: null,
              strengths: null,
              weaknesses: null,
              marketShare: null,
              estimatedARR: null,
              acquisitionStrategy: null,
              evidence: {
                source: 'Tavily web research',
                confidence: null,
                collectedAt: new Date().toISOString()
              }
            }
          });
        }
      }
      sources.push({ type: 'competitor_tavily', source: 'Tavily', count: tavilyResult.competitors.length });
    }
  } catch (e) {
    warnings.push(`Tavily competitor research failed: ${e.message}`);
  }

  // Phase 3: Enrich known competitors with industry-based enterprise fields
  for (const comp of competitors) {
    enrichCompetitorFields(comp, industry);
  }

  // Classify competitors
  for (const comp of competitors) {
    if (!comp.type || comp.type === 'serp') {
      if (comp.similarityScore >= 70) {
        comp.type = 'direct';
      } else if (comp.similarityScore >= 40) {
        comp.type = 'indirect';
      } else {
        comp.type = 'serp_listing';
      }
    }
  }

  // Categorize
  const result = {
    direct: competitors.filter(c => c.type === 'direct'),
    indirect: competitors.filter(c => c.type === 'indirect'),
    emerging: competitors.filter(c => c.type === 'emerging'),
    serp: competitors.filter(c => c.type === 'serp_listing'),
    all: competitors,
    sources,
    warnings
  };

  return result;
}

function enrichCompetitorFields(comp, industry) {
  if (!comp.enterpriseFields) {
    comp.enterpriseFields = {
      pricing: null,
      funding: null,
      employeeCount: null,
      trafficEstimate: null,
      technologies: null,
      customerSegments: null,
      reviewScore: null,
      positioning: null,
      strengths: null,
      weaknesses: null,
      marketShare: null,
      estimatedARR: null,
      acquisitionStrategy: null,
      evidence: { source: 'Unknown', confidence: 0, collectedAt: new Date().toISOString() }
    };
  }

  const knownData = KNOWN_COMPETITOR_DATA[comp.name];
  if (knownData) {
    comp.enterpriseFields.pricing = knownData.pricing ?? null;
    comp.enterpriseFields.funding = knownData.funding ?? null;
    comp.enterpriseFields.employeeCount = knownData.employeeCount ?? null;
    comp.enterpriseFields.trafficEstimate = knownData.trafficEstimate ?? null;
    comp.enterpriseFields.technologies = knownData.technologies ?? null;
    comp.enterpriseFields.customerSegments = knownData.customerSegments ?? null;
    comp.enterpriseFields.reviewScore = knownData.reviewScore ?? null;
    comp.enterpriseFields.positioning = knownData.positioning ?? null;
    comp.enterpriseFields.strengths = knownData.strengths ?? null;
    comp.enterpriseFields.weaknesses = knownData.weaknesses ?? null;
    comp.enterpriseFields.marketShare = knownData.marketShare ?? null;
    comp.enterpriseFields.estimatedARR = knownData.estimatedARR ?? null;
    comp.enterpriseFields.acquisitionStrategy = knownData.acquisitionStrategy ?? null;
    comp.enterpriseFields.evidence = {
      source: 'Industry analysis & public data',
      confidence: null,
      collectedAt: new Date().toISOString()
    };
  }

  if (comp.enterpriseFields.technologies === null) {
    comp.enterpriseFields.technologies = inferTechnologies(comp.name, industry);
  }
}

const KNOWN_COMPETITOR_DATA = {};

function inferTechnologies(name, industry) {
  const nameLower = (name || '').toLowerCase();
  const tech = [];
  if (nameLower.includes('canva')) tech.push('React', 'TypeScript', 'AWS');
  if (nameLower.includes('figma')) tech.push('TypeScript', 'React', 'WebAssembly', 'AWS', 'C++');
  if (nameLower.includes('notion')) tech.push('React', 'TypeScript', 'Next.js', 'PostgreSQL', 'Redis');
  if (nameLower.includes('shopify')) tech.push('Ruby on Rails', 'React', 'TypeScript', 'MySQL', 'Memcached');
  if (nameLower.includes('prezi')) tech.push('JavaScript', 'HTML5', 'AWS');
  if (nameLower.includes('visme')) tech.push('React', 'Node.js', 'MongoDB', 'AWS');
  if (nameLower.includes('mailchimp')) tech.push('Ruby on Rails', 'React', 'MySQL', 'AWS', 'Chef');
  if (nameLower.includes('hubspot')) tech.push('Java', 'Python', 'React', 'AWS', 'Kubernetes');
  if (nameLower.includes('google')) tech.push('Go', 'Java', 'C++', 'Borg', 'Spanner');
  if (nameLower.includes('microsoft')) tech.push('C#', 'TypeScript', 'Azure', '.NET');
  if (nameLower.includes('adobe')) tech.push('C++', 'JavaScript', 'React', 'AWS', 'Azure');
  if (nameLower.includes('slack')) tech.push('JavaScript', 'React', 'Java', 'AWS', 'Kafka');
  if (nameLower.includes('trello')) tech.push('JavaScript', 'React', 'Node.js', 'MongoDB', 'AWS');
  if (nameLower.includes('asana')) tech.push('JavaScript', 'React', 'Python', 'PostgreSQL', 'AWS');
  if (nameLower.includes('zoom')) tech.push('C++', 'JavaScript', 'React', 'AWS', 'WebRTC');
  if (nameLower.includes('salesforce')) tech.push('Java', 'JavaScript', 'React', 'AWS', 'Heroku');
  if (nameLower.includes('stripe')) tech.push('Ruby', 'React', 'TypeScript', 'PostgreSQL', 'AWS');
  if (nameLower.includes('atlassian')) tech.push('Java', 'JavaScript', 'React', 'PostgreSQL', 'AWS');
  if (nameLower.includes('wordpress')) tech.push('PHP', 'JavaScript', 'React', 'MariaDB', 'nginx');
  if (nameLower.includes('wix')) tech.push('JavaScript', 'React', 'Node.js', 'AWS', 'Vue.js');
  if (tech.length === 0) return null;
  return tech;
}

function extractDomain(url) {
  if (!url) return '';
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}
