
import { useEffect, useState } from "react";
import { AlertCircle, Sparkles } from "lucide-react";
import { Section } from "@/components/ui-kit";
import { getActiveProject } from "@/lib/project-store";
import { api } from "@/lib/api";

const emptyForm = {
  productName: "",
  industry: "",
  targetCountry: "",
  ageGroup: "",
  targetAudience: "",
  businessStage: ""
};

export function AudienceIntelligenceModule() {
  const [form, setForm] = useState(emptyForm);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const project = typeof window !== "undefined" ? getActiveProject() : null;
  const chatId = project?.id || "";

  useEffect(() => {
    if (!chatId) return;
    (async () => {
      try {
        const resp = await api.get(`/api/chats/${chatId}/product-intelligence`);
        if (resp?.data?.success && resp.data.audienceIntelligence) {
          setData(resp.data.audienceIntelligence);
        }
      } catch (e) {
        // silent
      }
    })();
  }, [chatId]);

  const run = async () => {
    if (!chatId) return alert("Select or create a project first.");
    setLoading(true);
    setError(null);
    try {
      const resp = await api.post(`/api/chats/${chatId}/product-intelligence/audience/run`, form);
      if (resp?.data?.success) {
        setData(resp.data.audienceIntelligence);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Failed to run audience intelligence";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Section
        title="Audience Intelligence"
        description="Enter product details, run audience analysis, and save the result for your workflow."
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Product Name</label>
            <input
              value={form.productName}
              onChange={(e) => setForm({ ...form, productName: e.target.value })}
              placeholder="Resume Builder"
              className="w-full h-12 px-4 rounded-2xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-brand-blue/50"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Industry</label>
            <input
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              placeholder="Career Technology"
              className="w-full h-12 px-4 rounded-2xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-brand-blue/50"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Target Country</label>
            <input
              value={form.targetCountry}
              onChange={(e) => setForm({ ...form, targetCountry: e.target.value })}
              placeholder="India"
              className="w-full h-12 px-4 rounded-2xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-brand-blue/50"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Age Group</label>
            <input
              value={form.ageGroup}
              onChange={(e) => setForm({ ...form, ageGroup: e.target.value })}
              placeholder="18-25"
              className="w-full h-12 px-4 rounded-2xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-brand-blue/50"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Business Stage</label>
            <input
              value={form.businessStage}
              onChange={(e) => setForm({ ...form, businessStage: e.target.value })}
              placeholder="Early-stage SaaS"
              className="w-full h-12 px-4 rounded-2xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-brand-blue/50"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-sm font-semibold mb-2">Target Audience</label>
            <textarea
              value={form.targetAudience}
              onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
              rows={3}
              placeholder="Students and freshers"
              className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-brand-blue/50"
            />
          </div>
        </div>
        {error && (
          <div className="mt-4 rounded-2xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        <div className="flex justify-end mt-6">
          <button
            onClick={run}
            disabled={loading || !form.productName.trim()}
            className="px-6 h-11 rounded-xl gradient-brand text-white font-semibold flex items-center gap-2 glow-blue disabled:opacity-60"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? "Running Analysis..." : "Run Audience Intelligence"}
          </button>
        </div>
      </Section>

      {data && (
        <div className="space-y-6">
          {data.fallbackUsed && (
            <div className="rounded-2xl bg-yellow-500/10 border border-yellow-500/20 p-4 text-sm text-yellow-200 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Generated using fallback analysis (AI providers unavailable).
            </div>
          )}

          <Section title="Customer Personas">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(data.customerPersonas || []).map((persona: any, index: number) => (
                <div key={index} className="rounded-2xl bg-white/5 border border-white/10 p-5">
                  <div className="text-lg font-semibold mb-2">{persona.name}</div>
                  <div className="text-sm text-muted-foreground">{persona.description}</div>
                </div>
              ))}
            </div>
          </Section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section title="Demographics">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {(data.demographics || []).map((item: string, i: number) => (
                  <li key={i} className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    {item}
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="Psychographics">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {(data.psychographics || []).map((item: string, i: number) => (
                  <li key={i} className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    {item}
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section title="Buying Motivations">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {(data.buyingMotivations || []).map((item: string, i: number) => (
                  <li key={i} className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    {item}
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="Pain Points">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {(data.painPoints || []).map((item: string, i: number) => (
                  <li key={i} className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    {item}
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          <Section title="Preferred Channels">
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {(data.preferredChannels || []).map((channel: string, index: number) => (
                <li key={index} className="rounded-2xl bg-white/5 border border-white/10 p-4 text-sm">
                  {channel}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Content Ideas">
            <ul className="space-y-2 text-sm text-muted-foreground">
              {(data.contentIdeas || []).map((idea: string, i: number) => (
                <li key={i} className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  {idea}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Messaging Strategy">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-sm text-muted-foreground">
              {data.messagingStrategy || "No strategy available yet."}
            </div>
          </Section>

          <Section title="Final Recommendation">
            <div className="rounded-3xl bg-white/5 border border-white/10 p-6 text-sm text-muted-foreground">
              {data.finalRecommendation || "Run audience intelligence to get a recommendation."}
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

export default AudienceIntelligenceModule;
