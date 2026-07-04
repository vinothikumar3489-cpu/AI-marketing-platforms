import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, ScoreBar } from "@/components/ui-kit";
import { personas } from "@/lib/sample-data";
import { User, Target, MapPin, Briefcase } from "lucide-react";

export const Route = createFileRoute("/app/audience")({ component: AudiencePage });

function AudiencePage() {
  return (
    <>
      <PageHeader
        eyebrow="Stage 3 / 12"
        title="Audience Intelligence Engine"
        description="5 AI-generated ICP personas with goals, pains, triggers, and preferred channels."
      />
      <div className="grid grid-cols-2 gap-5">
        {(personas || []).map((p) => (
          <div key={p.name} className="glass-strong rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-brand-purple/20 blur-3xl" />
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl gradient-brand grid place-items-center"><User className="w-6 h-6 text-white" /></div>
                  <div>
                    <div className="font-display font-bold text-lg">{p.title}</div>
                    <div className="text-xs text-muted-foreground">{p.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-display font-bold text-brand-green">{p.intent}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">intent</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-4">
                <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{p.company}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.location}</span>
                <span>Age {p.age}</span>
              </div>

              <div className="mb-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Intent Score</div>
                <ScoreBar value={p.intent} color="green" />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-brand-cyan mb-1">Goals</div>
                  <ul className="space-y-0.5 text-muted-foreground">{(p.goals || []).map(g => <li key={g}>ΓÇó {g}</li>)}</ul>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-brand-purple mb-1">Pain Points</div>
                  <ul className="space-y-0.5 text-muted-foreground">{(p.pains || []).map(g => <li key={g}>ΓÇó {g}</li>)}</ul>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-brand-green mb-1">KPIs</div>
                  <ul className="space-y-0.5 text-muted-foreground">{(p.kpis || []).map(g => <li key={g}>ΓÇó {g}</li>)}</ul>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-brand-blue mb-1">Buying Triggers</div>
                  <ul className="space-y-0.5 text-muted-foreground">{(p.triggers || []).map(g => <li key={g}>ΓÇó {g}</li>)}</ul>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <div className="text-muted-foreground">Preferred Channels:</div>
                <div className="flex gap-1.5">
                  {(p.channels || []).map(c => <span key={c} className="px-2 py-0.5 rounded-md bg-brand-blue/20 text-brand-cyan">{c}</span>)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
