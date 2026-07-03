-- AlterTable
ALTER TABLE "ProductAnalysis" ADD COLUMN     "aiWarnings" JSONB,
ADD COLUMN     "benefits" JSONB,
ADD COLUMN     "buyerPersonas" JSONB,
ADD COLUMN     "competitors" JSONB,
ADD COLUMN     "dataSourcesUsed" JSONB,
ADD COLUMN     "features" JSONB,
ADD COLUMN     "marketMaturity" TEXT,
ADD COLUMN     "providers" JSONB,
ADD COLUMN     "warnings" JSONB;
