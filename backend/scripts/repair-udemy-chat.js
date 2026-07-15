/**
 * Chat Repair Script for Udemy (chatId: cmrm7jpew000wuupwi26rd54f)
 *
 * Fixes:
 * - Chat title/identity → "Udemy"
 * - Invalid assets (Unknown Product, key feature, etc.)
 * - Growth workspace report identity
 *
 * Usage: node scripts/repair-udemy-chat.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CHAT_ID = 'cmrm7jpew000wuupwi26rd54f';
const CANONICAL = {
  title: 'Udemy',
  productName: 'Udemy',
  websiteUrl: 'https://www.udemy.com/',
};

async function main() {
  console.log('=== Repairing Udemy Chat ===\n');

  // 1. Fix chat record
  const chat = await prisma.chat.update({
    where: { id: CHAT_ID },
    data: {
      title: CANONICAL.title,
      productName: CANONICAL.productName,
      websiteUrl: CANONICAL.websiteUrl,
    },
  });
  console.log(`✓ Chat updated: title="${chat.title}", productName="${chat.productName}"`);

  // 2. Fix ProductIntelligence if exists
  const pi = await prisma.productIntelligence.findFirst({ where: { chatId: CHAT_ID } });
  if (pi) {
    const inputJson = (pi.inputJson || {});
    inputJson.productName = 'Udemy';
    inputJson.companyName = 'Udemy';
    inputJson.brandName = 'Udemy';
    inputJson.websiteUrl = 'https://www.udemy.com/';
    await prisma.productIntelligence.update({
      where: { id: pi.id },
      data: {
        inputJson,
        productAnalysis: {
          ...(pi.productAnalysis || {}),
          productName: 'Udemy',
          companyName: 'Udemy',
          brandName: 'Udemy',
        },
      },
    });
    console.log('✓ ProductIntelligence updated');
  }

  // 3. Fix CompetitionIntelligence
  const ci = await prisma.competitorIntelligence.findFirst({ where: { chatId: CHAT_ID } });
  if (ci) {
    const inputJson = (ci.inputJson || {});
    inputJson.productName = 'Udemy';
    inputJson.companyName = 'Udemy';
    await prisma.competitorIntelligence.update({
      where: { id: ci.id },
      data: { inputJson },
    });
    console.log('✓ CompetitorIntelligence updated');
  }

  // 4. Fix CampaignIntelligence (growth workspace report)
  const cam = await prisma.campaignIntelligence.findFirst({ where: { chatId: CHAT_ID } });
  if (cam) {
    const inputJson = (cam.inputJson || {});
    inputJson.productName = 'Udemy';
    inputJson.companyName = 'Udemy';
    inputJson.websiteUrl = 'https://www.udemy.com/';

    // Fix the campaign generator growth summary
    const generator = (cam.campaignGenerator || {});
    if (generator.growthSummary) {
      generator.growthSummary.companyName = 'Udemy';
      generator.growthSummary.productName = 'Udemy';
    }
    if (generator.metadata?.growthSummary) {
      generator.metadata.growthSummary.companyName = 'Udemy';
      generator.metadata.growthSummary.productName = 'Udemy';
    }

    await prisma.campaignIntelligence.update({
      where: { id: cam.id },
      data: { inputJson, campaignGenerator: generator },
    });
    console.log('✓ CampaignIntelligence updated');
  }

  // 5. Fix SEO Intelligence
  const seo = await prisma.seoIntelligence.findFirst({ where: { chatId: CHAT_ID } });
  if (seo) {
    const inputJson = (seo.inputJson || {});
    inputJson.productName = 'Udemy';
    inputJson.companyName = 'Udemy';
    await prisma.seoIntelligence.update({
      where: { id: seo.id },
      data: { inputJson },
    });
    console.log('✓ SeoIntelligence updated');
  }

  // 6. Clean automation assets with invalid identities
  const deletedAssets = await prisma.automationAsset.deleteMany({
    where: {
      automationPlan: { chatId: CHAT_ID },
      OR: [
        { assetTitle: { contains: 'Unknown Product', mode: 'insensitive' } },
        { assetTitle: { contains: 'New Analysis', mode: 'insensitive' } },
        { assetTitle: { contains: 'New & Featured', mode: 'insensitive' } },
        { assetTitle: { contains: 'key feature', mode: 'insensitive' } },
        { assetTitle: { contains: 'ratings', mode: 'insensitive' } },
        { assetTitle: { contains: 'original', mode: 'insensitive' } },
        { assetTitle: { contains: 'cookies', mode: 'insensitive' } },
      ],
    },
  });
  console.log(`✓ Deleted ${deletedAssets.count} invalid automation assets`);

  // 7. Clean campaign plans with invalid identities
  const deletedPlans = await prisma.campaignPlan.deleteMany({
    where: {
      chatId: CHAT_ID,
      OR: [
        { name: { contains: 'Unknown Product', mode: 'insensitive' } },
        { name: { contains: 'New Analysis', mode: 'insensitive' } },
        { name: { contains: 'New & Featured', mode: 'insensitive' } },
      ],
    },
  });
  console.log(`✓ Deleted ${deletedPlans.count} invalid campaign plans`);

  console.log('\n=== Repair Complete ===');
}

main()
  .catch(e => { console.error('Repair failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
