import prisma from '../src/config/prisma.js';

const CHAT_ID = 'cmrl0zm7r0001q7hueyow01di'; // Grammarly chat with Growth data

async function inspectGrowthRecords() {
  console.log('=== GROWTH RECORDS INSPECTION ===');
  console.log('Chat ID:', CHAT_ID);
  console.log('');

  try {
    const productIntelligence = await prisma.productIntelligence.findUnique({ where: { chatId: CHAT_ID } });
    const competitorIntelligence = await prisma.competitorIntelligence.findUnique({ where: { chatId: CHAT_ID } });
    const campaignIntelligence = await prisma.campaignIntelligence.findUnique({ where: { chatId: CHAT_ID } });

    console.log('=== PRODUCT INTELLIGENCE ===');
    console.log('Record exists:', !!productIntelligence);
    if (productIntelligence) {
      const productAnalysis = productIntelligence.productAnalysis || {};
      const audienceIntelligence = productIntelligence.audienceIntelligence || {};
      const marketDiscovery = productIntelligence.marketDiscovery || {};
      
      console.log('Product Analysis keys:', Object.keys(productAnalysis));
      console.log('Audience Intelligence keys:', Object.keys(audienceIntelligence));
      console.log('Market Discovery keys:', Object.keys(marketDiscovery));
      
      const personas = audienceIntelligence.personas || audienceIntelligence.buyerPersonas || [];
      console.log('Personas count:', personas.length);
      
      const productDNA = productAnalysis.productDNA || productAnalysis.dna || {};
      console.log('Product DNA keys:', Object.keys(productDNA));
    }
    console.log('');

    console.log('=== COMPETITOR INTELLIGENCE ===');
    console.log('Record exists:', !!competitorIntelligence);
    if (competitorIntelligence) {
      const competitorAnalysis = competitorIntelligence.competitorAnalysis || {};
      const positioningEngine = competitorIntelligence.positioningEngine || {};
      const intentPrediction = competitorIntelligence.intentPrediction || {};
      
      console.log('Competitor Analysis keys:', Object.keys(competitorAnalysis));
      console.log('Positioning Engine keys:', Object.keys(positioningEngine));
      console.log('Intent Prediction keys:', Object.keys(intentPrediction));
      
      const competitors = competitorAnalysis.competitors || competitorAnalysis.validatedCompetitors || competitorAnalysis.directCompetitors || [];
      console.log('Competitors count:', competitors.length);
    }
    console.log('');

    console.log('=== CAMPAIGN INTELLIGENCE ===');
    console.log('Record exists:', !!campaignIntelligence);
    if (campaignIntelligence) {
      const campaignGenerator = campaignIntelligence.campaignGenerator || {};
      const channelRecommendation = campaignIntelligence.channelRecommendation || {};
      const executiveStory = campaignIntelligence.executiveStory || {};
      
      console.log('Campaign Generator keys:', Object.keys(campaignGenerator));
      console.log('Channel Recommendation keys:', Object.keys(channelRecommendation));
      console.log('Executive Story keys:', Object.keys(executiveStory));
      
      const channels = channelRecommendation.channels || channelRecommendation.recommendedChannels || [];
      console.log('Channels count:', channels.length);
      
      const objectives = campaignGenerator.objectives || campaignGenerator.campaignObjectives || [];
      console.log('Objectives count:', objectives.length);
    }
    console.log('');

    console.log('=== SUMMARY ===');
    console.log('ProductIntelligence exists:', !!productIntelligence);
    console.log('CompetitorIntelligence exists:', !!competitorIntelligence);
    console.log('CampaignIntelligence exists:', !!campaignIntelligence);

  } catch (error) {
    console.error('Error inspecting records:', error);
  } finally {
    await prisma.$disconnect();
  }
}

inspectGrowthRecords();
