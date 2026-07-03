import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, ScoreBar } from "@/components/ui-kit";
import { markets } from "@/lib/sample-data";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { Globe, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/app/market")({ component: MarketPage });

function MarketPage() {
  return (
    <>
      <PageHeader
        eyebrow="Stage 2 / 12"
        title="Market Discovery Engine"
        description="AI-ranked markets by fit, TAM, SAM, and growth velocity."
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="glass rounded-2xl p-5">
          <Globe className="w-5 h-5 text-brand-blue mb-2" />
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Markets Analyzed</div>
          <div className="text-3xl font-display font-bold mt-1">38</div>
        </div>
        <div className="glass rounded-2xl p-5">
          <TrendingUp className="w-5 h-5 text-brand-green mb-2" />
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Total TAM</div>
          <div className="text-3xl font-display font-bold mt-1">$274B</div>
        </div>
        <div className="glass rounded-2xl p-5">
          <TrendingUp className="w-5 h-5 text-brand-purple mb-2" />
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Addressable SAM</div>
          <div className="text-3xl font-display font-bold mt-1">$34B</div>
        </div>
      </div>

      <Section title="Market Fit Ranking" description="Sorted by AI-computed product-market fit score">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={markets} layout="vertical" margin={{ left: 30 }}>
            <XAxis type="number" stroke="rgba(255,255,255,0.4)" fontSize={11} domain={[0,100]} />
            <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.6)" fontSize={12} width={130} />
            <Tooltip contentStyle={{ background: "rgba(20,20,30,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
            <Bar dataKey="fit" radius={[0,8,8,0]}>
              {markets.map((_, i) => <Cell key={i} fill={`url(#mg${i})`} />)}
            </Bar>
            <defs>
              {markets.map((_, i) => (
                <linearGradient key={i} id={`mg${i}`} x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="oklch(0.68 0.20 250)" />
                  <stop offset="100%" stopColor="oklch(0.68 0.24 295)" />
                </linearGradient>
              ))}
            </defs>
          </BarChart>
        </ResponsiveContainer>
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
                  <td className="p-3 w-64">
                    <div className="flex items-center gap-3">
                      <ScoreBar value={m.fit} color={m.fit >= 85 ? "green" : "blue"} />
                      <span className="text-xs w-8 text-right">{m.fit}%</span>
                    </div>
                  </td>
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

      <Section title="Opportunity Heatmap" description="Cross-segment density by fit ├ù growth">
        <div className="grid grid-cols-6 gap-1.5">
          {Array.from({ length: 48 }).map((_, i) => {
            const intensity = Math.random() * 0.9 + 0.1;
            return <div key={i} className="aspect-square rounded" style={{ background: `oklch(0.68 0.20 250 / ${intensity})` }} />;
          })}
        </div>
      </Section>
    </>
  );
}
