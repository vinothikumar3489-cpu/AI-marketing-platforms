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
    hasPricingPage: null,
    hasFaqSection: null,
    hasBlog: null,
    hasContactPage: null,
    hasAboutPage: null,
    openGraph: null,
    schemas: null,
    githubUrls: [],
    technologyHints: [],
  };

  try {
    result.title = $("title").text()?.slice(0, 200) || null;
    result.metaDescription = $('meta[name="description"]').attr("content")?.slice(0, 300) || null;

    $("h1, h2, h3").each((_, el) => {
      const text = $(el).text()?.trim()?.slice(0, 150);
      if (text && text.length > 2) result.headings.push(text);
    });
    result.headings = [...new Set(result.headings)].slice(0, 30);

    const heroSelectors = ["header .hero", ".hero-section", ".hero", "#hero", "[class*=hero]", "header h1"];
    for (const sel of heroSelectors) {
      const text = $(sel).first().text()?.trim()?.slice(0, 500);
      if (text && text.length > 10) {
        result.heroText = text;
        break;
      }
    }
    if (!result.heroText) {
      result.heroText = $("h1").first().text()?.trim()?.slice(0, 300) || null;
    }

    $("a[href*='signup'], a[href*='sign-up'], a[href*='register'], a[href*='get-started'], a[href*='start'], a[href*='demo'], a[href*='trial'], a[href*='book'], button").each((_, el) => {
      const text = $(el).text()?.trim();
      if (text && text.length > 2 && text.length < 100) result.ctaTexts.push(text);
    });
    result.ctaTexts = [...new Set(result.ctaTexts)].slice(0, 10);

    $("[class*=feature], [class*=benefit], [id*=feature], [id*=benefit]").each((_, el) => {
      const text = $(el).text()?.trim()?.slice(0, 200);
      if (text && text.length > 10) result.featuresText.push(text);
    });
    result.featuresText = [...new Set(result.featuresText)].slice(0, 15);

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

    $("a[href*='github.com']").each((_, el) => {
      const href = $(el).attr("href");
      if (href) result.githubUrls.push(href);
    });
    result.githubUrls = [...new Set(result.githubUrls)];

    if (bodyHtml.includes("wp-content") || bodyHtml.includes("wordpress")) result.technologyHints.push("WordPress");
    if (bodyHtml.includes("react") || bodyHtml.includes("react-root")) result.technologyHints.push("React");
    if (bodyHtml.includes("next.js") || bodyHtml.includes("__NEXT_DATA__")) result.technologyHints.push("Next.js");
    if (bodyHtml.includes("vue") || bodyHtml.includes("__VUE__")) result.technologyHints.push("Vue.js");
    if (bodyHtml.includes("angular")) result.technologyHints.push("Angular");
    if (bodyHtml.includes("shopify") || bodyHtml.includes("myshopify")) result.technologyHints.push("Shopify");
    if (bodyHtml.includes("webflow")) result.technologyHints.push("Webflow");
    if (bodyHtml.includes("hubspot")) result.technologyHints.push("HubSpot");
    if (bodyHtml.includes("squarespace")) result.technologyHints.push("Squarespace");
    result.technologyHints = [...new Set(result.technologyHints)];

    result.openGraph = await collectOpenGraphEvidence($, websiteUrl);

    const rawSchemas = extractJsonLd($);
    result.schemas = summarizeSchemas(rawSchemas);
  } catch (err) {
    logEvidenceError("websiteEvidence", websiteUrl, err);
  }

  return result;
}
