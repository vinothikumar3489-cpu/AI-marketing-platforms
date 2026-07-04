import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader, StatCard, Section, ScoreBar } from "@/components/ui-kit";
import { Activity, Users, Target, TrendingUp, Brain, ArrowRight, Sparkles } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { perfSeries, markets, channels, personas, roiRecs, pipelineSteps } from "@/lib/sample-data";
import { createBlankProject } from "@/lib/project-store";

export const Route = createFileRoute("/app/")({ component: Dashboard });

function Dashboard() {
  const navigate = useNavigate();
  const startNewAnalysis = () => {
    createBlankProject();
    navigate({ to: "/app/product" });
  };

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

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Pipeline Value" value="$4.82M" sub="+18.2% vs last month" accent="blue" icon={<TrendingUp className="w-4 h-4" />} />
        <StatCard label="Avg Intent Score" value="87" sub="High purchase readiness" accent="green" icon={<Target className="w-4 h-4" />} />
        <StatCard label="Active Personas" value="5" sub="2 newly identified" accent="purple" icon={<Users className="w-4 h-4" />} />
        <StatCard label="AI Confidence" value="96%" sub="12 models ┬╖ 240k signals" accent="cyan" icon={<Brain className="w-4 h-4" />} />
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="col-span-2 glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold">Performance Trajectory</h2>
              <p className="text-xs text-muted-foreground">CAC vs LTV across last 7 months</p>
            </div>
            <div className="flex gap-2 text-[11px]">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-brand-blue" /> CAC</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-brand-green" /> LTV</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={perfSeries}>
              <defs>
                <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.68 0.20 250)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="oklch(0.68 0.20 250)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g2" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.75 0.20 155)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="oklch(0.75 0.20 155)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" fontSize={11} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
              <Tooltip contentStyle={{ background: "rgba(20,20,30,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
              <Area type="monotone" dataKey="cac" stroke="oklch(0.68 0.20 250)" fill="url(#g1)" strokeWidth={2} />
              <Area type="monotone" dataKey="ltv" stroke="oklch(0.75 0.20 155)" fill="url(#g2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-2xl p-6">
          <h2 className="font-semibold mb-1">Channel Mix</h2>
          <p className="text-xs text-muted-foreground mb-3">Recommended budget allocation</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={channels} dataKey="budget" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {channels.map((c, i) => <Cell key={i} fill={c.color as string} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "rgba(20,20,30,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1.5 mt-2 text-[11px]">
            {channels.map(c => (
              <div key={c.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: c.color as string }} />
                <span className="truncate text-muted-foreground">{c.name}</span>
                <span className="ml-auto font-medium">{c.budget}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <Section title="Top Markets" description="Ranked by AI market-fit score">
          <div className="space-y-3">
            {markets.slice(0,5).map(m => (
              <div key={m.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{m.name}</span>
                  <span className="text-brand-cyan font-medium">{m.fit}%</span>
                </div>
                <ScoreBar value={m.fit} color="blue" />
              </div>
            ))}
          </div>
        </Section>

        <Section title="Top ICP Personas" description="Highest intent buyers">
          <div className="space-y-3">
            {personas.slice(0,4).map(p => (
              <div key={p.name} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                <div>
                  <div className="text-sm font-medium">{p.title}</div>
                  <div className="text-[11px] text-muted-foreground">{p.channels?.[0]}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-brand-green">{p.intent}</div>
                  <div className="text-[10px] text-muted-foreground">intent</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="AI Recommendations" description="Live optimization actions">
          <div className="space-y-2">
            {roiRecs.slice(0,4).map((r, i) => (
              <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/5">
                <div className="flex justify-between gap-2">
                  <div className="text-sm font-medium leading-snug">{r.action}</div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-green/20 text-brand-green shrink-0 h-fit">{r.confidence}%</span>
                </div>
                <div className="text-[11px] text-brand-cyan mt-1">{r.impact}</div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section title="AI Workflow Pipeline" description="End-to-end intelligence flow ΓÇö all systems active">
        <div className="flex flex-wrap gap-2 items-center">
          {pipelineSteps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className="px-3 py-2 rounded-lg glass text-xs font-medium border-l-2 border-brand-cyan flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
                {s}
              </div>
              {i < pipelineSteps.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
            </div>
          ))}
        </div>
      </Section>

      <Section title="AI Assistant" description="Ask anything about your market, audience or strategy">
        <div className="flex gap-2 mb-4">
          <input
            defaultValue="What market should I target next?"
            className="flex-1 h-11 px-4 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-brand-blue/50"
          />
          <button className="px-5 h-11 rounded-lg gradient-brand text-white text-sm font-medium flex items-center gap-2">
            <Brain className="w-4 h-4" /> Ask AI
          </button>
        </div>
        <div className="glass rounded-xl p-4 border-l-2 border-brand-purple">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg gradient-brand grid place-items-center shrink-0"><Activity className="w-4 h-4 text-white" /></div>
            <div className="text-sm leading-relaxed">
              Based on your product profile and current pipeline, <b className="text-brand-cyan">Manufacturing</b> ranks highest with a 91% market fit and $6.2B SAM. Three Series B+ manufacturers hired HRIS managers this week ΓÇö 92 intent score. I recommend launching a targeted LinkedIn ABM sequence with a $48K budget; projected pipeline impact: <b className="text-brand-green">+$1.2M in 60 days</b>.
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
