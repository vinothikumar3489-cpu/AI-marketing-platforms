-- AlterTable: Add missing columns that exist in schema.prisma but were never migrated

-- CampaignPlan: add version column
ALTER TABLE "CampaignPlan" ADD COLUMN "version" INTEGER DEFAULT 1;

-- AutomationPlan: add campaign plan sync columns
ALTER TABLE "AutomationPlan" ADD COLUMN "campaignPlanId" TEXT;
ALTER TABLE "AutomationPlan" ADD COLUMN "campaignPlanVersion" INTEGER;
ALTER TABLE "AutomationPlan" ADD COLUMN "generatedAt" TIMESTAMP(3);
