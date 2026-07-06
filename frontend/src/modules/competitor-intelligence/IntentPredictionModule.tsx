import { Section } from "@/components/ui-kit";
import SafeValue from "@/components/SafeValue";

const sample = {
  buyerIntentScore: "82",
  highIntentUsers: "Product managers, demand gen leads",
  warmAudience: "Existing marketing teams exploring automation",
  coldAudience: "New buyers researching procurement tools",
  intentSignals: "Content downloads, pricing page visits, demo requests",
  buyingTriggers: "Need for revenue visibility, pressure to reduce churn",
};

export function IntentPredictionModule() {
  return (
    <div className="space-y-6">
      <Section title="Intent Prediction" description="Sample intent signal results ready for future automation.">
        <div className="grid gap-4 lg:grid-cols-2">
          <InfoCard label="Buyer Intent Score" value={sample.buyerIntentScore} />
          <InfoCard label="High Intent Users" value={sample.highIntentUsers} />
          <InfoCard label="Warm Audience" value={sample.warmAudience} />
          <InfoCard label="Cold Audience" value={sample.coldAudience} />
          <InfoCard label="Intent Signals" value={sample.intentSignals} />
          <InfoCard label="Buying Triggers" value={sample.buyingTriggers} />
        </div>
      </Section>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{label}</div>
      <div className="text-sm text-foreground"><SafeValue value={value} /></div>
    </div>
  );
}
