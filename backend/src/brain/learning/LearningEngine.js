import { BaseEngine } from '../engine.js';
import { EngineStatus, elapsedMs, logEngine } from '../core.js';

export class LearningEngine extends BaseEngine {
  constructor() {
    super('LearningEngine');
    this._store = null;
    this._history = null;
    this._feedback = null;
    this._patterns = null;
    this._trends = null;
    this._evolution = null;
    this._optimizer = null;
    this._health = null;
  }

  setDependencies({ store, history, feedback, patterns, trends, evolution, optimizer, health }) {
    this._store = store;
    this._history = history;
    this._feedback = feedback;
    this._patterns = patterns;
    this._trends = trends;
    this._evolution = evolution;
    this._optimizer = optimizer;
    this._health = health;
  }

  async initialize(context) {
    await super.initialize(context);
    if (this._history) {
      console.log('[LearningEngine] ExecutionHistory ready');
    }
    if (this._health) {
      console.log('[LearningEngine] LearningHealth ready');
    }
  }

  async execute(context) {
    const rid = context?.requestId || 'NO_RID';
    const start = Date.now();
    logEngine(this._name, rid, 0, EngineStatus.RUNNING);

    if (!this._store || !this._history) {
      logEngine(this._name, rid, elapsedMs(start), EngineStatus.SKIPPED, 'Learning dependencies not injected');
      return { success: true, data: { status: 'skipped' } };
    }

    try {
      if (!context.learning) context.learning = {};
      await this.process(context);
      logEngine(this._name, rid, elapsedMs(start), EngineStatus.COMPLETED,
        `score=${context.learning.learningScore} patterns=${context.learning.patternsDiscovered}`);
      return { success: true, data: { learningScore: context.learning.learningScore } };
    } catch (err) {
      logEngine(this._name, rid, elapsedMs(start), EngineStatus.FAILED, err.message);
      context.learning = { error: err.message };
      return { success: false, error: err.message };
    }
  }

  async process(context) {
    const startTime = Date.now();
    context.learning = context.learning || {};

    const execution = await this._history.record(context, context.rawResponse || {});
    context.learning.executionRecorded = !!execution;

    const patterns = await this._patterns.discoverAll(200);
    context.learning.patternsDiscovered = patterns.length;

    const trends = await this._trends.allTrends();
    context.learning.trends = trends;

    const evolutionMetrics = await this._evolution.getEvolutionMetrics();
    context.learning.evolution = evolutionMetrics;

    const optimizeResult = await this._optimizer.optimizeAll();
    context.learning.ruleOptimization = optimizeResult;

    const learningScore = await this._health.generateLearningScore();
    context.learning.learningScore = learningScore.brainIQ;
    context.learning.brainIQ = learningScore.brainIQ;
    context.learning.executionsTracked = await this._store.countExecutions();
    context.learning.patternsFound = await this._store.countPatterns();
    context.learning.feedbackProcessed = await this._store.countFeedbacks();
    context.learning.rulesOptimized = optimizeResult.rulesEvaluated;
    context.learning.trendPeriod = '30d';
    context.learning.delta = learningScore.delta;
    context.learning.health = await this._health.getHealthSummary();

    context.contextSummary.learningScore = learningScore.brainIQ;
    context.contextSummary.brainIQ = learningScore.brainIQ;
    context.contextSummary.executionsTracked = context.learning.executionsTracked;
    context.contextSummary.patternsFound = context.learning.patternsFound;

    context.learning.processingTime = Date.now() - startTime;

    return context;
  }

  async health() {
    if (!this._store) {
      return { name: this._name, status: 'HEALTHY', note: 'Learning dependencies not injected, engine idle' };
    }
    try {
      const summary = await this._health.getHealthSummary();
      return { name: this._name, status: 'HEALTHY', brainIQ: summary.brainIQ, executions: summary.totalExecutions };
    } catch (err) {
      return { name: this._name, status: 'DEGRADED', error: err.message };
    }
  }
}
