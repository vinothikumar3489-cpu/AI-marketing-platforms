-- Add measurementReadiness column to ExecutiveSeoDashboard
-- Make roiForecast nullable for backward compatibility

ALTER TABLE "ExecutiveSeoDashboard" ADD COLUMN "measurementReadiness" JSONB;

ALTER TABLE "ExecutiveSeoDashboard" ALTER COLUMN "roiForecast" DROP NOT NULL;
