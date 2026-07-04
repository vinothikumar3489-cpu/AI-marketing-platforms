import { scrapeWebsite } from '../scraping/unified-scraper.service.js';
import { scrapeWebsite as scrapeWithExtraction } from '../scraper.service.js';
import { researchCompetitors } from '../tavily.service.js';
import { getSerpCompetitors, getKeywordMetrics, normalizeSerpCompetitors, isDataForSEOConfigured } from '../dataforseo.service.js';
import { collectResearchData } from './research-orchestrator.service.js';
import { collectCompanyIntelligence } from './company-intelligence.service.js';
import { collectMarketIntelligence } from './market-intelligence.service.js';
import { collectCompetitorIntelligence } from './competitor-intelligence.service.js';
import { collectAudienceIntelligence } from './audience-intelligence.service.js';
import { generateExecutiveStory } from './executive-story.service.js';
import { generateActionPlan } from './action-plan.service.js';
import { deriveWebsiteIdentity } from '../../utils/seo-identity.util.js';
import {
  logCompanyCollected, logTechnologyCollected, logPricingCollected,
  logCompetitorsCollected, logMarketCollected, logAudienceCollected,
  logStrategyGenerated, logReportGenerated
} from './business-intelligence-logger.js';

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

export async function collectBusinessIntelligence({ websiteUrl, productName, companyName, industry, targetCountry }) {
  console.log('[Business Intelligence] Starting enterprise-grade intelligence collection for:', websiteUrl);

  const evidence = {
    company: null,
    technology: [],
    pricing: null,
    competitors: [],
    market: null,
    audience: null,
    sources: [],
    warnings: []
  };

  try {
    // Phase 1: Website scraping for raw data
    console.log('[Business Intelligence] Phase 1: Website scraping');
    let scrapedData = null;
    let scrapedWithExtraction = null;

    try {
      const unifiedResult = await scrapeWebsite(websiteUrl, {
        timeout: 25000,
        extractSchema: true,
        extractImages: false,
        extractLinks: true
      });
      if (unifiedResult?.success && unifiedResult?.data) {
        scrapedData = unifiedResult.data;
        evidence.sources.push({ type: 'website_scrape', source: 'firecrawl', success: true });
      }
    } catch (e) {
      evidence.warnings.push(`Website scrape failed: ${e.message}`);
    }

    try {
      const legacyResult = await scrapeWithExtraction({ websiteUrl, productName, companyName });
      if (legacyResult?.success && legacyResult?.scrapedData) {
        scrapedWithExtraction = legacyResult.scrapedData;
        if (!scrapedData) {
          evidence.sources.push({ type: 'website_scrape', source: legacyResult.source, success: true });
        }
      }
    } catch (e) {
      evidence.warnings.push(`Legacy scrape failed: ${e.message}`);
    }

    // Phase 2: Company Intelligence
    console.log('[Business Intelligence] Phase 2: Company Intelligence');
    const companyIntel = await collectCompanyIntelligence({
      websiteUrl,
      productName,
      companyName,
      industry,
      scrapedData,
      scrapedWithExtraction
    });
    evidence.company = companyIntel;
    logCompanyCollected(companyIntel);
    evidence.sources.push(...(companyIntel.sources || []));

    // Phase 3: Technology Intelligence
    console.log('[Business Intelligence] Phase 3: Technology Intelligence');
    evidence.technology = detectTechnologyStack(scrapedData, scrapedWithExtraction);
    logTechnologyCollected(evidence.technology);

    // Phase 4: Market Intelligence
    console.log('[Business Intelligence] Phase 4: Market Intelligence');
    const marketIntel = await collectMarketIntelligence({
      websiteUrl,
      productName: companyIntel.name || productName,
      industry: companyIntel.industry || industry,
      targetCountry
    });
    evidence.market = marketIntel;
    logMarketCollected(marketIntel);
    if (marketIntel.sources) {
      evidence.sources.push(...marketIntel.sources);
    }
    evidence.warnings.push(...(marketIntel.warnings || []));

    // Phase 5: Competitor Intelligence
    console.log('[Business Intelligence] Phase 5: Competitor Intelligence');
    const competitorIntel = await collectCompetitorIntelligence({
      websiteUrl,
      productName: companyIntel.name || productName,
      companyName: companyIntel.name || companyName,
      industry: companyIntel.industry || industry,
      marketData: marketIntel
    });
    evidence.competitors = competitorIntel;
    logCompetitorsCollected(competitorIntel);
    if (competitorIntel.sources) {
      evidence.sources.push(...competitorIntel.sources);
    }
    evidence.warnings.push(...(competitorIntel.warnings || []));

    // Phase 6: Audience Intelligence
    console.log('[Business Intelligence] Phase 6: Audience Intelligence');
    const audienceIntel = await collectAudienceIntelligence({
      company: companyIntel,
      competitors: competitorIntel,
      market: marketIntel,
      scrapedData,
      scrapedWithExtraction
    });
    evidence.audience = audienceIntel;
    logAudienceCollected(audienceIntel);
    if (audienceIntel.sources) {
      evidence.sources.push(...audienceIntel.sources);
    }

    // Phase 7: Pricing from scraped data
    console.log('[Business Intelligence] Phase 7: Pricing Intelligence');
    evidence.pricing = extractVerifiedPricing(scrapedData, scrapedWithExtraction);
    logPricingCollected(evidence.pricing);

    console.log('[Business Intelligence] Collection complete:', {
      hasCompany: !!evidence.company,
      technologyCount: evidence.technology.length,
      hasMarket: !!evidence.market,
      competitorsCount: evidence.competitors.length,
      hasAudience: !!evidence.audience,
      hasPricing: !!evidence.pricing,
      sourcesCount: evidence.sources.length,
      warningsCount: evidence.warnings.length
    });

    return evidence;
  } catch (error) {
    console.error('[Business Intelligence] Fatal error:', error);
    evidence.warnings.push(`Fatal error: ${error.message}`);
    return evidence;
  }
}

export function detectTechnologyStack(scrapedData, scrapedWithExtraction) {
  const technologies = [];
  const html = scrapedData?.html || scrapedData?.rawHtml || '';
  const text = (scrapedData?.text || scrapedData?.cleanedText || '') + ' ' + (scrapedWithExtraction?.rawMarkdown || '');
  const combined = html + ' ' + text;
  const lower = combined.toLowerCase();

  const detectors = {
    framework: [
      { name: 'React', patterns: ['react', 'reactjs', 'react.js', 'npx create-react-app', 'data-reactroot'] },
      { name: 'Next.js', patterns: ['nextjs', 'next.js', '__next', 'next/'] },
      { name: 'Vue.js', patterns: ['vuejs', 'vue.js', 'vue2', 'vue3', 'v-bind', 'v-model', 'v-if'] },
      { name: 'Nuxt.js', patterns: ['nuxtjs', 'nuxt.js', '__nuxt'] },
      { name: 'Angular', patterns: ['angular', 'ng-', 'ngapp', 'angularjs'] },
      { name: 'Svelte', patterns: ['svelte', 'sveltejs'] },
      { name: 'Gatsby', patterns: ['gatsby', 'gatsbyjs'] },
      { name: 'Django', patterns: ['django', 'csrftoken', 'django-admin'] },
      { name: 'Rails', patterns: ['rails', 'ruby on rails', 'roR'] },
      { name: 'Laravel', patterns: ['laravel', 'livewire'] },
      { name: 'Symfony', patterns: ['symfony'] },
      { name: 'Express', patterns: ['express', 'expressjs'] },
      { name: 'Spring', patterns: ['spring boot', 'springframework'] }
    ],
    cms: [
      { name: 'WordPress', patterns: ['wp-content', 'wp-admin', 'wp-includes', 'wordpress'] },
      { name: 'Shopify', patterns: ['shopify', 'myshopify', '/cdn/shop/'] },
      { name: 'Wix', patterns: ['wix', 'wixstatic'] },
      { name: 'Squarespace', patterns: ['squarespace', 'static1.squarespace'] },
      { name: 'Webflow', patterns: ['webflow'] },
      { name: 'Drupal', patterns: ['drupal', 'drupal.js'] },
      { name: 'Joomla', patterns: ['joomla', 'com_content'] },
      { name: 'Contentful', patterns: ['contentful'] },
      { name: 'Strapi', patterns: ['strapi'] },
      { name: 'Ghost', patterns: ['ghost'] },
      { name: 'HubSpot CMS', patterns: ['hs-scripts', 'hubspot', 'hs-analytics'] }
    ],
    cloud: [
      { name: 'AWS', patterns: ['aws', 'amazonaws', 'aws-sdk', 'cloudfront'] },
      { name: 'Google Cloud', patterns: ['googlecloud', 'gcp', 'appspot', 'googleapis.com'] },
      { name: 'Azure', patterns: ['azure', 'azureedge', 'azurefd', 'windows.net'] },
      { name: 'Cloudflare', patterns: ['cloudflare', '__cfduid', 'cf-ray', 'cdn-cgi'] },
      { name: 'Vercel', patterns: ['vercel', 'zeit'] },
      { name: 'Netlify', patterns: ['netlify'] },
      { name: 'Heroku', patterns: ['heroku'] }
    ],
    cdn: [
      { name: 'Cloudflare CDN', patterns: ['cloudflare'] },
      { name: 'Fastly', patterns: ['fastly'] },
      { name: 'Akamai', patterns: ['akamai', 'akamaiedge'] },
      { name: 'jsDelivr', patterns: ['jsdelivr'] },
      { name: 'UNPKG', patterns: ['unpkg'] },
      { name: 'CDNJS', patterns: ['cdnjs'] },
      { name: 'Amazon CloudFront', patterns: ['cloudfront'] }
    ],
    analytics: [
      { name: 'Google Analytics', patterns: ['google-analytics', 'ga.js', 'gtag', 'ga('] },
      { name: 'Google Tag Manager', patterns: ['googletagmanager', 'gtm.js'] },
      { name: 'Meta Pixel', patterns: ['facebook pixel', 'fbq(', 'connect.facebook'] },
      { name: 'LinkedIn Insight', patterns: ['linkedin insight', 'snap.licdn'] },
      { name: 'Hotjar', patterns: ['hotjar'] },
      { name: 'Mixpanel', patterns: ['mixpanel'] },
      { name: 'Amplitude', patterns: ['amplitude'] },
      { name: 'Heap', patterns: ['heap'] },
      { name: 'FullStory', patterns: ['fullstory'] },
      { name: 'Segment', patterns: ['segment', 'cdn.segment'] },
      { name: 'Plausible', patterns: ['plausible'] },
      { name: 'Fathom', patterns: ['fathom'] },
      { name: 'Matomo', patterns: ['matomo', 'piwik'] }
    ],
    seo: [
      { name: 'Yoast SEO', patterns: ['yoast'] },
      { name: 'Rank Math', patterns: ['rank math'] },
      { name: 'All in One SEO', patterns: ['all in one seo'] },
      { name: 'SEMRush', patterns: ['semrush'] },
      { name: 'Ahrefs', patterns: ['ahrefs'] },
      { name: 'Moz', patterns: ['moz'] }
    ],
    payment: [
      { name: 'Stripe', patterns: ['stripe', 'js.stripe'] },
      { name: 'PayPal', patterns: ['paypal'] },
      { name: 'Square', patterns: ['square'] },
      { name: 'Braintree', patterns: ['braintree'] },
      { name: 'Shopify Payments', patterns: ['shopify payments'] },
      { name: 'Chargebee', patterns: ['chargebee'] },
      { name: 'Recurly', patterns: ['recurly'] },
      { name: 'Paddle', patterns: ['paddle'] }
    ],
    auth: [
      { name: 'Auth0', patterns: ['auth0'] },
      { name: 'Clerk', patterns: ['clerk'] },
      { name: 'Firebase Auth', patterns: ['firebase', 'firebaseapp'] },
      { name: 'Supabase Auth', patterns: ['supabase'] },
      { name: 'Okta', patterns: ['okta'] },
      { name: 'Amazon Cognito', patterns: ['cognito'] },
      { name: 'Magic Link', patterns: ['magic.link'] }
    ],
    chat: [
      { name: 'Intercom', patterns: ['intercom'] },
      { name: 'Drift', patterns: ['drift'] },
      { name: 'Crisp', patterns: ['crisp'] },
      { name: 'Zendesk Chat', patterns: ['zendesk'] },
      { name: 'LiveChat', patterns: ['livechat'] },
      { name: 'Tidio', patterns: ['tidio'] },
      { name: 'Olark', patterns: ['olark'] },
      { name: 'HubSpot Chat', patterns: ['hubspot'] }
    ],
    email: [
      { name: 'SendGrid', patterns: ['sendgrid'] },
      { name: 'Mailchimp', patterns: ['mailchimp'] },
      { name: 'Mailgun', patterns: ['mailgun'] },
      { name: 'Postmark', patterns: ['postmark'] },
      { name: 'Resend', patterns: ['resend'] },
      { name: 'Amazon SES', patterns: ['amazon ses'] },
      { name: 'ConvertKit', patterns: ['convertkit'] },
      { name: 'Customer.io', patterns: ['customer.io'] },
      { name: 'ActiveCampaign', patterns: ['activecampaign'] }
    ],
    crm: [
      { name: 'Salesforce', patterns: ['salesforce'] },
      { name: 'HubSpot CRM', patterns: ['hubspot'] },
      { name: 'Pipedrive', patterns: ['pipedrive'] },
      { name: 'Close', patterns: ['close.io'] },
      { name: 'Zoho CRM', patterns: ['zoho'] },
      { name: 'Copper', patterns: ['copper'] }
    ],
    marketing: [
      { name: 'HubSpot Marketing', patterns: ['hubspot'] },
      { name: 'Marketo', patterns: ['marketo'] },
      { name: 'Mailchimp', patterns: ['mailchimp'] },
      { name: 'ActiveCampaign', patterns: ['activecampaign'] },
      { name: 'Klaviyo', patterns: ['klaviyo'] },
      { name: 'Braze', patterns: ['braze'] },
      { name: 'Iterable', patterns: ['iterable'] }
    ],
    monitoring: [
      { name: 'Sentry', patterns: ['sentry'] },
      { name: 'Datadog', patterns: ['datadog'] },
      { name: 'New Relic', patterns: ['new relic'] },
      { name: 'LogRocket', patterns: ['logrocket'] },
      { name: 'Rollbar', patterns: ['rollbar'] },
      { name: 'BugSnag', patterns: ['bugsnag'] }
    ],
    advertising: [
      { name: 'Google Ads', patterns: ['google ads', 'google_ad', 'adsbygoogle'] },
      { name: 'Meta Ads', patterns: ['facebook ads', 'fbq('] },
      { name: 'LinkedIn Ads', patterns: ['linkedin ads'] },
      { name: 'Twitter Ads', patterns: ['twitter ads'] },
      { name: 'TikTok Pixel', patterns: ['tiktok pixel', 'ttq('] },
      { name: 'Reddit Ads', patterns: ['reddit ads'] },
      { name: 'Pinterest Tag', patterns: ['pinterest'] },
      { name: 'Bing Ads', patterns: ['bing ads'] },
      { name: 'AdRoll', patterns: ['adroll'] }
    ]
  };

  const detected = new Set();

  for (const [category, items] of Object.entries(detectors)) {
    for (const tech of items) {
      if (detected.has(tech.name)) continue;
      const found = tech.patterns.some(pattern => lower.includes(pattern));
      if (found) {
        technologies.push({
          name: tech.name,
          category,
          confidence: 90,
          evidence: `Detected from page source patterns`
        });
        detected.add(tech.name);
      }
    }
  }

  return technologies;
}

export function extractVerifiedPricing(scrapedData, scrapedWithExtraction) {
  const text = (scrapedData?.text || '') + ' ' +
    (scrapedData?.cleanedText || '') + ' ' +
    (scrapedWithExtraction?.rawMarkdown || '') + ' ' +
    (scrapedWithExtraction?.cleanedText || '') + ' ' +
    (scrapedWithExtraction?.pricingText || '');

  const lower = text.toLowerCase();
  const pricing = {
    tiers: [],
    hasFree: false,
    hasTrial: false,
    hasEnterprise: false,
    hasCustomPricing: false,
    currency: null,
    source: 'Unknown',
    billingPeriods: [],
    pricePoints: []
  };

  const tierPatterns = [
    { name: 'Free', patterns: ['free plan', 'free tier', 'free forever', 'free account', 'free $0'] },
    { name: 'Starter', patterns: ['starter', 'basic', 'beginner'] },
    { name: 'Pro', patterns: ['pro plan', 'professional', 'pro $'] },
    { name: 'Business', patterns: ['business plan', 'business $', 'team plan', 'company'] },
    { name: 'Enterprise', patterns: ['enterprise', 'custom plan'] }
  ];

  for (const tier of tierPatterns) {
    const found = tier.patterns.some(p => lower.includes(p));
    if (found) {
      pricing.tiers.push({ name: tier.name, detected: true });
      if (tier.name === 'Free') pricing.hasFree = true;
      if (tier.name === 'Enterprise') pricing.hasEnterprise = true;
    }
  }

  if (lower.includes('free trial') || lower.includes('try free') || lower.includes('start free') || lower.includes('14-day') || lower.includes('30-day')) {
    pricing.hasTrial = true;
  }

  if (lower.includes('custom pricing') || lower.includes('contact for pricing') || lower.includes('custom plan')) {
    pricing.hasCustomPricing = true;
  }

  const currencyPatterns = [
    { symbol: '$', name: 'USD' },
    { symbol: '€', name: 'EUR' },
    { symbol: '£', name: 'GBP' },
    { symbol: '₹', name: 'INR' },
    { symbol: '¥', name: 'JPY' },
    { symbol: 'A$', name: 'AUD' },
    { symbol: 'C$', name: 'CAD' }
  ];

  for (const currency of currencyPatterns) {
    if (text.includes(currency.symbol) && (text.includes('/mo') || text.includes('/month') || text.includes('monthly') || text.includes('per month'))) {
      pricing.currency = currency.name;
      break;
    }
  }

  const priceRegex = /(\$|€|£|₹)(\d+[,.]?\d*)\s*\/\s*(mo|month|year|annual|user)/gi;
  let match;
  while ((match = priceRegex.exec(text)) !== null) {
    pricing.pricePoints.push({
      amount: match[2].replace(',', ''),
      currency: match[1],
      period: match[3]
    });
  }

  if (lower.includes('/month') || lower.includes('/mo')) pricing.billingPeriods.push('monthly');
  if (lower.includes('/year') || lower.includes('/annual')) pricing.billingPeriods.push('annual');

  if (pricing.tiers.length > 0 || pricing.hasFree || pricing.hasTrial) {
    pricing.source = scrapedWithExtraction?.scrapeQuality?.source || scrapedData?.source || 'website_scrape';
  }

  return pricing;
}

export function synthesizeWithAI(evidence) {
  const company = evidence.company || {};
  const technology = evidence.technology || [];
  const pricing = evidence.pricing || {};
  const competitors = evidence.competitors || [];
  const market = evidence.market || {};
  const audience = evidence.audience || {};

  return {
    companyIntelligence: {
      name: company.name || 'Unknown',
      domain: company.domain || '',
      industry: company.industry || 'Unknown',
      category: company.category || 'Unknown',
      subCategory: company.subCategory || 'Unknown',
      businessModel: company.businessModel || 'Unknown',
      targetMarket: company.targetMarket || 'Unknown',
      launchYear: company.launchYear || 'Unknown',
      headquarters: company.headquarters || 'Unknown',
      employeeEstimate: company.employeeEstimate || 'Unknown',
      fundingStage: company.fundingStage || 'Unknown',
      fundingAmount: company.fundingAmount || 'Unknown',
      b2bOrB2C: company.b2bOrB2C || 'Unknown',
      socialChannels: company.socialChannels || [],
      supportedCountries: company.supportedCountries || ['Unknown'],
      languages: company.languages || ['Unknown']
    },
    technologyIntelligence: {
      technologies,
      framework: technology.filter(t => t.category === 'framework').map(t => t.name),
      cms: technology.filter(t => t.category === 'cms').map(t => t.name),
      cloudProvider: technology.filter(t => t.category === 'cloud').map(t => t.name),
      cdn: technology.filter(t => t.category === 'cdn').map(t => t.name),
      analytics: technology.filter(t => t.category === 'analytics').map(t => t.name),
      trackingTools: technology.filter(t => ['analytics', 'advertising'].includes(t.category)).map(t => t.name),
      crm: technology.filter(t => t.category === 'crm').map(t => t.name),
      marketingAutomation: technology.filter(t => t.category === 'marketing').map(t => t.name),
      paymentProviders: technology.filter(t => t.category === 'payment').map(t => t.name),
      authentication: technology.filter(t => t.category === 'auth').map(t => t.name),
      chatWidgets: technology.filter(t => t.category === 'chat').map(t => t.name),
      seoTools: technology.filter(t => t.category === 'seo').map(t => t.name),
      monitoringTools: technology.filter(t => t.category === 'monitoring').map(t => t.name),
      emailProviders: technology.filter(t => t.category === 'email').map(t => t.name)
    },
    pricingIntelligence: {
      tiers: pricing.tiers || [],
      hasFree: pricing.hasFree || false,
      hasFreeTrial: pricing.hasTrial || false,
      hasEnterprise: pricing.hasEnterprise || false,
      hasCustomPricing: pricing.hasCustomPricing || false,
      currency: pricing.currency || 'Unknown',
      billingPeriods: pricing.billingPeriods || [],
      pricePoints: pricing.pricePoints || [],
      source: pricing.source || 'Pricing unavailable'
    },
    competitorIntelligence: competitors,
    marketIntelligence: {
      tam: market.tam || 'Unknown',
      sam: market.sam || 'Unknown',
      som: market.som || 'Unknown',
      growthRate: market.growthRate || 'Unknown',
      trends: market.trends || [],
      opportunities: market.opportunities || [],
      risks: market.risks || [],
      sources: market.sources || []
    },
    audienceIntelligence: audience,
    evidence: {
      sources: evidence.sources || [],
      warnings: evidence.warnings || []
    }
  };
}
