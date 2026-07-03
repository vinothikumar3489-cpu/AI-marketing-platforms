import { useState } from "react";
import { PageHeader, Section } from "@/components/ui-kit";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompetitorAnalysisModule } from "./CompetitorAnalysisModule";
import { IntentPredictionModule } from "./IntentPredictionModule";
import { PositioningEngineModule } from "./PositioningEngineModule";

export function CompetitorIntelligencePage() {
  const [tab, setTab] = useState("analysis");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Competitor Intelligence"
        title="Competitor Intelligence Workspace"
        description="Analyze competitors, predict intent, and generate positioning in a single workflow."
      />

      <Section title="Workflow" description="Move through each stage to build competitive intelligence.">
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="analysis">Competitor Analysis</TabsTrigger>
            <TabsTrigger value="intent">Intent Prediction</TabsTrigger>
            <TabsTrigger value="positioning">Positioning Engine</TabsTrigger>
          </TabsList>
        </Tabs>
      </Section>

      {tab === "analysis" && <CompetitorAnalysisModule />}
      {tab === "intent" && <IntentPredictionModule />}
      {tab === "positioning" && <PositioningEngineModule />}
    </div>
  );
}
