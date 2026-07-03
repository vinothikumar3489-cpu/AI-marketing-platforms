import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/ui-kit";

export const Route = createFileRoute("/app/campaigns")({ component: CampaignsPage });

function CampaignsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Stage 8 / 12"
        title="Campaign Strategy Generator"
        description="Complete go-to-market strategy: messaging framework, offers, timeline, A/B tests."
      />
      <Section title="Campaign Strategy">
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-muted-foreground">No verified data available. Run an analysis to get started.</p>
        </div>
      </Section>
    </>
  );
}
