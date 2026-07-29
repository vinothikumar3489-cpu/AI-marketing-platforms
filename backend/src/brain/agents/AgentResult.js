export class AgentResult {
  constructor(data = {}) {
    this.taskId = data.taskId || '';
    this.agentName = data.agentName || '';
    this.success = data.success !== undefined ? data.success : true;
    this.status = data.status || 'completed';
    this.confidence = data.confidence || 0;
    this.processingTime = data.processingTime || 0;
    this.reasoningSteps = data.reasoningSteps || [];
    this.evidenceUsed = data.evidenceUsed || [];
    this.knowledgeUpdated = data.knowledgeUpdated || [];
    this.learningUpdated = data.learningUpdated || [];
    this.findings = data.findings || [];
    this.recommendations = data.recommendations || [];
    this.strategicActions = data.strategicActions || [];
    this.errors = data.errors || [];
    this.summary = data.summary || '';
    this.metadata = data.metadata || {};
  }

  addFinding(finding) {
    this.findings.push(finding);
  }

  addRecommendation(rec) {
    this.recommendations.push(rec);
  }

  addReasoningStep(step) {
    this.reasoningSteps.push(step);
  }

  addStrategicAction(action) {
    this.strategicActions.push(action);
  }

  addEvidence(source) {
    this.evidenceUsed.push(source);
  }

  recordKnowledgeUpdate(section) {
    if (!this.knowledgeUpdated.includes(section)) {
      this.knowledgeUpdated.push(section);
    }
  }

  recordLearningUpdate(insight) {
    if (!this.learningUpdated.includes(insight)) {
      this.learningUpdated.push(insight);
    }
  }

  toJSON() {
    return {
      taskId: this.taskId,
      agentName: this.agentName,
      success: this.success,
      status: this.status,
      confidence: this.confidence,
      processingTime: this.processingTime,
      reasoningSteps: this.reasoningSteps,
      evidenceUsed: this.evidenceUsed,
      knowledgeUpdated: this.knowledgeUpdated,
      learningUpdated: this.learningUpdated,
      findings: this.findings,
      recommendations: this.recommendations,
      strategicActions: this.strategicActions,
      errors: this.errors,
      summary: this.summary,
    };
  }

  merge(other) {
    this.findings.push(...other.findings);
    this.recommendations.push(...other.recommendations);
    this.strategicActions.push(...(other.strategicActions || []));
    this.reasoningSteps.push(...other.reasoningSteps);
    this.evidenceUsed.push(...other.evidenceUsed);
    this.knowledgeUpdated.push(...other.knowledgeUpdated);
    this.learningUpdated.push(...other.learningUpdated);
    this.confidence = Math.round(((this.confidence * this.findings.length) + (other.confidence * other.findings.length)) / (this.findings.length + other.findings.length || 1) * 1000) / 1000;
    this.processingTime += other.processingTime;
    if (other.errors.length > 0) this.errors.push(...other.errors);
    if (!this.summary) this.summary = other.summary;
  }
}
