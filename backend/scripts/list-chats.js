import { prisma } from '../src/config/prisma.js';

async function listChats() {
  console.log('=== ALL CHATS ===');
  
  try {
    const chats = await prisma.chat.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        productIntelligence: { select: { id: true, status: true } },
        competitorIntelligence: { select: { id: true } },
        campaignIntelligence: { select: { id: true } },
        seoIntelligence: { select: { id: true, seoScore: true } },
      }
    });

    console.log('Total chats:', chats.length);
    console.log('');

    chats.forEach(chat => {
      console.log('Chat ID:', chat.id);
      console.log('Title:', chat.title);
      console.log('ProductIntelligence:', chat.productIntelligence ? `ID: ${chat.productIntelligence.id}, Status: ${chat.productIntelligence.status}` : 'None');
      console.log('CompetitorIntelligence:', chat.competitorIntelligence ? `ID: ${chat.competitorIntelligence.id}` : 'None');
      console.log('CampaignIntelligence:', chat.campaignIntelligence ? `ID: ${chat.campaignIntelligence.id}` : 'None');
      console.log('SEOIntelligence:', chat.seoIntelligence ? `ID: ${chat.seoIntelligence.id}, Score: ${chat.seoIntelligence.seoScore}` : 'None');
      console.log('Updated:', chat.updatedAt);
      console.log('---');
    });

  } catch (error) {
    console.error('Error listing chats:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listChats();
