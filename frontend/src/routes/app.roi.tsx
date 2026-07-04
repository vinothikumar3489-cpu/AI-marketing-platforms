import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, ScoreBar } from "@/components/ui-kit";
import { roiRecs } from "@/lib/sample-data";
import { TrendingDown, TrendingUp, Sparkles, Zap } from "lucide-react";

export const Route = createFileRoute("/app/roi")({ component: ROIPage });

function ROIPage() {
  return (
    <>
      <PageHeader
        eyebrow="Stage 11 / 12"
        title="ROI Optimization Engine"
        description="AI-driven budget reallocation, channel optimization, and pipeline acceleration."
      />

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="glass-strong rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-green/20 to-transparent" />
          <div className="relative">
            <TrendingDown className="w-6 h-6 text-brand-green mb-2" />
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Expected CAC Reduction</div>
            <div className="text-5xl font-display font-bold mt-1 text-brand-green">37%</div>
            <div className="text-sm text-muted-foreground mt-2">If all recommendations are implemented within 30 days.</div>
          </div>
        </div>
        <div className="glass-strong rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/20 to-transparent" />
          <div className="relative">
            <TrendingUp className="w-6 h-6 text-brand-purple mb-2" />
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Expected ROI Increase</div>
            <div className="text-5xl font-display font-bold mt-1 gradient-text">3.4x</div>
            <div className="text-sm text-muted-foreground mt-2">Projected blended ROAS lift across portfolio.</div>
          </div>
        </div>
      </div>

      <Section title="AI Recommendations" description="Click to apply or schedule">
        <div className="space-y-3">
          {roiRecs.map((r, i) => (
            <div key={i} className="p-4 rounded-xl glass flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg gradient-brand grid place-items-center shrink-0"><Sparkles className="w-4 h-4 text-white" /></div>
              <div className="flex-1">
                <div className="font-medium">{r.action}</div>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex-1 max-w-xs"><ScoreBar value={r.confidence} color="green" /></div>
                  <span className="text-xs text-muted-foreground">Confidence {r.confidence}%</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-brand-cyan font-semibold">{r.impact}</div>
                <div className="flex gap-1 mt-2 justify-end">
                  <button className="px-2.5 py-1 rounded-md bg-white/5 text-xs">Snooze</button>
                  <button className="px-2.5 py-1 rounded-md gradient-brand text-white text-xs flex items-center gap-1"><Zap className="w-3 h-3" />Apply</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Optimization Impact Summary">
        <div className="grid grid-cols-4 gap-4">
          {[{ l: "Saved Spend", v: "$148K", c: "blue" }, { l: "Added Pipeline", v: "$2.3M", c: "purple" }, { l: "New SQLs", v: "+412", c: "green" }, { l: "Payback", v: "47 days", c: "cyan" }].map(s => (
            <div key={s.l} className="glass rounded-xl p-4 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.l}</div>
              <div className={`text-3xl font-display font-bold mt-1 text-brand-${s.c}`}>{s.v}</div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
