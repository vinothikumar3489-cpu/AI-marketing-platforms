import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tables = [
    'CampaignPlan',
    'AutomationPlan',
    'SeoIntelligence',
    'ExecutiveSeoDashboard',
    'TechnicalSeoAudit',
    'SeoScoreBreakdown',
    'KeywordIntelligenceRecord',
    'GeoIntelligenceRecord',
    'CompetitorSeoRecord',
    'ContentGapRecord',
    'BlogIntelligenceRecord',
    'ProductIntelligence',
    'CompetitorIntelligence',
    'CampaignIntelligence',
    'EvidenceSnapshot',
    'AutomationAsset',
    'Chat',
  ];

  for (const table of tables) {
    try {
      const cols = await prisma.$queryRawUnsafe(
        `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_name = $1
         ORDER BY ordinal_position`,
        table
      );
      console.log(`\n=== ${table} (${cols.length} columns) ===`);
      for (const c of cols) {
        const nullable = c.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const def = c.column_default ? ` DEFAULT ${c.column_default}` : '';
        console.log(`  ${c.column_name} ${c.data_type} ${nullable}${def}`);
      }
    } catch (e) {
      console.log(`\n=== ${table} === TABLE NOT FOUND`);
    }
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
