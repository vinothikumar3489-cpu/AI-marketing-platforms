-- DropIndex
DROP INDEX "AutomationPlan_userId_chatId_idx";

-- AlterTable
ALTER TABLE "Analysis" ALTER COLUMN "marketInsights" DROP NOT NULL,
ALTER COLUMN "competitorInsights" DROP NOT NULL,
ALTER COLUMN "campaignSuggestions" DROP NOT NULL,
ALTER COLUMN "roiSuggestions" DROP NOT NULL;
