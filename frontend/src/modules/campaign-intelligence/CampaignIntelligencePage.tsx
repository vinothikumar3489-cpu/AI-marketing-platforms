import { useState } from "react";
import { PageHeader, Section } from "@/components/ui-kit";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CampaignGeneratorModule } from "./CampaignGeneratorModule";
import { ChannelRecommendationModule } from "./ChannelRecommendationModule";

export function CampaignIntelligencePage() {
  const [tab, setTab] = useState("campaign");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Campaign Intelligence"
        title="Campaign Intelligence Workspace"
        description="Build campaign strategy, channel selection, and activation plans for your product."
      />

      <Section title="Campaign Workflow" description="Step through planning and channel recommendations.">
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="campaign">Campaign Generator</TabsTrigger>
            <TabsTrigger value="channels">Channel Recommendations</TabsTrigger>
          </TabsList>
        </Tabs>
      </Section>

      {tab === "campaign" && <CampaignGeneratorModule />}
      {tab === "channels" && <ChannelRecommendationModule />}
    </div>
  );
}
