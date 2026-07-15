import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const chats = await prisma.chat.findMany({ take: 5, select: { id: true, title: true, userId: true } });
  console.log('=== Chats ===');
  for (const c of chats) {
    console.log(c.id, '|', c.title, '|', c.userId);
    const seo = await prisma.seoIntelligence.findFirst({ where: { chatId: c.id } });
    console.log('  seoIntel:', seo ? seo.id : 'NONE');
  }
  const chatCount = await prisma.chat.count();
  const seoCount = await prisma.seoIntelligence.count();
  console.log('\nTotal chats:', chatCount, '| Total seoIntelligence:', seoCount);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
