import { Section } from "@/components/ui-kit";
import { renderSafeValue } from '../../lib/normalizers';

const sample = {
  positioningStatement: "A smarter acquisition platform for teams that need fast, signal-driven growth.",
  differentiation: "Deep AI market context plus one-click campaign recommendations.",
  messagingAngles: ["ROI-first automation", "Buyer intent optimization", "Competitive clarity"],
  competitiveGaps: "Most tools focus on reporting; we focus on action.",
  marketWedge: "AI-driven acquisition engine for mid-market SaaS." ,
};

export function PositioningEngineModule() {
  return (
    <div className="space-y-6">
      <Section title="Positioning Engine" description="Sample positioning guidance that is easy to replace later.">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Positioning Statement</div>
            <div className="text-sm text-foreground mt-2">{renderSafeValue(sample.positioningStatement)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Differentiation</div>
            <div className="text-sm text-foreground mt-2">{renderSafeValue(sample.differentiation)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Messaging Angles</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {sample.messagingAngles.map((item) => (
                <div key={renderSafeValue(item)} className="rounded-2xl bg-white/5 p-3 text-sm">{renderSafeValue(item)}</div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Competitive Gaps</div>
            <div className="text-sm text-foreground mt-2">{renderSafeValue(sample.competitiveGaps)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Market Wedge</div>
            <div className="text-sm text-foreground mt-2">{renderSafeValue(sample.marketWedge)}</div>
          </div>
        </div>
      </Section>
    </div>
  );
}
