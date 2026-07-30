export class DecisionScenario {
  constructor(data = {}) {
    this.id = data.id || `SCENARIO-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.label = data.label || '';
    this.description = data.description || '';
    this.action = data.action || '';
    this.resourceAllocation = data.resourceAllocation || {};
    this.parameters = data.parameters || {};
    this.simulatedOutcomes = data.simulatedOutcomes || null;
    this.risks = data.risks || [];
    this.impact = data.impact || null;
    this.cost = data.cost || null;
    this.expectedRoi = data.expectedRoi || null;
    this.confidence = data.confidence || 0;
    this.priority = data.priority || 0;
    this.pros = data.pros || [];
    this.cons = data.cons || [];
    this.rank = data.rank || 0;
    this.selected = data.selected || false;
    this.selectionRationale = data.selectionRationale || '';
  }

  setSimulatedOutcomes(outcomes) {
    this.simulatedOutcomes = outcomes;
  }

  setImpact(impact) {
    this.impact = impact;
  }

  setRisks(risks) {
    this.risks = risks;
  }

  toJSON() {
    return {
      id: this.id,
      label: this.label,
      description: this.description,
      action: this.action,
      resourceAllocation: this.resourceAllocation,
      parameters: this.parameters,
      simulatedOutcomes: this.simulatedOutcomes,
      risks: this.risks,
      impact: this.impact,
      cost: this.cost,
      expectedRoi: this.expectedRoi,
      confidence: this.confidence,
      priority: this.priority,
      pros: this.pros,
      cons: this.cons,
      rank: this.rank,
      selected: this.selected,
      selectionRationale: this.selectionRationale,
    };
  }
}
