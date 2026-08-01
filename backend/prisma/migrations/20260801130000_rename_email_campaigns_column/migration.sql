-- AlterTable: Rename emailCampaigns to emailCampaignsData to match schema
ALTER TABLE "CampaignPlan" RENAME COLUMN "emailCampaigns" TO "emailCampaignsData";
