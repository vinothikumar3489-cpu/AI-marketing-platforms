import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/ui-kit";
import { intentSignals, NO_DATA } from "@/lib/sample-data";

export const Route = createFileRoute("/app/intent")({ component: IntentPage });

function IntentPage() {
  const hasData = intentSignals && intentSignals.length > 0;

  if (!hasData) {
    return (
      <>
        <PageHeader
          eyebrow="Stage 4 / 12"
          title="Buying Intent Prediction Engine"
          description="Live signals scored 0ΓÇô100 for purchase readiness and lead priority."
        />
        <Section title="Intent Analysis">
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
        eyebrow="Stage 4 / 12"
        title="Buying Intent Prediction Engine"
        description="Live signals scored 0ΓÇô100 for purchase readiness and lead priority."
      />

      <Section title="Trigger Events" description="Live intent signals across the market">
        <div className="space-y-3">
          {intentSignals.map(s => (
            <div key={s.signal} className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center gap-4">
              <div className="flex-1">
                <div className="font-medium">{s.signal}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.count.toLocaleString()} matching companies</div>
              </div>
              <button className="px-3 py-1.5 rounded-lg gradient-brand text-white text-xs">Activate</button>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
