-- Add missing Phase 6 Marketing Execution Platform columns to AutomationPlan

ALTER TABLE "AutomationPlan" ADD COLUMN IF NOT EXISTS "contentStudio" JSONB;
ALTER TABLE "AutomationPlan" ADD COLUMN IF NOT EXISTS "emailCampaigns" JSONB;
ALTER TABLE "AutomationPlan" ADD COLUMN IF NOT EXISTS "creativeStudio" JSONB;
ALTER TABLE "AutomationPlan" ADD COLUMN IF NOT EXISTS "videoStudio" JSONB;
ALTER TABLE "AutomationPlan" ADD COLUMN IF NOT EXISTS "campaignPlans" JSONB;
ALTER TABLE "AutomationPlan" ADD COLUMN IF NOT EXISTS "socialCalendars" JSONB;
ALTER TABLE "AutomationPlan" ADD COLUMN IF NOT EXISTS "analyticsData" JSONB;
