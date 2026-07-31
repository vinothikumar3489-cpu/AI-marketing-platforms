import { BaseEngine } from '../engine.js';
import { EngineStatus, elapsedMs, logEngine } from '../core.js';

export class KnowledgeEngine extends BaseEngine {
  constructor() {
    super('KnowledgeEngine');
    this._entityCache = new Map();
  }

  async execute(context) {
    const rid = context?.requestId || 'NO_RID';
    const start = Date.now();
    logEngine(this._name, rid, 0, EngineStatus.RUNNING);

    try {
      const memory = context?.memory?.sections || {};
      const request = context?.request || {};

      const companyInfo = this._normalizeCompany(request, memory);
      const productInfo = this._normalizeProduct(request, memory);
      const competitorInfo = this._normalizeCompetitors(memory);
      const keywordInfo = this._normalizeKeywords(memory);
      const audienceInfo = this._normalizeAudience(request, memory);
      const marketInfo = this._normalizeMarket(request, memory);
      const industryInfo = this._normalizeIndustry(request, memory);

      const entities = this._resolveDuplicates([
        ...competitorInfo.entities,
        ...keywordInfo.entities,
        ...marketInfo.entities,
      ]);

      const knowledgeResult = {
        company: companyInfo,
        product: productInfo,
        competitors: competitorInfo,
        keywords: keywordInfo,
        audience: audienceInfo,
        market: marketInfo,
        industries: industryInfo,
        entities,
        duplicateResolutions: entities.filter(e => e.resolution),
      };

      context.knowledge = knowledgeResult;

      logEngine(this._name, rid, elapsedMs(start), EngineStatus.COMPLETED, `entities=${entities.length}`);
      return { success: true, data: knowledgeResult };
    } catch (err) {
      logEngine(this._name, rid, elapsedMs(start), EngineStatus.FAILED, err.message);
      context.knowledge = { ...(context.knowledge || {}), error: err.message };
      return { success: false, error: err.message };
    }
  }

  _normalizeCompany(request, memory) {
    const profile = memory?.profile?.data;
    const productMem = memory?.product?.data;
    const compFromProfile = profile?.companyName || '';
    const compFromProduct = productMem?.companyName || '';
    const compFromRequest = request?.companyName || '';

    const name = compFromRequest || compFromProfile || compFromProduct || 'Unknown';
    const domain = this._extractDomain(request?.website || profile?.websiteUrl || '');
    const industry = request?.industry || profile?.industry || '';

    return {
      name: this._cleanEntityName(name),
      domain,
      industry,
      source: compFromRequest ? 'request' : compFromProfile ? 'productProfile' : 'inferred',
    };
  }

  _normalizeProduct(request, memory) {
    const profile = memory?.profile?.data;
    const productMem = memory?.product?.data;
    const seoMem = memory?.seo?.data;

    const name = request?.productName
      || profile?.productName
      || productMem?.productName
      || seoMem?.productName
      || 'Unknown';

    return {
      name: this._cleanEntityName(name),
      source: request?.productName ? 'request' : profile?.productName ? 'productProfile' : 'inferred',
      existsInMemory: !!productMem,
      inSeoMemory: !!seoMem,
    };
  }

  _normalizeCompetitors(memory) {
    const entities = [];
    const competitorMem = memory?.competitor?.data;
    const seoCompetitorMem = memory?.seo?.competitorSeo;
    const productMem = memory?.product?.data;

    if (competitorMem?.competitors) {
      for (const c of (Array.isArray(competitorMem.competitors) ? competitorMem.competitors : [])) {
        entities.push({ type: 'competitor', name: c.name || c.competitorName || 'Unknown', website: c.website || '', source: 'competitorIntelligence' });
      }
    }

    if (seoCompetitorMem?.competitors) {
      for (const c of (Array.isArray(seoCompetitorMem.competitors) ? seoCompetitorMem.competitors : [])) {
        entities.push({ type: 'competitor', name: c.name || 'Unknown', website: c.website || c.domain || '', source: 'seoIntelligence' });
      }
    }

    return {
      count: entities.length,
      entities,
      sources: ['competitorIntelligence', 'seoIntelligence'].filter(s =>
        memory?.competitor?.data || memory?.seo?.competitorSeo
      ),
    };
  }

  _normalizeKeywords(memory) {
    const entities = [];
    const seoMem = memory?.seo?.data;

    if (seoMem?.keywordOpportunities?.primaryKeywords) {
      for (const kw of (Array.isArray(seoMem.keywordOpportunities.primaryKeywords) ? seoMem.keywordOpportunities.primaryKeywords : [])) {
        entities.push({ type: 'keyword', value: typeof kw === 'string' ? kw : kw.keyword || '', source: 'seoIntelligence', category: 'primary' });
      }
    }

    return {
      count: entities.length,
      entities,
      hasKeywords: entities.length > 0,
      source: seoMem ? 'seoIntelligence' : 'none',
    };
  }

  _normalizeAudience(request, memory) {
    const productMem = memory?.product?.data;
    const audienceData = productMem?.audience || memory?.product?.audience;

    return {
      present: !!audienceData,
      source: audienceData ? 'productIntelligence' : 'none',
      note: audienceData ? 'Audience data available in memory' : 'No audience data cached',
    };
  }

  _normalizeMarket(request, memory) {
    const entities = [];
    const productMem = memory?.product?.data;
    const marketData = productMem?.data?.marketDiscovery || productMem?.data?.market;

    if (marketData) {
      entities.push({ type: 'market', value: typeof marketData === 'string' ? marketData : 'discovered', source: 'productIntelligence' });
    }

    return {
      name: request?.market || '',
      entities,
      count: entities.length,
      source: request?.market ? 'request' : marketData ? 'productIntelligence' : 'none',
    };
  }

  _normalizeIndustry(request, memory) {
    const profile = memory?.profile?.data;
    return {
      name: request?.industry || profile?.industry || 'Unknown',
      source: request?.industry ? 'request' : profile?.industry ? 'productProfile' : 'none',
    };
  }

  _resolveDuplicates(entities) {
    const seen = new Map();
    const resolved = [];

    for (const entity of entities) {
      const key = `${entity.type}:${(entity.name || entity.value || '').toLowerCase().trim()}`;
      if (seen.has(key)) {
        resolved.push({ ...entity, resolution: `merged with ${seen.get(key)}`, duplicate: true });
      } else {
        seen.set(key, entity.source);
        resolved.push({ ...entity, duplicate: false });
      }
    }

    return resolved;
  }

  _cleanEntityName(name) {
    if (!name) return 'Unknown';
    return name.replace(/\s+/g, ' ').trim().substring(0, 200);
  }

  _extractDomain(url) {
    if (!url) return '';
    try {
      const u = new URL(url.startsWith('http') ? url : `https://${url}`);
      return u.hostname.replace('www.', '');
    } catch {
      return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    }
  }
}
