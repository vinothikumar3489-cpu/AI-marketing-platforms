const extractJsonFromText = (content) => {
  if (!content || typeof content !== "string") return null;
  const jsonMatch = content.match(/\{[\s\S]*\}/m);
  if (!jsonMatch) return null;

  const candidate = jsonMatch[0]
    .replace(/\n/g, " ")
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]");

  try {
    return JSON.parse(candidate);
  } catch (error) {
    try {
      return JSON.parse(candidate.replace(/\"/g, '"'));
    } catch {
      return null;
    }
  }
};

const buildProductPrompt = ({ productName, manualDescription, targetAudience, industry, websiteTitle, websiteMeta, cleanedWebsiteText, researchSummary = "", websiteUrl = "", companyName = "", headings = [], features = [], benefits = [], evidenceContext = "" }) => {
  const evidenceSection = evidenceContext ? `\n\nEVIDENCE COLLECTED (real data from live scanning — use as factual context):\n${evidenceContext}` : "";

  return `You are a senior SaaS product marketing strategist. Analyze the product using manual details, scraped website data, and real-time research. Do not copy raw website text. Convert information into clean business insights. Always infer pain points, buyer personas, USP, benefits, and marketing angles. Return valid JSON only.${evidenceSection}

Product Name: ${productName}
Company Name: ${companyName || "N/A"}
Website URL: ${websiteUrl || "N/A"}
Industry: ${industry || "General SaaS"}
Target Audience: ${targetAudience || "Professionals"}
Manual Description: ${manualDescription || "N/A"}
Website Title: ${websiteTitle || "N/A"}
Website Meta Description: ${websiteMeta || "N/A"}
Website Headings: ${headings.length > 0 ? headings.slice(0, 10).join(" | ") : "N/A"}
Extracted Features: ${features.length > 0 ? features.join(" | ") : "N/A"}
Extracted Benefits: ${benefits.length > 0 ? benefits.join(" | ") : "N/A"}

Research Evidence (summarize external research, competitor signals, market cues):
${researchSummary || "None"}

Cleaned Website Content (use as evidence only, do not copy):
${cleanedWebsiteText || "N/A"}

Return JSON only with the exact keys below. Use null for missing values, never invent non-empty values:
{
  "productSummary":"",
  "category":"",
  "confidenceScore":null,
  "usp":null,
  "features":[],
  "benefits":[],
  "painPoints":[],
  "targetUsers":[],
  "buyerPersonas":[],
  "competitorTypes":[],
  "competitors":[],
  "pricingPosition":null,
  "marketMaturity":null,
  "marketingAngles":[],
  "seoOpportunities":[],
  "campaignIdeas":[],
  "recommendedModules":[],
  "dataSourcesUsed":[],
  "warnings":[],
  "tam":null,
  "sam":null,
  "som":null,
  "cagr":null,
  "growthRate":null,
  "marketTrends":[],
  "growthOpportunities":[],
  "marketGaps":[],
  "competitorWeaknesses":[],
  "differentiationOpportunities":[],
  "bestChannels":[],
  "channelReasoning":null,
  "channelPriority":null,
  "channelExpectedOutcome":null,
  "executiveStory":null,
  "actionPlan":null
}

Use professional marketing language. Output valid JSON only — no markdown, no explanation, no commentary.`.trim();
};

const parseOpenAIResponse = async (response) => {
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.text;
  if (!content) {
    throw new Error("OpenAI response missing content");
  }
  return content;
};

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return extractJsonFromText(value);
  }
};

export const generateAnalysis = async ({ manualData = {}, scrapedData = {}, evidenceContext = "" } = {}) => {
  const openAiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const tavilyKey = process.env.TAVILY_API_KEY;

  // Attempt Tavily research for competitor and market signals
  let researchSummary = "";
  const providerStatus = { tavily: "skipped", openai: "skipped", gemini: "skipped" };
  const warnings = [];

  if (tavilyKey) {
    try {
      // Placeholder Tavily API call - expected to return short research summary
      const tavilyResp = await fetch(process.env.TAVILY_API_URL || "https://api.tavily.com/v1/research", {
        method: "POST",
        headers: { Authorization: `Bearer ${tavilyKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query: `${manualData.productName || "Product"} ${manualData.industry || ""} competitors market overview`, limit: 6 }),
      });
      if (tavilyResp.ok) {
        const tavilyJson = await tavilyResp.json();
        researchSummary = (tavilyJson.summary || tavilyJson.data || JSON.stringify(tavilyJson)).toString().slice(0, 2000);
        providerStatus.tavily = "success";
      } else {
        providerStatus.tavily = `failed:${tavilyResp.status}`;
        warnings.push("Tavily research failed or returned non-OK status.");
      }
    } catch (err) {
      providerStatus.tavily = "failed:exception";
      warnings.push("Tavily research exception: " + (err.message || "unknown"));
    }
  } else {
    providerStatus.tavily = "missing_key";
  }

  const prompt = buildProductPrompt({
    productName: manualData.productName || "Product",
    manualDescription: manualData.description || "",
    targetAudience: manualData.targetAudience || "",
    industry: manualData.industry || "",
    websiteTitle: scrapedData?.title || "",
    websiteMeta: scrapedData?.metaDescription || "",
    cleanedWebsiteText: scrapedData?.cleanedText || "",
    researchSummary,
    websiteUrl: scrapedData?.websiteUrl || "",
    companyName: manualData.companyName || "",
    evidenceContext,
    headings: scrapedData?.headings || [],
    features: scrapedData?.features || [],
    benefits: scrapedData?.benefits || [],
  });

  // If no OpenAI API key, provide heuristic fallback
  if (!openAiKey) {
    providerStatus.openai = "missing_key";
    const fallback = {
      productSummary: manualData.productName || "Analysis not available",
      category: manualData.industry || null,
      confidenceScore: null,
      usp: null,
      features: scrapedData?.features || [],
      benefits: scrapedData?.benefits || [],
      painPoints: [],
      buyerPersonas: [],
      targetUsers: (manualData.targetAudience || "").split(/,|;|\s+and\s+/).map((v) => v.trim()).filter(Boolean),
      competitorTypes: [],
      competitors: [],
      marketingAngles: [],
      pricingPosition: null,
      marketMaturity: null,
      seoOpportunities: [],
      campaignIdeas: [],
      recommendedModules: [],
      dataSourcesUsed: [],
      warnings: ["AI key not configured. No analysis generated."],
      tam: null,
      sam: null,
      som: null,
      cagr: null,
      growthRate: null,
      marketTrends: [],
      growthOpportunities: [],
      marketGaps: [],
      competitorWeaknesses: [],
      differentiationOpportunities: [],
      bestChannels: [],
      channelReasoning: null,
      channelPriority: null,
      channelExpectedOutcome: null,
      executiveStory: null,
      actionPlan: null,
    };

    return { message: "heuristic", structured: fallback, providerStatus, warnings };
  }

  const analysisSchema = z.object({
    productSummary: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    confidenceScore: z.number().nullable().optional(),
    usp: z.string().nullable().optional(),
    features: z.array(z.string()).optional(),
    benefits: z.array(z.string()).optional(),
    painPoints: z.array(z.string()).optional(),
    buyerPersonas: z.array(z.string()).optional(),
    targetUsers: z.array(z.string()).optional(),
    competitorTypes: z.array(z.string()).optional(),
    competitors: z.array(z.string()).optional(),
    marketingAngles: z.array(z.string()).optional(),
    pricingPosition: z.string().nullable().optional(),
    marketMaturity: z.string().nullable().optional(),
    seoOpportunities: z.array(z.string()).optional(),
    campaignIdeas: z.array(z.string()).optional(),
    recommendedModules: z.array(z.string()).optional(),
    dataSourcesUsed: z.array(z.string()).optional(),
    tam: z.string().nullable().optional(),
    sam: z.string().nullable().optional(),
    som: z.string().nullable().optional(),
    cagr: z.string().nullable().optional(),
    growthRate: z.string().nullable().optional(),
    marketTrends: z.array(z.string()).optional(),
    growthOpportunities: z.array(z.string()).optional(),
    marketGaps: z.array(z.string()).optional(),
    competitorWeaknesses: z.array(z.string()).optional(),
    differentiationOpportunities: z.array(z.string()).optional(),
    bestChannels: z.array(z.string()).optional(),
    channelReasoning: z.string().nullable().optional(),
    channelPriority: z.string().nullable().optional(),
    channelExpectedOutcome: z.string().nullable().optional(),
    executiveStory: z.string().nullable().optional(),
    actionPlan: z.string().nullable().optional(),
  });

  try {
    const aiResponse = await aiOrchestrator.generateCompletion({
      userId: "system",
      chatId: "system",
      prompt,
      systemPrompt: "You are a senior SaaS product marketing strategist. Analyze products and return JSON only.",
      preferredProvider: 'openai',
      model: 'gpt-4o',
      schema: analysisSchema
    });

    return { 
      message: aiResponse.provider, 
      structured: aiResponse.data, 
      providerStatus: { [aiResponse.provider]: "success" }, 
      warnings 
    };
  } catch (err) {
    warnings.push("AI Orchestrator failed: " + (err.message || "unknown"));
  }

  // If all AI failed, return structured result with warnings
  const fallbackStructured = {
    productSummary: manualData.productName || "Analysis not available",
    category: manualData.industry || null,
    confidenceScore: null,
    usp: null,
    features: scrapedData?.features || [],
    benefits: scrapedData?.benefits || [],
    painPoints: [],
    buyerPersonas: [],
    targetUsers: (manualData.targetAudience || "").split(/,|;|\s+and\s+/).map((v) => v.trim()).filter(Boolean),
    competitorTypes: [],
    competitors: [],
    marketingAngles: [],
    pricingPosition: null,
    marketMaturity: null,
    seoOpportunities: [],
    campaignIdeas: [],
    recommendedModules: [],
    dataSourcesUsed: [],
    warnings,
    tam: null,
    sam: null,
    som: null,
    cagr: null,
    growthRate: null,
    marketTrends: [],
    growthOpportunities: [],
    marketGaps: [],
    competitorWeaknesses: [],
    differentiationOpportunities: [],
    bestChannels: [],
    channelReasoning: null,
    channelPriority: null,
    channelExpectedOutcome: null,
    executiveStory: null,
    actionPlan: null,
  };

  return { message: "fallback", structured: fallbackStructured, providerStatus, warnings };
};
