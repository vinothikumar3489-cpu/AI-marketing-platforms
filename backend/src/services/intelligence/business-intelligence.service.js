import { getLatestEvidenceSnapshot } from "../../domains/research/services/evidence.service.js";
import { researchCompetitors } from "../../providers/tavily.service.js";
import { getSerpCompetitors, getKeywordMetrics, normalizeSerpCompetitors, isDataForSEOConfigured } from "../../providers/dataforseo.service.js";
import { collectCompanyIntelligence } from "./company-intelligence.service.js";
import { collectMarketIntelligence } from "./market-intelligence.service.js";
import { collectCompetitorIntelligence } from "./competitor-intelligence.service.js";
import { collectAudienceIntelligence } from "./audience-intelligence.service.js";
import { generateExecutiveStory } from "./executive-story.service.js";
import { generateActionPlan } from "./action-plan.service.js";
import { deriveWebsiteIdentity } from "../../utils/seo-identity.util.js";
import {
  logCompanyCollected, logTechnologyCollected, logPricingCollected,
  logCompetitorsCollected, logMarketCollected, logAudienceCollected,
  logStrategyGenerated, logReportGenerated
} from "./business-intelligence-logger.js";

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

function extractDomainSimple(url) {
  if (!url) return '';
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace('www.', '');
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}

export async function collectBusinessIntelligence({ chatId, websiteUrl, productName, companyName, industry, targetCountry, category, domain }) {
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
    // Phase 1: Evidence Snapshot Loading
    console.log('[Business Intelligence] Phase 1: Loading Evidence Snapshot');
    let scrapedData = null;
    let scrapedWithExtraction = null;

    try {
      if (chatId) {
        const evidenceReq = await getLatestEvidenceSnapshot(chatId);
        if (evidenceReq.success && evidenceReq.snapshot) {
          const snap = evidenceReq.snapshot;
          const txt = snap.contentEvidence?.cleanedText || snap.rawEvidence?.rawMarkdown || '';
          
          scrapedData = {
            html: snap.rawEvidence?.rawHtml || '',
            text: txt,
            metadata: {
              title: snap.websiteEvidence?.title || '',
              description: snap.websiteEvidence?.metaDescription || ''
            },
            title: snap.websiteEvidence?.title || ''
          };
          
          scrapedWithExtraction = {
            rawMarkdown: snap.rawEvidence?.rawMarkdown || '',
            cleanedText: txt,
            pricingText: snap.websiteEvidence?.pricingText || '',
            scrapeQuality: snap.sourceSummary
          };
          
          evidence.sources.push({ type: 'evidence_snapshot', source: snap.source || 'canonical', success: true });
        }
      }
      
      if (!scrapedData) {
         throw new Error("No EvidenceSnapshot found. Scraping must run first.");
      }
    } catch (e) {
      evidence.warnings.push(`Evidence load failed: ${e.message}`);
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
      targetCountry,
      category: category || companyIntel.category,
      domain: domain || extractDomainSimple(websiteUrl),
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
      marketData: marketIntel,
      category: category || companyIntel.category,
      domain: domain || extractDomainSimple(websiteUrl),
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
    frontend: [
      { name: 'React', patterns: ['react', 'reactjs', 'react.js', 'npx create-react-app', 'data-reactroot'] },
      { name: 'Next.js', patterns: ['nextjs', 'next.js', '__next', 'next/'] },
      { name: 'Vue.js', patterns: ['vuejs', 'vue.js', 'vue2', 'vue3', 'v-bind', 'v-model', 'v-if'] },
      { name: 'Nuxt.js', patterns: ['nuxtjs', 'nuxt.js', '__nuxt'] },
      { name: 'Angular', patterns: ['angular', 'ng-', 'ngapp', 'angularjs'] },
      { name: 'Svelte', patterns: ['svelte', 'sveltejs'] },
      { name: 'Gatsby', patterns: ['gatsby', 'gatsbyjs'] },
      { name: 'SvelteKit', patterns: ['sveltekit'] },
      { name: 'Remix', patterns: ['remix.run', 'remix'] },
      { name: 'Astro', patterns: ['astro.build', 'astro'] },
      { name: 'Solid.js', patterns: ['solidjs', 'solid-js'] },
      { name: 'TypeScript', patterns: ['typescript', 'tsconfig'] },
      { name: 'jQuery', patterns: ['jquery', 'jquery.js'] },
      { name: 'Tailwind CSS', patterns: ['tailwind', 'tailwindcss'] },
      { name: 'Bootstrap', patterns: ['bootstrap', 'bootstrap.css'] },
      { name: 'Sass/SCSS', patterns: ['sass', 'scss'] },
      { name: 'Material UI', patterns: ['material-ui', 'mui', '@material-ui'] },
      { name: 'Chakra UI', patterns: ['chakra-ui', '@chakra-ui'] },
      { name: 'Shadcn/ui', patterns: ['shadcn', 'shadcn/ui'] }
    ],
    backend: [
      { name: 'Node.js', patterns: ['nodejs', 'node.js', 'express', 'expressjs'] },
      { name: 'Python/Django', patterns: ['django', 'csrftoken', 'django-admin', 'python'] },
      { name: 'Ruby on Rails', patterns: ['rails', 'ruby on rails', 'ror'] },
      { name: 'Laravel', patterns: ['laravel', 'livewire'] },
      { name: 'Symfony', patterns: ['symfony'] },
      { name: 'Spring Boot', patterns: ['spring boot', 'springframework'] },
      { name: 'ASP.NET', patterns: ['asp.net', 'aspnet', '.net core', 'dotnet'] },
      { name: 'Go', patterns: ['golang', 'go.dev'] },
      { name: 'Rust', patterns: ['rust', 'rustlang'] },
      { name: 'PHP', patterns: ['php', 'laravel', 'wordpress'] },
      { name: 'FastAPI', patterns: ['fastapi', 'uvicorn'] },
      { name: 'Flask', patterns: ['flask.pallets'] },
      { name: 'NestJS', patterns: ['nestjs', '@nestjs'] },
      { name: 'GraphQL', patterns: ['graphql', 'apollographql', 'graphql.org'] },
      { name: 'Firebase', patterns: ['firebase', 'firebaseapp', 'firebaseio'] },
      { name: 'Supabase', patterns: ['supabase'] }
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
      { name: 'HubSpot CMS', patterns: ['hs-scripts', 'hubspot', 'hs-analytics'] },
      { name: 'Sanity', patterns: ['sanity.io', '@sanity'] },
      { name: 'Prismic', patterns: ['prismic.io', 'prismic'] },
      { name: 'ButterCMS', patterns: ['buttercms'] }
    ],
    hosting: [
      { name: 'AWS', patterns: ['aws', 'amazonaws', 'aws-sdk', 'cloudfront'] },
      { name: 'Google Cloud', patterns: ['googlecloud', 'gcp', 'appspot', 'googleapis.com'] },
      { name: 'Azure', patterns: ['azure', 'azureedge', 'azurefd', 'windows.net'] },
      { name: 'Cloudflare', patterns: ['cloudflare', 'cf-ray', 'cdn-cgi'] },
      { name: 'Vercel', patterns: ['vercel', 'zeit'] },
      { name: 'Netlify', patterns: ['netlify'] },
      { name: 'Heroku', patterns: ['heroku'] },
      { name: 'DigitalOcean', patterns: ['digitalocean', 'digital ocean'] },
      { name: 'Linode', patterns: ['linode'] },
      { name: 'Render', patterns: ['render.com'] },
      { name: 'Fly.io', patterns: ['fly.io'] },
      { name: 'Railway', patterns: ['railway.app'] }
    ],
    cdn: [
      { name: 'Cloudflare CDN', patterns: ['cloudflare'] },
      { name: 'Fastly', patterns: ['fastly'] },
      { name: 'Akamai', patterns: ['akamai', 'akamaiedge'] },
      { name: 'jsDelivr', patterns: ['jsdelivr'] },
      { name: 'UNPKG', patterns: ['unpkg'] },
      { name: 'CDNJS', patterns: ['cdnjs'] },
      { name: 'Amazon CloudFront', patterns: ['cloudfront'] },
      { name: 'KeyCDN', patterns: ['keycdn'] },
      { name: 'BunnyCDN', patterns: ['bunnycdn', 'bunny.net'] }
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
      { name: 'Matomo', patterns: ['matomo', 'piwik'] },
      { name: 'PostHog', patterns: ['posthog'] }
    ],
    crm: [
      { name: 'Salesforce', patterns: ['salesforce'] },
      { name: 'HubSpot CRM', patterns: ['hubspot'] },
      { name: 'Pipedrive', patterns: ['pipedrive'] },
      { name: 'Close', patterns: ['close.io'] },
      { name: 'Zoho CRM', patterns: ['zoho'] },
      { name: 'Copper', patterns: ['copper'] },
      { name: 'Freshsales', patterns: ['freshsales'] }
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
      { name: 'ActiveCampaign', patterns: ['activecampaign'] },
      { name: 'Brevo (Sendinblue)', patterns: ['sendinblue', 'brevo'] },
      { name: 'MailerLite', patterns: ['mailerlite'] }
    ],
    payments: [
      { name: 'Stripe', patterns: ['stripe', 'js.stripe'] },
      { name: 'PayPal', patterns: ['paypal'] },
      { name: 'Square', patterns: ['square'] },
      { name: 'Braintree', patterns: ['braintree'] },
      { name: 'Shopify Payments', patterns: ['shopify payments'] },
      { name: 'Chargebee', patterns: ['chargebee'] },
      { name: 'Recurly', patterns: ['recurly'] },
      { name: 'Paddle', patterns: ['paddle'] },
      { name: 'Lemon Squeezy', patterns: ['lemonsqueezy'] },
      { name: 'Gumroad', patterns: ['gumroad'] }
    ],
    ads: [
      { name: 'Google Ads', patterns: ['google ads', 'google_ad', 'adsbygoogle', 'googleadservices'] },
      { name: 'Meta Ads', patterns: ['facebook ads', 'fbq('] },
      { name: 'LinkedIn Ads', patterns: ['linkedin ads'] },
      { name: 'Twitter/X Ads', patterns: ['twitter ads', 'x ads'] },
      { name: 'TikTok Ads', patterns: ['tiktok pixel', 'ttq('] },
      { name: 'Reddit Ads', patterns: ['reddit ads'] },
      { name: 'Pinterest Ads', patterns: ['pinterest tag'] },
      { name: 'Bing Ads', patterns: ['bing ads'] },
      { name: 'AdRoll', patterns: ['adroll'] },
      { name: 'Criteo', patterns: ['criteo'] },
      { name: 'Taboola', patterns: ['taboola'] },
      { name: 'Outbrain', patterns: ['outbrain'] }
    ],
    database: [
      { name: 'PostgreSQL', patterns: ['postgresql', 'postgres', 'pgsql'] },
      { name: 'MySQL', patterns: ['mysql', 'mariadb'] },
      { name: 'MongoDB', patterns: ['mongodb', 'mongoose'] },
      { name: 'Redis', patterns: ['redis'] },
      { name: 'Elasticsearch', patterns: ['elasticsearch', 'elastic.co'] },
      { name: 'Firebase Firestore', patterns: ['firestore'] },
      { name: 'Supabase DB', patterns: ['supabase'] },
      { name: 'PlanetScale', patterns: ['planetscale'] },
      { name: 'Neon', patterns: ['neon.tech'] },
      { name: 'DynamoDB', patterns: ['dynamodb', 'dynamo db'] },
      { name: 'SQLite', patterns: ['sqlite'] },
      { name: 'Cassandra', patterns: ['cassandra'] },
      { name: 'BigQuery', patterns: ['bigquery'] }
    ],
    security: [
      { name: 'Cloudflare WAF', patterns: ['cloudflare'] },
      { name: 'reCAPTCHA', patterns: ['recaptcha', 'g-recaptcha'] },
      { name: 'hCaptcha', patterns: ['hcaptcha'] },
      { name: 'Sucuri', patterns: ['sucuri'] },
      { name: 'Akamai WAF', patterns: ['akamai'] },
      { name: 'Imperva', patterns: ['imperva', 'incapsula'] },
      { name: 'Let\'s Encrypt', patterns: ['letsencrypt', 'lets encrypt'] },
      { name: 'Auth0 Security', patterns: ['auth0'] },
      { name: 'Clerk Auth', patterns: ['clerk'] },
      { name: 'Okta', patterns: ['okta'] }
    ],
    marketingAutomation: [
      { name: 'HubSpot Marketing', patterns: ['hubspot'] },
      { name: 'Marketo', patterns: ['marketo'] },
      { name: 'Mailchimp', patterns: ['mailchimp'] },
      { name: 'ActiveCampaign', patterns: ['activecampaign'] },
      { name: 'Klaviyo', patterns: ['klaviyo'] },
      { name: 'Braze', patterns: ['braze'] },
      { name: 'Iterable', patterns: ['iterable'] },
      { name: 'Customer.io', patterns: ['customer.io'] }
    ],
    infrastructure: [
      { name: 'Sentry', patterns: ['sentry'] },
      { name: 'Datadog', patterns: ['datadog'] },
      { name: 'New Relic', patterns: ['new relic'] },
      { name: 'LogRocket', patterns: ['logrocket'] },
      { name: 'Rollbar', patterns: ['rollbar'] },
      { name: 'BugSnag', patterns: ['bugsnag'] },
      { name: 'Docker', patterns: ['docker'] },
      { name: 'Kubernetes', patterns: ['kubernetes', 'k8s'] },
      { name: 'Terraform', patterns: ['terraform'] },
      { name: 'GitHub Actions', patterns: ['github actions'] },
      { name: 'GitLab CI', patterns: ['gitlab-ci', 'gitlab ci'] },
      { name: 'Jenkins', patterns: ['jenkins'] },
      { name: 'PagerDuty', patterns: ['pagerduty'] },
      { name: 'StatusPage', patterns: ['statuspage'] }
    ]
  };

  const detected = new Set();
  const now = new Date().toISOString();

  for (const [category, items] of Object.entries(detectors)) {
    for (const tech of items) {
      if (detected.has(tech.name)) continue;
      const patternsFound = tech.patterns.filter(pattern => lower.includes(pattern));
      const found = patternsFound.length > 0;
      if (found) {
        const confidence = Math.min(95, 70 + patternsFound.length * 10);
        technologies.push({
          name: tech.name,
          category,
          confidence,
          evidence: `Detected from page source: matched pattern(s) "${patternsFound.join(', ')}"`,
          collectedAt: now
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

  const now = new Date().toISOString();

  const evidenceSources = (evidence.sources || []).map(s => ({
    type: s.type || 'unknown',
    source: s.source || 'unknown',
    field: s.field || null,
    collectedAt: s.collectedAt || now,
    url: s.url || null
  }));

  return {
    evidence: {
      sources: evidenceSources,
      warnings: evidence.warnings || [],
      count: evidenceSources.length
    },
    companyIntelligence: {
      name: company.name || 'Unknown',
      domain: company.domain || '',
      industry: company.industry || 'Unknown',
      category: company.category || 'Unknown',
      subCategory: company.subCategory || 'Unknown',
      businessModel: company.businessModel || 'Unknown',
      revenueModel: company.businessModel || 'Unknown',
      growthStage: company.fundingStage || 'Unknown',
      productMaturity: company.launchYear || 'Unknown',
      targetMarket: company.targetMarket || 'Unknown',
      launchYear: company.launchYear || 'Unknown',
      headquarters: company.headquarters || 'Unknown',
      employeeEstimate: company.employeeEstimate || 'Unknown',
      fundingStage: company.fundingStage || 'Unknown',
      fundingAmount: company.fundingAmount || 'Unknown',
      b2bOrB2C: company.b2bOrB2C || 'Unknown',
      socialChannels: company.socialChannels || [],
      supportedCountries: company.supportedCountries || ['Unknown'],
      languages: company.languages || ['Unknown'],
      evidence: {
        source: evidence.sources?.length > 0 ? evidence.sources.map(s => s.source).join(', ') : 'Unknown',
        confidence: evidence.sources?.length > 0 ? 85 : 0,
        collectedAt: now
      }
    },
    technologyIntelligence: {
      technologies: technology || [],
      frontend: technology.filter(t => t.category === 'frontend').map(t => ({ name: t.name, confidence: t.confidence, evidence: t.evidence })),
      backend: technology.filter(t => t.category === 'backend').map(t => ({ name: t.name, confidence: t.confidence, evidence: t.evidence })),
      cms: technology.filter(t => t.category === 'cms').map(t => ({ name: t.name, confidence: t.confidence, evidence: t.evidence })),
      hosting: technology.filter(t => t.category === 'hosting').map(t => ({ name: t.name, confidence: t.confidence, evidence: t.evidence })),
      cdn: technology.filter(t => t.category === 'cdn').map(t => ({ name: t.name, confidence: t.confidence, evidence: t.evidence })),
      analytics: technology.filter(t => t.category === 'analytics').map(t => ({ name: t.name, confidence: t.confidence, evidence: t.evidence })),
      crm: technology.filter(t => t.category === 'crm').map(t => ({ name: t.name, confidence: t.confidence, evidence: t.evidence })),
      email: technology.filter(t => t.category === 'email').map(t => ({ name: t.name, confidence: t.confidence, evidence: t.evidence })),
      payments: technology.filter(t => t.category === 'payments').map(t => ({ name: t.name, confidence: t.confidence, evidence: t.evidence })),
      ads: technology.filter(t => t.category === 'ads').map(t => ({ name: t.name, confidence: t.confidence, evidence: t.evidence })),
      security: technology.filter(t => t.category === 'security').map(t => ({ name: t.name, confidence: t.confidence, evidence: t.evidence })),
      marketingAutomation: technology.filter(t => t.category === 'marketingAutomation').map(t => ({ name: t.name, confidence: t.confidence, evidence: t.evidence })),
      database: technology.filter(t => t.category === 'database').map(t => ({ name: t.name, confidence: t.confidence, evidence: t.evidence })),
      infrastructure: technology.filter(t => t.category === 'infrastructure').map(t => ({ name: t.name, confidence: t.confidence, evidence: t.evidence })),
      evidence: {
        source: technology.length > 0 ? 'Technology fingerprinting from page source' : 'Unknown',
        confidence: technology.length > 0 ? 90 : 0,
        collectedAt: now
      }
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
      source: pricing.source || 'Unknown',
      evidence: {
        source: pricing.tiers?.length > 0 ? 'Website pricing page analysis' : 'Not found on website',
        confidence: pricing.tiers?.length > 0 ? 85 : 0,
        collectedAt: now
      }
    },
    competitorIntelligence: {
      direct: (competitors.direct || []).map(c => ({
        name: c.name,
        domain: c.domain,
        url: c.url,
        type: c.type || 'direct',
        similarityScore: c.similarityScore || null,
        featureOverlap: c.featureOverlap || null,
        pricingOverlap: c.pricingOverlap || null,
        trafficEstimate: c.trafficEstimate || null,
        evidence: c.evidence || 'Identified via SERP analysis',
        source: c.source || 'Unknown',
        snippet: c.snippet || '',
        confidence: c.confidence || 60,
        enterpriseFields: c.enterpriseFields || null
      })),
      indirect: (competitors.indirect || []).map(c => ({
        name: c.name,
        domain: c.domain,
        url: c.url,
        similarityScore: c.similarityScore || null,
        evidence: c.evidence || 'Identified via SERP analysis',
        source: c.source || 'Unknown',
        enterpriseFields: c.enterpriseFields || null
      })),
      emerging: (competitors.emerging || []).map(c => ({
        name: c.name,
        domain: c.domain,
        evidence: c.evidence || 'Identified via market analysis',
        source: c.source || 'Unknown'
      })),
      all: (competitors.all || []).map(c => ({
        name: c.name,
        domain: c.domain,
        url: c.url,
        type: c.type,
        similarityScore: c.similarityScore || null,
        evidence: c.evidence || '',
        source: c.source || 'Unknown',
        enterpriseFields: c.enterpriseFields || null
      })),
      sources: competitors.sources || [],
      warnings: competitors.warnings || [],
      evidence: {
        source: competitors.sources?.length > 0 ? competitors.sources.map(s => s.source).join(', ') : 'Unknown',
        confidence: competitors.all?.length > 0 ? 80 : 0,
        collectedAt: now
      }
    },
    marketIntelligence: {
      tam: market.tam || 'Unknown',
      sam: market.sam || 'Unknown',
      som: market.som || 'Unknown',
      industrySize: market.industrySize || 'Unknown',
      growthRate: market.growthRate || 'Unknown',
      cagr: market.cagr || 'Unknown',
      trends: market.trends || [],
      regulations: market.regulations || [],
      seasonality: market.seasonality || [],
      investmentTrends: market.investmentTrends || [],
      opportunities: market.opportunities || [],
      risks: market.risks || [],
      sources: market.sources || [],
      evidence: {
        source: market.sources?.length > 0 ? 'DataForSEO & Tavily market analysis' : 'Unknown',
        confidence: market.tam !== 'Unknown' ? 75 : 0,
        collectedAt: now
      }
    },
    audienceIntelligence: {
      icp: audience.icp || [],
      personas: audience.personas || [],
      decisionMakers: audience.decisionMakers || [],
      buyingCommittee: audience.buyingCommittee || [],
      objections: audience.objections || [],
      budget: audience.budget || null,
      intent: audience.intent || [],
      companySize: audience.companySize || null,
      techMaturity: audience.techMaturity || null,
      painPoints: audience.painPoints || [],
      buyingTriggers: audience.buyingTriggers || [],
      lifetimeValue: audience.lifetimeValue || null,
      segments: audience.segments || [],
      channels: audience.channels || [],
      sources: audience.sources || [],
      evidence: {
        source: audience.personas?.length > 0 ? 'Industry evidence patterns & website analysis' : 'Unknown',
        confidence: audience.personas?.length > 0 ? 80 : 0,
        collectedAt: now
      }
    },
    evidence: {
      sources: evidence.sources || [],
      warnings: evidence.warnings || []
    }
  };
}
