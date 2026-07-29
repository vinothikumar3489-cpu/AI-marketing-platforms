export class RuleOptimizer {
  constructor(store) {
    this._store = store;
  }

  async recordTrigger(ruleName) {
    await this._store.upsertRulePerformance(ruleName, {
      timesTriggered: 1,
      averageConfidence: 0.5,
      priority: 'medium',
      effectiveness: 0.5,
    });
  }

  async recordUseful(ruleName) {
    const perf = await this._store.prisma.brainRulePerformance.findUnique({ where: { ruleName } });
    if (perf) {
      const newUseful = perf.timesUseful + 1;
      const effectiveness = perf.timesTriggered > 0
        ? Math.round((newUseful / perf.timesTriggered) * 1000) / 1000
        : 0.5;
      await this._store.upsertRulePerformance(ruleName, {
        timesUseful: 1,
        effectiveness: Math.min(effectiveness, 1.0),
      });
    } else {
      await this._store.upsertRulePerformance(ruleName, {
        timesTriggered: 1,
        timesUseful: 1,
        effectiveness: 1.0,
      });
    }
  }

  async recordFalsePositive(ruleName) {
    const perf = await this._store.prisma.brainRulePerformance.findUnique({ where: { ruleName } });
    if (perf) {
      const newFP = perf.falsePositives + 1;
      const effectiveness = perf.timesTriggered > 0
        ? Math.round(((perf.timesUseful) / (perf.timesTriggered + newFP)) * 1000) / 1000
        : 0.5;
      await this._store.upsertRulePerformance(ruleName, {
        falsePositives: 1,
        effectiveness: Math.max(effectiveness, 0),
      });
    } else {
      await this._store.upsertRulePerformance(ruleName, {
        falsePositives: 1,
        effectiveness: 0.3,
      });
    }
  }

  async recordFalseNegative(ruleName) {
    const perf = await this._store.prisma.brainRulePerformance.findUnique({ where: { ruleName } });
    if (perf) {
      const newFN = perf.falseNegatives + 1;
      const effectiveness = Math.round(((perf.timesUseful) / (perf.timesTriggered + newFN)) * 1000) / 1000;
      await this._store.upsertRulePerformance(ruleName, {
        falseNegatives: 1,
        effectiveness: Math.max(effectiveness, 0),
      });
    } else {
      await this._store.upsertRulePerformance(ruleName, {
        falseNegatives: 1,
        effectiveness: 0.3,
      });
    }
  }

  async optimizeAll() {
    const rules = await this._store.getRulePerformances({ limit: 100 });
    const changes = [];

    for (const rule of rules) {
      const oldPriority = rule.priority;
      let newPriority = rule.priority;

      if (rule.effectiveness >= 0.8) {
        newPriority = 'high';
      } else if (rule.effectiveness >= 0.5) {
        newPriority = 'medium';
      } else if (rule.effectiveness >= 0.2) {
        newPriority = 'low';
      } else {
        newPriority = 'low';
      }

      if (newPriority !== oldPriority) {
        await this._store.upsertRulePerformance(rule.ruleName, {
          priority: newPriority,
          effectiveness: rule.effectiveness,
        });
        changes.push({
          ruleName: rule.ruleName,
          from: oldPriority,
          to: newPriority,
          effectiveness: rule.effectiveness,
        });
      }
    }

    return {
      rulesEvaluated: rules.length,
      priorityChanges: changes,
      lowEffectivenessRules: rules.filter(r => r.effectiveness < 0.2).map(r => r.ruleName),
    };
  }

  async getPerformanceReport() {
    const rules = await this._store.getRulePerformances({ limit: 100 });
    const total = rules.length;
    const high = rules.filter(r => r.priority === 'high').length;
    const medium = rules.filter(r => r.priority === 'medium').length;
    const low = rules.filter(r => r.priority === 'low').length;
    const avgEffectiveness = total > 0
      ? rules.reduce((s, r) => s + r.effectiveness, 0) / total
      : 0;

    return {
      totalRules: total,
      byPriority: { high, medium, low },
      averageEffectiveness: Math.round(avgEffectiveness * 1000) / 1000,
      degradedRules: rules.filter(r => r.effectiveness < 0.2).map(r => ({
        ruleName: r.ruleName,
        effectiveness: r.effectiveness,
        timesTriggered: r.timesTriggered,
      })),
      topRules: rules.filter(r => r.priority === 'high').map(r => ({
        ruleName: r.ruleName,
        effectiveness: r.effectiveness,
        timesTriggered: r.timesTriggered,
      })),
    };
  }
}
