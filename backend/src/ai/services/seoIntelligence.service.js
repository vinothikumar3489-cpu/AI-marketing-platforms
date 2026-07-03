
import { prisma } from "../../config/prisma.js";
import { scrapeWebsite } from "../../services/scraper.service.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const GEMINI_API_URL = process.env.GEMINI_API_URL || "https://generativelanguage.googleapis.com/v1beta/models";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const PAGESPEED_API_KEY = process.env.PAGESPEED_API_KEY || "";
const PAGESPEED_API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

function extractJsonFromText(text) {
  if (!text || typeof text !== "string") return null;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.warn("Failed to parse JSON from AI response:", e.message);
    return null;
  }
}

function buildPrompt(inputData, scrapedData, pageSpeedScore = 0) {
  const { productName, targetKeywords } = inputData;
  const scrapedText = JSON.stringify(scrapedData || {}).slice(0, 2500);

  return `You are a Senior SEO Analyst. Analyze the website and provide comprehensive SEO insights.

PRODUCT DETAILS:
- Product Name: ${productName}
- Target Keywords: ${targetKeywords || ""}

SCRAPED WEBSITE DATA (TRIMMED):
${scrapedText}

PAGESPEED SCORE (out of 100):
${pageSpeedScore}

Return ONLY a valid JSON object with these exact fields (no markdown, no extra text):
{
  "seoScore": 0,
  "pageSpeedScore": ${pageSpeedScore},
  "metaTitleAnalysis": "",
  "metaDescriptionAnalysis": "",
  "headingStructure": [],
  "keywordSuggestions": [],
  "technicalSeoIssues": [],
  "contentImprovementIdeas": [],
  "backlinkAuthorityNotes": "",
  "priorityFixes": [],
  "finalRecommendation": ""
}

Ensure all arrays have at least 3 items. Return ONLY valid JSON.`;
}

function getRuleBasedFallback(inputData, pageSpeedScore = 0) {
  return {
    hasVerifiedData: false,
    confidenceScore: 0,
    provider: 'fallback_evidence',
    pageSpeedScore: pageSpeedScore || 0,
    warnings: ['Module: Insufficient verified data - AI providers unavailable'],
    dataSources: [],
    note: 'No verified SEO intelligence data available'
  };
}

async function getPageSpeedScore(url) {
  try {
    if (!PAGESPEED_API_KEY) {
      console.warn("⚠️ PAGESPEED_API_KEY not found, returning null");
      return null;
    }
    const response = await fetch(
      `${PAGESPEED_API_URL}?url=${encodeURIComponent(url)}&key=${PAGESPEED_API_KEY}&category=SEO&strategy=DESKTOP`
    );
    if (!response.ok) {
      throw new Error(`PageSpeed API error: ${response.status}`);
    }
    const data = await response.json();
    return Math.round(
      (data.lighthouseResult?.categories?.seo?.score || 0) * 100
    );
  } catch (e) {
    console.warn("⚠️ PageSpeed API failed:", e.message);
    return null;
  }
}

async function callGemini(prompt) {
  if (!GEMINI_API_KEY) {
    console.log("⚠️ GEMINI_API_KEY not found");
    return { success: false };
  }
  try {
    console.log("🤖 Calling Gemini API for SEO Intelligence...");
    const response = await fetch(`${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 2000,
          temperature: 0.4
        }
      })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.warn("❌ Gemini API error:", response.status, errorData);
      return { success: false };
    }
    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      console.warn("❌ Gemini response missing content");
      return { success: false };
    }
    const parsed = extractJsonFromText(content);
    if (!parsed) {
      console.warn("❌ Failed to parse JSON from Gemini response");
      return { success: false };
    }
    console.log("✅ Gemini API successful for SEO Intelligence");
    return { success: true, data: parsed, provider: "gemini" };
  } catch (e) {
    console.warn("❌ Gemini API failed:", e.message);
    return { success: false };
  }
}

async function callGroq(prompt) {
  if (!GROQ_API_KEY) {
    console.log("⚠️ GROQ_API_KEY not found");
    return { success: false };
  }
  try {
    console.log("🤖 Calling Groq API for SEO Intelligence...");
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2000,
        temperature: 0.4
      })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.warn("❌ Groq API error:", response.status, errorData);
      return { success: false };
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.warn("❌ Groq response missing content");
      return { success: false };
    }
    const parsed = extractJsonFromText(content);
    if (!parsed) {
      console.warn("❌ Failed to parse JSON from Groq response");
      return { success: false };
    }
    console.log("✅ Groq API successful for SEO Intelligence");
    return { success: true, data: parsed, provider: "groq" };
  } catch (e) {
    console.warn("❌ Groq API failed:", e.message);
    return { success: false };
  }
}

export async function generateSeoIntelligence(inputData) {
  const { websiteUrl } = inputData;
  let scrapedData = null;
  let pageSpeedScore = 0;

  // Step 1: Scrape website
  if (websiteUrl) {
    try {
      console.log("🔍 Scraping website for SEO...");
      scrapedData = await scrapeWebsite(websiteUrl);
    } catch (e) {
      console.warn("⚠️ Failed to scrape website:", e.message);
    }
  }

  // Step 2: Get PageSpeed score
  if (websiteUrl) {
    try {
      console.log("🔍 Fetching PageSpeed score...");
      pageSpeedScore = await getPageSpeedScore(websiteUrl);
    } catch (e) {
      console.warn("⚠️ Failed to fetch PageSpeed score:", e.message);
      pageSpeedScore = null;
    }
  }

  // Step 3: Build prompt
  const prompt = buildPrompt(inputData, scrapedData, pageSpeedScore);
  console.log("📝 SEO Intelligence prompt size (chars):", prompt.length);

  // Step 4: Call AI providers in order
  let result = await callGemini(prompt);
  if (!result.success) {
    console.log("🔄 Falling back to Groq for SEO Intelligence...");
    result = await callGroq(prompt);
  }
  if (!result.success) {
    console.log("⚠️ AI providers unavailable for SEO Intelligence...");
    result = { success: true, data: getRuleBasedFallback(inputData, pageSpeedScore), provider: "fallback_evidence", fallbackUsed: true };
  } else {
    result.fallbackUsed = false;
    // Ensure pageSpeedScore matches
    result.data.pageSpeedScore = pageSpeedScore;
  }

  return result;
}

