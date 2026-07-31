import { BaseEngine } from '../engine.js';
import { EngineStatus, elapsedMs, logEngine } from '../core.js';

export class ConfidenceEngine extends BaseEngine {
  constructor() {
    super('ConfidenceEngine');
  }

  async execute(context) {
    const rid = context?.requestId || 'NO_RID';
    const start = Date.now();
    logEngine(this._name, rid, 0, EngineStatus.RUNNING);

    try {
      const memory = context?.memory?.sections || {};
      const evidence = context?.evidence || {};
      const reasoning = context?.reasoning || {};

      const sections = {
        company: this._scoreSection('company', memory, evidence),
        product: this._scoreSection('product', memory, evidence),
        competitor: this._scoreSection('competitor', memory, evidence),
        seo: this._scoreSection('seo', memory, evidence),
        evidence: this._scoreSection('evidence', memory, evidence),
        profile: this._scoreSection('profile', memory, evidence),
      };

      const thresholds = { minimum: 0.7, acceptable: 0.85, target: 0.95 };

      const overall = Object.keys(sections).length > 0
        ? Math.round(Object.values(sections).reduce((a, b) => a + b.confidence, 0) / Object.keys(sections).length * 100) / 100
        : 0;

      const confidenceResult = {
        overall,
        sections,
        thresholds,
        aboveThreshold: overall >= thresholds.minimum,
        meetsAcceptable: overall >= thresholds.acceptable,
        meetsTarget: overall >= thresholds.target,
        weakestSection: this._findWeakest(sections),
      };

      context.confidence = confidenceResult;

      logEngine(this._name, rid, elapsedMs(start), EngineStatus.COMPLETED, `overall=${overall}`);
      return { success: true, data: confidenceResult };
    } catch (err) {
      logEngine(this._name, rid, elapsedMs(start), EngineStatus.FAILED, err.message);
      context.confidence = { ...(context.confidence || { overall: 0, sections: {} }), error: err.message };
      return { success: false, error: err.message };
    }
  }

  _scoreSection(sectionName, memory, evidence) {
    const mem = memory[sectionName];
    const sources = (evidence?.sources || []).filter(s => s.type === sectionName);

    if (!mem && sources.length === 0) {
      return { confidence: 0, reason: 'No data available', sourceCount: 0, freshness: null };
    }

    let confidence = 0;
    let sourceCount = sources.length;
    let freshness = null;

    if (mem?.exists) {
      confidence += 0.5;
      sourceCount = Math.max(sourceCount, 1);
      freshness = mem.updatedAt || null;

      if (mem.confidence) confidence += mem.confidence * 0.3;

      if (sourceCount > 1) confidence += 0.1;
      if (sourceCount > 3) confidence += 0.1;

      if (mem.provider && mem.provider !== 'unknown') confidence += 0.05;
    }

    if (sources.length > 0) {
      const newestSource = sources.reduce((latest, s) => {
        return (!latest || (s.timestamp && s.timestamp > latest.timestamp)) ? s : latest;
      }, null);
      if (newestSource?.timestamp) freshness = newestSource.timestamp;
    }

    return {
      confidence: Math.round(Math.min(confidence, 1.0) * 100) / 100,
      reason: mem?.exists
        ? `${sectionName} data available from ${sourceCount} source(s)`
        : `${sectionName} data not yet collected`,
      sourceCount,
      freshness,
    };
  }

  _findWeakest(sections) {
    let weakest = null;
    let lowest = 1;

    for (const [name, score] of Object.entries(sections)) {
      if (score.confidence < lowest) {
        lowest = score.confidence;
        weakest = name;
      }
    }

    return weakest ? { section: weakest, confidence: lowest } : null;
  }
}
