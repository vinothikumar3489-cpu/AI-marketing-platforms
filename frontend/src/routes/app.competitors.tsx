import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/ui-kit";
import { competitors, NO_DATA } from "@/lib/sample-data";

export const Route = createFileRoute("/app/competitors")({ component: CompetitorsPage });

function CompetitorsPage() {
  const hasData = competitors && competitors.length > 0;

  if (!hasData) {
    return (
      <>
        <PageHeader
          eyebrow="Stage 5 / 12"
          title="Competitor Intelligence Engine"
          description="Real-time competitor discovery, pricing, sentiment, and market gap analysis."
        />
        <Section title="Competitor Analysis">
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
        eyebrow="Stage 5 / 12"
        title="Competitor Intelligence Engine"
        description="Real-time competitor discovery, pricing, sentiment, and market gap analysis."
      />

      <Section title="Competitor Matrix">
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="text-left p-3">Competitor</th><th className="text-left p-3">Pricing</th><th className="text-left p-3">Share</th><th className="text-left p-3">Sentiment</th><th className="text-left p-3">Strength</th><th className="text-left p-3">Weakness</th></tr>
            </thead>
            <tbody>
              {competitors.map(c => (
                <tr key={c.name} className="border-t border-white/5 hover:bg-white/5">
                  <td className="p-3 font-semibold">{c.name}</td>
                  <td className="p-3 text-brand-cyan">{c.pricing}</td>
                  <td className="p-3">{c.share}%</td>
                  <td className="p-3"><span className="text-xs">{c.sentiment}</span></td>
                  <td className="p-3 text-brand-green text-xs">{c.strength}</td>
                  <td className="p-3 text-brand-purple text-xs">{c.weakness}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
