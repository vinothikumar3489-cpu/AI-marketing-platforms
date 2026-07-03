-- CreateTable
CREATE TABLE "ExecutiveSeoDashboard" (
    "id" TEXT NOT NULL,
    "seoIntelligenceId" TEXT NOT NULL,
    "executiveOverview" JSONB NOT NULL,
    "seoHealthSummary" JSONB NOT NULL,
    "keyOpportunities" JSONB NOT NULL,
    "competitorSnapshot" JSONB NOT NULL,
    "aiSearchVisibility" JSONB NOT NULL,
    "contentStrategySummary" JSONB NOT NULL,
    "executiveActionPlan" JSONB NOT NULL,
    "roiForecast" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExecutiveSeoDashboard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExecutiveSeoDashboard_seoIntelligenceId_key" ON "ExecutiveSeoDashboard"("seoIntelligenceId");

-- CreateIndex
CREATE INDEX "ExecutiveSeoDashboard_seoIntelligenceId_idx" ON "ExecutiveSeoDashboard"("seoIntelligenceId");

-- AddForeignKey
ALTER TABLE "ExecutiveSeoDashboard" ADD CONSTRAINT "ExecutiveSeoDashboard_seoIntelligenceId_fkey" FOREIGN KEY ("seoIntelligenceId") REFERENCES "SeoIntelligence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
