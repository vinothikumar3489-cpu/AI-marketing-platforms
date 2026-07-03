import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/ui-kit";
import { channels } from "@/lib/sample-data";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";
import { Radio } from "lucide-react";

export const Route = createFileRoute("/app/channels")({ component: ChannelsPage });

function ChannelsPage() {
  const totalBudget = 280000;
  return (
    <>
      <PageHeader
        eyebrow="Stage 7 / 12"
        title="Channel Recommendation Engine"
        description="Optimal budget allocation across paid, owned, and earned channels."
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="glass rounded-2xl p-5"><div className="text-xs uppercase tracking-wider text-muted-foreground">Total Budget</div><div className="text-3xl font-display font-bold mt-1">${(totalBudget/1000).toFixed(0)}K</div><div className="text-[11px] text-muted-foreground">monthly</div></div>
        <div className="glass rounded-2xl p-5"><div className="text-xs uppercase tracking-wider text-muted-foreground">Avg CPL</div><div className="text-3xl font-display font-bold mt-1">$36</div><div className="text-[11px] text-brand-green">-22% vs benchmark</div></div>
        <div className="glass rounded-2xl p-5"><div className="text-xs uppercase tracking-wider text-muted-foreground">Forecast Leads</div><div className="text-3xl font-display font-bold mt-1">7,800</div><div className="text-[11px] text-muted-foreground">over 30 days</div></div>
        <div className="glass rounded-2xl p-5"><div className="text-xs uppercase tracking-wider text-muted-foreground">Forecast ROI</div><div className="text-3xl font-display font-bold mt-1 text-brand-green">5.4x</div></div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <Section title="Budget Allocation">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={channels} dataKey="budget" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={3}>
                {channels.map((c, i) => <Cell key={i} fill={c.color as string} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "rgba(20,20,30,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </Section>
        <Section title="ROI Forecast by Channel">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={channels}>
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={10} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
              <Tooltip contentStyle={{ background: "rgba(20,20,30,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
              <Bar dataKey="roi" radius={[8,8,0,0]}>{channels.map((c,i)=><Cell key={i} fill={c.color as string} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>

      <Section title="Channel Performance Detail">
        <div className="grid grid-cols-3 gap-4">
          {channels.map(c => (
            <div key={c.name} className="glass rounded-xl p-4 border-l-2" style={{ borderLeftColor: c.color as string }}>
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold flex items-center gap-2"><Radio className="w-4 h-4" style={{ color: c.color as string }} />{c.name}</div>
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
