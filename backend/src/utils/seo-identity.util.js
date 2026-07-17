/**
 * Derive correct website identity without blindly trusting previous project names.
 * Fully safe - handles null/undefined inputs gracefully.
 */
import { sanitizeText, extractText } from './text.util.js';

// UI/navigation text patterns that must never be used as product identity
const UI_IDENTITY_PATTERNS = [
  'chat history', 'new chat', 'new & featured', 'home', 'dashboard',
  'pricing', 'products', 'explore', 'settings', 'new analysis',
  'new growth analysis', 'unknown product', 'none', 'untitled',
  'sign in', 'sign up', 'log in', 'login', 'register', 'create account',
  'welcome', 'get started', 'learn more', 'read more', 'contact us',
  'about us', 'our story', 'search', 'menu', 'navigation',
  'video conferencing for business', 'start free trial', 'book a demo',
];

// Tagline/description patterns that are too long or descriptive to be company names
const TAGLINE_PATTERNS = [
  /^(social listening|social media|digital marketing|content marketing|video marketing|influencer marketing)/i,
  /for (tiktok|instagram|reels|shorts|youtube|facebook|linkedin|twitter)/i,
  /^(analytics|intelligence|monitoring|listening|tracking)/i,
  /^(ai-|ai |powered by|built for)/i,
  /^[a-z][a-z\s]{4,}\s+(for|of|that|which)/i,
];

// Patterns that indicate a product name is actually a tagline or description
function isTagline(value) {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length > 40) return true;
  for (const pattern of TAGLINE_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }
  return false;
}

export function isValidProductIdentity(value) {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return false;
  if (trimmed.length <= 2) return false;
  if (trimmed.length > 40) return false;
  if (UI_IDENTITY_PATTERNS.includes(trimmed)) return false;
  for (const pattern of UI_IDENTITY_PATTERNS) {
    if (trimmed === pattern) return false;
  }
  if (isTagline(trimmed)) return false;
  return true;
}

function extractJsonLdName(scrapedData) {
  if (!scrapedData) return null;
  const jsonld = scrapedData.jsonld || scrapedData.structuredData || scrapedData.json_ld || [];
  const items = Array.isArray(jsonld) ? jsonld : [jsonld];
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const type = item['@type'] || '';
    if (type === 'Product' || type === 'Organization' || type === 'SoftwareApplication' || type === 'WebSite') {
      const name = item.name || item.alternateName || null;
      if (name && typeof name === 'string' && isValidProductIdentity(name)) return name;
    }
  }
  return null;
}

// Well-known domain overrides: maps domains to their canonical brand/product name
const KNOWN_DOMAINS = {
  'chatgpt.com': { productName: 'ChatGPT', companyName: 'OpenAI', brandName: 'ChatGPT' },
  'openai.com': { productName: 'OpenAI Platform', companyName: 'OpenAI', brandName: 'OpenAI' },
  'perplexity.ai': { productName: 'Perplexity', companyName: 'Perplexity AI', brandName: 'Perplexity' },
  'claude.ai': { productName: 'Claude', companyName: 'Anthropic', brandName: 'Claude' },
  'anthropic.com': { productName: 'Anthropic', companyName: 'Anthropic', brandName: 'Anthropic' },
  'gemini.google.com': { productName: 'Google Gemini', companyName: 'Google', brandName: 'Google Gemini' },
  'meet.google.com': { productName: 'Google Meet', companyName: 'Google', brandName: 'Google Meet' },
  'calendar.google.com': { productName: 'Google Calendar', companyName: 'Google', brandName: 'Google Calendar' },
  'docs.google.com': { productName: 'Google Docs', companyName: 'Google', brandName: 'Google Docs' },
  'sheets.google.com': { productName: 'Google Sheets', companyName: 'Google', brandName: 'Google Sheets' },
  'slides.google.com': { productName: 'Google Slides', companyName: 'Google', brandName: 'Google Slides' },
  'drive.google.com': { productName: 'Google Drive', companyName: 'Google', brandName: 'Google Drive' },
  'mail.google.com': { productName: 'Gmail', companyName: 'Google', brandName: 'Gmail' },
  'gmail.com': { productName: 'Gmail', companyName: 'Google', brandName: 'Gmail' },
  'workspace.google.com': { productName: 'Google Workspace', companyName: 'Google', brandName: 'Google Workspace' },
  'admin.google.com': { productName: 'Google Admin Console', companyName: 'Google', brandName: 'Google Admin Console' },
  'analytics.google.com': { productName: 'Google Analytics', companyName: 'Google', brandName: 'Google Analytics' },
  'search.google.com': { productName: 'Google Search Console', companyName: 'Google', brandName: 'Google Search Console' },
  'ads.google.com': { productName: 'Google Ads', companyName: 'Google', brandName: 'Google Ads' },
  'business.google.com': { productName: 'Google Business Profile', companyName: 'Google', brandName: 'Google Business Profile' },
  'notion.so': { productName: 'Notion', companyName: 'Notion Labs', brandName: 'Notion' },
  'notion.com': { productName: 'Notion', companyName: 'Notion Labs', brandName: 'Notion' },
  'figma.com': { productName: 'Figma', companyName: 'Figma', brandName: 'Figma' },
  'slack.com': { productName: 'Slack', companyName: 'Salesforce', brandName: 'Slack' },
  'zoom.us': { productName: 'Zoom', companyName: 'Zoom Video Communications', brandName: 'Zoom' },
  'zoom.com': { productName: 'Zoom', companyName: 'Zoom Video Communications', brandName: 'Zoom' },
  'microsoft.com': { productName: 'Microsoft', companyName: 'Microsoft', brandName: 'Microsoft' },
  'office.com': { productName: 'Microsoft 365', companyName: 'Microsoft', brandName: 'Microsoft 365' },
  'teams.microsoft.com': { productName: 'Microsoft Teams', companyName: 'Microsoft', brandName: 'Microsoft Teams' },
  'linkedin.com': { productName: 'LinkedIn', companyName: 'Microsoft', brandName: 'LinkedIn' },
  'twitter.com': { productName: 'X (Twitter)', companyName: 'X Corp', brandName: 'X' },
  'x.com': { productName: 'X', companyName: 'X Corp', brandName: 'X' },
  'instagram.com': { productName: 'Instagram', companyName: 'Meta', brandName: 'Instagram' },
  'facebook.com': { productName: 'Facebook', companyName: 'Meta', brandName: 'Facebook' },
  'whatsapp.com': { productName: 'WhatsApp', companyName: 'Meta', brandName: 'WhatsApp' },
  'atlassian.com': { productName: 'Atlassian', companyName: 'Atlassian', brandName: 'Atlassian' },
  'jira.com': { productName: 'Jira', companyName: 'Atlassian', brandName: 'Jira' },
  'confluence.com': { productName: 'Confluence', companyName: 'Atlassian', brandName: 'Confluence' },
  'trello.com': { productName: 'Trello', companyName: 'Atlassian', brandName: 'Trello' },
  'asana.com': { productName: 'Asana', companyName: 'Asana', brandName: 'Asana' },
  'clickup.com': { productName: 'ClickUp', companyName: 'ClickUp', brandName: 'ClickUp' },
  'monday.com': { productName: 'Monday.com', companyName: 'Monday.com', brandName: 'Monday.com' },
  'airtable.com': { productName: 'Airtable', companyName: 'Airtable', brandName: 'Airtable' },
  'shopify.com': { productName: 'Shopify', companyName: 'Shopify', brandName: 'Shopify' },
  'wordpress.com': { productName: 'WordPress.com', companyName: 'Automattic', brandName: 'WordPress' },
  'woocommerce.com': { productName: 'WooCommerce', companyName: 'Automattic', brandName: 'WooCommerce' },
  'sendgrid.com': { productName: 'SendGrid', companyName: 'Twilio', brandName: 'SendGrid' },
  'twilio.com': { productName: 'Twilio', companyName: 'Twilio', brandName: 'Twilio' },
  'stripe.com': { productName: 'Stripe', companyName: 'Stripe', brandName: 'Stripe' },
  'square.com': { productName: 'Square', companyName: 'Block', brandName: 'Square' },
  'godaddy.com': { productName: 'GoDaddy', companyName: 'GoDaddy', brandName: 'GoDaddy' },
  'wix.com': { productName: 'Wix', companyName: 'Wix', brandName: 'Wix' },
  'squarespace.com': { productName: 'Squarespace', companyName: 'Squarespace', brandName: 'Squarespace' },
  'salesforce.com': { productName: 'Salesforce', companyName: 'Salesforce', brandName: 'Salesforce' },
  'hubspot.com': { productName: 'HubSpot', companyName: 'HubSpot', brandName: 'HubSpot' },
  'zendesk.com': { productName: 'Zendesk', companyName: 'Zendesk', brandName: 'Zendesk' },
  'intercom.com': { productName: 'Intercom', companyName: 'Intercom', brandName: 'Intercom' },
  'calendly.com': { productName: 'Calendly', companyName: 'Calendly', brandName: 'Calendly' },
  'loom.com': { productName: 'Loom', companyName: 'Atlassian', brandName: 'Loom' },
  'miro.com': { productName: 'Miro', companyName: 'Miro', brandName: 'Miro' },
  'canva.com': { productName: 'Canva', companyName: 'Canva', brandName: 'Canva' },
  'adobe.com': { productName: 'Adobe', companyName: 'Adobe', brandName: 'Adobe' },
  'docusign.com': { productName: 'DocuSign', companyName: 'DocuSign', brandName: 'DocuSign' },
  'hellosign.com': { productName: 'Dropbox Sign', companyName: 'Dropbox', brandName: 'Dropbox Sign' },
  'dropbox.com': { productName: 'Dropbox', companyName: 'Dropbox', brandName: 'Dropbox' },
  'box.com': { productName: 'Box', companyName: 'Box', brandName: 'Box' },
  'evernote.com': { productName: 'Evernote', companyName: 'Evernote', brandName: 'Evernote' },
  'todoist.com': { productName: 'Todoist', companyName: 'Doist', brandName: 'Todoist' },
  'github.com': { productName: 'GitHub', companyName: 'Microsoft', brandName: 'GitHub' },
  'gitlab.com': { productName: 'GitLab', companyName: 'GitLab', brandName: 'GitLab' },
  'bitbucket.com': { productName: 'Bitbucket', companyName: 'Atlassian', brandName: 'Bitbucket' },
  'vercel.com': { productName: 'Vercel', companyName: 'Vercel', brandName: 'Vercel' },
  'netlify.com': { productName: 'Netlify', companyName: 'Netlify', brandName: 'Netlify' },
  'heroku.com': { productName: 'Heroku', companyName: 'Salesforce', brandName: 'Heroku' },
  'digitalocean.com': { productName: 'DigitalOcean', companyName: 'DigitalOcean', brandName: 'DigitalOcean' },
  'aws.amazon.com': { productName: 'Amazon Web Services', companyName: 'Amazon', brandName: 'AWS' },
  'cloud.google.com': { productName: 'Google Cloud', companyName: 'Google', brandName: 'Google Cloud' },
  'azure.microsoft.com': { productName: 'Microsoft Azure', companyName: 'Microsoft', brandName: 'Azure' },
  'datadog.com': { productName: 'Datadog', companyName: 'Datadog', brandName: 'Datadog' },
  'newrelic.com': { productName: 'New Relic', companyName: 'New Relic', brandName: 'New Relic' },
  'sentry.io': { productName: 'Sentry', companyName: 'Functional Software', brandName: 'Sentry' },
  'datadoghq.com': { productName: 'Datadog', companyName: 'Datadog', brandName: 'Datadog' },
  'hotjar.com': { productName: 'Hotjar', companyName: 'Hotjar (Contentsquare)', brandName: 'Hotjar' },
  'mixpanel.com': { productName: 'Mixpanel', companyName: 'Mixpanel', brandName: 'Mixpanel' },
  'amplitude.com': { productName: 'Amplitude', companyName: 'Amplitude', brandName: 'Amplitude' },
  'segment.com': { productName: 'Segment', companyName: 'Twilio', brandName: 'Segment' },
  'mailchimp.com': { productName: 'Mailchimp', companyName: 'Intuit', brandName: 'Mailchimp' },
  'sendfox.com': { productName: 'SendFox', companyName: 'SendFox', brandName: 'SendFox' },
  'convertkit.com': { productName: 'ConvertKit', companyName: 'ConvertKit', brandName: 'ConvertKit' },
  'activecampaign.com': { productName: 'ActiveCampaign', companyName: 'ActiveCampaign', brandName: 'ActiveCampaign' },
  'getresponse.com': { productName: 'GetResponse', companyName: 'GetResponse', brandName: 'GetResponse' },
  'constantcontact.com': { productName: 'Constant Contact', companyName: 'Constant Contact', brandName: 'Constant Contact' },
};

export function deriveWebsiteIdentity(params = {}) {
  // Safe extraction with defaults
  const {
    websiteUrl = '',
    scrapedData = {},
    researchData = {},
    chat = {}
  } = params || {};

  // Return safe defaults if no websiteUrl
  if (!websiteUrl || typeof websiteUrl !== 'string') {
    return {
      websiteUrl: '',
      domain: '',
      brandName: 'Unknown',
      companyName: 'Unknown Company',
      productName: 'Unknown Product',
      industry: 'Technology',
      category: 'General',
      targetAudience: 'General',
      websiteTitle: '',
      websiteDescription: '',
      businessModel: 'B2B SaaS',
      businessCategory: 'Technology',
      companySize: 'Unknown',
      source: 'fallback'
    };
  }

  let domain = '';
  try {
    const urlObj = new URL(websiteUrl);
    domain = urlObj.hostname.replace(/^www\./, '');
  } catch (e) {
    domain = websiteUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }

  // Check well-known domain override first — takes priority over scraped data
  const knownOverride = KNOWN_DOMAINS[domain];
  if (knownOverride) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[SEO Identity] Using known domain override for', domain, '→', knownOverride.productName);
    }
    return {
      websiteUrl,
      domain,
      brandName: knownOverride.brandName,
      companyName: knownOverride.companyName,
      productName: knownOverride.productName,
      industry: 'Technology',
      category: 'SaaS',
      targetAudience: 'General',
      websiteTitle: knownOverride.productName,
      websiteDescription: knownOverride.productName + ' — ' + (scrapedData?.meta?.description || scrapedData?.description || ''),
      businessModel: 'B2B SaaS',
      businessCategory: 'Technology',
      companySize: 'Enterprise',
      source: 'known_domain_override'
    };
  }

  // Helper to safely split titles
  const cleanTitle = (raw) => {
    if (!raw) return '';
    let parts = raw.split(/\||-|–/);
    if (parts.length > 1) {
      return parts.reduce((a, b) => a.trim().length <= b.trim().length && a.trim().length > 0 ? a : b).trim();
    }
    return raw.trim();
  };

  const meta = scrapedData?.meta || {};
  const ogSiteName = meta?.ogSiteName || meta?.['og:site_name'];

  // Extract JSON-LD name first — highest authority
  const jsonLdName = extractJsonLdName(scrapedData);

  // Extract title from multiple sources in priority order
  // JSON-LD > og:site_name > og:title > meta title > scraped title > H1 > domain
  const titleSources = [
    jsonLdName,
    ogSiteName,
    meta?.ogTitle,
    meta?.['og:title'],
    meta?.title,
    scrapedData?.title,
  ];
  // Only include H1 if it passes the UI identity filter
  const h1Candidate = scrapedData?.h1?.[0];
  const h1Valid = h1Candidate && isValidProductIdentity(h1Candidate);
  const titlePart = cleanTitle(titleSources.find(t => t && isValidProductIdentity(t)) || (h1Valid ? h1Candidate : ''));
  
  // Extract description from multiple sources in priority order
  const descriptionSources = [
    meta?.description,
    meta?.ogDescription,
    meta?.['og:description'],
    scrapedData?.metaDescription,
    scrapedData?.description
  ];
  const descriptionPart = descriptionSources.find(d => d) || '';

  // Safely extract h1 from multiple sources
  const h1 =
    scrapedData?.h1?.[0] ||
    scrapedData?.metadata?.h1?.[0] ||
    scrapedData?.headings?.h1?.[0] ||
    scrapedData?.headings?.h1 ||
    (scrapedData?.content?.match?.(/<h1[^>]*>(.*?)<\/h1>/i)?.[1] || '');

  // Format domain to proper case - NEVER append TLD words
  const formatDomain = (d) => {
    if (!d) return '';
    const parts = d.split('.');
    if (parts.length > 1) {
      const name = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      
      // Never append TLD as separate word - always return just the name capitalized
      // This prevents "Notion com", "Figma com", "Orkyn ai" etc.
      return name;
    }
    return d.charAt(0).toUpperCase() + d.slice(1);
  };

  const domainDerivedName = formatDomain(domain);

  // Pick the best company/product/brand name - prioritize scraped title/meta over domain
  // Filter through isValidProductIdentity to reject UI/navigation text
  const nameCandidates = [jsonLdName, ogSiteName, titlePart, domainDerivedName, domain].filter(Boolean);
  const brandName = nameCandidates.find(c => isValidProductIdentity(c)) || 'Unknown';
  let companyName = brandName;
  let productName = brandName;

  // Check if we should inherit from chat (only if domain matches exactly)
  let chatDomain = '';
  if (chat?.websiteUrl) {
    try {
      chatDomain = new URL(chat.websiteUrl).hostname.replace(/^www\./, '');
    } catch (e) {
      chatDomain = chat.websiteUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    }
  }

  if (chatDomain === domain && chat?.productName && isValidProductIdentity(chat.productName) && !isTagline(chat.productName)) {
    productName = chat.productName;
    companyName = chat.companyName || chat.productName;
    brandName = chat.productName;
  }

  // Ensure we don't output generic fallback names
  if (!productName || productName === 'Unknown' || productName === 'Unknown Product') {
    productName = brandName;
  }

  // Infer business properties from scraped text
  let businessModel = 'B2B SaaS';
  let companySize = 'Mid-Market';
  let businessCategory = 'Technology';
  let category = 'General';
  let targetAudience = 'General';
  
  if (scrapedData?.text) {
    const text = scrapedData.text.toLowerCase();
    if (text.includes('add to cart') || text.includes('checkout') || text.includes('shipping')) {
      businessModel = 'E-commerce';
      businessCategory = 'Retail & E-commerce';
      category = 'E-commerce';
    } else if (text.includes('pricing') || text.includes('book a demo') || text.includes('start free trial')) {
      businessModel = 'B2B SaaS';
      category = 'SaaS';
    } else if (text.includes('consulting') || text.includes('our services')) {
      businessModel = 'Agency / Services';
      category = 'Services';
    }

    if (text.includes('enterprise') && (text.includes('fortune 500') || text.includes('global scale'))) {
      companySize = 'Enterprise';
      targetAudience = 'Enterprise';
    } else if (text.includes('startup') || text.includes('early stage')) {
      companySize = 'Startup';
      targetAudience = 'Startups';
    } else if (text.includes('small business') || text.includes('smb')) {
      targetAudience = 'SMB';
    }
  }

  return {
    websiteUrl,
    domain,
    brandName: sanitizeText(brandName),
    companyName: sanitizeText(companyName),
    productName: sanitizeText(productName),
    industry: chatDomain === domain && chat?.industry ? chat.industry : 'Technology',
    category,
    targetAudience,
    websiteTitle: sanitizeText(titlePart),
    websiteDescription: sanitizeText(descriptionPart),
    businessModel,
    businessCategory,
    companySize,
    source: (chatDomain === domain && chat?.productName) ? 'chat_match' : 'scraped_derived'
  };
}
