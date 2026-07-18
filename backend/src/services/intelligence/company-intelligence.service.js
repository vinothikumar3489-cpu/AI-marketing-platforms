import { researchCompetitors } from '../tavily.service.js';
import { getSerpCompetitors, getKeywordMetrics } from '../dataforseo.service.js';

export async function collectCompanyIntelligence({ websiteUrl, productName, companyName, industry, scrapedData, scrapedWithExtraction }) {
  const company = {
    name: 'Unknown',
    domain: '',
    industry: 'Unknown',
    category: 'Unknown',
    subCategory: 'Unknown',
    businessModel: 'Unknown',
    b2bOrB2C: 'Unknown',
    targetMarket: 'Unknown',
    launchYear: 'Unknown',
    headquarters: 'Unknown',
    employeeEstimate: 'Unknown',
    fundingStage: 'Unknown',
    fundingAmount: 'Unknown',
    technologyStack: [],
    integrations: [],
    supportedCountries: ['Unknown'],
    languages: ['Unknown'],
    socialChannels: [],
    openSourceOrSaaS: 'Unknown',
    freeTrial: false,
    enterprisePlan: false,
    sources: [],
    warnings: []
  };

  const domain = extractDomain(websiteUrl);
  company.domain = domain;

  const extract = scrapedData?.extract || {};
  const meta = scrapedData?.metadata || scrapedData?.meta || {};
  const legacyExtract = scrapedWithExtraction || {};
  const text = (scrapedData?.text || '') + ' ' + (legacyExtract?.rawMarkdown || '') + ' ' + (legacyExtract?.cleanedText || '');
  const lower = text.toLowerCase();

  // Name from multiple sources — prefer user-provided companyName over AI-extracted tagline
  const exactMatch = companyName && companyName !== 'Unknown' && companyName !== productName;
  const ogName = meta?.ogSiteName || meta?.['og:site_name'] || '';
  const pageTitle = scrapedData?.title || legacyExtract?.title || '';
  const extractedName = extract.name || '';
  const domainName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);

  company.name = exactMatch ? companyName
    : ogName ? ogName
    : pageTitle ? extractCleanCompanyFromTitle(pageTitle)
    : companyName || domainName || 'Unknown';

  // Store the raw extracted name / tagline separately — never overwrite companyName
  company.tagline = extractedName || '';

  if (company.name && company.name !== 'Unknown') {
    company.sources.push({ type: 'company_name', source: exactMatch ? 'user_input' : 'website_scrape', value: company.name });
  }

  // Industry detection
  const industryKeywords = {
    'Technology': ['software', 'technology', 'tech', 'platform', 'saas', 'cloud', 'digital', 'app'],
    'E-commerce': ['shop', 'store', 'cart', 'checkout', 'ecommerce', 'e-commerce', 'retail', 'buy'],
    'Healthcare': ['health', 'medical', 'healthcare', 'doctor', 'patient', 'clinic', 'wellness'],
    'Finance': ['finance', 'banking', 'fintech', 'payment', 'insurance', 'invest', 'financial'],
    'Education': ['education', 'learn', 'course', 'school', 'teaching', 'training', 'elearning'],
    'Marketing': ['marketing', 'advertising', 'campaign', 'brand', 'social media', 'seo'],
    'Design': ['design', 'creative', 'figma', 'ui', 'ux', 'prototype', 'graphic'],
    'HR': ['hiring', 'recruitment', 'hr', 'human resources', 'talent', 'workforce', 'employment'],
    'Real Estate': ['real estate', 'property', 'rental', 'mortgage', 'apartment', 'housing'],
    'Travel': ['travel', 'hotel', 'flight', 'tourism', 'booking', 'vacation'],
    'Legal': ['legal', 'law', 'attorney', 'lawyer', 'compliance', 'regulation'],
    'Manufacturing': ['manufacturing', 'factory', 'supply chain', 'logistics', 'warehouse'],
    'Media': ['media', 'news', 'publishing', 'content', 'video', 'streaming']
  };

  for (const [cat, keywords] of Object.entries(industryKeywords)) {
    if (keywords.some(kw => lower.includes(kw))) {
      company.industry = cat;
      if (!company.sources.find(s => s.type === 'industry')) {
        company.sources.push({ type: 'industry', source: 'website_content_analysis', value: cat });
      }
      break;
    }
  }

  if (industry && industry !== 'Technology') {
    company.industry = industry;
    company.sources.push({ type: 'industry', source: 'user_input', value: industry });
  }

  // Business model detection
  if (lower.includes('saas') || lower.includes('subscription') || lower.includes('monthly') || lower.includes('pricing')) {
    company.businessModel = 'SaaS';
    company.openSourceOrSaaS = 'SaaS';
  } else if (lower.includes('open source') || lower.includes('github.com') || lower.includes('gitlab')) {
    company.businessModel = 'Open Source / SaaS';
    company.openSourceOrSaaS = 'Open Source';
  } else if (lower.includes('add to cart') || lower.includes('checkout') || lower.includes('buy now')) {
    company.businessModel = 'E-commerce';
    company.openSourceOrSaaS = 'Not Applicable';
  } else if (lower.includes('consulting') || lower.includes('agency') || lower.includes('services')) {
    company.businessModel = 'Agency / Services';
    company.openSourceOrSaaS = 'Not Applicable';
  }

  // B2B / B2C detection
  if (lower.includes('enterprise') || lower.includes('for teams') || lower.includes('for business') || lower.includes('b2b')) {
    company.b2bOrB2C = 'B2B';
  } else if (lower.includes('for individuals') || lower.includes('personal') || lower.includes('b2c')) {
    company.b2bOrB2C = 'B2C';
  } else if (lower.includes('for everyone') || lower.includes('for all')) {
    company.b2bOrB2C = 'Both B2B and B2C';
  }

  // Target market detection
  if (lower.includes('enterprise') || lower.includes('fortune')) {
    company.targetMarket = 'Enterprise';
  } else if (lower.includes('small business') || lower.includes('smb') || lower.includes('startup')) {
    company.targetMarket = 'SMB / Startups';
  } else if (lower.includes('agency') || lower.includes('freelance') || lower.includes('freelancer')) {
    company.targetMarket = 'Agencies / Freelancers';
  } else if (lower.includes('developer') || lower.includes('api')) {
    company.targetMarket = 'Developers';
  }

  // Free trial / Enterprise plan detection
  if (lower.includes('free trial') || lower.includes('try free') || lower.includes('start free') || lower.includes('14-day') || lower.includes('30-day')) {
    company.freeTrial = true;
  }

  if (lower.includes('enterprise') && (lower.includes('plan') || lower.includes('pricing') || lower.includes('contact'))) {
    company.enterprisePlan = true;
  }

  // Social channels from scraped links
  const socialLinks = legacyExtract?.socialLinks || [];
  const socialMap = {
    'facebook.com': 'Facebook', 'twitter.com': 'Twitter', 'linkedin.com': 'LinkedIn',
    'instagram.com': 'Instagram', 'youtube.com': 'YouTube', 'github.com': 'GitHub',
    'tiktok.com': 'TikTok'
  };

  for (const link of socialLinks) {
    for (const [domain, name] of Object.entries(socialMap)) {
      if (link.includes(domain)) {
        company.socialChannels.push(name);
        break;
      }
    }
  }
  company.socialChannels = [...new Set(company.socialChannels)];

  // Employee estimate from content
  if (lower.includes('team of') || lower.includes('employees')) {
    const empMatch = lower.match(/(\d+[\d,]*)\s*(employees|team members|people)/i);
    if (empMatch) {
      company.employeeEstimate = empMatch[1].replace(',', '');
    }
  }

  // Headquarters detection
  const cities = ['san francisco', 'new york', 'london', 'berlin', 'paris', 'tokyo', 'singapore',
    'sydney', 'toronto', 'austin', 'seattle', 'boston', 'chicago', 'los angeles',
    'amsterdam', 'dublin', 'stockholm', 'barcelona', 'mumbai', 'bangalore', 'delhi'];
  const foundCity = cities.find(city => lower.includes(city));
  if (foundCity) {
    company.headquarters = foundCity.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  // Supported integrations from scraped content
  const integrationMarkers = ['integrations', 'works with', 'connects with', 'syncs with', 'compatible with'];
  if (integrationMarkers.some(m => lower.includes(m))) {
    company.sources.push({ type: 'integrations', source: 'website_content', detected: true });
  }

  return company;
}

function extractCleanCompanyFromTitle(title) {
  if (!title) return '';
  let cleaned = title
    .replace(/\s*[|–—-]\s*.*$/, '')               // remove after separator
    .replace(/\s*:.*$/, '')                           // remove after colon (tagline)
    .replace(/ – .*$/, '')                            // remove after em-dash
    .replace(/\s*&#\d+;.*$/, '')                      // remove HTML entities and after
    .replace(/^(Meet|Introducing|About|Welcome to)\s+/i, '') // remove intro words
    .trim();
  if (cleaned.length > 60) cleaned = cleaned.substring(0, 60).trim();
  return cleaned;
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
