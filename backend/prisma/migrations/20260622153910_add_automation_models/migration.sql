-- CreateTable
CREATE TABLE "AutomationPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "campaignName" TEXT NOT NULL,
    "campaignObjective" TEXT,
    "targetAudience" JSONB,
    "channels" JSONB,
    "weeklyPlan" JSONB,
    "kpis" JSONB,
    "budgetSplit" JSONB,
    "emailSequence" JSONB,
    "emailSubjects" JSONB,
    "emailSchedule" JSONB,
    "leadCriteria" JSONB,
    "linkedInCalendar" JSONB,
    "linkedInPosts" JSONB,
    "linkedInDmTemplates" JSONB,
    "linkedInSchedule" JSONB,
    "instagramCaptions" JSONB,
    "instagramReelIdeas" JSONB,
    "instagramSchedule" JSONB,
    "instagramHashtags" JSONB,
    "posterPrompts" JSONB,
    "imageAdIdeas" JSONB,
    "designStyles" JSONB,
    "videoScripts" JSONB,
    "videoScenes" JSONB,
    "videoSchedule" JSONB,
    "idealLeadProfile" JSONB,
    "leadSources" JSONB,
    "outreachAngles" JSONB,
    "sampleLeads" JSONB,
    "readinessScore" INTEGER DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "provider" TEXT,
    "fallbackUsed" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationAsset" (
    "id" TEXT NOT NULL,
    "automationPlanId" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "assetTitle" TEXT NOT NULL,
    "assetContent" JSONB NOT NULL,
    "channel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduledFor" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT,
    "assetId" TEXT,
    "action" TEXT NOT NULL,
    "message" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AutomationPlan_chatId_key" ON "AutomationPlan"("chatId");

-- CreateIndex
CREATE INDEX "AutomationPlan_userId_chatId_idx" ON "AutomationPlan"("userId", "chatId");

-- CreateIndex
CREATE INDEX "AutomationAsset_automationPlanId_status_idx" ON "AutomationAsset"("automationPlanId", "status");

-- CreateIndex
CREATE INDEX "AutomationAsset_automationPlanId_assetType_idx" ON "AutomationAsset"("automationPlanId", "assetType");

-- CreateIndex
CREATE INDEX "AutomationLog_userId_createdAt_idx" ON "AutomationLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AutomationLog_chatId_action_idx" ON "AutomationLog"("chatId", "action");

-- AddForeignKey
ALTER TABLE "AutomationPlan" ADD CONSTRAINT "AutomationPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationPlan" ADD CONSTRAINT "AutomationPlan_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationAsset" ADD CONSTRAINT "AutomationAsset_automationPlanId_fkey" FOREIGN KEY ("automationPlanId") REFERENCES "AutomationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationLog" ADD CONSTRAINT "AutomationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
