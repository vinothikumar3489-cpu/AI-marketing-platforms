/*
  Warnings:

  - You are about to drop the `GeoIntelligence` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `KeywordIntelligence` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "GeoIntelligence" DROP CONSTRAINT "GeoIntelligence_seoIntelligenceId_fkey";

-- DropForeignKey
ALTER TABLE "KeywordIntelligence" DROP CONSTRAINT "KeywordIntelligence_seoIntelligenceId_fkey";

-- DropTable
DROP TABLE "GeoIntelligence";

-- DropTable
DROP TABLE "KeywordIntelligence";

-- CreateTable
CREATE TABLE "KeywordIntelligenceRecord" (
    "id" TEXT NOT NULL,
    "seoIntelligenceId" TEXT NOT NULL,
    "primaryKeywords" JSONB NOT NULL,
    "secondaryKeywords" JSONB NOT NULL,
    "longTailKeywords" JSONB NOT NULL,
    "questionKeywords" JSONB NOT NULL,
    "clusters" JSONB NOT NULL,
    "competitorKeywords" JSONB NOT NULL,
    "contentOpportunities" JSONB NOT NULL,
    "geoKeywords" JSONB NOT NULL,
    "totalKeywords" INTEGER NOT NULL DEFAULT 0,
    "clustersCount" INTEGER NOT NULL DEFAULT 0,
    "opportunitiesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KeywordIntelligenceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeoIntelligenceRecord" (
    "id" TEXT NOT NULL,
    "seoIntelligenceId" TEXT NOT NULL,
    "aiVisibilityScore" INTEGER NOT NULL,
    "chatGptScore" INTEGER NOT NULL,
    "geminiScore" INTEGER NOT NULL,
    "claudeScore" INTEGER NOT NULL,
    "perplexityScore" INTEGER NOT NULL,
    "googleAiOverviewScore" INTEGER NOT NULL,
    "entityCoverageScore" INTEGER NOT NULL,
    "knowledgeGraphReadinessScore" INTEGER NOT NULL,
    "citationReadinessScore" INTEGER NOT NULL,
    "answerabilityScore" INTEGER NOT NULL,
    "topicalAuthorityScore" INTEGER NOT NULL,
    "entities" JSONB NOT NULL,
    "knowledgeGraphEntities" JSONB NOT NULL,
    "citationOpportunities" JSONB NOT NULL,
    "faqOpportunities" JSONB NOT NULL,
    "aiContentOpportunities" JSONB NOT NULL,
    "trustSignals" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeoIntelligenceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentGapRecord" (
    "id" TEXT NOT NULL,
    "seoIntelligenceId" TEXT NOT NULL,
    "contentGaps" JSONB NOT NULL,
    "landingPageIdeas" JSONB NOT NULL,
    "comparisonPageIdeas" JSONB NOT NULL,
    "faqOpportunities" JSONB NOT NULL,
    "geoContentIdeas" JSONB NOT NULL,
    "resourcePageIdeas" JSONB NOT NULL,
    "contentCalendar" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentGapRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogIntelligenceRecord" (
    "id" TEXT NOT NULL,
    "seoIntelligenceId" TEXT NOT NULL,
    "blogIdeas" JSONB NOT NULL,
    "blogClusters" JSONB NOT NULL,
    "blogBriefs" JSONB NOT NULL,
    "publishingCalendar" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogIntelligenceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorSeoRecord" (
    "id" TEXT NOT NULL,
    "seoIntelligenceId" TEXT NOT NULL,
    "competitors" JSONB NOT NULL,
    "competitorProfiles" JSONB NOT NULL,
    "keywordGaps" JSONB NOT NULL,
    "contentGaps" JSONB NOT NULL,
    "authorityGaps" JSONB NOT NULL,
    "geoGaps" JSONB NOT NULL,
    "competitorMatrix" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitorSeoRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KeywordIntelligenceRecord_seoIntelligenceId_key" ON "KeywordIntelligenceRecord"("seoIntelligenceId");

-- CreateIndex
CREATE INDEX "KeywordIntelligenceRecord_seoIntelligenceId_idx" ON "KeywordIntelligenceRecord"("seoIntelligenceId");

-- CreateIndex
CREATE UNIQUE INDEX "GeoIntelligenceRecord_seoIntelligenceId_key" ON "GeoIntelligenceRecord"("seoIntelligenceId");

-- CreateIndex
CREATE INDEX "GeoIntelligenceRecord_seoIntelligenceId_idx" ON "GeoIntelligenceRecord"("seoIntelligenceId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentGapRecord_seoIntelligenceId_key" ON "ContentGapRecord"("seoIntelligenceId");

-- CreateIndex
CREATE INDEX "ContentGapRecord_seoIntelligenceId_idx" ON "ContentGapRecord"("seoIntelligenceId");

-- CreateIndex
CREATE UNIQUE INDEX "BlogIntelligenceRecord_seoIntelligenceId_key" ON "BlogIntelligenceRecord"("seoIntelligenceId");

-- CreateIndex
CREATE INDEX "BlogIntelligenceRecord_seoIntelligenceId_idx" ON "BlogIntelligenceRecord"("seoIntelligenceId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitorSeoRecord_seoIntelligenceId_key" ON "CompetitorSeoRecord"("seoIntelligenceId");

-- CreateIndex
CREATE INDEX "CompetitorSeoRecord_seoIntelligenceId_idx" ON "CompetitorSeoRecord"("seoIntelligenceId");

-- AddForeignKey
ALTER TABLE "KeywordIntelligenceRecord" ADD CONSTRAINT "KeywordIntelligenceRecord_seoIntelligenceId_fkey" FOREIGN KEY ("seoIntelligenceId") REFERENCES "SeoIntelligence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeoIntelligenceRecord" ADD CONSTRAINT "GeoIntelligenceRecord_seoIntelligenceId_fkey" FOREIGN KEY ("seoIntelligenceId") REFERENCES "SeoIntelligence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentGapRecord" ADD CONSTRAINT "ContentGapRecord_seoIntelligenceId_fkey" FOREIGN KEY ("seoIntelligenceId") REFERENCES "SeoIntelligence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogIntelligenceRecord" ADD CONSTRAINT "BlogIntelligenceRecord_seoIntelligenceId_fkey" FOREIGN KEY ("seoIntelligenceId") REFERENCES "SeoIntelligence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorSeoRecord" ADD CONSTRAINT "CompetitorSeoRecord_seoIntelligenceId_fkey" FOREIGN KEY ("seoIntelligenceId") REFERENCES "SeoIntelligence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
