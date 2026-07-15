import { prisma } from "../../config/prisma.js";
import { callAI } from "../../ai/services/aiRouter.service.js";
import { validateContentClaims } from "../execution/claim-validator.service.js";
import { sendEmail, getEmailProviderHealth } from "../integrations/email/email-provider-registry.js";
import { renderEmailHtml, renderPlainText } from "../email/email-template-renderer.service.js";

const EMAIL_SEQUENCE_TEMPLATES = [
  { purpose: "Introduction & Value Proposition", daysDelay: 0 },
  { purpose: "Social Proof & Credibility", daysDelay: 2 },
  { purpose: "Detailed Solution / Product Deep Dive", daysDelay: 4 },
  { purpose: "Case Study or Use Case", daysDelay: 7 },
  { purpose: "Objection Handling", daysDelay: 10 },
  { purpose: "Final CTA / Urgency", daysDelay: 14 },
];

function buildContextFromPlan(plan, evidence) {
  const audience = plan.audienceSelection || {};
  const channelRecs = plan.channelRecommendations || [];
  const funnelData = plan.marketingFunnel || {};
  const goals = plan.businessGoal || {};
  const kpiData = plan.kpiFramework || [];
  const kpiList = Array.isArray(kpiData) ? kpiData : [];

  const websiteData = evidence?.website || {};
  const competitorData = evidence?.competitors || {};
  const audienceData = evidence?.audience || {};
  const seoData = evidence?.seo || {};

  const painPoints = [
    ...(audienceData?.painPoints?.value || audience.painPoints || []),
  ].slice(0, 5);

  const ctaTexts = websiteData?.ctaTexts?.value || [];

  return {
    productName: evidence?.product?.name || plan?.inputJson?.productName || "",
    companyName: evidence?.company?.name || plan?.inputJson?.companyName || "",
    industry: evidence?.industry?.name || plan?.inputJson?.industry || "",
    targetAudience: audienceData?.description?.value || audience.primary || plan?.inputJson?.targetAudience || "",
    painPoints,
    ctaTexts,
    competitorNames: (competitorData?.list?.value || []).slice(0, 3).map(c => c.name || c.url).filter(Boolean),
    heroText: websiteData?.heroText?.value || "",
    usps: websiteData?.usps?.value || [],
    seoKeywords: seoData?.keywords?.value || [],
    campaignObjective: plan.campaignObjective?.primary || plan.campaignObjective?.goal || goals.goal || "",
    kpis: kpiList.map(k => k.kpi || k.name || "").filter(Boolean),
    funnelStages: Object.keys(funnelData).filter(k => funnelData[k]),
    channelFitEmail: channelRecs.find(c => (c.channel || "").toLowerCase().includes("email")),
    evidenceSources: evidence?.sourceSummary?.sourcesCollected || [],
  };
}

function determineChannelFit(plan) {
  const channelRecs = plan.channelRecommendations || [];
  const emailChannel = channelRecs.find(c =>
    (c.channel || "").toLowerCase().includes("email")
  );
  if (!emailChannel) {
    return {
      isRecommended: false,
      reason: "Not available",
      evidence: "No email channel found in campaign plan channel recommendations",
      inferenceStatus: "NOT_MEASURED",
    };
  }
  return {
    isRecommended: true,
    fit: emailChannel.fit || "medium",
    priority: emailChannel.priority || "medium",
    reason: emailChannel.reason || "Email channel recommended by campaign intelligence",
    evidence: emailChannel.evidence || "Campaign channel recommendation",
    inferenceStatus: "EVIDENCE_BACKED",
  };
}

function buildAIPrompt(context) {
  return `You are a Senior Email Marketing Strategist. Generate a complete email sequence using ONLY the verified evidence below.

CONTEXT:
Product: ${context.productName || "Not available"}
Company: ${context.companyName || "Not available"}
Industry: ${context.industry || "Not available"}
Target Audience: ${context.targetAudience || "Not available"}
Campaign Objective: ${context.campaignObjective || "Not available"}
Pain Points: ${context.painPoints.join("; ") || "Not available"}
Website CTAs: ${context.ctaTexts.join("; ") || "Not available"}
Competitors: ${context.competitorNames.join(", ") || "Not available"}
USPs: ${context.usps.join("; ") || "Not available"}
Evidence Sources: ${context.evidenceSources.join(", ") || "Not available"}

Generate 6 emails following these purposes:
1. Introduction & Value Proposition (Day 0)
2. Social Proof & Credibility (Day 2)
3. Detailed Solution / Product Deep Dive (Day 4)
4. Case Study or Use Case (Day 7)
5. Objection Handling (Day 10)
6. Final CTA / Urgency (Day 14)

Return ONLY valid JSON with this exact structure (no markdown, no extra text):
{
  "emails": [
    {
      "sequenceOrder": 1,
      "emailName": "Brief descriptive name",
      "purpose": "Introduction & Value Proposition",
      "funnelStage": "awareness",
      "subjectLine": "Subject line max 60 chars, specific to product",
      "alternativeSubjectLines": ["alt1", "alt2"],
      "previewText": "Preview text max 100 chars",
      "greetingStrategy": "Personalized with {{firstName}}",
      "emailBodyText": "Full plain-text email body. Use evidence-backed pain points and product value.",
      "primaryCta": "Single clear call to action",
      "secondaryCta": null,
      "personalizationFields": ["{{firstName}}", "{{companyName}}"],
      "evidenceUsed": [
        {
          "claim": "Specific claim made in this email",
          "source": "Evidence source from provided context",
          "inferenceStatus": "EVIDENCE_BACKED"
        }
      ],
      "inferenceStatus": "EVIDENCE_BACKED",
      "complianceNotes": "All claims are evidence-backed from provided data"
    }
  ]
}

CRITICAL RULES:
1. Use ONLY the evidence provided in CONTEXT above. Do NOT invent statistics.
2. Do NOT generate: ROI percentages, conversion rates, open rates, click-through rates, revenue figures, customer counts, or any numerical metrics.
3. Do NOT use phrases like: "studies show", "research indicates", "according to our research", "industry experts say", "join X+ customers".
4. Do NOT fabricate testimonials, case studies, or quotes from real people.
5. If evidence is missing for a claim, set inferenceStatus to "AI_INFERRED" or "NOT_MEASURED".
6. Use {{firstName}} and {{companyName}} for personalization only.
7. Subject lines must be specific to the product, not generic.
8. Each email body must reference at least one pain point or value from the evidence.
9. Array must have exactly 6 emails.
10. Return ONLY valid JSON. No markdown formatting.`;
}

function validateEmailContent(emails) {
  const results = { valid: true, issues: [] };
  for (const email of emails) {
    const checks = [];
    if (!email.subjectLine || email.subjectLine.length > 60) {
      checks.push({ field: "subjectLine", issue: "Missing or exceeds 60 chars" });
    }
    if (!email.emailBodyText) {
      checks.push({ field: "emailBodyText", issue: "Missing email body" });
    }
    if (!email.primaryCta) {
      checks.push({ field: "primaryCta", issue: "Missing primary CTA" });
    }
    if (email.personalizationFields && email.personalizationFields.length > 5) {
      checks.push({ field: "personalizationFields", issue: "Too many personalization fields" });
    }
    if (email.evidenceUsed) {
      for (const ev of email.evidenceUsed) {
        if (!ev.source && ev.inferenceStatus === "EVIDENCE_BACKED") {
          checks.push({ field: "evidenceUsed", issue: `Claim "${ev.claim?.substring(0, 40)}" missing source for EVIDENCE_BACKED status` });
        }
      }
    }
    const claimResult = validateContentClaims(email, `email_${email.sequenceOrder}`);
    if (!claimResult.valid) {
      for (const finding of claimResult.findings) {
        if (finding.action === "removed") {
          checks.push({ field: `email[${email.sequenceOrder}].${finding.path}`, issue: `Hallucinated pattern detected: ${finding.text?.substring(0, 60)}` });
        }
      }
    }
    if (checks.length > 0) {
      results.valid = false;
      results.issues.push({ sequenceOrder: email.sequenceOrder, checks });
    }
  }
  return results;
}

function buildDefaultEmail(seqOrder, purpose, daysDelay, context) {
  const funnelStage = seqOrder <= 2 ? "awareness" : seqOrder <= 4 ? "consideration" : seqOrder <= 5 ? "conversion" : "retention";
  return {
    sequenceOrder: seqOrder,
    emailName: `${purpose} - ${context.companyName || context.productName || "Campaign"}`,
    purpose,
    funnelStage,
    subjectLine: null,
    alternativeSubjectLines: [],
    previewText: null,
    greetingStrategy: "Personalized with {{firstName}}",
    emailBodyText: null,
    primaryCta: null,
    secondaryCta: null,
    personalizationFields: ["{{firstName}}", "{{companyName}}"],
    evidenceUsed: [],
    inferenceStatus: "NOT_MEASURED",
    complianceNotes: "AI generation pending. No claims verified.",
  };
}

export async function loadEvidence(campaignPlan) {
  const chatId = campaignPlan.chatId;
  const evidence = {};

  try {
    const evidenceSnapshot = await prisma.evidenceSnapshot.findFirst({
      where: { chatId },
      orderBy: { createdAt: "desc" },
    });
    if (evidenceSnapshot?.data) {
      const raw = typeof evidenceSnapshot.data === "string" ? JSON.parse(evidenceSnapshot.data) : evidenceSnapshot.data;
      Object.assign(evidence, raw);
    }
  } catch (e) {
    console.warn("[EmailCampaign] Evidence load warning:", e.message);
  }

  try {
    const assets = await prisma.automationAsset.findMany({
      where: { chatId },
      orderBy: { createdAt: "desc" },
    });
    for (const asset of assets) {
      const key = asset.type || "asset";
      if (!evidence[key]) {
        evidence[key] = {};
      }
      try {
        const data = typeof asset.data === "string" ? JSON.parse(asset.data) : asset.data;
        evidence[key][asset.id] = data;
      } catch {
        evidence[key][asset.id] = asset.data;
      }
    }
  } catch (e) {
    console.warn("[EmailCampaign] Asset load warning:", e.message);
  }

  return evidence;
}

export async function generateEmailCampaign(chatId, userId, campaignPlanId) {
  const plan = await prisma.campaignPlan.findUnique({
    where: { id: campaignPlanId },
  });
  if (!plan) {
    throw new Error(`CampaignPlan not found: ${campaignPlanId}`);
  }

  const evidence = await loadEvidence(plan);
  const context = buildContextFromPlan(plan, evidence);

  const channelFit = determineChannelFit(plan);

  const campaignName = `Email Campaign - ${context.productName || plan.executiveSummary?.campaignName || plan.campaignObjective?.primary || "Untitled"}`;

  const existingCampaign = await prisma.emailCampaign.findFirst({
    where: { campaignPlanId, status: { in: ["DRAFT", "GENERATED", "PARTIALLY_GENERATED"] } },
    orderBy: { createdAt: "desc" },
  });

  let dbCampaign;
  if (existingCampaign) {
    dbCampaign = await prisma.emailCampaign.update({
      where: { id: existingCampaign.id },
      data: {
        name: campaignName,
        objective: context.campaignObjective || plan.campaignObjective?.primary || null,
        audienceSummary: context.targetAudience || null,
        funnelStage: context.funnelStages?.[0] || null,
        sequenceType: "lead_outreach",
        senderName: context.companyName || null,
        generationStatus: "running",
        evidenceSummary: {
          sourcesUsed: context.evidenceSources,
          evidenceCount: context.evidenceSources.length,
          missingEvidence: [],
        },
      },
    });
  } else {
    dbCampaign = await prisma.emailCampaign.create({
      data: {
        chatId,
        userId,
        campaignPlanId,
        name: campaignName,
        objective: context.campaignObjective || plan.campaignObjective?.primary || null,
        audienceSummary: context.targetAudience || null,
        funnelStage: context.funnelStages?.[0] || null,
        sequenceType: "lead_outreach",
        senderName: context.companyName || null,
        status: "DRAFT",
        approvalStatus: "NOT_SUBMITTED",
        generationStatus: "running",
        evidenceSummary: {
          sourcesUsed: context.evidenceSources,
          evidenceCount: context.evidenceSources.length,
          missingEvidence: [],
        },
      },
    });
  }

  const aiResult = await callAI(buildAIPrompt(context));

  let items = [];
  let generationStatus = "completed";
  let missingEvidence = [];

  if (aiResult.success && aiResult.data?.emails) {
    items = aiResult.data.emails;
    const validation = validateEmailContent(items);
    if (!validation.valid) {
      generationStatus = "partial";
      missingEvidence = validation.issues.map(i => ({
        sequenceOrder: i.sequenceOrder,
        reason: i.checks.map(c => c.issue).join("; "),
      }));
    }
  } else {
    generationStatus = "failed";
    items = EMAIL_SEQUENCE_TEMPLATES.map((tpl, idx) =>
      buildDefaultEmail(idx + 1, tpl.purpose, tpl.daysDelay, context)
    );
  }

  for (const emailData of items) {
    let itemRecord = await prisma.emailSequenceItem.findFirst({
      where: { emailCampaignId: dbCampaign.id, sequenceOrder: emailData.sequenceOrder },
    });

    const cleanedEvidence = (emailData.evidenceUsed || []).map(ev => ({
      claim: ev.claim || "",
      source: ev.source || "Not available",
      inferenceStatus: ev.inferenceStatus || "NOT_MEASURED",
    }));

    if (itemRecord) {
      await prisma.emailSequenceItem.update({
        where: { id: itemRecord.id },
        data: {
          emailName: emailData.emailName || `${emailData.purpose} - ${context.companyName || "Campaign"}`,
          purpose: emailData.purpose || null,
          funnelStage: emailData.funnelStage || null,
          subjectLine: emailData.subjectLine || null,
          alternativeSubjectLines: emailData.alternativeSubjectLines || [],
          previewText: emailData.previewText || null,
          greetingStrategy: emailData.greetingStrategy || null,
          emailBodyText: emailData.emailBodyText || null,
          emailBodyHtml: emailData.emailBodyHtml || null,
          primaryCta: emailData.primaryCta || null,
          secondaryCta: emailData.secondaryCta || null,
          personalizationFields: emailData.personalizationFields || ["{{firstName}}", "{{companyName}}"],
          evidenceUsed: cleanedEvidence,
          inferenceStatus: emailData.inferenceStatus || "NOT_MEASURED",
          complianceNotes: emailData.complianceNotes || null,
          status: "draft",
        },
      });
    } else {
      await prisma.emailSequenceItem.create({
        data: {
          emailCampaignId: dbCampaign.id,
          sequenceOrder: emailData.sequenceOrder,
          emailName: emailData.emailName || `${emailData.purpose} - ${context.companyName || "Campaign"}`,
          purpose: emailData.purpose || null,
          funnelStage: emailData.funnelStage || null,
          delayAfterPreviousDays: EMAIL_SEQUENCE_TEMPLATES[emailData.sequenceOrder - 1]?.daysDelay || 0,
          subjectLine: emailData.subjectLine || null,
          alternativeSubjectLines: emailData.alternativeSubjectLines || [],
          previewText: emailData.previewText || null,
          greetingStrategy: emailData.greetingStrategy || null,
          emailBodyText: emailData.emailBodyText || null,
          emailBodyHtml: emailData.emailBodyHtml || null,
          primaryCta: emailData.primaryCta || null,
          secondaryCta: emailData.secondaryCta || null,
          personalizationFields: emailData.personalizationFields || ["{{firstName}}", "{{companyName}}"],
          evidenceUsed: cleanedEvidence,
          inferenceStatus: emailData.inferenceStatus || "NOT_MEASURED",
          complianceNotes: emailData.complianceNotes || null,
          status: "draft",
        },
      });
    }

    if (emailData.subjectLine && !emailData.emailBodyText) {
      generationStatus = "partial";
    }
  }

  const totalEmails = await prisma.emailSequenceItem.count({
    where: { emailCampaignId: dbCampaign.id },
  });

  const newStatus = generationStatus === "failed" ? "FAILED" :
                    generationStatus === "partial" ? "PARTIALLY_GENERATED" : "GENERATED";

  dbCampaign = await prisma.emailCampaign.update({
    where: { id: dbCampaign.id },
    data: {
      status: newStatus,
      generationStatus,
      totalEmails,
      missingEvidence: missingEvidence.length > 0 ? missingEvidence : null,
      evidenceSummary: {
        sourcesUsed: context.evidenceSources,
        evidenceCount: context.evidenceSources.length,
        missingEvidence: missingEvidence.length,
      },
    },
  });

  await createVersionSnapshot(dbCampaign.id, "Initial email campaign generation", userId);

  await prisma.emailCampaignLog.create({
    data: {
      emailCampaignId: dbCampaign.id,
      action: "campaign_generated",
      status: generationStatus,
      message: `Email campaign generated with ${totalEmails} emails. Status: ${generationStatus}`,
      metadata: {
        totalEmails,
        generationStatus,
        provider: aiResult.provider || null,
        fallbackUsed: !aiResult.success,
      },
    },
  });

  const sequence = await prisma.emailSequenceItem.findMany({
    where: { emailCampaignId: dbCampaign.id },
    orderBy: { sequenceOrder: "asc" },
  });

  return {
    campaign: dbCampaign,
    items: sequence,
    channelFit,
    aiProvider: aiResult.provider || null,
    validationIssues: missingEvidence,
  };
}

export async function createVersionSnapshot(campaignId, reason, userId) {
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
    include: { sequenceItems: { orderBy: { sequenceOrder: "asc" } } },
  });
  if (!campaign) throw new Error(`EmailCampaign not found: ${campaignId}`);

  const lastVersion = await prisma.emailCampaignVersion.findFirst({
    where: { emailCampaignId: campaignId },
    orderBy: { versionNumber: "desc" },
  });

  const versionNumber = (lastVersion?.versionNumber || 0) + 1;

  const snapshot = {
    campaign: {
      name: campaign.name,
      objective: campaign.objective,
      audienceSummary: campaign.audienceSummary,
      funnelStage: campaign.funnelStage,
      sequenceType: campaign.sequenceType,
      senderName: campaign.senderName,
      senderEmail: campaign.senderEmail,
      replyToEmail: campaign.replyToEmail,
      totalEmails: campaign.totalEmails,
      status: campaign.status,
      approvalStatus: campaign.approvalStatus,
      evidenceSummary: campaign.evidenceSummary,
      missingEvidence: campaign.missingEvidence,
    },
    items: campaign.sequenceItems.map(item => ({
      id: item.id,
      sequenceOrder: item.sequenceOrder,
      emailName: item.emailName,
      purpose: item.purpose,
      funnelStage: item.funnelStage,
      delayAfterPreviousDays: item.delayAfterPreviousDays,
      subjectLine: item.subjectLine,
      alternativeSubjectLines: item.alternativeSubjectLines,
      previewText: item.previewText,
      greetingStrategy: item.greetingStrategy,
      emailBodyText: item.emailBodyText,
      primaryCta: item.primaryCta,
      secondaryCta: item.secondaryCta,
      personalizationFields: item.personalizationFields,
      evidenceUsed: item.evidenceUsed,
      inferenceStatus: item.inferenceStatus,
      complianceNotes: item.complianceNotes,
      status: item.status,
    })),
  };

  const version = await prisma.emailCampaignVersion.create({
    data: {
      emailCampaignId: campaignId,
      versionNumber,
      snapshot,
      changeReason: reason || null,
      createdBy: userId || null,
    },
  });

  await prisma.emailCampaignLog.create({
    data: {
      emailCampaignId: campaignId,
      action: "version_created",
      status: "completed",
      message: `Version ${versionNumber} created: ${reason || "No reason provided"}`,
      metadata: { versionNumber, reason },
    },
  });

  return version;
}

export async function updateEmailItem(campaignId, itemId, updates, userId) {
  const existingItem = await prisma.emailSequenceItem.findUnique({
    where: { id: itemId },
  });
  if (!existingItem) throw new Error(`EmailSequenceItem not found: ${itemId}`);

  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) throw new Error(`EmailCampaign not found: ${campaignId}`);

  const changedFields = [];
  for (const [key, value] of Object.entries(updates)) {
    if (JSON.stringify(existingItem[key]) !== JSON.stringify(value)) {
      changedFields.push(key);
    }
  }

  const item = await prisma.emailSequenceItem.update({
    where: { id: itemId },
    data: updates,
  });

  if (campaign.approvalStatus === "APPROVED") {
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        approvalStatus: "NOT_SUBMITTED",
        status: "DRAFT",
        approvedAt: null,
      },
    });
    await prisma.emailCampaignLog.create({
      data: {
        emailCampaignId: campaignId,
        emailSequenceItemId: itemId,
        action: "approval_invalidated",
        status: "completed",
        message: "Edit after approval — approval status reset to NOT_SUBMITTED",
        metadata: { changedFields, userId, previousApprovalStatus: "APPROVED" },
      },
    });
  }

  await prisma.emailCampaignLog.create({
    data: {
      emailCampaignId: campaignId,
      emailSequenceItemId: itemId,
      action: "item_edited",
      message: `Updated fields: ${changedFields.join(", ")}`,
      metadata: { changedFields, userId },
    },
  });

  return item;
}

export async function regenerateEmailItem(campaignId, itemId, customPrompt) {
  const item = await prisma.emailSequenceItem.findUnique({
    where: { id: itemId },
  });
  if (!item) throw new Error(`EmailSequenceItem not found: ${itemId}`);

  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) throw new Error(`EmailCampaign not found: ${campaignId}`);

  const plan = await prisma.campaignPlan.findUnique({
    where: { id: campaign.campaignPlanId },
  });

  const evidence = plan ? await loadEvidence(plan) : {};
  const context = buildContextFromPlan(plan || {}, evidence);

  const prompt = customPrompt || `Regenerate ONLY email ${item.sequenceOrder} ("${item.purpose}") for this sequence. Use this context:
Product: ${context.productName}
Company: ${context.companyName}
Target: ${context.targetAudience}
Pain Points: ${context.painPoints.join("; ") || "Not available"}

Current subject: ${item.subjectLine || "None"}
Current body: ${(item.emailBodyText || "None").substring(0, 200)}

Return ONLY valid JSON:
{
  "sequenceOrder": ${item.sequenceOrder},
  "subjectLine": "New subject line max 60 chars",
  "alternativeSubjectLines": ["alt1", "alt2"],
  "previewText": "New preview text max 100 chars",
  "emailBodyText": "New plain-text email body",
  "primaryCta": "New single CTA",
  "secondaryCta": null,
  "evidenceUsed": [{"claim": "Claim", "source": "Provided evidence", "inferenceStatus": "EVIDENCE_BACKED"}],
  "inferenceStatus": "EVIDENCE_BACKED",
  "complianceNotes": "All claims from provided data"
}

CRITICAL: No fake stats, no testimonials, no "studies show".`;

  const aiResult = await callAI(prompt);

  let data;
  if (aiResult.success && aiResult.data) {
    data = aiResult.data;
  } else {
    data = {
      subjectLine: null,
      alternativeSubjectLines: [],
      previewText: null,
      emailBodyText: null,
      primaryCta: null,
      secondaryCta: null,
      evidenceUsed: [],
      inferenceStatus: "AI_INFERRED",
      complianceNotes: "Regeneration failed. Placeholder content.",
    };
  }

  const updatedItem = await prisma.emailSequenceItem.update({
    where: { id: itemId },
    data: {
      subjectLine: data.subjectLine || null,
      alternativeSubjectLines: data.alternativeSubjectLines || [],
      previewText: data.previewText || null,
      emailBodyText: data.emailBodyText || null,
      emailBodyHtml: data.emailBodyHtml || null,
      primaryCta: data.primaryCta || null,
      secondaryCta: data.secondaryCta || null,
      evidenceUsed: (data.evidenceUsed || []).map(ev => ({
        claim: ev.claim || "",
        source: ev.source || "Not available",
        inferenceStatus: ev.inferenceStatus || "NOT_MEASURED",
      })),
      inferenceStatus: data.inferenceStatus || "AI_INFERRED",
      complianceNotes: data.complianceNotes || null,
    },
  });

  await prisma.emailCampaignLog.create({
    data: {
      emailCampaignId: campaignId,
      emailSequenceItemId: itemId,
      action: "item_regenerated",
      status: aiResult.success ? "completed" : "partial",
      message: `Email ${item.sequenceOrder} regenerated${aiResult.success ? "" : " with fallback"}`,
      metadata: { provider: aiResult.provider || null, success: aiResult.success },
    },
  });

  return updatedItem;
}

export async function submitForReview(campaignId, userId) {
  const campaign = await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: {
      approvalStatus: "PENDING_REVIEW",
      submittedAt: new Date(),
    },
  });

  await createVersionSnapshot(campaignId, "Submitted for review", userId);

  await prisma.emailCampaignLog.create({
    data: {
      emailCampaignId: campaignId,
      action: "submitted_review",
      status: "pending",
      message: "Campaign submitted for approval review",
      metadata: { userId },
    },
  });

  return campaign;
}

export async function approveCampaign(campaignId, userId) {
  const campaign = await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: {
      approvalStatus: "APPROVED",
      status: "APPROVED",
      approvedAt: new Date(),
    },
  });

  await createVersionSnapshot(campaignId, "Approved - ready for sending", userId);

  await prisma.emailCampaignLog.create({
    data: {
      emailCampaignId: campaignId,
      action: "approved",
      status: "completed",
      message: "Campaign approved",
      metadata: { userId },
    },
  });

  return campaign;
}

export async function requestChanges(campaignId, userId, feedback) {
  const campaign = await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: {
      approvalStatus: "CHANGES_REQUESTED",
      status: "PARTIALLY_GENERATED",
    },
  });

  await prisma.emailCampaignLog.create({
    data: {
      emailCampaignId: campaignId,
      action: "changes_requested",
      status: "pending",
      message: feedback || "Changes requested by reviewer",
      metadata: { userId, feedback },
    },
  });

  return campaign;
}

export async function restoreVersion(campaignId, versionId, userId) {
  const version = await prisma.emailCampaignVersion.findUnique({
    where: { id: versionId },
  });
  if (!version) throw new Error(`Version not found: ${versionId}`);

  const snapshot = version.snapshot?.campaign || {};
  const items = version.snapshot?.items || [];

  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: {
      name: snapshot.name,
      objective: snapshot.objective,
      audienceSummary: snapshot.audienceSummary,
      funnelStage: snapshot.funnelStage,
      sequenceType: snapshot.sequenceType,
      senderName: snapshot.senderName,
      senderEmail: snapshot.senderEmail,
      replyToEmail: snapshot.replyToEmail,
      totalEmails: snapshot.totalEmails,
      status: "DRAFT",
      approvalStatus: "NOT_SUBMITTED",
      evidenceSummary: snapshot.evidenceSummary,
      missingEvidence: snapshot.missingEvidence,
      approvedAt: null,
    },
  });

  for (const item of items) {
    await prisma.emailSequenceItem.upsert({
      where: { id: item.id },
      update: {
        sequenceOrder: item.sequenceOrder,
        emailName: item.emailName,
        purpose: item.purpose,
        funnelStage: item.funnelStage,
        delayAfterPreviousDays: item.delayAfterPreviousDays,
        subjectLine: item.subjectLine,
        alternativeSubjectLines: item.alternativeSubjectLines,
        previewText: item.previewText,
        greetingStrategy: item.greetingStrategy,
        emailBodyText: item.emailBodyText,
        primaryCta: item.primaryCta,
        secondaryCta: item.secondaryCta,
        personalizationFields: item.personalizationFields,
        evidenceUsed: item.evidenceUsed,
        inferenceStatus: item.inferenceStatus,
        complianceNotes: item.complianceNotes,
        status: "draft",
      },
      create: {
        emailCampaignId: campaignId,
        sequenceOrder: item.sequenceOrder,
        emailName: item.emailName,
        purpose: item.purpose,
        funnelStage: item.funnelStage,
        delayAfterPreviousDays: item.delayAfterPreviousDays,
        subjectLine: item.subjectLine,
        alternativeSubjectLines: item.alternativeSubjectLines,
        previewText: item.previewText,
        greetingStrategy: item.greetingStrategy,
        emailBodyText: item.emailBodyText,
        primaryCta: item.primaryCta,
        secondaryCta: item.secondaryCta,
        personalizationFields: item.personalizationFields,
        evidenceUsed: item.evidenceUsed,
        inferenceStatus: item.inferenceStatus,
        complianceNotes: item.complianceNotes,
        status: "draft",
      },
    });
  }

  await createVersionSnapshot(campaignId, `Restored from version ${version.versionNumber}`, userId);

  await prisma.emailCampaignLog.create({
    data: {
      emailCampaignId: campaignId,
      action: "version_restored",
      status: "completed",
      message: `Restored to version ${version.versionNumber}`,
      metadata: { versionNumber: version.versionNumber, userId },
    },
  });

  return { campaignId, restoredVersion: version.versionNumber };
}

export async function getCampaignWithDetails(campaignId) {
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
    include: {
      sequenceItems: { orderBy: { sequenceOrder: "asc" } },
      versions: { orderBy: { versionNumber: "desc" } },
      logs: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  return campaign;
}

export async function listCampaigns(chatId) {
  const campaigns = await prisma.emailCampaign.findMany({
    where: { chatId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { sequenceItems: true } },
    },
  });
  return campaigns;
}

export async function handleProviderHealth() {
  return getEmailProviderHealth();
}

export async function sendTestCampaignEmail(campaignId, recipientEmail, itemId) {
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) throw new Error(`EmailCampaign not found: ${campaignId}`);

  if (campaign.approvalStatus !== "APPROVED") {
    return { success: false, error: "Campaign must be approved before sending.", code: "APPROVAL_REQUIRED" };
  }

  let items;
  if (itemId) {
    items = await prisma.emailSequenceItem.findMany({
      where: { id: itemId, emailCampaignId: campaignId },
    });
  } else {
    items = await prisma.emailSequenceItem.findMany({
      where: { emailCampaignId: campaignId },
      orderBy: { sequenceOrder: "asc" },
      take: 1,
    });
  }

  if (!items || items.length === 0) throw new Error("No email sequence items found");

  const item = items[0];
  const html = renderEmailHtml({
    subject: item.subjectLine || "",
    previewText: item.previewText || "",
    greeting: item.greetingStrategy ? `Hi {{firstName}},` : "",
    opening: "",
    bodyParagraphs: [item.emailBodyText || ""],
    bulletPoints: item.evidenceUsed?.map(e => e.claim).filter(Boolean) || [],
    cta: item.primaryCta ? { text: item.primaryCta } : null,
    closing: "",
    signature: campaign.senderName ? `${campaign.senderName}` : "",
  });

  const text = renderPlainText({
    greeting: item.greetingStrategy ? `Hi {{firstName}},` : "",
    bodyParagraphs: [item.emailBodyText || ""],
    bulletPoints: item.evidenceUsed?.map(e => e.claim).filter(Boolean) || [],
    cta: item.primaryCta ? { text: item.primaryCta } : null,
    closing: "",
    signature: campaign.senderName ? `${campaign.senderName}` : "",
  });

  const idempotencyKey = `test_${campaignId}_${item.id}_${Date.now()}`;

  const result = await sendEmail({
    to: recipientEmail,
    subject: item.subjectLine || "No subject",
    html,
    text,
    senderName: campaign.senderName || undefined,
    tags: [`campaign:${campaignId}`, `item:${item.id}`, "test-send"],
    idempotencyKey,
  });

  if (result.success) {
    await prisma.emailCampaignLog.create({
      data: {
        emailCampaignId: campaignId,
        emailSequenceItemId: item.id,
        action: "test_sent",
        status: "submitted",
        message: `Test email submitted to provider (${result.provider}) — awaiting delivery webhook`,
        metadata: { recipient: recipientEmail, provider: result.provider, providerMessageId: result.providerMessageId, idempotencyKey },
      },
    });
  }

  return result;
}

export async function sendCampaignEmails(campaignId) {
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
    include: {
      sequenceItems: { orderBy: { sequenceOrder: "asc" } },
      crmDeals: { include: { contact: true } },
    },
  });
  if (!campaign) throw new Error(`EmailCampaign not found: ${campaignId}`);

  if (campaign.approvalStatus !== "APPROVED") {
    return { success: false, error: "Campaign must be approved before sending.", code: "APPROVAL_REQUIRED" };
  }

  const health = getEmailProviderHealth();
  if (!health.canSend) {
    return { success: false, error: "No email provider configured.", code: "NO_PROVIDER", providers: health.providers };
  }

  const recipients = campaign.crmDeals
    ?.map(d => d.contact)
    ?.filter(c => c && c.email)
    ?.filter(c => {
      if (c.status === "ARCHIVED" || c.archivedAt) return false;
      if (c.consentStatus === "NOT_MEASURED" || c.consentStatus === "REVOKED") return false;
      return true;
    }) || [];

  const skippedContacts = campaign.crmDeals
    ?.map(d => d.contact)
    ?.filter(c => c && c.email)
    ?.filter(c => !(c.status === "ACTIVE" && (c.consentStatus === "GRANTED" || c.consentStatus === "NOT_MEASURED"))) || [];

  if (recipients.length === 0) {
    return {
      success: false,
      error: "No eligible recipients found. All associated contacts are archived, unsubscribed, or have revoked consent.",
      code: "NO_ELIGIBLE_RECIPIENTS",
      skippedContacts: skippedContacts.map(c => ({ id: c.id, email: c.email, reason: c.status !== "ACTIVE" ? "archived" : c.consentStatus === "REVOKED" ? "consent_revoked" : "consent_not_granted" })),
    };
  }

  const results = [];
  for (const item of campaign.sequenceItems) {
    if (item.status !== "draft") {
      results.push({ sequenceOrder: item.sequenceOrder, skipped: true, reason: `Item status is "${item.status}", not "draft"` });
      continue;
    }

    const existingLog = await prisma.emailCampaignLog.findFirst({
      where: { emailCampaignId: campaignId, emailSequenceItemId: item.id, action: { in: ["sent", "send_failed"] } },
      orderBy: { createdAt: "desc" },
    });
    if (existingLog) {
      results.push({ sequenceOrder: item.sequenceOrder, skipped: true, reason: "Already sent/failed — idempotency block" });
      continue;
    }

    const html = renderEmailHtml({
      subject: item.subjectLine || "",
      previewText: item.previewText || "",
      greeting: item.greetingStrategy ? `Hi {{firstName}},` : "",
      opening: "",
      bodyParagraphs: [item.emailBodyText || ""],
      bulletPoints: item.evidenceUsed?.map(e => e.claim).filter(Boolean) || [],
      cta: item.primaryCta ? { text: item.primaryCta } : null,
      closing: "",
      signature: campaign.senderName ? `${campaign.senderName}` : "",
    });

    const text = renderPlainText({
      greeting: item.greetingStrategy ? `Hi {{firstName}},` : "",
      bodyParagraphs: [item.emailBodyText || ""],
      bulletPoints: item.evidenceUsed?.map(e => e.claim).filter(Boolean) || [],
      cta: item.primaryCta ? { text: item.primaryCta } : null,
      closing: "",
      signature: campaign.senderName ? `${campaign.senderName}` : "",
    });

    const itemResults = [];
    for (const contact of recipients) {
      const personalizedHtml = html.replace(/\{\{firstName\}\}/g, contact.firstName || 'there').replace(/\{\{companyName\}\}/g, contact.company?.name || '');
      const personalizedText = text.replace(/\{\{firstName\}\}/g, contact.firstName || 'there').replace(/\{\{companyName\}\}/g, contact.company?.name || '');

      const idempotencyKey = `send_${campaignId}_${item.id}_${contact.id}_${Date.now()}`;

      const result = await sendEmail({
        to: contact.email,
        subject: item.subjectLine?.replace(/\{\{firstName\}\}/g, contact.firstName || 'there').replace(/\{\{companyName\}\}/g, contact.company?.name || '') || "No subject",
        html: personalizedHtml,
        text: personalizedText,
        senderName: campaign.senderName || undefined,
        tags: [`campaign:${campaignId}`, `item:${item.id}`, `contact:${contact.id}`],
        idempotencyKey,
      });

      itemResults.push({ contactId: contact.id, email: contact.email, result });
      await prisma.emailCampaignLog.create({
        data: {
          emailCampaignId: campaignId,
          emailSequenceItemId: item.id,
          action: result.success ? "sent" : "send_failed",
          status: result.success ? "submitted" : "failed",
          message: result.success ? `Email submitted to provider for ${contact.email}` : `Send failed for ${contact.email}: ${result.error?.message || "Unknown"}`,
          metadata: { contactId: contact.id, recipient: contact.email, provider: result.provider, providerMessageId: result.providerMessageId, error: result.error, idempotencyKey },
        },
      });
    }

    const allSucceeded = itemResults.every(r => r.result.success);
    results.push({ sequenceOrder: item.sequenceOrder, itemResults });
    await prisma.emailSequenceItem.update({
      where: { id: item.id },
      data: { status: allSucceeded ? "sent" : "partial" },
    });
  }

  const sentCount = results.reduce((sum, r) => sum + (r.itemResults?.filter(ir => ir.result.success).length || 0), 0);
  const totalCount = results.reduce((sum, r) => sum + (r.itemResults?.length || 0), 0);

  return { success: true, results, totalItems: results.length, totalRecipients: totalCount, sentCount, skippedContacts: skippedContacts.map(c => ({ id: c.id, email: c.email })) };
}

export async function handleBrevoWebhook(payload) {
  const { event, messageId, email, date, tag, ts } = payload || {};

  if (!messageId) {
    return { success: false, error: "Missing messageId in webhook payload" };
  }

  const eventAction = event || "unknown";
  const eventStatusMap = {
    delivered: "delivered",
    bounce: "bounced",
    blocked: "bounced",
    spam: "marked_spam",
    invalid: "invalid",
    deferred: "deferred",
    click: "clicked",
    open: "opened",
    unsubscribed: "unsubscribed",
    error: "failed",
  };
  const mappedStatus = eventStatusMap[eventAction] || eventAction;

  const allLogs = await prisma.emailCampaignLog.findMany({
    where: {
      action: { in: ["sent", "test_sent", "send_failed"] },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const logs = allLogs.filter(log => {
    const meta = log.metadata;
    return meta && typeof meta === "object" && meta.providerMessageId === messageId;
  });

  if (logs.length === 0) {
    return { success: false, error: `No EmailCampaignLog found for providerMessageId: ${messageId}`, messageId };
  }

  for (const log of logs) {
    await prisma.emailCampaignLog.create({
      data: {
        emailCampaignId: log.emailCampaignId,
        emailSequenceItemId: log.emailSequenceItemId,
        action: `provider_${mappedStatus}`,
        status: mappedStatus,
        message: `Brevo webhook: ${eventAction} for ${email || "unknown"} at ${date || new Date().toISOString()}`,
        metadata: {
          providerEvent: eventAction,
          providerMessageId: messageId,
          recipient: email,
          timestamp: date || ts || new Date().toISOString(),
          previousLogId: log.id,
        },
      },
    });
  }

  return { success: true, event: eventAction, messageId, status: mappedStatus, logsUpdated: logs.length };
}

export async function getDeliveryLogs(campaignId) {
  const logs = await prisma.emailCampaignLog.findMany({
    where: { emailCampaignId: campaignId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return logs;
}

export async function fromAssetToEmailCampaign({ chatId, userId, automationAssetId, campaignPlanId, sequenceOrder, purpose, delayAfterPreviousDays }) {
  const asset = await prisma.automationAsset.findFirst({
    where: { id: automationAssetId, automationPlan: { chatId } },
    include: { automationPlan: { select: { chatId: true, userId: true } } },
  });

  if (!asset) {
    return { success: false, error: "Asset not found" };
  }
  if (asset.automationPlan.userId !== userId) {
    return { success: false, error: "Asset does not belong to user" };
  }
  if (asset.assetType !== "email_copy") {
    return { success: false, error: "Asset type must be email_copy" };
  }

  const content = typeof asset.assetContent === "object" ? asset.assetContent : {};
  const subject = content.subject || content.subjectLine || "";
  const previewText = content.previewText || "";
  const greeting = content.greeting || "Hi there,";
  const opening = content.opening || "";
  const bodyParagraphs = Array.isArray(content.bodyParagraphs) ? content.bodyParagraphs : [];
  const bulletPoints = Array.isArray(content.bulletPoints) ? content.bulletPoints : [];
  const ctaText = content.ctaText || content.cta?.text || "";
  const ctaUrl = content.ctaUrl || content.cta?.url || "";
  const closing = content.closing || "";
  const signature = content.signature || "";
  const personalizationFields = content.personalizationFields || [];
  const evidenceUsed = content.evidenceUsed || [];
  const claimsRequiringReview = content.claimsRequiringReview || [];
  const inferenceStatus = content.inferenceStatus || "ai_generated";

  let campaignPlan;
  if (campaignPlanId) {
    campaignPlan = await prisma.campaignPlan.findFirst({
      where: { id: campaignPlanId, chatId, userId },
    });
    if (!campaignPlan) {
      return { success: false, error: "CampaignPlan not found or does not belong to user" };
    }
  }

  const productIntel = await prisma.productIntelligence.findFirst({
    where: { chatId, userId },
    select: { inputJson: true, productAnalysis: true, id: true },
  });

  const emailCampaign = await prisma.emailCampaign.create({
    data: {
      userId,
      chatId,
      campaignPlanId: campaignPlanId || null,
      name: campaignPlan?.campaignName || `${asset.assetTitle || "Email"} Campaign`,
      objective: purpose || subject || null,
      status: "DRAFT",
      approvalStatus: "NOT_SUBMITTED",
      generationStatus: "completed",
      evidenceSummary: { assetId: asset.id, assetTitle: asset.assetTitle, evidenceUsed },
    },
  });

  const fullHtml = renderEmailHtml({
    subject,
    previewText,
    greeting,
    opening,
    bodyParagraphs,
    bulletPoints,
    ctaText,
    ctaUrl,
    closing,
    signature,
  });

  const plainText = renderPlainText({
    subject,
    previewText,
    greeting,
    opening,
    bodyParagraphs,
    bulletPoints,
    ctaText,
    ctaUrl,
    closing,
    signature,
  });

  const sequenceItem = await prisma.emailSequenceItem.create({
    data: {
      emailCampaignId: emailCampaign.id,
      sequenceOrder: sequenceOrder || 1,
      emailName: asset.assetTitle || `${purpose || "Email"} ${sequenceOrder || 1}`,
      purpose: purpose || null,
      delayAfterPreviousDays: delayAfterPreviousDays ?? 0,
      subjectLine: subject || null,
      previewText: previewText || null,
      emailBodyText: plainText,
      emailBodyHtml: fullHtml,
      primaryCta: ctaText || null,
      personalizationFields: personalizationFields,
      evidenceUsed: evidenceUsed,
      inferenceStatus: inferenceStatus,
      status: "draft",
    },
  });

  await prisma.emailCampaignLog.create({
    data: {
      emailCampaignId: emailCampaign.id,
      emailSequenceItemId: sequenceItem.id,
      action: "from_asset",
      status: "created",
      message: `Email campaign created from Content Studio asset: ${asset.assetTitle || asset.id}`,
      metadata: { assetId: asset.id, contentType: "email_copy" },
    },
  });

  const version = await prisma.emailCampaignVersion.create({
    data: {
      emailCampaignId: emailCampaign.id,
      versionNumber: 1,
      snapshot: { campaign: emailCampaign, items: [sequenceItem] },
      changeReason: "Created from Content Studio asset",
      createdBy: userId,
    },
  });

  return {
    success: true,
    data: { campaign: emailCampaign, items: [sequenceItem], version },
  };
}
