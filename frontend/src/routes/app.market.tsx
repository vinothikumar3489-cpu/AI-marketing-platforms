import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/ui-kit";
import { markets, NO_DATA } from "@/lib/sample-data";

export const Route = createFileRoute("/app/market")({ component: MarketPage });

function MarketPage() {
  const hasData = markets && markets.length > 0;

  if (!hasData) {
    return (
      <>
        <PageHeader
          eyebrow="Stage 2 / 12"
          title="Market Discovery Engine"
          description="AI-ranked markets by fit, TAM, SAM, and growth velocity."
        />
        <Section title="Market Analysis">
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
        eyebrow="Stage 2 / 12"
        title="Market Discovery Engine"
        description="AI-ranked markets by fit, TAM, SAM, and growth velocity."
      />

      <Section title="Market Fit Ranking" description="Sorted by AI-computed product-market fit score">
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
          Market data will render here when available.
        </div>
      </Section>

      <Section title="Market Opportunity Table">
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-3">Market</th>
                <th className="text-left p-3">Fit Score</th>
                <th className="text-right p-3">TAM</th>
                <th className="text-right p-3">SAM</th>
                <th className="text-right p-3">Growth</th>
                <th className="text-right p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {markets.map(m => (
                <tr key={m.name} className="border-t border-white/5 hover:bg-white/5">
                  <td className="p-3 font-medium">{m.name}</td>
                  <td className="p-3 w-64"><div className="text-sm">{m.fit}%</div></td>
                  <td className="p-3 text-right text-brand-cyan">{m.tam}</td>
                  <td className="p-3 text-right">{m.sam}</td>
                  <td className="p-3 text-right text-brand-green">+{m.growth}%</td>
                  <td className="p-3 text-right">
                    <button className="px-2.5 py-1 rounded-md glass text-xs">Target</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
