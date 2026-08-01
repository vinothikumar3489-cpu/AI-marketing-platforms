import { BaseEngine } from '../engine.js';
import { EngineStatus, elapsedMs, logEngine } from '../core.js';

const CONFIDENCE_THRESHOLD = 0.7;

export class MemoryEngine extends BaseEngine {
  constructor() {
    super('MemoryEngine');
    this._cache = new Map();
    this._prisma = null;
  }

  setPrisma(prisma) {
    this._prisma = prisma;
  }

  async execute(context) {
    const rid = context?.requestId || 'NO_RID';
    const start = Date.now();
    logEngine(this._name, rid, 0, EngineStatus.RUNNING);

    try {
      const chatId = context?.request?.chatId || context?.chat?.id;
      const userId = context?.request?.userId || context?.user?.id;

      const memoryResult = {
        hits: 0,
        misses: 0,
        sections: {},
        cachedAt: null,
      };

      if (chatId && this._prisma) {
        await this._loadFromDatabase(chatId, userId, memoryResult, context, rid);
      }

      memoryResult.cachedAt = new Date().toISOString();
      context.memory = memoryResult;

      logEngine(this._name, rid, elapsedMs(start), EngineStatus.COMPLETED, `hits=${memoryResult.hits} misses=${memoryResult.misses}`);
      return { success: true, data: memoryResult };
    } catch (err) {
      logEngine(this._name, rid, elapsedMs(start), EngineStatus.FAILED, err.message);
      context.memory = { ...(context.memory || { hits: 0, misses: 0, sections: {} }), error: err.message };
      return { success: false, error: err.message };
    }
  }

  async _loadFromDatabase(chatId, userId, memoryResult, context, rid) {
    const p = this._prisma;

    // Scope every memory query to the requesting user when known, so one
    // user's context can never bleed into another's brain state.
    const userScope = userId ? { userId } : {};

    const [productIntel, competitorIntel, seoIntel, evidenceSnapshots, productProfile] = await Promise.all([
      p.productIntelligence.findFirst({ where: { chatId, ...userScope } }).catch(() => null),
      p.competitorIntelligence.findFirst({ where: { chatId, ...userScope } }).catch(() => null),
      p.seoIntelligence.findFirst({ where: { chatId, ...userScope } }).catch(() => null),
      p.evidenceSnapshot.findMany({ where: { chatId, ...userScope }, orderBy: { createdAt: 'desc' }, take: 1 }).catch(() => []),
      p.productProfile.findFirst({ where: { chatId, ...userScope } }).catch(() => null),
    ]);

    if (productIntel) {
      memoryResult.sections.product = {
        exists: true,
        data: productIntel.productAnalysis || productIntel.marketDiscovery || null,
        audience: productIntel.audienceIntelligence || null,
        provider: productIntel.provider,
        updatedAt: productIntel.updatedAt,
        confidence: productIntel.productAnalysis ? 0.85 : 0.3,
        source: 'productIntelligence',
      };
      memoryResult.hits++;
    } else {
      memoryResult.misses++;
    }

    if (competitorIntel) {
      memoryResult.sections.competitor = {
        exists: true,
        data: competitorIntel.competitorAnalysis || null,
        provider: competitorIntel.provider,
        updatedAt: competitorIntel.updatedAt,
        confidence: competitorIntel.competitorAnalysis ? 0.85 : 0.3,
        source: 'competitorIntelligence',
      };
      memoryResult.hits++;
    } else {
      memoryResult.misses++;
    }

    if (seoIntel) {
      memoryResult.sections.seo = {
        exists: true,
        websiteUrl: seoIntel.websiteUrl,
        seoScore: seoIntel.seoScore,
        keywordData: seoIntel.keywordOpportunities || seoIntel.keywordIntelligence || null,
        competitorSeo: seoIntel.competitorKeywords || seoIntel.competitorSeoRecord || null,
        technicalAudit: seoIntel.technicalAudit || seoIntel.technicalAuditDetail || null,
        provider: seoIntel.providers,
        updatedAt: seoIntel.updatedAt,
        confidence: seoIntel.seoScore ? 0.8 : 0.3,
        source: 'seoIntelligence',
      };
      memoryResult.hits++;
    } else {
      memoryResult.misses++;
    }

    if (evidenceSnapshots.length > 0) {
      const snap = evidenceSnapshots[0];
      memoryResult.sections.evidence = {
        exists: true,
        websiteUrl: snap.websiteUrl,
        sourcesCollected: snap.sourceSummary?.sourcesCollected || [],
        missingSources: snap.sourceSummary?.missingSources || [],
        updatedAt: snap.updatedAt,
        confidence: (snap.sourceSummary?.sourcesCollected?.length || 0) > 3 ? 0.8 : 0.4,
        source: 'evidenceSnapshot',
      };
      memoryResult.hits++;
    } else {
      memoryResult.misses++;
    }

    if (productProfile) {
      memoryResult.sections.profile = {
        exists: true,
        companyName: productProfile.companyName,
        websiteUrl: productProfile.websiteUrl,
        industry: productProfile.industry,
        productName: productProfile.productName,
        updatedAt: productProfile.updatedAt,
        confidence: productProfile.companyName ? 0.9 : 0.3,
        source: 'productProfile',
      };
      memoryResult.hits++;
    } else {
      memoryResult.misses++;
    }

    Object.entries(memoryResult.sections).forEach(([key, section]) => {
      if (section && section.confidence < CONFIDENCE_THRESHOLD) {
        section.needsRefresh = true;
      }
    });
  }

  async _getCached(key) {
    return this._cache.get(key) || null;
  }

  async store(key, value) {
    this._cache.set(key, value);
    return { success: true };
  }
}
