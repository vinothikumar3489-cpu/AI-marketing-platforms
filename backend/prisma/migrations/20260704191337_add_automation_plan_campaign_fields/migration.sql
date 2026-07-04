-- AlterTable
ALTER TABLE "AutomationPlan" ADD COLUMN     "contentCalendar" JSONB,
ADD COLUMN     "crmWorkflows" JSONB,
ADD COLUMN     "googleAds" JSONB,
ADD COLUMN     "workflows" JSONB;
