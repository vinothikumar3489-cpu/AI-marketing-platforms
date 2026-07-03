import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, Section } from "@/components/ui-kit";
import { ProductAnalysisModule } from "./ProductAnalysisModule";
import { MarketDiscoveryModule } from "./MarketDiscoveryModule";
import { AudienceIntelligenceModule } from "./AudienceIntelligenceModule";

export function ProductIntelligencePage() {
  const [tab, setTab] = useState("product");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Product Intelligence"
        title="Product Intelligence Workspace"
        description="Work through product analysis, market discovery, and audience intelligence in one professional workflow."
      />

      <Section title="Workflow" description="Move through each tab to build out your product intelligence project.">
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="product">Product Analysis</TabsTrigger>
            <TabsTrigger value="market">Market Discovery</TabsTrigger>
            <TabsTrigger value="audience">Audience Intelligence</TabsTrigger>
          </TabsList>
        </Tabs>
      </Section>

      {tab === "product" && <ProductAnalysisModule />}
      {tab === "market" && <MarketDiscoveryModule />}
      {tab === "audience" && <AudienceIntelligenceModule />}
    </div>
  );
}
