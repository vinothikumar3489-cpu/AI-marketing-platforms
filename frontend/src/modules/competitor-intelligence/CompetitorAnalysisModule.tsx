
import { useEffect, useState } from "react";
import { toast } from 'sonner';
import { AlertCircle, Sparkles } from "lucide-react";
import { Section } from "@/components/ui-kit";
import { getActiveProject } from "@/lib/project-store";
import { api } from "@/lib/api";
import { renderSafeValue } from '../../lib/normalizers';

const emptyForm = {
  productName: "",
  websiteUrl: "",
  industry: "",
  targetCountry: "",
  targetAudience: "",
  competitorUrls: ""
};

export function CompetitorAnalysisModule() {
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
        const resp = await api.get(`/api/chats/${chatId}/competitor-intelligence`);
        if (resp?.data?.success && resp.data.competitorAnalysis) {
          setData(resp.data.competitorAnalysis);
        }
      } catch (e) {
        // silent
      }
    })();
  }, [chatId]);

  const run = async () => {
    if (!chatId) return toast.error("Select or create a project first.");
    setLoading(true);
    setError(null);
    try {
      const resp = await api.post(`/api/chats/${chatId}/competitor-intelligence/competitors/run`, form);
      if (resp?.data?.success) {
        setData(resp.data.competitorAnalysis);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Failed to run competitor analysis";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Section
        title="Competitor Analysis"
        description="Enter product details, run competitor analysis, and save the result for your workflow."
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
            <label className="block text-sm font-semibold mb-2">Website URL</label>
            <input
              value={form.websiteUrl}
              onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
              placeholder="https://resume.io"
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
          <div className="lg:col-span-2">
            <label className="block text-sm font-semibold mb-2">Competitor URLs (comma separated)</label>
            <textarea
              value={form.competitorUrls}
              onChange={(e) => setForm({ ...form, competitorUrls: e.target.value })}
              rows={2}
              placeholder="https://www.canva.com/resumes/, https://novoresume.com/, https://zety.com/"
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
            {loading ? "Running Analysis..." : "Run Competitor Analysis"}
          </button>
        </div>
      </Section>

      {data && (
        <div className="space-y-6">
          {/* Fallback Notice */}
          {data.fallbackUsed && (
            <div className="rounded-2xl bg-yellow-500/10 border border-yellow-500/20 p-4 text-sm text-yellow-200 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Generated using fallback analysis (AI providers unavailable).
            </div>
          )}

          {/* Competitor List */}
          <Section title="Competitor List">
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(data.competitorList || []).map((comp: string, idx: number) => (
                <li key={idx} className="rounded-2xl bg-white/5 border border-white/10 p-4 text-sm">
                  {renderSafeValue(comp)}
                </li>
              ))}
            </ul>
          </Section>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section title="Competitor Strengths">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {(data.competitorStrengths || []).map((strength: string, idx: number) => (
                  <li key={idx} className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    {renderSafeValue(strength)}
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="Competitor Weaknesses">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {(data.competitorWeaknesses || []).map((weakness: string, idx: number) => (
                  <li key={idx} className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    {renderSafeValue(weakness)}
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          {/* Pricing & Opportunities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section title="Pricing Insights">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {(data.pricingInsights || []).map((insight: string, idx: number) => (
                  <li key={idx} className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    {renderSafeValue(insight)}
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="Opportunities to Beat Competitors">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {(data.opportunitiesToBeatCompetitors || []).map((opp: string, idx: number) => (
                  <li key={idx} className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    {renderSafeValue(opp)}
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          {/* Positioning & Feature Gaps */}
          <Section title="Positioning Comparison">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-sm text-muted-foreground">
              {renderSafeValue(data.positioningComparison) || "No comparison available yet."}
            </div>
          </Section>

          <Section title="Feature Gap Analysis">
            <ul className="space-y-2 text-sm text-muted-foreground">
              {(data.featureGapAnalysis || []).map((gap: string, idx: number) => (
                <li key={idx} className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  {renderSafeValue(gap)}
                </li>
              ))}
            </ul>
          </Section>

          {/* Final Stuff */}
          <Section title="Recommended Strategy">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-sm text-muted-foreground">
              {renderSafeValue(data.recommendedStrategy) || "No strategy available yet."}
            </div>
          </Section>

          <Section title="Final Recommendation">
            <div className="rounded-3xl bg-white/5 border border-white/10 p-6 text-sm text-muted-foreground">
              {renderSafeValue(data.finalRecommendation) || "Run competitor analysis to get a recommendation."}
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

export default CompetitorAnalysisModule;

