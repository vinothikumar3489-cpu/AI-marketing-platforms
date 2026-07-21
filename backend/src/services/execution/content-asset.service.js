/**
 * Content Studio Asset Library
 * Persists generated assets with version history.
 * Never overwrites — creates new version on regenerate.
 * Content and metadata are stored separately.
 * Stores full generation metadata: prompt, model, evidence, SEO score, timestamps.
 */

export async function saveContentAsset(prisma, { userId, chatId, contentType, briefSnapshot, evidenceSnapshot, provider, content, metadata, qualityScore }) {
  if (!userId || !chatId || !contentType || !content) {
    throw new Error('userId, chatId, contentType, and content required');
  }

  const claimStatus = metadata?.claimStatus || 'passed';

  // PART 9: Email asset persistence verification
  if (contentType === 'email_copy') {
    const requiredFields = ['subject', 'previewText', 'greeting', 'opening', 'solution', 'benefits', 'cta'];
    const missingFields = requiredFields.filter(field => !content[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Email asset missing required fields: ${missingFields.join(', ')}`);
    }

    // Verify benefits is an array with at least 3 items
    if (!Array.isArray(content.benefits) || content.benefits.length < 3) {
      throw new Error('Email asset must have at least 3 benefits');
    }

    // Verify CTA has label
    if (!content.cta || !content.cta.label) {
      throw new Error('Email asset must have CTA with label');
    }
  }

  // Find existing plan or create one
  let plan = await prisma.automationPlan.findFirst({ where: { chatId, userId } });
  if (!plan) {
    plan = await prisma.automationPlan.create({
      data: {
        userId,
        chatId,
        campaignName: `Content Studio — ${chatId}`,
        status: 'draft',
      },
    });
  }

  // Create asset with version tracking
  const existing = await prisma.automationAsset.findFirst({
    where: { automationPlanId: plan.id, assetType: `content_${contentType}` },
    orderBy: { createdAt: 'desc' },
  });

  const version = existing ? (existing.assetContent?.version || 0) + 1 : 1;

  // Extract SEO keywords from evidence snapshot for storage
  const seoKeywords = evidenceSnapshot?.keywords || evidenceSnapshot?.verifiedKeywords || [];
  const seoScore = qualityScore?.checks?.seoAlignment?.detail || null;

  // Extract brief summary for quick reference
  const briefSummary = briefSnapshot ? {
    productName: briefSnapshot.product?.name || briefSnapshot.company?.productName,
    brandName: briefSnapshot.product?.brandName || briefSnapshot.company?.brandName,
    industry: briefSnapshot.company?.industry,
    targetPersona: briefSnapshot.targetPersonas?.[0]?.name || briefSnapshot.targetPersonas?.[0]?.role,
    usp: briefSnapshot.product?.usp,
    featuresCount: briefSnapshot.product?.features?.length || 0,
    benefitsCount: briefSnapshot.product?.benefits?.length || 0,
    competitorCount: briefSnapshot.competitors?.length || 0,
  } : null;

  // Extract evidence summary for quick reference
  const evidenceSummary = evidenceSnapshot ? {
    sourcesCount: evidenceSnapshot.evidenceSources ? Object.values(evidenceSnapshot.evidenceSources).filter(Boolean).length : 0,
    personaCount: evidenceSnapshot.personas?.length || 0,
    painPointsCount: evidenceSnapshot.painPoints?.length || 0,
    featureCount: evidenceSnapshot.features?.length || 0,
    competitorCount: evidenceSnapshot.competitors?.length || 0,
    topicCount: evidenceSnapshot.topicIdeas?.length || 0,
  } : null;

  // PART 9: Title priority for email_copy (subject first, then fallback)
  let assetTitle;
  if (contentType === 'email_copy') {
    assetTitle = content.subject || content.title || content.headline || `Email Copy v${version}`;
  } else {
    assetTitle = content.title || content.headline || content.subjectLine || `${contentType} v${version}`;
  }

  const asset = await prisma.automationAsset.create({
    data: {
      automationPlanId: plan.id,
      assetType: `content_${contentType}`,
      assetTitle,
      assetContent: {
        content,
        metadata: {
          ...metadata,
          claimStatus,
          qualityScore: qualityScore?.overall || null,
          qualityChecks: qualityScore?.checks || null,
        },
        generationMetadata: {
          provider: provider || 'unknown',
          model: metadata?.model || null,
          generatedAt: new Date().toISOString(),
          prompt: metadata?.prompt || null,
          tokensUsed: metadata?.tokensUsed || null,
        },
        briefSnapshot: briefSummary,
        evidenceSnapshot: evidenceSummary,
        seoKeywords: seoKeywords.slice(0, 10).map(k => typeof k === 'string' ? k : k.keyword),
        seoScore,
        version,
        prevVersionId: existing?.id || null,
      },
      channel: 'content',
      status: 'draft',
    },
  });

  // Log
  await prisma.automationLog.create({
    data: {
      userId,
      chatId,
      assetId: asset.id,
      action: version > 1 ? 'regenerated' : 'generated',
      message: `${contentType} v${version} generated`,
      metadata: {
        contentType,
        version,
        claimStatus,
        qualityScore: qualityScore?.overall || null,
        provider: provider || 'unknown',
        model: metadata?.model || null,
      },
    },
  });

  return asset;
}

export async function getContentAssets(prisma, userId, chatId, contentType) {
  const plan = await prisma.automationPlan.findFirst({ where: { chatId, userId } });
  if (!plan) return [];

  const where = { automationPlanId: plan.id };
  if (contentType) where.assetType = `content_${contentType}`;

  const assets = await prisma.automationAsset.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return assets;
}

export async function getAssetVersions(prisma, assetId) {
  const asset = await prisma.automationAsset.findUnique({ where: { id: assetId } });
  if (!asset) return [];

  const allVersions = await prisma.automationAsset.findMany({
    where: {
      automationPlanId: asset.automationPlanId,
      assetType: asset.assetType,
    },
    orderBy: { createdAt: 'desc' },
  });

  return allVersions;
}

export async function regenerateAsset(prisma, assetId, newResult) {
  const existing = await prisma.automationAsset.findUnique({
    where: { id: assetId },
    include: { automationPlan: true },
  });

  if (!existing) throw new Error('Asset not found');

  const version = (existing.assetContent?.version || 0) + 1;

  const newContent = newResult.content || newResult;
  const newMetadata = newResult.metadata || {};

  // Preserve generation metadata from previous version, update provider/model
  const prevGenMetadata = existing.assetContent?.generationMetadata || {};
  const newGenMetadata = {
    ...prevGenMetadata,
    provider: newMetadata.provider || prevGenMetadata.provider || 'unknown',
    model: newMetadata.model || prevGenMetadata.model,
    generatedAt: new Date().toISOString(),
    prompt: newMetadata.prompt || prevGenMetadata.prompt,
    tokensUsed: newMetadata.tokensUsed || prevGenMetadata.tokensUsed,
    regeneratedFrom: existing.id,
  };

  const newAsset = await prisma.automationAsset.create({
    data: {
      automationPlanId: existing.automationPlanId,
      assetType: existing.assetType,
      assetTitle: existing.assetTitle,
      assetContent: {
        content: newContent,
        metadata: {
          ...newMetadata,
          qualityScore: newResult.qualityScore?.overall || null,
          qualityChecks: newResult.qualityScore?.checks || null,
        },
        generationMetadata: newGenMetadata,
        briefSnapshot: existing.assetContent?.briefSnapshot || null,
        evidenceSnapshot: existing.assetContent?.evidenceSnapshot || null,
        seoKeywords: existing.assetContent?.seoKeywords || [],
        seoScore: existing.assetContent?.seoScore || null,
        version,
        prevVersionId: existing.id,
      },
      channel: existing.channel,
      status: 'draft',
    },
  });

  await prisma.automationLog.create({
    data: {
      userId: existing.automationPlan.userId,
      chatId: existing.automationPlan.chatId,
      assetId: newAsset.id,
      action: 'regenerated',
      message: `${existing.assetType} regenerated to v${version}`,
      metadata: {
        prevVersionId: existing.id,
        version,
        provider: newGenMetadata.provider,
        model: newGenMetadata.model,
      },
    },
  });

  return newAsset;
}

export async function verifyAssetPersistence(prisma, assetId) {
  const asset = await prisma.automationAsset.findUnique({ where: { id: assetId } });
  if (!asset) return { verified: false, error: 'Asset not found' };

  const content = asset.assetContent?.content;
  const checks = {
    id: !!asset.id,
    assetType: !!asset.assetType,
    assetTitle: !!asset.assetTitle,
    contentPresent: !!content,
    htmlPresent: !!(content?._htmlTemplate || content?.html),
    plainTextPresent: !!(content?._plainText || content?.plainText),
    subjectPresent: !!(content?.subject || content?.subjectLine),
    approvalStatus: !!(content?._approvalStatus || asset.status),
    versionPresent: !!(content?._version || asset.assetContent?.version),
    identityPresent: !!(content?.productName || content?.brandName || asset.assetTitle),
    generationMetadata: !!asset.assetContent?.generationMetadata,
    briefSnapshot: !!asset.assetContent?.briefSnapshot,
    evidenceSnapshot: !!asset.assetContent?.evidenceSnapshot,
  };

  const missing = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
  const verified = missing.length === 0;

  if (asset.assetContent?.generationMetadata?.provider === 'brevo') {
    checks.brevoCampaignId = !!(content?._brevoCampaignId || content?.providerCampaignId);
  }

  return {
    verified,
    assetId: asset.id,
    assetType: asset.assetType,
    version: asset.assetContent?.version || 1,
    checks,
    missingFields: missing,
    errors: verified ? [] : [`Missing fields: ${missing.join(', ')}`],
  };
}

export async function verifyBrevoOperationPersistence(prisma, assetId, operation) {
  const asset = await prisma.automationAsset.findUnique({ where: { id: assetId } });
  if (!asset) return { verified: false, error: 'Asset not found' };

  const content = asset.assetContent?.content || {};
  const campaignId = content._brevoCampaignId || content.providerCampaignId;
  const requestStatus = content._brevoRequestStatus || content.providerStatus;

  const checks = {
    providerCampaignId: !!campaignId,
    requestStatus: !!requestStatus,
    operation,
    timestamp: !!(content._brevoTimestamp || content.providerTimestamp),
    userSafe: !requestStatus?.includes('error') && !requestStatus?.includes('fail'),
  };

  const missing = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
  return {
    verified: missing.length === 0,
    assetId: asset.id,
    operation,
    campaignId,
    requestStatus,
    checks,
    missingFields: missing,
  };
}

export default { saveContentAsset, getContentAssets, getAssetVersions, regenerateAsset, verifyAssetPersistence, verifyBrevoOperationPersistence };
