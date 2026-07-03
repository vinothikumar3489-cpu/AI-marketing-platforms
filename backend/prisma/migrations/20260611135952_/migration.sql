-- CreateTable
CREATE TABLE "SeoAnalysis" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "seoScore" INTEGER NOT NULL,
    "visibilityScore" INTEGER NOT NULL,
    "organicTraffic" INTEGER NOT NULL,
    "keywordCount" INTEGER NOT NULL,
    "backlinkCount" INTEGER NOT NULL,
    "avgPosition" DOUBLE PRECISION NOT NULL,
    "ctr" DOUBLE PRECISION NOT NULL,
    "topKeywords" JSONB NOT NULL,
    "competitorKeywords" JSONB NOT NULL,
    "backlinks" JSONB NOT NULL,
    "trafficEstimate" JSONB NOT NULL,
    "technicalIssues" JSONB NOT NULL,
    "contentSuggestions" JSONB NOT NULL,
    "prediction" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeoAnalysis_chatId_key" ON "SeoAnalysis"("chatId");
