import { BaseEngine } from '../engine.js';

export class ConstraintEngine extends BaseEngine {
  constructor() {
    super('ConstraintEngine');
  }

  async execute(context) {
    const decisionContext = context?.decisionContext;
    if (!decisionContext) {
      return { success: true, valid: true, constraintsChecked: [], warnings: ['No decision context available'] };
    }

    return this.validate(decisionContext);
  }

  validate(context) {
    if (!context.constraints || context.constraints.length === 0) {
      return { success: true, valid: true, constraintsChecked: [], warnings: ['No constraints defined'] };
    }

    const results = [];
    const violations = [];
    const warnings = [];

    for (const constraint of context.constraints) {
      const result = this._evaluateConstraint(constraint, context);
      results.push(result);
      if (!result.satisfied) {
        violations.push(result);
      }
    }

    return {
      success: violations.length === 0,
      valid: violations.length === 0,
      constraintsChecked: results,
      violations,
      warnings,
      summary: violations.length === 0
        ? 'All constraints satisfied'
        : `${violations.length} constraint(s) violated: ${violations.map(v => v.message).join('; ')}`,
    };
  }

  _evaluateConstraint(constraint, context) {
    const { field, operator, value } = constraint;
    let actualValue;

    switch (field) {
      case 'budget':
        actualValue = context.budget;
        break;
      case 'timeframe':
        actualValue = this._parseTimeframeMonths(context.timeframe);
        break;
      case 'max_budget':
        actualValue = context.budget;
        break;
      case 'min_roi':
        return { field, operator, value, actualValue: null, satisfied: true, message: 'ROI will be evaluated after simulation' };
      default:
        if (context.businessContext && context.businessContext[field] !== undefined) {
          actualValue = context.businessContext[field];
        } else {
          return { field, operator, value, actualValue: null, satisfied: true, message: `Field "${field}" not available for evaluation` };
        }
    }

    let satisfied = false;
    switch (operator) {
      case '<=':
        satisfied = actualValue <= value;
        break;
      case '>=':
        satisfied = actualValue >= value;
        break;
      case '<':
        satisfied = actualValue < value;
        break;
      case '>':
        satisfied = actualValue > value;
        break;
      case '==':
        satisfied = actualValue === value;
        break;
      case '!=':
        satisfied = actualValue !== value;
        break;
      default:
        satisfied = true;
    }

    return {
      field,
      operator,
      value,
      actualValue,
      satisfied,
      message: satisfied
        ? `Constraint ${field} ${operator} ${value} satisfied (actual: ${actualValue})`
        : `Constraint ${field} ${operator} ${value} violated (actual: ${actualValue})`,
    };
  }

  _parseTimeframeMonths(timeframe) {
    if (!timeframe) return 0;
    const lower = timeframe.toLowerCase();
    if (lower.includes('quarter') || lower.includes('q1') || lower.includes('q2') || lower.includes('q3') || lower.includes('q4')) return 3;
    if (lower.includes('month')) {
      const match = lower.match(/(\d+)\s*month/);
      return match ? parseInt(match[1]) : 1;
    }
    if (lower.includes('week')) {
      const match = lower.match(/(\d+)\s*week/);
      return match ? Math.round(parseInt(match[1]) / 4.33) : 0.25;
    }
    if (lower.includes('year')) return 12;
    if (lower.includes('half')) return 6;
    return 3;
  }

  async health() {
    return { name: this._name, status: 'HEALTHY', initialized: this._initialized };
  }
}
