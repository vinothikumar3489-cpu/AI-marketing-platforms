import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, StatCard } from "@/components/ui-kit";
import { perfSeries, channels } from "@/lib/sample-data";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, BarChart, Bar, Cell } from "recharts";

export const Route = createFileRoute("/app/analytics")({ component: AnalyticsPage });

function AnalyticsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Stage 10 / 12"
        title="Performance Analytics Engine"
        description="CAC, LTV, ROAS, conversion, channel and attribution analytics ΓÇö all in one view."
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="CAC" value="$262" sub="Γåô 38% YoY" accent="blue" />
        <StatCard label="LTV" value="$5,340" sub="Γåæ 27% YoY" accent="green" />
        <StatCard label="ROAS" value="5.1x" sub="Best-in-class" accent="purple" />
        <StatCard label="Conv Rate" value="3.7%" sub="Γåæ 1.8 pts" accent="cyan" />
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="col-span-2 glass rounded-2xl p-6">
          <h2 className="font-semibold mb-3">CAC / LTV / ROAS Trend</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={perfSeries}>
              <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" fontSize={11} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
              <Tooltip contentStyle={{ background: "rgba(20,20,30,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line dataKey="cac" stroke="oklch(0.68 0.20 250)" strokeWidth={2} dot={{ r: 3 }} />
              <Line dataKey="ltv" stroke="oklch(0.75 0.20 155)" strokeWidth={2} dot={{ r: 3 }} />
              <Line dataKey="roas" stroke="oklch(0.68 0.24 295)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <Section title="Lead Quality">
          {[{ l: "Hot (Intent ΓëÑ 85)", v: 32, c: "var(--brand-green)" }, { l: "Warm (60-84)", v: 41, c: "var(--brand-cyan)" }, { l: "Cool (40-59)", v: 18, c: "var(--brand-blue)" }, { l: "Cold (<40)", v: 9, c: "var(--brand-purple)" }].map(b => (
            <div key={b.l} className="mb-3">
              <div className="flex justify-between text-xs mb-1"><span>{b.l}</span><span className="font-bold">{b.v}%</span></div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${b.v}%`, background: b.c }} /></div>
            </div>
          ))}
        </Section>
      </div>

      <Section title="Channel Performance (Conversion %)">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={channels}>
            <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={11} />
            <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
            <Tooltip contentStyle={{ background: "rgba(20,20,30,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
            <Bar dataKey="conv" radius={[8,8,0,0]}>{channels.map((c,i)=><Cell key={i} fill={c.color as string} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </Section>

      <Section title="Attribution Analytics" description="Multi-touch attribution across journey">
        <div className="grid grid-cols-5 gap-3">
          {[{ s: "First Touch", v: "LinkedIn", p: "34%" }, { s: "Lead Touch", v: "SEO", p: "22%" }, { s: "MQL Touch", v: "Webinar", p: "18%" }, { s: "SQL Touch", v: "Cold Email", p: "15%" }, { s: "Closed Touch", v: "Sales Call", p: "11%" }].map(a => (
            <div key={a.s} className="glass rounded-xl p-4 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{a.s}</div>
              <div className="font-semibold mt-1">{a.v}</div>
              <div className="text-2xl font-display font-bold text-brand-cyan mt-1">{a.p}</div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
