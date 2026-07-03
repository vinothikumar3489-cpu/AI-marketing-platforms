import { Section } from "@/components/ui-kit";

const sample = {
  recommendedChannels: ["LinkedIn", "SEO", "Email"],
  budgetSplit: "40% LinkedIn, 30% SEO, 30% Email",
  reasons: ["High purchase intent", "Strong content fit", "Reliable conversion"],
  reach: "120K target impressions",
  difficulty: "Medium",
};

export function ChannelRecommendationModule() {
  return (
    <div className="space-y-6">
      <Section title="Channel Recommendation" description="Sample channel mix and budget guidance.">
        <div className="grid gap-4 lg:grid-cols-2">
          <InfoCard label="Recommended Channels" value={sample.recommendedChannels.join(", ")} />
          <InfoCard label="Budget Split" value={sample.budgetSplit} />
          <InfoCard label="Reason" value={sample.reasons.join(" ┬╖ ")} />
          <InfoCard label="Expected Reach" value={sample.reach} />
          <InfoCard label="Difficulty" value={sample.difficulty} />
        </div>
      </Section>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{label}</div>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
}
