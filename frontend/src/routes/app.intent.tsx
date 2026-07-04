import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, ScoreBar } from "@/components/ui-kit";
import { intentSignals } from "@/lib/sample-data";
import { Target, Zap, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/app/intent")({ component: IntentPage });

function Gauge({ value }: { value: number }) {
  const r = 56, c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  return (
    <div className="relative w-36 h-36">
      <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
        <circle cx="70" cy="70" r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="10" fill="none" />
        <circle cx="70" cy="70" r={r} stroke="url(#gg)" strokeWidth="10" fill="none"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" />
        <defs>
          <linearGradient id="gg" x1="0" x2="1">
            <stop offset="0%" stopColor="oklch(0.75 0.20 155)" />
            <stop offset="100%" stopColor="oklch(0.80 0.16 200)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-3xl font-display font-bold">{value}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">intent</div>
        </div>
      </div>
    </div>
  );
}

function IntentPage() {
  return (
    <>
      <PageHeader
        eyebrow="Stage 4 / 12"
        title="Buying Intent Prediction Engine"
        description="Live signals scored 0ΓÇô100 for purchase readiness and lead priority."
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="glass rounded-2xl p-5 flex items-center gap-4">
          <Gauge value={87} />
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Overall Score</div>
            <div className="text-sm font-medium mt-1">High Readiness</div>
            <div className="text-[11px] text-brand-green mt-0.5">Γåæ 12 pts WoW</div>
          </div>
        </div>
        <div className="glass rounded-2xl p-5 col-span-3 grid grid-cols-3 gap-4">
          <div>
            <Target className="w-5 h-5 text-brand-blue mb-2" />
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Active Signals</div>
            <div className="text-3xl font-display font-bold mt-1">5,615</div>
            <div className="text-[11px] text-muted-foreground">across 6 trigger types</div>
          </div>
          <div>
            <Zap className="w-5 h-5 text-brand-purple mb-2" />
            <div className="text-xs uppercase tracking-wider text-muted-foreground">High-Priority Leads</div>
            <div className="text-3xl font-display font-bold mt-1">412</div>
            <div className="text-[11px] text-brand-cyan">Intent ΓëÑ 85</div>
          </div>
          <div>
            <TrendingUp className="w-5 h-5 text-brand-green mb-2" />
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Pipeline Velocity</div>
            <div className="text-3xl font-display font-bold mt-1">+34%</div>
            <div className="text-[11px] text-muted-foreground">vs 30-day avg</div>
          </div>
        </div>
      </div>

      <Section title="Trigger Events" description="Live intent signals across the market">
        <div className="space-y-3">
          {intentSignals.map(s => (
            <div key={s.signal} className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center gap-4">
              <div className="flex-1">
                <div className="font-medium">{s.signal}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.count.toLocaleString()} matching companies</div>
                <div className="mt-2 max-w-md"><ScoreBar value={s.score} color={s.score >= 85 ? "green" : "blue"} /></div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-display font-bold text-brand-cyan">{s.score}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">intent</div>
              </div>
              <button className="px-3 py-1.5 rounded-lg gradient-brand text-white text-xs">Activate</button>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
