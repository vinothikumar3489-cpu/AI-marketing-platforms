import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/ui-kit";
import { channels, NO_DATA } from "@/lib/sample-data";

export const Route = createFileRoute("/app/channels")({ component: ChannelsPage });

function ChannelsPage() {
  const hasData = channels && channels.length > 0;

  if (!hasData) {
    return (
      <>
        <PageHeader
          eyebrow="Stage 7 / 12"
          title="Channel Recommendation Engine"
          description="Optimal budget allocation across paid, owned, and earned channels."
        />
        <Section title="Channel Analysis">
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
        eyebrow="Stage 7 / 12"
        title="Channel Recommendation Engine"
        description="Optimal budget allocation across paid, owned, and earned channels."
      />

      <Section title="Channel Performance Detail">
        <div className="grid grid-cols-3 gap-4">
          {channels.map(c => (
            <div key={c.name} className="glass rounded-xl p-4 border-l-2" style={{ borderLeftColor: c.color as string }}>
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold flex items-center gap-2">{c.name}</div>
                <span className="text-xs text-muted-foreground">{c.budget}%</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><div className="text-[10px] uppercase text-muted-foreground">CPL</div><div className="font-display font-bold">${c.cpl}</div></div>
                <div><div className="text-[10px] uppercase text-muted-foreground">Conv</div><div className="font-display font-bold">{c.conv}%</div></div>
                <div><div className="text-[10px] uppercase text-muted-foreground">ROI</div><div className="font-display font-bold text-brand-green">{c.roi}x</div></div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
