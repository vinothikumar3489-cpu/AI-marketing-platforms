import prisma from '../src/config/prisma.js';
import { buildGrowthFrontendPayload } from '../src/services/growth/growth-frontend-payload.service.js';

const CHAT_ID = 'cmrl0zm7r0001q7hueyow01di'; // Grammarly chat with Growth data

async function testGrowthAPI() {
  console.log('=== GROWTH API TEST ===');
  console.log('Chat ID:', CHAT_ID);
  console.log('');

  try {
    const chat = await prisma.chat.findUnique({ where: { id: CHAT_ID } });
    const productIntelligence = await prisma.productIntelligence.findUnique({ where: { chatId: CHAT_ID } });
    const competitorIntelligence = await prisma.competitorIntelligence.findUnique({ where: { chatId: CHAT_ID } });
    const campaignIntelligence = await prisma.campaignIntelligence.findUnique({ where: { chatId: CHAT_ID } });

    console.log('=== DATABASE RECORDS ===');
    console.log('Chat exists:', !!chat);
    console.log('ProductIntelligence exists:', !!productIntelligence);
    console.log('CompetitorIntelligence exists:', !!competitorIntelligence);
    console.log('CampaignIntelligence exists:', !!campaignIntelligence);
    console.log('');

    const growthWorkspace = buildGrowthFrontendPayload({
      chat,
      productIntelligence,
      competitorIntelligence,
      campaignIntelligence,
      website: { url: chat?.websiteUrl }
    });

    console.log('=== CANONICAL GROWTH PAYLOAD ===');
    console.log('Status:', growthWorkspace.status);
    console.log('Product Identity:', JSON.stringify(growthWorkspace.productIdentity, null, 2));
    console.log('');

    console.log('=== DATA COMPLETENESS ===');
    console.log(JSON.stringify(growthWorkspace.dataCompleteness, null, 2));
    console.log('');

    console.log('=== SCORE SUMMARY ===');
    console.log(JSON.stringify(growthWorkspace.scoreSummary, null, 2));
    console.log('');

    console.log('=== AUDIENCE INTELLIGENCE ===');
    console.log('Personas count:', growthWorkspace.audienceIntelligence?.personas?.length || 0);
    console.log('Pain points count:', growthWorkspace.audienceIntelligence?.painPoints?.length || 0);
    console.log('Target users count:', growthWorkspace.audienceIntelligence?.targetUsers?.length || 0);
    console.log('');

    console.log('=== COMPETITOR INTELLIGENCE ===');
    console.log('Competitors count:', growthWorkspace.competitorIntelligence?.competitors?.length || 0);
    console.log('Market gaps count:', growthWorkspace.competitorIntelligence?.marketGaps?.length || 0);
    console.log('');

    console.log('=== CAMPAIGN STRATEGY ===');
    console.log('Objectives count:', growthWorkspace.campaignStrategy?.objectives?.length || 0);
    console.log('Channels count:', growthWorkspace.campaignStrategy?.channels?.length || 0);
    console.log('');

    console.log('=== MARKET INTELLIGENCE ===');
    console.log('TAM:', growthWorkspace.marketIntelligence?.tam || 'N/A');
    console.log('SAM:', growthWorkspace.marketIntelligence?.sam || 'N/A');
    console.log('SOM:', growthWorkspace.marketIntelligence?.som || 'N/A');
    console.log('Industry:', growthWorkspace.marketIntelligence?.industry || 'N/A');
    console.log('');

    console.log('=== PRODUCT DNA ===');
    console.log('Features count:', growthWorkspace.productDNA?.features?.length || 0);
    console.log('Benefits count:', growthWorkspace.productDNA?.benefits?.length || 0);
    console.log('Category:', growthWorkspace.productDNA?.category || 'N/A');
    console.log('');

    console.log('=== TEST SUMMARY ===');
    console.log('✅ Canonical payload built successfully');
    console.log('✅ Product identity resolved:', !!growthWorkspace.productIdentity);
    console.log('✅ Score summary:', !!growthWorkspace.scoreSummary);
    console.log('✅ Data completeness:', !!growthWorkspace.dataCompleteness);
    console.log('Audience data:', growthWorkspace.audienceIntelligence?.personas?.length > 0 ? 'YES' : 'NO');
    console.log('Competitor data:', growthWorkspace.competitorIntelligence?.competitors?.length > 0 ? 'YES' : 'NO');
    console.log('Campaign data:', growthWorkspace.campaignStrategy?.objectives?.length > 0 ? 'YES' : 'NO');

  } catch (error) {
    console.error('Error testing Growth API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testGrowthAPI();
