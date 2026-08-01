-- AlterTable: Add research-driven campaign execution sections to CampaignPlan
ALTER TABLE "CampaignPlan" ADD COLUMN IF NOT EXISTS "marketingStrategy" JSONB;
ALTER TABLE "CampaignPlan" ADD COLUMN IF NOT EXISTS "emailCampaigns" JSONB;
ALTER TABLE "CampaignPlan" ADD COLUMN IF NOT EXISTS "ads" JSONB;
ALTER TABLE "CampaignPlan" ADD COLUMN IF NOT EXISTS "landingPages" JSONB;
ALTER TABLE "CampaignPlan" ADD COLUMN IF NOT EXISTS "socialPosts" JSONB;
ALTER TABLE "CampaignPlan" ADD COLUMN IF NOT EXISTS "creativeAngles" JSONB;
ALTER TABLE "CampaignPlan" ADD COLUMN IF NOT EXISTS "budget" JSONB;
ALTER TABLE "CampaignPlan" ADD COLUMN IF NOT EXISTS "forecast" JSONB;
ALTER TABLE "CampaignPlan" ADD COLUMN IF NOT EXISTS "roi" JSONB;
