/**
 * Derive correct website identity without blindly trusting previous project names.
 * Fully safe - handles null/undefined inputs gracefully.
 */
import { sanitizeText, extractText } from './text.util.js';

const KNOWN_DOMAIN_INDUSTRIES = {
  'instagram.com': { industry: 'Social Media', category: 'Social Networking Platform', businessModel: 'Advertising-supported consumer platform', businessCategory: 'Social Media' },
  'facebook.com': { industry: 'Social Media', category: 'Social Networking Platform', businessModel: 'Advertising-supported consumer platform', businessCategory: 'Social Media' },
  'youtube.com': { industry: 'Video Streaming', category: 'Video Sharing Platform', businessModel: 'Advertising-supported consumer platform', businessCategory: 'Digital Media' },
  'tiktok.com': { industry: 'Social Media', category: 'Short-form Video Platform', businessModel: 'Advertising-supported consumer platform', businessCategory: 'Social Media' },
  'twitter.com': { industry: 'Social Media', category: 'Microblogging Platform', businessModel: 'Advertising-supported platform', businessCategory: 'Social Media' },
  'linkedin.com': { industry: 'Professional Networking', category: 'Professional Social Network', businessModel: 'Subscription and advertising platform', businessCategory: 'Professional Services' },
  'pinterest.com': { industry: 'Social Media', category: 'Visual Discovery Platform', businessModel: 'Advertising-supported platform', businessCategory: 'Social Media' },
  'snapchat.com': { industry: 'Social Media', category: 'Multimedia Messaging Platform', businessModel: 'Advertising-supported consumer platform', businessCategory: 'Social Media' },
  'reddit.com': { industry: 'Social Media', category: 'Social News Platform', businessModel: 'Advertising-supported platform', businessCategory: 'Social Media' },
  'whatsapp.com': { industry: 'Communication', category: 'Messaging Platform', businessModel: 'Free communication platform', businessCategory: 'Communication' },
  'telegram.org': { industry: 'Communication', category: 'Messaging Platform', businessModel: 'Free communication platform', businessCategory: 'Communication' },
  'discord.com': { industry: 'Communication', category: 'Community Messaging Platform', businessModel: 'Freemium subscription platform', businessCategory: 'Communication' },
  'slack.com': { industry: 'Business Communication', category: 'Team Collaboration Platform', businessModel: 'B2B SaaS', businessCategory: 'Enterprise Software' },
  'zoom.us': { industry: 'Video Conferencing', category: 'Video Communication Platform', businessModel: 'B2B SaaS', businessCategory: 'Enterprise Software' },
  'google.com': { industry: 'Internet Services', category: 'Search and Cloud Platform', businessModel: 'Advertising and cloud services', businessCategory: 'Technology' },
  'netflix.com': { industry: 'Entertainment', category: 'Streaming Platform', businessModel: 'Subscription-based streaming', businessCategory: 'Digital Media' },
  'spotify.com': { industry: 'Music Streaming', category: 'Audio Streaming Platform', businessModel: 'Freemium subscription platform', businessCategory: 'Digital Media' },
  'amazon.com': { industry: 'E-commerce', category: 'Online Retail and Cloud Platform', businessModel: 'E-commerce and cloud services', businessCategory: 'Retail & E-commerce' },
  'apple.com': { industry: 'Consumer Technology', category: 'Consumer Electronics and Services', businessModel: 'Hardware and services', businessCategory: 'Technology' },
  'microsoft.com': { industry: 'Enterprise Software', category: 'Software and Cloud Platform', businessModel: 'B2B and B2C SaaS', businessCategory: 'Enterprise Software' },
  'notion.com': { industry: 'Productivity Software', category: 'All-in-one Workspace', businessModel: 'B2B SaaS', businessCategory: 'Enterprise Software' },
  'notion.so': { industry: 'Productivity Software', category: 'All-in-one Workspace', businessModel: 'B2B SaaS', businessCategory: 'Enterprise Software' },
  'figma.com': { industry: 'Design Software', category: 'Collaborative Design Platform', businessModel: 'B2B SaaS', businessCategory: 'Enterprise Software' },
  'canva.com': { industry: 'Design Software', category: 'Graphic Design Platform', businessModel: 'Freemium SaaS', businessCategory: 'Enterprise Software' },
  'miro.com': { industry: 'Productivity Software', category: 'Collaborative Whiteboard Platform', businessModel: 'B2B SaaS', businessCategory: 'Enterprise Software' },
  'asana.com': { industry: 'Productivity Software', category: 'Project Management Platform', businessModel: 'B2B SaaS', businessCategory: 'Enterprise Software' },
  'trello.com': { industry: 'Productivity Software', category: 'Project Management Platform', businessModel: 'B2B SaaS', businessCategory: 'Enterprise Software' },
  'notion.com': { industry: 'Productivity Software', category: 'All-in-one Workspace', businessModel: 'B2B SaaS', businessCategory: 'Enterprise Software' },
  'hubspot.com': { industry: 'Marketing Software', category: 'CRM and Marketing Platform', businessModel: 'B2B SaaS', businessCategory: 'Enterprise Software' },
  'salesforce.com': { industry: 'Enterprise Software', category: 'CRM Platform', businessModel: 'B2B SaaS', businessCategory: 'Enterprise Software' },
  'shopify.com': { industry: 'E-commerce', category: 'E-commerce Platform', businessModel: 'B2B SaaS', businessCategory: 'Retail & E-commerce' },
  'stripe.com': { industry: 'Fintech', category: 'Payment Processing Platform', businessModel: 'B2B SaaS', businessCategory: 'Financial Services' },
  'airbnb.com': { industry: 'Travel', category: 'Hospitality Marketplace', businessModel: 'Peer-to-peer marketplace', businessCategory: 'Travel & Hospitality' },
  'uber.com': { industry: 'Transportation', category: 'Ride-hailing Platform', businessModel: 'Peer-to-peer marketplace', businessCategory: 'Transportation' },
  'squareup.com': { industry: 'Fintech', category: 'Payment Processing Platform', businessModel: 'B2B SaaS', businessCategory: 'Financial Services' },
  'godaddy.com': { industry: 'Web Services', category: 'Domain and Hosting Platform', businessModel: 'B2B SaaS', businessCategory: 'Technology' },
  'wix.com': { industry: 'Web Services', category: 'Website Building Platform', businessModel: 'B2B SaaS', businessCategory: 'Technology' },
  'wordpress.com': { industry: 'Web Services', category: 'Website Building Platform', businessModel: 'B2B SaaS', businessCategory: 'Technology' },
  'wordpress.org': { industry: 'Web Services', category: 'Open-source CMS', businessModel: 'Open-source software', businessCategory: 'Technology' },
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
      brandName: null,
      companyName: null,
      productName: null,
      industry: null,
      category: null,
      targetAudience: null,
      websiteTitle: '',
      websiteDescription: '',
      businessModel: null,
      businessCategory: null,
      companySize: null,
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
  
  // Extract title from multiple sources in priority order
  const titleSources = [
    scrapedData?.title,
    meta?.title,
    meta?.ogTitle,
    meta?.['og:title'],
    scrapedData?.h1?.[0],
    ogSiteName
  ];
  const titlePart = cleanTitle(titleSources.find(t => t) || '');
  
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
  let brandName = ogSiteName || titlePart || h1 || domainDerivedName || domain;
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

  if (chatDomain === domain && chat?.productName) {
    productName = chat.productName;
    companyName = chat.companyName || chat.productName;
    brandName = chat.productName;
  }

  // Ensure we don't output generic fallback names — use brandName instead
  if (!productName) {
    productName = brandName;
  }

  // Check known domains for precise industry/category classification
  const knownDomain = KNOWN_DOMAIN_INDUSTRIES[domain.toLowerCase()];
  let businessModel = null;
  let companySize = null;
  let businessCategory = null;
  let category = null;
  let targetAudience = null;

  if (knownDomain) {
    businessModel = knownDomain.businessModel;
    businessCategory = knownDomain.businessCategory;
    category = knownDomain.category;
    // Override industry with known data
    // (industry field is set in the return block below)
  }
  
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

  const resolvedIndustry = knownDomain?.industry || (chatDomain === domain && chat?.industry ? chat.industry : null);

  return {
    websiteUrl,
    domain,
    brandName: sanitizeText(brandName),
    companyName: sanitizeText(companyName),
    productName: sanitizeText(productName),
    industry: resolvedIndustry,
    category,
    targetAudience,
    websiteTitle: sanitizeText(titlePart),
    websiteDescription: sanitizeText(descriptionPart),
    businessModel,
    businessCategory,
    companySize,
    source: knownDomain ? 'known_domain_classification' : ((chatDomain === domain && chat?.productName) ? 'chat_match' : 'scraped_derived')
  };
}
