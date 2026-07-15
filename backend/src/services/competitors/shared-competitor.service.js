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
function validateCompetitor(competitor, productIdentity) {
  const ownDomain = extractDomainFromUrl(productIdentity?.websiteUrl);
  const competitorDomain = competitor.domain;
  
  // Reject own domain
  if (competitorDomain && ownDomain && competitorDomain === ownDomain) {
    console.log('[Shared Competitor Engine] Rejected: own domain', competitorDomain);
    return false;
  }
  
  // Reject if no name
  if (!competitor.name || competitor.name.trim() === '') {
    console.log('[Shared Competitor Engine] Rejected: no name');
    return false;
  }
  
  // Reject generic names
  const genericNames = ['Competitor', 'Unknown', 'Not specified', 'N/A'];
  if (genericNames.includes(competitor.name)) {
    console.log('[Shared Competitor Engine] Rejected: generic name', competitor.name);
    return false;
  }
  
  // Reject app stores
  if (competitor.domain && (
    competitor.domain.includes('appstore') ||
    competitor.domain.includes('play.google') ||
    competitor.domain.includes('apps.apple')
  )) {
    console.log('[Shared Competitor Engine] Rejected: app store', competitor.domain);
    return false;
  }
  
  // Reject review sites
  if (competitor.domain && (
    competitor.domain.includes('g2.com') ||
    competitor.domain.includes('capterra') ||
    competitor.domain.includes('trustpilot') ||
    competitor.domain.includes('reviews')
  )) {
    console.log('[Shared Competitor Engine] Rejected: review site', competitor.domain);
    return false;
  }
  
  // Reject social profiles
  if (competitor.domain && (
    competitor.domain.includes('facebook.com') ||
    competitor.domain.includes('twitter.com') ||
    competitor.domain.includes('linkedin.com') ||
    competitor.domain.includes('instagram.com')
  )) {
    console.log('[Shared Competitor Engine] Rejected: social profile', competitor.domain);
    return false;
  }
  
  // Reject articles/directories
  if (competitor.sourceUrl && (
    competitor.sourceUrl.includes('/blog/') ||
    competitor.sourceUrl.includes('/article/') ||
    competitor.sourceUrl.includes('/news/')
  )) {
    console.log('[Shared Competitor Engine] Rejected: article/directory', competitor.sourceUrl);
    return false;
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
