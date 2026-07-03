import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/ui-kit";
import { perfSeries, channels, NO_DATA } from "@/lib/sample-data";

export const Route = createFileRoute("/app/analytics")({ component: AnalyticsPage });

function AnalyticsPage() {
  const hasPerf = perfSeries && perfSeries.length > 0;
  const hasChannels = channels && channels.length > 0;
  const hasAnyData = hasPerf || hasChannels;

  if (!hasAnyData) {
    return (
      <>
        <PageHeader
          eyebrow="Stage 10 / 12"
          title="Performance Analytics Engine"
          description="CAC, LTV, ROAS, conversion, channel and attribution analytics ΓÇö all in one view."
        />
        <Section title="Analytics">
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-muted-foreground">{NO_DATA}. Run an analysis to get started.</p>
          </div>
        </Section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Stage 10 / 12"
        title="Performance Analytics Engine"
        description="CAC, LTV, ROAS, conversion, channel and attribution analytics ΓÇö all in one view."
      />

      {hasPerf && (
        <Section title="CAC / LTV / ROAS Trend">
          <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
            Performance data will render here when available.
          </div>
        </Section>
      )}

      {hasChannels && (
        <Section title="Channel Performance (Conversion %)">
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            Channel data will render here when available.
          </div>
        </Section>
      )}
    </>
  );
}
