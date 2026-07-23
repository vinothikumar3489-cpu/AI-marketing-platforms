import { getSerpCompetitors } from "../serpapi.service.js";

const EXCLUDED_DOMAINS = new Set([
  'reddit.com', 'youtube.com', 'wikipedia.org', 'medium.com', 'quora.com',
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'linkedin.com',
  'pinterest.com', 'tiktok.com', 'snapchat.com', 'threads.net',
  'capterra.com', 'g2.com', 'trustpilot.com', 'crunchbase.com',
  'producthunt.com', 'alternativeto.net', 'getapp.com',
  'softwareadvice.com', 'sitejabber.com', 'saasworthy.com',
  'gartner.com', 'forrester.com', 'similarweb.com',
  'semrush.com', 'ahrefs.com', 'moz.com',
  'forbes.com', 'techcrunch.com', 'theverge.com', 'wired.com',
  'businessinsider.com', 'entrepreneur.com', 'inc.com', 'venturebeat.com',
  'techradar.com', 'zdnet.com', 'cnet.com', 'pcmag.com',
  'hubspot.com', 'neilpatel.com', 'backlinko.com', 'wordstream.com',
  'searchengineland.com', 'searchenginejournal.com',
  'github.com', 'stackoverflow.com', 'gitlab.com', 'bitbucket.org',
  'medium.com', 'dev.to', 'hashnode.com',
  'play.google.com', 'apps.apple.com', 'appstore.com',
  'chrome.google.com', 'chromewebstore.google.com',
  'docs.google.com', 'support.google.com', 'developers.google.com'
]);

const ARTICLE_TITLE_PATTERNS = [
  /^what\s+is/i, /^how\s+to/i, /^top\s+\d+/i, /^best\s+/i,
  /^guide\s+to/i, /^ultimate\s+guide/i, /^\d+\s+(best|top|ways|tips|reasons)/i,
  /vs\.?\s+/i, /versus\s+/i, /comparison/i, /review/i
];

const BLOG_INDICATORS = [
  /blog/i, /article/i, /news/i, /press/i, /insights/i, /stories/i,
  /updates/i, /journal/i, /magazine/i, /resources/i
];

const DOCS_INDICATORS = [
  /docs/i, /documentation/i, /help/i, /support/i, /knowledge.?base/i,
  /faq/i, /guide/i, /manual/i, /tutorial/i, /learn/i, /academy/i,
  /developers/i, /api/i, /reference/i, /changelog/i
];

const SAAS_PRODUCT_INDICATORS = [
  /software/i, /platform/i, /saas/i, /app/i, /tool/i, /solution/i,
  /cloud/i, /enterprise/i, /business/i, /dashboard/i, /analytics/i,
  /automation/i, /integration/i, /workflow/i, /collaboration/i,
  /productivity/i, /management/i, /optimization/i, /intelligence/i
];

export function isSaaSProduct(title, snippet, domain) {
  const text = `${title || ''} ${snippet || ''} ${domain || ''}`.toLowerCase();

  if (EXCLUDED_DOMAINS.has(domain)) return false;

  if (isBlogSite(domain, title, text)) return false;
  if (isDocsSite(domain, title, text)) return false;
  if (isArticlePage(title, snippet)) return false;

  const saasScore = SAAS_PRODUCT_INDICATORS.reduce((score, p) =>
    p.test(text) ? score + 1 : score, 0
  );

  return saasScore >= 1;
}

function isBlogSite(domain, title, text) {
  if (BLOG_INDICATORS.some(p => p.test(domain))) return true;
  if (BLOG_INDICATORS.some(p => p.test(title || ''))) return true;
  return false;
}

function isDocsSite(domain, title, text) {
  if (DOCS_INDICATORS.some(p => p.test(domain))) return true;
  if (DOCS_INDICATORS.some(p => p.test(title || ''))) return true;
  return false;
}

function isArticlePage(title, snippet) {
  if (!title) return false;
  if (ARTICLE_TITLE_PATTERNS.some(p => p.test(title))) return true;
  if (snippet && (snippet.includes('list of') || snippet.includes('top ') || snippet.startsWith('best '))) return true;
  return false;
}

function extractDomain(url) {
  if (!url) return '';
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch {
    return url.split('/')[0].replace(/^www\./, '').toLowerCase();
  }
}

export function filterCompetitors(rawCompetitors, targetDomain = '') {
  if (!Array.isArray(rawCompetitors) || rawCompetitors.length === 0) return [];

  const target = extractDomain(targetDomain);
  const seen = new Set();
  const validCompetitors = [];

  for (const comp of rawCompetitors) {
    const domain = comp.domain || extractDomain(comp.url || comp.website || '');
    if (!domain) continue;

    const normalizedDomain = domain.toLowerCase();

    if (normalizedDomain === target || normalizedDomain.includes(target) || target.includes(normalizedDomain)) continue;
    if (EXCLUDED_DOMAINS.has(normalizedDomain)) continue;
    if (seen.has(normalizedDomain)) continue;
    seen.add(normalizedDomain);

    const title = comp.title || comp.name || '';
    const snippet = comp.snippet || comp.description || '';

    if (!isSaaSProduct(title, snippet, normalizedDomain)) continue;

    const companyName = extractCompanyName(title, normalizedDomain);
    validCompetitors.push({
      name: companyName,
      domain: normalizedDomain,
      url: comp.url || comp.website || `https://${normalizedDomain}`,
      title: title,
      snippet: snippet,
      competitorType: 'direct',
      relevanceScore: calculateRelevance(title, snippet),
      source: 'SerpAPI',
      confidence: 80,
      retrievedAt: new Date().toISOString(),
      status: 'measured'
    });
  }

  return validCompetitors.slice(0, 20);
}

function extractCompanyName(title, domain) {
  if (title) {
    let name = title
      .replace(/\s*[-|–]\s*.*/g, '')
      .replace(/\s*:\s*.*/g, '')
      .replace(/\s*\|\s*.*/g, '')
      .replace(/\s*\(.*\)\s*/g, '')
      .trim();
    const words = name.split(/\s+/);
    if (words.length <= 5 && words.length >= 1 && !ARTICLE_TITLE_PATTERNS.some(p => p.test(name))) {
      return name;
    }
  }
  return domain.split('.')[0]
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function calculateRelevance(title, snippet) {
  let score = 50;
  const text = `${title || ''} ${snippet || ''}`.toLowerCase();

  if (text.includes('software') || text.includes('platform') || text.includes('saas')) score += 15;
  if (text.includes('enterprise') || text.includes('business')) score += 10;
  if (text.includes('alternative') || text.includes('competitor') || text.includes('vs')) score += 10;
  if (text.includes('pricing') || text.includes('price') || text.includes('plan')) score += 5;
  if (text.includes('features') || text.includes('integrations')) score += 5;
  if (text.includes('review') || text.includes('comparison')) score += 5;

  return Math.min(95, score);
}

export async function discoverCompetitorsViaSerpAPI(productName, industry, websiteUrl) {
  const queries = [
    `${productName} alternatives`,
    `${productName} competitors`,
    `best ${industry} software`,
    `top ${industry} tools`,
    `${industry} platforms`,
    `${productName} vs`
  ].filter(Boolean);

  const targetDomain = extractDomain(websiteUrl);
  const allResults = [];

  for (const query of queries.slice(0, 4)) {
    try {
      const result = await getSerpCompetitors(productName, industry, websiteUrl);
      if (result?.success && result?.data) {
        allResults.push(...result.data);
      }
    } catch (e) {
      console.warn(`[CompetitorPipeline] Search failed for "${query}":`, e.message);
    }
  }

  const filtered = filterCompetitors(allResults, targetDomain);
  
  // PART 15: Fallback to platform competitors if SerpAPI returns insufficient results
  if (filtered.length < 3) {
    console.warn(`[CompetitorPipeline] Only ${filtered.length} competitors found via SerpAPI, using platform fallback`);
    const platformCompetitors = generatePlatformCompetitors(productName, industry, targetDomain);
    return [...filtered, ...platformCompetitors].slice(0, 20);
  }
  
  return filtered;
}

// PART 15: Platform-level competitor fallback for when SerpAPI fails
export function generatePlatformCompetitors(productName, industry, targetDomain) {
  const industryCompetitors = getIndustryCompetitors(industry);
  
  return industryCompetitors
    .filter(comp => extractDomain(comp.url) !== targetDomain)
    .map(comp => ({
      name: comp.name,
      domain: extractDomain(comp.url),
      url: comp.url,
      title: comp.name,
      snippet: comp.description || `${comp.name} - ${industry} platform`,
      competitorType: 'platform',
      relevanceScore: comp.relevanceScore || 60,
      source: 'platform_fallback',
      confidence: 50,
      retrievedAt: new Date().toISOString(),
      status: 'estimated'
    }));
}

// PART 15: Industry-specific platform competitor database
function getIndustryCompetitors(industry) {
  const industryLower = (industry || '').toLowerCase();
  
  const competitorDatabase = {
    'video conferencing': [
      { name: 'Zoom', url: 'https://zoom.us', description: 'Video conferencing and online meeting platform', relevanceScore: 90 },
      { name: 'Microsoft Teams', url: 'https://teams.microsoft.com', description: 'Team collaboration and video conferencing', relevanceScore: 88 },
      { name: 'Google Meet', url: 'https://meet.google.com', description: 'Google video conferencing solution', relevanceScore: 85 },
      { name: 'Webex', url: 'https://webex.com', description: 'Cisco video conferencing platform', relevanceScore: 75 },
      { name: 'GoToMeeting', url: 'https://gotomeeting.com', description: 'Online meeting and video conferencing', relevanceScore: 70 },
    ],
    'collaboration': [
      { name: 'Slack', url: 'https://slack.com', description: 'Team communication and collaboration', relevanceScore: 90 },
      { name: 'Microsoft Teams', url: 'https://teams.microsoft.com', description: 'Team collaboration platform', relevanceScore: 88 },
      { name: 'Asana', url: 'https://asana.com', description: 'Project management and collaboration', relevanceScore: 80 },
      { name: 'Monday.com', url: 'https://monday.com', description: 'Work management platform', relevanceScore: 78 },
      { name: 'Notion', url: 'https://notion.so', description: 'All-in-one workspace for teams', relevanceScore: 75 },
    ],
    'project management': [
      { name: 'Asana', url: 'https://asana.com', description: 'Project management software', relevanceScore: 90 },
      { name: 'Monday.com', url: 'https://monday.com', description: 'Work management platform', relevanceScore: 88 },
      { name: 'Trello', url: 'https://trello.com', description: 'Visual project management', relevanceScore: 80 },
      { name: 'Jira', url: 'https://atlassian.com/jira', description: 'Issue tracking and project management', relevanceScore: 85 },
      { name: 'Basecamp', url: 'https://basecamp.com', description: 'Project management and team communication', relevanceScore: 70 },
    ],
    'crm': [
      { name: 'Salesforce', url: 'https://salesforce.com', description: 'Customer relationship management platform', relevanceScore: 95 },
      { name: 'HubSpot', url: 'https://hubspot.com', description: 'Marketing, sales, and service platform', relevanceScore: 90 },
      { name: 'Zoho CRM', url: 'https://zoho.com/crm', description: 'Cloud-based CRM software', relevanceScore: 75 },
      { name: 'Pipedrive', url: 'https://pipedrive.com', description: 'Sales-focused CRM', relevanceScore: 78 },
      { name: 'Microsoft Dynamics', url: 'https://dynamics.microsoft.com', description: 'Business applications and CRM', relevanceScore: 85 },
    ],
    'marketing automation': [
      { name: 'HubSpot', url: 'https://hubspot.com', description: 'Marketing automation platform', relevanceScore: 95 },
      { name: 'Marketo', url: 'https://marketo.com', description: 'Marketing automation software', relevanceScore: 85 },
      { name: 'Pardot', url: 'https://pardot.com', description: 'B2B marketing automation', relevanceScore: 80 },
      { name: 'ActiveCampaign', url: 'https://activecampaign.com', description: 'Email marketing and automation', relevanceScore: 75 },
      { name: 'Mailchimp', url: 'https://mailchimp.com', description: 'Email marketing platform', relevanceScore: 70 },
    ],
    'analytics': [
      { name: 'Google Analytics', url: 'https://analytics.google.com', description: 'Web analytics platform', relevanceScore: 95 },
      { name: 'Mixpanel', url: 'https://mixpanel.com', description: 'Product analytics', relevanceScore: 85 },
      { name: 'Amplitude', url: 'https://amplitude.com', description: 'Digital analytics platform', relevanceScore: 82 },
      { name: 'Adobe Analytics', url: 'https://adobe.com/analytics', description: 'Marketing analytics', relevanceScore: 88 },
      { name: 'Hotjar', url: 'https://hotjar.com', description: 'Behavior analytics and user feedback', relevanceScore: 75 },
    ],
    'e-commerce': [
      { name: 'Shopify', url: 'https://shopify.com', description: 'E-commerce platform', relevanceScore: 95 },
      { name: 'WooCommerce', url: 'https://woocommerce.com', description: 'WordPress e-commerce plugin', relevanceScore: 80 },
      { name: 'BigCommerce', url: 'https://bigcommerce.com', description: 'E-commerce platform', relevanceScore: 75 },
      { name: 'Magento', url: 'https://magento.com', description: 'Open-source e-commerce platform', relevanceScore: 78 },
      { name: 'Squarespace', url: 'https://squarespace.com', description: 'Website builder and e-commerce', relevanceScore: 70 },
    ],
    'default': [
      { name: 'Salesforce', url: 'https://salesforce.com', description: 'Business software platform', relevanceScore: 80 },
      { name: 'HubSpot', url: 'https://hubspot.com', description: 'Marketing and sales platform', relevanceScore: 80 },
      { name: 'Microsoft 365', url: 'https://microsoft.com/microsoft-365', description: 'Productivity suite', relevanceScore: 75 },
      { name: 'Google Workspace', url: 'https://workspace.google.com', description: 'Cloud productivity suite', relevanceScore: 75 },
      { name: 'Zoho', url: 'https://zoho.com', description: 'Business software suite', relevanceScore: 70 },
    ]
  };
  
  // Find matching industry or use default
  for (const [key, competitors] of Object.entries(competitorDatabase)) {
    if (industryLower.includes(key) || key.includes(industryLower)) {
      return competitors;
    }
  }
  
  return competitorDatabase.default;
}
