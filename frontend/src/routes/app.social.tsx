import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/ui-kit";

export const Route = createFileRoute("/app/social")({ component: SocialPage });

function SocialPage() {
  return (
    <>
      <PageHeader eyebrow="Social Listening" title="Brand & Trend Listening" description="Track mention themes, sentiment, hashtag opportunities, creator ideas, and viral topics for the selected product." />
      <Section title="Social Listening">
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-muted-foreground">No verified data available. Run an analysis to get started.</p>
        </div>
      </Section>
    </>
  );
}
