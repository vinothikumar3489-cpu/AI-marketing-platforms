-- Create EvidenceSnapshot model
CREATE TABLE "EvidenceSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "analysisId" TEXT,
    "websiteUrl" TEXT NOT NULL,
    "companyName" TEXT,
    "sourceSummary" JSONB,
    "websiteEvidence" JSONB,
    "technicalSeoEvidence" JSONB,
    "contentEvidence" JSONB,
    "competitorEvidence" JSONB,
    "githubEvidence" JSONB,
    "rawEvidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenceSnapshot_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "EvidenceSnapshot_chatId_idx" ON "EvidenceSnapshot"("chatId");
CREATE INDEX "EvidenceSnapshot_userId_idx" ON "EvidenceSnapshot"("userId");
CREATE INDEX "EvidenceSnapshot_analysisId_idx" ON "EvidenceSnapshot"("analysisId");

-- Add foreign keys
ALTER TABLE "EvidenceSnapshot" ADD CONSTRAINT "EvidenceSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EvidenceSnapshot" ADD CONSTRAINT "EvidenceSnapshot_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EvidenceSnapshot" ADD CONSTRAINT "EvidenceSnapshot_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Fix: Remove invalid index on AutomationPlan (referenced non-existent seoIntelligenceId)
DROP INDEX IF EXISTS "AutomationPlan_seoIntelligenceId_idx";
