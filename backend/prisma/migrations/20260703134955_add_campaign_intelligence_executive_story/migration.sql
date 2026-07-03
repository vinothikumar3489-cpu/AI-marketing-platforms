/*
  Warnings:

  - You are about to drop the column `analytics` on the `CampaignIntelligence` table. All the data in the column will be lost.
  - You are about to drop the column `contentStudio` on the `CampaignIntelligence` table. All the data in the column will be lost.
  - You are about to drop the column `roiOptimizer` on the `CampaignIntelligence` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CampaignIntelligence" DROP COLUMN "analytics",
DROP COLUMN "contentStudio",
DROP COLUMN "roiOptimizer",
ADD COLUMN     "actionPlan" JSONB,
ADD COLUMN     "executiveStory" JSONB;

-- AlterTable
ALTER TABLE "SeoIntelligence" ADD COLUMN     "analyzedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "domain" TEXT,
ADD COLUMN     "productName" TEXT;

-- CreateTable
CREATE TABLE "GrowthSprint" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowthSprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthTask" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sprintId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "difficulty" TEXT,
    "impact" TEXT,
    "owner" TEXT DEFAULT 'Marketing Team',
    "kpi" TEXT,
    "estimatedTime" TEXT,
    "targetKeyword" TEXT,
    "affectedPage" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "aiGeneratedType" TEXT,
    "aiPromptContext" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowthTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GrowthSprint_chatId_idx" ON "GrowthSprint"("chatId");

-- CreateIndex
CREATE INDEX "GrowthSprint_userId_idx" ON "GrowthSprint"("userId");

-- CreateIndex
CREATE INDEX "GrowthTask_chatId_idx" ON "GrowthTask"("chatId");

-- CreateIndex
CREATE INDEX "GrowthTask_userId_idx" ON "GrowthTask"("userId");

-- CreateIndex
CREATE INDEX "GrowthTask_sprintId_idx" ON "GrowthTask"("sprintId");

-- CreateIndex
CREATE INDEX "AgentRun_chatId_idx" ON "AgentRun"("chatId");

-- CreateIndex
CREATE INDEX "AgentRun_userId_idx" ON "AgentRun"("userId");

-- CreateIndex
CREATE INDEX "Analysis_chatId_idx" ON "Analysis"("chatId");

-- CreateIndex
CREATE INDEX "Analysis_userId_idx" ON "Analysis"("userId");

-- CreateIndex
CREATE INDEX "Chat_userId_idx" ON "Chat"("userId");

-- CreateIndex
CREATE INDEX "Message_chatId_idx" ON "Message"("chatId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- AddForeignKey
ALTER TABLE "GrowthSprint" ADD CONSTRAINT "GrowthSprint_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthSprint" ADD CONSTRAINT "GrowthSprint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthTask" ADD CONSTRAINT "GrowthTask_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthTask" ADD CONSTRAINT "GrowthTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthTask" ADD CONSTRAINT "GrowthTask_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "GrowthSprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
