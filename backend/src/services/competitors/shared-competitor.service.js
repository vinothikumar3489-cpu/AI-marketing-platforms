/**
 * Shared Competitor Engine
 * 
 * Provides canonical competitor data used by:
 * - Growth Workspace
 * - SEO Intelligence
 * - Campaign Intelligence
 * - Content Studio
 * - Comparison Generator
 * - Reports
 */

import { prisma } from '../../config/prisma.js';
import { preferNonEmptyArray, preferDefinedValue, extractDomainFromUrl } from '../../utils/merge-utilities.util.js';

/**
 * Get validated competitors for a chat
 * Combines multiple discovery sources and validates results
 */
export async function getValidatedCompetitorsForChat({ userId, chatId, productIdentity, category, useCases }) {
  console.log('[Shared Competitor Engine] Getting validated competitors for chat:', chatId);
  
  const competitors = [];
  const sources = [];
  
  // Source 1: Existing CompetitorIntelligence
  try {
    const existingCompetitorIntel = await prisma.competitorIntelligence.findUnique({
      where: { chatId }
    });
    
    if (existingCompetitorIntel?.competitorAnalysis) {
      const analysis = existingCompetitorIntel.competitorAnalysis;
      const directCompetitors = preferNonEmptyArray(analysis.directCompetitors, analysis.competitors);
      
      directCompetitors.forEach(c => {
        competitors.push({
          name: c.name,
          domain: c.domain || extractDomainFromUrl(c.websiteUrl),
          competitorType: 'direct',
          sharedCategory: category,
          sharedUseCase: useCases?.[0],
          sourceUrl: c.websiteUrl || c.domain,
          validationStatus: 'validated',
          evidence: c.evidence || 'Existing competitor intelligence',
          source: 'competitor_intelligence'
        });
      });
      
      sources.push({ source: 'competitor_intelligence', count: directCompetitors.length });
    }
  } catch (error) {
    console.log('[Shared Competitor Engine] Failed to load existing competitor intelligence:', error.message);
  }
  
  // Source 2: Business Intelligence competitor data
  try {
    const productIntel = await prisma.productIntelligence.findUnique({
      where: { chatId }
    });
    
    if (productIntel?.inputJson?.competitors) {
      const biCompetitors = Array.isArray(productIntel.inputJson.competitors) 
        ? productIntel.inputJson.competitors 
        : productIntel.inputJson.competitors.split(',').map(c => c.trim());
      
      biCompetitors.forEach(c => {
        const domain = extractDomainFromUrl(c);
        const name = domain ? deriveBrandFromDomain(domain) : c;
        
        // Avoid duplicates
        if (!competitors.some(comp => comp.name === name || comp.domain === domain)) {
          competitors.push({
            name,
            domain,
            competitorType: 'direct',
            sharedCategory: category,
            sharedUseCase: useCases?.[0],
            sourceUrl: c.startsWith('http') ? c : null,
            validationStatus: 'validated',
            evidence: 'Business Intelligence input',
            source: 'business_intelligence'
          });
        }
      });
      
      sources.push({ source: 'business_intelligence', count: biCompetitors.length });
    }
  } catch (error) {
    console.log('[Shared Competitor Engine] Failed to load Business Intelligence competitors:', error.message);
  }
  
  // Source 3: Growth Workspace competitor analysis (if available)
  try {
    const growthIntel = await prisma.competitorIntelligence.findUnique({
      where: { chatId }
    });
    
    if (growthIntel?.competitorAnalysis?.competitors) {
      const growthCompetitors = preferNonEmptyArray(growthIntel.competitorAnalysis.competitors);
      
      growthCompetitors.forEach(c => {
        // Avoid duplicates
        if (!competitors.some(comp => comp.name === c.name || comp.domain === c.domain)) {
          competitors.push({
            name: c.name,
            domain: c.domain,
            competitorType: c.competitorType || 'direct',
            sharedCategory: category,
            sharedUseCase: useCases?.[0],
            sourceUrl: c.websiteUrl || c.domain,
            validationStatus: 'validated',
            evidence: c.evidence || 'Growth Workspace analysis',
            source: 'growth_workspace'
          });
        }
      });
      
      sources.push({ source: 'growth_workspace', count: growthCompetitors.length });
    }
  } catch (error) {
    console.log('[Shared Competitor Engine] Failed to load Growth Workspace competitors:', error.message);
  }

  // Source 4: SEO Intelligence competitors
  try {
    const seoIntel = await prisma.seoIntelligence.findUnique({
      where: { chatId }
    });

    if (seoIntel?.seoAnalysis?.competitors) {
      const seoCompetitors = Array.isArray(seoIntel.seoAnalysis.competitors)
        ? seoIntel.seoAnalysis.competitors
        : [];

      seoCompetitors.forEach(c => {
        if (!competitors.some(comp => comp.name === c.name || comp.domain === c.domain)) {
          competitors.push({
            name: c.name,
            domain: c.domain || extractDomainFromUrl(c.url),
            competitorType: c.competitorType || 'direct',
            sharedCategory: category,
            sharedUseCase: useCases?.[0],
            sourceUrl: c.url || c.domain,
            validationStatus: 'validated',
            evidence: c.evidence || 'SEO Intelligence analysis',
            source: 'seo_intelligence'
          });
        }
      });

      sources.push({ source: 'seo_intelligence', count: seoCompetitors.length });
    }
  } catch (error) {
    console.log('[Shared Competitor Engine] Failed to load SEO Intelligence competitors:', error.message);
  }

  // Filter and validate competitors
  const validatedCompetitors = competitors.filter(comp => validateCompetitor(comp, productIdentity));
  
  console.log('[Shared Competitor Engine] Validation results:', {
    totalFound: competitors.length,
    validated: validatedCompetitors.length,
    rejected: competitors.length - validatedCompetitors.length,
    sources
  });
  
  return {
    competitors: validatedCompetitors,
    sources,
    validationSummary: {
      total: competitors.length,
      validated: validatedCompetitors.length,
      rejected: competitors.length - validatedCompetitors.length
    }
  };
}

/**
 * Validate a competitor entry
 * Rejects invalid entries
 */
const ARTICLE_INDICATORS = [
  'what is', 'how to', 'guide to', 'ultimate guide', 'best ', 'top ',
  'vs ', ' versus ', 'review', 'tutorial', 'example', 'list of',
  'tips for', 'ways to', 'reasons to', 'things to', 'ideas for',
  'introducing', 'announcing', 'blog', 'article', 'news', 'press',
];

const KNOWLEDGE_DOMAINS = [
  'wikipedia.org', 'reddit.com', 'quora.com', 'medium.com',
  'hubspot.com', 'blog.', 'news.', 'docs.', 'learn.',
  'support.', 'help.', 'status.', 'community.',
];

const NON_COMMERCIAL_TLDS = new Set([
  'gov', 'edu', 'mil',
]);

function isArticleOrTutorial(name, title, sourceUrl) {
  const lowerName = (name || '').toLowerCase();
  const lowerTitle = (title || '').toLowerCase();
  const lowerUrl = (sourceUrl || '').toLowerCase();
  if (ARTICLE_INDICATORS.some(i => lowerName.includes(i) || lowerTitle.includes(i))) return true;
  if (/(\/blog\/|\/article\/|\/news\/|\/tutorial\/|\/guide\/)/.test(lowerUrl)) return true;
  return false;
}

function isKnowledgeOrSupportDomain(domain) {
  if (!domain) return false;
  const lower = domain.toLowerCase();
  return KNOWLEDGE_DOMAINS.some(d => lower.includes(d));
}

function validateCompetitor(competitor, productIdentity) {
  const ownDomain = extractDomainFromUrl(productIdentity?.websiteUrl);
  const competitorDomain = competitor.domain;
  const competitorName = (competitor.name || '').trim();
  const competitorTitle = (competitor.title || competitor.name || '').trim();
  const competitorSourceUrl = competitor.sourceUrl || competitor.url || '';

  // Reject if no name
  if (!competitorName) {
    return false;
  }

  // Reject own domain
  if (competitorDomain && ownDomain && competitorDomain === ownDomain) {
    return false;
  }

  // Reject subdomain variants of own domain
  if (competitorDomain && ownDomain) {
    const cd = competitorDomain.toLowerCase().replace(/^www\./, '');
    const od = ownDomain.toLowerCase().replace(/^www\./, '');
    if (cd === od || cd.endsWith('.' + od) || od.endsWith('.' + cd)) {
      return false;
    }
  }

  // Reject generic names
  const genericNames = ['Competitor', 'Unknown', 'Not specified', 'N/A', 'Target', 'Brand', 'Company'];
  if (genericNames.some(g => competitorName === g || competitorName.includes(g + ' ') || competitorName.includes(' ' + g))) {
    return false;
  }

  // Reject app stores
  if (competitorDomain && (
    competitorDomain.includes('appstore') ||
    competitorDomain.includes('play.google') ||
    competitorDomain.includes('apps.apple')
  )) {
    return false;
  }

  // Reject review/directory sites
  if (competitorDomain && (
    competitorDomain.includes('g2.com') ||
    competitorDomain.includes('capterra') ||
    competitorDomain.includes('trustpilot') ||
    competitorDomain.includes('reviews') ||
    competitorDomain.includes('getapp.com') ||
    competitorDomain.includes('softwareadvice.com') ||
    competitorDomain.includes('clutch.co') ||
    competitorDomain.includes('gartner.com') ||
    competitorDomain.includes('forrester.com')
  )) {
    return false;
  }

  // Reject social profiles
  if (competitorDomain && (
    competitorDomain.includes('facebook.com') ||
    competitorDomain.includes('twitter.com') ||
    competitorDomain.includes('linkedin.com') ||
    competitorDomain.includes('instagram.com') ||
    competitorDomain.includes('youtube.com') ||
    competitorDomain.includes('tiktok.com') ||
    competitorDomain.includes('pinterest.com') ||
    competitorDomain.includes('snapchat.com') ||
    competitorDomain.includes('reddit.com')
  )) {
    return false;
  }

  // Reject knowledge / support / documentation sites
  if (isKnowledgeOrSupportDomain(competitorDomain)) {
    return false;
  }

  // Reject articles, tutorials, blogs, listicles
  if (isArticleOrTutorial(competitorName, competitorTitle, competitorSourceUrl)) {
    return false;
  }

  // Reject login / signup / pricing / careers pages
  if (/(\/login|\/signin|\/sign.?up|\/register|\/auth|\/forgot|\/reset|\/logout|\/pricing|\/plans|\/careers|\/jobs|\/apply)/i.test(competitorSourceUrl)) {
    return false;
  }

  // Reject non-commercial TLDs
  if (competitorDomain) {
    const tld = competitorDomain.split('.').pop();
    if (NON_COMMERCIAL_TLDS.has(tld)) {
      return false;
    }
  }

  return true;
}

/**
 * Derive brand name from domain
 */
function deriveBrandFromDomain(domain) {
  if (!domain) return null;
  const parts = domain.split('.');
  if (parts.length >= 2) {
    return parts[parts.length - 2].charAt(0).toUpperCase() + 
           parts[parts.length - 2].slice(1);
  }
  return domain.charAt(0).toUpperCase() + domain.slice(1);
}

/**
 * Generate competitor discovery queries
 */
export function generateCompetitorQueries(productIdentity, category, useCases) {
  const productName = productIdentity?.productName || productIdentity?.companyName || '';
  const queries = [];
  
  if (productName) {
    queries.push(`${productName} competitors`);
    queries.push(`${productName} alternatives`);
  }
  
  if (category) {
    queries.push(`${category} competitors`);
    queries.push(`${category} software`);
    queries.push(`${category} platforms`);
    queries.push(`${category} tools`);
  }
  
  if (useCases && useCases.length > 0) {
    useCases.forEach(useCase => {
      queries.push(`${useCase} platforms`);
      queries.push(`${useCase} software`);
    });
  }
  
  // Remove duplicates
  return [...new Set(queries)];
}
