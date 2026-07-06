
import { useEffect, useState } from "react";
import { toast } from 'sonner';
import { AlertCircle, Target, TrendingUp, DollarSign, Sparkles } from "lucide-react";
import { Section } from "@/components/ui-kit";
import { getActiveProject } from "@/lib/project-store";
import { api } from "@/lib/api";
import { renderSafeValue } from '../../lib/normalizers';

const emptyForm = {
  productName: "",
  industry: "",
  targetCountry: "",
  targetAudience: "",
  businessStage: ""
};

export function MarketDiscoveryModule() {
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
        const resp = await api.get(`/api/chats/${chatId}/full`);
        if (resp.data?.marketDiscovery) {
          setData(resp.data.marketDiscovery);
        }
      } catch (e) {
        console.error("Failed to load saved market discovery", e);
      }
    })();
  }, [chatId]);

  const run = async () => {
    if (!chatId) return toast.error("Select or create a project first.");
    setLoading(true);
    setError(null);
    try {
      const resp = await api.post(`/api/chats/${chatId}/product-intelligence/market/run`, form);
      if (resp?.data?.success) {
        setData(resp.data.marketDiscovery);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Failed to run market discovery";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Section
        title="Market Discovery"
        description="Enter product details, run market discovery, and save the result for your workflow."
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
            {loading ? "Running Discovery..." : "Run Market Discovery"}
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

          {/* Market Overview & Demand */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section title="Market Overview">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-sm text-muted-foreground">
                {renderSafeValue(data.marketOverview) || "No overview available yet."}
              </div>
            </Section>
            <Section title="Market Demand">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-sm text-muted-foreground">
                {renderSafeValue(data.marketDemand) || "No demand data available yet."}
              </div>
            </Section>
          </div>

          {/* Current Trends */}
          <Section title="Current Trends">
            <ul className="space-y-2 text-sm text-muted-foreground">
              {(data.currentTrends || []).map((trend: string, idx: number) => (
                <li key={idx} className="rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-brand-cyan flex-shrink-0" />
                  {renderSafeValue(trend)}
                </li>
              ))}
            </ul>
          </Section>

          {/* Target Segments & Opportunities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section title="Target Customer Segments">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {(data.targetCustomerSegments || []).map((seg: string, idx: number) => (
                  <li key={idx} className="rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center gap-2">
                    <Target className="w-4 h-4 text-brand-purple flex-shrink-0" />
                    {renderSafeValue(seg)}
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="Growth Opportunities">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {(data.growthOpportunities || []).map((opp: string, idx: number) => (
                  <li key={idx} className="rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-green flex-shrink-0" />
                    {renderSafeValue(opp)}
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          {/* Risks & Pricing */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section title="Risks">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {(data.risks || []).map((risk: string, idx: number) => (
                  <li key={idx} className="rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    {renderSafeValue(risk)}
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="Pricing Suggestions">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {(data.pricingSuggestions || []).map((price: string, idx: number) => (
                  <li key={idx} className="rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    {renderSafeValue(price)}
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          {/* Entry Strategy & Final Recommendation */}
          <Section title="Recommended Market Entry Strategy">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-sm text-muted-foreground">
              {renderSafeValue(data.recommendedMarketEntryStrategy) || "No entry strategy available yet."}
            </div>
          </Section>

          <Section title="Final Recommendation">
            <div className="rounded-3xl bg-white/5 border border-white/10 p-6 text-sm text-muted-foreground">
              {renderSafeValue(data.finalRecommendation) || "Run market discovery to get a recommendation."}
            </div>
          </Section>

        </div>
      )}
    </div>
  );
}

export default MarketDiscoveryModule;

