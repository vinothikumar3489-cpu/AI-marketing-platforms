-- AlterTable
ALTER TABLE "ContentGap" ALTER COLUMN "opportunityScore" DROP NOT NULL;

-- AlterTable
ALTER TABLE "GeoIntelligenceRecord" ALTER COLUMN "aiVisibilityScore" DROP NOT NULL,
ALTER COLUMN "chatGptScore" DROP NOT NULL,
ALTER COLUMN "geminiScore" DROP NOT NULL,
ALTER COLUMN "claudeScore" DROP NOT NULL,
ALTER COLUMN "perplexityScore" DROP NOT NULL,
ALTER COLUMN "googleAiOverviewScore" DROP NOT NULL,
ALTER COLUMN "entityCoverageScore" DROP NOT NULL,
ALTER COLUMN "knowledgeGraphReadinessScore" DROP NOT NULL,
ALTER COLUMN "citationReadinessScore" DROP NOT NULL,
ALTER COLUMN "answerabilityScore" DROP NOT NULL,
ALTER COLUMN "topicalAuthorityScore" DROP NOT NULL;

-- AlterTable
ALTER TABLE "KeywordIntelligenceRecord" ALTER COLUMN "totalKeywords" DROP NOT NULL,
ALTER COLUMN "clustersCount" DROP NOT NULL,
ALTER COLUMN "opportunitiesCount" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SeoScoreBreakdown" ALTER COLUMN "technicalScore" DROP NOT NULL,
ALTER COLUMN "onPageScore" DROP NOT NULL,
ALTER COLUMN "contentScore" DROP NOT NULL,
ALTER COLUMN "authorityScore" DROP NOT NULL,
ALTER COLUMN "aiVisibilityScore" DROP NOT NULL,
ALTER COLUMN "localSeoScore" DROP NOT NULL,
ALTER COLUMN "overallScore" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TechnicalSeoAudit" ALTER COLUMN "overallScore" DROP NOT NULL,
ALTER COLUMN "titleScore" DROP NOT NULL,
ALTER COLUMN "metaScore" DROP NOT NULL,
ALTER COLUMN "securityScore" DROP NOT NULL,
ALTER COLUMN "mobileScore" DROP NOT NULL,
ALTER COLUMN "headingScore" DROP NOT NULL,
ALTER COLUMN "schemaScore" DROP NOT NULL;
