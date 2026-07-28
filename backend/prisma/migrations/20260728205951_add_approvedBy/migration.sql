-- AlterTable: Add approvedBy to EmailTemplate
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "approvedBy" TEXT;