import fetch from 'node-fetch';
import { getSerpCompetitors, normalizeSerpCompetitors, separateCompetitorsByType, isDataForSEOConfigured, getDomainData } from '../dataforseo.service.js';
import { researchCompetitors } from '../tavily.service.js';
import { asArray } from '../../utils/text.util.js';
import { prisma } from '../../config/prisma.js';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const EXA_API_KEY = process.env.EXA_API_KEY;

// ============================================
// COMPETITOR SEO INTELLIGENCE ENGINE
// ============================================

/**
 * Generate comprehensive competitor SEO intelligence
 * @param {Object} params - { keywordIntelligence, geoIntelligence, websiteData, identity, orchestratorCompetitors }
 * @returns {Object} - Complete competitor intelligence
 */
export async function generateCompetitorSeoIntelligence({
  keywordIntelligence = {},
  geoIntelligence = {},
  websiteData = {},
  identity,
  orchestratorCompetitors = []
}) {
  console.log('🎯 [Competitor SEO] Starting competitor analysis...', { orchestratorCompetitorsCount: orchestratorCompetitors.length });

  // Safely define identity fields before any use
  const safeIdentity = identity || {};
  const brandName = safeIdentity.brandName || safeIdentity.companyName || safeIdentity.productName || "";
  const productName = safeIdentity.productName || brandName;
  const companyName = safeIdentity.companyName || brandName;
  const domain = safeIdentity.domain || "";
  const category = safeIdentity.category || safeIdentity.industry || "";
  const industry = safeIdentity.industry || category;

  try {
    // Step 1: Discover competitors (orchestrator > Growth CompetitorIntelligence > external APIs)
    console.log('🔍 [Competitor SEO] Step 1: Discovering competitors...');
    const rawCompetitors = orchestratorCompetitors.length > 0
      ? orchestratorCompetitors
      : await (async () => {
          // Fallback to Growth CompetitorIntelligence table
          const chatId = identity.chatId || (global.currentChatId);
          if (chatId) {
            try {
              const growthIntel = await prisma.competitorIntelligence.findUnique({ where: { chatId } });
              if (growthIntel?.competitorAnalysis) {
                const analysis = growthIntel.competitorAnalysis;
                const directCompetitors = analysis.directCompetitors || analysis.competitors || [];
                if (directCompetitors.length > 0) {
                  console.log(`[Competitor SEO] Using ${directCompetitors.length} competitors from Growth CompetitorIntelligence`);
                  return directCompetitors.map(c => ({
                    name: c.name,
                    domain: c.domain || (c.websiteUrl ? new URL(c.websiteUrl).hostname.replace(/^www\./, '') : ''),
                    competitorType: 'direct',
                    source: 'GROWTH_INTELLIGENCE',
                    evidence: c.evidence || 'From Growth CompetitorIntelligence',
                    websiteUrl: c.websiteUrl || c.domain || ''
                  }));
                }
              }
            } catch (e) {
              console.log('[Competitor SEO] Growth CompetitorIntelligence fallback failed:', e.message);
            }
          }
          // Fall back to external API discovery
          return discoverCompetitors({
            productName: identity.productName,
            industry: identity.industry,
            websiteUrl: identity.websiteUrl,
            keywordIntelligence,
            identity
          });
        })();
    
    // Filter self-links and bad competitors even for orchestrator-sourced data
    let competitors = filterAllCompetitors(rawCompetitors, identity);

    // Step 2: Build competitor SEO profiles
    console.log('📊 [Competitor SEO] Step 2: Building competitor profiles...');
    const competitorProfiles = await buildCompetitorProfiles(competitors, identity.productName);

    // Step 3: Keyword gap analysis
    console.log('🔑 [Competitor SEO] Step 3: Analyzing keyword gaps...');
    const keywordGaps = analyzeKeywordGaps(
      keywordIntelligence,
      competitorProfiles,
      websiteData
    );

    // Step 4: Content gap analysis
    console.log('📝 [Competitor SEO] Step 4: Analyzing content gaps...');
    const contentGaps = analyzeContentGaps(
      websiteData,
      competitorProfiles,
      keywordGaps
    );

    // Step 5: Authority gap analysis
    console.log('🏆 [Competitor SEO] Step 5: Analyzing authority gaps...');
    const authorityGaps = analyzeAuthorityGaps(
      websiteData,
      competitorProfiles,
      geoIntelligence
    );

    // Step 6: GEO competitor gap analysis
    console.log('🤖 [Competitor SEO] Step 6: Analyzing GEO gaps...');
    const geoGaps = analyzeGeoGaps(
      geoIntelligence,
      competitorProfiles
    );

    // Step 7: Generate competitor matrix
    console.log('📋 [Competitor SEO] Step 7: Generating competitor matrix...');
    const competitorMatrix = generateCompetitorMatrix(
      competitorProfiles,
      keywordGaps,
      contentGaps,
      authorityGaps,
      geoGaps
    );

    // Step 8: Generate recommendations
    console.log('💡 [Competitor SEO] Step 8: Generating recommendations...');
    const recommendations = generateRecommendations({
      competitors,
      keywordGaps,
      contentGaps,
      authorityGaps,
      geoGaps,
      competitorMatrix
    });

    // Compile final result
    const result = {
      competitors: competitors || [],
      competitorProfiles: competitorProfiles || [],
      keywordGaps: keywordGaps || {},
      contentGaps: contentGaps || [],
      authorityGaps: authorityGaps || {},
      geoGaps: geoGaps || {},
      competitorMatrix: competitorMatrix || [],
      recommendations: recommendations || {},
      metadata: {
        totalCompetitors: competitors?.length || 0,
        directCompetitors: competitors?.filter(c => c.competitorType === 'direct').length || 0,
        analyzedAt: new Date().toISOString()
      }
    };

    console.log('✅ [Competitor SEO] Analysis complete:', {
      competitors: result.metadata.totalCompetitors,
      keywordGaps: keywordGaps?.missingKeywords?.length || 0,
      contentGaps: contentGaps?.length || 0
    });

    return result;

  } catch (error) {
    console.error('❌ [Competitor SEO] Error:', error);
    console.error('❌ [Competitor SEO] Returning empty competitor data');
    return {
      competitors: [],
      competitorProfiles: [],
      keywordGaps: {},
      contentGaps: [],
      authorityGaps: {},
      geoGaps: {},
      competitorMatrix: [],
      recommendations: {},
      metadata: {
        totalCompetitors: 0,
        directCompetitors: 0,
        analyzedAt: new Date().toISOString(),
        source: 'Unavailable',
        error: error.message,
        message: 'Competitor intelligence unavailable due to processing error'
      }
    };
  }
}

// ============================================
// COMPETITOR DISCOVERY
// ============================================

async function discoverCompetitors({ productName, industry, websiteUrl, keywordIntelligence, identity = {} }) {
  console.log('🔍 [Discovery] Searching for competitors...');

  // Domain-specific competitor queries for better results
  const domain = identity.domain || websiteUrl || '';
  const normalizedDomain = domain.replace('www.', '').replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
  
  const domainSpecificQueries = {
    'canva.com': [
      'canva alternatives',
      'best graphic design tools',
      'social media design tools',
      'presentation maker',
      'logo maker',
      'online design platform',
      'AI design tool'
    ],
    'gamma.app': [
      'gamma alternatives',
      'best AI presentation tools',
      'presentation software',
      'AI slide generator',
      'deck design software',
      'presentation automation'
    ],
    'figma.com': [
      'figma alternatives',
      'best collaborative design tools',
      'UI design software',
      'design prototyping tools',
      'wireframing tools',
      'product design platform'
    ],
    'notion.so': [
      'notion alternatives',
      'best workspace apps',
      'knowledge base software',
      'collaborative docs tools',
      'project management workspace'
    ],
    'orkyn.ai': [
      'custom software development company',
      'ERP implementation services',
      'Salesforce consulting company',
      'CRM integration services',
      'software development company UAE',
      'software development company India'
    ],
    'virlo.ai': [
      'tiktok analytics tool',
      'social media analytics platform',
      'influencer marketing platform',
      'creator analytics tool',
      'social listening tools',
      'short form video analytics',
      'content analytics platform'
    ],
    'upfluence.com': [
      'influencer marketing platform',
      'creator management software',
      'influencer discovery tool',
      'influencer relationship management',
      'influencer campaign management',
      'creator economy platform'
    ],
    'resume.io': [
      'resume builder',
      'cv maker online',
      'best resume writing service',
      'professional resume templates',
      'online resume creator',
      'cover letter builder'
    ],
    'zety.com': [
      'zety alternatives',
      'best resume builders',
      'online cv maker',
      'professional resume templates',
      'resume writing service'
    ]
  };

  // Use DataForSEO SERP API if configured
  if (isDataForSEOConfigured()) {
    console.log('🔍 [Discovery] Using DataForSEO SERP API for competitor discovery...');
    
    // Use domain-specific queries if available
    const searchKeywords = domainSpecificQueries[normalizedDomain] || [];
    
    // Fallback to category-based queries if no domain-specific queries
    if (searchKeywords.length === 0) {
      // Category-based queries (product type + use case)
      if (industry) {
        searchKeywords.push(`best ${industry} tools`);
        searchKeywords.push(`top ${industry} software`);
        searchKeywords.push(`${industry} alternatives`);
        searchKeywords.push(`${industry} comparison`);
        searchKeywords.push(`leading ${industry} platforms`);
      }
      
      // Product-specific queries for direct competitors
      if (productName) {
        searchKeywords.push(`${productName} alternatives`);
        searchKeywords.push(`${productName} competitors`);
        searchKeywords.push(`${productName} vs`);
        searchKeywords.push(`better than ${productName}`);
      }
      
      // Use case-based queries from identity
      if (identity.category) {
        searchKeywords.push(`best ${identity.category} tools`);
        searchKeywords.push(`${identity.category} software`);
      }
    }
    
    // Add keyword-based queries if available (only validated keywords)
    if (keywordIntelligence.primaryKeywords && keywordIntelligence.primaryKeywords.length > 0) {
      const topKeywords = keywordIntelligence.primaryKeywords
        .filter(k => {
          const confidence = k.confidence || 0;
          const source = k.source || '';
          return source === 'DataForSEO' || confidence >= 70;
        })
        .slice(0, 5)
        .map(k => k.keyword)
        .filter(kw => kw.split(' ').length >= 2); // Only use multi-word keywords
      searchKeywords.push(...topKeywords);
    }
    
    // Remove duplicates and limit
    const uniqueKeywords = [...new Set(searchKeywords)].slice(0, 10);
    
    console.log('🔍 [Discovery] SERP competitor queries:', uniqueKeywords);

    try {
      const serpResult = await getSerpCompetitors(uniqueKeywords, 'United States', 'English');
      
      if (serpResult.success && serpResult.data && serpResult.data.length > 0) {
        console.log(`✅ [Discovery] DataForSEO SERP returned ${serpResult.data.length} results`);
        
        // Log raw competitor domains before filtering
        const rawDomains = serpResult.data.map(r => extractDomain(r.url)).filter(Boolean);
        console.log('🔍 [Discovery] Raw competitor domains before filtering:', rawDomains);
        
        // Normalize and classify competitors
        const competitorIdentity = { productName, industry, websiteUrl };
        const normalizedCompetitors = normalizeSerpCompetitors(serpResult.data, competitorIdentity);
        
        // Separate by type
        const separated = separateCompetitorsByType(normalizedCompetitors);
        
        console.log(`✅ [Discovery] Found ${normalizedCompetitors.length} competitors:`, {
          directBusiness: separated.directBusinessCompetitors.length,
          serp: separated.serpCompetitors.length,
          directory: separated.directoryOrResearchSites.length,
          filtered: separated.irrelevantFilteredSites.length
        });
        
        // Return direct business competitors and SERP competitors
        if (separated.directBusinessCompetitors.length > 0 || separated.serpCompetitors.length > 0) {
          const allValid = [...separated.directBusinessCompetitors, ...separated.serpCompetitors];
          console.log(`✅ [Discovery] Returning ${allValid.length} verified competitors (${separated.directBusinessCompetitors.length} direct, ${separated.serpCompetitors.length} serp)`);
          return allValid;
        }
        
        // No verified competitors found
        console.log('⚠️ [Discovery] No verified competitors found');
        return [];
      } else {
        console.log('⚠️ [Discovery] DataForSEO SERP returned no results or failed');
        // DataForSEO failure is not fatal - return empty array to use Growth competitors
        return [];
      }
    } catch (error) {
      console.warn('⚠️ [Discovery] DataForSEO SERP failed:', error.message);
      // DataForSEO failure is not fatal - return empty array to use Growth competitors
      return [];
    }
  } else {
    console.log('⚠️ [Discovery] DataForSEO not configured - skipping SERP competitor discovery');
    return [];
  }
  
  // Fallback chain: Tavily → SerpAPI → Exa → AI-estimated (only if DataForSEO not configured)
  let fallbackResult = null;
  let fallbackSource = null;

  // Try Tavily
  if (TAVILY_API_KEY) {
    console.log('🔄 [Discovery] Trying Tavily fallback for competitors...');
    try {
      const tavilyResult = await researchCompetitors(productName, industry, 'software');
      if (tavilyResult && tavilyResult.success && tavilyResult.competitors && tavilyResult.competitors.length > 0) {
        console.log(`✅ [Discovery] Tavily returned ${tavilyResult.competitors.length} competitors`);
        fallbackResult = filterSelfLinks(tavilyResult.competitors.map(comp => ({
          name: comp.name,
          website: comp.website || comp.url,
          domain: extractDomain(comp.website || comp.url),
          type: 'direct',
          positioning: 'Direct competitor',
          source: 'Tavily',
          isFallback: true
        })), websiteUrl);
        fallbackSource = 'Tavily';
      }
    } catch (tavilyError) {
      console.log('⚠️ [Discovery] Tavily fallback failed:', tavilyError.message);
    }
  }

  // Try SerpAPI if Tavily failed
  if (!fallbackResult && process.env.SERPAPI_API_KEY) {
    console.log('🔄 [Discovery] Trying SerpAPI fallback for competitors...');
    try {
      const serpapiResult = await getSerpApiCompetitors(productName, industry);
      if (serpapiResult && serpapiResult.length > 0) {
        console.log(`✅ [Discovery] SerpAPI returned ${serpapiResult.length} competitors`);
        fallbackResult = filterSelfLinks(serpapiResult.map(comp => ({
          name: comp.name || comp.title,
          website: comp.website || comp.link,
          domain: extractDomain(comp.website || comp.link),
          type: 'serp',
          positioning: 'SERP competitor',
          source: 'SerpAPI',
          isFallback: true
        })), websiteUrl);
        fallbackSource = 'SerpAPI';
      }
    } catch (serpapiError) {
      console.log('⚠️ [Discovery] SerpAPI fallback failed:', serpapiError.message);
    }
  }

  // Try Exa if SerpAPI failed
  if (!fallbackResult && EXA_API_KEY) {
    console.log('🔄 [Discovery] Trying Exa fallback for competitors...');
    try {
      const exaResult = await getExaCompetitors(productName, industry);
      if (exaResult && exaResult.length > 0) {
        console.log(`✅ [Discovery] Exa returned ${exaResult.length} competitors`);
        fallbackResult = filterSelfLinks(exaResult.map(comp => ({
          name: comp.title || comp.name,
          website: comp.url || comp.website,
          domain: extractDomain(comp.url || comp.website),
          type: 'estimated',
          positioning: 'Estimated competitor',
          source: 'Exa',
          isFallback: true
        })), websiteUrl);
        fallbackSource = 'Exa';
      }
    } catch (exaError) {
      console.log('⚠️ [Discovery] Exa fallback failed:', exaError.message);
    }
  }

  if (fallbackResult && fallbackResult.length > 0) {
    console.log(`✅ [Discovery] Using ${fallbackResult.length} competitors from ${fallbackSource}`);
    return fallbackResult;
  }

  // No competitors available from any source
  console.log('⚠️ [Discovery] No competitors available from any verified source');
  return [];
}

// ============================================
// COMPETITOR FILTERING
// ============================================

// Filter out self-links and non-competitor domains from competitor list
function filterSelfLinks(competitors, targetWebsiteUrl) {
    const targetDomain = extractDomain(targetWebsiteUrl);
    const excludedDomains = new Set([
      'instagram.com',
      'facebook.com',
      'twitter.com',
      'x.com',
      'linkedin.com',
      'youtube.com',
      'tiktok.com',
      'pinterest.com',
      'snapchat.com',
      'reddit.com',
      'threads.net',
      'play.google.com',
      'apps.apple.com',
      'appstore.com',
      'chrome.google.com',
      'chromewebstore.google.com',
      'h2o.ai',
      'datarobot.com',
      'canva.me',
      'help.canva.com',
      'support.canva.com',
      'status.canva.com',
      'community.canva.com',
      'trustpilot.com',
      'g2.com',
      'capterra.com',
      'crunchbase.com',
      'producthunt.com',
      'alternativeto.net',
      'medium.com',
      'forbes.com',
      'techcrunch.com',
      'theverge.com',
      'wired.com',
      'businessinsider.com',
      'entrepreneur.com',
      'inc.com',
      'venturebeat.com',
      'techradar.com',
      'zdnet.com',
      'cnet.com',
      'pcmag.com',
      'gartner.com',
      'forrester.com',
      'similarweb.com',
      'semrush.com',
      'ahrefs.com',
      'moz.com',
      'getapp.com',
      'softwareadvice.com',
      'sitejabber.com',
      'saasworthy.com',
      'zoominfo.com',
      'trustradius.com',
      'top10.com',
      'softwaretestinghelp.com',
      'digital.com',
      'financesonline.com',
      'selecthub.com',
      'peerinsights.com',
      'itqlick.com',
      'crazyegg.com',
      'hotjar.com',
      'clearbit.com',
      'builtwith.com',
      'wappalyzer.com',
      'datanyze.com',
      '6sense.com',
      'demandbase.com',
      'techtarget.com',
      'itcentralstation.com',
      'peerspot.com',
      'martech.org',
      'chiefmartec.com',
      'marketingtechnews.net',
      'martechvibe.com',
      'martechcube.com',
      'martechseries.com',
      'searchengineland.com',
      'searchenginejournal.com',
      'seroundtable.com',
      'thesempost.com',
      'searchenginewatch.com',
      'neilpatel.com',
      'backlinko.com',
      'moz.com',
      'ahrefs.com',
      'semrush.com',
      'searchenginejournal.com',
      'wordstream.com',
      'hubspot.com',
      'marketingprofs.com',
      'contentmarketinginstitute.com'
    ]);

    return competitors.filter(comp => {
      const compDomain = comp.domain || extractDomain(comp.website);
      // Filter self-links
      if (compDomain === targetDomain || compDomain.includes(targetDomain) || targetDomain.includes(compDomain)) {
        return false;
      }
      // Filter excluded domains (social platforms, app stores, irrelevant AI companies, self subdomains)
      if (excludedDomains.has(compDomain)) {
        return false;
      }
      // Filter subdomains of target domain
      if (compDomain.endsWith('.' + targetDomain) || targetDomain.endsWith('.' + compDomain)) {
        return false;
      }
      return true;
    });
  }

  // SerpAPI fallback function
  async function getSerpApiCompetitors(productName, industry) {
    const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY;
    if (!SERPAPI_API_KEY) return [];

    try {
      const query = `${productName} ${industry} competitors`;
      const url = `https://serpapi.com/search?engine=google&q=${encodeURIComponent(query)}&api_key=${SERPAPI_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.organic_results) {
        return data.organic_results.slice(0, 10).map(result => ({
          name: result.title,
          website: result.link,
          domain: extractDomain(result.link)
        }));
      }
      return [];
    } catch (error) {
      console.log('⚠️ [SerpAPI] Error:', error.message);
      return [];
    }
  }

  // Exa fallback function
  async function getExaCompetitors(productName, industry) {
    if (!EXA_API_KEY) return [];

    try {
      const query = `${productName} ${industry} competitors alternatives`;
      const url = 'https://api.exa.ai/search';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': EXA_API_KEY
        },
        body: JSON.stringify({
          query: query,
          numResults: 10,
          useAutoprompt: true
        })
      });
      const data = await response.json();

      if (data.results) {
        return data.results.map(result => ({
          name: result.title,
          website: result.url,
          domain: extractDomain(result.url)
        }));
      }
      return [];
    } catch (error) {
      console.log('⚠️ [Exa] Error:', error.message);
      return [];
    }
  }
}

function extractDomain(url) {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return null;
  }
}

// Filter competitors to remove self-links, homepage titles, social, app store, shortlinks
function filterAllCompetitors(competitors, identity) {
  const targetDomain = extractDomain(identity.websiteUrl) || identity.domain || '';
  const targetName = (identity.productName || identity.brandName || identity.companyName || '').toLowerCase();
  
  const socialDomains = new Set([
    'instagram.com', 'facebook.com', 'twitter.com', 'x.com',
    'linkedin.com', 'youtube.com', 'tiktok.com', 'pinterest.com',
    'snapchat.com', 'reddit.com', 'threads.net', 'mastodon.social',
    'crunchbase.com', 'trustpilot.com', 'g2.com', 'capterra.com',
    'getapp.com', 'softwareadvice.com', 'sitejabber.com',
    'glassdoor.com', 'indeed.com', 'producthunt.com', 'alternativeto.net',
    'saasworthy.com', 'growjo.com', 'owler.com', 'zoominfo.com',
    'medium.com', 'news.ycombinator.com', 'techcrunch.com',
    'theverge.com', 'wired.com', 'forbes.com', 'businessinsider.com',
    'entrepreneur.com', 'inc.com', 'venturebeat.com',
    'techradar.com', 'zdnet.com', 'cnet.com', 'pcmag.com',
    'g2.com', 'capterra.com', 'trustradius.com',
    'gartner.com', 'forrester.com', 'idc.com',
    'similarweb.com', 'semrush.com', 'ahrefs.com', 'moz.com',
    'trustradius.com', 'top10.com', 'softwaretestinghelp.com',
    'digital.com', 'financesonline.com', 'selecthub.com',
    'peerinsights.com', 'itqlick.com', 'crazyegg.com',
    'hotjar.com', 'clearbit.com', 'builtwith.com',
    'wappalyzer.com', 'datanyze.com', '6sense.com',
    'demandbase.com', 'techtarget.com', 'itcentralstation.com',
    'peerspot.com', 'martech.org', 'chiefmartec.com',
    'marketingtechnews.net', 'martechvibe.com', 'martechcube.com',
    'martechseries.com', 'searchengineland.com',
    'searchenginejournal.com', 'seroundtable.com', 'thesempost.com',
    'searchenginewatch.com', 'neilpatel.com', 'backlinko.com',
    'wordstream.com', 'hubspot.com', 'marketingprofs.com',
    'contentmarketinginstitute.com'
  ]);
  
  const appStoreDomains = new Set([
    'play.google.com', 'apps.apple.com', 'appstore.com',
    'chrome.google.com', 'chromewebstore.google.com',
    'developer.apple.com', 'developer.android.com'
  ]);
  
  const selfShortlinks = ['canva.me', 'figma.com', 'gamma.app', 'notion.so', 'orkyn.ai'];
  
  return competitors.filter(comp => {
    const compDomain = comp.domain || extractDomain(comp.website) || '';
    const compName = (comp.name || comp.title || '').toLowerCase();
    const compSource = comp.source || '';
    
    // Reject if domain equals target domain
    if (targetDomain && compDomain === targetDomain) {
      console.log(`🔍 [Competitor Filter] Rejected self-domain: ${compDomain}`);
      return false;
    }
    if (targetDomain && compDomain.includes(targetDomain)) {
      console.log(`🔍 [Competitor Filter] Rejected subdomain match: ${compDomain}`);
      return false;
    }
    
    // Reject if name contains only target brand
    if (targetName && compName === targetName) {
      console.log(`🔍 [Competitor Filter] Rejected name equals brand: ${compName}`);
      return false;
    }
    
    // Reject social media
    if (socialDomains.has(compDomain)) {
      console.log(`🔍 [Competitor Filter] Rejected social domain: ${compDomain}`);
      return false;
    }
    
    // Reject app store
    if (appStoreDomains.has(compDomain)) {
      console.log(`🔍 [Competitor Filter] Rejected app store: ${compDomain}`);
      return false;
    }
    
    // Reject self shortlinks
    if (selfShortlinks.some(s => compDomain === s || compDomain.endsWith('.' + s))) {
      console.log(`🔍 [Competitor Filter] Rejected shortlink: ${compDomain}`);
      return false;
    }
    
    // Reject homepage titles (contains colon indicating "Brand: Tagline")
    if (compName.includes(':') && targetName && compName.startsWith(targetName)) {
      console.log(`🔍 [Competitor Filter] Rejected homepage title: ${compName}`);
      return false;
    }
    
    return true;
  });
}

function extractCompanyName(title, url) {
  // Try to extract from title
  if (title) {
    // Remove common suffixes
    let name = title
      .replace(/\s*[-|–]\s*.*/g, '') // Remove everything after dash/pipe
      .replace(/\s*:\s*.*/g, '') // Remove everything after colon
      .trim();
    
    // Ignore if it looks like a blog title (e.g. '10 Best Resume Builders in 2026')
    if (name.split(' ').length > 4 || /\d+\s+Best/i.test(name) || /Top\s+\d+/i.test(name)) {
       name = ''; // Fallback to domain
    } else if (name && name.length > 2 && name.length < 50) {
      return name;
    }
  }
  
  // Fallback to domain name
  const domain = extractDomain(url);
  if (domain) {
    return domain
      .split('.')[0]
      .replace(/-/g, ' ')
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  
  return 'Unknown';
}

function determineCompetitorType(result, productName, industry) {
  const text = `${result.title} ${result.snippet || ''} ${result.content || ''}`.toLowerCase();
  const productLower = productName.toLowerCase();
  
  // Direct competitor indicators
  if (text.includes(productLower + ' alternative') || 
      text.includes(productLower + ' competitor') ||
      text.includes('vs ' + productLower)) {
    return 'direct';
  }
  
  // Semantic overlap for productivity/workspace/SaaS sites
  const productivityKeywords = [
    'workspace', 'docs', 'productivity', 'collaboration', 
    'automation', 'knowledge base', 'project management',
    'task management', 'team collaboration', 'document',
    'note taking', 'organize', 'workflow', 'sprint',
    'kanban', 'gantt', 'timeline', 'roadmap'
  ];
  
  const hasProductivityKeywords = productivityKeywords.some(kw => text.includes(kw));
  
  // If industry is productivity/workspace and has semantic keywords, classify as direct
  const isProductivityIndustry = industry.toLowerCase().includes('productivity') || 
                                  industry.toLowerCase().includes('workspace') ||
                                  industry.toLowerCase().includes('saas') ||
                                  industry.toLowerCase().includes('collaboration');
  
  if (isProductivityIndustry && hasProductivityKeywords) {
    return 'direct';
  }
  
  // Industry match
  if (text.includes(industry.toLowerCase())) {
    return text.includes('leader') || text.includes('top') ? 'direct' : 'indirect';
  }
  
  // Check if it's an emerging player
  if (text.includes('startup') || text.includes('new') || text.includes('emerging')) {
    return 'emerging';
  }
  
  return 'indirect';
}

function calculateConfidenceScore(result, query, productName) {
  let score = 50;
  
  const text = `${result.title} ${result.snippet || ''} ${result.content || ''}`.toLowerCase();
  const productLower = productName.toLowerCase();
  
  // High confidence signals
  if (text.includes(productLower)) score += 20;
  if (text.includes('competitor') || text.includes('alternative')) score += 15;
  if (text.includes('vs') || text.includes('comparison')) score += 10;
  if (result.title && result.title.length > 10) score += 5;
  
  return Math.min(score, 95);
}

// ============================================
// COMPETITOR PROFILE BUILDING
// ============================================

async function buildCompetitorProfiles(competitors, productName) {
  console.log('📊 [Profiles] Building competitor profiles...');

  const profiles = [];

  for (const competitor of competitors.slice(0, 5)) {
    try {
      const profile = await buildSingleProfile(competitor, productName);
      profiles.push(profile);
    } catch (error) {
      console.log(`⚠️ [Profiles] Failed to build profile for ${competitor.name}`);
      profiles.push({
        hasVerifiedData: false,
        confidenceScore: 0,
        provider: 'fallback_evidence',
        warnings: ['Module: Insufficient verified data'],
        dataSources: [],
        note: 'No verified data available',
        name: competitor.name,
        domain: extractDomain(competitor.website),
        website: competitor.website,
        competitorType: competitor.competitorType,
        title: competitor.name,
        metaDescription: competitor.description,
        mainKeywords: [],
        contentThemes: [],
        strongestPages: [],
        positioning: null,
        strengths: [],
        weaknesses: [],
        estimatedAuthority: null,
        estimatedTraffic: null,
        backlinks: null,
        referringDomains: null,
        dofollowRatio: null,
        aiVisibilityEstimate: null,
        sourceEvidence: competitor.sources,
        domainDataSource: 'Unavailable',
        domainDataEvidence: 'Domain data unavailable'
      });
    }
  }

  return profiles;
}

async function buildSingleProfile(competitor, productName) {
  console.log(`📝 [Profile] Building profile for ${competitor.name}...`);

  const domain = extractDomain(competitor.website);
  
  // Get domain data from DataForSEO if configured
  let domainData = null;
  if (isDataForSEOConfigured() && domain) {
    try {
      console.log(`🔍 [Profile] Fetching DataForSEO domain data for ${domain}...`);
      const domainResult = await getDomainData(domain);
      if (domainResult.success) {
        domainData = domainResult.data;
        console.log(`✅ [Profile] DataForSEO data retrieved for ${domain}`);
      }
    } catch (error) {
      console.log(`⚠️ [Profile] DataForSEO domain data fetch failed for ${domain}:`, error.message);
    }
  }

  // Try to get more data via Tavily if available
  let additionalData = null;
  if (TAVILY_API_KEY) {
    try {
      const results = await searchWithTavily(`${competitor.name} features pricing`);
      if (results.length > 0) {
        additionalData = results[0];
      }
    } catch (error) {
      console.log(`⚠️ [Profile] Additional data search failed for ${competitor.name}`);
    }
  }

  const combinedText = `
    ${competitor.description}
    ${additionalData?.content || ''}
    ${additionalData?.snippet || ''}
  `.toLowerCase();

  // Use DataForSEO data if available, otherwise use estimates
  const backlinksData = domainData?.backlinks;
  const analyticsData = domainData?.analytics;
  
  return {
    name: competitor.name,
    domain: domain,
    website: competitor.website,
    competitorType: competitor.competitorType,
    title: competitor.name,
    metaDescription: competitor.description,
    mainKeywords: extractKeywordsFromText(combinedText).slice(0, 10),
    contentThemes: extractThemes(combinedText),
    strongestPages: ['homepage', 'pricing', 'features'],
    positioning: determinePositioning(combinedText, competitor.competitorType),
    strengths: identifyStrengths(combinedText),
    weaknesses: identifyWeaknesses(combinedText, competitor.competitorType),
    estimatedAuthority: backlinksData?.domainRank || analyticsData?.domainRank || null,
    estimatedTraffic: analyticsData?.organicTraffic || null,
    backlinks: backlinksData?.totalBacklinks || null,
    referringDomains: backlinksData?.referringDomains || analyticsData?.referringDomains || null,
    dofollowRatio: backlinksData?.dofollowRatio || null,
    aiVisibilityEstimate: estimateAiVisibility(combinedText),
    sourceEvidence: competitor.sources,
    domainDataSource: backlinksData ? 'DataForSEO_Backlinks' : analyticsData ? 'DataForSEO_DomainAnalytics' : 'Unavailable',
    domainDataEvidence: backlinksData?.evidence || analyticsData?.evidence || 'Domain data unavailable'
  };
}

function extractKeywordsFromText(text) {
  const words = text.match(/\b[a-z]{4,}\b/g) || [];
  const frequency = {};
  
  words.forEach(word => {
    if (!isStopWord(word)) {
      frequency[word] = (frequency[word] || 0) + 1;
    }
  });

  return Object.entries(frequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([word]) => word);
}

function extractThemes(text) {
  const themes = [];
  
  const themePatterns = [
    { pattern: /automation|automate/i, theme: 'Automation' },
    { pattern: /ai|artificial intelligence|machine learning/i, theme: 'AI/ML' },
    { pattern: /analytics|reporting|dashboard/i, theme: 'Analytics' },
    { pattern: /integration|api|connect/i, theme: 'Integrations' },
    { pattern: /enterprise|business|corporate/i, theme: 'Enterprise' },
    { pattern: /cloud|saas|software/i, theme: 'Cloud/SaaS' },
    { pattern: /mobile|app|ios|android/i, theme: 'Mobile' },
    { pattern: /security|secure|encryption/i, theme: 'Security' }
  ];

  themePatterns.forEach(({ pattern, theme }) => {
    if (pattern.test(text)) {
      themes.push(theme);
    }
  });

  return themes.slice(0, 5);
}

function determinePositioning(text, competitorType) {
  if (text.includes('enterprise') || text.includes('fortune')) return 'Enterprise-focused';
  if (text.includes('startup') || text.includes('small business')) return 'SMB-focused';
  if (text.includes('affordable') || text.includes('budget')) return 'Cost-effective';
  if (text.includes('premium') || text.includes('advanced')) return 'Premium/Advanced';
  if (competitorType === 'direct') return 'Direct competitor';
  return 'Market player';
}

function identifyStrengths(text) {
  return [];
}

function identifyWeaknesses(text, competitorType) {
  return [];
}

function estimateAuthority(competitor, text) {
  let authority = 50;
  
  // Type-based
  if (competitor.competitorType === 'direct') authority += 15;
  if (competitor.competitorType === 'emerging') authority -= 10;
  
  // Confidence-based
  authority += (competitor.confidenceScore - 50) / 5;
  
  // Content signals
  if (text.includes('leader') || text.includes('leading')) authority += 10;
  if (text.includes('award') || text.includes('recognition')) authority += 5;
  if (text.includes('trusted')) authority += 5;
  
  return Math.min(Math.max(Math.round(authority), 30), 95);
}

function estimateAiVisibility(text) {
  let score = 50;
  
  // Content richness
  if (text.length > 1000) score += 10;
  if (text.includes('faq') || text.includes('question')) score += 10;
  if (text.includes('how to') || text.includes('guide')) score += 10;
  if (text.includes('example') || text.includes('use case')) score += 5;
  if (text.includes('comparison') || text.includes('vs')) score += 5;
  
  return Math.min(Math.round(score), 85);
}

function isStopWord(word) {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
    'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
  ]);
  return stopWords.has(word.toLowerCase());
}

// ============================================
// KEYWORD GAP ANALYSIS
// ============================================

function analyzeKeywordGaps(keywordIntelligence, competitorProfiles, websiteData) {
  console.log('🔑 [Keyword Gap] Analyzing keyword gaps...');

  const userKeywords = new Set([
    ...(keywordIntelligence.primaryKeywords || []).map(k => k.keyword.toLowerCase()),
    ...(keywordIntelligence.secondaryKeywords || []).map(k => k.keyword.toLowerCase()),
    ...(keywordIntelligence.longTailKeywords || []).map(k => k.keyword.toLowerCase())
  ]);

  const competitorKeywords = new Map(); // keyword -> [competitors using it]
  
  // Collect all competitor keywords
  competitorProfiles.forEach(profile => {
    (profile.mainKeywords || []).forEach(keyword => {
      if (!competitorKeywords.has(keyword)) {
        competitorKeywords.set(keyword, []);
      }
      competitorKeywords.get(keyword).push(profile.name);
    });
  });

  // Identify gaps
  const missingKeywords = [];
  const sharedKeywords = [];
  const competitorOnlyKeywords = [];

  competitorKeywords.forEach((competitors, keyword) => {
    if (userKeywords.has(keyword)) {
      sharedKeywords.push({
        keyword,
        competitorCount: competitors.length,
        competitorsUsing: competitors,
        reason: `Shared with ${competitors.length} competitor(s)`
      });
    } else {
      const gap = {
        keyword,
        competitorUsing: competitors,
        intent: determineKeywordIntent(keyword),
        opportunity: competitors.length >= 3 ? 'high' : 'medium',
        difficulty: competitors.length >= 3 ? 'medium' : 'easy',
        reason: `${competitors.length} competitor(s) rank for this, you don't`,
        recommendedPage: suggestPageForKeyword(keyword, websiteData)
      };
      
      if (competitors.length >= 2) {
        missingKeywords.push(gap);
      } else {
        competitorOnlyKeywords.push(gap);
      }
    }
  });

  // High opportunity keywords (multiple competitors, medium difficulty)
  const highOpportunityKeywords = missingKeywords
    .filter(k => k.competitorUsing.length >= 2 && k.competitorUsing.length <= 4)
    .sort((a, b) => b.competitorUsing.length - a.competitorUsing.length)
    .slice(0, 15);

  // Low competition keywords (only 1-2 competitors)
  const lowCompetitionKeywords = competitorOnlyKeywords
    .slice(0, 10);

  return {
    missingKeywords: missingKeywords.slice(0, 20),
    sharedKeywords: sharedKeywords.slice(0, 15),
    competitorOnlyKeywords: lowCompetitionKeywords,
    highOpportunityKeywords,
    lowCompetitionKeywords,
    summary: {
      totalMissing: missingKeywords.length,
      totalShared: sharedKeywords.length,
      highOpportunity: highOpportunityKeywords.length
    }
  };
}

function determineKeywordIntent(keyword) {
  const lower = keyword.toLowerCase();
  
  if (lower.includes('buy') || lower.includes('price') || lower.includes('pricing')) return 'commercial';
  if (lower.includes('how') || lower.includes('what') || lower.includes('guide')) return 'informational';
  if (lower.includes('best') || lower.includes('top') || lower.includes('review')) return 'commercial';
  if (lower.includes('vs') || lower.includes('versus') || lower.includes('compare')) return 'commercial';
  
  return 'informational';
}

function suggestPageForKeyword(keyword, websiteData) {
  const lower = keyword.toLowerCase();
  
  if (lower.includes('pricing') || lower.includes('price')) return 'Pricing page';
  if (lower.includes('feature')) return 'Features page';
  if (lower.includes('how') || lower.includes('guide')) return 'Blog post or guide';
  if (lower.includes('vs') || lower.includes('compare')) return 'Comparison page';
  if (lower.includes('review')) return 'Reviews or testimonials page';
  if (lower.includes('alternative')) return 'Alternatives comparison page';
  
  return 'New landing page or blog post';
}

// ============================================
// CONTENT GAP ANALYSIS
// ============================================

function analyzeContentGaps(websiteData, competitorProfiles, keywordGaps) {
  console.log('📝 [Content Gap] Analyzing content gaps...');

  const gaps = [];
  const userContent = (websiteData.text || '').toLowerCase();
  const userHeadings = (websiteData.content?.headings || []).map(h => h.text.toLowerCase());

  // Check for missing comparison pages
  const hasComparison = /vs|versus|compare|comparison|alternative/i.test(userContent);
  if (!hasComparison && competitorProfiles.length > 0) {
    competitorProfiles.slice(0, 3).forEach(comp => {
      gaps.push({
        gapType: 'comparison',
        title: `${websiteData.metadata?.title || 'Product'} vs ${comp.name}`,
        reason: `Competitor ${comp.name} ranks for comparison keywords`,
        competitorExample: comp.website,
        opportunityScore: 85,
        priority: 'high',
        suggestedAction: `Create detailed comparison page highlighting your advantages over ${comp.name}`
      });
    });
  }

  // Check for missing FAQ
  const hasFAQ = /faq|frequently asked|questions|q&a/i.test(userContent);
  if (!hasFAQ) {
    gaps.push({
      gapType: 'faq',
      title: 'FAQ Page',
      reason: 'No FAQ section found - essential for AI search visibility',
      competitorExample: competitorProfiles.find(c => c.contentThemes.includes('FAQ'))?.website || '',
      opportunityScore: 90,
      priority: 'high',
      suggestedAction: 'Create comprehensive FAQ section answering top 20 customer questions'
    });
  }

  // Check for missing use case pages
  const hasUseCases = /use case|customer story|case study|success story/i.test(userContent);
  if (!hasUseCases) {
    gaps.push({
      gapType: 'use_case',
      title: 'Use Cases / Customer Stories',
      reason: 'No use case or customer success content found',
      competitorExample: '',
      opportunityScore: 75,
      priority: 'medium',
      suggestedAction: 'Create 5-10 use case pages for different industries or user types'
    });
  }

  // Check for missing industry pages
  const hasIndustryPages = /industry|sector|vertical/i.test(userContent);
  if (!hasIndustryPages) {
    gaps.push({
      gapType: 'industry',
      title: 'Industry-Specific Pages',
      reason: 'No industry-specific content found',
      competitorExample: '',
      opportunityScore: 70,
      priority: 'medium',
      suggestedAction: 'Create landing pages for top 3-5 target industries'
    });
  }

  // Blog topic gaps from keyword analysis
  if (keywordGaps.missingKeywords && keywordGaps.missingKeywords.length > 0) {
    keywordGaps.missingKeywords
      .filter(k => k.intent === 'informational')
      .slice(0, 5)
      .forEach(k => {
        gaps.push({
          gapType: 'blog',
          title: `Blog: ${k.keyword}`,
          reason: `${k.competitorUsing.length} competitors rank for "${k.keyword}"`,
          competitorExample: '',
          opportunityScore: 65,
          priority: 'medium',
          suggestedAction: `Write comprehensive blog post targeting "${k.keyword}"`
        });
      });
  }

  // Missing pricing page
  const hasPricing = /pricing|price|cost|plan/i.test(userContent);
  if (!hasPricing) {
    gaps.push({
      gapType: 'landing_page',
      title: 'Pricing Page',
      reason: 'No clear pricing information found',
      competitorExample: '',
      opportunityScore: 95,
      priority: 'high',
      suggestedAction: 'Create transparent pricing page with plan comparison'
    });
  }

  return gaps.sort((a, b) => b.opportunityScore - a.opportunityScore);
}

// ============================================
// AUTHORITY GAP ANALYSIS
// ============================================

function analyzeAuthorityGaps(websiteData, competitorProfiles, geoIntelligence) {
  console.log('🏆 [Authority Gap] Analyzing authority gaps...');

  const userAuthority = estimateUserAuthority(websiteData, geoIntelligence);
  const avgCompetitorAuthority = competitorProfiles.reduce((sum, c) => sum + c.estimatedAuthority, 0) / competitorProfiles.length;
  
  const authorityGapScore = Math.max(0, Math.round(avgCompetitorAuthority - userAuthority));

  // User strengths
  const userStrengths = [];
  if ((websiteData.content?.wordCount || 0) > 2000) userStrengths.push('Comprehensive content');
  if ((geoIntelligence?.trustSignals?.score || 0) > 60) userStrengths.push('Good trust signals');
  if ((websiteData.content?.headings || []).length > 10) userStrengths.push('Well-structured content');

  // Competitor advantages
  const competitorAdvantages = [];
  competitorProfiles.forEach(comp => {
    if (comp.estimatedAuthority > userAuthority + 10) {
      competitorAdvantages.push(`${comp.name}: Higher estimated authority (${comp.estimatedAuthority} vs ${userAuthority})`);
    }
  });

  // Backlink opportunities
  const backlinkOpportunities = [
    { type: 'Industry directories', reason: 'Get listed in top industry directories', impact: 'medium' },
    { type: 'Guest posting', reason: 'Write guest posts for industry blogs', impact: 'high' },
    { type: 'Resource pages', reason: 'Get featured on resource and tool pages', impact: 'medium' },
    { type: 'Partnerships', reason: 'Build strategic partnerships for backlinks', impact: 'high' }
  ];

  // Citation opportunities
  const citationOpportunities = [
    { type: 'Industry reports', reason: 'Get cited in industry reports and studies', impact: 'high' },
    { type: 'Comparison sites', reason: 'Get listed on software comparison sites', impact: 'medium' },
    { type: 'Review platforms', reason: 'Build presence on review platforms', impact: 'high' }
  ];

  // Trust signal gaps
  const trustSignalGaps = [];
  const trustSignals = geoIntelligence?.trustSignals || {};
  
  if (!trustSignals.signals?.hasTestimonials) {
    trustSignalGaps.push({ signal: 'Customer testimonials', impact: 'high', action: 'Add testimonials section' });
  }
  if (!trustSignals.signals?.hasCaseStudies) {
    trustSignalGaps.push({ signal: 'Case studies', impact: 'high', action: 'Create 3-5 customer success stories' });
  }
  if (!trustSignals.signals?.hasCertifications) {
    trustSignalGaps.push({ signal: 'Certifications', impact: 'medium', action: 'Display relevant certifications' });
  }

  return {
    authorityGapScore,
    userAuthority,
    avgCompetitorAuthority: Math.round(avgCompetitorAuthority),
    userStrengths: userStrengths.length > 0 ? userStrengths : ['Established web presence'],
    competitorAdvantages: competitorAdvantages.length > 0 ? competitorAdvantages : ['More established brands'],
    backlinkOpportunities,
    citationOpportunities,
    trustSignalGaps
  };
}

function estimateUserAuthority(websiteData, geoIntelligence) {
  let authority = 40; // Base
  
  // Content-based
  const wordCount = websiteData.content?.wordCount || 0;
  if (wordCount > 3000) authority += 15;
  else if (wordCount > 1500) authority += 10;
  else if (wordCount > 800) authority += 5;
  
  // Structure
  const headingCount = (websiteData.content?.headings || []).length;
  if (headingCount > 15) authority += 10;
  else if (headingCount > 8) authority += 5;
  
  // GEO signals
  if (geoIntelligence) {
    const trustScore = geoIntelligence.trustSignals?.score || 0;
    authority += Math.round(trustScore / 5); // Max +20
  }
  
  // Technical
  if (websiteData.technical?.hasHTTPS) authority += 5;
  if (websiteData.structured?.schemas?.length > 3) authority += 5;
  
  return Math.min(Math.round(authority), 85);
}

// ============================================
// GEO COMPETITOR GAP
// ============================================

function analyzeGeoGaps(geoIntelligence, competitorProfiles) {
  console.log('🤖 [GEO Gap] Analyzing GEO competitor gaps...');

  if (!geoIntelligence || Object.keys(geoIntelligence).length === 0) {
    return {
      entityCoverageGap: 0,
      citationReadinessGap: 0,
      answerabilityGap: 0,
      topicalAuthorityGap: 0,
      aiVisibilityGap: 0,
      recommendedFixes: ['Run GEO analysis first to identify gaps']
    };
  }

  const userGeoScore = geoIntelligence.aiVisibilityScore || 0;
  const avgCompetitorGeoScore = competitorProfiles.reduce((sum, c) => sum + (c.aiVisibilityEstimate || 0), 0) / competitorProfiles.length;
  
  const aiVisibilityGap = Math.max(0, Math.round(avgCompetitorGeoScore - userGeoScore));

  const recommendedFixes = [];

  // Entity coverage gap
  const entityCoverageGap = Math.round((65 - (geoIntelligence.entityCoverageScore || 0)));
  if (entityCoverageGap > 10) {
    recommendedFixes.push(`Improve entity coverage (current: ${geoIntelligence.entityCoverageScore || 0}/100, target: 65+)`);
  }

  // Citation readiness gap
  const citationReadinessGap = Math.round((70 - (geoIntelligence.citationReadinessScore || 0)));
  if (citationReadinessGap > 10) {
    recommendedFixes.push(`Enhance citation readiness (current: ${geoIntelligence.citationReadinessScore || 0}/100, target: 70+)`);
  }

  // Answerability gap
  const answerabilityGap = Math.round((75 - (geoIntelligence.answerabilityScore || 0)));
  if (answerabilityGap > 10) {
    recommendedFixes.push(`Improve answerability (current: ${geoIntelligence.answerabilityScore || 0}/100, target: 75+)`);
  }

  // Topical authority gap
  const topicalAuthorityGap = Math.round((70 - (geoIntelligence.topicalAuthorityScore || 0)));
  if (topicalAuthorityGap > 10) {
    recommendedFixes.push(`Build topical authority (current: ${geoIntelligence.topicalAuthorityScore || 0}/100, target: 70+)`);
  }

  if (recommendedFixes.length === 0) {
    recommendedFixes.push('Maintain current GEO optimization efforts');
  }

  return {
    entityCoverageGap: Math.max(0, entityCoverageGap),
    citationReadinessGap: Math.max(0, citationReadinessGap),
    answerabilityGap: Math.max(0, answerabilityGap),
    topicalAuthorityGap: Math.max(0, topicalAuthorityGap),
    aiVisibilityGap,
    userGeoScore,
    avgCompetitorGeoScore: Math.round(avgCompetitorGeoScore),
    recommendedFixes
  };
}

// ============================================
// COMPETITOR MATRIX
// ============================================

function generateCompetitorMatrix(competitorProfiles, keywordGaps, contentGaps, authorityGaps, geoGaps) {
  console.log('📋 [Matrix] Generating competitor matrix...');

  return competitorProfiles.map(profile => {
    // Calculate strength scores
    const keywordStrength = calculateKeywordStrength(profile, keywordGaps);
    const contentStrength = calculateContentStrength(profile, contentGaps);
    const authorityStrength = profile.estimatedAuthority;
    const geoStrength = profile.aiVisibilityEstimate;

    // Overall threat score (weighted average)
    const overallThreatScore = Math.round(
      (keywordStrength * 0.25) +
      (contentStrength * 0.25) +
      (authorityStrength * 0.25) +
      (geoStrength * 0.25)
    );

    return {
      name: profile.name,
      website: profile.website,
      competitorType: profile.competitorType,
      keywordStrength,
      contentStrength,
      authorityStrength,
      geoStrength,
      overallThreatScore,
      weaknessToExploit: identifyWeaknessToExploit(profile),
      recommendedStrategy: generateCompetitiveStrategy(profile, overallThreatScore)
    };
  }).sort((a, b) => b.overallThreatScore - a.overallThreatScore);
}

function calculateKeywordStrength(profile, keywordGaps) {
  const competitorKeywords = keywordGaps.missingKeywords?.filter(
    k => k.competitorUsing.includes(profile.name)
  ).length || 0;

  return Math.min(Math.round(50 + (competitorKeywords * 3)), 90);
}

function calculateContentStrength(profile, contentGaps) {
  let strength = 50;

  // Content themes indicate breadth
  strength += Math.min((profile.contentThemes?.length || 0) * 5, 20);

  // Positioning indicates strategy clarity
  if (profile.positioning !== 'Unknown') strength += 10;

  // Strengths count
  strength += Math.min((profile.strengths?.length || 0) * 5, 20);

  return Math.min(Math.round(strength), 90);
}

function identifyWeaknessToExploit(profile) {
  if (profile.weaknesses && profile.weaknesses.length > 0) {
    return profile.weaknesses[0]; // Top weakness
  }

  if (profile.competitorType === 'emerging') {
    return 'Less established brand - opportunity to claim thought leadership';
  }

  if (profile.competitorType === 'indirect') {
    return 'Not directly competitive - differentiate on core value prop';
  }

  return 'Identify gaps in their content and keyword strategy';
}

function generateCompetitiveStrategy(profile, threatScore) {
  if (threatScore >= 70) {
    return `HIGH PRIORITY: Direct competitor with strong presence. Focus on differentiation, unique value props, and underserved keywords. Monitor closely.`;
  }

  if (threatScore >= 55) {
    return `MEDIUM PRIORITY: Significant competitor. Target their keyword gaps, create better content on shared topics, emphasize your strengths.`;
  }

  return `LOW PRIORITY: Less competitive threat. Learn from their positioning but focus on higher-priority competitors. Opportunistic engagement.`;
}

// ============================================
// RECOMMENDATIONS ENGINE
// ============================================

function generateRecommendations({ competitors, keywordGaps, contentGaps, authorityGaps, geoGaps, competitorMatrix }) {
  console.log('💡 [Recommendations] Generating competitive recommendations...');

  const immediate = [];
  const day30 = [];
  const day90 = [];

  // Immediate actions (0-7 days)
  if (keywordGaps.highOpportunityKeywords && keywordGaps.highOpportunityKeywords.length > 0) {
    immediate.push({
      action: `Target top 3 high-opportunity keywords: ${keywordGaps.highOpportunityKeywords.slice(0, 3).map(k => k.keyword).join(', ')}`,
      impact: 'high',
      difficulty: 'easy',
      reason: 'Multiple competitors rank for these, low competition'
    });
  }

  const highPriorityGaps = contentGaps.filter(g => g.priority === 'high');
  if (highPriorityGaps.length > 0) {
    immediate.push({
      action: `Create ${highPriorityGaps[0].title}`,
      impact: 'high',
      difficulty: 'easy',
      reason: highPriorityGaps[0].reason
    });
  }

  if (geoGaps.aiVisibilityGap > 15) {
    immediate.push({
      action: 'Improve AI search visibility - add FAQ and definition content',
      impact: 'high',
      difficulty: 'medium',
      reason: `Competitors average ${geoGaps.avgCompetitorGeoScore}/100 vs your ${geoGaps.userGeoScore}/100`
    });
  }

  // 30-day plan
  const topCompetitor = competitorMatrix[0];
  if (topCompetitor) {
    day30.push({
      action: `Create head-to-head comparison with ${topCompetitor.name}`,
      impact: 'high',
      difficulty: 'medium',
      reason: `Top competitor threat (score: ${topCompetitor.overallThreatScore}/100)`
    });
  }

  if (keywordGaps.missingKeywords && keywordGaps.missingKeywords.length > 5) {
    day30.push({
      action: `Target next 10 competitor keywords with dedicated content`,
      impact: 'high',
      difficulty: 'medium',
      reason: `Found ${keywordGaps.summary?.totalMissing || 0} keyword gaps`
    });
  }

  day30.push({
    action: 'Create 3-5 use case pages targeting competitor weaknesses',
    impact: 'medium',
    difficulty: 'medium',
    reason: 'Differentiate by highlighting unique value propositions'
  });

  // 90-day plan
  if (authorityGaps.authorityGapScore > 10) {
    day90.push({
      action: 'Execute backlink building campaign - target 20+ quality backlinks',
      impact: 'high',
      difficulty: 'hard',
      reason: `Authority gap of ${authorityGaps.authorityGapScore} points`
    });
  }

  day90.push({
    action: 'Build comprehensive content hub targeting all competitor keyword gaps',
    impact: 'high',
    difficulty: 'hard',
    reason: 'Establish topical authority and capture competitor traffic'
  });

  day90.push({
    action: 'Launch competitive intelligence monitoring - track competitor changes monthly',
    impact: 'medium',
    difficulty: 'medium',
    reason: 'Stay ahead of competitive moves and market shifts'
  });

  return {
    immediate: immediate.slice(0, 5),
    day30: day30.slice(0, 5),
    day90: day90.slice(0, 5),
    competitivePriorities: competitors.filter(c => c.competitorType === 'direct').slice(0, 3).map(c => c.name)
  };
}

// ============================================
// EXTERNAL API HELPERS
// ============================================

async function searchWithTavily(query) {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query,
      search_depth: 'basic',
      max_results: 5
    })
  });

  if (!response.ok) throw new Error('Tavily API error');
  
  const data = await response.json();
  return data.results || [];
}

async function searchWithExa(query) {
  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${EXA_API_KEY}`
    },
    body: JSON.stringify({
      query,
      num_results: 5,
      type: 'keyword'
    })
  });

  if (!response.ok) throw new Error('Exa API error');
  
  const data = await response.json();
  return data.results || [];
}


export default {
  generateCompetitorSeoIntelligence
};
