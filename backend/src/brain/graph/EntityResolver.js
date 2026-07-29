export class EntityResolver {
  constructor(entityStore) {
    this._store = entityStore;
  }

  async resolve(type, name, opts = {}) {
    if (!name) return null;

    const canonical = this._canonicalize(name);
    const candidates = [];

    const exact = await this._store.findByTypeAndName(type, name);
    if (exact) candidates.push({ entity: exact, score: 1.0, match: 'exact' });

    const search = await this._store.search(canonical, { type, limit: 10 });
    for (const entity of search) {
      if (entity.canonicalName === canonical) {
        if (!candidates.some(c => c.entity.id === entity.id)) {
          candidates.push({ entity, score: 1.0, match: 'canonical' });
        }
      }
    }

    for (const entity of search) {
      if (candidates.some(c => c.entity.id === entity.id)) continue;
      const score = this._similarityScore(canonical, entity.canonicalName);
      if (score > 0.7) {
        candidates.push({ entity, score, match: 'fuzzy' });
      }
    }

    if (opts.url && this._hasUrl(name, opts.url)) {
      const urlEntities = await this._store.search(opts.url, { type, limit: 5 });
      for (const entity of urlEntities) {
        if (!candidates.some(c => c.entity.id === entity.id)) {
          candidates.push({ entity, score: 0.9, match: 'url' });
        }
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates.length > 0 ? candidates[0] : null;
  }

  async resolveOrCreate(type, name, opts = {}) {
    const resolved = await this.resolve(type, name, opts);
    if (resolved) {
      await this._store.updateConfidence(resolved.entity.id, 0.05);
      return { entity: resolved.entity, resolved: true, match: resolved.match };
    }

    const entity = await this._store.upsert({
      type,
      name,
      canonicalName: this._canonicalize(name),
      chatId: opts.chatId,
      userId: opts.userId,
      source: opts.source || 'brain',
      sourceId: opts.sourceId || null,
      confidence: opts.confidence || 0.5,
      metadata: opts.metadata || {},
    });

    return { entity, resolved: false, match: 'created' };
  }

  async resolveBatch(entities) {
    const results = [];
    for (const e of entities) {
      const result = await this.resolveOrCreate(e.type, e.name, e);
      results.push(result);
    }
    return results;
  }

  async detectDuplicates(type, limit = 50) {
    const entities = await this._store.findByType(type, { limit });
    const groups = [];
    const processed = new Set();

    for (let i = 0; i < entities.length; i++) {
      if (processed.has(entities[i].id)) continue;
      const group = [entities[i]];
      processed.add(entities[i].id);

      for (let j = i + 1; j < entities.length; j++) {
        if (processed.has(entities[j].id)) continue;
        const score = this._similarityScore(
          entities[i].canonicalName,
          entities[j].canonicalName
        );
        if (score > 0.8) {
          group.push(entities[j]);
          processed.add(entities[j].id);
        }
      }

      if (group.length > 1) groups.push(group);
    }

    return groups;
  }

  async mergeDuplicateGroups(groups) {
    const results = [];
    for (const group of groups) {
      const sorted = group.sort((a, b) => b.confidence - a.confidence);
      const primary = sorted[0];
      for (let i = 1; i < sorted.length; i++) {
        const merged = await this._store.mergeDuplicates(primary.id, sorted[i].id);
        if (merged) results.push({ primaryId: primary.id, mergedId: sorted[i].id, name: sorted[i].name });
      }
    }
    return results;
  }

  _canonicalize(name) {
    if (!name) return '';
    return name.toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  _similarityScore(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 1.0;
    if (a.includes(b) || b.includes(a)) return 0.9;
    const aBigrams = this._bigrams(a);
    const bBigrams = this._bigrams(b);
    const intersection = new Set([...aBigrams].filter(x => bBigrams.has(x)));
    const union = new Set([...aBigrams, ...bBigrams]);
    return intersection.size / union.size;
  }

  _bigrams(str) {
    const s = new Set();
    for (let i = 0; i < str.length - 1; i++) s.add(str.substring(i, i + 2));
    return s;
  }

  _hasUrl(name, url) {
    if (!url) return false;
    const domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    return name.toLowerCase().includes(domain) || domain.includes(this._canonicalize(name));
  }
}
