-- AlterTable
ALTER TABLE "SeoAnalysis" ALTER COLUMN "websiteUrl" DROP NOT NULL,
ALTER COLUMN "seoScore" DROP NOT NULL,
ALTER COLUMN "visibilityScore" DROP NOT NULL,
ALTER COLUMN "organicTraffic" DROP NOT NULL,
ALTER COLUMN "keywordCount" DROP NOT NULL,
ALTER COLUMN "backlinkCount" DROP NOT NULL,
ALTER COLUMN "avgPosition" DROP NOT NULL,
ALTER COLUMN "ctr" DROP NOT NULL,
ALTER COLUMN "topKeywords" DROP NOT NULL,
ALTER COLUMN "competitorKeywords" DROP NOT NULL,
ALTER COLUMN "backlinks" DROP NOT NULL,
ALTER COLUMN "trafficEstimate" DROP NOT NULL,
ALTER COLUMN "technicalIssues" DROP NOT NULL,
ALTER COLUMN "contentSuggestions" DROP NOT NULL,
ALTER COLUMN "prediction" DROP NOT NULL,
ALTER COLUMN "source" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastActiveAt" TIMESTAMP(3),
ADD COLUMN     "profileImage" TEXT,
ADD COLUMN     "role" TEXT DEFAULT 'member';

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductProfile" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "companyName" TEXT,
    "websiteUrl" TEXT,
    "description" TEXT,
    "industry" TEXT,
    "targetAudience" TEXT,
    "pricing" TEXT,
    "competitors" TEXT,
    "businessGoal" TEXT,
    "scrapedData" JSONB,
    "mergedData" JSONB,
    "scrapeStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAnalysis" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productSummary" TEXT,
    "category" TEXT,
    "confidenceScore" INTEGER,
    "usp" JSONB,
    "painPoints" JSONB,
    "targetUsers" JSONB,
    "competitorTypes" JSONB,
    "marketingAngles" JSONB,
    "pricingPosition" TEXT,
    "recommendedModules" JSONB,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductProfile_chatId_key" ON "ProductProfile"("chatId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAnalysis_chatId_key" ON "ProductAnalysis"("chatId");

-- AddForeignKey
ALTER TABLE "SeoAnalysis" ADD CONSTRAINT "SeoAnalysis_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoAnalysis" ADD CONSTRAINT "SeoAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductProfile" ADD CONSTRAINT "ProductProfile_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductProfile" ADD CONSTRAINT "ProductProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAnalysis" ADD CONSTRAINT "ProductAnalysis_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAnalysis" ADD CONSTRAINT "ProductAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
