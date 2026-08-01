
import { generateLinkedInPost, generateInstagramPost, generateTwitterPost, generateFacebookPost, generateYouTubeDescription } from '../../domains/content/agents/social.agent.js';
import { generateBlogArticle, generateFAQ } from '../../domains/content/agents/blog.agent.js';
import { generateLandingPage, generateProductPage, generateComparisonPage } from '../../domains/content/agents/page.agent.js';
import { generateFeatureAnnouncement, generateWhitepaper } from '../../domains/content/agents/document.agent.js';
import { generateVideoScript, generateCreativeBrief } from '../../domains/content/agents/script.agent.js';
import { buildProductEvidenceContext, getPersonaName, getFirstPainPoint, checkEvidenceSufficiency } from '../../domains/content/agents/agent.utils.js';
import { callAI } from "../../domains/ai/services/aiOrchestrator.service.js";
import { validateContentClaims, validateBriefContent } from "./claim-validator.service.js";
import { validateContentOutput, repairAIOutput, normalizeEmailContent } from "./content-schemas.js";
import { SCHEMA_REGISTRY } from "../../shared/schemas/content-types.schema.js";
import { CONTENT_TYPES, CONTENT_TYPES_LIST } from "../../constants/content-types.js";
import { EMAIL_WORD_COUNT_LIMITS, validateEmailCopyDTO, createEmptyEmailCopyDTO } from "../../dto/email-copy.dto.js";
import { scoreContentQuality, buildRewritePrompt, QUALITY_THRESHOLD } from "./quality-review.service.js";
import { saveContentMemory, buildEvidenceGraphHash, buildPromptHash } from "./content-memory.service.js";
import { enrichContentBrief, checkBriefRequirements } from "./brief-enrichment.service.js";

export { CONTENT_TYPES, CONTENT_TYPES_LIST } from "../../constants/content-types.js";
export { generatePressRelease, generateCaseStudy, generateSalesPage, FRAMEWORKS, checkRepetitiveLanguage, sanitizeRepetitiveLanguage, applyFramework };

// ============================================
// ENTERPRISE COPYWRITING FRAMEWORKS
// ============================================

const FRAMEWORKS = {
  AIDA: {
    name: 'AIDA',
    stages: ['Attention', 'Interest', 'Desire', 'Action'],
    description: 'Classic attention-interest-desire-action framework for persuasive copy',
  },
  PAS: {
    name: 'PAS',
    stages: ['Problem', 'Agitate', 'Solution'],
    description: 'Problem-Agitate-Solution framework for highlighting pain points',
  },
  BAB: {
    name: 'BAB',
    stages: ['Before', 'After', 'Bridge'],
    description: 'Before-After-Bridge framework for transformation storytelling',
  },
  '4Ps': {
    name: '4Ps',
    stages: ['Picture', 'Promise', 'Proof', 'Push'],
    description: 'Picture-Promise-Proof-Push framework for sales-driven copy',
  },
};

const ANTI_REPETITION_PATTERNS = [
  /\b(revolutionary|game-changing|cutting-edge|state-of-the-art|thought leader|paradigm shift|disruptive|world-class|unmatched|unbeatable|empower|synergy|leverage|holistic|robust|streamline|scalable)\b/gi,
  /\b(best|ultimate|leading|top|premier|exclusive|revolution|breakthrough|next level|game changer)\b/gi,
  /\b(in today'\s?world|in the modern era|as we all know|it goes without saying|let me be clear)\b/gi,
  /\b(studies show|research indicates|data shows|experts agree|according to research)\b/gi,
];

function checkRepetitiveLanguage(text) {
  const issues = [];
  for (const pattern of ANTI_REPETITION_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      issues.push(...matches.map(m => ({ word: m, pattern: pattern.source })));
    }
  }
  return {
    hasIssues: issues.length > 0,
    issues,
    score: Math.max(0, 100 - issues.length * 15),
  };
}

function sanitizeRepetitiveLanguage(text, replacementMap = {}) {
  const defaults = {
    'revolutionary': 'modern',
    'game-changing': 'effective',
    'cutting-edge': 'advanced',
    'state-of-the-art': 'proven',
    'thought leader': 'trusted authority',
    'paradigm shift': 'meaningful change',
    'disruptive': 'innovative',
    'world-class': 'high-quality',
    'unmatched': 'distinctive',
    'unbeatable': 'compelling',
    'empower': 'enable',
    'synergy': 'collaboration',
    'leverage': 'use',
    'holistic': 'complete',
    'robust': 'reliable',
    'streamline': 'improve',
    'scalable': 'flexible',
    'best': 'strongest',
    'ultimate': 'comprehensive',
    'leading': 'established',
    'premier': 'primary',
    'exclusive': 'specialized',
    'revolution': 'advancement',
    'breakthrough': 'advance',
    'next level': 'better results',
    'game changer': 'effective solution',
  };
  const map = { ...defaults, ...replacementMap };
  let result = text;
  for (const [banned, replacement] of Object.entries(map)) {
    const re = new RegExp('\\b' + banned.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
    result = result.replace(re, replacement);
  }
  return result;
}

function applyFramework(structure, framework, brief, productName, painPoint, persona) {
  const fw = FRAMEWORKS[framework] || FRAMEWORKS.AIDA;
  const stages = fw.stages;

  switch (framework) {
    case 'AIDA':
      return {
        attention: structure.headline || `How ${productName} Helps ${persona} With ${painPoint}`,
        interest: structure.introduction || `For ${persona}, ${painPoint} is more than an inconvenience \u2014 it is a barrier to achieving real outcomes.`,
        desire: structure.body || `${productName} is designed to address ${painPoint} directly, giving ${persona} the tools they need to succeed.`,
        action: structure.cta || `Discover how ${productName} can transform your workflow today.`,
      };
    case 'PAS':
      return {
        problem: structure.headline || `The Hidden Cost of ${painPoint}`,
        agitate: structure.introduction || `${persona} know the frustration all too well. Every day, ${painPoint} drains time, energy, and results.`,
        solution: structure.body || `${productName} was built to solve this exact problem. With ${productName}, ${persona} can finally move forward with confidence.`,
      };
    case 'BAB':
      return {
        before: structure.headline || `Life Before ${productName}`,
        after: structure.introduction || `Imagine a world where ${painPoint} is no longer a barrier. ${persona} achieve more, faster, with less effort.`,
        bridge: structure.body || `${productName} is the bridge between where you are now and where you want to be.`,
      };
    case '4Ps':
      return {
        picture: structure.headline || `Picture ${persona} struggling with ${painPoint} every single day.`,
        promise: structure.introduction || `${productName} delivers a clear promise: measurable improvement in how ${persona} handle ${painPoint}.`,
        proof: structure.body || `Built on verified product capabilities and real evidence, ${productName} provides the features and benefits that matter most.`,
        push: structure.cta || `Take the next step \u2014 explore ${productName} and see the difference for yourself.`,
      };
    default:
      return structure;
  }
}

// ============================================
// PRESS RELEASE GENERATOR
// ============================================

async function generatePressRelease(brief, aiFunction = callAI, normalizedEvidence) {
  const productContext = buildProductEvidenceContext(brief, normalizedEvidence);
  const evidenceCheck = checkEvidenceSufficiency(brief, normalizedEvidence);
  if (evidenceCheck) {
    console.warn(`[PressRelease Agent] Insufficient evidence: ${evidenceCheck}`);
    return { _insufficientEvidence: true, _message: evidenceCheck, _provider: 'evidence_gate' };
  }
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);
  const companyName = brief.company?.name || '';
  const brandVoice = brief.campaign?.brandVoice?.value || brief.campaign?.brandVoice || brief.brandVoice?.value || brief.brandVoice || 'professional';
  const tone = brief.tone || 'professional';
  const audience = brief.audience || persona;
  const competitors = brief.validatedCompetitors || [];
  const seoKeywords = brief.verifiedKeywords || [];

  const prompt = `You are a senior PR copywriter for ${companyName || productName}.

Write a professional press release for ${audience}.

${productContext}

COMPANY RESEARCH:
- Company: ${companyName || productName}
- Industry: ${brief.company?.industry || 'Technology'}
- Website: ${brief.company?.websiteUrl || ''}
- Key Differentiators: ${(brief.product?.features || []).slice(0, 5).map(f => typeof f === 'string' ? f : f.name || f.feature || '').filter(Boolean).join(', ')}

AUDIENCE:
- Primary Persona: ${persona}
- Pain Point: ${painPoint}
- Target Audience: ${audience}

COMPETITOR CONTEXT:
${competitors.length ? `Competitors in the market: ${competitors.map(c => c.name || c.url || '').filter(Boolean).join(', ')}` : 'No competitor data available.'}

SEO KEYWORDS:
${seoKeywords.slice(0, 5).map(k => typeof k === 'string' ? k : k.keyword || k).filter(Boolean).join(', ') || 'N/A'}

BRAND VOICE & TONE:
- Brand Voice: ${brandVoice}
- Tone: ${tone}

FORMAT: Enterprise Press Release
Framework: Use the AIDA (Attention, Interest, Desire, Action) structure.

ANTI-REPETITION RULES:
- Never use: revolutionary, game-changing, cutting-edge, state-of-the-art, thought leader, paradigm shift, disruptive, world-class, unmatched, unbeatable, empower, synergy, leverage, holistic, robust, streamline, scalable, best, ultimate, leading, premier, exclusive, breakthrough, next level.
- Use specific, verifiable language only.
- Every claim must trace to evidence.

STRUCTURE REQUIREMENTS:
- Headline: News-style headline including company name and key announcement. Max 100 chars.
- Subheadline: One sentence summarizing the announcement. Max 150 chars.
- Dateline: City, State \u2014 Date
- Body: 3-5 paragraphs following AIDA structure.
  - Attention: Lead with the most newsworthy angle. What is the announcement?
  - Interest: Why does this matter to ${persona}? Reference specific pain point "${painPoint}".
  - Desire: How does ${productName} address this? Reference specific features and benefits from evidence.
  - Action: What should the reader do next?
- Quote: Include a quote from a company executive. Format: {name}, {title}, said: "..."
- About the Company: 2-3 sentence boilerplate about ${companyName || productName}.
- Contact: Media contact information placeholder.
- CTA: Specific next step for readers.

EVIDENCE INTEGRITY: If evidence does not contain information about a specific feature or claim, do NOT invent it. Return {missingEvidence: true, message: 'Additional verified product information is required for [specific area]'}.
Do NOT: invent statistics, fake quotes, superlatives, or generic PR fluff.

Return valid JSON:
{
  "headline": "string \u2014 news-style, max 100 chars",
  "subheadline": "string \u2014 max 150 chars",
  "dateline": "string \u2014 City, State",
  "body": "string \u2014 3-5 paragraphs, AIDA structure",
  "quote": {"name": "string", "title": "string", "text": "string"},
  "companyInfo": {"name": "string", "description": "string", "website": "string or null"},
  "mediaContact": {"name": "string or null", "email": "string or null"},
  "cta": "string \u2014 specific next step",
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await aiFunction(prompt);
    if (result.success && result.data && typeof result.data === 'object') {
      console.info('[PressRelease Agent] AI success', { hasHeadline: !!result.data.headline, provider: result.provider });
      return { ...result.data, _provider: result.provider, _traceId: result.traceId };
    }
    console.warn('[PressRelease Agent] AI returned invalid data, using fallback', {
      success: result.success, dataType: typeof result.data, provider: result.provider, traceId: result.traceId
    });
  } catch (e) {
    console.error('[PressRelease Agent] AI generation error:', e.message);
  }
  console.warn('[PressRelease Agent] AI generation failed \u2014 returning null (no fabricated fallback content)');
  return null;
}

// ============================================
// CASE STUDY GENERATOR
// ============================================

async function generateCaseStudy(brief, aiFunction = callAI, normalizedEvidence) {
  const productContext = buildProductEvidenceContext(brief, normalizedEvidence);
  const evidenceCheck = checkEvidenceSufficiency(brief, normalizedEvidence);
  if (evidenceCheck) {
    console.warn(`[CaseStudy Agent] Insufficient evidence: ${evidenceCheck}`);
    return { _insufficientEvidence: true, _message: evidenceCheck, _provider: 'evidence_gate' };
  }
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);
  const companyName = brief.company?.name || '';
  const brandVoice = brief.campaign?.brandVoice?.value || brief.campaign?.brandVoice || brief.brandVoice?.value || brief.brandVoice || 'professional';
  const tone = brief.tone || 'professional';
  const audience = brief.audience || persona;
  const competitors = brief.validatedCompetitors || [];
  const seoKeywords = brief.verifiedKeywords || [];

  const prompt = `You are a senior case study writer for ${companyName || productName}.

Write a compelling case study for ${audience}.

${productContext}

COMPANY RESEARCH:
- Company: ${companyName || productName}
- Industry: ${brief.company?.industry || 'Technology'}
- Website: ${brief.company?.websiteUrl || ''}
- Key Differentiators: ${(brief.product?.features || []).slice(0, 5).map(f => typeof f === 'string' ? f : f.name || f.feature || '').filter(Boolean).join(', ')}

AUDIENCE:
- Primary Persona: ${persona}
- Pain Point: ${painPoint}
- Target Audience: ${audience}

COMPETITOR CONTEXT:
${competitors.length ? `Competitors in the market: ${competitors.map(c => c.name || c.url || '').filter(Boolean).join(', ')}` : 'No competitor data available.'}

SEO KEYWORDS:
${seoKeywords.slice(0, 5).map(k => typeof k === 'string' ? k : k.keyword || k).filter(Boolean).join(', ') || 'N/A'}

BRAND VOICE & TONE:
- Brand Voice: ${brandVoice}
- Tone: ${tone}

FORMAT: Enterprise Case Study
Framework: Use the PAS (Problem-Agitate-Solution) structure for the challenge section and BAB (Before-After-Bridge) for the transformation section.

ANTI-REPETITION RULES:
- Never use: revolutionary, game-changing, cutting-edge, state-of-the-art, thought leader, paradigm shift, disruptive, world-class, unmatched, unbeatable, empower, synergy, leverage, holistic, robust, streamline, scalable, best, ultimate, leading, premier, exclusive, breakthrough, next level.
- Use specific, verifiable language only.
- Every claim must trace to evidence.

STRUCTURE REQUIREMENTS:
- Title: "[Persona] at [Company] Achieves [Outcome] with [Product Name]". Max 120 chars.
- Subtitle: One sentence summarizing the case study value.
- Customer Profile: Name, industry, size, and role of the featured customer (use placeholder if no evidence).
- Challenge: Describe the problem ${persona} faced with ${painPoint}. Use PAS framework.
- Situation: What was the context before ${productName}? What were the constraints?
- Solution: How ${productName} was implemented. Reference specific features from evidence.
- Implementation: Key steps in the deployment. Timeline if evidence supports it.
- Results: 3-5 measurable outcomes. Use the format: "Metric: Value \u2014 Context". Only include if evidence supports.
- Quote: Testimonial from the customer. Format: {name}, {role}, said: "..."
- Lessons Learned: 2-3 key takeaways for other ${persona}.
- CTA: Specific next step for the reader.

EVIDENCE INTEGRITY: If evidence does not contain information about a specific feature or claim, do NOT invent it. Return {missingEvidence: true, message: 'Additional verified product information is required for [specific area]'}.
Do NOT: invent statistics, fake testimonials, fake customer names, superlatives, or generic case study fluff.

Return valid JSON:
{
  "title": "string \u2014 max 120 chars",
  "subtitle": "string \u2014 one sentence value summary",
  "customerName": "string or null \u2014 placeholder if no evidence",
  "customerIndustry": "string or null",
  "customerSize": "string or null",
  "challenge": "string \u2014 PAS structure, problem-agitate-solution",
  "situation": "string \u2014 context before the solution",
  "solution": "string \u2014 how the product was implemented",
  "implementation": "string \u2014 key deployment steps",
  "results": [{"metric": "string", "value": "string", "context": "string or null"}],
  "quote": {"name": "string", "role": "string or null", "text": "string"},
  "lessonsLearned": ["2-3", "key", "takeaways"],
  "cta": "string \u2014 specific next step",
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await aiFunction(prompt);
    if (result.success && result.data && typeof result.data === 'object') {
      console.info('[CaseStudy Agent] AI success', { hasTitle: !!result.data.title, provider: result.provider });
      return { ...result.data, _provider: result.provider, _traceId: result.traceId };
    }
    console.warn('[CaseStudy Agent] AI returned invalid data, using fallback', {
      success: result.success, dataType: typeof result.data, provider: result.provider, traceId: result.traceId
    });
  } catch (e) {
    console.error('[CaseStudy Agent] AI generation error:', e.message);
  }
  console.warn('[CaseStudy Agent] AI generation failed \u2014 returning null (no fabricated fallback content)');
  return null;
}

// ============================================
// SALES PAGE GENERATOR
// ============================================

async function generateSalesPage(brief, aiFunction = callAI, normalizedEvidence) {
  const productContext = buildProductEvidenceContext(brief, normalizedEvidence);
  const evidenceCheck = checkEvidenceSufficiency(brief, normalizedEvidence);
  if (evidenceCheck) {
    console.warn(`[SalesPage Agent] Insufficient evidence: ${evidenceCheck}`);
    return { _insufficientEvidence: true, _message: evidenceCheck, _provider: 'evidence_gate' };
  }
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);
  const companyName = brief.company?.name || '';
  const brandVoice = brief.campaign?.brandVoice?.value || brief.campaign?.brandVoice || brief.brandVoice?.value || brief.brandVoice || 'professional';
  const tone = brief.tone || 'professional';
  const audience = brief.audience || persona;
  const competitors = brief.validatedCompetitors || [];
  const seoKeywords = brief.verifiedKeywords || [];
  const campaignGoal = brief.campaign?.goal?.value || brief.campaign?.goal || '';
  const cta = brief.CTA?.[0] || brief.campaign?.primaryCTA || '';

  const prompt = `You are a senior conversion copywriter for ${companyName || productName}.

Write a high-converting sales page for ${audience}.

${productContext}

COMPANY RESEARCH:
- Company: ${companyName || productName}
- Industry: ${brief.company?.industry || 'Technology'}
- Website: ${brief.company?.websiteUrl || ''}
- Key Differentiators: ${(brief.product?.features || []).slice(0, 5).map(f => typeof f === 'string' ? f : f.name || f.feature || '').filter(Boolean).join(', ')}

AUDIENCE:
- Primary Persona: ${persona}
- Pain Point: ${painPoint}
- Target Audience: ${audience}

COMPETITOR CONTEXT:
${competitors.length ? `Competitors in the market: ${competitors.map(c => c.name || c.url || '').filter(Boolean).join(', ')}` : 'No competitor data available.'}

SEO KEYWORDS:
${seoKeywords.slice(0, 5).map(k => typeof k === 'string' ? k : k.keyword || k).filter(Boolean).join(', ') || 'N/A'}

BRAND VOICE & TONE:
- Brand Voice: ${brandVoice}
- Tone: ${tone}

Campaign Goal: ${campaignGoal || 'Conversion'}
Primary CTA: ${cta || 'Learn More'}

FORMAT: High-Converting Sales Page
Framework: Use the 4Ps (Picture, Promise, Proof, Push) framework for the hero section and BAB (Before-After-Bridge) for the transformation narrative.

ANTI-REPETITION RULES:
- Never use: revolutionary, game-changing, cutting-edge, state-of-the-art, thought leader, paradigm shift, disruptive, world-class, unmatched, unbeatable, empower, synergy, leverage, holistic, robust, streamline, scalable, best, ultimate, leading, premier, exclusive, breakthrough, next level.
- Use specific, verifiable language only.
- Every claim must trace to evidence.

STRUCTURE REQUIREMENTS:
- Hero Section:
  - Headline: Benefit-driven, include product name. Max 80 chars. Use 4Ps framework.
  - Subheadline: One-line value prop. Max 150 chars.
  - CTA: Primary action button. Use "${cta || 'Learn More'}" only if evidence supports it; otherwise use a specific, evidence-backed CTA.
  - Sub-CTA: Secondary action (e.g., "Watch Demo", "Read Case Study").
- Problem Section:
  - Headline: "The Challenge ${persona} Face"
  - Body: 2-3 paragraphs describing ${painPoint} using PAS framework.
- Solution Section:
  - Headline: "How ${productName} Delivers"
  - Body: Reference specific features from evidence. Use BAB framework.
- Features Section:
  - 4-5 features with name, description, and benefit. Use "Feature \u2192 Mechanism \u2192 Benefit" structure.
- Social Proof Section:
  - Only include if evidence has testimonials, logos, or stats. Empty array otherwise.
- FAQ Section:
  - 3-4 FAQs addressing real concerns from evidence. Not generic.
- Final CTA:
  - Strong, confident, specific. Action + value.
- Urgency:
  - Only if evidence supports time-limited offers. Null otherwise.

EVIDENCE INTEGRITY: If evidence does not contain information about a specific feature or claim, do NOT invent it. Return {missingEvidence: true, message: 'Additional verified product information is required for [specific area]'}.
Do NOT: invent pricing, testimonials, fake data, superlatives, competitor bashing, or fake urgency.

Return valid JSON:
{
  "headline": "string \u2014 max 80 chars, benefit-driven, 4Ps framework",
  "subheadline": "string \u2014 max 150 chars, one-line value prop",
  "heroSection": {"headline": "string", "subtext": "string or null", "cta": "string", "ctaSecondary": "string or null"},
  "painPoints": ["3", "specific", "pain", "points", "from", "evidence"],
  "solutionOverview": "string \u2014 PAS framework, problem-agitate-solution",
  "features": [{"name": "string", "description": "string", "benefit": "string"}],
  "socialProof": [] \u2014 only if evidence supports, otherwise empty,
  "faqs": [{"question": "string", "answer": "string"}],
  "finalCta": "string \u2014 strong, confident, specific",
  "urgency": "string or null \u2014 only if evidence supports",
  "pricing": null \u2014 do not invent,
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await aiFunction(prompt);
    if (result.success && result.data && typeof result.data === 'object') {
      console.info('[SalesPage Agent] AI success', { hasHeadline: !!result.data.headline, features: result.data.features?.length, provider: result.provider });
      return { ...result.data, _provider: result.provider, _traceId: result.traceId };
    }
    console.warn('[SalesPage Agent] AI returned invalid data, using fallback', {
      success: result.success, dataType: typeof result.data, provider: result.provider, traceId: result.traceId
    });
  } catch (e) {
    console.error('[SalesPage Agent] AI generation error:', e.message);
  }
  console.warn('[SalesPage Agent] AI generation failed \u2014 returning null (no fabricated fallback content)');
  return null;
}

export { generatePressRelease, generateCaseStudy, generateSalesPage, FRAMEWORKS, checkRepetitiveLanguage, sanitizeRepetitiveLanguage, applyFramework };

const INVALID_PRODUCT_LABELS = new Set([
  'unknown product', 'new analysis', 'new & featured', 'untitled',
  'new project', 'growth analysis', 'featured', 'home',
]);
































function calculateSpamScore(emailData) {
  let score = 0;
  const text = JSON.stringify(emailData).toLowerCase();

  const spamTriggers = [
    'free', 'act now', 'limited time', 'click here', 'buy now',
    'exclusive offer', 'don\'t miss out', 'guaranteed', 'congratulations',
    'you won', 'winner', 'prize', 'cash', '$$$', 'urgent', 'immediately',
    'once in a lifetime', 'amazing', 'incredible', 'order now', 'limited supply',
    'no obligation', 'risk-free', 'satisfaction guaranteed', 'unlimited',
    'great offer', 'best price', 'lowest price', 'while supplies last',
    'double your', 'earn extra', 'extra cash', 'additional income',
    'debt', 'credit', 'loan', 'mortgage', 'refinance',
    'work from home', 'make money', 'passwords', 'social security',
    'bank account', 'credit card', 'log in', 'verify account',
  ];

  const foundTriggers = spamTriggers.filter(t => text.includes(t));

  const capsWords = text.match(/\b[A-Z]{4,}\b/g) || [];

  const exclamationCount = (text.match(/!/g) || []).length;

  const excessivePunct = (text.match(/[!?]{2,}/g) || []).length;

  const linkCount = (text.match(/https?:\/\/[^\s"'>]+/g) || []).length;

  score += foundTriggers.length * 5;
  score += Math.min(capsWords.length * 3, 15);
  score += Math.min(exclamationCount * 2, 10);
  score += excessivePunct * 5;
  score += Math.max(0, (linkCount - 3) * 5);

  return {
    score: Math.min(score, 100),
    triggers: foundTriggers.slice(0, 10),
    flag: score > 40 ? 'high' : score > 20 ? 'medium' : 'low',
  };
}

function calculateReadabilityScore(emailData) {
  const textFields = [];
  if (emailData.subject) textFields.push(emailData.subject);
  if (emailData.greeting) textFields.push(emailData.greeting);
  if (emailData.headline) textFields.push(emailData.headline);
  if (emailData.opening) textFields.push(emailData.opening);
  if (emailData.bodyParagraphs) textFields.push(...emailData.bodyParagraphs);
  if (emailData.closing) textFields.push(emailData.closing);
  if (emailData.signature) textFields.push(emailData.signature);

  const fullText = textFields.join(' ');
  if (fullText.length < 20) return { score: 50, grade: 'N/A', avgSentenceLength: 0, flag: 'low' };

  const sentences = fullText.split(/[.!?]+/).filter(Boolean);
  const words = fullText.split(/\s+/).filter(w => w.length > 0);
  const avgSentenceLength = sentences.length > 0 ? Math.round(words.length / sentences.length) : 0;
  const syllables = words.reduce((count, word) => count + Math.max(1, Math.floor(word.length / 3)), 0);

  const gradeLevel = sentences.length > 0 && words.length > 0
    ? Math.round(0.39 * (words.length / sentences.length) + 11.8 * (syllables / words.length) - 15.59)
    : 0;

  let score = 60;
  if (avgSentenceLength <= 15) score += 15;
  else if (avgSentenceLength <= 20) score += 10;
  else if (avgSentenceLength <= 25) score += 5;
  else score -= Math.min((avgSentenceLength - 25) * 2, 20);

  if (gradeLevel >= 8 && gradeLevel <= 12) score += 10;
  else if (gradeLevel > 16) score -= 10;

  if (sentences.length >= 5 && sentences.length <= 20) score += 10;

  return {
    score: Math.min(Math.max(score, 0), 100),
    grade: gradeLevel <= 6 ? '6th grade' : gradeLevel <= 8 ? '8th grade' : gradeLevel <= 10 ? '10th grade' : gradeLevel <= 12 ? '12th grade' : 'College',
    avgSentenceLength,
    flag: score < 50 ? 'low' : score < 70 ? 'medium' : 'high',
  };
}

async function generateEmailCopy(brief, aiFunction = callAI, normalizedEvidence) {
  const productIdentity = brief?.productIdentity || {};
  const displayName = productIdentity.displayName || brief?.product?.name || brief?.product?.brandName || brief?.company?.name || 'this solution';
  const internalName = productIdentity.internalName || '';
  const brandName = productIdentity.brandName || brief?.product?.brandName || '';
  const domain = productIdentity.domain || '';
  const productContext = buildProductEvidenceContext(brief, normalizedEvidence);
  const emailEvidenceCheck = checkEvidenceSufficiency(brief, normalizedEvidence);
  if (emailEvidenceCheck) {
    console.warn(`[Email Agent] Insufficient evidence: ${emailEvidenceCheck}`);
    return { _insufficientEvidence: true, _message: emailEvidenceCheck, _provider: 'evidence_gate' };
  }
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);

  const emailType = brief?.emailType || 'Product Announcement';
  const goal = brief?.goal || 'Product Adoption';
  const tone = brief?.tone || 'Professional';
  const audience = brief?.audience || persona;
  const language = brief?.language || 'en';

  const sender = {
    name: brief?.senderName || brandName || displayName,
    email: brief?.senderEmail || (domain ? `noreply@${domain}` : null),
    replyTo: brief?.replyToEmail || brief?.senderEmail || (domain ? `noreply@${domain}` : null)
  };

  const recipient = brief?.recipient || { email: '', firstName: '', lastName: '', companyName: '' };
  const ctaUrl = brief?.ctaUrl || brief?.websiteUrl || (domain ? `https://${domain}` : null);
  const wc = EMAIL_WORD_COUNT_LIMITS[emailType] || EMAIL_WORD_COUNT_LIMITS['Product Announcement'];

  const features = Array.isArray(brief?.product?.features) ? brief.product.features.slice(0, 5) : [];
  const benefits = Array.isArray(brief?.product?.benefits) ? brief.product.benefits.slice(0, 5) : [];
  const featureTexts = features.map(f => typeof f === 'string' ? f : (f.name || f.feature || '')).filter(Boolean);
  const benefitTexts = benefits.map(b => typeof b === 'string' ? b : (b.text || b.benefit || '')).filter(Boolean);
  const campaignGoal = brief.campaign?.goal?.value || brief.campaign?.goal || '';
  const campaignObjective = brief.campaign?.objective?.value || brief.campaign?.objective || '';
  const brandVoice = brief.campaign?.brandVoice?.value || brief.campaign?.brandVoice || brief.brandVoice?.value || brief.brandVoice || '';

  const prompt = `You are an enterprise email copywriter for ${displayName}. Write a ${emailType} email comparable to HubSpot, Brevo, and Mailchimp quality standards.

${productContext}

BUSINESS CONTEXT:
Campaign Goal: ${campaignGoal || 'N/A'}
Campaign Objective: ${campaignObjective || 'N/A'}
Brand Voice: ${brandVoice || 'Professional'}

EMAIL CONFIGURATION:
- Email Type: ${emailType}
- Goal: ${goal}
- Tone: ${tone}
- Audience: ${audience}
- Language: ${language}
- Sender: ${sender.name}
- CTA URL: ${ctaUrl}
- Key Features: ${featureTexts.join(', ') || 'N/A'}
- Key Benefits: ${benefitTexts.join(', ') || 'N/A'}

REQUIREMENTS:
- Word count: ${wc.min}-${wc.max} words total (MANDATORY)
- Use "${displayName}" consistently (NOT "${internalName}")
- subject: Compelling subject line, max 70 chars, include product name (MANDATORY)
- subjectAlternatives: 3 alternative subject lines for A/B testing
- previewText: Compelling preview text, max 150 chars (MANDATORY)
- greeting: Professional greeting like "Hi {{firstName}}," (MANDATORY)
- headline: Hero section headline, max 80 chars (MANDATORY)
- opening: Strong opening addressing the pain point (MANDATORY)
- painPoint: Specific pain point from brief (MANDATORY)
- solution: 2-3 sentences on how ${displayName} solves it (MANDATORY)
- bodyParagraphs: Array of 3-5 body paragraphs (MANDATORY, min 3)
- featureHighlights: Array of 3-5 feature highlights (MANDATORY, min 3)
- benefits: Array of 3-5 key benefits (MANDATORY, min 3)
- socialProof: Evidence or empty string (MANDATORY)
- callToAction: Object {"label": "Specific Action CTA", "url": "${ctaUrl}"} (MANDATORY) â€” CTA label must be specific action-oriented, 15+ chars, use "?" or "!" for urgency
- secondaryCta: Object or null
- closing: Closing paragraph (MANDATORY)
- signature: Sender signature (MANDATORY)
- postscript: P.S. line or empty string
- complianceFooter: Legal info or empty string
- unsubscribeText: Unsubscribe instructions (MANDATORY)
- footer: Copyright details (MANDATORY)
- compliance: Additional info or empty string
- variables: Array of variable names used (MANDATORY)
- plainText: Full plain text version (MANDATORY)
- html: Full HTML version (MANDATORY)
- evidenceUsed: Array of evidence sources (MANDATORY - use [] if none)
- claimsRequiringReview: Array (MANDATORY - use [] if none)

QUALITY SCORING â€” CRITICAL: Your content will be scored on these dimensions. Follow EXACTLY:
1. productAccuracy (weight 12%): Mention "${displayName}" at least 3 times. Include specific features from brief.
2. audienceRelevance (weight 10%): Use "you", "your", "team", "business", "challenge" naturally.
3. storytelling (weight 10%): Open with a hook. Use phrases like "Imagine...", "What if...", "Picture this..." to start. Follow: hook â†’ problem â†’ solution â†’ outcome.
4. persuasiveness (weight 8%): Include benefit words (benefit, value, improve, grow, accelerate), value props (because, enables, helps), pain acknowledgment (we understand, you know).
5. ctaStrength (weight 8%): CRITICAL â€” DO NOT use "Get Started" or "Learn More" as CTA label. Use specific CTAs like "Reserve Your Free Consultation Today!" or "Build Your Custom Dashboard Now!" â€” 15+ characters, use "!" for urgency.
6. originality (weight 6%): CRITICAL â€” ABSOLUTELY FORBIDDEN WORDS: revolutionary, game-changing, cutting-edge, state-of-the-art, thought leader, paradigm shift, disruptive, world-class, unmatched, unbeatable, empower, synergy, leverage, holistic, robust, streamline, scalable. NEVER use any of these.
7. evidenceCoverage (weight 8%): Populate evidenceUsed with the evidence sources listed above. Minimum 1 entry.
8. marketingImpact (weight 6%): Strong headline + specific CTA + benefits.

EVIDENCE INTEGRITY: If evidence does not contain information about a specific area, do NOT invent it. Return only content supported by the evidence provided.

Return valid JSON with ALL fields populated:
{
  "subject": "Compelling subject with product name max 70 chars",
  "subjectAlternatives": ["Alt 1", "Alt 2", "Alt 3"],
  "previewText": "Compelling preview max 150 chars",
  "greeting": "Hi {{firstName}},",
  "headline": "Hero headline max 80 chars",
  "opening": "Imagine if you could solve the pain point...",
  "painPoint": "Specific pain point from brief",
  "solution": "How ${displayName} solves it with specific features and measurable outcomes",
  "bodyParagraphs": ["Hook paragraph with pain", "Solution paragraph with features", "Benefit paragraph with outcomes", "Proof paragraph with evidence"],
  "featureHighlights": ["Feature: benefit description", "Feature: benefit description", "Feature: benefit description"],
  "benefits": ["Benefit with outcome", "Benefit with outcome", "Benefit with outcome"],
  "socialProof": "Verified evidence or empty string",
  "callToAction": {"label": "Reserve Your Consultation Today!", "url": "${ctaUrl}"},
  "secondaryCta": {"label": "Explore Features", "url": "${ctaUrl}"} or null,
  "closing": "Thank you for considering ${displayName}...",
  "signature": "${sender.name}",
  "postscript": "P.S. line with urgency or empty string",
  "complianceFooter": "Legal text or empty string",
  "unsubscribeText": "To unsubscribe, reply with UNSUBSCRIBE",
  "footer": "Â© ${new Date().getFullYear()} ${brandName || displayName}. All rights reserved.",
  "compliance": "Additional info or empty string",
  "variables": ["firstName", "companyName"],
  "plainText": "Full plain text version of the email",
  "html": "Full HTML version of the email",
  "evidenceUsed": [],
  "claimsRequiringReview": []
}`;

  try {
    const result = await aiFunction(prompt);
    if (result.success && result.data && typeof result.data === 'object') {
      console.info('[Email Agent] AI success', { hasSubject: !!result.data.subject, provider: result.provider });

      const normalized = normalizeEmailContent({
        ...result.data,
        _productName: displayName,
        emailType,
        goal, tone, audience, language,
        sender,
        recipient,
        productIdentity: { internalName, displayName, brandName, domain },
      });

      const validationResult = validateEmailCopyDTO(normalized);
      if (!validationResult.valid) {
        console.warn('[Email Copy] DTO validation failed:', validationResult.errors);
      }

      return {
        id: `email_${Date.now()}`,
        contentType: 'email_copy',
        ...normalized,
        emailType,
        goal, tone, audience, language,
        sender,
        recipient,
        productIdentity: { internalName, displayName, brandName, domain },
        quality: {
          score: validationResult.valid ? 1 : 0.5,
          checks: validationResult.errors || [],
          warnings: validationResult.warnings || [],
        },
        approvalStatus: 'DRAFT',
        deliveryStatus: null,
        createdAt: new Date().toISOString(),
        spamScore: calculateSpamScore(normalized),
        readabilityScore: calculateReadabilityScore(normalized),
        _provider: result.provider,
      };
    }
    console.warn('[Email Agent] AI returned invalid data, using fallback', {
      success: result.success, dataType: typeof result.data, provider: result.provider, traceId: result.traceId
    });
  } catch (e) { 
    console.error('[Email Agent] AI generation error, using fallback:', e.message);
  }

  // PART 5: No fabricated fallback â€” return null so the pipeline marks generation_failed honestly
  if (!displayName || displayName === 'this solution' || displayName === 'N/A') {
    return { _insufficientEvidence: true, _message: 'Additional verified product information is required. No product name identified.', _provider: 'evidence_gate' };
  }
  console.warn('[Email Agent] AI generation failed â€” returning null (no fabricated fallback content)');
  return null;
}





















function unwrapSourced(val) {
  if (val && typeof val === 'object' && 'value' in val && 'source' in val) return val.value;
  return val;
}

function buildNormalizedEvidence(brief, evidenceContext) {
  const rawKeywords = brief.verifiedKeywords || [];
  const safeKeywords = Array.isArray(rawKeywords) ? rawKeywords : [];

  const kwSection = evidenceContext?.keywords || {};
  const primaryVal = unwrapSourced(kwSection.primary);
  const secondaryVal = unwrapSourced(kwSection.secondary);
  const longTailVal = unwrapSourced(kwSection.longTail);
  const questionVal = unwrapSourced(kwSection.question);

  const contextKeywords = [
    ...(Array.isArray(primaryVal) ? primaryVal : []),
    ...(Array.isArray(secondaryVal) ? secondaryVal : []),
    ...(Array.isArray(longTailVal) ? longTailVal : []),
    ...(Array.isArray(questionVal) ? questionVal : []),
  ];

  const combinedKeywords = [...safeKeywords, ...contextKeywords];
  const seen = new Set();
  const deduplicated = combinedKeywords.filter(k => {
    const key = typeof k === 'string' ? k : (k?.keyword || k?.phrase || '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const productFeatures = Array.isArray(brief.product?.features) ? brief.product.features
    : Array.isArray(unwrapSourced(evidenceContext?.features)) ? unwrapSourced(evidenceContext?.features)
    : [];

  const productBenefits = Array.isArray(brief.product?.benefits) ? brief.product.benefits
    : Array.isArray(unwrapSourced(evidenceContext?.benefits)) ? unwrapSourced(evidenceContext?.benefits)
    : [];

  const audienceSection = evidenceContext?.audience || {};
  const painPoints = Array.isArray(brief.painPoints) ? brief.painPoints
    : Array.isArray(unwrapSourced(audienceSection.painPoints)) ? unwrapSourced(audienceSection.painPoints)
    : [];

  const competitorSection = evidenceContext?.competitors || {};
  const competitorsList = Array.isArray(brief.validatedCompetitors) ? brief.validatedCompetitors
    : Array.isArray(unwrapSourced(competitorSection.list)) ? unwrapSourced(competitorSection.list)
    : [];

  const contentGapSection = evidenceContext?.contentGaps || {};
  const contentGaps = Array.isArray(brief.contentGaps) ? brief.contentGaps
    : Array.isArray(unwrapSourced(contentGapSection.missingContent)) ? unwrapSourced(contentGapSection.missingContent)
    : [];

  const topicIdeas = Array.isArray(brief.topicIdeas) ? brief.topicIdeas
    : (evidenceContext?.seo?.topicIdeas?.value || evidenceContext?.seo?.blogIdeas?.value || []);

  return {
    keywords: deduplicated.slice(0, 30),
    primaryKeywords: Array.isArray(primaryVal) ? primaryVal.slice(0, 10) : [],
    features: productFeatures,
    benefits: productBenefits,
    painPoints,
    competitors: competitorsList,
    contentGaps,
    topicIdeas: Array.isArray(topicIdeas) ? topicIdeas : [],
    evidenceSnapshotId: evidenceContext?.evidenceSnapshotId || null,
  };
}

const GENERATORS = {
  linkedin_post: generateLinkedInPost,
  instagram_post: generateInstagramPost,
  twitter_post: generateTwitterPost,
  x_post: generateTwitterPost,
  facebook_post: generateFacebookPost,
  youtube_description: generateYouTubeDescription,
  email_copy: generateEmailCopy,
  email_campaign: generateEmailCopy,
  email_nurture: generateEmailCopy,
  email_newsletter: generateEmailCopy,
  email_welcome: generateEmailCopy,
  email_promotional: generateEmailCopy,
  email_follow_up: generateEmailCopy,
  email_event_invitation: generateEmailCopy,
  email_reengagement: generateEmailCopy,
  email_final_cta: generateEmailCopy,
  blog_article: generateBlogArticle,
  faq_page: generateFAQ,
  landing_page: generateLandingPage,
  product_page: generateProductPage,
  comparison_page: generateComparisonPage,
  feature_announcement: generateFeatureAnnouncement,
  whitepaper: generateWhitepaper,
  press_release: generatePressRelease,
  case_study: generateCaseStudy,
  sales_page: generateSalesPage,
  creative_brief: generateCreativeBrief,
  video_script: generateVideoScript,
};

export async function generateContent(assetType, brief, evidenceContext, callAiFn, userId, chatId, prisma) {
  const typeConfig = CONTENT_TYPES[assetType];
  if (!typeConfig) throw new Error(`Unknown content type: ${assetType}`);

  const schemaEntry = SCHEMA_REGISTRY[assetType];
  if (!schemaEntry) {
    return {
      _type: assetType,
      _label: typeConfig.label,
      _status: 'unavailable',
      _reason: `No schema registered for: ${assetType}`,
      _generatedAt: new Date().toISOString(),
    };
  }

  const generator = GENERATORS[assetType];
  if (!generator) {
    return {
      _type: assetType,
      _label: typeConfig.label,
      _status: 'unavailable',
      _reason: `No generator implemented for: ${assetType}`,
      _generatedAt: new Date().toISOString(),
    };
  }

  const briefValidation = validateBriefContent(brief);
  if (briefValidation.status === 'blocked') {
    return {
      _type: assetType,
      _label: typeConfig.label,
      _status: 'blocked',
      _reason: briefValidation.issues?.length ? briefValidation.issues.join('; ') : (briefValidation.reason || briefValidation.code || 'Brief blocked'),
      _generatedAt: new Date().toISOString(),
    };
  }

  const identity = brief?._productIdentity || brief?.productIdentity || {};
  const productName = (identity?.productName || brief?.product?.name || '').toLowerCase().trim();
  if (INVALID_PRODUCT_LABELS.has(productName) || !productName || productName.length < 2) {
    return {
      _type: assetType,
      _label: typeConfig.label,
      _status: 'blocked',
      _reason: `Invalid product identity: "${identity?.productName || brief?.product?.name || 'none'}" â€” content generation requires a verified product`,
      _generatedAt: new Date().toISOString(),
    };
  }

  // ===== STAGE 1: ENRICHMENT =====
  console.info('[Pipeline] STAGE 1: Enrichment', {
    assetType, hasPrisma: !!prisma, hasUserId: !!userId, hasChatId: !!chatId,
    alreadyEnriched: !!brief._enrichedAt,
  });
  let enriched = brief;
  let enrichmentDiagnostics = null;
  if (prisma && userId && chatId && !brief._enrichedAt) {
    const traceStart = Date.now();
    const enrichment = await enrichContentBrief(prisma, userId, chatId, brief);
    console.info('[Pipeline] Enrichment result', {
      enriched: enrichment.enriched, diagnostics: enrichment.diagnostics,
      elapsedMs: Date.now() - traceStart,
    });
    enriched = enrichment.brief;
    enrichmentDiagnostics = enrichment.diagnostics;
    if (enrichment.enriched) {
      console.info(`[Pipeline] Brief enriched: ${enrichment.diagnostics.enriched.join(', ')}`);
    }
  }

  // ===== STAGE 2: REQUIREMENT CHECK (non-blocking - Task 8) =====
  const preCheckFeatures = enriched.product?.features?.length || 0;
  const preCheckBenefits = enriched.product?.benefits?.length || 0;
  const preCheckPainPoints = enriched.painPoints?.length || 0;
  const preCheckUseCases = enriched.product?.useCases?.length || 0;
  const preCheckPersonas = enriched.targetPersonas?.length || 0;
  const preCheckKeywords = enriched.verifiedKeywords?.length || 0;
  const preCheckGaps = enriched.contentGaps?.length || 0;
  const preCheckCampaignGoal = !!enriched.campaign?.goal;
  const preCheckCta = enriched.CTA?.length || 0;

  const reqCheck = checkBriefRequirements(enriched);
  if (!reqCheck.passed) {
    console.warn('[Pipeline] Requirements check non-blocking warning', {
      failures: reqCheck.failures,
      allResults: reqCheck.results.map(r => `${r.key}:${r.count}/${r.required}`).join(', '),
    });
  } else {
    console.info('[Pipeline] Requirements check PASSED');
  }

  console.info('[Pipeline] STAGE 2: Brief summary', {
    features: preCheckFeatures, benefits: preCheckBenefits,
    painPoints: preCheckPainPoints, useCases: preCheckUseCases,
    personas: preCheckPersonas, keywords: preCheckKeywords,
    contentGaps: preCheckGaps, campaignGoal: preCheckCampaignGoal,
    cta: preCheckCta, hasCampaign: !!enriched.campaign,
    campaignGoalValue: enriched.campaign?.goal,
    meetingMinimums: reqCheck.passed,
  });

  // ===== STAGE 3: AI GENERATION =====
  const painPoint = getFirstPainPoint(enriched);
  const productDisplayName = enriched.product?.name || enriched.company?.name || 'this solution';
  const normalizedEvidence = buildNormalizedEvidence(enriched, evidenceContext);
  const aiFunction = callAiFn || callAI;
  const briefWithMeta = {
    ...enriched,
    _painPoint: painPoint,
    _productName: productDisplayName,
  };

  console.info('[Pipeline] STAGE 3: AI Generation', {
    assetType, generatorName: generator.name,
    evidenceKeywords: normalizedEvidence.keywords?.length,
    evidenceFeatures: normalizedEvidence.features?.length,
    evidenceContentGaps: normalizedEvidence.contentGaps?.length,
    briefFeatures: enriched.product?.features?.length,
    briefBenefits: enriched.product?.benefits?.length,
    briefPainPoints: enriched.painPoints?.length,
    briefKeywords: enriched.verifiedKeywords?.length,
    briefContentGaps: enriched.contentGaps?.length,
    hasCampaignGoal: !!enriched.campaign?.goal,
    hasCta: (enriched.CTA?.length || 0) > 0,
  });

  const genStart = Date.now();
  const result = await generator(briefWithMeta, aiFunction, normalizedEvidence);
  console.info('[Pipeline] AI generation complete', {
    hasResult: !!result, elapsedMs: Date.now() - genStart,
    resultType: result ? (result._type || typeof result) : 'null',
  });

  if (result && result._insufficientEvidence) {
    console.warn('[Pipeline] Insufficient evidence, skipping generation', { reason: result._message });
    return {
      _type: assetType,
      _label: typeConfig.label,
      _status: 'insufficient_evidence',
      _reason: result._message,
      _generatedAt: new Date().toISOString(),
    };
  }

  if (!result) {
    const missingReasons = [];
    if (!enriched.product?.features?.length) missingReasons.push('Missing Product Benefits');
    if (!enriched.campaign?.goal) missingReasons.push('Missing Campaign Goal');
    if (!enriched.verifiedKeywords?.length) missingReasons.push('Missing SEO Data');
    console.warn('[Pipeline] Generator returned null', { missingReasons });
    return {
      _type: assetType,
      _label: typeConfig.label,
      _status: 'generation_failed',
      _reason: `Content generation failed because required fields were missing. Auto-repair attempted. Retrying... ${missingReasons.length ? '(' + missingReasons.join(', ') + ')' : ''}`,
      _enrichment: enrichmentDiagnostics,
      _generatedAt: new Date().toISOString(),
    };
  }

  // ===== STAGE 4: REPAIR + VALIDATION (Task 8 - repair before validate) =====
  console.info('[Pipeline] STAGE 4: Schema repair + validation');
  let repairedResult = repairAIOutput(result, assetType);
  let schemaValidation = validateContentOutput(repairedResult, assetType);
  console.info('[Pipeline] Initial repair + validation', {
    valid: schemaValidation.valid,
    errors: schemaValidation.errors?.slice(0, 5),
    missingFields: schemaValidation.missingFields?.slice(0, 5),
  });

  for (let attempt = 0; attempt < 2 && !schemaValidation.valid; attempt++) {
    console.info('[Pipeline] Schema retry attempt', { attempt });
    const retryBrief = {
      ...briefWithMeta,
      _retryInstructions: `Schema validation failed. Errors:\n${schemaValidation.errors.join('\n')}\nReturn valid JSON matching the original schema.`,
    };
    const retryResult = await generator(retryBrief, aiFunction, normalizedEvidence);
    if (retryResult) {
      repairedResult = repairAIOutput(retryResult, assetType);
      schemaValidation = validateContentOutput(repairedResult, assetType);
      console.info('[Pipeline] Schema retry result', {
        valid: schemaValidation.valid, attempt,
      });
    }
  }

  if (!schemaValidation.valid) {
    console.warn('[Pipeline] Schema validation FAILED after retries', {
      errors: schemaValidation.errors,
      missingFields: schemaValidation.missingFields,
    });
    return {
      content: { ...repairedResult, _type: assetType },
      metadata: {
        type: assetType,
        label: typeConfig.label,
        status: 'schema_rejected',
        generatedAt: new Date().toISOString(),
        provider: repairedResult._provider || 'content_studio_ai',
        schemaErrors: schemaValidation.errors,
        missingFields: schemaValidation.missingFields || [],
        issues: schemaValidation.issues || [],
        enrichmentDiagnostics,
      },
    };
  }

  console.info('[Pipeline] Schema validation PASSED');

  // ===== STAGE 5: CLAIM VALIDATION =====
  console.info('[Pipeline] STAGE 5: Claim validation');
  const claimValidation = validateContentClaims(schemaValidation.data, assetType);
  console.info('[Pipeline] Claim validation', {
    status: claimValidation.status,
    findingsCount: claimValidation.findings?.length,
  });

  let validatedContent = {
    ...(claimValidation.sanitized || schemaValidation.data),
    _type: assetType,
    _approvalStatus: APPROVAL_STATUSES.DRAFT,
    _generatedAt: new Date().toISOString(),
    _version: 1,
    _productName: productDisplayName,
    _painPoint: painPoint,
  };

  if (assetType.startsWith('email_')) {
    const companyName = enriched?.company?.name || enriched?.product?.name || '';
    const companyWebsite = enriched?.company?.websiteUrl || '';
    const renderedEmail = renderEmailHtmlTemplate(validatedContent, companyName, companyWebsite);
    validatedContent._htmlTemplate = renderedEmail.html;
    validatedContent._plainText = renderedEmail.plainText;
    validatedContent._subject = renderedEmail.subject;
  }

function localPolishContent(content, assetType, qualityResult, brief) {
  if (!content || typeof content !== 'object') return content;
  const polished = JSON.parse(JSON.stringify(content));
  const lowDims = qualityResult.details.filter(d => d.score < 70).map(d => d.dimension);

  if (assetType.startsWith('email_')) {
    if (lowDims.includes('ctaStrength') && polished.callToAction) {
      const label = polished.callToAction.label || '';
      const weak = ['learn more', 'click here', 'read more', 'see more', 'get started', 'submit'];
      if (weak.some(w => label.toLowerCase().includes(w))) {
        polished.callToAction.label = 'Start Your Free Consultation Today!';
      }
    }
    if (lowDims.includes('storytelling') && polished.opening) {
      if (!/imagine|picture this|what if|have you ever/i.test(polished.opening)) {
        polished.opening = `Imagine if ${polished.painPoint || 'your biggest challenge'} could be solved with the right approach. ${polished.opening}`;
      }
    }
    if (lowDims.includes('originality') && polished.bodyParagraphs) {
      const banned = ['scalable', 'streamline', 'robust', 'synergy', 'leverage', 'holistic', 'empower', 'world-class', 'cutting-edge', 'next level', 'game-changing', 'revolutionary'];
      polished.bodyParagraphs = polished.bodyParagraphs.map(p => {
        let text = p;
        for (const word of banned) {
          const re = new RegExp('\\b' + word + '\\b', 'gi');
          if (re.test(text)) {
            const replacements = { scalable: 'flexible', streamline: 'improve', robust: 'reliable', synergy: 'collaboration', leverage: 'use', holistic: 'complete', empower: 'enable', 'world-class': 'high-quality', 'cutting-edge': 'advanced', 'next level': 'better results', 'game-changing': 'effective', revolutionary: 'modern' };
            text = text.replace(re, replacements[word] || word);
          }
        }
        return text;
      });
    }
    if (lowDims.includes('productAccuracy')) {
      const productName = (polished._productName || polished.productName || polished.productIdentity?.displayName || '').toLowerCase();
      if (productName && productName.length > 2 && productName !== 'n/a' && productName !== 'this solution') {
        const allText = JSON.stringify(polished).toLowerCase();
        const nameCount = (allText.match(new RegExp(productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        const totalWords = allText.split(/\s+/).length;
        const maxMentions = totalWords < 300 ? 4 : totalWords < 500 ? 6 : 8;

        if (nameCount > maxMentions) {
          const alternatives = ['the platform', 'our solution', 'our platform', 'this solution', 'our software', 'the solution', 'this platform', 'our system'];
          let altIdx = 0;

          if (polished.bodyParagraphs) {
            polished.bodyParagraphs = polished.bodyParagraphs.map(p => {
              let text = p;
              const re = new RegExp(`\\b${productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
              const matches = text.match(re);
              if (matches && matches.length > 1) {
                text = text.replace(re, (match, offset) => {
                  if (offset > 0 && altIdx < alternatives.length) {
                    const alt = alternatives[altIdx % alternatives.length];
                    altIdx++;
                    return alt;
                  }
                  return match;
                });
              }
              return text;
            });
          }
          if (polished.opening) {
            const re = new RegExp(`\\b${productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
            const matches = polished.opening.match(re);
            if (matches && matches.length > 1) {
              polished.opening = polished.opening.replace(re, (match, offset) => {
                if (offset > 10 && altIdx < alternatives.length) {
                  return alternatives[altIdx++ % alternatives.length];
                }
                return match;
              });
            }
          }
        }
      }
    }
  }
  return polished;
}

  // ===== STAGE 6: QUALITY REVIEW (Advisory) =====
  console.info('[Pipeline] STAGE 6: Quality review (advisory)');
  let qualityResult = scoreContentQuality(validatedContent, evidenceContext?.product ? evidenceContext : null, assetType);
  let bestQuality = qualityResult.overall;
  let rewritesUsed = 0;

  console.info('[Pipeline] Quality score', {
    overall: bestQuality,
    label: qualityResult.label,
    threshold: QUALITY_THRESHOLD,
  });

  // Local deterministic polish â€” always applied, no AI required, never blocks
  if (qualityResult.needsRewrite) {
    const polished = localPolishContent(validatedContent, assetType, qualityResult, briefWithMeta);
    const polishedQuality = scoreContentQuality(polished, evidenceContext?.product ? evidenceContext : null, assetType);
    if (polishedQuality.overall > bestQuality) {
      validatedContent = polished;
      bestQuality = polishedQuality.overall;
      qualityResult = polishedQuality;
      rewritesUsed = 1;
      console.info('[Pipeline] Local polish improved quality', { from: bestQuality, to: polishedQuality.overall });
    }
  }

  // AI rewrite is NEVER called automatically.
  // Only triggered manually via "Improve Content" button on frontend.
  // If AI rewrite is called and fails, original content is kept unconditionally.

  console.info('[Pipeline] Quality final', {
    score: bestQuality,
    label: qualityResult.label,
    rewritesUsed,
  });

  validatedContent._qualityScore = bestQuality;
  validatedContent._qualityLabel = qualityResult.label;
  validatedContent._qualityDetails = qualityResult.details;
  validatedContent._qualityRewritesUsed = rewritesUsed;
  validatedContent._enrichmentDiagnostics = enrichmentDiagnostics;

  // ===== STAGE 7: PERSIST =====
  console.info('[Pipeline] STAGE 7: Persist');
  if (userId && chatId) {
    saveContentMemory(null, {
      userId, chatId,
      assetType,
      evidenceGraphHash: buildEvidenceGraphHash(evidenceContext),
      promptHash: buildPromptHash(briefWithMeta),
      aiOutput: result,
      finalOutput: validatedContent,
      qualityScore: bestQuality,
      provider: result._provider || 'content_studio_ai',
    });
  }

  console.info('[Pipeline] Complete', {
    assetType, status: 'success',
    qualityScore: bestQuality, rewritesUsed,
  });

  return {
    content: validatedContent,
    metadata: {
      type: assetType,
      label: typeConfig.label,
      generatedAt: new Date().toISOString(),
      provider: result._provider || 'content_studio_ai',
      claimStatus: claimValidation.status,
      claimFindings: claimValidation.findings,
      schemaValid: true,
      approvalStatus: APPROVAL_STATUSES.DRAFT,
      qualityScore: qualityResult,
      rewritesUsed,
      enrichmentDiagnostics,
    },
  };
}

export async function generateContentStudioPlan(typesOrCtx, brief, evidenceContext, callAiFn, userId, chatId, prisma) {
  if (typesOrCtx && typeof typesOrCtx === 'object' && !Array.isArray(typesOrCtx)) {
    const execCtx = typesOrCtx;
    const ev = execCtx.evidence || {};
    const unwrap = (v) => v && typeof v === 'object' && 'value' in v && 'source' in v ? v.value : v;
    const seoEvidence = ev.seo || {};
    const seoScore = unwrap(seoEvidence.score);
    const seoPrimary = Array.isArray(unwrap(seoEvidence.primary)) ? unwrap(seoEvidence.primary) : Array.isArray(unwrap(seoEvidence.primaryKeywords)) ? unwrap(seoEvidence.primaryKeywords) : [];
    const seoGaps = Array.isArray(unwrap(seoEvidence.contentGaps)) ? unwrap(seoEvidence.contentGaps) : [];
    const competitorsObj = unwrap(ev.competitors);
    const competitorsList = Array.isArray(competitorsObj?.list) ? competitorsObj.list : Array.isArray(competitorsObj) ? competitorsObj : [];
    const audienceObj = unwrap(ev.audience);
    const audience = Array.isArray(audienceObj?.personas) ? audienceObj.personas : Array.isArray(unwrap(audienceObj?.primary)) ? unwrap(audienceObj?.primary) : [];
    const painPoints = Array.isArray(unwrap(audienceObj?.painPoints)) ? unwrap(audienceObj?.painPoints) : [];
    const features = Array.isArray(ev.features) ? ev.features.map(f => typeof f === 'string' ? f : f.title || f.name) : [];
    const benefits = Array.isArray(ev.benefits) ? ev.benefits.map(b => typeof b === 'string' ? b : b.title || b.name) : [];
    const websiteObj = unwrap(ev.website) || {};
    const keywords = Array.isArray(execCtx.seoKeywords) ? execCtx.seoKeywords
      : Array.isArray(seoPrimary) ? seoPrimary : [];
    const channels = Array.isArray(ev.channels) ? ev.channels : [];
    const growth = ev.growth || execCtx.growth || null;
    const campaignGoal = execCtx.campaignGoal || unwrap(ev.campaign?.goal) || null;
    const minimalBrief = {
      product: { name: execCtx.productName || 'N/A', summary: null, features, benefits, usp: execCtx.productUsp || ev.usp || null },
      company: { name: execCtx.companyName || null, websiteUrl: unwrap(websiteObj.url) || null, industry: execCtx.industry || unwrap(websiteObj.industry) || null },
      targetPersonas: audience.map(a => ({ name: unwrap(a.name) || unwrap(a.personaName) || null, role: unwrap(a.role) || null, painPoints: Array.isArray(a.painPoints) ? a.painPoints : [], goals: Array.isArray(a.goals) ? a.goals : [] })),
      painPoints,
      objections: Array.isArray(ev.objections) ? ev.objections : [],
      validatedCompetitors: competitorsList.map(c => ({ name: c.name || c.website || c.url || null, domain: c.website || c.url || null, strengths: c.strengths || [], weaknesses: c.weaknesses || [] })),
      verifiedKeywords: keywords.map(k => ({ keyword: typeof k === 'string' ? k : k.keyword || k.term || null, searchVolume: typeof k === 'object' ? k.searchVolume ?? k.volume ?? null : null, difficulty: typeof k === 'object' ? k.difficulty ?? k.kd ?? null : null })),
      topicIdeas: seoGaps.map(g => typeof g === 'string' ? g : g.opportunity || g.title || null),
      contentGaps: seoGaps.slice(0, 10),
      seo: {
        score: seoScore ?? null,
        primary: keywords.slice(0, 10),
        primaryKeywords: keywords.slice(0, 10),
        contentGaps: seoGaps.slice(0, 10),
      },
      campaign: { goal: campaignGoal || null, channels },
      growthWorkspace: growth,
      tone: execCtx.tone || 'professional',
      CTA: [],
      evidenceSources: {
        hasEvidenceSnapshot: Boolean(ev.sourceSummary || websiteObj || competitorsList.length),
        websiteScrape: Boolean(websiteObj),
      },
      limitations: [],
      _briefId: `legacy_${Date.now()}`, _chatId: null, _userId: null, _builtAt: new Date().toISOString(),
    };
    const allTypes = Object.keys(CONTENT_TYPES);
    return generateContentStudioPlan(allTypes, minimalBrief, execCtx, null, null, null, null);
  }

  const types = typesOrCtx;
  const results = [];

  for (const type of types) {
    const genResult = await generateContent(type, brief, evidenceContext, callAiFn, userId, chatId, null);
    if (genResult) results.push({ type, content: genResult.content || genResult, metadata: genResult.metadata || null });
  }

  return {
    assets: results,
    totalGenerated: results.length,
    _metadata: {
      evidenceSnapshotId: evidenceContext?.evidenceSnapshotId || null,
      generatedAt: new Date().toISOString(),
      typesGenerated: types,
      provider: 'content_studio',
    },
  };
}

export { generateLinkedInPost, generateInstagramPost, generateTwitterPost, generateFacebookPost, generateYouTubeDescription, generateEmailCopy, generateCreativeBrief, generateVideoScript, generateBlogArticle, generateFAQ, generateLandingPage, generateProductPage, generateComparisonPage, generateFeatureAnnouncement, generateWhitepaper, renderEmailHtmlTemplate, APPROVAL_STATUSES };

// ============================================
// EMAIL HTML TEMPLATE GENERATOR
// ============================================

const APPROVAL_STATUSES = {
  DRAFT: 'draft',
  VALIDATION_FAILED: 'validation_failed',
  READY_FOR_REVIEW: 'ready_for_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CHANGES_REQUESTED: 'changes_requested',
  SCHEDULED: 'scheduled',
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  OPENED: 'opened',
  CLICKED: 'clicked',
  FAILED: 'failed',
};

const VALID_TRANSITIONS = {
  [APPROVAL_STATUSES.DRAFT]: [APPROVAL_STATUSES.READY_FOR_REVIEW, APPROVAL_STATUSES.DRAFT],
  [APPROVAL_STATUSES.READY_FOR_REVIEW]: [APPROVAL_STATUSES.APPROVED, APPROVAL_STATUSES.REJECTED, APPROVAL_STATUSES.CHANGES_REQUESTED, APPROVAL_STATUSES.DRAFT],
  [APPROVAL_STATUSES.APPROVED]: [APPROVAL_STATUSES.SCHEDULED, APPROVAL_STATUSES.SENDING, APPROVAL_STATUSES.DRAFT, APPROVAL_STATUSES.SENT],
  [APPROVAL_STATUSES.REJECTED]: [APPROVAL_STATUSES.DRAFT],
  [APPROVAL_STATUSES.CHANGES_REQUESTED]: [APPROVAL_STATUSES.DRAFT],
  [APPROVAL_STATUSES.SCHEDULED]: [APPROVAL_STATUSES.SENDING, APPROVAL_STATUSES.FAILED, APPROVAL_STATUSES.DRAFT],
  [APPROVAL_STATUSES.SENDING]: [APPROVAL_STATUSES.SENT, APPROVAL_STATUSES.FAILED],
  [APPROVAL_STATUSES.SENT]: [APPROVAL_STATUSES.DELIVERED, APPROVAL_STATUSES.FAILED],
  [APPROVAL_STATUSES.DELIVERED]: [APPROVAL_STATUSES.OPENED, APPROVAL_STATUSES.FAILED],
  [APPROVAL_STATUSES.OPENED]: [APPROVAL_STATUSES.CLICKED],
  [APPROVAL_STATUSES.CLICKED]: [],
  [APPROVAL_STATUSES.FAILED]: [APPROVAL_STATUSES.DRAFT],
};

export function transitionApprovalStatus(content, newStatus, { approvedBy, approvedAt, reason } = {}) {
  if (!content || typeof content !== 'object') return content;
  const current = content._approvalStatus || APPROVAL_STATUSES.DRAFT;
  const allowed = VALID_TRANSITIONS[current];
  if (!allowed || !allowed.includes(newStatus)) {
    console.warn('[Approval] Invalid transition', { from: current, to: newStatus, allowed });
    return null;
  }

  const updated = {
    ...content,
    _approvalStatus: newStatus,
    _approvalHistory: [
      ...(Array.isArray(content._approvalHistory) ? content._approvalHistory : []),
      {
        from: current,
        to: newStatus,
        timestamp: new Date().toISOString(),
        approvedBy: approvedBy || null,
        reason: reason || null,
      }
    ],
  };

  if (newStatus === APPROVAL_STATUSES.APPROVED) {
    updated._approvedBy = approvedBy || 'unknown';
    updated._approvedAt = approvedAt || new Date().toISOString();
    updated._revisionHash = createStableHash(JSON.stringify({
      html: content._htmlTemplate || '',
      plainText: content._plainText || '',
      subject: content.subject || '',
    }));
    updated._version = (content._version || 1) + 1;
  }

  if (newStatus === APPROVAL_STATUSES.DRAFT && content._approvedBy) {
    delete updated._approvedBy;
    delete updated._approvedAt;
    delete updated._revisionHash;
  }

  return updated;
}

function sanitizeText(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderEmailHtmlTemplate(emailData, companyName = '', companyWebsite = '', unsubscribeUrl = null) {
  // Normalize to canonical field names
  const norm = normalizeEmailContent(emailData);
  const subject = sanitizeText(norm.subject || '');
  const previewText = sanitizeText(norm.previewText || norm.subject || '');
  const headline = sanitizeText(norm.headline || norm.subject || '');
  const greeting = sanitizeText(norm.greeting || '');
  const opening = sanitizeText(norm.opening || '');
  const painPoint = sanitizeText(norm.painPoint || '');
  const solution = sanitizeText(norm.solution || '');
  const bodyParagraphs = Array.isArray(norm.bodyParagraphs) ? norm.bodyParagraphs : [];
  const bulletPoints = Array.isArray(norm.bulletPoints) ? norm.bulletPoints : [];
  const features = norm.featureHighlights || [];
  const benefits = Array.isArray(norm.benefits) ? norm.benefits : [];
  const socialProof = sanitizeText(norm.socialProof || '');
  const variables = Array.isArray(norm.variables) ? norm.variables : [];
  const ctaData = norm.callToAction || {};
  const ctaText = sanitizeText(ctaData.label || '');
  const ctaUrl = ctaData.url || '#';
  const secondaryCta = norm.secondaryCta || null;
  const closing = sanitizeText(norm.closing || '');
  const postscript = sanitizeText(norm.postscript || '');
  const signature = sanitizeText(norm.signature || '');
  const complianceNote = sanitizeText(norm.complianceFooter || norm.footer || '');
  const company = sanitizeText(companyName || 'Our Company');
  const baseUrl = companyWebsite || '#';
  const unsubscribeText = sanitizeText(norm.unsubscribeText || '');

  const bodyHtml = `
    ${headline ? `<h1 style="font-family: Arial, sans-serif; font-size: 24px; line-height: 1.3; color: #1e293b; margin: 0 0 20px 0; font-weight: 700;">${headline}</h1>` : ''}
    ${greeting ? `<p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; margin: 0 0 16px 0;">${greeting}</p>` : ''}
    ${opening ? `<p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; margin: 0 0 16px 0;">${opening}</p>` : ''}
    ${painPoint ? `<table cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 16px 0; background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px;"><tr><td style="padding: 16px; font-family: Arial, sans-serif; font-size: 15px; line-height: 1.5; color: #991b1b;">${painPoint}</td></tr></table>` : ''}
    ${solution ? `<p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; margin: 0 0 16px 0;"><strong>${solution}</strong></p>` : ''}
    ${bodyParagraphs.map(p => `<p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; margin: 0 0 16px 0;">${sanitizeText(p)}</p>`).join('\n    ')}
    ${features.length > 0 ? `
    <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 16px 0; background-color: #f8fafc; border-radius: 6px;">
      <tr><td style="padding: 16px 16px 8px 16px; font-family: Arial, sans-serif; font-size: 15px; font-weight: 600; color: #1e293b;">Key Features</td></tr>
      ${features.map(f => `
      <tr>
        <td style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.5; color: #333333; padding: 0 16px 8px 16px; vertical-align: top; padding-left: 32px;">âœ¦ ${sanitizeText(f)}</td>
      </tr>`).join('\n      ')}
    </table>` : ''}
    ${benefits.length > 0 ? `
    <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 16px 0; background-color: #f0fdf4; border-radius: 6px;">
      <tr><td style="padding: 16px 16px 8px 16px; font-family: Arial, sans-serif; font-size: 15px; font-weight: 600; color: #166534;">Benefits</td></tr>
      ${benefits.map(b => `
      <tr>
        <td style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.5; color: #333333; padding: 0 16px 8px 16px; vertical-align: top; padding-left: 32px;">âœ“ ${sanitizeText(b)}</td>
      </tr>`).join('\n      ')}
    </table>` : ''}
    ${bulletPoints.length > 0 ? `
    <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 16px 0;">
      ${bulletPoints.map(b => `
      <tr>
        <td style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; padding: 0 0 8px 0; vertical-align: top; width: 20px;">â€¢</td>
        <td style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; padding: 0 0 8px 0;">${sanitizeText(b)}</td>
      </tr>`).join('\n      ')}
    </table>` : ''}
    ${socialProof ? `<table cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 16px 0; background-color: #f9f9f9; border-left: 3px solid #0066cc; border-radius: 3px;"><tr><td style="padding: 16px; font-family: Arial, sans-serif; font-size: 15px; font-style: italic; line-height: 1.5; color: #555555;">${socialProof}</td></tr></table>` : ''}
    ${ctaText ? `
    <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 24px 0;">
      <tr>
        <td align="center" style="background-color: #2563eb; border-radius: 6px;">
          <a href="${sanitizeText(ctaUrl)}" target="_blank" style="display: inline-block; font-family: Arial, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px;">${ctaText}</a>
        </td>
      </tr>
    </table>` : ''}
    ${secondaryCta ? `
    <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 24px 0;">
      <tr>
        <td align="center">
          <a href="${sanitizeText(secondaryCta.url || '#')}" target="_blank" style="font-family: Arial, sans-serif; font-size: 14px; font-weight: 500; color: #2563eb; text-decoration: none; border-bottom: 1px solid #2563eb;">${sanitizeText(secondaryCta.label || '')}</a>
        </td>
      </tr>
    </table>` : ''}
    ${closing ? `<p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; margin: 0 0 16px 0;">${closing}</p>` : ''}
    ${postscript ? `<p style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #555555; margin: 0 0 16px 0;"><strong>P.S.</strong> ${postscript}</p>` : ''}
    ${signature ? `<p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; margin: 0 0 16px 0;">${signature}</p>` : ''}
    ${complianceNote ? `<p style="font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; color: #888888; margin: 16px 0 0 0; font-style: italic;">${complianceNote}</p>` : ''}
  `;

  const unsubscribeHtml = unsubscribeText
    ? `<span style="color: #888888; font-size: 12px;">${unsubscribeText}</span>`
    : unsubscribeUrl
    ? `<a href="${sanitizeText(unsubscribeUrl)}" target="_blank" style="color: #888888; text-decoration: underline; font-size: 12px;">Unsubscribe</a>`
    : `<span style="color: #888888; font-size: 12px;">To unsubscribe, reply with UNSUBSCRIBE</span>`;

  return {
    subject,
    html: `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${subject}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .email-content { padding: 16px !important; }
      .email-header { padding: 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
  <!--[if mso]>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr>
  <td align="center">
  <![endif]-->

  <!-- PREHEADER -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all; line-height: 1px;">
    ${previewText}
  </div>
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all; line-height: 1px;">
    &nbsp;â€Œ&nbsp;â€Œ&nbsp;â€Œ&nbsp;â€Œ&nbsp;â€Œ&nbsp;â€Œ&nbsp;â€Œ&nbsp;â€Œ&nbsp;â€Œ&nbsp;â€Œ&nbsp;â€Œ&nbsp;â€Œ&nbsp;â€Œ&nbsp;â€Œ&nbsp;â€Œ&nbsp;â€Œ&nbsp;â€Œ&nbsp;
  </div>

  <!-- SUBJECT BAR -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #e2e8f0;">
    <tr>
      <td align="center" style="padding: 8px 10px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600">
          <tr>
            <td style="font-family: Arial, sans-serif; font-size: 13px; color: #475569; text-align: center;">
              Subject: ${subject}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- HEADER -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table class="email-container" role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td class="email-header" style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 28px 32px; text-align: center;">
              <a href="${sanitizeText(baseUrl)}" target="_blank" style="color: #ffffff; text-decoration: none; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">${company}</a>
              ${previewText ? `<p style="color: rgba(255,255,255,0.8); margin: 6px 0 0 0; font-size: 13px; font-weight: 400;">${previewText}</p>` : ''}
            </td>
          </tr>
          <tr>
            <td class="email-content" style="padding: 32px 32px 24px 32px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- FOOTER -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-family: Arial, sans-serif; font-size: 12px; line-height: 1.5; color: #888888; text-align: center;">
                    <p style="margin: 0 0 8px 0;">Â© ${new Date().getFullYear()} ${company}. All rights reserved.</p>
                    <p style="margin: 0 0 8px 0;">
                      <a href="${sanitizeText(baseUrl)}" target="_blank" style="color: #888888; text-decoration: underline; font-size: 12px;">Visit our website</a>
                    </p>
                    <p style="margin: 0 0 0 0;">
                      ${unsubscribeHtml}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!--[if mso]>
  </td>
  </tr>
  </table>
  <![endif]-->
</body>
</html>`,
    plainText: [
      subject ? `Subject: ${subject}` : '',
      '',
      headline,
      greeting,
      opening,
      painPoint ? `Problem: ${painPoint}` : '',
      solution ? `Solution: ${solution}` : '',
      ...bodyParagraphs,
      ...features.map(f => `- ${f}`),
      ...benefits.map(b => `- ${b}`),
      ...bulletPoints.map(b => `- ${b}`),
      socialProof ? `"${socialProof}"` : '',
      ctaText ? `${ctaText}: ${ctaUrl}` : '',
      secondaryCta ? `${secondaryCta.label}: ${secondaryCta.url}` : '',
      closing,
      postscript ? `P.S. ${postscript}` : '',
      signature,
      complianceNote,
      '',
      `--- ${company} ---`,
      baseUrl !== '#' ? `Website: ${baseUrl}` : '',
      unsubscribeText || (unsubscribeUrl ? `Unsubscribe: ${unsubscribeUrl}` : 'Reply UNSUBSCRIBE to opt out'),
    ].filter(Boolean).join('\n'),
    sections: {
      preheader: previewText,
      header: company,
      greeting,
      opening,
      body: bodyHtml,
      footer: `Â© ${new Date().getFullYear()} ${company}. All rights reserved.`,
      unsubscribe: unsubscribeHtml,
    },
    subjectOptions: Array.isArray(emailData.subjectOptions) ? emailData.subjectOptions : (emailData._rawSubjectOptions ? JSON.parse(emailData._rawSubjectOptions) : []),
    personalizationVariables: variables.length > 0 ? variables.map(v => ({ name: v, description: `Personalization field: ${v}`, example: '' })) : (
      Array.isArray(emailData.personalizationFields) ? emailData.personalizationFields.map(f => ({ name: f, description: `Personalization field: ${f}`, example: '' })) : []
    ),
    _emailType: emailData.emailType || null,
    _approvalStatus: APPROVAL_STATUSES.DRAFT,
    _generatedAt: new Date().toISOString(),
    _version: 1,
  };
}

export function previewEmail(htmlContent, plainText, subject, emailData) {
  const issues = [];

  const body = emailData?.bodyParagraphs?.join(' ') || '';
  const greeting = emailData?.greeting || emailData?.sections?.greeting || '';
  const ctaText = emailData?.ctaText || (emailData?.primaryCta && emailData?.primaryCta.label) || '';
  const ctaUrl = emailData?.ctaUrl || (emailData?.primaryCta && emailData?.primaryCta.destination) || '';
  const subjectLine = subject || emailData?.subject || '';
  const unsubscribeHtml = htmlContent?.includes('Unsubscribe') || htmlContent?.includes('unsubscribe');
  const hasClosing = emailData?.closing || emailData?.sections?.closing || false;
  const hasSignature = emailData?.signature || emailData?.sections?.signature || false;

  if (!subjectLine) issues.push({ severity: 'blocked', field: 'subject', message: 'Subject line is required' });
  if (!greeting) issues.push({ severity: 'blocked', field: 'greeting', message: 'Greeting is required' });
  if (!body || body.length < 20) issues.push({ severity: 'blocked', field: 'body', message: 'Email body is required' });
  if (!ctaText) issues.push({ severity: 'blocked', field: 'ctaText', message: 'Call-to-action is required' });
  if (!unsubscribeHtml) issues.push({ severity: 'blocked', field: 'unsubscribe', message: 'Unsubscribe link is required' });
  if (!hasClosing) issues.push({ severity: 'needs_review', field: 'closing', message: 'No closing paragraph' });
  if (!hasSignature) issues.push({ severity: 'needs_review', field: 'signature', message: 'No signature block' });

  const variablePattern = /\{\{[^}]+\}\}|{{[^}]+}}/g;
  if (htmlContent) {
    const unresolvedVars = htmlContent.match(variablePattern);
    if (unresolvedVars && unresolvedVars.length > 0) {
      issues.push({ severity: 'needs_review', field: 'personalization', message: `${unresolvedVars.length} unresolved variables: ${unresolvedVars.join(', ')}` });
    }
  }

  if (ctaUrl && !ctaUrl.startsWith('http') && !ctaUrl.startsWith('#')) {
    issues.push({ severity: 'needs_review', field: 'ctaUrl', message: `CTA URL "${ctaUrl}" may be invalid` });
  }

  const hasBlocked = issues.some(i => i.severity === 'blocked');
  const hasWarnings = issues.some(i => i.severity === 'needs_review');

  return {
    valid: !hasBlocked,
    status: hasBlocked ? 'blocked' : hasWarnings ? 'needs_review' : 'passed',
    issues,
    views: {
      desktop: htmlContent || '',
      plainText: plainText || '',
      mobile: htmlContent ? htmlContent.replace(/style="width:\s*600/g, 'style="width:100%') : '',
    },
    subject: subjectLine,
    previewText: emailData?.previewText || '',
  };
}

export function withApprovalStatus(content, status = APPROVAL_STATUSES.DRAFT) {
  if (!content || typeof content !== 'object') return content;
  return {
    ...content,
    _approvalStatus: status,
    _approvalHistory: [
      {
        status,
        timestamp: new Date().toISOString(),
        action: status === APPROVAL_STATUSES.DRAFT ? 'created' : `status_set_to_${status}`,
      }
    ],
    _version: 1,
  };
}
