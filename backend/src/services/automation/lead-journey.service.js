import { prisma } from "../../config/prisma.js";
import { callAI } from "../../domains/ai/services/aiOrchestrator.service.js";
import {
  loadContactById,
  loadCompanyById,
  loadDealById,
  loadAssociatedCampaignPlan,
  loadAssociatedEmailCampaign,
} from "./crm-data.service.js";

export async function generateLeadJourney(chatId, userId, contactId, options = {}) {
  const [contact, campaignPlan, emailCampaign] = await Promise.all([
    loadContactById(chatId, contactId),
    loadAssociatedCampaignPlan(chatId),
    loadAssociatedEmailCampaign(chatId),
  ]);

  if (!contact) throw new Error("Contact not found");

  const [company, deals, tasks, activities] = await Promise.all([
    contact.companyId ? loadCompanyById(chatId, contact.companyId) : Promise.resolve(null),
    prisma.cRMDeal.findMany({ where: { chatId, contactId, archivedAt: null }, include: { stage: true, pipeline: true } }),
    prisma.cRMTask.findMany({ where: { chatId, contactId }, orderBy: { dueAt: "asc" } }),
    prisma.cRMActivity.findMany({ where: { chatId, contactId }, orderBy: { activityDate: "desc" }, take: 10 }),
  ]);

  const context = buildContext(contact, company, deals, tasks, activities, campaignPlan, emailCampaign);

  const prompt = buildJourneyPrompt(context);

  const aiResult = await callAI(prompt);

  let journey;
  if (aiResult.success && aiResult.data) {
    journey = validateJourneyOutput(aiResult.data);
  }

  if (!journey) {
    console.warn("[LeadJourney] AI failed, using rule-based fallback for contact", contactId);
    journey = generateRuleBasedFallback(contact, company, deals, tasks, activities, campaignPlan, emailCampaign);
  }

  await prisma.cRMContact.update({
    where: { id: contactId },
    data: {
      customFields: {
        ...(typeof contact.customFields === "object" && contact.customFields !== null ? contact.customFields : {}),
        leadJourney: journey,
      },
    },
  });

  return journey;
}

export async function getLeadJourney(chatId, contactId) {
  const contact = await loadContactById(chatId, contactId);
  if (!contact) return null;

  const customFields = contact.customFields;
  if (!customFields || typeof customFields !== "object") return null;

  return customFields.leadJourney || null;
}

export function generateRuleBasedFallback(contact, company, deals, tasks, activities, campaignPlan, emailCampaign) {
  const riskAssessment = {
    missingConsent: contact.consentStatus === "NOT_MEASURED" || !contact.consentStatus,
    invalidEmail: !contact.email,
    noOwnerAssigned: !contact.ownerId,
    noCampaignAssociation: !campaignPlan,
    noRecentActivity: !activities || activities.length === 0,
  };

  const journeySteps = [];
  let nextAction = null;

  if (!contact.ownerId) {
    journeySteps.push({
      order: 1,
      stage: "Assignment",
      objective: "Assign an owner to this contact to enable follow-up",
      trigger: "Contact created without owner",
      action: "Assign a sales or SDR team member as the contact owner",
      delay: "Immediate",
      approvalRequired: false,
      evidence: "Contact has no ownerId set",
      inferenceStatus: "NOT_MEASURED",
    });
    nextAction = {
      action: "Assign contact owner",
      reason: "Contact has no assigned owner, making follow-up impossible",
      evidence: "contact.ownerId is null",
      dueRecommendation: "Immediate",
      priority: "HIGH",
      inferenceStatus: "NOT_MEASURED",
    };
  }

  if (!campaignPlan) {
    journeySteps.push({
      order: journeySteps.length + 1,
      stage: "Campaign Association",
      objective: "Associate this contact with an active campaign",
      trigger: "No campaign plan linked to chat",
      action: "Create or link a campaign plan and associate the contact",
      delay: "Within 1 week",
      approvalRequired: true,
      evidence: "No campaignPlan found for this chat",
      inferenceStatus: "NOT_MEASURED",
    });
    if (!nextAction) {
      nextAction = {
        action: "Associate contact with a campaign",
        reason: "Contact is not linked to any campaign for structured outreach",
        evidence: "campaignPlan is null",
        dueRecommendation: "Within 1 week",
        priority: "MEDIUM",
        inferenceStatus: "NOT_MEASURED",
      };
    }
  }

  if (!activities || activities.length === 0) {
    journeySteps.push({
      order: journeySteps.length + 1,
      stage: "Initial Outreach",
      objective: "Make first contact with the lead",
      trigger: "No recorded activity on contact",
      action: "Send introductory email or make initial call",
      delay: "Within 48 hours",
      approvalRequired: false,
      evidence: "No activities found for this contact",
      inferenceStatus: "AI_INFERRED",
    });
    if (!nextAction) {
      nextAction = {
        action: "Initiate first outreach",
        reason: "Contact has no recorded activity history",
        evidence: "activities array is empty",
        dueRecommendation: "Within 48 hours",
        priority: "HIGH",
        inferenceStatus: "AI_INFERRED",
      };
    }
  }

  if (contact.consentStatus === "NOT_MEASURED" || !contact.consentStatus) {
    journeySteps.push({
      order: journeySteps.length + 1,
      stage: "Consent Verification",
      objective: "Confirm contact consent status for communications",
      trigger: "Consent status is NOT_MEASURED",
      action: "Send consent confirmation request or check existing records",
      delay: "Before any outreach",
      approvalRequired: true,
      evidence: "contact.consentStatus is NOT_MEASURED",
      inferenceStatus: "NOT_MEASURED",
    });
  }

  if (!contact.email) {
    journeySteps.push({
      order: journeySteps.length + 1,
      stage: "Data Enrichment",
      objective: "Collect a valid email address for the contact",
      trigger: "Contact has no email on file",
      action: "Enrich contact data via company lookup or direct ask",
      delay: "Within 1 week",
      approvalRequired: false,
      evidence: "contact.email is null",
      inferenceStatus: "NOT_MEASURED",
    });
    if (!nextAction) {
      nextAction = {
        action: "Enrich contact email",
        reason: "Cannot proceed with email outreach without a valid address",
        evidence: "contact.email is null",
        dueRecommendation: "Within 1 week",
        priority: "HIGH",
        inferenceStatus: "NOT_MEASURED",
      };
    }
  }

  if (!nextAction) {
    nextAction = {
      action: "Review lead status and plan next steps",
      reason: "All basic checks passed, needs human review for direction",
      evidence: "All rule-based checks evaluated",
      dueRecommendation: "Within 2 weeks",
      priority: "LOW",
      inferenceStatus: "NOT_MEASURED",
    };
  }

  const currentState = {
    lifecycleStage: contact.lifecycleStage || "NOT_MEASURED",
    pipelineStage: deals && deals.length > 0 ? (deals[0].stage?.name || "Unknown") : "Not in pipeline",
    summary: buildFallbackSummary(contact, company, deals, activities, riskAssessment),
  };

  return {
    currentState,
    recommendedNextAction: nextAction,
    journeySteps,
    riskAssessment,
  };
}

function buildContext(contact, company, deals, tasks, activities, campaignPlan, emailCampaign) {
  return {
    contact: {
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      jobTitle: contact.jobTitle,
      lifecycleStage: contact.lifecycleStage,
      source: contact.source,
      consentStatus: contact.consentStatus,
      ownerId: contact.ownerId,
      status: contact.status,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    },
    company: company
      ? {
          id: company.id,
          name: company.name,
          website: company.website,
          industry: company.industry,
          employeeRange: company.employeeRange,
          location: company.location,
          description: company.description,
        }
      : null,
    deals: (deals || []).map((d) => ({
      id: d.id,
      name: d.name,
      value: d.value,
      currency: d.currency,
      status: d.status,
      stage: d.stage?.name || null,
      pipeline: d.pipeline?.name || null,
      expectedCloseDate: d.expectedCloseDate,
      source: d.source,
      createdAt: d.createdAt,
    })),
    tasks: (tasks || []).map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueAt: t.dueAt,
      assignedTo: t.assignedTo,
    })),
    activities: (activities || []).map((a) => ({
      id: a.id,
      activityType: a.activityType,
      title: a.title,
      description: a.description,
      activityDate: a.activityDate,
      outcome: a.outcome,
    })),
    campaignPlan: campaignPlan
      ? {
          id: campaignPlan.id,
          name: campaignPlan.executiveSummary?.campaignName,
          goal: campaignPlan.businessGoal?.goal,
          status: campaignPlan.status,
        }
      : null,
    emailCampaign: emailCampaign
      ? {
          id: emailCampaign.id,
          name: emailCampaign.name,
          objective: emailCampaign.objective,
          status: emailCampaign.status,
          totalEmails: emailCampaign.totalEmails,
        }
      : null,
  };
}

function buildJourneyPrompt(context) {
  return `You are a Senior CRM and Revenue Operations Analyst. Analyze the following real contact data and generate a lead journey recommendation.

ABSOLUTE RULES - READ CAREFULLY:
1. You must ONLY use the data provided below. Do NOT fabricate contact behavior, scores, metrics, engagement rates, or any statistics.
2. Do NOT invent past interactions, email opens, click rates, or sentiment analysis.
3. All recommendations must cite specific evidence from the data below.
4. If a field is null or empty, state that it is missing — do not assume a default value.
5. Return ONLY valid JSON. No markdown, no code blocks, no explanation.

--- BEGIN REAL CONTACT DATA ---

Contact:
- ID: ${context.contact.id}
- Name: ${context.contact.firstName} ${context.contact.lastName || ""}
- Email: ${context.contact.email || "NOT PROVIDED"}
- Phone: ${context.contact.phone || "NOT PROVIDED"}
- Job Title: ${context.contact.jobTitle || "NOT PROVIDED"}
- Lifecycle Stage: ${context.contact.lifecycleStage}
- Source: ${context.contact.source || "NOT PROVIDED"}
- Consent Status: ${context.contact.consentStatus}
- Owner ID: ${context.contact.ownerId || "NOT ASSIGNED"}
- Status: ${context.contact.status}
- Created: ${context.contact.createdAt}
- Last Updated: ${context.contact.updatedAt}

Company: ${context.company ? JSON.stringify(context.company) : "NOT ASSOCIATED"}

Deals (${context.deals.length}): ${context.deals.length > 0 ? JSON.stringify(context.deals) : "NONE"}

Tasks (${context.tasks.length}): ${context.tasks.length > 0 ? JSON.stringify(context.tasks) : "NONE"}

Recent Activities (last 10): ${context.activities.length > 0 ? JSON.stringify(context.activities) : "NONE"}

Campaign Plan: ${context.campaignPlan ? JSON.stringify(context.campaignPlan) : "NONE"}

Email Campaign: ${context.emailCampaign ? JSON.stringify(context.emailCampaign) : "NONE"}

--- END REAL CONTACT DATA ---

Return this exact JSON structure (no extra fields, no markdown):
{
  "currentState": {
    "lifecycleStage": "string (use the real lifecycleStage from data)",
    "pipelineStage": "string (use the real pipeline stage from deals if available, or 'Not in pipeline')",
    "summary": "string (2-3 sentence analysis based ONLY on real data)"
  },
  "recommendedNextAction": {
    "action": "string",
    "reason": "string (must cite specific data fields)",
    "evidence": "string (quote which fields drove this recommendation)",
    "dueRecommendation": "string (e.g. 'Within 48 hours', 'Within 1 week', 'Immediate')",
    "priority": "LOW | MEDIUM | HIGH | URGENT",
    "inferenceStatus": "AI_INFERRED"
  },
  "journeySteps": [
    {
      "order": 1,
      "stage": "string",
      "objective": "string",
      "trigger": "string (must reference real data condition)",
      "action": "string",
      "delay": "string",
      "approvalRequired": true,
      "evidence": "string (which real data supports this step)",
      "inferenceStatus": "AI_INFERRED"
    }
  ],
  "riskAssessment": {
    "missingConsent": true,
    "invalidEmail": true,
    "noOwnerAssigned": true,
    "noCampaignAssociation": true,
    "noRecentActivity": true
  }
}

Remember: NO fabricated data. NO made-up scores. NO assumed engagement metrics. Only what is provided above.`;
}

function validateJourneyOutput(data) {
  if (!data || typeof data !== "object") return null;

  if (!data.currentState || !data.recommendedNextAction || !data.journeySteps || !data.riskAssessment) {
    console.warn("[LeadJourney] Missing required top-level fields in AI output");
    return null;
  }

  if (!Array.isArray(data.journeySteps) || data.journeySteps.length === 0) {
    console.warn("[LeadJourney] journeySteps must be a non-empty array");
    return null;
  }

  for (const step of data.journeySteps) {
    if (!step.order || !step.stage || !step.objective || !step.trigger || !step.action) {
      console.warn("[LeadJourney] journeyStep missing required fields");
      return null;
    }
  }

  if (!data.recommendedNextAction.action || !data.recommendedNextAction.priority) {
    console.warn("[LeadJourney] recommendedNextAction missing required fields");
    return null;
  }

  return {
    currentState: {
      lifecycleStage: data.currentState.lifecycleStage || null,
      pipelineStage: data.currentState.pipelineStage || null,
      summary: data.currentState.summary || "",
    },
    recommendedNextAction: {
      action: data.recommendedNextAction.action,
      reason: data.recommendedNextAction.reason || "",
      evidence: data.recommendedNextAction.evidence || "",
      dueRecommendation: data.recommendedNextAction.dueRecommendation || "",
      priority: data.recommendedNextAction.priority,
      inferenceStatus: data.recommendedNextAction.inferenceStatus || "AI_INFERRED",
    },
    journeySteps: data.journeySteps.map((step, i) => ({
      order: step.order || i + 1,
      stage: step.stage,
      objective: step.objective,
      trigger: step.trigger,
      action: step.action,
      delay: step.delay || "",
      approvalRequired: !!step.approvalRequired,
      evidence: step.evidence || "",
      inferenceStatus: step.inferenceStatus || "AI_INFERRED",
    })),
    riskAssessment: {
      missingConsent: !!data.riskAssessment.missingConsent,
      invalidEmail: !!data.riskAssessment.invalidEmail,
      noOwnerAssigned: !!data.riskAssessment.noOwnerAssigned,
      noCampaignAssociation: !!data.riskAssessment.noCampaignAssociation,
      noRecentActivity: !!data.riskAssessment.noRecentActivity,
    },
  };
}

function buildFallbackSummary(contact, company, deals, activities, riskAssessment) {
  const parts = [];
  parts.push(`Contact ${contact.firstName} ${contact.lastName || ""} is in lifecycle stage "${contact.lifecycleStage}".`);
  if (company) parts.push(`Associated with company "${company.name}".`);
  if (deals && deals.length > 0) parts.push(`Has ${deals.length} deal(s) in pipeline.`);
  if (!activities || activities.length === 0) parts.push("No recent activity recorded.");
  const risks = Object.entries(riskAssessment).filter(([, v]) => v).map(([k]) => k);
  if (risks.length > 0) parts.push(`Identified risks: ${risks.join(", ")}.`);
  return parts.join(" ");
}
