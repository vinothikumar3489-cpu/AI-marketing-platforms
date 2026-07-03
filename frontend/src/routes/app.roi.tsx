import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/ui-kit";
import { roiRecs, NO_DATA } from "@/lib/sample-data";

export const Route = createFileRoute("/app/roi")({ component: ROIPage });

function ROIPage() {
  const hasData = roiRecs && roiRecs.length > 0;

  if (!hasData) {
    return (
      <>
        <PageHeader
          eyebrow="Stage 11 / 12"
          title="ROI Optimization Engine"
          description="AI-driven budget reallocation, channel optimization, and pipeline acceleration."
        />
        <Section title="ROI Analysis">
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
        eyebrow="Stage 11 / 12"
        title="ROI Optimization Engine"
        description="AI-driven budget reallocation, channel optimization, and pipeline acceleration."
      />

      <Section title="AI Recommendations" description="Click to apply or schedule">
        <div className="space-y-3">
          {roiRecs.map((r, i) => (
            <div key={i} className="p-4 rounded-xl glass flex items-center gap-4">
              <div className="flex-1">
                <div className="font-medium">{r.action}</div>
                <div className="text-sm text-brand-cyan mt-1">{r.impact}</div>
              </div>
              <div className="flex gap-1">
                <button className="px-2.5 py-1 rounded-md bg-white/5 text-xs">Snooze</button>
                <button className="px-2.5 py-1 rounded-md gradient-brand text-white text-xs">Apply</button>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
