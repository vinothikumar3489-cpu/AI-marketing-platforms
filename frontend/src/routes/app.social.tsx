import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section, StatCard } from "@/components/ui-kit";
import { MessageCircle, Hash, Smile, Users } from "lucide-react";
import { getActiveProject } from "@/lib/project-store";

export const Route = createFileRoute("/app/social")({ component: SocialPage });

function SocialPage() {
  const project = getActiveProject();
  const product = project?.productName || "your product";
  const tags = hashtags(product);
  return (
    <>
      <PageHeader eyebrow="Social Listening" title="Brand & Trend Listening" description="Track mention themes, sentiment, hashtag opportunities, creator ideas, and viral topics for the selected product." />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Brand Mentions" value="1.2K" sub="Sample default data" icon={<MessageCircle className="w-4 h-4" />} accent="blue" />
        <StatCard label="Sentiment Score" value="78%" sub="Mostly positive" icon={<Smile className="w-4 h-4" />} accent="green" />
        <StatCard label="Trending Hashtags" value={tags.length.toString()} sub="Ready for campaign" icon={<Hash className="w-4 h-4" />} accent="purple" />
        <StatCard label="Influencer Ideas" value="12" sub="Micro creators" icon={<Users className="w-4 h-4" />} accent="cyan" />
      </div>
      <Section title="Trending Hashtags" description={`Suggested hashtags for ${product}.`}><div className="flex flex-wrap gap-2">{tags.map(t => <span key={t} className="px-3 py-1.5 rounded-lg glass text-sm">#{t}</span>)}</div></Section>
      <Section title="Mention Themes"><div className="grid gap-3 md:grid-cols-3">{["Pricing questions", "Feature comparison", "Success stories"].map(t => <div key={t} className="glass rounded-2xl p-4"><div className="font-semibold">{t}</div><div className="text-xs text-muted-foreground mt-2">Use this as a content and response opportunity.</div></div>)}</div></Section>
      <Section title="Viral Topic Suggestions"><ul className="space-y-2 text-sm text-muted-foreground"><li>ΓÇó Short comparison video: why choose {product}</li><li>ΓÇó Customer transformation story</li><li>ΓÇó Behind-the-scenes product demo</li></ul></Section>
    </>
  );
}
function hashtags(product: string) {
  const p = product.toLowerCase();
  if (p.includes("resume")) return ["resumeai", "jobsearch", "freshersjobs", "careertips", "linkedinprofile", "atsresume"];
  if (p.includes("eco")) return ["ecobottle", "sustainableliving", "plasticfree", "ecofriendly", "reuse", "zerowaste"];
  if (p.includes("pos")) return ["restaurantpos", "cafebusiness", "restauranttech", "cloudpos", "kitchenorders", "foodbusiness"];
  return ["aitools", "growthmarketing", "startupgrowth", "automation", "saas", "productmarketing"];
}
