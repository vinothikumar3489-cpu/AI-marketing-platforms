import { BaseEngine } from '../engine.js';
import { EngineStatus, elapsedMs, logEngine } from '../core.js';

let _collectCompanyIntelligence = null;

export class EvidenceEngine extends BaseEngine {
  constructor() {
    super('EvidenceEngine');
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
      const memory = context?.memory?.sections || {};
      const knowledge = context?.knowledge || {};
      const request = context?.request || {};

      const sources = [];
      const gaps = [];

      const needsRefresh = Object.values(memory).some(s => s?.needsRefresh);

      const [companyEvidence, productEvidence, competitorEvidence, seoEvidence, profileEvidence] = await Promise.all([
        this._gatherCompanyEvidence(request, memory, sources),
        this._gatherProductEvidence(request, memory, sources),
        this._gatherCompetitorEvidence(request, memory, sources),
        this._gatherSeoEvidence(request, memory, sources, gaps),
        this._gatherProfileEvidence(request, memory, sources),
      ]);

      sources.forEach(s => {
        s.requestId = rid;
        s.timestamp = new Date().toISOString();
      });

      const evidenceResult = {
        company: companyEvidence,
        product: productEvidence,
        competitor: competitorEvidence,
        seo: seoEvidence,
        profile: profileEvidence,
        sources,
        gaps,
        totalSources: sources.length,
        totalGaps: gaps.length,
        needsRefresh,
        summary: `Collected ${sources.length} evidence sources, ${gaps.length} gaps identified`,
      };

      context.evidence = evidenceResult;

      logEngine(this._name, rid, elapsedMs(start), EngineStatus.COMPLETED, `sources=${sources.length} gaps=${gaps.length}`);
      return { success: true, data: evidenceResult };
    } catch (err) {
      logEngine(this._name, rid, elapsedMs(start), EngineStatus.FAILED, err.message);
      context.evidence = { sources: [], gaps: [], error: err.message };
      return { success: false, error: err.message };
    }
  }

  async _gatherCompanyEvidence(request, memory, sources) {
    const mem = memory?.competitor?.data || memory?.profile?.data;
    if (mem) {
      sources.push({
        type: 'company',
        subType: 'memory',
        value: mem.companyName || mem.name || request?.companyName || 'Unknown',
        freshness: mem.updatedAt || null,
        sourceTable: memory?.profile?.source || 'memory',
      });

      const ws = request?.website || memory?.profile?.data?.websiteUrl || '';
      if (ws && typeof _collectCompanyIntelligence === 'function') {
        try {
          const ci = await _collectCompanyIntelligence({
            websiteUrl: ws,
            productName: request?.productName || '',
            companyName: request?.companyName || '',
            industry: request?.industry || '',
            scrapedData: {},
          });
          sources.push({ type: 'company', subType: 'live_service', value: ci.name || 'Unknown', sourceTable: 'companyIntelligence' });
          return ci;
        } catch (e) {
          sources.push({ type: 'company', subType: 'service_error', value: e.message, sourceTable: 'companyIntelligence' });
        }
      }
    }
    return { name: request?.companyName || 'Unknown', source: 'request' };
  }

  async _gatherProductEvidence(request, memory, sources) {
    const mem = memory?.product?.data;
    if (mem) {
      sources.push({
        type: 'product',
        subType: 'memory',
        value: request?.productName || mem.productName || 'Unknown',
        freshness: memory?.product?.updatedAt || null,
        confidence: memory?.product?.confidence || 0.5,
        sourceTable: 'productIntelligence',
      });
      return {
        name: request?.productName || mem.productName || 'Unknown',
        hasAnalysis: !!mem,
        audience: memory?.product?.audience || null,
        source: 'memory',
      };
    }

    sources.push({
      type: 'product',
      subType: 'request_only',
      value: request?.productName || 'Unknown',
      sourceTable: 'request',
    });

    return { name: request?.productName || 'Unknown', hasAnalysis: false, source: 'request' };
  }

  async _gatherCompetitorEvidence(request, memory, sources) {
    const mem = memory?.competitor?.data;
    const seoMem = memory?.seo?.competitorSeo;

    const collected = { competitors: [], memory: !!mem, seoMemory: !!seoMem };

    if (mem) {
      sources.push({
        type: 'competitor',
        subType: 'competitorIntelligence',
        count: Array.isArray(mem.competitors) ? mem.competitors.length : 0,
        freshness: memory?.competitor?.updatedAt || null,
        sourceTable: 'competitorIntelligence',
      });
      collected.competitors = Array.isArray(mem.competitors) ? mem.competitors.slice(0, 10) : [];
    }

    if (seoMem) {
      sources.push({
        type: 'competitor',
        subType: 'seoIntelligence',
        count: Array.isArray(seoMem.competitors) ? seoMem.competitors.length : 0,
        freshness: memory?.seo?.updatedAt || null,
        sourceTable: 'seoIntelligence',
      });
    }

    return collected;
  }

  async _gatherSeoEvidence(request, memory, sources, gaps) {
    const seoMem = memory?.seo;

    if (seoMem?.data) {
      sources.push({
        type: 'seo',
        subType: 'seoIntelligence',
        score: seoMem.data.seoScore,
        hasKeywords: !!seoMem.data.keywordOpportunities || !!seoMem.data.keywordIntelligence,
        freshness: seoMem.updatedAt || null,
        sourceTable: 'seoIntelligence',
      });

      if (!seoMem.data.keywordOpportunities && !seoMem.data.keywordIntelligence) {
        gaps.push({ type: 'seo', subType: 'keywords', severity: 'medium', message: 'No keyword intelligence found' });
      }
      if (!seoMem.data.technicalAudit && !seoMem.data.technicalAuditDetail) {
        gaps.push({ type: 'seo', subType: 'technical_audit', severity: 'low', message: 'No technical SEO audit found' });
      }
    } else {
      gaps.push({ type: 'seo', subType: 'full_analysis', severity: 'high', message: 'No SEO intelligence exists. Run SEO analysis first.' });
    }

    return {
      exists: !!seoMem?.data,
      score: seoMem?.data?.seoScore || null,
      source: seoMem?.data ? 'memory' : 'none',
    };
  }

  async _gatherProfileEvidence(request, memory, sources) {
    const mem = memory?.profile?.data;
    if (mem) {
      sources.push({
        type: 'profile',
        subType: 'productProfile',
        companyName: mem.companyName,
        websiteUrl: mem.websiteUrl,
        industry: mem.industry,
        freshness: memory?.profile?.updatedAt || null,
        sourceTable: 'productProfile',
      });
      return {
        exists: true,
        companyName: mem.companyName,
        websiteUrl: mem.websiteUrl,
        industry: mem.industry,
      };
    }
    return { exists: false, companyName: request?.companyName || '' };
  }

  async health() {
    return {
      name: this._name,
      status: 'HEALTHY',
      hasPrisma: !!this._prisma,
    };
  }
}

export function injectCompanyIntelligence(fn) {
  _collectCompanyIntelligence = fn;
}
