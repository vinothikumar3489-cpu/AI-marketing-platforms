import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/ui-kit";

export const Route = createFileRoute("/app/content")({ component: ContentPage });

function ContentPage() {
  return (
    <>
      <PageHeader
        eyebrow="Stage 9 / 12"
        title="Content Generation Studio"
        description="AI-generated LinkedIn posts, cold emails, ad copy, headlines, and sales scripts."
      />
      <Section title="Content Library">
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-muted-foreground">No verified data available. Run an analysis to get started.</p>
        </div>
      </Section>
    </>
  );
}
