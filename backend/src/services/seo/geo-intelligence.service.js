import { asArray } from "../../utils/text.util.js";
import fetch from 'node-fetch';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const EXA_API_KEY = process.env.EXA_API_KEY;

// ============================================
// GEO INTELLIGENCE ENGINE
// (Generative Engine Optimization for AI Search)
// ============================================

/**
 * Generate comprehensive GEO intelligence for AI search visibility
 * @param {Object} params - { websiteData, technicalAudit, identity }
 * @returns {Object} - Complete GEO intelligence
 */
export async function generateGeoIntelligence({
  websiteData,
  technicalAudit,
  identity
}) {
  console.log('🤖 [GEO Intelligence] Starting AI search visibility analysis...');

  try {
    // Step 1: Extract entities (companies, products, services, locations, etc.)
    console.log('🏢 [GEO] Step 1: Extracting entities...');
    const entities = await extractEntities(websiteData, identity.productName);

    // Step 2: Analyze Knowledge Graph Readiness
    console.log('🕸️ [GEO] Step 2: Analyzing knowledge graph readiness...');
    const knowledgeGraphReadiness = analyzeKnowledgeGraphReadiness(websiteData, technicalAudit);

    // Step 3: Analyze Citation Readiness
    console.log('📚 [GEO] Step 3: Analyzing citation readiness...');
    const citationReadiness = analyzeCitationReadiness(websiteData);

    // Step 4: Analyze Answerability (how well content answers questions)
    console.log('❓ [GEO] Step 4: Analyzing answerability...');
    const answerability = await analyzeAnswerability(websiteData, identity.productName, entities);

    // Step 5: Analyze Topical Authority
    console.log('🎯 [GEO] Step 5: Analyzing topical authority...');
    const topicalAuthority = analyzeTopicalAuthority(websiteData, identity.productName, identity.industry);

    // Step 6: Calculate platform-specific visibility scores
    console.log('📊 [GEO] Step 6: Calculating platform scores...');
    const platformScores = calculatePlatformScores({
      entities,
      knowledgeGraphReadiness,
      citationReadiness,
      answerability,
      topicalAuthority,
      websiteData
    });

    // Step 7: Identify AI content opportunities
    console.log('💡 [GEO] Step 7: Identifying AI content opportunities...');
    const aiContentOpportunities = identifyAiContentOpportunities(
      websiteData,
      answerability,
      entities
    );

    // Step 8: Analyze trust signals
    console.log('🔒 [GEO] Step 8: Analyzing trust signals...');
    const trustSignals = analyzeTrustSignals(websiteData);

    // Step 9: Generate recommendations
    console.log('📋 [GEO] Step 9: Generating recommendations...');
    const recommendations = generateRecommendations({
      entities,
      knowledgeGraphReadiness,
      citationReadiness,
      answerability,
      platformScores,
      aiContentOpportunities,
      trustSignals
    });

    // Compile final result
    const result = {
      // Overall AI visibility score
      aiVisibilityScore: platformScores.overall,
      
      // Individual platform scores
      chatGptScore: platformScores.chatgpt,
      geminiScore: platformScores.gemini,
      claudeScore: platformScores.claude,
      perplexityScore: platformScores.perplexity,
      googleAiOverviewScore: platformScores.googleAiOverview,
      
      // Component scores
      entityCoverageScore: entities.score,
      knowledgeGraphReadinessScore: knowledgeGraphReadiness.score,
      citationReadinessScore: citationReadiness.score,
      answerabilityScore: answerability.score,
      topicalAuthorityScore: topicalAuthority.score,
      
      // Detailed data
      entities: entities.list || [],
      knowledgeGraphEntities: knowledgeGraphReadiness.entities || [],
      citationOpportunities: citationReadiness.opportunities || [],
      faqOpportunities: answerability.faqOpportunities || [],
      aiContentOpportunities: aiContentOpportunities || [],
      trustSignals: trustSignals || {},
      recommendations: recommendations || {},
      
      metadata: {
        analyzedAt: new Date().toISOString(),
        totalEntities: entities.list?.length || 0,
        totalOpportunities: aiContentOpportunities?.length || 0
      }
    };

    console.log('✅ [GEO Intelligence] Analysis complete:', {
      aiVisibilityScore: result.aiVisibilityScore,
      entities: result.metadata.totalEntities,
      opportunities: result.metadata.totalOpportunities
    });

    return result;

  } catch (error) {
    console.error('❌ [GEO Intelligence] Error:', error);
    return generateFallbackGeoIntelligence(productName, industry);
  }
}

// ============================================
// ENTITY EXTRACTION
// ============================================

async function extractEntities(websiteData, productName) {
  console.log('🏢 [Entity Extraction] Analyzing content...');

  const text = websiteData.text || '';
  const title = websiteData.metadata?.title || '';
  const description = websiteData.metadata?.description || '';
  const headings = websiteData.content?.headings || [];
  
  // Combine sources
  const allText = [title, description, ...headings.map(h => h.text), text.substring(0, 10000)].join(' ');

  const entities = {
    companies: [],
    products: [],
    services: [],
    technologies: [],
    locations: [],
    industries: [],
    brands: [],
    people: []
  };

  // Extract product name as primary entity
  if (productName) {
    entities.products.push({
      entity: productName,
      type: 'product',
      mentions: (allText.match(new RegExp(productName, 'gi')) || []).length,
      context: 'Primary product'
    });
  }

  // Use AI for entity extraction if available
  if (GROQ_API_KEY && allText.length > 100) {
    try {
      const aiEntities = await extractEntitiesWithAI(allText, productName);
      if (aiEntities) {
        return {
          list: aiEntities,
          score: calculateEntityScore(aiEntities),
          coverage: 'comprehensive'
        };
      }
    } catch (error) {
      console.log('⚠️ [Entity Extraction] AI extraction failed:', error.message);
    }
  }

  // Fallback: Rule-based extraction
  const ruleBasedEntities = extractEntitiesRuleBased(allText, productName);
  
  return {
    list: ruleBasedEntities,
    score: calculateEntityScore(ruleBasedEntities),
    coverage: 'basic'
  };
}

async function extractEntitiesWithAI(text, productName) {
  const prompt = `Extract entities from this website content. Focus on companies, products, services, technologies, locations, and industries.

Text: ${text.substring(0, 3000)}

Product name: ${productName}

Return ONLY valid JSON array:
[
  { "entity": "Entity Name", "type": "product|company|service|technology|location|industry", "confidenceScore": 0-100, "context": "why this entity matters" }
]`;

  const response = await callGroqAI(prompt);
  return response;
}

function extractEntitiesRuleBased(text, productName) {
  const entities = [];
  const lower = text.toLowerCase();

  // Common technology keywords
  const techPatterns = ['ai', 'machine learning', 'automation', 'cloud', 'saas', 'api', 'analytics', 
                        'crm', 'erp', 'platform', 'software', 'app', 'mobile', 'web'];
  
  techPatterns.forEach(tech => {
    const matches = (lower.match(new RegExp(`\\b${tech}\\b`, 'gi')) || []).length;
    if (matches > 0) {
      entities.push({
        entity: tech,
        type: 'technology',
        mentions: matches,
        context: `Technology mentioned ${matches} times`
      });
    }
  });

  // Product/brand (capitalized words that appear frequently)
  const words = text.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*/g) || [];
  const wordFreq = {};
  words.forEach(word => {
    if (word.length > 3 && word !== productName) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });

  Object.entries(wordFreq)
    .filter(([_, count]) => count >= 3)
    .slice(0, 10)
    .forEach(([word, count]) => {
      entities.push({
        entity: word,
        type: 'brand',
        mentions: count,
        context: `Brand/entity mentioned ${count} times`
      });
    });

  return entities.sort((a, b) => (b.mentions || 0) - (a.mentions || 0)).slice(0, 20);
}

function calculateEntityScore(entities) {
  if (!entities || entities.length === 0) return 20;
  
  const coverage = Math.min(entities.length * 5, 60);
  const mentionBonus = Math.min(entities.reduce((sum, e) => sum + (e.mentions || 1), 0) * 2, 40);
  
  return Math.round(Math.min(coverage + mentionBonus, 100));
}

// ============================================
// KNOWLEDGE GRAPH READINESS
// ============================================

function analyzeKnowledgeGraphReadiness(websiteData, technicalAudit) {
  console.log('🕸️ [Knowledge Graph] Analyzing structured data...');

  const schemas = technicalAudit?.schemaMarkup?.schemas || [];
  const hasOrganization = schemas.some(s => s.type === 'Organization');
  const hasFAQ = schemas.some(s => s.type === 'FAQPage');
  const hasArticle = schemas.some(s => s.type === 'Article');
  const hasBreadcrumb = schemas.some(s => s.type === 'BreadcrumbList');
  
  const score = calculateKnowledgeGraphScore({
    hasOrganization,
    hasFAQ,
    hasArticle,
    hasBreadcrumb,
    schemaCount: schemas.length
  });

  const missingElements = [];
  if (!hasOrganization) missingElements.push('Organization schema');
  if (!hasFAQ) missingElements.push('FAQ schema');
  if (!hasArticle) missingElements.push('Article schema');
  if (!hasBreadcrumb) missingElements.push('Breadcrumb schema');

  return {
    score,
    hasOrganization,
    hasFAQ,
    hasArticle,
    hasBreadcrumb,
    schemaCount: schemas.length,
    entities: schemas.map(s => ({ type: s.type, status: 'present' })),
    missingElements,
    recommendations: missingElements.map(el => `Add ${el} for better AI understanding`)
  };
}

function calculateKnowledgeGraphScore(data) {
  let score = 0;
  if (data.hasOrganization) score += 30;
  if (data.hasFAQ) score += 20;
  if (data.hasArticle) score += 15;
  if (data.hasBreadcrumb) score += 10;
  score += Math.min(data.schemaCount * 5, 25);
  return Math.min(score, 100);
}

// ============================================
// CITATION READINESS
// ============================================

function analyzeCitationReadiness(websiteData) {
  console.log('📚 [Citation] Analyzing citation-worthy content...');

  const text = websiteData.text || '';
  const headings = websiteData.content?.headings || [];
  
  // Look for definition-style content
  const hasDefinitions = /what is|definition of|refers to|is defined as|means that/gi.test(text);
  const hasFAQs = headings.some(h => /faq|questions|q&a/i.test(h.text));
  const hasGuides = headings.some(h => /guide|tutorial|how to|step by step/i.test(h.text));
  const hasResources = /resource|whitepaper|case study|research/gi.test(text);
  
  const score = calculateCitationScore({
    hasDefinitions,
    hasFAQs,
    hasGuides,
    hasResources,
    wordCount: websiteData.content?.wordCount || 0
  });

  const opportunities = [];
  if (!hasDefinitions) opportunities.push({
    type: 'definition_page',
    opportunity: 'Create clear definition pages for key terms',
    impact: 'high',
    reason: 'AI engines prefer citing definitive sources'
  });
  if (!hasFAQs) opportunities.push({
    type: 'faq_page',
    opportunity: 'Add comprehensive FAQ section',
    impact: 'high',
    reason: 'FAQ content directly answers user questions'
  });
  if (!hasGuides) opportunities.push({
    type: 'guide_content',
    opportunity: 'Create detailed how-to guides',
    impact: 'medium',
    reason: 'Educational content increases citation potential'
  });

  return {
    score,
    hasDefinitions,
    hasFAQs,
    hasGuides,
    hasResources,
    opportunities,
    recommendations: opportunities.map(o => o.opportunity)
  };
}

function calculateCitationScore(data) {
  let score = 0;
  if (data.hasDefinitions) score += 25;
  if (data.hasFAQs) score += 25;
  if (data.hasGuides) score += 20;
  if (data.hasResources) score += 15;
  if (data.wordCount > 1000) score += 15;
  return Math.min(score, 100);
}

// ============================================
// ANSWERABILITY ANALYSIS
// ============================================

async function analyzeAnswerability(websiteData, productName, entities) {
  console.log('❓ [Answerability] Simulating user questions...');

  const text = websiteData.text || '';
  
  // Generate questions users might ask AI
  const questions = [
    { question: `What is ${productName}?`, type: 'definition', priority: 10 },
    { question: `How does ${productName} work?`, type: 'explanation', priority: 9 },
    { question: `What are the benefits of ${productName}?`, type: 'benefits', priority: 8 },
    { question: `How much does ${productName} cost?`, type: 'pricing', priority: 9 },
    { question: `Who uses ${productName}?`, type: 'audience', priority: 7 },
    { question: `What are ${productName} features?`, type: 'features', priority: 8 },
    { question: `Is ${productName} good?`, type: 'review', priority: 6 },
    { question: `${productName} vs alternatives`, type: 'comparison', priority: 8 }
  ];

  const analysis = questions.map(q => {
    const coverage = assessQuestionCoverage(q.question, text, websiteData);
    return {
      question: q.question,
      type: q.type,
      answerCoverage: coverage.score,
      confidenceScore: coverage.confidence,
      recommendation: coverage.recommendation,
      hasAnswer: coverage.hasAnswer
    };
  });

  const avgCoverage = analysis.reduce((sum, a) => sum + a.answerCoverage, 0) / analysis.length;

  // FAQ opportunities
  const faqOpportunities = analysis
    .filter(a => !a.hasAnswer || a.answerCoverage < 70)
    .map(a => ({
      question: a.question,
      reason: `Content doesn't fully answer this question (${a.answerCoverage}% coverage)`,
      impact: a.confidenceScore > 70 ? 'high' : 'medium',
      recommendation: a.recommendation
    }));

  return {
    score: Math.round(avgCoverage),
    questions: analysis,
    faqOpportunities,
    totalQuestions: questions.length,
    answeredQuestions: analysis.filter(a => a.hasAnswer).length
  };
}

function assessQuestionCoverage(question, text, websiteData) {
  const lower = text.toLowerCase();
  const qLower = question.toLowerCase();

  // Extract question keywords
  const keywords = qLower.replace(/what|how|who|when|where|why|is|does|are/g, '').trim().split(' ');
  
  // Check if keywords are present
  const keywordMatches = keywords.filter(kw => kw.length > 2 && lower.includes(kw)).length;
  const keywordCoverage = (keywordMatches / keywords.length) * 100;

  let hasAnswer = false;
  let score = keywordCoverage;
  let recommendation = '';

  // Specific question type analysis
  if (qLower.includes('what is')) {
    hasAnswer = /definition|is a|refers to|means|is defined as/i.test(text);
    score = hasAnswer ? Math.max(score, 75) : Math.min(score, 40);
    recommendation = hasAnswer ? 'Strengthen definition with examples' : 'Add clear definition section';
  } else if (qLower.includes('how does')) {
    hasAnswer = /step|process|works by|function|method/i.test(text);
    score = hasAnswer ? Math.max(score, 75) : Math.min(score, 40);
    recommendation = hasAnswer ? 'Add more detailed process explanation' : 'Create how-it-works section';
  } else if (qLower.includes('cost') || qLower.includes('price')) {
    hasAnswer = /price|cost|pricing|\$|usd|subscription|plan/i.test(text);
    score = hasAnswer ? Math.max(score, 80) : Math.min(score, 30);
    recommendation = hasAnswer ? 'Make pricing more prominent' : 'Add clear pricing information';
  } else if (qLower.includes('benefits') || qLower.includes('features')) {
    hasAnswer = /benefit|advantage|feature|capability/i.test(text);
    score = hasAnswer ? Math.max(score, 70) : Math.min(score, 35);
    recommendation = hasAnswer ? 'Organize benefits in bullet points' : 'Add benefits/features section';
  }

  return {
    score: Math.min(Math.round(score), 100),
    confidence: Math.min(Math.round(keywordCoverage), 100),
    hasAnswer,
    recommendation
  };
}

// ============================================
// TOPICAL AUTHORITY ANALYSIS
// ============================================

function analyzeTopicalAuthority(websiteData, productName, industry) {
  console.log('🎯 [Topical Authority] Analyzing content depth...');

  const text = websiteData.text || '';
  const headings = websiteData.content?.headings || [];
  const wordCount = websiteData.content?.wordCount || 0;

  // Topic coverage
  const topics = extractTopics(text, headings, productName, industry);
  
  // Content depth
  const depth = assessContentDepth(text, wordCount, headings);
  
  // Calculate score
  const score = calculateTopicalAuthorityScore({
    topicCount: topics.length,
    wordCount,
    headingCount: headings.length,
    depth: depth.score
  });

  return {
    score,
    topics,
    depth,
    strengths: depth.strengths,
    weaknesses: depth.weaknesses,
    missingTopics: generateMissingTopics(productName, industry, topics)
  };
}

function extractTopics(text, headings, productName, industry) {
  const topics = new Set();
  
  // Extract from headings
  headings.forEach(h => {
    const words = h.text.toLowerCase().split(' ');
    words.forEach(w => {
      if (w.length > 4 && !isStopWord(w)) {
        topics.add(w);
      }
    });
  });

  // Common topic patterns
  const topicPatterns = [
    'features', 'benefits', 'pricing', 'how to', 'tutorial', 'guide',
    'integration', 'api', 'security', 'compliance', 'support', 'case study',
    'comparison', 'vs', 'alternative', 'review', 'testimonial'
  ];

  topicPatterns.forEach(pattern => {
    if (new RegExp(pattern, 'i').test(text)) {
      topics.add(pattern);
    }
  });

  return Array.from(topics).slice(0, 20);
}

function calculateTopicalAuthorityScore({ topicCount, wordCount, headingCount, depth }) {
  let score = 0;
  
  // Topic coverage (0-30 points)
  score += Math.min(topicCount * 2, 30);
  
  // Content length (0-25 points)
  if (wordCount > 3000) score += 25;
  else if (wordCount > 2000) score += 20;
  else if (wordCount > 1000) score += 15;
  else if (wordCount > 500) score += 10;
  else score += 5;
  
  // Structure (0-20 points)
  score += Math.min(headingCount * 2, 20);
  
  // Content depth (0-25 points)
  score += Math.min(depth, 25);
  
  return Math.min(Math.round(score), 100);
}

function assessContentDepth(text, wordCount, headings) {
  const strengths = [];
  const weaknesses = [];
  let score = 0;

  if (wordCount > 2000) {
    strengths.push('Substantial content length (2000+ words)');
    score += 30;
  } else if (wordCount > 1000) {
    strengths.push('Good content length (1000+ words)');
    score += 20;
  } else {
    weaknesses.push('Content too short (under 1000 words)');
    score += 10;
  }

  if (headings.length > 10) {
    strengths.push('Well-structured with multiple sections');
    score += 25;
  } else if (headings.length > 5) {
    strengths.push('Decent structure');
    score += 15;
  } else {
    weaknesses.push('Limited content structure');
    score += 5;
  }

  // Content variety
  const hasLists = /•|\*|1\.|2\./g.test(text);
  const hasNumbers = /\d+%|\d+x|increase|decrease|improve/gi.test(text);
  const hasExamples = /example|for instance|such as/gi.test(text);

  if (hasLists) {
    strengths.push('Uses lists for clarity');
    score += 15;
  }
  if (hasNumbers) {
    strengths.push('Includes data and metrics');
    score += 15;
  }
  if (hasExamples) {
    strengths.push('Provides examples');
    score += 15;
  }

  if (!hasLists && !hasNumbers && !hasExamples) {
    weaknesses.push('Content lacks variety (no lists, data, or examples)');
  }

  return {
    score: Math.min(score, 100),
    strengths,
    weaknesses
  };
}

function generateMissingTopics(productName, industry, existingTopics) {
  const allTopics = [
    'pricing', 'features', 'benefits', 'how to use', 'tutorial',
    'comparison', 'alternatives', 'case studies', 'testimonials',
    'integration', 'api documentation', 'security', 'compliance',
    'support', 'faq', 'use cases', 'industry solutions'
  ];

  return allTopics
    .filter(topic => !existingTopics.some(t => t.includes(topic.split(' ')[0])))
    .slice(0, 10);
}

function isStopWord(word) {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were'
  ]);
  return stopWords.has(word.toLowerCase());
}

// ============================================
// PLATFORM-SPECIFIC SCORES
// ============================================

function calculatePlatformScores(data) {
  console.log('📊 [Platform Scores] Calculating individual platform visibility...');

  // Platform-specific scores require API keys (GROQ + DataForSEO/Exa/Tavily).
  // When unavailable, return null for aggregate scores to avoid fabricated metrics.
  const platformApisAvailable = !!(GROQ_API_KEY || TAVILY_API_KEY || EXA_API_KEY);

  return {
    overall: platformApisAvailable ? Math.round(
      (data.entities.score * 0.25) +
      (data.knowledgeGraphReadiness.score * 0.20) +
      (data.answerability.score * 0.25) +
      (data.citationReadiness.score * 0.15) +
      (data.topicalAuthority.score * 0.15)
    ) : null,
    chatgpt: 'Not measured',
    gemini: 'Not measured',
    claude: 'Not measured',
    perplexity: 'Not measured',
    googleAiOverview: platformApisAvailable ? Math.round(
      (data.knowledgeGraphReadiness.score * 0.35) +
      (data.entities.score * 0.25) +
      (data.answerability.score * 0.25) +
      (data.citationReadiness.score * 0.15)
    ) : null
  };
}

// ============================================
// AI CONTENT OPPORTUNITIES
// ============================================

function identifyAiContentOpportunities(websiteData, answerability, entities) {
  console.log('💡 [Opportunities] Identifying AI content gaps...');

  const opportunities = [];

  // FAQ opportunities from answerability analysis
  (answerability.faqOpportunities || []).forEach(faq => {
    opportunities.push({
      type: 'faq',
      opportunity: `FAQ: ${faq.question}`,
      reason: faq.reason,
      impact: faq.impact,
      difficulty: 'easy',
      priority: faq.impact === 'high' ? 9 : 7,
      recommendation: faq.recommendation
    });
  });

  // Missing glossary pages
  if (entities.list && entities.list.length > 5) {
    opportunities.push({
      type: 'glossary',
      opportunity: 'Create industry glossary page',
      reason: `Found ${entities.list.length} entities without definitions`,
      impact: 'high',
      difficulty: 'medium',
      priority: 8,
      recommendation: 'Define each key term with examples'
    });
  }

  // Missing comparison pages
  const hasComparison = /vs|versus|compared to|alternative/i.test(websiteData.text || '');
  if (!hasComparison) {
    opportunities.push({
      type: 'comparison',
      opportunity: 'Create product comparison pages',
      reason: 'No comparison content found - users search for alternatives',
      impact: 'high',
      difficulty: 'medium',
      priority: 9,
      recommendation: 'Compare with top 3-5 competitors'
    });
  }

  // Missing definition pages
  const hasDefinition = /what is|definition|refers to|is defined as/i.test(websiteData.text || '');
  if (!hasDefinition) {
    opportunities.push({
      type: 'definition',
      opportunity: 'Create definition pages for key concepts',
      reason: 'No clear definitions found - AI prefers citing definitive sources',
      impact: 'high',
      difficulty: 'easy',
      priority: 10,
      recommendation: 'Start with "What is [Product]?" page'
    });
  }

  // Entity Optimization
  if (entities.score < 50) {
    opportunities.push({
      type: 'entity_optimization',
      opportunity: 'Optimize content for core entities',
      reason: `Low entity coverage score (${entities.score}/100) limits AI understanding`,
      impact: 'high',
      difficulty: 'medium',
      priority: 9,
      recommendation: 'Ensure your brand, product, and key features are explicitly named and connected'
    });
  }

  // Answer Engine Snippets
  opportunities.push({
    type: 'answer_snippet',
    opportunity: 'Create AI-friendly Answer Snippets',
    reason: 'AI engines extract short, factual paragraphs to generate answers',
    impact: 'high',
    difficulty: 'medium',
    priority: 8,
    recommendation: 'Add a 40-60 word direct summary at the top of long-form articles'
  });

  // Schema Recommendations
  opportunities.push({
    type: 'schema_markup',
    opportunity: 'Deploy advanced Schema Markup',
    reason: 'Structured data is the primary way LLMs parse web relationships',
    impact: 'very_high',
    difficulty: 'hard',
    priority: 9,
    recommendation: 'Implement FAQ, Article, Organization, and SoftwareApplication schema'
  });

  return opportunities.sort((a, b) => b.priority - a.priority).slice(0, 15);
}

// ============================================
// TRUST SIGNALS ANALYSIS
// ============================================

function analyzeTrustSignals(websiteData) {
  console.log('🔒 [Trust Signals] Analyzing credibility indicators...');

  const text = websiteData.text || '';
  const lower = text.toLowerCase();

  const signals = {
    hasTestimonials: /testimonial|review|customer says|client feedback/i.test(text),
    hasCaseStudies: /case study|success story|customer story/i.test(text),
    hasAuthorPages: /author|written by|expert|team/i.test(text),
    hasAboutPage: /about us|our story|our mission|our team/i.test(text),
    hasContactPage: /contact|reach us|get in touch/i.test(text),
    hasCertifications: /certified|certification|compliance|iso|soc 2|gdpr/i.test(text),
    hasSecurityInfo: /security|encryption|secure|privacy|data protection/i.test(text),
    hasNumbers: /\d+\+?\s*(users|customers|companies|years)/i.test(text)
  };

  const score = Object.values(signals).filter(Boolean).length * 12.5; // Max 100

  const recommendations = [];
  if (!signals.hasTestimonials) recommendations.push('Add customer testimonials');
  if (!signals.hasCaseStudies) recommendations.push('Create case studies');
  if (!signals.hasAuthorPages) recommendations.push('Add author/expert bios');
  if (!signals.hasCertifications) recommendations.push('Display certifications/compliance badges');
  if (!signals.hasNumbers) recommendations.push('Add social proof numbers (users, customers)');

  return {
    score: Math.round(score),
    signals,
    recommendations,
    present: Object.entries(signals).filter(([_, v]) => v).map(([k]) => k),
    missing: Object.entries(signals).filter(([_, v]) => !v).map(([k]) => k)
  };
}

// ============================================
// RECOMMENDATIONS ENGINE
// ============================================

function generateRecommendations(data) {
  console.log('📋 [Recommendations] Generating action plan...');

  const immediate = [];
  const day30 = [];
  const day90 = [];

  // Immediate fixes (0-7 days)
  if ((data.knowledgeGraphReadiness?.score || 0) < 60) {
    (data.knowledgeGraphReadiness?.missingElements || []).slice(0, 2).forEach(element => {
      immediate.push({
        action: `Add ${element}`,
        impact: 'high',
        difficulty: 'easy',
        reason: 'Critical for AI search visibility'
      });
    });
  }

  if ((data.citationReadiness?.opportunities || []).length > 0) {
    immediate.push({
      action: 'Create FAQ page with top 10 questions',
      impact: 'high',
      difficulty: 'easy',
      reason: 'FAQ content directly answers AI queries'
    });
  }

  if ((data.trustSignals?.score || 0) < 50) {
    immediate.push({
      action: 'Add social proof (customer count, testimonials)',
      impact: 'medium',
      difficulty: 'easy',
      reason: 'Trust signals improve AI citation probability'
    });
  }

  // 30-day improvements
  (data.aiContentOpportunities || []).slice(0, 5).forEach(opp => {
    day30.push({
      action: opp.opportunity,
      impact: opp.impact,
      difficulty: opp.difficulty,
      reason: opp.reason
    });
  });

  if ((data.topicalAuthority?.score || 0) < 60) {
    day30.push({
      action: 'Expand content depth - target 2000+ words per page',
      impact: 'high',
      difficulty: 'medium',
      reason: 'AI prefers comprehensive, authoritative content'
    });
  }

  // 90-day improvements
  if (data.entities.score < 70) {
    day90.push({
      action: 'Create entity pages for all major products/services',
      impact: 'high',
      difficulty: 'medium',
      reason: 'Improves AI understanding of your offerings'
    });
  }

  day90.push({
    action: 'Build knowledge base with 20+ detailed guides',
    impact: 'high',
    difficulty: 'hard',
    reason: 'Positions you as citation-worthy authority'
  });

  day90.push({
    action: 'Create comparison matrix with all competitors',
    impact: 'high',
    difficulty: 'medium',
    reason: 'Captures AI comparison queries'
  });

  return {
    immediate: immediate.slice(0, 5),
    day30: day30.slice(0, 5),
    day90: day90.slice(0, 5)
  };
}

// ============================================
// AI HELPER
// ============================================

async function callGroqAI(prompt) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!response.ok) throw new Error('Groq API error');

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) throw new Error('No content in response');

  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(content);
  } catch {
    throw new Error('Failed to parse JSON');
  }
}

// ============================================
// FALLBACK
// ============================================

function generateFallbackGeoIntelligence(productName, industry) {
  console.log('🔄 [Fallback] Generating fallback GEO intelligence...');

  return {
    aiVisibilityScore: null,
    chatGptScore: 'Not measured',
    geminiScore: 'Not measured',
    claudeScore: 'Not measured',
    perplexityScore: 'Not measured',
    googleAiOverviewScore: null,
    
    entityCoverageScore: 30,
    knowledgeGraphReadinessScore: 25,
    citationReadinessScore: 35,
    answerabilityScore: 40,
    topicalAuthorityScore: 30,
    
    entities: [],
    knowledgeGraphEntities: [],
    citationOpportunities: [],
    faqOpportunities: [],
    aiContentOpportunities: [],
    trustSignals: {},
    recommendations: {},
    
    metadata: {
      analyzedAt: new Date().toISOString(),
      totalEntities: 0,
      totalOpportunities: 0,
      fallback: true,
      reason: 'GEO analysis requires website data and technical audit'
    }
  };
}

// PART 17: Evidence-based GEO readiness assessment
export function assessGeoReadiness(geoIntelligence, technicalAudit, websiteData) {
  const readiness = {
    overall: 'unknown',
    components: {},
    blockers: [],
    enablers: [],
    confidence: 0
  };

  // Check if we have valid data
  const hasValidData = geoIntelligence && !geoIntelligence.metadata?.fallback;
  if (!hasValidData) {
    readiness.overall = 'insufficient_data';
    readiness.confidence = 0;
    readiness.blockers.push('No valid GEO intelligence data available');
    return readiness;
  }

  // Assess knowledge graph readiness
  const kgScore = geoIntelligence.knowledgeGraphReadinessScore ?? 0;
  readiness.components.knowledgeGraph = kgScore >= 70 ? 'ready' : kgScore >= 50 ? 'partial' : 'not_ready';
  if (kgScore < 50) {
    readiness.blockers.push('Knowledge graph schema markup insufficient');
  } else {
    readiness.enablers.push('Knowledge graph schema present');
  }

  // Assess citation readiness
  const citationScore = geoIntelligence.citationReadinessScore ?? 0;
  readiness.components.citation = citationScore >= 70 ? 'ready' : citationScore >= 50 ? 'partial' : 'not_ready';
  if (citationScore < 50) {
    readiness.blockers.push('Citation-worthy content (FAQs, definitions) missing');
  } else {
    readiness.enablers.push('Citation-worthy content present');
  }

  // Assess answerability
  const answerabilityScore = geoIntelligence.answerabilityScore ?? 0;
  readiness.components.answerability = answerabilityScore >= 70 ? 'ready' : answerabilityScore >= 50 ? 'partial' : 'not_ready';
  if (answerabilityScore < 50) {
    readiness.blockers.push('Content does not answer key user questions');
  } else {
    readiness.enablers.push('Content answers user questions');
  }

  // Assess entity coverage
  const entityScore = geoIntelligence.entityCoverageScore ?? 0;
  readiness.components.entities = entityScore >= 70 ? 'ready' : entityScore >= 50 ? 'partial' : 'not_ready';
  if (entityScore < 50) {
    readiness.blockers.push('Entity coverage insufficient for AI understanding');
  } else {
    readiness.enablers.push('Entity coverage adequate');
  }

  // Assess topical authority
  const topicalScore = geoIntelligence.topicalAuthorityScore ?? 0;
  readiness.components.topicalAuthority = topicalScore >= 70 ? 'ready' : topicalScore >= 50 ? 'partial' : 'not_ready';
  if (topicalScore < 50) {
    readiness.blockers.push('Content depth insufficient for topical authority');
  } else {
    readiness.enablers.push('Content depth adequate');
  }

  // Calculate overall readiness
  const componentScores = [
    kgScore,
    citationScore,
    answerabilityScore,
    entityScore,
    topicalScore
  ];
  const avgScore = componentScores.reduce((sum, s) => sum + (s ?? 0), 0) / componentScores.length;

  if (avgScore >= 70) {
    readiness.overall = 'ready';
  } else if (avgScore >= 50) {
    readiness.overall = 'partial';
  } else {
    readiness.overall = 'not_ready';
  }

  // Confidence based on data quality
  readiness.confidence = hasValidData ? Math.round(avgScore) : 0;

  // Technical audit integration
  if (technicalAudit) {
    const hasCoreWebVitals = technicalAudit.performanceScore >= 50;
    if (!hasCoreWebVitals) {
      readiness.blockers.push('Core Web Vitals below threshold - affects AI crawlability');
    } else {
      readiness.enablers.push('Core Web Vitals passing');
    }
  }

  return readiness;
}

// PART 17: Generate GEO readiness report
export function generateGeoReadinessReport(geoIntelligence, technicalAudit, websiteData, identity) {
  const readiness = assessGeoReadiness(geoIntelligence, technicalAudit, websiteData);
  const productName = identity?.productName || 'Product';

  const report = {
    productName,
    overallReadiness: readiness.overall,
    confidence: readiness.confidence,
    readinessScore: readiness.confidence,
    
    componentReadiness: readiness.components,
    
    blockers: readiness.blockers.map(blocker => ({
      issue: blocker,
      severity: 'high',
      estimatedFixTime: '7-30 days'
    })),
    
    enablers: readiness.enablers.map(enabler => ({
      strength: enabler,
      impact: 'positive'
    })),
    
    prioritizedActions: generatePrioritizedGeoActions(readiness, geoIntelligence),
    
    platformReadiness: {
      googleAiOverview: geoIntelligence.googleAiOverviewScore >= 70 ? 'ready' : 'needs_work',
      chatGpt: geoIntelligence.chatGptScore === 'Not measured' ? 'not_measured' : 'needs_work',
      gemini: geoIntelligence.geminiScore === 'Not measured' ? 'not_measured' : 'needs_work',
      claude: geoIntelligence.claudeScore === 'Not measured' ? 'not_measured' : 'needs_work',
      perplexity: geoIntelligence.perplexityScore === 'Not measured' ? 'not_measured' : 'needs_work'
    },
    
    evidence: {
      hasKnowledgeGraphData: geoIntelligence.knowledgeGraphEntities?.length > 0,
      hasCitationData: geoIntelligence.citationOpportunities?.length > 0,
      hasAnswerabilityData: geoIntelligence.faqOpportunities?.length > 0,
      hasEntityData: geoIntelligence.entities?.length > 0,
      hasTopicalData: geoIntelligence.topicalAuthorityScore !== null,
      sourcesAnalyzed: [
        'website content',
        'schema markup',
        'technical audit',
        'content structure'
      ]
    },
    
    metadata: {
      assessedAt: new Date().toISOString(),
      dataFreshness: 'current',
      methodology: 'evidence-based multi-factor analysis'
    }
  };

  return report;
}

// PART 17: Generate prioritized GEO actions
function generatePrioritizedGeoActions(readiness, geoIntelligence) {
  const actions = [];

  // High priority: Knowledge graph schema
  if (readiness.components.knowledgeGraph !== 'ready') {
    actions.push({
      action: 'Implement Organization schema markup',
      priority: 'critical',
      impact: 'high',
      difficulty: 'easy',
      timeline: '7 days',
      reason: 'Organization schema is foundational for AI search understanding'
    });
  }

  // High priority: FAQ content
  if (readiness.components.answerability !== 'ready') {
    actions.push({
      action: 'Create comprehensive FAQ section',
      priority: 'critical',
      impact: 'high',
      difficulty: 'easy',
      timeline: '7 days',
      reason: 'FAQ content directly answers AI user queries'
    });
  }

  // High priority: Definition pages
  if (readiness.components.citation !== 'ready') {
    actions.push({
      action: 'Create definition pages for key concepts',
      priority: 'high',
      impact: 'high',
      difficulty: 'medium',
      timeline: '14 days',
      reason: 'Definition pages are citation-worthy for AI engines'
    });
  }

  // Medium priority: Entity optimization
  if (readiness.components.entities !== 'ready') {
    actions.push({
      action: 'Optimize content for entity coverage',
      priority: 'high',
      impact: 'medium',
      difficulty: 'medium',
      timeline: '30 days',
      reason: 'Better entity coverage improves AI understanding'
    });
  }

  // Medium priority: Content depth
  if (readiness.components.topicalAuthority !== 'ready') {
    actions.push({
      action: 'Expand content depth to 2000+ words',
      priority: 'medium',
      impact: 'medium',
      difficulty: 'medium',
      timeline: '30 days',
      reason: 'AI engines prefer comprehensive, authoritative content'
    });
  }

  return actions.slice(0, 10);
}

export default {
  generateGeoIntelligence,
  assessGeoReadiness,
  generateGeoReadinessReport
};
