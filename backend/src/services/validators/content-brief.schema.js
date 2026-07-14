/**
 * Content Brief Schema Validation with Zod
 * Validates the canonical Content Brief structure
 */

import { z } from 'zod';

// Inference status enum
const InferenceStatusSchema = z.enum(['EVIDENCE_BACKED', 'AI_INFERRED', 'USER_PROVIDED', 'NOT_MEASURED']);

// Keyword schema
const KeywordSchema = z.object({
  keyword: z.string().nullable(),
  volume: z.number().nullable(),
  difficulty: z.number().nullable(),
  opportunity: z.number().nullable(),
  trend: z.string().nullable()
});

// Content gap schema
const ContentGapSchema = z.object({
  topic: z.string().nullable(),
  reason: z.string().nullable(),
  priority: z.string().nullable()
});

// Blog idea schema
const BlogIdeaSchema = z.object({
  topic: z.string().nullable(),
  reason: z.string().nullable(),
  contentType: z.string().default('blog')
});

// Persona schema
const PersonaSchema = z.object({
  name: z.string().nullable(),
  role: z.string().nullable(),
  painPoints: z.array(z.string()).default([]),
  goals: z.array(z.string()).default([])
});

// Competitor schema
const CompetitorSchema = z.object({
  name: z.string().nullable(),
  domain: z.string().nullable(),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([])
});

// Company schema
const CompanySchema = z.object({
  name: z.string().nullable(),
  productName: z.string().nullable(),
  brandName: z.string().nullable(),
  websiteUrl: z.string().url().nullable().or(z.literal(null)),
  domain: z.string().nullable(),
  industry: z.string().nullable()
});

// Feature schema (structured object)
const FeatureSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  benefit: z.string().nullable().optional(),
  evidence: z.string().nullable().optional(),
  inferenceStatus: InferenceStatusSchema.optional()
});

// Benefit schema (structured object)
const BenefitSchema = z.object({
  text: z.string(),
  evidence: z.string().nullable().optional(),
  inferenceStatus: InferenceStatusSchema.optional()
});

// Product schema with structured features and benefits
const ProductSchema = z.object({
  name: z.string().nullable(),
  brandName: z.string().nullable(),
  summary: z.string().nullable(),
  features: z.array(FeatureSchema).default([]),
  benefits: z.array(BenefitSchema).default([]),
  usp: z.string().nullable()
});

// Website schema
const WebsiteSchema = z.object({
  title: z.string().nullable(),
  metaDescription: z.string().nullable(),
  heroText: z.string().nullable(),
  ctaTexts: z.array(z.string()).default([]),
  pageTypes: z.string().nullable(),
  technologyHints: z.array(z.string()).default([])
});

// Evidence sources schema
const EvidenceSourcesSchema = z.object({
  hasEvidenceSnapshot: z.boolean(),
  hasProductIntel: z.boolean(),
  hasCompetitorIntel: z.boolean(),
  hasSeoIntel: z.boolean()
});

// Full Content Brief schema
const ContentBriefSchema = z.object({
  company: CompanySchema,
  product: ProductSchema,
  website: WebsiteSchema,
  targetPersonas: z.array(PersonaSchema).default([]),
  painPoints: z.array(z.string()).default([]),
  objections: z.array(z.string()).default([]),
  validatedCompetitors: z.array(CompetitorSchema).default([]),
  verifiedKeywords: z.array(KeywordSchema).default([]),
  topicIdeas: z.array(BlogIdeaSchema).default([]),
  contentGaps: z.array(ContentGapSchema).default([]),
  tone: z.string().default('professional'),
  CTA: z.array(z.string()).default([]),
  evidenceSources: EvidenceSourcesSchema,
  limitations: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  _briefId: z.string(),
  _chatId: z.string(),
  _userId: z.string(),
  _builtAt: z.string()
});

// Response wrapper schema
const ContentBriefResponseSchema = z.object({
  success: z.boolean(),
  data: ContentBriefSchema.optional(),
  warnings: z.array(z.string()).default([])
});

/**
 * Validate Content Brief without normalization
 * Normalization is done in content-brief.service.js before validation
 */
export function validateContentBrief(brief) {
  const validationWarnings = [];
  
  try {
    const validated = ContentBriefResponseSchema.parse(brief);
    return { 
      valid: true, 
      data: validated,
      validationStatus: 'VALID',
      validationWarnings
    };
  } catch (error) {
    console.error('[Content Brief Validation] Error:', error.errors);
    return { 
      valid: false, 
      validationStatus: 'INVALID',
      validationWarnings,
      errors: error.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message
      }))
    };
  }
}

export default { 
  ContentBriefSchema, 
  ContentBriefResponseSchema, 
  validateContentBrief 
};
