import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, ScoreBar } from "@/components/ui-kit";
import { Sparkles, Target, Layers } from "lucide-react";

export const Route = createFileRoute("/app/positioning")({ component: PositioningPage });

function PositioningPage() {
  return (
    <>
      <PageHeader
        eyebrow="Stage 6 / 12"
        title="Positioning Recommendation Engine"
        description="AI-generated primary and secondary positioning with resonance scoring."
      />

      <Section title="Primary Positioning" description="Highest resonance with target ICPs">
        <div className="p-6 rounded-2xl bg-gradient-to-br from-brand-blue/15 to-brand-purple/15 border border-brand-blue/30 relative overflow-hidden">
          <Sparkles className="absolute top-4 right-4 w-5 h-5 text-brand-cyan" />
          <div className="text-3xl font-display font-bold leading-tight gradient-text mb-3">
            "The AI-first HR platform for growing companies."
          </div>
          <div className="text-sm text-muted-foreground mb-4">Resonates with CHROs and VPs of People Ops scaling from 200 to 5,000 employees.</div>
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-xs"><ScoreBar value={91} color="green" /></div>
            <div className="text-2xl font-display font-bold text-brand-green">91%</div>
            <span className="text-xs text-muted-foreground">resonance</span>
          </div>
        </div>
      </Section>

      <div className="grid grid-cols-2 gap-6">
        <Section title="Secondary Positioning" description="Account-based variants">
          {[
            { t: "Enterprise: Compliance-grade HR automation at scale.", s: 84 },
            { t: "SMB: HR superpowers for fast-growing teams.", s: 79 },
            { t: "Global: One HR OS for distributed workforces.", s: 82 },
          ].map(p => (
            <div key={p.t} className="p-4 rounded-xl bg-white/5 border border-white/5 mb-3">
              <div className="font-medium mb-2">{p.t}</div>
              <div className="flex items-center gap-3"><div className="flex-1"><ScoreBar value={p.s} color="blue" /></div><span className="text-sm font-bold text-brand-cyan">{p.s}%</span></div>
            </div>
          ))}
        </Section>

        <Section title="Differentiation Strategy">
          <div className="space-y-3">
            <div className="p-4 rounded-xl glass border-l-2 border-brand-cyan">
              <div className="flex items-center gap-2 mb-1"><Target className="w-4 h-4 text-brand-cyan" /><span className="text-xs uppercase tracking-wider text-brand-cyan">Wedge</span></div>
              <div className="text-sm">Own the "AI HR" category before Workday and Rippling catch up.</div>
            </div>
            <div className="p-4 rounded-xl glass border-l-2 border-brand-purple">
              <div className="flex items-center gap-2 mb-1"><Layers className="w-4 h-4 text-brand-purple" /><span className="text-xs uppercase tracking-wider text-brand-purple">Proof</span></div>
              <div className="text-sm">Lead with 70% onboarding time reduction case studies from peer companies.</div>
            </div>
            <div className="p-4 rounded-xl glass border-l-2 border-brand-green">
              <div className="flex items-center gap-2 mb-1"><Sparkles className="w-4 h-4 text-brand-green" /><span className="text-xs uppercase tracking-wider text-brand-green">Message</span></div>
              <div className="text-sm">"Built by HR leaders, powered by AI. Not bolted on ΓÇö born AI-native."</div>
            </div>
          </div>
        </Section>
      </div>
    </>
  );
}
