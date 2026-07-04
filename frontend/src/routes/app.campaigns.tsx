import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/ui-kit";
import { Download, Megaphone, Eye, Users, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/app/campaigns")({ component: CampaignsPage });

const stages = [
  { icon: Eye, name: "Awareness", color: "blue", channels: ["LinkedIn Thought Leadership", "SEO content", "Podcast sponsorships"], offers: ["State of AI HR Report", "Free Benchmark Calculator"], goal: "5M impressions" },
  { icon: Users, name: "Consideration", color: "purple", channels: ["LinkedIn Ads (ABM)", "Webinars", "Retargeting"], offers: ["AI HR Audit", "Live Product Demo"], goal: "12K MQLs" },
  { icon: CheckCircle2, name: "Decision", color: "green", channels: ["Sales Outreach", "Account Executive Calls", "Pilot Programs"], offers: ["30-day pilot", "Migration credit"], goal: "$2.4M pipeline" },
];

function CampaignsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Stage 8 / 12"
        title="Campaign Strategy Generator"
        description="Complete go-to-market strategy: messaging framework, offers, timeline, A/B tests."
        actions={<button className="px-4 h-10 rounded-lg gradient-brand text-white text-sm flex items-center gap-2"><Download className="w-4 h-4" /> Download Strategy</button>}
      />

      <Section title="Funnel Strategy" description="3-stage campaign architecture">
        <div className="grid grid-cols-3 gap-4">
          {stages.map(s => {
            const I = s.icon;
            return (
              <div key={s.name} className={`glass rounded-2xl p-5 border-t-4`} style={{ borderTopColor: `var(--brand-${s.color})` }}>
                <I className="w-6 h-6 mb-3" style={{ color: `var(--brand-${s.color})` }} />
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Stage</div>
                <div className="text-xl font-display font-bold mb-3">{s.name}</div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mt-3 mb-1">Channels</div>
                <ul className="text-sm space-y-0.5 mb-3">{s.channels.map(c => <li key={c}>ΓÇó {c}</li>)}</ul>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Offers</div>
                <ul className="text-sm space-y-0.5">{s.offers.map(c => <li key={c}>ΓåÆ {c}</li>)}</ul>
                <div className="mt-3 pt-3 border-t border-white/10 text-xs">Goal: <b className="text-brand-cyan">{s.goal}</b></div>
              </div>
            );
          })}
        </div>
      </Section>

      <div className="grid grid-cols-2 gap-6">
        <Section title="Messaging Framework">
          <div className="space-y-3 text-sm">
            <div className="p-3 rounded-lg bg-white/5"><div className="text-[10px] uppercase tracking-wider text-brand-cyan mb-1">Hero Message</div>The AI-first HR platform that pays for itself in 90 days.</div>
            <div className="p-3 rounded-lg bg-white/5"><div className="text-[10px] uppercase tracking-wider text-brand-cyan mb-1">Proof Point</div>Companies see 70% faster onboarding and 24% better retention.</div>
            <div className="p-3 rounded-lg bg-white/5"><div className="text-[10px] uppercase tracking-wider text-brand-cyan mb-1">Call to Action</div>Run your AI HR audit in 10 minutes. No credit card.</div>
          </div>
        </Section>

        <Section title="A/B Testing Ideas">
          <ul className="space-y-2 text-sm">
            {["Headline: 'Cut HR busywork 70%' vs 'AI HR for the modern team'", "CTA: 'Start free pilot' vs 'Run AI audit'", "Hero image: Product UI vs Customer logo wall", "Pricing: Per-seat vs platform fee", "Lead magnet: Report vs Calculator"].map(t => (
              <li key={t} className="p-3 rounded-lg bg-white/5 flex gap-2"><Megaphone className="w-4 h-4 text-brand-purple shrink-0 mt-0.5" /><span>{t}</span></li>
            ))}
          </ul>
        </Section>
      </div>

      <Section title="Campaign Timeline" description="12-week rollout">
        <div className="grid grid-cols-12 gap-1">
          {Array.from({ length: 12 }).map((_, i) => {
            const isAware = i < 4, isConsider = i >= 3 && i < 9, isDecide = i >= 7;
            return (
              <div key={i} className="space-y-1">
                <div className="text-[10px] text-muted-foreground text-center">W{i+1}</div>
                {isAware && <div className="h-6 rounded bg-brand-blue/60" title="Awareness" />}
                {isConsider && <div className="h-6 rounded bg-brand-purple/60" title="Consideration" />}
                {isDecide && <div className="h-6 rounded bg-brand-green/60" title="Decision" />}
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-4 text-xs">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-brand-blue/60" />Awareness</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-brand-purple/60" />Consideration</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-brand-green/60" />Decision</span>
        </div>
      </Section>
    </>
  );
}
