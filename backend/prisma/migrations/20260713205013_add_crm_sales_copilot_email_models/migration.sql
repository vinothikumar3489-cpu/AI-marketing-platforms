-- Add missing columns to existing AutomationPlan table
ALTER TABLE "AutomationPlan" ADD COLUMN IF NOT EXISTS "opportunities" JSONB;
ALTER TABLE "AutomationPlan" ADD COLUMN IF NOT EXISTS "risks" JSONB;
ALTER TABLE "AutomationPlan" ADD COLUMN IF NOT EXISTS "readinessChecklist" JSONB;
ALTER TABLE "AutomationPlan" ADD COLUMN IF NOT EXISTS "contextSnapshotId" TEXT;

-- CreateTable
CREATE TABLE "CampaignPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "executiveSummary" JSONB,
    "businessGoal" JSONB,
    "campaignObjective" JSONB,
    "audienceSelection" JSONB,
    "channelRecommendations" JSONB,
    "timeline" JSONB,
    "marketingFunnel" JSONB,
    "kpiFramework" JSONB,
    "riskAssessment" JSONB,
    "opportunityAssessment" JSONB,
    "nextActions" JSONB,
    "status" TEXT DEFAULT 'draft',
    "provider" TEXT,
    "fallbackUsed" BOOLEAN DEFAULT false,
    "inputJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CampaignPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "automationPlanId" TEXT,
    "module" TEXT NOT NULL,
    "contextSnapshotId" TEXT,
    "provider" TEXT,
    "requestStatus" TEXT NOT NULL,
    "providerResponseId" TEXT,
    "assetUrls" JSONB,
    "errorCategory" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "requestPayload" JSONB,
    "responseSummary" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExecutionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailCampaign" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "campaignPlanId" TEXT,
    "name" TEXT NOT NULL,
    "objective" TEXT,
    "audienceSummary" TEXT,
    "funnelStage" TEXT,
    "sequenceType" TEXT,
    "senderName" TEXT,
    "senderEmail" TEXT,
    "replyToEmail" TEXT,
    "totalEmails" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "approvalStatus" TEXT NOT NULL DEFAULT 'NOT_SUBMITTED',
    "generationStatus" TEXT NOT NULL DEFAULT 'pending',
    "evidenceSummary" JSONB,
    "missingEvidence" JSONB,
    "approvedAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmailCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSequenceItem" (
    "id" TEXT NOT NULL,
    "emailCampaignId" TEXT NOT NULL,
    "sequenceOrder" INTEGER NOT NULL,
    "emailName" TEXT NOT NULL,
    "purpose" TEXT,
    "funnelStage" TEXT,
    "delayAfterPreviousDays" INTEGER DEFAULT 0,
    "subjectLine" TEXT,
    "alternativeSubjectLines" JSONB,
    "previewText" TEXT,
    "greetingStrategy" TEXT,
    "emailBodyText" TEXT,
    "emailBodyHtml" TEXT,
    "primaryCta" TEXT,
    "secondaryCta" TEXT,
    "personalizationFields" JSONB,
    "evidenceUsed" JSONB,
    "inferenceStatus" TEXT,
    "complianceNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmailSequenceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailCampaignVersion" (
    "id" TEXT NOT NULL,
    "emailCampaignId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changeReason" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailCampaignVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailCampaignLog" (
    "id" TEXT NOT NULL,
    "emailCampaignId" TEXT NOT NULL,
    "emailSequenceItemId" TEXT,
    "action" TEXT NOT NULL,
    "status" TEXT,
    "message" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailCampaignLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CRMContact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "companyId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "jobTitle" TEXT,
    "lifecycleStage" TEXT NOT NULL DEFAULT 'NOT_MEASURED',
    "source" TEXT,
    "consentStatus" TEXT NOT NULL DEFAULT 'NOT_MEASURED',
    "ownerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "customFields" JSONB,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CRMContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CRMCompany" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "industry" TEXT,
    "employeeRange" TEXT,
    "location" TEXT,
    "description" TEXT,
    "source" TEXT,
    "customFields" JSONB,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CRMCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CRMPipeline" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CRMPipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CRMPipelineStage" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "description" TEXT,
    "stageType" TEXT,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CRMPipelineStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CRMDeal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "companyId" TEXT,
    "contactId" TEXT,
    "pipelineId" TEXT,
    "stageId" TEXT,
    "campaignPlanId" TEXT,
    "emailCampaignId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currency" TEXT DEFAULT 'USD',
    "value" DOUBLE PRECISION,
    "expectedCloseDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "source" TEXT,
    "ownerId" TEXT,
    "metadata" JSONB,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CRMDeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CRMActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "contactId" TEXT,
    "companyId" TEXT,
    "dealId" TEXT,
    "activityType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "activityDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcome" TEXT,
    "source" TEXT,
    "createdBy" TEXT,
    "provider" TEXT,
    "providerMessageId" TEXT,
    "deliveryStatus" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CRMActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CRMTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "contactId" TEXT,
    "companyId" TEXT,
    "dealId" TEXT,
    "assignedTo" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CRMTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CRMWorkflow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "campaignPlanId" TEXT,
    "emailCampaignId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "triggerType" TEXT NOT NULL,
    "triggerConfig" JSONB,
    "conditions" JSONB,
    "actions" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "approvalStatus" TEXT NOT NULL DEFAULT 'NOT_SUBMITTED',
    "executionStatus" TEXT NOT NULL DEFAULT 'never_run',
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "maxDepth" INTEGER NOT NULL DEFAULT 10,
    "maxActions" INTEGER NOT NULL DEFAULT 20,
    "idempotencyKey" TEXT,
    "approvedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CRMWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CRMWorkflowVersion" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changeReason" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CRMWorkflowVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CRMWorkflowExecution" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "contactId" TEXT,
    "companyId" TEXT,
    "dealId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "maxSteps" INTEGER NOT NULL DEFAULT 10,
    "executionData" JSONB,
    "errorMessage" TEXT,
    "idempotencyKey" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CRMWorkflowExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CRMWorkflowLog" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "executionId" TEXT,
    "action" TEXT NOT NULL,
    "status" TEXT,
    "message" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CRMWorkflowLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CRMImportJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "invalidRows" INTEGER NOT NULL DEFAULT 0,
    "importedRows" INTEGER NOT NULL DEFAULT 0,
    "duplicateRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "columnMapping" JSONB,
    "validationSummary" JSONB,
    "errorDetails" JSONB,
    "duplicateStrategy" TEXT NOT NULL DEFAULT 'SKIP_EXISTING',
    "importType" TEXT NOT NULL,
    "parsedData" JSONB,
    "mappedData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "CRMImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesCopilotMemory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "contactId" TEXT,
    "companyId" TEXT,
    "dealId" TEXT,
    "interactionType" TEXT NOT NULL,
    "summary" TEXT,
    "intent" TEXT,
    "recommendations" JSONB,
    "nextAction" JSONB,
    "metadata" JSONB,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalesCopilotMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealInsight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "aiSummary" TEXT,
    "buyingSignals" JSONB,
    "riskFactors" JSONB,
    "recommendedNextStep" JSONB,
    "competitorMention" TEXT,
    "fleetSizeEstimate" JSONB,
    "decisionMakerConfidence" JSONB,
    "timelinePrediction" JSONB,
    "generationStatus" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DealInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "dealId" TEXT,
    "contactId" TEXT,
    "companyId" TEXT,
    "title" TEXT NOT NULL,
    "proposalType" TEXT NOT NULL,
    "executiveSummary" TEXT,
    "pricingSummary" JSONB,
    "fleetRecommendations" JSONB,
    "implementationTimeline" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "content" JSONB,
    "generatedBy" TEXT,
    "provider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerHealthSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "contactId" TEXT,
    "companyId" TEXT,
    "dealId" TEXT,
    "healthStatus" TEXT NOT NULL,
    "riskFlags" JSONB,
    "inactivityDays" INTEGER,
    "daysSinceLastActivity" INTEGER,
    "daysSinceLastTask" INTEGER,
    "daysSinceLastMeeting" INTEGER,
    "openDealCount" INTEGER NOT NULL DEFAULT 0,
    "overdueTaskCount" INTEGER NOT NULL DEFAULT 0,
    "hasUpcomingRenewal" BOOLEAN NOT NULL DEFAULT false,
    "missingOwner" BOOLEAN NOT NULL DEFAULT false,
    "staleDeal" BOOLEAN NOT NULL DEFAULT false,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerHealthSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CampaignPlan_chatId_key" ON "CampaignPlan"("chatId");
CREATE INDEX "CampaignPlan_chatId_idx" ON "CampaignPlan"("chatId");
CREATE INDEX "CampaignPlan_userId_idx" ON "CampaignPlan"("userId");

-- CreateIndex
CREATE INDEX "ExecutionRecord_userId_chatId_module_idx" ON "ExecutionRecord"("userId", "chatId", "module");
CREATE INDEX "ExecutionRecord_chatId_requestStatus_idx" ON "ExecutionRecord"("chatId", "requestStatus");
CREATE INDEX "ExecutionRecord_automationPlanId_idx" ON "ExecutionRecord"("automationPlanId");

-- CreateIndex
CREATE INDEX "EmailCampaign_chatId_idx" ON "EmailCampaign"("chatId");
CREATE INDEX "EmailCampaign_userId_idx" ON "EmailCampaign"("userId");
CREATE INDEX "EmailCampaign_campaignPlanId_idx" ON "EmailCampaign"("campaignPlanId");
CREATE INDEX "EmailCampaign_status_idx" ON "EmailCampaign"("status");
CREATE INDEX "EmailCampaign_approvalStatus_idx" ON "EmailCampaign"("approvalStatus");

-- CreateIndex
CREATE INDEX "EmailSequenceItem_emailCampaignId_sequenceOrder_idx" ON "EmailSequenceItem"("emailCampaignId", "sequenceOrder");

-- CreateIndex
CREATE INDEX "EmailCampaignVersion_emailCampaignId_versionNumber_idx" ON "EmailCampaignVersion"("emailCampaignId", "versionNumber");

-- CreateIndex
CREATE INDEX "EmailCampaignLog_emailCampaignId_action_idx" ON "EmailCampaignLog"("emailCampaignId", "action");

-- CreateIndex
CREATE INDEX "CRMContact_chatId_idx" ON "CRMContact"("chatId");
CREATE INDEX "CRMContact_userId_idx" ON "CRMContact"("userId");
CREATE INDEX "CRMContact_email_idx" ON "CRMContact"("email");
CREATE INDEX "CRMContact_status_idx" ON "CRMContact"("status");
CREATE INDEX "CRMContact_lifecycleStage_idx" ON "CRMContact"("lifecycleStage");
CREATE INDEX "CRMContact_companyId_idx" ON "CRMContact"("companyId");

-- CreateIndex
CREATE INDEX "CRMCompany_chatId_idx" ON "CRMCompany"("chatId");
CREATE INDEX "CRMCompany_userId_idx" ON "CRMCompany"("userId");
CREATE INDEX "CRMCompany_name_idx" ON "CRMCompany"("name");

-- CreateIndex
CREATE INDEX "CRMPipeline_chatId_idx" ON "CRMPipeline"("chatId");
CREATE INDEX "CRMPipeline_userId_idx" ON "CRMPipeline"("userId");

-- CreateIndex
CREATE INDEX "CRMPipelineStage_pipelineId_order_idx" ON "CRMPipelineStage"("pipelineId", "order");

-- CreateIndex
CREATE INDEX "CRMDeal_chatId_idx" ON "CRMDeal"("chatId");
CREATE INDEX "CRMDeal_userId_idx" ON "CRMDeal"("userId");
CREATE INDEX "CRMDeal_pipelineId_stageId_idx" ON "CRMDeal"("pipelineId", "stageId");
CREATE INDEX "CRMDeal_status_idx" ON "CRMDeal"("status");
CREATE INDEX "CRMDeal_contactId_idx" ON "CRMDeal"("contactId");
CREATE INDEX "CRMDeal_companyId_idx" ON "CRMDeal"("companyId");
CREATE INDEX "CRMDeal_campaignPlanId_idx" ON "CRMDeal"("campaignPlanId");
CREATE INDEX "CRMDeal_expectedCloseDate_idx" ON "CRMDeal"("expectedCloseDate");
CREATE INDEX "CRMDeal_ownerId_idx" ON "CRMDeal"("ownerId");
CREATE INDEX "CRMDeal_updatedAt_idx" ON "CRMDeal"("updatedAt");

-- CreateIndex
CREATE INDEX "CRMActivity_chatId_idx" ON "CRMActivity"("chatId");
CREATE INDEX "CRMActivity_userId_idx" ON "CRMActivity"("userId");
CREATE INDEX "CRMActivity_contactId_idx" ON "CRMActivity"("contactId");
CREATE INDEX "CRMActivity_companyId_idx" ON "CRMActivity"("companyId");
CREATE INDEX "CRMActivity_dealId_idx" ON "CRMActivity"("dealId");
CREATE INDEX "CRMActivity_activityType_idx" ON "CRMActivity"("activityType");
CREATE INDEX "CRMActivity_activityDate_idx" ON "CRMActivity"("activityDate");
CREATE INDEX "CRMActivity_chatId_activityDate_idx" ON "CRMActivity"("chatId", "activityDate");

-- CreateIndex
CREATE INDEX "CRMTask_chatId_idx" ON "CRMTask"("chatId");
CREATE INDEX "CRMTask_userId_idx" ON "CRMTask"("userId");
CREATE INDEX "CRMTask_contactId_idx" ON "CRMTask"("contactId");
CREATE INDEX "CRMTask_dealId_idx" ON "CRMTask"("dealId");
CREATE INDEX "CRMTask_status_idx" ON "CRMTask"("status");
CREATE INDEX "CRMTask_assignedTo_idx" ON "CRMTask"("assignedTo");
CREATE INDEX "CRMTask_dueAt_idx" ON "CRMTask"("dueAt");
CREATE INDEX "CRMTask_chatId_status_dueAt_idx" ON "CRMTask"("chatId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "CRMWorkflow_chatId_idx" ON "CRMWorkflow"("chatId");
CREATE INDEX "CRMWorkflow_userId_idx" ON "CRMWorkflow"("userId");
CREATE INDEX "CRMWorkflow_campaignPlanId_idx" ON "CRMWorkflow"("campaignPlanId");
CREATE INDEX "CRMWorkflow_status_idx" ON "CRMWorkflow"("status");
CREATE INDEX "CRMWorkflow_approvalStatus_idx" ON "CRMWorkflow"("approvalStatus");

-- CreateIndex
CREATE INDEX "CRMWorkflowVersion_workflowId_versionNumber_idx" ON "CRMWorkflowVersion"("workflowId", "versionNumber");

-- CreateIndex
CREATE INDEX "CRMWorkflowExecution_workflowId_idx" ON "CRMWorkflowExecution"("workflowId");
CREATE INDEX "CRMWorkflowExecution_status_idx" ON "CRMWorkflowExecution"("status");
CREATE INDEX "CRMWorkflowExecution_idempotencyKey_idx" ON "CRMWorkflowExecution"("idempotencyKey");

-- CreateIndex
CREATE INDEX "CRMWorkflowLog_workflowId_action_idx" ON "CRMWorkflowLog"("workflowId", "action");

-- CreateIndex
CREATE INDEX "CRMImportJob_chatId_idx" ON "CRMImportJob"("chatId");
CREATE INDEX "CRMImportJob_userId_idx" ON "CRMImportJob"("userId");
CREATE INDEX "CRMImportJob_status_idx" ON "CRMImportJob"("status");

-- CreateIndex
CREATE INDEX "SalesCopilotMemory_chatId_interactionType_idx" ON "SalesCopilotMemory"("chatId", "interactionType");
CREATE INDEX "SalesCopilotMemory_contactId_idx" ON "SalesCopilotMemory"("contactId");
CREATE INDEX "SalesCopilotMemory_companyId_idx" ON "SalesCopilotMemory"("companyId");
CREATE INDEX "SalesCopilotMemory_dealId_idx" ON "SalesCopilotMemory"("dealId");
CREATE INDEX "SalesCopilotMemory_userId_idx" ON "SalesCopilotMemory"("userId");
CREATE INDEX "SalesCopilotMemory_createdAt_idx" ON "SalesCopilotMemory"("createdAt");

-- CreateIndex
CREATE INDEX "DealInsight_dealId_idx" ON "DealInsight"("dealId");
CREATE INDEX "DealInsight_chatId_idx" ON "DealInsight"("chatId");

-- CreateIndex
CREATE INDEX "Proposal_dealId_idx" ON "Proposal"("dealId");
CREATE INDEX "Proposal_chatId_idx" ON "Proposal"("chatId");
CREATE INDEX "Proposal_status_idx" ON "Proposal"("status");

-- CreateIndex
CREATE INDEX "CustomerHealthSnapshot_chatId_healthStatus_idx" ON "CustomerHealthSnapshot"("chatId", "healthStatus");
CREATE INDEX "CustomerHealthSnapshot_contactId_idx" ON "CustomerHealthSnapshot"("contactId");
CREATE INDEX "CustomerHealthSnapshot_companyId_idx" ON "CustomerHealthSnapshot"("companyId");
CREATE INDEX "CustomerHealthSnapshot_dealId_idx" ON "CustomerHealthSnapshot"("dealId");
CREATE INDEX "CustomerHealthSnapshot_calculatedAt_idx" ON "CustomerHealthSnapshot"("calculatedAt");

-- AddForeignKey
ALTER TABLE "CampaignPlan" ADD CONSTRAINT "CampaignPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignPlan" ADD CONSTRAINT "CampaignPlan_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionRecord" ADD CONSTRAINT "ExecutionRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExecutionRecord" ADD CONSTRAINT "ExecutionRecord_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExecutionRecord" ADD CONSTRAINT "ExecutionRecord_automationPlanId_fkey" FOREIGN KEY ("automationPlanId") REFERENCES "AutomationPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailCampaign" ADD CONSTRAINT "EmailCampaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailCampaign" ADD CONSTRAINT "EmailCampaign_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailCampaign" ADD CONSTRAINT "EmailCampaign_campaignPlanId_fkey" FOREIGN KEY ("campaignPlanId") REFERENCES "CampaignPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailSequenceItem" ADD CONSTRAINT "EmailSequenceItem_emailCampaignId_fkey" FOREIGN KEY ("emailCampaignId") REFERENCES "EmailCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailCampaignVersion" ADD CONSTRAINT "EmailCampaignVersion_emailCampaignId_fkey" FOREIGN KEY ("emailCampaignId") REFERENCES "EmailCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailCampaignLog" ADD CONSTRAINT "EmailCampaignLog_emailCampaignId_fkey" FOREIGN KEY ("emailCampaignId") REFERENCES "EmailCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailCampaignLog" ADD CONSTRAINT "EmailCampaignLog_emailSequenceItemId_fkey" FOREIGN KEY ("emailSequenceItemId") REFERENCES "EmailSequenceItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CRMContact" ADD CONSTRAINT "CRMContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CRMContact" ADD CONSTRAINT "CRMContact_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CRMContact" ADD CONSTRAINT "CRMContact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CRMCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CRMCompany" ADD CONSTRAINT "CRMCompany_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CRMCompany" ADD CONSTRAINT "CRMCompany_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CRMPipeline" ADD CONSTRAINT "CRMPipeline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CRMPipeline" ADD CONSTRAINT "CRMPipeline_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CRMPipelineStage" ADD CONSTRAINT "CRMPipelineStage_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "CRMPipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CRMDeal" ADD CONSTRAINT "CRMDeal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CRMDeal" ADD CONSTRAINT "CRMDeal_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CRMDeal" ADD CONSTRAINT "CRMDeal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CRMCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CRMDeal" ADD CONSTRAINT "CRMDeal_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CRMContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CRMDeal" ADD CONSTRAINT "CRMDeal_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "CRMPipeline"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CRMDeal" ADD CONSTRAINT "CRMDeal_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "CRMPipelineStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CRMDeal" ADD CONSTRAINT "CRMDeal_campaignPlanId_fkey" FOREIGN KEY ("campaignPlanId") REFERENCES "CampaignPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CRMDeal" ADD CONSTRAINT "CRMDeal_emailCampaignId_fkey" FOREIGN KEY ("emailCampaignId") REFERENCES "EmailCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CRMActivity" ADD CONSTRAINT "CRMActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CRMActivity" ADD CONSTRAINT "CRMActivity_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CRMActivity" ADD CONSTRAINT "CRMActivity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CRMContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CRMActivity" ADD CONSTRAINT "CRMActivity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CRMCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CRMActivity" ADD CONSTRAINT "CRMActivity_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CRMDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CRMTask" ADD CONSTRAINT "CRMTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CRMTask" ADD CONSTRAINT "CRMTask_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CRMTask" ADD CONSTRAINT "CRMTask_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CRMContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CRMTask" ADD CONSTRAINT "CRMTask_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CRMCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CRMTask" ADD CONSTRAINT "CRMTask_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CRMDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CRMWorkflow" ADD CONSTRAINT "CRMWorkflow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CRMWorkflow" ADD CONSTRAINT "CRMWorkflow_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CRMWorkflow" ADD CONSTRAINT "CRMWorkflow_campaignPlanId_fkey" FOREIGN KEY ("campaignPlanId") REFERENCES "CampaignPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CRMWorkflow" ADD CONSTRAINT "CRMWorkflow_emailCampaignId_fkey" FOREIGN KEY ("emailCampaignId") REFERENCES "EmailCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CRMWorkflowVersion" ADD CONSTRAINT "CRMWorkflowVersion_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "CRMWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CRMWorkflowExecution" ADD CONSTRAINT "CRMWorkflowExecution_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "CRMWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CRMWorkflowExecution" ADD CONSTRAINT "CRMWorkflowExecution_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CRMContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CRMWorkflowExecution" ADD CONSTRAINT "CRMWorkflowExecution_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CRMCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CRMWorkflowExecution" ADD CONSTRAINT "CRMWorkflowExecution_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CRMDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CRMWorkflowLog" ADD CONSTRAINT "CRMWorkflowLog_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "CRMWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CRMWorkflowLog" ADD CONSTRAINT "CRMWorkflowLog_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "CRMWorkflowExecution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CRMImportJob" ADD CONSTRAINT "CRMImportJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CRMImportJob" ADD CONSTRAINT "CRMImportJob_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesCopilotMemory" ADD CONSTRAINT "SalesCopilotMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesCopilotMemory" ADD CONSTRAINT "SalesCopilotMemory_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesCopilotMemory" ADD CONSTRAINT "SalesCopilotMemory_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CRMContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesCopilotMemory" ADD CONSTRAINT "SalesCopilotMemory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CRMCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesCopilotMemory" ADD CONSTRAINT "SalesCopilotMemory_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CRMDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealInsight" ADD CONSTRAINT "DealInsight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DealInsight" ADD CONSTRAINT "DealInsight_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DealInsight" ADD CONSTRAINT "DealInsight_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CRMDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CRMDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CRMContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CRMCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerHealthSnapshot" ADD CONSTRAINT "CustomerHealthSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerHealthSnapshot" ADD CONSTRAINT "CustomerHealthSnapshot_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerHealthSnapshot" ADD CONSTRAINT "CustomerHealthSnapshot_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CRMContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerHealthSnapshot" ADD CONSTRAINT "CustomerHealthSnapshot_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CRMCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerHealthSnapshot" ADD CONSTRAINT "CustomerHealthSnapshot_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CRMDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
