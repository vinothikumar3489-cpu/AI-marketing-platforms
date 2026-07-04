import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, ScoreBar } from "@/components/ui-kit";
import { competitors } from "@/lib/sample-data";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from "recharts";
import { Swords, Shield, Target } from "lucide-react";

export const Route = createFileRoute("/app/competitors")({ component: CompetitorsPage });

const radar = [
  { axis: "Features", us: 88, market: 72 },
  { axis: "Pricing", us: 76, market: 70 },
  { axis: "AI Depth", us: 95, market: 58 },
  { axis: "Integrations", us: 82, market: 84 },
  { axis: "Support", us: 90, market: 75 },
  { axis: "Brand", us: 64, market: 80 },
];

function CompetitorsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Stage 5 / 12"
        title="Competitor Intelligence Engine"
        description="Real-time competitor discovery, pricing, sentiment, and market gap analysis."
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="glass rounded-2xl p-5"><Swords className="w-5 h-5 text-brand-purple mb-2" /><div className="text-xs uppercase text-muted-foreground tracking-wider">Competitors Tracked</div><div className="text-3xl font-display font-bold">{competitors.length + 8}</div></div>
        <div className="glass rounded-2xl p-5"><Shield className="w-5 h-5 text-brand-blue mb-2" /><div className="text-xs uppercase text-muted-foreground tracking-wider">Share of Voice</div><div className="text-3xl font-display font-bold">14.2%</div><div className="text-[11px] text-brand-green">Γåæ 2.1pts MoM</div></div>
        <div className="glass rounded-2xl p-5"><Target className="w-5 h-5 text-brand-green mb-2" /><div className="text-xs uppercase text-muted-foreground tracking-wider">Opportunity Score</div><div className="text-3xl font-display font-bold">82</div></div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="col-span-2">
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
                      <td className="p-3">
                        <div className="flex items-center gap-2"><div className="w-16"><ScoreBar value={c.sentiment} color="green" /></div><span className="text-xs">{c.sentiment}</span></div>
                      </td>
                      <td className="p-3 text-brand-green text-xs">{c.strength}</td>
                      <td className="p-3 text-brand-purple text-xs">{c.weakness}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
        <Section title="Capability Radar" description="You vs market avg">
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radar}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis dataKey="axis" tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }} />
              <PolarRadiusAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} />
              <Radar name="You" dataKey="us" stroke="oklch(0.68 0.20 250)" fill="oklch(0.68 0.20 250)" fillOpacity={0.45} />
              <Radar name="Market" dataKey="market" stroke="oklch(0.68 0.24 295)" fill="oklch(0.68 0.24 295)" fillOpacity={0.25} />
              <Tooltip contentStyle={{ background: "rgba(20,20,30,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
            </RadarChart>
          </ResponsiveContainer>
        </Section>
      </div>

      <Section title="Battlecard: Rippling" description="Auto-generated win/loss framework">
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-brand-green/10 border border-brand-green/30">
            <div className="text-xs uppercase tracking-wider text-brand-green mb-2">Why We Win</div>
            <ul className="text-sm space-y-1.5"><li>ΓÇó 3x faster onboarding</li><li>ΓÇó Native AI retention model</li><li>ΓÇó 40% lower TCO</li></ul>
          </div>
          <div className="p-4 rounded-xl bg-brand-purple/10 border border-brand-purple/30">
            <div className="text-xs uppercase tracking-wider text-brand-purple mb-2">Why They Win</div>
            <ul className="text-sm space-y-1.5"><li>ΓÇó Broader product suite</li><li>ΓÇó Stronger brand recall</li><li>ΓÇó Larger partner network</li></ul>
          </div>
          <div className="p-4 rounded-xl bg-brand-blue/10 border border-brand-blue/30">
            <div className="text-xs uppercase tracking-wider text-brand-blue mb-2">Counter Pitch</div>
            <ul className="text-sm space-y-1.5"><li>ΓÇó Lead with AI ROI calculator</li><li>ΓÇó Offer 30-day migration credit</li><li>ΓÇó Show retention case studies</li></ul>
          </div>
        </div>
      </Section>
    </>
  );
}
