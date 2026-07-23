import { generateAnalysis } from "../../analytics/services/analysis.service.js";

function uniq(a) { return Array.from(new Set((a||[]).filter(Boolean))); }
function truncateString(text = "", maxLength = 300) { return typeof text === "string" && text.length > maxLength ? text.slice(0, maxLength).trim() + "..." : (text || ""); }
function ensureArray(value) { return Array.isArray(value) ? value.filter(Boolean) : value ? [value] : []; }

function featureToMarketing(feature) {
  if (!feature) return "";
  const lower = feature.toLowerCase();
  const conversions = {
    "ai": "AI-powered insights",
    "builder": "easy-to-use builder",
    "templates": "professional templates",
    "automation": "workflow automation",
    "analytics": "detailed analytics",
    "dashboard": "intuitive dashboard",
    "integration": "seamless integrations",
    "ats": "ATS-friendly format",
    "export": "multiple export options",
    "import": "easy data import",
    "sync": "real-time synchronization",
    "collaboration": "team collaboration features"
  };

  for (const [keyword, marketing] of Object.entries(conversions)) {
    if (lower.includes(keyword)) return marketing;
  }

  return feature;
}

function inferBuyerPersonas(manualData = {}, scrapedData = {}) {
  const personas = [];
  const targetUsers = (manualData.targetAudience || "").split(/,|;|\s+and\s+/).map((part) => part.trim()).filter(Boolean);

  const normalized = targetUsers.map((value) => value.toLowerCase());
  if (normalized.some((v) => v.includes("student") || v.includes("graduate"))) {
    personas.push({ name: "Student Job Seeker", age: "18-24", goal: "Get first professional job", problem: "No professional resume" });
  }
  if (normalized.some((v) => v.includes("career") || v.includes("switch"))) {
    personas.push({ name: "Career Switcher", age: "25-40", goal: "Transition to a new role", problem: "Resume not optimized for target industry" });
  }
  if (normalized.some((v) => v.includes("professional") || v.includes("working"))) {
    personas.push({ name: "Working Professional", age: "25-45", goal: "Advance career or get promoted", problem: "Outdated resume or employer branding" });
  }
  if (normalized.some((v) => v.includes("startup"))) {
    personas.push({ name: "Startup Founder", age: "25-45", goal: "Launch a business quickly", problem: "Need professional materials fast" });
  }
  if (normalized.some((v) => v.includes("job seeker"))) {
    personas.push({ name: "Job Seeker", age: "18-45", goal: "Find the right role", problem: "Low interview response rate" });
  }

  if (personas.length === 0 && normalized.length > 0) {
    personas.push(...normalized.slice(0, 3).map((user) => ({ name: user.charAt(0).toUpperCase() + user.slice(1), age: "Varies", goal: `Achieve success for ${user}`, problem: `Improve ${user} outcomes` })));
  }

  return uniq(personas.map((p) => JSON.stringify(p))).map((item) => JSON.parse(item));
}

function inferMarketMaturity(manualData = {}, scrapedData = {}) {
  const industry = (manualData.industry || "").toLowerCase();
  if (industry.includes("saas") || industry.includes("resume")) return "Growth";
  if (industry.includes("ecommerce") || industry.includes("retail")) return "Maturing";
  if (industry.includes("enterprise") || industry.includes("crm")) return "Established";
  return "Emerging";
}

function ensurePainPoints(painPoints = [], manualData = {}, scrapedData = {}) {
  const normalized = ensureArray(painPoints).filter(Boolean);
  const fallback = [];

  if (normalized.length > 0) return normalized;

  const industry = (manualData.industry || "").toLowerCase();
  if (industry.includes("resume") || industry.includes("job") || industry.includes("career")) {
    fallback.push(
      "ATS rejection from poor resume formatting",
      "Difficulty writing a compelling resume and cover letter",
      "Inconsistent formatting across job applications",
      "Low interview response rate",
      "Poor visibility with applicant tracking systems"
    );
  } else if (industry.includes("crm") || industry.includes("sales") || industry.includes("pipeline")) {
    fallback.push(
      "Lead tracking issues across teams",
      "Follow-up delays that reduce conversion",
      "Disconnected customer data silos",
      "Sales process inefficiencies",
      "Inaccurate revenue forecasting"
    );
  } else if (industry.includes("ecommerce") || industry.includes("shop") || industry.includes("store")) {
    fallback.push(
      "Complex store setup and launch",
      "Inventory management headaches",
      "Checkout conversion friction",
      "Low repeat purchase rates",
      "Poor omnichannel customer experience"
    );
  } else if (industry.includes("project") || industry.includes("task") || industry.includes("workflow")) {
    fallback.push(
      "Team coordination gaps and missed deadlines",
      "Difficulty tracking project progress",
      "Unclear ownership of tasks",
      "Communication breakdowns across stakeholders",
      "Poor visibility into project status"
    );
  } else {
    fallback.push(
      "Unclear value messaging for buyers",
      "Difficulty differentiating from competitors",
      "Inefficient customer acquisition workflow",
      "Lack of clear buyer personas",
      "Weak positioning for market maturity"
    );
  }

  return normalized.concat(fallback).slice(0, 5);
}

function normalizeText(text = "") {
  return typeof text === "string" ? text.replace(/\s+/g, " ").trim() : "";
}

function extractBuyerPersonas(manualData = {}, scrapedData = {}) {
  const aiPersonas = ensureArray(scrapedData?.buyerPersonas || []);
  if (aiPersonas.length > 0) return aiPersonas;
  return inferBuyerPersonas(manualData, scrapedData);
}

function extractUSP(manualData = {}, scrapedData = {}) {
  const productName = manualData.productName || "The product";
  const industry = manualData.industry || "modern teams";
  const features = uniq(scrapedData?.features || []).slice(0, 3);
  const benefits = uniq(scrapedData?.benefits || []).slice(0, 3);

  if (manualData.description && manualData.description.length > 50) {
    const match = manualData.description.match(/(?:designed to|helps|offers|delivers|provides)([^.]+)/i);
    if (match) {
      return truncateString(`${productName} delivers ${match[1].trim()}`, 200);
    }
    return truncateString(manualData.description, 200);
  }

  if (features.length > 0 && benefits.length > 0) {
    return truncateString(
      `${productName} combines ${featureToMarketing(features[0]).toLowerCase()} with ${benefits[0].toLowerCase()} so teams can move faster.`,
      200
    );
  }

  if (features.length > 0) {
    return truncateString(
      `${productName} is a ${industry} solution built around ${featureToMarketing(features[0]).toLowerCase()}.`,
      200
    );
  }

  if (benefits.length > 0) {
    return truncateString(
      `${productName} helps ${industry} ${benefits[0].toLowerCase()}.`,
      200
    );
  }

  return `${productName} delivers reliable results for ${industry}.`;
}

function extractSummary(manualData = {}, scrapedData = {}) {
  const headline = manualData.productName || scrapedData?.title || "The product";
  const pov = manualData.description ? truncateString(manualData.description, 140) : scrapedData?.metaDescription || scrapedData?.title || "A professional product analysis summary.";
  return `${headline} is a ${manualData.industry || "business"} solution that ${pov.toLowerCase()}`;
}

function extractPainPoints(manualData = {}, scrapedData = {}) {
  const painPoints = [];

  if (manualData.businessGoal) {
    painPoints.push(manualData.businessGoal);
  }

  const benefits = uniq(scrapedData?.benefits || []).slice(0, 4);
  for (const benefit of benefits) {
    const normalized = benefit.toLowerCase();
    if (normalized.includes("save time") || normalized.includes("faster")) {
      painPoints.push("Inefficient workflows that waste time");
    } else if (normalized.includes("reduce cost") || normalized.includes("pricing")) {
      painPoints.push("High operational or subscription costs");
    } else if (normalized.includes("increase") || normalized.includes("improve") || normalized.includes("boost")) {
      painPoints.push("Lack of measurable growth or performance tracking");
    } else if (normalized.includes("ats")) {
      painPoints.push("Poor resume visibility with applicant tracking systems");
    } else if (normalized.includes("professional")) {
      painPoints.push("Materials that look unprofessional or inconsistent");
    } else if (normalized.includes("quality") || normalized.includes("avoid typos")) {
      painPoints.push("Quality control issues in content or documents");
    } else if (normalized.includes("automation") || normalized.includes("workflow")) {
      painPoints.push("Manual processes that slow teams down");
    } else {
      painPoints.push(`Need a better way to ${normalized.replace(/\.+$/, "")}`);
    }
  }

  if (manualData.description && painPoints.length < 3) {
    const extra = manualData.description.match(/(?:struggle|need|problem|challenge|pain|friction)[^.]*\./gi) || [];
    extra.forEach(sentence => painPoints.push(sentence.trim()));
  }

  return uniq(painPoints).slice(0, 6);
}

function deduplicateUsers(users) {
  // Normalize and deduplicate target users
  const normalized = [];
  const seen = new Set();
  
  for (const user of users) {
    const lower = user.toLowerCase().trim();
    
    // Normalize similar variations
    let normalized_user = user;
    if (lower.includes("student")) normalized_user = "Students";
    else if (lower.includes("working professional") || lower.includes("professional")) normalized_user = "Working professionals";
    else if (lower.includes("enterprise")) normalized_user = "Enterprise teams";
    else if (lower.includes("startup")) normalized_user = "Startups";
    else if (lower.includes("freelance")) normalized_user = "Freelancers";
    else if (lower.includes("business")) normalized_user = "Business professionals";
    
    if (!seen.has(normalized_user.toLowerCase())) {
      seen.add(normalized_user.toLowerCase());
      normalized.push(normalized_user);
    }
  }
  
  return normalized;
}

function extractTargetUsers(manualData = {}, scrapedData = {}) {
  const users = [];
  
  // Use manual target audience first
  if (manualData.targetAudience) {
    const audienceParts = manualData.targetAudience.split(/,|;|\s+and\s+/).map(s => s.trim()).filter(Boolean);
    users.push(...audienceParts.slice(0, 3));
  }
  
  // Add inferred users from scraped content
  const cleanedText = (scrapedData?.cleanedText || "").toLowerCase();
  if (cleanedText.includes("student")) users.push("Students");
  if (cleanedText.includes("professional")) users.push("Working professionals");
  if (cleanedText.includes("enterprise")) users.push("Enterprise teams");
  if (cleanedText.includes("startup")) users.push("Startups");
  if (cleanedText.includes("freelance")) users.push("Freelancers");
  if (cleanedText.includes("job seeker")) users.push("Job seekers");
  
  return deduplicateUsers(users).slice(0, 5);
}

function extractCompetitors(manualData = {}, scrapedData = {}) {
  const competitors = [];
  
  // Use manual competitors first
  if (manualData.competitors) {
    const compParts = manualData.competitors.split(/,|;|\s+and\s+/).map(s => s.trim()).filter(Boolean);
    competitors.push(...compParts);
  }
  
  // Add inferred competitor types from scraped content
  if (scrapedData?.cleanedText || scrapedData?.heroText) {
    const text = (scrapedData.cleanedText || scrapedData.heroText || "").toLowerCase();
    if (text.includes("alternative") || text.includes("vs")) competitors.push("Direct competitors");
    if (text.includes("traditional")) competitors.push("Legacy solution providers");
    if (text.includes("ai") || text.includes("machine learning")) competitors.push("AI-powered alternatives");
  }
  
  return uniq(competitors).slice(0, 5);
}

function extractPricingPosition(manualData = {}, scrapedData = {}) {
  // Use manual pricing if provided
  if (manualData.pricing && manualData.pricing.length > 3) {
    return manualData.pricing;
  }
  
  // Use scraped pricing text
  if (scrapedData?.pricingText) {
    return scrapedData.pricingText;
  }
  
  // Default based on industry
  const industry = (manualData.industry || "").toLowerCase();
  if (industry.includes("enterprise")) return "Enterprise licensing with custom pricing";
  if (industry.includes("saas") || industry.includes("software")) return "Monthly/annual subscription";
  if (industry.includes("consumer")) return "Affordable consumer pricing";
  
  return "Competitive market pricing";
}

function extractMarketingAngles(manualData = {}, scrapedData = {}) {
  const angles = new Set();
  const features = uniq(scrapedData?.features || []).slice(0, 3);
  const benefits = uniq(scrapedData?.benefits || []).slice(0, 3);
  const ctas = uniq(scrapedData?.ctaText || []).slice(0, 2);

  if (features.length > 0) {
    angles.add(`Build around ${featureToMarketing(features[0]).toLowerCase()}`);
    if (features.length > 1) {
      angles.add(`Showcase ${featureToMarketing(features[1]).toLowerCase()} to drive adoption`);
    }
  }

  if (benefits.length > 0) {
    angles.add(`Lead with ${benefits[0].toLowerCase()} for buyer impact`);
    if (benefits.length > 1) {
      angles.add(`Position the solution as a way to ${benefits[1].toLowerCase()}`);
    }
  }

  if (ctas.length > 0) {
    const ctaLower = ctas[0].toLowerCase();
    if (ctaLower.includes("try") || ctaLower.includes("free")) {
      angles.add("Promote a low-risk free trial for new buyers");
    } else if (ctaLower.includes("build") || ctaLower.includes("create")) {
      angles.add("Sell speed and ease of use for busy teams");
    }
  }

  const usp = extractUSP(manualData, scrapedData);
  if (usp) {
    angles.add(`${usp}`);
  }

  if (manualData.industry && manualData.targetAudience) {
    angles.add(`Target ${manualData.targetAudience} within ${manualData.industry}`);
  }

  return Array.from(angles).slice(0, 6);
}

function extractRecommendedModules(manualData = {}, scrapedData = {}) {
  const modules = ["Market Sizing", "Audience Personas", "Campaign Templates", "SEO Audit"];
  
  // Customize based on industry
  const industry = (manualData.industry || "").toLowerCase();
  if (industry.includes("saas")) {
    return ["Market Sizing", "Competitor Analysis", "Pricing Strategy", "Customer Acquisition"];
  }
  if (industry.includes("ecommerce") || industry.includes("retail")) {
    return ["Market Sizing", "Customer Personas", "Campaign Templates", "SEO Strategy"];
  }
  if (industry.includes("service")) {
    return ["Service Positioning", "Client Personas", "Pricing Strategy", "Lead Generation"];
  }
  if (industry.includes("hr") || industry.includes("resume") || industry.includes("job")) {
    return ["Talent Market Analysis", "Candidate Personas", "Job Board Strategy", "Employer Branding"];
  }
  
  return modules;
}

function calculateConfidenceScore(manualData = {}, scrapedData = {}) {
  let score = 45; // lower baseline for honest confidence

  if (manualData.productName) score += 8;
  if (manualData.description && manualData.description.length > 40) score += 10;
  if (manualData.industry) score += 6;
  if (manualData.targetAudience) score += 6;
  if (manualData.competitors) score += 4;
  if (manualData.pricing) score += 4;

  if (scrapedData?.title) score += 6;
  if (scrapedData?.metaDescription) score += 5;
  if (scrapedData?.heroText) score += 6;

  const featureCount = scrapedData?.scrapeQuality?.featuresCount || 0;
  if (featureCount >= 3) score += 10;
  else if (featureCount === 2) score += 6;
  else if (featureCount === 1) score += 3;

  const benefitCount = scrapedData?.scrapeQuality?.benefitsCount || 0;
  if (benefitCount >= 2) score += 8;
  else if (benefitCount === 1) score += 4;

  if (scrapedData?.pricingText && scrapedData.pricingText.length > 10) score += 5;
  if ((scrapedData?.ctaText || []).length > 0) score += 4;

  const noiseLines = scrapedData?.scrapeQuality?.noisyLinesRemoved || 0;
  if (noiseLines >= 5) score -= 5;

  const source = scrapedData?.scrapeQuality?.source || scrapedData?.source || "";
  if (source === "cheerio") score = Math.min(score, 72);
  if (source === "jina" || source === "tavily") score = Math.min(score, 80);

  return Math.min(Math.max(score, 35), 92);
}

export async function generateProductAnalysis(manualData = {}, scrapedData = {}) {
  let aiResponse = null;
  let aiUsed = false;
  let analysisResult = null;

  try {
    if (scrapedData?.cleanedText || manualData.description) {
      const ai = await generateAnalysis({ manualData, scrapedData });
      analysisResult = ai.structured || null;
      // merge provider status and warnings into scrapedData for later persistence
      if (ai.providerStatus) {
        scrapedData = scrapedData || {};
        scrapedData.providerStatus = ai.providerStatus;
      }
      if (ai.warnings && ai.warnings.length > 0) {
        scrapedData = scrapedData || {};
        scrapedData.aiWarnings = ai.warnings;
      }
      aiUsed = Boolean(analysisResult);
    }
  } catch (error) {
    console.warn("AI analysis failed, falling back to heuristic analysis:", error.message);
  }

  const features = ensureArray(analysisResult?.features || scrapedData?.features || []);
  const benefits = ensureArray(analysisResult?.benefits || scrapedData?.benefits || []);
  const painPoints = ensurePainPoints(ensureArray(analysisResult?.painPoints || []), manualData, scrapedData);
  const buyerPersonas = extractBuyerPersonas(manualData, scrapedData).concat(ensureArray(analysisResult?.buyerPersonas || [])).slice(0, 5);
  const targetUsers = ensureArray(analysisResult?.targetUsers || extractTargetUsers(manualData, scrapedData));
  const competitorTypes = ensureArray(analysisResult?.competitorTypes || extractCompetitors(manualData, scrapedData));
  const marketingAngles = ensureArray(analysisResult?.marketingAngles || extractMarketingAngles(manualData, scrapedData)).slice(0, 6);
  const pricingPosition = analysisResult?.pricingPosition || extractPricingPosition(manualData, scrapedData);
  const marketMaturity = analysisResult?.marketMaturity || inferMarketMaturity(manualData, scrapedData);
  const category = analysisResult?.category || manualData.industry || "General Technology";
  const usp = ensureArray(analysisResult?.usp || [extractUSP(manualData, scrapedData)]);
  const productSummary = analysisResult?.productSummary || extractSummary(manualData, scrapedData);

  let confidenceScore = analysisResult?.confidenceScore ?? calculateConfidenceScore(manualData, scrapedData);
  if ((!benefits || benefits.length === 0) || (!painPoints || painPoints.length === 0)) {
    confidenceScore = Math.min(confidenceScore, 94);
  }
  confidenceScore = Math.max(40, Math.min(confidenceScore, 100));

  const dataSourcesUsed = [];
  if (manualData.websiteUrl) dataSourcesUsed.push("website scrape");
  if (manualData.description) dataSourcesUsed.push("manual description");
  if (manualData.targetAudience) dataSourcesUsed.push("manual audience");
  if (manualData.competitors) dataSourcesUsed.push("manual competitors");
  if (scrapedData?.scrapeQuality) dataSourcesUsed.push(`scraper: ${scrapedData.scrapeQuality.source || scrapedData.source || "unknown"}`);
  if (aiUsed) dataSourcesUsed.push("AI business intelligence");
  if (scrapedData?.providerStatus) dataSourcesUsed.push(`providers: ${Object.entries(scrapedData.providerStatus).map(([k,v])=>`${k}=${v}`).join(",")}`);

  const warnings = ensureArray(analysisResult?.warnings || []).concat(ensureArray(scrapedData?.aiWarnings || [])).slice(0,6);
  if (!manualData.description && (!scrapedData?.features || scrapedData.features.length === 0)) {
    warnings.push("Limited product detail available; insights are inferred from available website copy.");
  }
  if (scrapedData?.scrapeQuality?.source === "cheerio" && scrapedData?.scrapeQuality?.noisyLinesRemoved > 5) {
    warnings.push("Scraped website content contained navigational/noise text and was filtered for clarity.");
  }
  if (aiUsed && (!analysisResult || !analysisResult.productSummary)) {
    warnings.push("AI returned partial results; some fields may be inferred from fallback heuristics.");
  }

  return {
    productSummary: productSummary || "",
    category,
    usp,
    features,
    benefits,
    painPoints,
    buyerPersonas,
    targetUsers,
    competitorTypes,
    competitors: ensureArray(analysisResult?.competitors || []),
    marketingAngles,
    pricingPosition,
    marketMaturity,
    confidenceScore,
    dataSourcesUsed: uniq(dataSourcesUsed),
    warnings,
    scrapeQuality: scrapedData?.scrapeQuality || null,
    source: aiUsed ? "ai-biz-intelligence" : "analysis-engine",
  };
}
