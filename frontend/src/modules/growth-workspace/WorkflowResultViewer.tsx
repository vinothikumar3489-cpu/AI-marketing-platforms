import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModuleResultCard } from './ModuleResultCard';
import { asArray, asText, hasData, normalizeResults } from '@/lib/growth-workspace-utils';
import { renderSafeValue } from '../../lib/normalizers';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface WorkflowResultViewerProps {
  results: any;
  steps: any[];
}

export function WorkflowResultViewer({ results, steps }: WorkflowResultViewerProps) {
  const [activeTab, setActiveTab] = useState('product');

  const completedSteps = steps.filter(s => s.status === 'completed');

  if (completedSteps.length === 0) {
    return null;
  }

  // Normalize results to handle both old and new key formats
  const normalizedResults = normalizeResults(results);
  
  console.log('≡ƒöì [WorkflowResultViewer] Normalized results:', normalizedResults);
  console.log('≡ƒöì [WorkflowResultViewer] Active tab:', activeTab);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 gap-2 bg-white/5 p-2 rounded-xl h-auto">
        {completedSteps.map((step) => (
          <TabsTrigger
            key={step.key}
            value={step.key}
            className="text-xs py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500"
          >
            {step.label.replace(' Analysis', '').replace(' Intelligence', '').replace(' Engine', '').replace(' Generator', '').replace(' Recommendation', '')}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Product Analysis */}
      {normalizedResults.product && (
        <TabsContent value="product" className="mt-6">
          <ModuleResultCard
            title="Product Analysis"
            description="Comprehensive analysis of your product's features, benefits, and market positioning"
            data={normalizedResults.product}
            renderContent={(data) => (
              <ProductAnalysisView data={data} />
            )}
          />
        </TabsContent>
      )}

      {/* Market Discovery */}
      {normalizedResults.market && (
        <TabsContent value="market" className="mt-6">
          <ModuleResultCard
            title="Market Discovery"
            description="Market size, trends, and growth opportunities"
            data={normalizedResults.market}
            renderContent={(data) => (
              <MarketDiscoveryView data={data} />
            )}
          />
        </TabsContent>
      )}

      {/* Audience Intelligence */}
      {normalizedResults.audience && (
        <TabsContent value="audience" className="mt-6">
          <ModuleResultCard
            title="Audience Intelligence"
            description="Target audience segments, personas, and buying behavior"
            data={normalizedResults.audience}
            renderContent={(data) => (
              <AudienceIntelligenceView data={data} />
            )}
          />
        </TabsContent>
      )}

      {/* Competitor Analysis */}
      {normalizedResults.competitor && (
        <TabsContent value="competitor" className="mt-6">
          <ModuleResultCard
            title="Competitor Analysis"
            description="Competitive landscape and differentiation opportunities"
            data={normalizedResults.competitor}
            renderContent={(data) => (
              <CompetitorAnalysisView data={data} />
            )}
          />
        </TabsContent>
      )}

      {/* Intent Prediction */}
      {normalizedResults.intent && (
        <TabsContent value="intent" className="mt-6">
          <ModuleResultCard
            title="Intent Prediction"
            description="Buyer intent signals and lead scoring rules"
            data={normalizedResults.intent}
            renderContent={(data) => (
              <IntentPredictionView data={data} />
            )}
          />
        </TabsContent>
      )}

      {/* Positioning Engine */}
      {normalizedResults.positioning && (
        <TabsContent value="positioning" className="mt-6">
          <ModuleResultCard
            title="Positioning Engine"
            description="Strategic positioning and value proposition"
            data={normalizedResults.positioning}
            renderContent={(data) => (
              <PositioningEngineView data={data} />
            )}
          />
        </TabsContent>
      )}

      {/* Campaign Generator */}
      {normalizedResults.campaign && (
        <TabsContent value="campaign" className="mt-6">
          <ModuleResultCard
            title="Campaign Generator"
            description="Campaign ideas, ad hooks, and content suggestions"
            data={normalizedResults.campaign}
            renderContent={(data) => (
              <CampaignGeneratorView data={data} />
            )}
          />
        </TabsContent>
      )}

      {/* Channel Recommendation */}
      {normalizedResults.channel && (
        <TabsContent value="channel" className="mt-6">
          <ModuleResultCard
            title="Channel Recommendation"
            description="Recommended marketing channels and strategy"
            data={normalizedResults.channel}
            renderContent={(data) => (
              <ChannelRecommendationView data={data} />
            )}
          />
        </TabsContent>
      )}
    </Tabs>
  );
}

// Sub-components for each module view

function ProductAnalysisView({ data }: { data: any }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-white mb-2">Product Summary</h4>
          <p className="text-sm text-muted-foreground">{data.productSummary}</p>
        </div>

        <div>
          <h4 className="font-semibold text-white mb-2">Unique Selling Points</h4>
          <ul className="space-y-2">
            {(data.usp || []).map((usp: string, i: number) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-purple-400">Γ£ô</span>
                <span>{renderSafeValue(usp)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-white mb-2">Key Features</h4>
          <div className="grid grid-cols-1 gap-2">
            {(data.features || []).map((feature: string, i: number) => (
              <div key={i} className="text-sm bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                {renderSafeValue(feature)}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-white mb-2">Benefits</h4>
          <ul className="space-y-2">
            {(data.benefits || []).map((benefit: string, i: number) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-green-400">ΓåÆ</span>
                <span>{renderSafeValue(benefit)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-white mb-2">Pain Points Addressed</h4>
          <ul className="space-y-2">
            {(data.painPoints || []).map((pain: string, i: number) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-red-400">ΓÇó</span>
                <span>{renderSafeValue(pain)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-white mb-2">Target Users</h4>
          <div className="flex flex-wrap gap-2">
            {(data.targetUsers || []).map((user: string, i: number) => (
              <span key={i} className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30">
                {renderSafeValue(user)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MarketDiscoveryView({ data }: { data: any }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg p-4 border border-purple-500/20">
          <div className="text-xs text-muted-foreground mb-1">Estimated Market Size</div>
          <div className="text-2xl font-bold text-white">{data.marketSizeEstimate}</div>
        </div>

        <div>
          <h4 className="font-semibold text-white mb-2">Market Trends</h4>
          <ul className="space-y-2">
            {(data.marketTrends || []).map((trend: string, i: number) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-blue-400">≡ƒôê</span>
                <span>{renderSafeValue(trend)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-white mb-2">Growth Opportunities</h4>
          <ul className="space-y-2">
            {(data.growthOpportunities || []).map((opp: string, i: number) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-green-400">Γ£ô</span>
                <span>{renderSafeValue(opp)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/20">
          <div className="text-xs text-muted-foreground mb-1">Demand Score</div>
          <div className="text-2xl font-bold text-yellow-400">{data.demandScore}/100</div>
        </div>

        <div>
          <h4 className="font-semibold text-white mb-2">Market Risks</h4>
          <ul className="space-y-2">
            {(data.marketRisks || []).map((risk: string, i: number) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-red-400">ΓÜá</span>
                <span>{renderSafeValue(risk)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-white mb-2">Entry Strategy</h4>
          <p className="text-sm text-muted-foreground">{data.entryStrategy}</p>
        </div>
      </div>
    </div>
  );
}

function AudienceIntelligenceView({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold text-white mb-3">Buyer Personas</h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(data.buyerPersonas || []).map((persona: any, i: number) => (
            <div key={i} className="bg-white/5 rounded-lg p-4 border border-white/10">
              <h5 className="font-semibold text-white mb-2">{persona.name}</h5>
              <p className="text-sm text-muted-foreground mb-3">{persona.demographics || persona.description}</p>
              {persona.motivations && (
                <div className="mb-2">
                  <div className="text-xs text-muted-foreground mb-1">Motivations:</div>
                  <div className="flex flex-wrap gap-1">
                    {persona.motivations.map((m: string, j: number) => (
                      <span key={j} className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                        {renderSafeValue(m)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {persona.painPoints && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Pain Points:</div>
                  <div className="flex flex-wrap gap-1">
                    {persona.painPoints.map((p: string, j: number) => (
                      <span key={j} className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                        {renderSafeValue(p)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold text-white mb-2">Buying Triggers</h4>
          <ul className="space-y-2">
            {(data.buyingTriggers || []).map((trigger: string, i: number) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-purple-400">ΓÜí</span>
                <span>{renderSafeValue(trigger)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-white mb-2">Common Objections</h4>
          <ul className="space-y-2">
            {(data.objections || []).map((objection: string, i: number) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-yellow-400">?</span>
                <span>{renderSafeValue(objection)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-white mb-2">Best Channels to Reach Audience</h4>
        <div className="flex flex-wrap gap-2">
          {(data.bestChannels || []).map((channel: string, i: number) => (
            <span key={i} className="bg-blue-500/20 text-blue-400 px-4 py-2 rounded-lg border border-blue-500/30 text-sm font-medium">
              {renderSafeValue(channel)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompetitorAnalysisView({ data }: { data: any }) {
  const directCompetitors = asArray(data.directCompetitors);
  const indirectCompetitors = asArray(data.indirectCompetitors);
  const marketGaps = asArray(data.marketGaps);
  const differentiationOpportunities = asArray(data.differentiationOpportunities);
  
  if (!hasData(data)) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No competitor data generated for this analysis. Try running the analysis again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold text-white mb-3">Direct Competitors</h4>
        {directCompetitors.length === 0 ? (
          <div className="text-sm text-muted-foreground">No direct competitors identified</div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {directCompetitors.map((comp: any, i: number) => (
              <div key={i} className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-start justify-between mb-2">
                  <h5 className="font-semibold text-white">{typeof comp === 'string' ? comp : comp.name || `Competitor ${i + 1}`}</h5>
                  {comp.marketShare && (
                    <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                      {comp.marketShare}
                    </span>
                  )}
                </div>
                {comp.strengths && (
                  <div className="mb-2">
                    <div className="text-xs text-muted-foreground mb-1">Strengths:</div>
                    <div className="flex flex-wrap gap-1">
                      {asArray(comp.strengths).map((s: string, j: number) => (
                        <span key={j} className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                          {renderSafeValue(s)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {comp.weaknesses && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Weaknesses:</div>
                    <div className="flex flex-wrap gap-1">
                      {asArray(comp.weaknesses).map((w: string, j: number) => (
                        <span key={j} className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                          {renderSafeValue(w)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold text-white mb-2">Market Gaps</h4>
          {marketGaps.length === 0 ? (
            <div className="text-sm text-muted-foreground">No market gaps identified</div>
          ) : (
            <ul className="space-y-2">
              {marketGaps.map((gap: string, i: number) => (
                <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-yellow-400">≡ƒÆí</span>
                <span>{renderSafeValue(gap)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h4 className="font-semibold text-white mb-2">Differentiation Opportunities</h4>
          {differentiationOpportunities.length === 0 ? (
            <div className="text-sm text-muted-foreground">No opportunities identified</div>
          ) : (
            <ul className="space-y-2">
              {differentiationOpportunities.map((opp: string, i: number) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-green-400">Γ£ô</span>
                  <span>{renderSafeValue(opp)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {indirectCompetitors.length > 0 && (
        <div>
          <h4 className="font-semibold text-white mb-2">Indirect Competitors</h4>
          <div className="flex flex-wrap gap-2">
            {indirectCompetitors.map((comp: string, i: number) => (
              <span key={i} className="text-sm bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                {renderSafeValue(comp)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function IntentPredictionView({ data }: { data: any }) {
  const highIntentSegments = asArray(data.highIntentSegments);
  const warmSegments = asArray(data.warmSegments);
  const coldSegments = asArray(data.coldSegments);
  const buyingSignals = asArray(data.buyingSignals);
  const triggerEvents = asArray(data.triggerEvents);
  const leadScoringRules = asArray(data.leadScoringRules);

  if (!hasData(data)) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No intent prediction data generated. Try running the analysis again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {highIntentSegments.length > 0 && (
        <div>
          <h4 className="font-semibold text-white mb-3">High Intent Segments</h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {highIntentSegments.map((segment: any, i: number) => (
              <div key={i} className="bg-green-500/10 rounded-lg p-4 border border-green-500/30">
                <h5 className="font-semibold text-green-400 mb-2">{typeof segment === 'string' ? segment : segment.segment || `Segment ${i + 1}`}</h5>
                {segment.signals && (
                  <>
                    <div className="text-xs text-muted-foreground mb-1">Signals:</div>
                    <div className="flex flex-wrap gap-1">
                      {asArray(segment.signals).map((signal: string, j: number) => (
                        <span key={j} className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                          {renderSafeValue(signal)}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold text-white mb-2">Buying Signals</h4>
          {buyingSignals.length === 0 ? (
            <div className="text-sm text-muted-foreground">No buying signals identified</div>
          ) : (
            <ul className="space-y-2">
              {buyingSignals.map((signal: string, i: number) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-green-400">Γ£ô</span>
                  <span>{renderSafeValue(signal)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h4 className="font-semibold text-white mb-2">Trigger Events</h4>
          {triggerEvents.length === 0 ? (
            <div className="text-sm text-muted-foreground">No trigger events identified</div>
          ) : (
            <ul className="space-y-2">
              {triggerEvents.map((event: string, i: number) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-purple-400">ΓÜí</span>
                  <span>{renderSafeValue(event)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {leadScoringRules.length > 0 && (
        <div>
          <h4 className="font-semibold text-white mb-2">Lead Scoring Rules</h4>
          <div className="grid grid-cols-1 gap-2">
            {leadScoringRules.map((rule: string, i: number) => (
              <div key={i} className="text-sm bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                {renderSafeValue(rule)}
              </div>
            ))}
          </div>
        </div>
      )}

      {(warmSegments.length > 0 || coldSegments.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {warmSegments.length > 0 && (
            <div>
              <h4 className="font-semibold text-white mb-2">Warm Segments</h4>
              <ul className="space-y-2">
                {warmSegments.map((segment: any, i: number) => (
                  <li key={i} className="text-sm bg-yellow-500/10 px-3 py-2 rounded-lg border border-yellow-500/30">
                    {typeof segment === 'string' ? segment : segment.segment || `Segment ${i + 1}`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {coldSegments.length > 0 && (
            <div>
              <h4 className="font-semibold text-white mb-2">Cold Segments</h4>
              <ul className="space-y-2">
                {coldSegments.map((segment: string, i: number) => (
                  <li key={i} className="text-sm bg-white/5 px-3 py-2 rounded-lg border border-white/10">
                    {renderSafeValue(segment)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PositioningEngineView({ data }: { data: any }) {
  const positioningStatement = asText(data.positioningStatement);
  const valueProposition = asText(data.valueProposition);
  const differentiationAngle = asText(data.differentiationAngle);
  const brandPromise = asText(data.brandPromise);
  const messagingPillars = asArray(data.messagingPillars);
  const competitorWeakness = asArray(data.competitorWeaknessToAttack);

  if (!hasData(data)) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No positioning data generated. Try running the analysis again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg p-6 border border-purple-500/20">
        <h4 className="font-semibold text-white mb-2">Positioning Statement</h4>
        <p className="text-lg text-white">{renderSafeValue(positioningStatement)}</p>
      </div>

      <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg p-6 border border-blue-500/20">
        <h4 className="font-semibold text-white mb-2">Value Proposition</h4>
        <p className="text-lg text-white">{renderSafeValue(valueProposition)}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold text-white mb-2">Differentiation Angle</h4>
          <p className="text-sm text-muted-foreground">{renderSafeValue(differentiationAngle)}</p>
        </div>

        <div>
          <h4 className="font-semibold text-white mb-2">Brand Promise</h4>
          <p className="text-sm text-muted-foreground">{renderSafeValue(brandPromise)}</p>
        </div>
      </div>

      {messagingPillars.length > 0 && (
        <div>
          <h4 className="font-semibold text-white mb-2">Messaging Pillars</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {messagingPillars.map((pillar: string, i: number) => (
              <div key={i} className="bg-white/5 rounded-lg px-4 py-3 border border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-purple-400 font-bold">{i + 1}</span>
                  <span className="text-sm">{renderSafeValue(pillar)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {competitorWeakness.length > 0 && (
        <div>
          <h4 className="font-semibold text-white mb-2">Competitor Weaknesses to Attack</h4>
          <div className="flex flex-wrap gap-2">
            {competitorWeakness.map((weakness: string, i: number) => (
              <span key={i} className="text-sm bg-red-500/10 text-red-400 px-3 py-2 rounded-lg border border-red-500/30">
                {renderSafeValue(weakness)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CampaignGeneratorView({ data }: { data: any }) {
  const campaignObjective = asText(data.campaignObjective);
  const campaignIdeas = asArray(data.campaignIdeas);
  const adHooks = asArray(data.adHooks);
  const ctaSuggestions = asArray(data.ctaSuggestions);
  const emailSequence = asArray(data.emailSequence);
  const socialPostIdeas = asArray(data.socialPostIdeas);
  const campaignPlan = data.campaignPlan || data.contentCalendar;

  if (!hasData(data)) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No campaign data generated. Try running the analysis again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg p-6 border border-purple-500/20">
        <h4 className="font-semibold text-white mb-2">Campaign Objective</h4>
        <p className="text-lg text-white">{renderSafeValue(campaignObjective)}</p>
      </div>

      {campaignPlan && typeof campaignPlan === 'object' && (
        <div>
          <h4 className="font-semibold text-white mb-3">Campaign Plan</h4>
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(campaignPlan).map(([day, action]: [string, any], i) => (
              <div key={i} className="flex items-start gap-3 bg-white/5 rounded-lg px-4 py-3 border border-white/10">
                <span className="text-purple-400 font-bold">{day.toUpperCase()}</span>
                <span className="text-sm">{renderSafeValue(action)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold text-white mb-2">Campaign Ideas</h4>
          {campaignIdeas.length === 0 ? (
            <div className="text-sm text-muted-foreground">No campaign ideas generated</div>
          ) : (
            <ul className="space-y-2">
              {campaignIdeas.map((idea: string, i: number) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-purple-400">≡ƒÆí</span>
                  <span>{renderSafeValue(idea)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h4 className="font-semibold text-white mb-2">Ad Hooks</h4>
          {adHooks.length === 0 ? (
            <div className="text-sm text-muted-foreground">No ad hooks generated</div>
          ) : (
            <ul className="space-y-2">
              {adHooks.map((hook: string, i: number) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-blue-400">≡ƒÄ»</span>
                  <span>{renderSafeValue(hook)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div>
          <h4 className="font-semibold text-white mb-2">CTA Suggestions</h4>
          {ctaSuggestions.length === 0 ? (
            <div className="text-sm text-muted-foreground">No CTAs generated</div>
          ) : (
            <div className="space-y-2">
              {ctaSuggestions.map((cta: string, i: number) => (
                <div key={i} className="bg-green-500/10 text-green-400 px-4 py-2 rounded-lg border border-green-500/30 text-sm text-center font-medium">
                  {renderSafeValue(cta)}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h4 className="font-semibold text-white mb-2">Email Sequence</h4>
          {emailSequence.length === 0 ? (
            <div className="text-sm text-muted-foreground">No email sequence generated</div>
          ) : (
            <div className="space-y-2">
              {emailSequence.map((email: string, i: number) => (
                <div key={i} className="text-xs bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                  Email {i + 1}: {renderSafeValue(email)}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h4 className="font-semibold text-white mb-2">Social Post Ideas</h4>
          {socialPostIdeas.length === 0 ? (
            <div className="text-sm text-muted-foreground">No post ideas generated</div>
          ) : (
            <div className="space-y-2">
              {socialPostIdeas.slice(0, 3).map((post: string, i: number) => (
                <div key={i} className="text-xs bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                  {renderSafeValue(post)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChannelRecommendationView({ data }: { data: any }) {
  const recommendedChannels = asArray(data.recommendedChannels);
  const channelStrategy = asText(data.channelStrategy, '');

  if (!hasData(data)) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No channel recommendation data generated. Try running the analysis again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold text-white mb-3">Recommended Channels</h4>
        {recommendedChannels.length === 0 ? (
          <div className="text-sm text-muted-foreground">No channels recommended</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {recommendedChannels.map((channel: any, i: number) => {
              const channelName = channel.name || channel.channel || `Channel ${i + 1}`;
              const fit = asText(channel.fit || channel.reason, '');
              const budgetAllocation = asText(channel.budgetAllocation || channel.budgetSplit, 'N/A');
              const postingFrequency = asText(channel.postingFrequency, 'N/A');
              const bestPostingTime = asText(channel.bestPostingTime, 'N/A');
              const expectedReach = asText(channel.expectedReach, 'N/A');
              const difficultyScore = channel.difficultyScore || channel.difficulty || 'N/A';
              const contentTypes = asArray(channel.contentTypes);

              return (
                <div key={i} className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-start justify-between mb-3">
                    <h5 className="font-semibold text-white text-lg">{renderSafeValue(channelName)}</h5>
                    <span className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded text-sm font-medium">
                      {budgetAllocation}
                    </span>
                  </div>
                  
                  {fit && <p className="text-sm text-muted-foreground mb-4">{renderSafeValue(fit)}</p>}

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div>
                      <div className="text-muted-foreground mb-1">Posting Frequency</div>
                      <div className="text-white font-medium">{renderSafeValue(postingFrequency)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">Best Time</div>
                      <div className="text-white font-medium">{renderSafeValue(bestPostingTime)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">Expected Reach</div>
                      <div className="text-green-400 font-medium">{renderSafeValue(expectedReach)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">Difficulty</div>
                      <div className="text-yellow-400 font-medium">{difficultyScore}/5</div>
                    </div>
                  </div>

                  {contentTypes.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs text-muted-foreground mb-2">Content Types:</div>
                      <div className="flex flex-wrap gap-2">
                        {contentTypes.map((type: string, j: number) => (
                          <span key={j} className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                            {renderSafeValue(type)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {channelStrategy && (
        <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg p-6 border border-purple-500/20">
          <h4 className="font-semibold text-white mb-2">Overall Channel Strategy</h4>
          <p className="text-sm text-muted-foreground">{renderSafeValue(channelStrategy)}</p>
        </div>
      )}
    </div>
  );
}
