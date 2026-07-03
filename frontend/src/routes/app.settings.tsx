import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/ui-kit";

export const Route = createFileRoute("/app/settings")({ component: SettingsPage });

function SettingsPage() {
  return (
    <>
      <PageHeader eyebrow="Workspace" title="Settings" description="Configure your workspace, integrations, and AI preferences." />
      <div className="grid grid-cols-2 gap-6">
        <Section title="Workspace">
          {[{ l: "Organization", v: "Acme HR Inc." }, { l: "Plan", v: "Enterprise ┬╖ $2,499/mo" }, { l: "Seats", v: "24 / 50" }, { l: "Region", v: "us-east-1" }].map(r => (
            <div key={r.l} className="flex justify-between py-2.5 border-b border-white/5 last:border-0 text-sm"><span className="text-muted-foreground">{r.l}</span><span className="font-medium">{r.v}</span></div>
          ))}
        </Section>
        <Section title="AI Engine">
          {[{ l: "Default Model", v: "Nexus-12 (multi-modal)" }, { l: "Confidence Threshold", v: "85%" }, { l: "Auto-apply Recommendations", v: "Off" }, { l: "Data Refresh", v: "Hourly" }].map(r => (
            <div key={r.l} className="flex justify-between py-2.5 border-b border-white/5 last:border-0 text-sm"><span className="text-muted-foreground">{r.l}</span><span className="font-medium">{r.v}</span></div>
          ))}
        </Section>
        <Section title="Integrations">
          <div className="grid grid-cols-2 gap-2">
            {["Salesforce", "HubSpot", "LinkedIn Ads", "Google Ads", "Meta Ads", "Workday", "Slack", "Segment"].map(i => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5">
                <span className="text-sm">{i}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-green/20 text-brand-green">connected</span>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Notifications">
          {["New high-intent leads", "ROI alerts", "Weekly digest", "Competitor activity"].map(n => (
            <label key={n} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0 text-sm cursor-pointer">
              <span>{n}</span>
              <span className="w-10 h-5 rounded-full bg-brand-blue relative"><span className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white" /></span>
            </label>
          ))}
        </Section>
      </div>
    </>
  );
}
