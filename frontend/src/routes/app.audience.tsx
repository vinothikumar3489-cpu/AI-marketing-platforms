import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/ui-kit";
import { personas, NO_DATA } from "@/lib/sample-data";

export const Route = createFileRoute("/app/audience")({ component: AudiencePage });

function AudiencePage() {
  const hasData = personas && personas.length > 0;

  if (!hasData) {
    return (
      <>
        <PageHeader
          eyebrow="Stage 3 / 12"
          title="Audience Intelligence Engine"
          description="AI-generated ICP personas with goals, pains, triggers, and preferred channels."
        />
        <Section title="Persona Analysis">
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-muted-foreground">{NO_DATA}. Run an analysis to get started.</p>
          </div>
        </Section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Stage 3 / 12"
        title="Audience Intelligence Engine"
        description="AI-generated ICP personas with goals, pains, triggers, and preferred channels."
      />
      <div className="grid grid-cols-2 gap-5">
        {personas.map((p) => (
          <div key={p.name} className="glass-strong rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-brand-purple/20 blur-3xl" />
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl gradient-brand grid place-items-center"><div className="w-6 h-6 text-white" /></div>
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
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
