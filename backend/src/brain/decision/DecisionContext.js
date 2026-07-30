export class DecisionContext {
  constructor(data = {}) {
    this.goal = data.goal || '';
    this.constraints = data.constraints || [];
    this.budget = data.budget || null;
    this.timeframe = data.timeframe || '';
    this.businessContext = data.businessContext || {};
    this.evidence = data.evidence || null;
    this.knowledgeGraph = data.knowledgeGraph || null;
    this.learningHistory = data.learningHistory || null;
    this.recommendations = data.recommendations || [];
    this.confidence = data.confidence || null;
    this.requestId = data.requestId || '';
    this.userId = data.userId || '';
    this.companyName = data.companyName || '';
    this.industry = data.industry || '';
    this.productName = data.productName || '';
    this.chatId = data.chatId || '';
  }

  hasConstraint(field) {
    return this.constraints.some(c => c.field === field);
  }

  getConstraint(field) {
    return this.constraints.find(c => c.field === field);
  }

  validate() {
    const errors = [];
    if (!this.goal) errors.push('Goal is required');
    if (!this.timeframe) errors.push('Timeframe is required');
    return { valid: errors.length === 0, errors };
  }

  toJSON() {
    return {
      goal: this.goal,
      constraints: this.constraints,
      budget: this.budget,
      timeframe: this.timeframe,
      businessContext: this.businessContext,
      requestId: this.requestId,
      userId: this.userId,
      companyName: this.companyName,
      industry: this.industry,
      productName: this.productName,
    };
  }
}
