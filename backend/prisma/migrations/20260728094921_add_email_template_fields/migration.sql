-- AlterTable: Add missing fields to EmailTemplate
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "approvalStatus" VARCHAR(50) NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "quality" JSONB;
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "contentAssetId" TEXT;
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "generationStatus" VARCHAR(50) NOT NULL DEFAULT 'pending';
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "lastError" TEXT;