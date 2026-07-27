-- AlterTable
ALTER TABLE "EmailSequenceItem" ADD COLUMN     "preview" JSONB,
ADD COLUMN     "responsiveHtml" TEXT;

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "subjectLine" TEXT,
    "previewText" TEXT,
    "emailBodyText" TEXT,
    "emailBodyHtml" TEXT,
    "responsiveHtml" TEXT,
    "personalizationFields" JSONB,
    "senderName" TEXT,
    "senderEmail" TEXT,
    "replyToEmail" TEXT,
    "headerImageUrl" TEXT,
    "footerText" TEXT,
    "socialLinks" JSONB,
    "brandColors" JSONB,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailAutomation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "triggerType" TEXT NOT NULL,
    "triggerConfig" JSONB,
    "conditions" JSONB,
    "actions" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "executionStatus" TEXT NOT NULL DEFAULT 'never_run',
    "emailCampaignId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailAutomation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSchedule" (
    "id" TEXT NOT NULL,
    "emailAutomationId" TEXT,
    "emailCampaignId" TEXT,
    "scheduleType" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "timezone" TEXT,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "timeOfDay" TEXT,
    "cronExpression" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "repeatCount" INTEGER DEFAULT 1,
    "repeatInterval" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailDeliveryLog" (
    "id" TEXT NOT NULL,
    "emailCampaignId" TEXT,
    "emailSequenceItemId" TEXT,
    "emailAutomationId" TEXT,
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT,
    "provider" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "subjectLine" TEXT,
    "status" TEXT NOT NULL,
    "previousStatus" TEXT,
    "errorMessage" TEXT,
    "errorCategory" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 1,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "eventHistory" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailDeliveryLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailEvent" (
    "id" TEXT NOT NULL,
    "emailDeliveryLogId" TEXT,
    "emailCampaignId" TEXT,
    "emailSequenceItemId" TEXT,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB,
    "provider" TEXT,
    "providerEventId" TEXT,
    "recipientEmail" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "linkClicked" TEXT,
    "bounceType" TEXT,
    "bounceReason" TEXT,
    "occurredAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailTemplate_userId_idx" ON "EmailTemplate"("userId");

-- CreateIndex
CREATE INDEX "EmailTemplate_category_idx" ON "EmailTemplate"("category");

-- CreateIndex
CREATE INDEX "EmailTemplate_chatId_idx" ON "EmailTemplate"("chatId");

-- CreateIndex
CREATE INDEX "EmailAutomation_chatId_idx" ON "EmailAutomation"("chatId");

-- CreateIndex
CREATE INDEX "EmailAutomation_userId_idx" ON "EmailAutomation"("userId");

-- CreateIndex
CREATE INDEX "EmailAutomation_status_idx" ON "EmailAutomation"("status");

-- CreateIndex
CREATE INDEX "EmailSchedule_emailAutomationId_idx" ON "EmailSchedule"("emailAutomationId");

-- CreateIndex
CREATE INDEX "EmailSchedule_emailCampaignId_idx" ON "EmailSchedule"("emailCampaignId");

-- CreateIndex
CREATE INDEX "EmailSchedule_status_idx" ON "EmailSchedule"("status");

-- CreateIndex
CREATE INDEX "EmailSchedule_nextRunAt_idx" ON "EmailSchedule"("nextRunAt");

-- CreateIndex
CREATE INDEX "EmailDeliveryLog_emailCampaignId_idx" ON "EmailDeliveryLog"("emailCampaignId");

-- CreateIndex
CREATE INDEX "EmailDeliveryLog_emailSequenceItemId_idx" ON "EmailDeliveryLog"("emailSequenceItemId");

-- CreateIndex
CREATE INDEX "EmailDeliveryLog_recipientEmail_idx" ON "EmailDeliveryLog"("recipientEmail");

-- CreateIndex
CREATE INDEX "EmailDeliveryLog_status_idx" ON "EmailDeliveryLog"("status");

-- CreateIndex
CREATE INDEX "EmailDeliveryLog_providerMessageId_idx" ON "EmailDeliveryLog"("providerMessageId");

-- CreateIndex
CREATE INDEX "EmailDeliveryLog_emailAutomationId_idx" ON "EmailDeliveryLog"("emailAutomationId");

-- CreateIndex
CREATE INDEX "EmailEvent_emailDeliveryLogId_idx" ON "EmailEvent"("emailDeliveryLogId");

-- CreateIndex
CREATE INDEX "EmailEvent_emailCampaignId_idx" ON "EmailEvent"("emailCampaignId");

-- CreateIndex
CREATE INDEX "EmailEvent_eventType_idx" ON "EmailEvent"("eventType");

-- CreateIndex
CREATE INDEX "EmailEvent_providerEventId_idx" ON "EmailEvent"("providerEventId");

-- CreateIndex
CREATE INDEX "EmailEvent_occurredAt_idx" ON "EmailEvent"("occurredAt");

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAutomation" ADD CONSTRAINT "EmailAutomation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAutomation" ADD CONSTRAINT "EmailAutomation_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAutomation" ADD CONSTRAINT "EmailAutomation_emailCampaignId_fkey" FOREIGN KEY ("emailCampaignId") REFERENCES "EmailCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailSchedule" ADD CONSTRAINT "EmailSchedule_emailAutomationId_fkey" FOREIGN KEY ("emailAutomationId") REFERENCES "EmailAutomation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailSchedule" ADD CONSTRAINT "EmailSchedule_emailCampaignId_fkey" FOREIGN KEY ("emailCampaignId") REFERENCES "EmailCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDeliveryLog" ADD CONSTRAINT "EmailDeliveryLog_emailCampaignId_fkey" FOREIGN KEY ("emailCampaignId") REFERENCES "EmailCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDeliveryLog" ADD CONSTRAINT "EmailDeliveryLog_emailSequenceItemId_fkey" FOREIGN KEY ("emailSequenceItemId") REFERENCES "EmailSequenceItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDeliveryLog" ADD CONSTRAINT "EmailDeliveryLog_emailAutomationId_fkey" FOREIGN KEY ("emailAutomationId") REFERENCES "EmailAutomation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailEvent" ADD CONSTRAINT "EmailEvent_emailDeliveryLogId_fkey" FOREIGN KEY ("emailDeliveryLogId") REFERENCES "EmailDeliveryLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailEvent" ADD CONSTRAINT "EmailEvent_emailCampaignId_fkey" FOREIGN KEY ("emailCampaignId") REFERENCES "EmailCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailEvent" ADD CONSTRAINT "EmailEvent_emailSequenceItemId_fkey" FOREIGN KEY ("emailSequenceItemId") REFERENCES "EmailSequenceItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
