export class AgentRegistry {
  constructor() {
    this._agents = new Map();
  }

  register(agent) {
    if (!agent.name) throw new Error('Agent must have a name');
    this._agents.set(agent.name, agent);
  }

  getAgent(name) {
    return this._agents.get(name) || null;
  }

  hasAgent(name) {
    return this._agents.has(name);
  }

  getAllAgents() {
    return Array.from(this._agents.values());
  }

  getAgentNames() {
    return Array.from(this._agents.keys());
  }

  findAgentsForTask(taskType) {
    return this.getAllAgents().filter(a =>
      a.capabilities && a.capabilities.includes(taskType)
    );
  }

  findAgentsByCapability(capability) {
    return this.getAllAgents().filter(a =>
      a.capabilities && a.capabilities.includes(capability)
    );
  }

  getCount() {
    return this._agents.size;
  }

  async health() {
    const results = {};
    for (const [name, agent] of this._agents) {
      try {
        results[name] = await agent.health();
      } catch {
        results[name] = { name, status: 'UNHEALTHY' };
      }
    }
    return {
      totalAgents: this._agents.size,
      agents: results,
      allHealthy: Object.values(results).every(r => r.status === 'HEALTHY'),
    };
  }
}
