import FirecrawlApp from "@mendable/firecrawl-js";
import { load } from "cheerio";
import fetch from "node-fetch";
import { createEvidenceSnapshot } from "./evidence.service.js";
import { memoize, cacheKeyUrl } from "../../../utils/research-cache.util.js";

// Optional API fallback clients are not yet installed; these are placeholders.
// If the packages are available, you can import them here:
// import { JinaReader } from "@jina/jina";
// import { TavilyExtract } from "@tavily/extract";

// ===== NOISE DETECTION =====

// Navigation/menu keywords that indicate low-quality content
const NOISE_KEYWORDS = [
  "view all", "login", "sign up", "menu", "blog", "resources", "career",
  "templates", "examples", "facebook", "twitter", "instagram", "youtube",
  "linkedin", "github", "contact us", "about us", "privacy", "terms",
  "cookie", "subscribe", "newsletter", "follow", "share", "download",
];

// Detect if a line is navigation/menu noise
function isNavNoise(line = "") {
  const lower = line.toLowerCase().trim();
  if (lower.length === 0 || lower.length > 200) return false;
  
  // Count noise keyword matches
  const noiseMatches = NOISE_KEYWORDS.filter(kw => lower.includes(kw)).length;
  if (noiseMatches >= 2) return true;
  
  // Detect merged/concatenated navigation (no proper spacing)
  if (/[A-Z][a-z]+\d+[A-Z][a-z]+/.test(line)) return true;
  
  // Detect repeated capitalized words stuck together (navigation pattern)
  if (/([A-Z][a-z]+){3,}/.test(line) && line.length < 60) return true;
  
  return false;
}

// ===== CLEANUP HELPERS =====

function cleanText(text = "") {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<!-- Google Tag Manager/gi, "")
    .replace(/gtag\([^)]*\)/gi, "")
    .replace(/window\.location\.href/g, "")
    .replace(/onclick="[^"]*"/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeArray(arr = []) {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  const result = [];
  for (const item of arr) {
    const str = typeof item === "string" ? item.trim() : "";
    if (str && !seen.has(str.toLowerCase())) {
      seen.add(str.toLowerCase());
      result.push(str);
    }
  }
  return result;
}

function countNavNoiseLines(text = "") {
  if (!text || typeof text !== "string") return 0;
  return text.split(/\n|•|-|→/).reduce((count, line) => {
    const cleaned = cleanText(line).trim();
    return count + (isNavNoise(cleaned) ? 1 : 0);
  }, 0);
}

function truncateString(text = "", maxLength = 500) {
  if (!text || typeof text !== "string") return "";
  text = text.trim();
  return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
}

// Maximum HTML length retained from scraped pages. The <head> section (which
// technology detection and schema.org discovery rely on) is always first, so
// truncation preserves it while bounding memory usage.
const MAX_HTML_LENGTH = 300000;

function capHtml(html = "") {
  if (!html || typeof html !== "string") return "";
  return html.length > MAX_HTML_LENGTH ? html.slice(0, MAX_HTML_LENGTH) : html;
}

// ===== FEATURE EXTRACTION =====

const FEATURE_KEYWORDS = [
  "ai", "builder", "template", "automation", "analytics", "dashboard",
  "integration", "tracking", "reporting", "resume", "cover letter", "ats",
  "search", "filter", "export", "import", "api", "sync", "collaboration",
  "sharing", "comments", "review", "professional", "download"
];

function extractFeatures(text = "") {
  if (!text) return [];
  const lines = text.split(/\n|•|-|→/);
  const features = [];
  let noisyCount = 0;

  for (const line of lines) {
    const cleaned = cleanText(line).trim();
    
    // Skip noisy lines
    if (isNavNoise(cleaned)) {
      noisyCount++;
      continue;
    }
    
    // Only accept meaningful lines (meaningful length + at least one feature keyword)
    const hasFeatureKeyword = FEATURE_KEYWORDS.some(kw => cleaned.toLowerCase().includes(kw));
    const isProperLength = cleaned.length >= 15 && cleaned.length <= 200;
    const noSpaceIssues = !/ {2,}/.test(cleaned); // Not excessive spaces
    
    if (isProperLength && hasFeatureKeyword && noSpaceIssues) {
      features.push(cleaned);
    }
  }

  console.log(`📝 Features extracted: ${features.length}, noisy lines removed: ${noisyCount}`);
  return dedupeArray(features).slice(0, 12);
}

// ===== BENEFIT EXTRACTION =====

const BENEFIT_KEYWORDS = [
  "save time", "reduce cost", "increase", "improve", "boost", "faster",
  "easier", "better", "productivity", "efficiency", "quality", "success",
  "get hired", "land job", "avoid typos", "ats compliant", "professional",
  "convert", "rank", "grow", "scale", "secure", "safe", "reliable"
];

function extractBenefits(text = "") {
  if (!text) return [];
  const lines = text.split(/\n|•|-|→/);
  const benefits = [];
  let noisyCount = 0;

  for (const line of lines) {
    const cleaned = cleanText(line).trim();
    
    if (isNavNoise(cleaned)) {
      noisyCount++;
      continue;
    }
    
    const hasBenefitKeyword = BENEFIT_KEYWORDS.some(kw => cleaned.toLowerCase().includes(kw));
    const isProperLength = cleaned.length >= 15 && cleaned.length <= 200;
    const noSpaceIssues = !/ {2,}/.test(cleaned);
    
    if (isProperLength && hasBenefitKeyword && noSpaceIssues) {
      benefits.push(cleaned);
    }
  }

  console.log(`💡 Benefits extracted: ${benefits.length}, noisy lines removed: ${noisyCount}`);
  return dedupeArray(benefits).slice(0, 8);
}

// ===== PRICING EXTRACTION =====

const PRICING_KEYWORDS = [
  "pricing", "plan", "free", "pro", "premium", "subscription", "month",
  "annual", "year", "$", "₹", "monthly", "yearly", "cost"
];

function extractPricing(text = "") {
  if (!text) return "";
  const lines = text.split(/\n/);
  
  for (const line of lines) {
    const cleaned = cleanText(line).trim();
    
    if (isNavNoise(cleaned)) continue;
    
    const hasPricingKeyword = PRICING_KEYWORDS.some(kw => cleaned.toLowerCase().includes(kw));
    const isProperLength = cleaned.length > 5 && cleaned.length < 300;
    
    if (isProperLength && hasPricingKeyword) {
      return cleaned;
    }
  }
  
  return "";
}

// ===== CTA EXTRACTION =====

const CTA_KEYWORDS = [
  "get started", "build", "create", "try", "start free", "start now",
  "try now", "book demo", "demo", "sign up", "sign up now", "download",
  "contact", "contact us", "join", "subscribe", "register"
];

function extractCTA(text = "") {
  if (!text) return [];
  const lines = text.split(/\n|•|-|→|,/);
  const ctas = [];

  for (const line of lines) {
    const cleaned = cleanText(line).trim();
    
    if (isNavNoise(cleaned)) continue;
    
    const hasCtaKeyword = CTA_KEYWORDS.some(kw => cleaned.toLowerCase().includes(kw));
    const isProperLength = cleaned.length >= 4 && cleaned.length <= 100;
    
    if (isProperLength && hasCtaKeyword) {
      ctas.push(cleaned);
    }
  }

  console.log(`🎯 CTAs extracted: ${ctas.length}`);
  return dedupeArray(ctas).slice(0, 5);
}

// ===== FAQ EXTRACTION =====

function extractFAQ(text = "") {
  if (!text) return [];
  const lines = text.split(/\n/);
  const faqs = [];

  for (const line of lines) {
    const cleaned = cleanText(line).trim();
    
    if (isNavNoise(cleaned)) continue;
    
    const hasQuestion = line.includes("?") || cleaned.toLowerCase().includes("faq");
    const isProperLength = cleaned.length > 5 && cleaned.length < 300;
    
    if (isProperLength && hasQuestion) {
      faqs.push(cleaned);
    }
  }

  return dedupeArray(faqs).slice(0, 5);
}

// ===== TESTIMONIAL EXTRACTION =====

function extractTestimonials(text = "") {
  if (!text) return [];
  const lines = text.split(/\n/);
  const testimonials = [];

  for (const line of lines) {
    const cleaned = cleanText(line).trim();
    
    if (isNavNoise(cleaned)) continue;
    
    const hasQuote = cleaned.includes('"') || cleaned.includes("'");
    const hasReviewKeyword = cleaned.toLowerCase().includes("review") || cleaned.toLowerCase().includes("great");
    const isProperLength = cleaned.length > 20 && cleaned.length < 300;
    
    if (isProperLength && (hasQuote || hasReviewKeyword)) {
      testimonials.push(cleaned);
    }
  }

  return dedupeArray(testimonials).slice(0, 4);
}

// ===== SOCIAL LINKS EXTRACTION =====

function extractSocialLinks(html = "") {
  if (!html) return [];
  const socialDomains = [
    "facebook.com", "twitter.com", "linkedin.com", "instagram.com",
    "youtube.com", "github.com", "tiktok.com"
  ];
  
  const links = (html.match(/https?:\/\/[^\s"'<>)]+/g) || [])
    .filter(link => socialDomains.some(domain => link.includes(domain)))
    .slice(0, 8);
  
  return dedupeArray(links);
}

// ===== FIRECRAWL SCRAPER =====

async function scrapeWithFirecrawl(websiteUrl) {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    console.log("⚠️  Firecrawl API key not found, will use fallback scraper");
    return null;
  }

  let scrapeQuality = {
    titleFound: false,
    metaFound: false,
    featuresCount: 0,
    benefitsCount: 0,
    ctaCount: 0,
    noisyLinesRemoved: 0,
    source: "firecrawl"
  };

  try {
    console.log(`🔥 Scraping with Firecrawl: ${websiteUrl}`);
    const app = new FirecrawlApp({ apiKey });
    const response = await app.scrapeUrl(websiteUrl, {
      formats: ["markdown", "html"],
      timeout: 15000,
    });

    if (!response.success) {
      console.warn("❌ Firecrawl scrape failed:", response.error);
      return null;
    }

    const markdown = response.markdown || "";
    const html = response.html || "";

    console.log("✅ Firecrawl scrape successful");

    // Parse metadata
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? cleanText(titleMatch[1]) : "";
    scrapeQuality.titleFound = Boolean(title);

    const metaDescMatch = html.match(/<meta name="description" content="([^"]*)"/i);
    const metaDescription = metaDescMatch ? cleanText(metaDescMatch[1]) : "";
    scrapeQuality.metaFound = Boolean(metaDescription);

    // Extract hero text
    const heroMatch = markdown.match(/^[^\n]*\n+([^\n]+)/);
    const heroText = heroMatch ? cleanText(heroMatch[1]).trim() : "";

    // Extract structured content
    const features = extractFeatures(markdown);
    const benefits = extractBenefits(markdown);
    const pricingText = extractPricing(markdown);
    const ctaText = extractCTA(markdown);
    const faq = extractFAQ(markdown);
    const testimonials = extractTestimonials(markdown);
    const socialLinks = extractSocialLinks(html);

    scrapeQuality.featuresCount = features.length;
    scrapeQuality.benefitsCount = benefits.length;
    scrapeQuality.ctaCount = ctaText.length;
    scrapeQuality.noisyLinesRemoved = countNavNoiseLines(markdown);

    // Extract headings
    const headings = [];
    const $ = load(html);
    $("h1, h2, h3").each((i, el) => {
      const text = cleanText($(el).text());
      if (text) headings.push(text);
    });
    
    // Clean markdown - limit to 2000 chars
    const cleanedText = dedupeArray(markdown.split(/\n\n+/))
      .filter(p => !isNavNoise(p))
      .join("\n\n")
      .slice(0, 2000)
      .trim();

    const rawMarkdown = markdown.slice(0, 3000).trim();

    return {
      title: truncateString(title, 200),
      metaDescription: truncateString(metaDescription, 300),
      heroText: truncateString(heroText, 500),
      headings: dedupeArray(headings).slice(0,15),
      features,
      benefits,
      pricingText: truncateString(pricingText, 300),
      ctaText,
      faq,
      testimonials,
      socialLinks,
      html: capHtml(html),
      text: rawMarkdown,
      rawMarkdown,
      cleanedText,
      scrapeQuality
    };
  } catch (error) {
    console.warn("⚠️  Firecrawl error:", error.message);
    return null;
  }
}

// ===== CHEERIO FALLBACK SCRAPER =====

async function scrapeWithCheerio(websiteUrl) {
  let scrapeQuality = {
    titleFound: false,
    metaFound: false,
    featuresCount: 0,
    benefitsCount: 0,
    ctaCount: 0,
    noisyLinesRemoved: 0,
    source: "cheerio"
  };

  try {
    console.log(`🔗 Scraping with Cheerio fallback: ${websiteUrl}`);
    const response = await fetch(websiteUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);

    // Remove script and style tags
    $("script, style, noscript, iframe, [data-gtm*='true']").remove();

    const title = cleanText($("title").text() || $("h1").first().text());
    const metaDescription = cleanText($("meta[name='description']").attr("content") || "");
    
    scrapeQuality.titleFound = Boolean(title);
    scrapeQuality.metaFound = Boolean(metaDescription);

    // Hero text
    const heroText = cleanText($("h1").first().text() || $("p").first().text());

    // Extract headings
    const headings = [];
    $("h1, h2, h3").each((i, el) => {
      const text = cleanText($(el).text());
      if (text) headings.push(text);
    });

    // Extract features and benefits
    const featureText = $("h2, h3, li").text();
    const features = extractFeatures(featureText);
    const benefits = extractBenefits(featureText);

    // Pricing
    const pricingText = extractPricing($(".pricing, [class*='price'], .plans").text());

    // CTA
    const ctaText = extractCTA(
      $("button, a.btn, a.cta, [class*='cta']")
        .text()
        .split("\n")
        .join(" ")
    );

    const rawText = $.text().slice(0, 3000).trim();
    scrapeQuality.featuresCount = features.length;
    scrapeQuality.benefitsCount = benefits.length;
    scrapeQuality.ctaCount = ctaText.length;
    scrapeQuality.noisyLinesRemoved = countNavNoiseLines(rawText);

    // FAQ
    const faqText = $(".faq, [class*='faq'], [class*='question']").text();
    const faq = extractFAQ(faqText);

    // Testimonials
    const testimonialText = $(".testimonial, [class*='quote'], [class*='review']").text();
    const testimonials = extractTestimonials(testimonialText);

    // Social links
    const socialLinks = extractSocialLinks(html);

    // Cleaned text - limit to 2000 chars
    const cleanedText = dedupeArray(rawText.split(/\n\n+/))
      .filter(p => !isNavNoise(p))
      .join("\n\n")
      .slice(0, 2000)
      .trim();

    console.log("✅ Cheerio scrape completed");

    return {
      title: truncateString(title, 200),
      metaDescription: truncateString(metaDescription, 300),
      heroText: truncateString(heroText, 500),
      headings: dedupeArray(headings).slice(0,15),
      features,
      benefits,
      pricingText: truncateString(pricingText, 300),
      ctaText,
      faq,
      testimonials,
      socialLinks,
      html: capHtml(html),
      text: rawText,
      rawMarkdown: rawText,
      cleanedText,
      scrapeQuality
    };
  } catch (error) {
    console.warn("⚠️  Cheerio error:", error.message);
    return null;
  }
}

// ===== SCRAPED HTML PARSER =====

function parseScrapedHtml(html, source) {
  const $ = load(html);
  $("script, style, noscript, iframe, [data-gtm*='true']").remove();

  const title = cleanText($("title").text() || $("h1").first().text());
  const metaDescription = cleanText($("meta[name='description']").attr("content") || "");
  const heroText = cleanText($("h1").first().text() || $("p").first().text());
  const featureText = $("h2, h3, li").text() || $("body").text();

  const features = extractFeatures(featureText);
  const benefits = extractBenefits(featureText);
  const pricingText = extractPricing(
    $(".pricing, [class*='price'], .plans").text() || $("body").text()
  );
  const ctaText = extractCTA(
    $("button, a.btn, a.cta, [class*='cta']").text().split("\n").join(" ")
  );
  const faq = extractFAQ($(".faq, [class*='faq'], [class*='question']").text());
  const testimonials = extractTestimonials($(".testimonial, [class*='quote'], .review").text());
  const socialLinks = extractSocialLinks(html);

  const rawText = $("body").text().slice(0, 3000).trim();
  const cleanedText = dedupeArray(rawText.split(/\n\n+/))
    .filter((p) => !isNavNoise(p))
    .join("\n\n")
    .slice(0, 5000)
    .trim();

  const scrapeQuality = {
    titleFound: Boolean(title),
    metaFound: Boolean(metaDescription),
    featuresCount: features.length,
    benefitsCount: benefits.length,
    ctaCount: ctaText.length,
    noisyLinesRemoved: countNavNoiseLines(rawText),
    source,
  };

  return {
    title: truncateString(title, 200),
    metaDescription: truncateString(metaDescription, 300),
    heroText: truncateString(heroText, 500),
    features,
    benefits,
    pricingText: truncateString(pricingText, 300),
    ctaText,
    faq,
    testimonials,
    socialLinks,
    html: capHtml(html),
    text: rawText,
    rawMarkdown: rawText,
    cleanedText,
    scrapeQuality,
  };
}

// ===== PLAYWRIGHT FALLBACK SCRAPER =====

async function scrapeWithPlaywright(websiteUrl) {
  let chromiumModule;
  try {
    chromiumModule = await import("playwright");
  } catch (importError) {
    console.warn("⚠️  Playwright is not installed; skipping Playwright fallback.", importError.message);
    return null;
  }

  let browser = null;
  try {
    console.log(`🧪 Scraping with Playwright: ${websiteUrl}`);
    browser = await chromiumModule.chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(websiteUrl, { waitUntil: "networkidle", timeout: 20000 });
    const html = await page.content();

    console.log("✅ Playwright scrape completed");
    return parseScrapedHtml(html, "playwright");
  } catch (error) {
    console.warn("⚠️  Playwright scrape failed:", error.message);
    return null;
  } finally {
    if (browser) {
      await browser.close().catch((closeError) => {
        console.warn("⚠️  Playwright browser close error:", closeError.message);
      });
    }
  }
}

// ===== SCRAPER RETRY + FAILURE REPORTING =====

const SCRAPE_CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_SCRAPER_RETRIES = 2;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Run a scraper with one bounded retry. Returns { data, error, attempts } —
 * callers keep the existing null-on-failure contract via `data`.
 */
async function retryScraper(fn, source, websiteUrl) {
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_SCRAPER_RETRIES; attempt++) {
    try {
      const data = await fn();
      if (data) return { data, error: null, attempts: attempt };
      lastError = new Error(`${source} returned no content`);
    } catch (err) {
      lastError = err;
    }
    if (attempt < MAX_SCRAPER_RETRIES) {
      await sleep(300 * Math.pow(2, attempt - 1));
    }
  }
  return { data: null, error: lastError?.message || `${source} failed`, attempts: MAX_SCRAPER_RETRIES };
}

// ===== JINA FALLBACK SCRAPER =====

async function scrapeWithJina(websiteUrl) {
  const apiKey = process.env.JINA_API_KEY;
  if (!apiKey) return null;

  try {
    console.log(`🔍 Scraping with Jina Reader: ${websiteUrl}`);
    const response = await fetch("https://r.jina.ai/", {
      method: "POST",
      signal: AbortSignal.timeout(25000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Engine": "browser",
        "X-Return-Format": "markdown",
        "X-Timeout": "20",
      },
      body: JSON.stringify({ url: websiteUrl }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.warn("❌ Jina Reader scrape failed:", response.status, errorData);
      return null;
    }

    const data = await response.json();
    const markdown =
      data?.data?.content || data?.content || data?.output || (Array.isArray(data) && data[0]?.content) || "";
    const rawMarkdown = typeof markdown === "string" ? markdown : JSON.stringify(markdown);

    if (!rawMarkdown) {
      console.warn("⚠️  Jina Reader response contained no content");
      return null;
    }

    const features = extractFeatures(rawMarkdown);
    const benefits = extractBenefits(rawMarkdown);
    const pricingText = extractPricing(rawMarkdown);
    const ctaText = extractCTA(rawMarkdown);
    const faq = extractFAQ(rawMarkdown);
    const testimonials = extractTestimonials(rawMarkdown);
    const socialLinks = extractSocialLinks(rawMarkdown);

    const heroTextMatch = rawMarkdown.match(/^(.*)$/m);
    const heroText = heroTextMatch ? cleanText(heroTextMatch[1]) : "";

    const titleMatch = rawMarkdown.match(/^#+\s*(.*)/m);
    const title = titleMatch ? cleanText(titleMatch[1]) : "";
    const metaDescMatch = rawMarkdown.match(/meta description\s*[:\-]\s*(.*)/i);
    const metaDescription = metaDescMatch ? cleanText(metaDescMatch[1]) : "";

    const cleanedText = dedupeArray(rawMarkdown.split(/\n\n+/))
      .filter((p) => !isNavNoise(p))
      .join("\n\n")
      .slice(0, 5000)
      .trim();

    const scrapeQuality = {
      titleFound: Boolean(title),
      metaFound: Boolean(metaDescription),
      featuresCount: features.length,
      benefitsCount: benefits.length,
      ctaCount: ctaText.length,
      noisyLinesRemoved: countNavNoiseLines(rawMarkdown),
      source: "jina",
    };

    return {
      title: truncateString(title, 200),
      metaDescription: truncateString(metaDescription, 300),
      heroText: truncateString(heroText, 500),
      features,
      benefits,
      pricingText: truncateString(pricingText, 300),
      ctaText,
      faq,
      testimonials,
      socialLinks,
      html: null,
      text: truncateString(rawMarkdown, 3000),
      rawMarkdown: truncateString(rawMarkdown, 3000),
      cleanedText,
      scrapeQuality,
    };
  } catch (error) {
    console.warn("⚠️  Jina scrape failed:", error.message);
    return null;
  }
}

// ===== TAVILY FALLBACK SCRAPER =====
// Removed: the previous implementation was a placeholder that unconditionally
// returned null (Tavily Extract SDK is not installed). A scraper slot that can
// never produce data is worse than no slot — the chain is Jina → Firecrawl →
// Playwright → Cheerio. If the @tavily/extract package is installed later, add
// it here as a real implementation and register it in scrapeWebsite().

/**
 * Run the full scraper chain. Tier 1 (Jina + Firecrawl) runs in PARALLEL —
 * halving worst-case latency — with Jina preferred when both succeed. Tier 2
 * (Playwright) and tier 3 (Cheerio) only run when the previous tier produced
 * nothing. Each scraper gets one bounded retry. The whole chain is memoized per
 * normalized URL so no two pipeline stages ever crawl the same site twice.
 */
async function scrapeChain(websiteUrl) {
  const attempts = [];

  const [jinaRes, firecrawlRes] = await Promise.allSettled([
    retryScraper(() => scrapeWithJina(websiteUrl), "jina", websiteUrl),
    retryScraper(() => scrapeWithFirecrawl(websiteUrl), "firecrawl", websiteUrl),
  ]);

  const jina = jinaRes.status === "fulfilled" ? jinaRes.value : { data: null, error: jinaRes.reason?.message };
  const firecrawl = firecrawlRes.status === "fulfilled" ? firecrawlRes.value : { data: null, error: firecrawlRes.reason?.message };
  attempts.push({ source: "jina", ok: !!jina.data, error: jina.error || null });
  attempts.push({ source: "firecrawl", ok: !!firecrawl.data, error: firecrawl.error || null });

  if (jina.data) {
    return { scrapedData: jina.data, source: "jina", attempts };
  }
  if (firecrawl.data) {
    return { scrapedData: firecrawl.data, source: "firecrawl", attempts };
  }

  const playwrightRes = await retryScraper(() => scrapeWithPlaywright(websiteUrl), "playwright", websiteUrl);
  attempts.push({ source: "playwright", ok: !!playwrightRes.data, error: playwrightRes.error || null });
  if (playwrightRes.data) {
    return { scrapedData: playwrightRes.data, source: "playwright", attempts };
  }

  const cheerioRes = await retryScraper(() => scrapeWithCheerio(websiteUrl), "cheerio", websiteUrl);
  attempts.push({ source: "cheerio", ok: !!cheerioRes.data, error: cheerioRes.error || null });
  if (cheerioRes.data) {
    return { scrapedData: cheerioRes.data, source: "cheerio", attempts };
  }

  // Throw (never cached by memoize) so a transient failure can be retried by
  // the next caller instead of poisoning the cache for the TTL window.
  const err = new Error("All scrapers failed");
  err.attempts = attempts;
  throw err;
}

export async function scrapeWebsite({ websiteUrl, productName = "Product", companyName = "", userId = null, chatId = null } = {}) {
  if (!websiteUrl) {
    return { success: false, scrapedData: null, source: "none", error: "No website URL provided" };
  }

  const key = `scrape:${cacheKeyUrl(websiteUrl)}`;

  try {
    const { scrapedData, source, attempts } = await memoize(key, SCRAPE_CACHE_TTL_MS, () => scrapeChain(websiteUrl));

    // Clone so cache consumers can never mutate the shared entry.
    const clone = structuredClone(scrapedData);

    console.log(`📊 Scrape completed with ${source} for ${websiteUrl}`);

    // If we have chat context, save to Evidence Snapshot (idempotent merge)
    if (userId && chatId) {
      await createEvidenceSnapshot({
        userId,
        chatId,
        analysisId: null,
        websiteUrl,
        companyName,
        sourceSummary: {
          sourcesCollected: [source],
          collectedAt: new Date().toISOString()
        },
        websiteEvidence: {
          title: clone.title,
          metaDescription: clone.metaDescription,
          heroText: clone.heroText,
          headings: clone.headings,
          features: clone.features,
          benefits: clone.benefits,
          pricingText: clone.pricingText,
          ctaText: clone.ctaText,
          faq: clone.faq,
          testimonials: clone.testimonials,
          socialLinks: clone.socialLinks
        },
        technicalSeoEvidence: {},
        contentEvidence: { cleanedText: clone.cleanedText },
        competitorEvidence: {},
        githubEvidence: {},
        rawEvidence: {
          rawMarkdown: clone.rawMarkdown,
          html: clone.html || null,
          text: clone.text || null,
          scrapeQuality: clone.scrapeQuality
        }
      });
      console.log(`💾 EvidenceSnapshot saved for chat ${chatId}`);
    }

    return {
      success: true,
      scrapedData: clone,
      source,
      error: null,
      attempts: attempts || [],
    };
  } catch (error) {
    const attempts = error?.attempts;
    const failures = attempts
      ? attempts.map(a => `${a.source}: ${a.error || "no content"}`).join("; ")
      : "";
    if (attempts) {
      return {
        success: false,
        scrapedData: null,
        source: "none",
        error: `All scrapers failed${failures ? ` (${failures})` : ""}`,
        attempts,
      };
    }
    console.error("❌ Unexpected scrape error:", error);
    return { success: false, scrapedData: null, source: "none", error: error.message };
  }
}

export async function scrapeWebsiteFallback(websiteUrl) {
  const playwright = await scrapeWithPlaywright(websiteUrl);
  if (playwright) return playwright;
  return scrapeWithCheerio(websiteUrl);
}
