import { BaseAutonomousModule } from './BaseAutonomousModule.js';

export class CompetitorMonitor extends BaseAutonomousModule {
  constructor(brainService) {
    super('CompetitorMonitor', brainService);
  }

  async _run(context) {
    const analyzedAt = new Date().toISOString();
    return {
      newCompetitors: [],
      pricingChanges: [],
      featureChanges: [],
      rankingChanges: [],
      summary: {
        totalNewCompetitors: 0,
        totalPricingChanges: 0,
        totalFeatureChanges: 0,
        totalRankingChanges: 0,
        analyzedAt,
        status: 'no_data',
        note: 'No competitor intelligence data source is connected to this module. Empty results are returned instead of fabricated competitor signals.',
      },
    };
  }
}
