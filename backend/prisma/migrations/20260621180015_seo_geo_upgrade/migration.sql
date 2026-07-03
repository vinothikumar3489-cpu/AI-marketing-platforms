-- AlterTable
ALTER TABLE "ProductAnalysis" ADD COLUMN     "apiStatus" JSONB,
ADD COLUMN     "confidenceBreakdown" JSONB,
ADD COLUMN     "directCompetitors" JSONB,
ADD COLUMN     "emergingCompetitors" JSONB,
ADD COLUMN     "fallbackUsed" BOOLEAN DEFAULT false,
ADD COLUMN     "indirectCompetitors" JSONB,
ADD COLUMN     "inputJson" JSONB,
ADD COLUMN     "outputJson" JSONB,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "recommendedChannels" JSONB;

-- CreateTable
CREATE TABLE "ProductIntelligence" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productAnalysis" JSONB,
    "marketDiscovery" JSONB,
    "audienceIntelligence" JSONB,
    "provider" TEXT,
    "fallbackUsed" BOOLEAN DEFAULT false,
    "inputJson" JSONB,
    "status" TEXT DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductIntelligence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorIntelligence" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "competitorAnalysis" JSONB,
    "intentPrediction" JSONB,
    "positioningEngine" JSONB,
    "provider" TEXT,
    "fallbackUsed" BOOLEAN DEFAULT false,
    "inputJson" JSONB,
    "status" TEXT DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitorIntelligence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignIntelligence" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignGenerator" JSONB,
    "channelRecommendation" JSONB,
    "contentStudio" JSONB,
    "analytics" JSONB,
    "roiOptimizer" JSONB,
    "provider" TEXT,
    "fallbackUsed" BOOLEAN DEFAULT false,
    "inputJson" JSONB,
    "status" TEXT DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignIntelligence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoIntelligence" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "seoScore" INTEGER,
    "technicalAudit" JSONB,
    "keywordOpportunities" JSONB,
    "competitorKeywords" JSONB,
    "contentGaps" JSONB,
    "aiVisibility" JSONB,
    "landingPageSuggestions" JSONB,
    "blogIdeas" JSONB,
    "actionPlan" JSONB,
    "providers" JSONB,
    "warnings" JSONB,
    "status" TEXT DEFAULT 'pending',
    "fallbackUsed" BOOLEAN DEFAULT false,
    "inputJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoIntelligence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawCrawlData" (
    "id" TEXT NOT NULL,
    "seoIntelligenceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "technical" JSONB NOT NULL,
    "content" JSONB NOT NULL,
    "structured" JSONB NOT NULL,
    "provider" TEXT NOT NULL,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawCrawlData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnicalSeoAudit" (
    "id" TEXT NOT NULL,
    "seoIntelligenceId" TEXT NOT NULL,
    "auditData" JSONB NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "titleScore" INTEGER NOT NULL,
    "metaScore" INTEGER NOT NULL,
    "securityScore" INTEGER NOT NULL,
    "mobileScore" INTEGER NOT NULL,
    "headingScore" INTEGER NOT NULL,
    "schemaScore" INTEGER NOT NULL,
    "criticalIssues" JSONB NOT NULL,
    "highIssues" JSONB NOT NULL,
    "mediumIssues" JSONB NOT NULL,
    "lowIssues" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TechnicalSeoAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoScoreBreakdown" (
    "id" TEXT NOT NULL,
    "seoIntelligenceId" TEXT NOT NULL,
    "technicalScore" INTEGER NOT NULL,
    "onPageScore" INTEGER NOT NULL,
    "contentScore" INTEGER NOT NULL,
    "authorityScore" INTEGER NOT NULL,
    "aiVisibilityScore" INTEGER NOT NULL,
    "localSeoScore" INTEGER NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "scoreHistory" JSONB,
    "lastCalculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeoScoreBreakdown_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeywordIntelligence" (
    "id" TEXT NOT NULL,
    "seoIntelligenceId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "opportunity" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "volumeEstimate" TEXT,
    "competitionLevel" TEXT,
    "priority" INTEGER NOT NULL,
    "topicCluster" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KeywordIntelligence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicCluster" (
    "id" TEXT NOT NULL,
    "seoIntelligenceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keywords" JSONB NOT NULL,
    "priority" INTEGER NOT NULL,
    "contentSuggestions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TopicCluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoCompetitorIntelligence" (
    "id" TEXT NOT NULL,
    "seoIntelligenceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "strengths" JSONB NOT NULL,
    "weaknesses" JSONB NOT NULL,
    "contentStrategy" TEXT,
    "positioning" TEXT,
    "seoAdvantages" JSONB NOT NULL,
    "keywordGaps" JSONB NOT NULL,
    "contentGaps" JSONB NOT NULL,
    "authorityGaps" JSONB NOT NULL,
    "authorityEstimate" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeoCompetitorIntelligence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeoIntelligence" (
    "id" TEXT NOT NULL,
    "seoIntelligenceId" TEXT NOT NULL,
    "aiVisibilityScore" INTEGER NOT NULL,
    "entityCoverageScore" INTEGER NOT NULL,
    "knowledgeGraphReadiness" INTEGER NOT NULL,
    "citationReadiness" INTEGER NOT NULL,
    "answerabilityScore" INTEGER NOT NULL,
    "topicalAuthorityScore" INTEGER NOT NULL,
    "brandMentions" JSONB NOT NULL,
    "entityCoverage" JSONB NOT NULL,
    "structuredDataAudit" JSONB NOT NULL,
    "topicDepthAnalysis" JSONB NOT NULL,
    "answerFormat" JSONB NOT NULL,
    "faqPresence" JSONB NOT NULL,
    "expertiseSignals" JSONB NOT NULL,
    "trustSignals" JSONB NOT NULL,
    "chatgptOptimization" JSONB NOT NULL,
    "geminiOptimization" JSONB NOT NULL,
    "claudeOptimization" JSONB NOT NULL,
    "perplexityOptimization" JSONB NOT NULL,
    "googleAiOverviews" JSONB NOT NULL,
    "citationOpportunities" JSONB NOT NULL,
    "entityPages" JSONB NOT NULL,
    "definitionBlocks" JSONB NOT NULL,
    "faqSuggestions" JSONB NOT NULL,
    "referencePages" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeoIntelligence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentGap" (
    "id" TEXT NOT NULL,
    "seoIntelligenceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "opportunityScore" INTEGER NOT NULL,
    "priority" TEXT NOT NULL,
    "competitors" JSONB NOT NULL,
    "suggestedPage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentGap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogIntelligence" (
    "id" TEXT NOT NULL,
    "seoIntelligenceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "opportunity" TEXT NOT NULL,
    "estimatedImpact" TEXT NOT NULL,
    "outline" JSONB,
    "metaDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogIntelligence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "input" JSONB,
    "output" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductIntelligence_chatId_key" ON "ProductIntelligence"("chatId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitorIntelligence_chatId_key" ON "CompetitorIntelligence"("chatId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignIntelligence_chatId_key" ON "CampaignIntelligence"("chatId");

-- CreateIndex
CREATE UNIQUE INDEX "SeoIntelligence_chatId_key" ON "SeoIntelligence"("chatId");

-- CreateIndex
CREATE INDEX "RawCrawlData_seoIntelligenceId_idx" ON "RawCrawlData"("seoIntelligenceId");

-- CreateIndex
CREATE UNIQUE INDEX "TechnicalSeoAudit_seoIntelligenceId_key" ON "TechnicalSeoAudit"("seoIntelligenceId");

-- CreateIndex
CREATE UNIQUE INDEX "SeoScoreBreakdown_seoIntelligenceId_key" ON "SeoScoreBreakdown"("seoIntelligenceId");

-- CreateIndex
CREATE INDEX "KeywordIntelligence_seoIntelligenceId_priority_idx" ON "KeywordIntelligence"("seoIntelligenceId", "priority");

-- CreateIndex
CREATE INDEX "KeywordIntelligence_topicCluster_idx" ON "KeywordIntelligence"("topicCluster");

-- CreateIndex
CREATE INDEX "TopicCluster_seoIntelligenceId_priority_idx" ON "TopicCluster"("seoIntelligenceId", "priority");

-- CreateIndex
CREATE INDEX "SeoCompetitorIntelligence_seoIntelligenceId_type_idx" ON "SeoCompetitorIntelligence"("seoIntelligenceId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "GeoIntelligence_seoIntelligenceId_key" ON "GeoIntelligence"("seoIntelligenceId");

-- CreateIndex
CREATE INDEX "ContentGap_seoIntelligenceId_opportunityScore_idx" ON "ContentGap"("seoIntelligenceId", "opportunityScore");

-- CreateIndex
CREATE INDEX "BlogIntelligence_seoIntelligenceId_opportunity_idx" ON "BlogIntelligence"("seoIntelligenceId", "opportunity");

-- AddForeignKey
ALTER TABLE "ProductIntelligence" ADD CONSTRAINT "ProductIntelligence_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductIntelligence" ADD CONSTRAINT "ProductIntelligence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorIntelligence" ADD CONSTRAINT "CompetitorIntelligence_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorIntelligence" ADD CONSTRAINT "CompetitorIntelligence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignIntelligence" ADD CONSTRAINT "CampaignIntelligence_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignIntelligence" ADD CONSTRAINT "CampaignIntelligence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoIntelligence" ADD CONSTRAINT "SeoIntelligence_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoIntelligence" ADD CONSTRAINT "SeoIntelligence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawCrawlData" ADD CONSTRAINT "RawCrawlData_seoIntelligenceId_fkey" FOREIGN KEY ("seoIntelligenceId") REFERENCES "SeoIntelligence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalSeoAudit" ADD CONSTRAINT "TechnicalSeoAudit_seoIntelligenceId_fkey" FOREIGN KEY ("seoIntelligenceId") REFERENCES "SeoIntelligence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoScoreBreakdown" ADD CONSTRAINT "SeoScoreBreakdown_seoIntelligenceId_fkey" FOREIGN KEY ("seoIntelligenceId") REFERENCES "SeoIntelligence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordIntelligence" ADD CONSTRAINT "KeywordIntelligence_seoIntelligenceId_fkey" FOREIGN KEY ("seoIntelligenceId") REFERENCES "SeoIntelligence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicCluster" ADD CONSTRAINT "TopicCluster_seoIntelligenceId_fkey" FOREIGN KEY ("seoIntelligenceId") REFERENCES "SeoIntelligence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoCompetitorIntelligence" ADD CONSTRAINT "SeoCompetitorIntelligence_seoIntelligenceId_fkey" FOREIGN KEY ("seoIntelligenceId") REFERENCES "SeoIntelligence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeoIntelligence" ADD CONSTRAINT "GeoIntelligence_seoIntelligenceId_fkey" FOREIGN KEY ("seoIntelligenceId") REFERENCES "SeoIntelligence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentGap" ADD CONSTRAINT "ContentGap_seoIntelligenceId_fkey" FOREIGN KEY ("seoIntelligenceId") REFERENCES "SeoIntelligence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogIntelligence" ADD CONSTRAINT "BlogIntelligence_seoIntelligenceId_fkey" FOREIGN KEY ("seoIntelligenceId") REFERENCES "SeoIntelligence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
