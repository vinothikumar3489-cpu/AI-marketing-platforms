import { BaseEngine } from '../engine.js';
import { EngineStatus, elapsedMs, logEngine } from '../core.js';

export class QualityEngine extends BaseEngine {
  constructor() {
    super('QualityEngine');
  }

  async execute(context) {
    const rid = context?.requestId || 'NO_RID';
    const start = Date.now();
    logEngine(this._name, rid, 0, EngineStatus.RUNNING);

    try {
      const qualityResult = {
        score: this._assess(context),
        checks: {
          completeness: this._checkCompleteness(context),
          consistency: this._checkConsistency(context),
          accuracy: this._checkAccuracy(context),
          relevance: this._checkRelevance(context),
        },
        issues: this._collectIssues(context),
        summary: `Quality assessment of brain output: score ${Math.round(this._assess(context) * 100)}/100`,
      };
      context.quality = qualityResult;

      logEngine(this._name, rid, elapsedMs(start), EngineStatus.COMPLETED, `score=${qualityResult.score}`);
      return { success: true, data: qualityResult };
    } catch (err) {
      logEngine(this._name, rid, elapsedMs(start), EngineStatus.FAILED, err.message);
      return { success: false, error: err.message };
    }
  }

  _assess(context) {
    const checks = [
      this._checkCompleteness(context),
      this._checkConsistency(context),
      this._checkAccuracy(context),
      this._checkRelevance(context),
    ];
    const total = checks.length;
    const earned = checks.reduce((sum, c) => sum + c.score, 0);
    let score = total > 0 ? earned / total : 1.0;
    if (context?.errors?.length) score -= 0.1 * context.errors.length;
    return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
  }

  _checkCompleteness(context) {
    const fields = ['user', 'company', 'product', 'memory', 'knowledge', 'evidence'];
    const present = fields.filter(f => context?.[f]).length;
    return { score: fields.length ? present / fields.length : 1, present, total: fields.length };
  }

  _checkConsistency(context) {
    const conflicts = [];
    const knowledgeCompany = context?.knowledge?.company?.name;
    const requestCompany = context?.request?.companyName;
    if (requestCompany && knowledgeCompany && knowledgeCompany !== 'Unknown'
      && requestCompany.toLowerCase() !== knowledgeCompany.toLowerCase()) {
      conflicts.push({
        type: 'company_name',
        message: `Request company "${requestCompany}" differs from knowledge company "${knowledgeCompany}"`,
      });
    }

    const evidenceCompany = context?.evidence?.profile?.companyName;
    if (evidenceCompany && knowledgeCompany && knowledgeCompany !== 'Unknown'
      && evidenceCompany.toLowerCase() !== knowledgeCompany.toLowerCase()) {
      conflicts.push({
        type: 'company_profile_mismatch',
        message: `Profile company "${evidenceCompany}" differs from knowledge company "${knowledgeCompany}"`,
      });
    }

    const score = conflicts.length ? 1.0 - Math.min(0.5, 0.15 * conflicts.length) : 1.0;
    return { score: Math.round(score * 100) / 100, conflicts, note: 'Consistency check across knowledge sources' };
  }

  _checkAccuracy(context) {
    const evidenceSources = context?.evidence?.sources?.length || 0;
    const gaps = context?.evidence?.gaps?.length || 0;

    let score = 1.0;
    if (evidenceSources === 0 && gaps > 0) score -= 0.25;
    if (context?.reasoning?.conclusions?.some(c => c.severity === 'high')) score -= 0.15;
    if (context?.confidence?.overall === 0) score -= 0.2;

    return {
      score: Math.round(Math.max(0, score) * 100) / 100,
      evidenceSources,
      gaps,
      note: 'Accuracy scored against evidence coverage and flagged gaps',
    };
  }

  _checkRelevance(context) {
    const action = context?.request?.action || '';
    const knowledge = context?.knowledge || {};
    const hasAnyKnowledge = !!knowledge.company?.name || !!knowledge.product?.name
      || (knowledge.competitors?.count || 0) > 0 || knowledge.keywords?.hasKeywords;

    let score = 1.0;
    if (!action) score -= 0.1;
    if (!hasAnyKnowledge) score -= 0.3;

    return {
      score: Math.round(Math.max(0, score) * 100) / 100,
      note: 'Relevance scored against user intent and knowledge coverage',
    };
  }

  _collectIssues(context) {
    const issues = [];
    const consistency = this._checkConsistency(context);
    issues.push(...consistency.conflicts.map(c => ({ type: c.type, severity: 'medium', message: c.message })));
    const gaps = context?.evidence?.gaps || [];
    issues.push(...gaps.map(g => ({ type: `evidence_gap_${g.subType}`, severity: g.severity || 'low', message: g.message })));
    return issues;
  }
}
