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
      // Link the variant spelling as an alias so future exact lookups hit.
      try {
        await this._store.addAlias(resolved.entity.id, name);
      } catch { /* alias linking is best-effort */ }
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
        // Aliases ("Acme Inc" stored as alias of "acme") and shared
        // website metadata are strong duplicate signals, even when
        // the canonical names differ.
        const aliasHit = this._aliasMatches(entities[i], entities[j]);
        const websiteHit = this._websiteMatches(entities[i], entities[j]);
        if (score > 0.8 || aliasHit || websiteHit) {
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
    if (aBigrams.size === 0 || bBigrams.size === 0) return 0;
    const intersection = new Set([...aBigrams].filter(x => bBigrams.has(x)));
    const union = new Set([...aBigrams, ...bBigrams]);
    return intersection.size / union.size;
  }

  _aliasMatches(a, b) {
    const aAliases = (a.aliases || []).map(x => this._canonicalize(x));
    const bAliases = (b.aliases || []).map(x => this._canonicalize(x));
    const aCanon = this._canonicalize(a.name || a.canonicalName);
    const bCanon = this._canonicalize(b.name || b.canonicalName);
    return (
      (aAliases.length > 0 && bAliases.includes(aCanon)) ||
      (bAliases.length > 0 && aAliases.includes(bCanon)) ||
      (aAliases.some(x => bAliases.includes(x)))
    );
  }

  _websiteMatches(a, b) {
    const aUrl = a.metadata?.website || a.metadata?.url || a.metadata?.websiteUrl || '';
    const bUrl = b.metadata?.website || b.metadata?.url || b.metadata?.websiteUrl || '';
    if (!aUrl || !bUrl) return false;
    const aDomain = this._canonicalize(aUrl);
    const bDomain = this._canonicalize(bUrl);
    return aDomain === bDomain && aDomain.length > 0;
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
