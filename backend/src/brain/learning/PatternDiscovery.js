export class PatternDiscovery {
  constructor(store, history) {
    this._store = store;
    this._history = history;
  }

  async discoverAll(limit = 200) {
    const execs = await this._history.getRecent(limit);
    const patterns = [];

    patterns.push(...await this._discoverCompetitorClusters(execs));
    patterns.push(...await this._discoverKeywordClusters(execs));
    patterns.push(...await this._discoverAudienceSegments(execs));
    patterns.push(...await this._discoverFeatureBenefitPairs(execs));
    patterns.push(...await this._discoverIndustryStrategies(execs));
    patterns.push(...await this._discoverEvidenceSources(execs));

    for (const pattern of patterns) {
      await this._store.upsertPattern(pattern);
    }

    return patterns;
  }

  async _discoverCompetitorClusters(execs) {
    const coOccurrences = {};
    for (const e of execs) {
      if (!e.reasoningRulesTriggered) continue;
      const competitorRules = (Array.isArray(e.reasoningRulesTriggered) ? e.reasoningRulesTriggered : [])
        .filter(r => r.rule?.includes('competitor') || r.rule?.includes('compete'));

      if (competitorRules.length > 0 && e.company) {
        if (!coOccurrences[e.company]) coOccurrences[e.company] = new Set();
        if (e.product) coOccurrences[e.company].add(e.product);
      }
    }

    const patterns = [];
    for (const [company, products] of Object.entries(coOccurrences)) {
      if (products.size >= 2) {
        patterns.push({
          type: 'competitor_cluster',
          name: `Competitors of ${company}`,
          description: `Frequently analyzed competitors for ${company}`,
          entities: Array.from(products),
          confidence: Math.min(0.5 + products.size * 0.1, 0.95),
          sourceExecutions: execs.filter(e => e.company === company).map(e => e.requestId),
        });
      }
    }
    return patterns;
  }

  async _discoverKeywordClusters(execs) {
    const keywordsByCompany = {};
    for (const e of execs) {
      if (e.module === 'seo' && e.company) {
        if (!keywordsByCompany[e.company]) keywordsByCompany[e.company] = 0;
        keywordsByCompany[e.company]++;
      }
    }

    const patterns = [];
    for (const [company, count] of Object.entries(keywordsByCompany)) {
      if (count >= 2) {
        patterns.push({
          type: 'keyword_cluster',
          name: `SEO analysis for ${company}`,
          description: `${company} has been analyzed ${count} times for SEO keywords`,
          entities: [company],
          confidence: Math.min(0.4 + count * 0.1, 0.9),
          sourceExecutions: execs.filter(e => e.company === company).map(e => e.requestId),
        });
      }
    }
    return patterns;
  }

  async _discoverAudienceSegments(execs) {
    const audienceByProduct = {};
    for (const e of execs) {
      if (e.module === 'product' && e.product) {
        if (!audienceByProduct[e.product]) audienceByProduct[e.product] = 0;
        audienceByProduct[e.product]++;
      }
    }

    const patterns = [];
    for (const [product, count] of Object.entries(audienceByProduct)) {
      if (count >= 2) {
        patterns.push({
          type: 'audience_segment',
          name: `Audience for ${product}`,
          description: `Product ${product} analyzed ${count} times for audience insights`,
          entities: [product],
          confidence: Math.min(0.4 + count * 0.1, 0.9),
          sourceExecutions: execs.filter(e => e.product === product).map(e => e.requestId),
        });
      }
    }
    return patterns;
  }

  async _discoverFeatureBenefitPairs(execs) {
    const pairs = [];
    for (const e of execs) {
      if (!e.reasoningRulesTriggered) continue;
      const featureRules = (Array.isArray(e.reasoningRulesTriggered) ? e.reasoningRulesTriggered : [])
        .filter(r => r.rule?.includes('feature') || r.rule?.includes('product'));

      if (featureRules.length > 0 && e.product && e.company) {
        pairs.push({
          type: 'feature_benefit',
          name: `Feature analysis for ${e.product}`,
          description: `Product ${e.product} (${e.company}) has feature-related reasoning rules`,
          entities: [e.company, e.product],
          confidence: 0.6,
          sourceExecutions: [e.requestId],
        });
      }
    }

    const merged = {};
    for (const p of pairs) {
      const key = p.name;
      if (!merged[key]) merged[key] = { ...p, sourceExecutions: [] };
      merged[key].frequency = (merged[key].frequency || 0) + 1;
      merged[key].sourceExecutions.push(...p.sourceExecutions);
      merged[key].confidence = Math.min(merged[key].confidence + 0.05, 0.95);
    }

    return Object.values(merged);
  }

  async _discoverIndustryStrategies(execs) {
    const industryMap = {};
    for (const e of execs) {
      if (e.module && e.company) {
        if (!industryMap[e.module]) industryMap[e.module] = new Set();
        industryMap[e.module].add(e.company);
      }
    }

    const patterns = [];
    for (const [module, companies] of Object.entries(industryMap)) {
      if (companies.size >= 2) {
        patterns.push({
          type: 'industry_strategy',
          name: `${module} strategies`,
          description: `${companies.size} companies analyzed in ${module} module`,
          entities: Array.from(companies),
          confidence: Math.min(0.4 + companies.size * 0.05, 0.9),
          sourceExecutions: execs.filter(e => e.module === module).map(e => e.requestId),
        });
      }
    }
    return patterns;
  }

  async _discoverEvidenceSources(execs) {
    const sourceMap = {};
    for (const e of execs) {
      if (e.memoryHits > 0) {
        const key = 'memory';
        if (!sourceMap[key]) sourceMap[key] = { count: 0, companies: new Set() };
        sourceMap[key].count += e.memoryHits;
        if (e.company) sourceMap[key].companies.add(e.company);
      }
      if (e.evidenceCount > 0) {
        const key = 'evidence';
        if (!sourceMap[key]) sourceMap[key] = { count: 0, companies: new Set() };
        sourceMap[key].count += e.evidenceCount;
        if (e.company) sourceMap[key].companies.add(e.company);
      }
    }

    const patterns = [];
    for (const [source, data] of Object.entries(sourceMap)) {
      if (data.count >= 3) {
        patterns.push({
          type: 'evidence_source',
          name: `${source} evidence source`,
          description: `${source} used ${data.count} times across ${data.companies.size} companies`,
          entities: Array.from(data.companies),
          confidence: Math.min(0.5 + data.count * 0.02, 0.95),
          sourceExecutions: [],
        });
      }
    }
    return patterns;
  }
}
