import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import dns from 'dns';
import { promisify } from 'util';

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const dnsLookup = promisify(dns.lookup);

// ============================================
// DNS RESOLUTION WITH FALLBACK
// ============================================

async function resolveDns(hostname) {
  const dnsServers = [
    null, // Use system default
    '8.8.8.8', // Google DNS
    '1.1.1.1'  // Cloudflare DNS
  ];

  for (const server of dnsServers) {
    try {
      const options = server ? { family: 4, hints: dns.ADDRCONFIG, lookup: (hostname, options, callback) => {
        dns.lookup(hostname, { ...options, family: 4 }, callback);
      }} : { family: 4 };
      
      const result = await dnsLookup(hostname, options);
      console.log(`✅ [DNS] Resolved ${hostname} to ${result.address} using ${server || 'system DNS'}`);
      return result;
    } catch (error) {
      console.log(`⚠️ [DNS] Failed to resolve ${hostname} using ${server || 'system DNS'}:`, error.message);
    }
  }

  throw new Error(`DNS resolution failed for ${hostname} with all DNS servers`);
}

// ============================================
// UNIFIED SCRAPER SERVICE
// Multi-layer scraping with fallback chain
// ============================================

export async function scrapeWebsite(url, options = {}) {
  console.log('🔍 [Unified Scraper] Starting scraping for:', url);
  
  // Normalize URL - remove trailing slash and handle www vs non-www
  const normalizedUrl = url.replace(/\/$/, '');
  
  // Extract hostname for DNS pre-check
  try {
    const urlObj = new URL(normalizedUrl);
    console.log(`🔍 [Unified Scraper] Pre-checking DNS for: ${urlObj.hostname}`);
    await resolveDns(urlObj.hostname);
  } catch (error) {
    console.log(`⚠️ [Unified Scraper] DNS pre-check failed:`, error.message);
    // Continue anyway - the fetch might still work with different resolution
  }
  
  const {
    maxRetries = 3,
    timeout = 30000,
    followRedirects = true,
    extractSchema = true,
    extractImages = true,
    extractLinks = true
  } = options;

  // Try scraping with fallback chain
  const scrapers = [
    { name: 'Firecrawl', fn: scrapeWithFirecrawl },
    { name: 'Basic Fetch', fn: scrapeWithFetch }
  ];

  // Also try www and non-www variants if DNS fails
  const urlVariants = [
    normalizedUrl,
    normalizedUrl.replace(/^https?:\/\/www\./, 'https://'),
    normalizedUrl.replace(/^https:\/\//, 'https://www.')
  ].filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates

  let lastError;
  
  for (const urlVariant of urlVariants) {
    for (const scraper of scrapers) {
      try {
        console.log(`🔄 [Unified Scraper] Trying ${scraper.name} with URL: ${urlVariant}`);
        const result = await scraper.fn(urlVariant, { timeout, followRedirects });
        
        if (result && result.html) {
          console.log(`✅ [Unified Scraper] Success with ${scraper.name} using URL: ${urlVariant}`);
          
          // Enrich with additional parsing
          const enriched = await enrichScrapedData(
            { ...result, url: urlVariant }, // Pass URL to enrichment
            {
              extractSchema,
              extractImages,
              extractLinks
            }
          );
          
          return {
            success: true,
            data: enriched,
            provider: scraper.name.toLowerCase(),
            scrapedAt: new Date().toISOString()
          };
        }
      } catch (error) {
        console.log(`⚠️ [Unified Scraper] ${scraper.name} failed for ${urlVariant}:`, error.message);
        lastError = error;
        
        // If it's a DNS error (ENOTFOUND), try next URL variant
        if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
          console.log(`🔄 [Unified Scraper] DNS resolution failed, trying next URL variant...`);
          break; // Move to next URL variant
        }
      }
    }
  }

  // All scrapers failed
  console.error('❌ [Unified Scraper] All scrapers failed for all URL variants');
  return {
    success: false,
    error: lastError?.message || 'Failed to scrape website',
    provider: 'none'
  };
}

// ============================================
// FIRECRAWL SCRAPER
// ============================================

async function scrapeWithFirecrawl(url, options = {}) {
  if (!FIRECRAWL_API_KEY) {
    throw new Error('Firecrawl API key not configured');
  }

  const response = await fetch('https://api.firecrawl.dev/v2/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url,
      formats: ["markdown", "html", "links"]
    }),
    signal: AbortSignal.timeout(options.timeout || 30000)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Firecrawl API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.success) {
    throw new Error('Firecrawl scraping failed');
  }

  return {
    html: data.data?.html || data.data?.rawHtml || '',
    text: data.data?.markdown || data.data?.content || '',
    metadata: {
      title: data.data?.metadata?.title || '',
      description: data.data?.metadata?.description || '',
      language: data.data?.metadata?.language || 'en',
      ogImage: data.data?.metadata?.ogImage || null,
      statusCode: data.data?.metadata?.statusCode || 200
    },
    links: data.data?.links || [],
    extract: data.data?.extract || null,
    screenshot: data.data?.screenshot || null
  };
}

// ============================================
// BASIC FETCH SCRAPER (Fallback)
// ============================================

async function scrapeWithFetch(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 30000);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      redirect: options.followRedirects ? 'follow' : 'manual',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract metadata
    const title = $('title').text() || 
                  $('meta[property="og:title"]').attr('content') || 
                  $('meta[name="twitter:title"]').attr('content') || '';
    
    const description = $('meta[name="description"]').attr('content') || 
                        $('meta[property="og:description"]').attr('content') || 
                        $('meta[name="twitter:description"]').attr('content') || '';

    const ogImage = $('meta[property="og:image"]').attr('content') || 
                    $('meta[name="twitter:image"]').attr('content') || null;

    // Extract text content
    $('script, style, noscript').remove();
    const text = $('body').text().replace(/\s+/g, ' ').trim();

    // Extract links
    const links = [];
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        links.push({
          href,
          text: $(el).text().trim()
        });
      }
    });

    return {
      html,
      text,
      metadata: {
        title: title.trim(),
        description: description.trim(),
        language: $('html').attr('lang') || 'en',
        ogImage,
        statusCode: response.status
      },
      links: links.slice(0, 100) // Limit to first 100 links
    };

  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================
// DATA ENRICHMENT
// ============================================

async function enrichScrapedData(scrapedData, options) {
  const $ = cheerio.load(scrapedData.html);

  const enriched = {
    ...scrapedData,
    technical: {},
    content: {},
    structured: {},
    url: scrapedData.url || '' // Store the URL for reference
  };

  // Extract technical SEO elements
  // Use Firecrawl metadata as primary source, fallback to HTML parsing
  const firecrawlMetadata = scrapedData.metadata || {};
  
  enriched.technical = {
    titleTag: $('title').text().trim() || firecrawlMetadata.title || '',
    metaDescription: $('meta[name="description"]').attr('content') || firecrawlMetadata.description || '',
    canonicalUrl: $('link[rel="canonical"]').attr('href') || '',
    robotsMeta: $('meta[name="robots"]').attr('content') || '',
    viewport: $('meta[name="viewport"]').attr('content') || '',
    charset: $('meta[charset]').attr('charset') || $('meta[http-equiv="content-type"]').attr('content') || '',
    language: $('html').attr('lang') || firecrawlMetadata.language || 'en',
    
    // Open Graph
    openGraph: {
      title: $('meta[property="og:title"]').attr('content') || '',
      description: $('meta[property="og:description"]').attr('content') || '',
      image: $('meta[property="og:image"]').attr('content') || firecrawlMetadata.ogImage || '',
      url: $('meta[property="og:url"]').attr('content') || '',
      type: $('meta[property="og:type"]').attr('content') || '',
      siteName: $('meta[property="og:site_name"]').attr('content') || ''
    },
    
    // Twitter Cards
    twitterCard: {
      card: $('meta[name="twitter:card"]').attr('content') || '',
      title: $('meta[name="twitter:title"]').attr('content') || '',
      description: $('meta[name="twitter:description"]').attr('content') || '',
      image: $('meta[name="twitter:image"]').attr('content') || '',
      site: $('meta[name="twitter:site"]').attr('content') || ''
    },
    
    // Source tracking
    metadataSource: firecrawlMetadata.title ? 'firecrawl' : 'html-parsing'
  };

  // Extract content structure
  enriched.content = {
    headings: extractHeadingStructure($),
    wordCount: scrapedData.text.split(/\s+/).length,
    paragraphCount: $('p').length,
    imageCount: $('img').length,
    linkCount: $('a').length,
    internalLinks: [],
    externalLinks: [],
    socialLinks: {},
    images: options.extractImages ? extractImages($) : []
  };

  // Classify links
  if (options.extractLinks) {
    try {
      // Use the passed URL or construct a default one
      const baseUrl = enriched.url ? new URL(enriched.url) : new URL('https://example.com');
      
      $('a[href]').each((i, el) => {
        const href = $(el).attr('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
        
        try {
          const linkUrl = new URL(href, baseUrl);
          const isInternal = linkUrl.hostname === baseUrl.hostname;
          
          const linkData = {
            href: linkUrl.href,
            text: $(el).text().trim(),
            rel: $(el).attr('rel') || '',
            title: $(el).attr('title') || ''
          };
          
          if (isInternal) {
            enriched.content.internalLinks.push(linkData);
          } else {
            enriched.content.externalLinks.push(linkData);
            
            // Detect social links
            const hostname = linkUrl.hostname.toLowerCase();
            if (hostname.includes('facebook.com')) enriched.content.socialLinks.facebook = linkUrl.href;
            if (hostname.includes('twitter.com') || hostname.includes('x.com')) enriched.content.socialLinks.twitter = linkUrl.href;
            if (hostname.includes('linkedin.com')) enriched.content.socialLinks.linkedin = linkUrl.href;
            if (hostname.includes('instagram.com')) enriched.content.socialLinks.instagram = linkUrl.href;
            if (hostname.includes('youtube.com')) enriched.content.socialLinks.youtube = linkUrl.href;
          }
        } catch (e) {
          // Invalid URL, skip
        }
      });
    } catch (e) {
      console.log('⚠️ [Enrichment] Could not classify links:', e.message);
    }
  }

  // Extract structured data
  if (options.extractSchema) {
    enriched.structured = {
      jsonLd: extractJsonLdSchema($),
      microdata: extractMicrodata($),
      rdfa: extractRdfa($)
    };
  }

  return enriched;
}

// ============================================
// HEADING STRUCTURE EXTRACTION
// ============================================

function extractHeadingStructure($) {
  const headings = [];
  
  $('h1, h2, h3, h4, h5, h6').each((i, el) => {
    const tagName = $(el).prop('tagName').toLowerCase();
    const text = $(el).text().trim();
    
    if (text) {
      headings.push({
        level: parseInt(tagName.substring(1)),
        tag: tagName,
        text,
        id: $(el).attr('id') || ''
      });
    }
  });
  
  return headings;
}

// ============================================
// IMAGE EXTRACTION
// ============================================

function extractImages($) {
  const images = [];
  
  $('img').each((i, el) => {
    const src = $(el).attr('src');
    if (!src) return;
    
    images.push({
      src,
      alt: $(el).attr('alt') || '',
      title: $(el).attr('title') || '',
      width: $(el).attr('width') || null,
      height: $(el).attr('height') || null,
      loading: $(el).attr('loading') || ''
    });
  });
  
  return images;
}

// ============================================
// SCHEMA EXTRACTION
// ============================================

function extractJsonLdSchema($) {
  const schemas = [];
  
  $('script[type="application/ld+json"]').each((i, el) => {
    try {
      const content = $(el).html();
      const parsed = JSON.parse(content);
      schemas.push(parsed);
    } catch (e) {
      // Invalid JSON, skip
    }
  });
  
  return schemas;
}

function extractMicrodata($) {
  const items = [];
  
  $('[itemscope]').each((i, el) => {
    const item = {
      type: $(el).attr('itemtype') || '',
      properties: {}
    };
    
    $(el).find('[itemprop]').each((j, propEl) => {
      const propName = $(propEl).attr('itemprop');
      const propValue = $(propEl).attr('content') || $(propEl).text().trim();
      item.properties[propName] = propValue;
    });
    
    items.push(item);
  });
  
  return items;
}

function extractRdfa($) {
  const items = [];
  
  $('[typeof]').each((i, el) => {
    const item = {
      type: $(el).attr('typeof') || '',
      properties: {}
    };
    
    $(el).find('[property]').each((j, propEl) => {
      const propName = $(propEl).attr('property');
      const propValue = $(propEl).attr('content') || $(propEl).text().trim();
      item.properties[propName] = propValue;
    });
    
    items.push(item);
  });
  
  return items;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

export function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    // Remove trailing slash and hash
    return parsed.origin + parsed.pathname.replace(/\/$/, '') + parsed.search;
  } catch {
    return url;
  }
}
