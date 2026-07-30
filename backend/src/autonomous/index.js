import { AutonomousOrchestrator } from './AutonomousOrchestrator.js';
import { BaseAutonomousModule } from './BaseAutonomousModule.js';
import { MarketMonitor } from './MarketMonitor.js';
import { CompetitorMonitor } from './CompetitorMonitor.js';
import { SeoOpportunityEngine } from './SeoOpportunityEngine.js';
import { ContentOpportunityEngine } from './ContentOpportunityEngine.js';
import { CampaignOptimizer } from './CampaignOptimizer.js';
import { LeadOpportunityEngine } from './LeadOpportunityEngine.js';
import { TrendMonitor } from './TrendMonitor.js';
import { AlertManager } from './AlertManager.js';
import { InsightGenerator } from './InsightGenerator.js';
import { OpportunityScorer } from './OpportunityScorer.js';
import { AutonomousScheduler } from './AutonomousScheduler.js';
import { AutonomousDecisionModule } from './AutonomousDecisionModule.js';

let _instance = null;

export function createAutonomousLayer(brainService) {
  if (_instance) {
    return _instance;
  }

  const orchestrator = new AutonomousOrchestrator(brainService);
  _instance = orchestrator;

  console.log('[AutonomousLayer] ✓ Created autonomous marketing intelligence layer');
  return orchestrator;
}

export function getAutonomousLayer() {
  return _instance;
}

export {
  BaseAutonomousModule,
  AutonomousOrchestrator,
  MarketMonitor,
  CompetitorMonitor,
  SeoOpportunityEngine,
  ContentOpportunityEngine,
  CampaignOptimizer,
  LeadOpportunityEngine,
  TrendMonitor,
  AlertManager,
  InsightGenerator,
  OpportunityScorer,
  AutonomousScheduler,
};
