import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/ui-kit";

export const Route = createFileRoute("/app/positioning")({ component: PositioningPage });

function PositioningPage() {
  return (
    <>
      <PageHeader
        eyebrow="Stage 6 / 12"
        title="Positioning Recommendation Engine"
        description="AI-generated primary and secondary positioning with resonance scoring."
      />
      <Section title="Positioning Analysis">
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-muted-foreground">No verified data available. Run an analysis to get started.</p>
        </div>
      </Section>
    </>
  );
}
