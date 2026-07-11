/**
 * Content Studio Asset Library
 * Persists generated assets with version history.
 * Never overwrites — creates new version on regenerate.
 * Content and metadata are stored separately.
 */

export async function saveContentAsset(prisma, { userId, chatId, contentType, briefSnapshot, evidenceSnapshot, provider, content, metadata, qualityScore }) {
  if (!userId || !chatId || !contentType || !content) {
    throw new Error('userId, chatId, contentType, and content required');
  }

  const claimStatus = metadata?.claimStatus || 'passed';

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

  const asset = await prisma.automationAsset.create({
    data: {
      automationPlanId: plan.id,
      assetType: `content_${contentType}`,
      assetTitle: content.title || content.headline || content.subjectLine || `${contentType} v${version}`,
      assetContent: {
        content,
        metadata: {
          ...metadata,
          claimStatus,
          qualityScore: qualityScore?.overall || null,
          qualityChecks: qualityScore?.checks || null,
        },
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

  const newAsset = await prisma.automationAsset.create({
    data: {
      automationPlanId: existing.automationPlanId,
      assetType: existing.assetType,
      assetTitle: existing.assetTitle,
      assetContent: {
        content: newContent,
        metadata: newMetadata,
        version,
        prevVersionId: existing.id,
        regeneratedFrom: existing.id,
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
      metadata: { prevVersionId: existing.id, version },
    },
  });

  return newAsset;
}

export default { saveContentAsset, getContentAssets, getAssetVersions, regenerateAsset };
