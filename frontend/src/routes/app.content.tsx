import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/ui-kit";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast, Toaster } from "sonner";

export const Route = createFileRoute("/app/content")({ component: ContentPage });

const linkedinPosts = [
  "Most HR teams spend 60% of their time on busywork. AI changes that.\n\nWe just helped a 2,000-person company cut onboarding time by 70% ΓÇö using nothing but workflow automation and intent-based prompts.\n\nThe ROI? 4.2 weeks payback. Here's the playbook Γåô",
  "Hot take: Your HRIS is a database. It should be a decision engine.\n\nWhen we connected our retention model to Workday, we predicted 83% of the resignations that happened in Q1 ΓÇö 30 days early.\n\nThis is what AI-native HR looks like.",
];

const coldEmails = [
  { subject: "Saw your team is hiring 12 HRIS roles", body: "Hi {{firstName}},\n\nNoticed Acme Corp is scaling HR ops fast ΓÇö 12 new HRIS hires in the last 90 days.\n\nWe help similar companies (think Lattice-stage) cut onboarding time 70% without adding headcount. 3-minute video showing exactly how:\n\n[link]\n\nWorth 15 min next week?\n\nΓÇö Alex" },
  { subject: "{{company}} + AI-first HR", body: "Hi {{firstName}},\n\nQuick one ΓÇö we just published a benchmark on AI HR adoption across {{industry}}, and {{company}} matched 4 of the 5 readiness criteria.\n\nWant me to send the report + a 1-page custom analysis?\n\nΓÇö Alex" },
];

const adCopy = [
  { p: "LinkedIn Single Image", t: "Stop drowning in HR busywork.\nAI-first HR for teams of 200-5,000.\nSee a 10-min demo." },
  { p: "Google Search", t: "AI HR Automation | 70% Faster Onboarding\nTrusted by 400+ growing companies. Free 30-day pilot. No credit card." },
  { p: "Meta Carousel", t: "Slide 1: 'Your CHRO deserves better tools.'\nSlide 2: 'AI catches retention risk 30 days early.'\nSlide 3: 'See it live ΓåÆ'" },
];

const headlines = [
  "The AI-first HR platform for growing companies.",
  "Cut HR busywork by 70%. Keep your best people.",
  "Onboard faster. Retain longer. With AI.",
];

const scripts = [
  { name: "Discovery Opener", t: "Hi {{name}}, thanks for the time. Before I dive in ΓÇö what's the #1 HR bottleneck slowing your team down right now? I'll tailor the demo around that." },
  { name: "Objection: Pricing", t: "Totally fair. Most customers we work with start at $1.2K/mo and see payback in 90 days through saved HR hours alone. Want to walk through a custom ROI calc with your team's numbers?" },
];

function CopyBlock({ title, content }: { title: string; content: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="glass rounded-xl p-4 mb-3 relative group">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-wider text-brand-cyan">{title}</div>
        <button
          onClick={() => { navigator.clipboard.writeText(content); setCopied(true); toast.success("Copied to clipboard"); setTimeout(() => setCopied(false), 1500); }}
          className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-xs flex items-center gap-1"
        >
          {copied ? <Check className="w-3 h-3 text-brand-green" /> : <Copy className="w-3 h-3" />} {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground/90">{content}</pre>
    </div>
  );
}

function ContentPage() {
  return (
    <>
      <Toaster theme="dark" position="bottom-right" />
      <PageHeader
        eyebrow="Stage 9 / 12"
        title="Content Generation Studio"
        description="AI-generated LinkedIn posts, cold emails, ad copy, headlines, and sales scripts."
      />

      <div className="grid grid-cols-2 gap-6">
        <div>
          <Section title="LinkedIn Posts">
            {linkedinPosts.map((p, i) => <CopyBlock key={i} title={`Post #${i+1}`} content={p} />)}
          </Section>
          <Section title="Landing Page Headlines">
            {headlines.map((h, i) => <CopyBlock key={i} title={`Variant ${String.fromCharCode(65+i)}`} content={h} />)}
          </Section>
        </div>
        <div>
          <Section title="Cold Emails">
            {coldEmails.map((e, i) => <CopyBlock key={i} title={`Subject: ${e.subject}`} content={e.body} />)}
          </Section>
          <Section title="Ad Copy">
            {adCopy.map((a, i) => <CopyBlock key={i} title={a.p} content={a.t} />)}
          </Section>
          <Section title="Sales Outreach Scripts">
            {scripts.map((s, i) => <CopyBlock key={i} title={s.name} content={s.t} />)}
          </Section>
        </div>
      </div>
    </>
  );
}
