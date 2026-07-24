import { collectOpenGraphEvidence } from "./openGraphEvidence.service.js";
import { extractJsonLd, summarizeSchemas } from "./schemaEvidence.service.js";
import { logEvidenceError } from "../../utils/evidence-logger.js";

export async function collectWebsiteEvidence($, websiteUrl) {
  const result = {
    title: null,
    metaDescription: null,
    headings: [],
    heroText: null,
    ctaTexts: [],
    featuresText: [],
    benefitsText: [],
    pricingText: [],
    integrationsList: [],
    testimonialsList: [],
    caseStudiesList: [],
    blogList: [],
    documentationList: [],
    faqItems: [],
    tables: [],
    lists: [],
    targetAudienceHints: [],
    industryHints: [],
    technologies: [],
    navigationLinks: [],
    footerLinks: [],
    hasPricingPage: null,
    hasFaqSection: null,
    hasBlog: null,
    hasContactPage: null,
    hasAboutPage: null,
    openGraph: null,
    schemas: null,
    githubUrls: [],
    technologyHints: [],
    allMetaTags: {},
    jsonldData: [],
    pageType: null,
    productName: null,
    categories: [],
    extractedEvidence: [],
  };

  try {
    result.title = $("title").text()?.slice(0, 300) || null;
    result.metaDescription = $('meta[name="description"]').attr("content")?.slice(0, 400) || null;

    $("meta").each((_, el) => {
      const name = $(el).attr("name") || $(el).attr("property") || "";
      const content = $(el).attr("content") || "";
      if (name && content) result.allMetaTags[name] = content?.slice(0, 500);
    });

    $("h1, h2, h3, h4").each((_, el) => {
      const tag = el.name || el.tagName || "";
      const text = $(el).text()?.trim()?.slice(0, 200);
      if (text && text.length > 2) {
        result.headings.push({ tag, text });
      }
    });
    result.headings = result.headings.slice(0, 50);

    const heroSelectors = ["header .hero", ".hero-section", ".hero", "#hero", "[class*=hero]", "header h1", "section:first-child h1"];
    for (const sel of heroSelectors) {
      const text = $(sel).first().text()?.trim()?.slice(0, 500);
      if (text && text.length > 10) { result.heroText = text; break; }
    }
    if (!result.heroText) {
      result.heroText = $("h1").first().text()?.trim()?.slice(0, 300) || null;
    }

    $("a[href*='signup'], a[href*='sign-up'], a[href*='register'], a[href*='get-started'], a[href*='start'], a[href*='demo'], a[href*='trial'], a[href*='book'], a[href*='schedule'], button, [class*=cta], [class*=button]").each((_, el) => {
      const text = $(el).text()?.trim();
      if (text && text.length > 2 && text.length < 150) result.ctaTexts.push(text);
    });
    result.ctaTexts = [...new Set(result.ctaTexts)].slice(0, 15);

    $("[class*=feature], [id*=feature], [class*=benefit], [id*=benefit], [class*=value-prop], [class*=value_prop]").each((_, el) => {
      const text = $(el).text()?.trim()?.slice(0, 400);
      if (text && text.length > 10) result.featuresText.push(text);
    });
    result.featuresText = [...new Set(result.featuresText)].slice(0, 25);

    $("[class*=pricing], [id*=pricing], [class*=plan], [id*=plan], [class*=price]").each((_, el) => {
      const text = $(el).text()?.trim()?.slice(0, 300);
      if (text && text.length > 10) result.pricingText.push(text);
    });
    result.pricingText = [...new Set(result.pricingText)].slice(0, 10);

    $("[class*=integration], [id*=integration] li, [class*=integration] a, [class*=partner] li, [class*=partner] a").each((_, el) => {
      const text = $(el).text()?.trim()?.slice(0, 150);
      const href = $(el).attr("href") || "";
      if (text && text.length > 2) result.integrationsList.push({ name: text, url: href });
    });
    result.integrationsList = [...new Map(result.integrationsList.map(i => [i.name, i])).values()].slice(0, 30);

    $("[class*=testimonial], [id*=testimonial], [class*=review], [class*=social-proof]").each((_, el) => {
      const text = $(el).text()?.trim()?.slice(0, 500);
      const cite = $(el).find("[class*=author], [class*=name], cite").first().text()?.trim()?.slice(0, 100);
      if (text && text.length > 20) result.testimonialsList.push({ text: text?.slice(0, 500), author: cite || null });
    });
    result.testimonialsList = result.testimonialsList.slice(0, 15);

    $("[class*=case-study], [id*=case-study], [class*=casestudy]").each((_, el) => {
      const title = $(el).find("h2, h3, h4, [class*=title]").first().text()?.trim()?.slice(0, 200);
      const link = $(el).find("a").first().attr("href") || "";
      if (title && title.length > 5) result.caseStudiesList.push({ title, url: link });
    });
    result.caseStudiesList = result.caseStudiesList.slice(0, 10);

    $("[class*=faq], [id*=faq], [class*=questions]").each((_, el) => {
      const q = $(el).find("h3, h4, dt, [class*=question]").first().text()?.trim()?.slice(0, 200);
      const a = $(el).find("p, dd, [class*=answer]").first().text()?.trim()?.slice(0, 500);
      if (q) result.faqItems.push({ question: q, answer: a || null });
    });
    result.faqItems = result.faqItems.slice(0, 20);

    $("table").each((_, el) => {
      const headers = [];
      const rows = [];
      $(el).find("th").each((_, th) => headers.push($(th).text()?.trim()?.slice(0, 100)));
      $(el).find("tr").each((_, tr) => {
        const cells = [];
        $(tr).find("td").each((_, td) => cells.push($(td).text()?.trim()?.slice(0, 200)));
        if (cells.length > 0) rows.push(cells);
      });
      if (headers.length > 0 || rows.length > 0) result.tables.push({ headers, rows: rows?.slice(0, 20) });
    });
    result.tables = result.tables.slice(0, 5);

    $("ul, ol").each((_, el) => {
      const items = [];
      $(el).find("li").each((_, li) => {
        const text = $(li).text()?.trim()?.slice(0, 300);
        if (text && text.length > 5) items.push(text);
      });
      if (items.length >= 2) result.lists.push(items);
    });
    result.lists = result.lists.slice(0, 20);

    $("[class*=audience], [id*=audience], [class*=target], [class*=persona], [class*=who-is], [class*=for-whom]").each((_, el) => {
      const text = $(el).text()?.trim()?.slice(0, 200);
      if (text && text.length > 5) result.targetAudienceHints.push(text);
    });

    $("[class*=industry], [id*=industry], [class*=vertical]").each((_, el) => {
      const text = $(el).text()?.trim()?.slice(0, 200);
      if (text && text.length > 3) result.industryHints.push(text);
    });

    $("nav a, header a, [class*=nav] a, [class*=menu] a, [role=navigation] a").each((_, el) => {
      const text = $(el).text()?.trim()?.slice(0, 100);
      const href = $(el).attr("href") || "";
      if (text && text.length > 1 && href && !href.startsWith("#") && !href.startsWith("javascript")) {
        result.navigationLinks.push({ text, url: href });
      }
    });
    result.navigationLinks = [...new Map(result.navigationLinks.map(i => [i.text + i.url, i])).values()].slice(0, 30);

    $("footer a").each((_, el) => {
      const text = $(el).text()?.trim()?.slice(0, 100);
      const href = $(el).attr("href") || "";
      if (text && text.length > 1 && href) result.footerLinks.push({ text, url: href });
    });
    result.footerLinks = result.footerLinks.slice(0, 20);

    const bodyHtml = $("body").html()?.toLowerCase() || "";
    const links = [];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (href) links.push(href.toLowerCase());
    });
    const allHrefs = links.join(" ");

    result.hasPricingPage = /pricing|plans?|subscription/.test(allHrefs);
    result.hasFaqSection = /faq|frequently.asked|questions/.test(bodyHtml);
    result.hasBlog = /\/blog\/|\/articles\/|\/news\/|\/posts\//.test(allHrefs);
    result.hasContactPage = /contact|contact-us|get-in-touch/.test(allHrefs);
    result.hasAboutPage = /about|about-us|our-story|our-team/.test(allHrefs);

    if (/product|solutions?\b/.test(allHrefs)) result.pageType = "product";
    else if (/service/.test(allHrefs)) result.pageType = "service";
    else if (/saas|software|platform/.test(bodyHtml)) result.pageType = "saas";
    else if (/blog|article|news/.test(allHrefs)) result.pageType = "content";
    else result.pageType = "website";

    $("a[href*='github.com']").each((_, el) => {
      const href = $(el).attr("href");
      if (href) result.githubUrls.push(href);
    });
    result.githubUrls = [...new Set(result.githubUrls)];

    const techDetections = [
      { pattern: /wp-content|wordpress/i, name: "WordPress" },
      { pattern: /react|react-root|__NEXT_DATA__/i, name: "React" },
      { pattern: /next\.?js/i, name: "Next.js" },
      { pattern: /vue|__VUE__/i, name: "Vue.js" },
      { pattern: /angular/i, name: "Angular" },
      { pattern: /shopify|myshopify/i, name: "Shopify" },
      { pattern: /webflow/i, name: "Webflow" },
      { pattern: /hubspot/i, name: "HubSpot" },
      { pattern: /squarespace/i, name: "Squarespace" },
      { pattern: /stripe/i, name: "Stripe" },
      { pattern: /cloudflare/i, name: "Cloudflare" },
      { pattern: /sentry/i, name: "Sentry" },
      { pattern: /segment/i, name: "Segment" },
      { pattern: /intercom|drift/i, name: "Intercom/Drift" },
      { pattern: /mixpanel|amplitude/i, name: "Analytics" },
      { pattern: /mailchimp|sendgrid|brevo|sendinblue/i, name: "Email Marketing" },
    ];
    for (const { pattern, name } of techDetections) {
      if (pattern.test(bodyHtml)) result.technologyHints.push(name);
    }
    result.technologyHints = [...new Set(result.technologyHints)];

    const productPatterns = [
      { pattern: /"productName"\s*:\s*"([^"]+)"/, source: "jsonld" },
      { pattern: /"name"\s*:\s*"([^"]+)"[^}]*"product"/i, source: "schema" },
    ];
    for (const { pattern, source } of productPatterns) {
      const match = bodyHtml.match(pattern);
      if (match && match[1]) {
        result.productName = match[1].slice(0, 100);
        break;
      }
    }
    if (!result.productName) {
      const ogTitle = $('meta[property="og:title"]').attr("content");
      if (ogTitle) result.productName = ogTitle.slice(0, 100);
    }

    result.openGraph = await collectOpenGraphEvidence($, websiteUrl);
    const rawSchemas = extractJsonLd($);
    result.jsonldData = rawSchemas;
    result.schemas = summarizeSchemas(rawSchemas);
  } catch (err) {
    logEvidenceError("websiteEvidence", websiteUrl, err);
  }

  return result;
}
