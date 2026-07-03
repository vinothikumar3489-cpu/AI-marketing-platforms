import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/ui-kit";
import { Brain, Sparkles } from "lucide-react";
import { perfSeries, markets, channels, personas, roiRecs, pipelineSteps, NO_DATA } from "@/lib/sample-data";
import { createBlankProject } from "@/lib/project-store";

export const Route = createFileRoute("/app/")({ component: Dashboard });

function Dashboard() {
  const navigate = useNavigate();
  const startNewAnalysis = () => {
    createBlankProject();
    navigate({ to: "/app/product" });
  };

  const hasPerf = perfSeries && perfSeries.length > 0;
  const hasMarkets = markets && markets.length > 0;
  const hasChannels = channels && channels.length > 0;
  const hasPersonas = personas && personas.length > 0;
  const hasRoi = roiRecs && roiRecs.length > 0;
  const hasPipeline = pipelineSteps && pipelineSteps.length > 0;
  const hasAnyData = hasPerf || hasMarkets || hasChannels || hasPersonas || hasRoi || hasPipeline;

  return (
    <>
      <PageHeader
        eyebrow="Executive Overview"
        title="Customer Acquisition Command Center"
        description="Unified view of your product intelligence, market opportunities, and campaign performance."
        actions={
          <button onClick={startNewAnalysis} className="px-4 h-10 rounded-lg gradient-brand text-white text-sm font-medium flex items-center gap-2 glow-blue">
            <Sparkles className="w-4 h-4" /> New Analysis
          </button>
        }
      />

      {!hasAnyData ? (
        <Section title="Dashboard">
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-muted-foreground">{NO_DATA}. Run an analysis to get started.</p>
            <button onClick={startNewAnalysis} className="mt-4 px-5 h-10 rounded-lg gradient-brand text-white text-sm font-medium flex items-center gap-2 mx-auto">
              <Sparkles className="w-4 h-4" /> Start New Analysis
            </button>
          </div>
        </Section>
      ) : (
        <>
          {hasMarkets && (
            <Section title="Top Markets" description="Ranked by AI market-fit score">
              <div className="space-y-3">
                {markets.slice(0, 5).map(m => (
                  <div key={m.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{m.name}</span>
                      <span className="text-brand-cyan font-medium">{m.fit}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {hasPersonas && (
            <Section title="Top ICP Personas" description="Highest intent buyers">
              {personas.slice(0, 4).map(p => (
                <div key={p.name} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 mb-2">
                  <div>
                    <div className="text-sm font-medium">{p.title}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-brand-green">{p.intent}</div>
                    <div className="text-[10px] text-muted-foreground">intent</div>
                  </div>
                </div>
              ))}
            </Section>
          )}

          {hasRoi && (
            <Section title="AI Recommendations" description="Live optimization actions">
              {roiRecs.slice(0, 4).map((r, i) => (
                <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/5 mb-2">
                  <div className="flex justify-between gap-2">
                    <div className="text-sm font-medium leading-snug">{r.action}</div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-green/20 text-brand-green shrink-0 h-fit">{r.confidence}%</span>
                  </div>
                  <div className="text-[11px] text-brand-cyan mt-1">{r.impact}</div>
                </div>
              ))}
            </Section>
          )}

          {hasPipeline && (
            <Section title="AI Workflow Pipeline" description="End-to-end intelligence flow">
              <div className="flex flex-wrap gap-2 items-center">
                {pipelineSteps.map((s, i) => (
                  <div key={s} className="px-3 py-2 rounded-lg glass text-xs font-medium border-l-2 border-brand-cyan flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
                    {s}
                  </div>
                ))}
              </div>
            </Section>
          )}
        </>
      )}

      <Section title="AI Assistant" description="Ask anything about your market, audience or strategy">
        <div className="glass rounded-xl p-4">
          <div className="text-sm text-muted-foreground">
            No insights available yet. Run an analysis to enable the AI Assistant.
          </div>
        </div>
      </Section>
    </>
  );
}
