
import { useEffect, useState } from "react";
import { toast } from 'sonner';
import { CheckCircle2, FileText, Sparkles, Target, Layers, Brain, AlertCircle } from "lucide-react";
import { Section, ScoreBar } from "@/components/ui-kit";
import { getActiveProject } from "@/lib/project-store";
import { api } from "@/lib/api";

const emptyForm = {
  productName: "",
  websiteUrl: "",
  description: "",
  industry: "",
  targetAudience: "",
  pricing: "",
  competitors: ""
};

export function ProductAnalysisModule() {
  const [form, setForm] = useState(emptyForm);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const project = typeof window !== "undefined" ? getActiveProject() : null;
  const chatId = project?.id || "";

  useEffect(() => {
    if (!chatId) return;
    (async () => {
      try {
        const resp = await api.get(`/api/chats/${chatId}/full`);
        if (resp.data) {
          if (resp.data.productAnalysis) {
            setAnalysis(resp.data.productAnalysis);
          }
        }
      } catch (e) {
        console.error("Failed to load saved product analysis", e);
      }
    })();
  }, [chatId]);

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const runAnalysis = async () => {
    if (!chatId) return toast.error("Select or create a project first.");
    setLoading(true);
    setError(null);
    try {
      const resp = await api.post(`/api/chats/${chatId}/run`, {
        productName: form.productName,
        websiteUrl: form.websiteUrl,
        description: form.description,
        targetMarket: form.targetAudience,
        industry: form.industry
      });
      if (resp.data?.success) {
        setAnalysis(resp.data.productAnalysis || resp.data.data);
      }
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.message ||
        "Failed to run product analysis";
      setError(msg);
      console.error("Error running product analysis:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Section
        title="Product Analysis"
        description="Enter product details, run analysis, and save the result for your workflow."
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Field
            label="Product Name"
            value={form.productName}
            onChange={(v) => update("productName", v)}
            placeholder="Resume Builder"
          />
          <Field
            label="Product Website URL"
            value={form.websiteUrl}
            onChange={(v) => update("websiteUrl", v)}
            placeholder="https://resume.io"
          />
          <div className="lg:col-span-2">
            <label className="block text-sm font-semibold mb-2">
              Product Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={5}
              placeholder="Describe what the product does..."
              className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-brand-blue/50"
            />
          </div>
          <Field
            label="Industry"
            value={form.industry}
            onChange={(v) => update("industry", v)}
            placeholder="HR Technology"
          />
          <Field
            label="Target Audience"
            value={form.targetAudience}
            onChange={(v) => update("targetAudience", v)}
            placeholder="Students and freshers"
          />
        </div>
        {error && (
          <div className="mt-4 rounded-2xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        <div className="flex justify-end mt-6">
          <button
            onClick={runAnalysis}
            disabled={loading || !form.productName.trim()}
            className="px-6 h-11 rounded-xl gradient-brand text-white font-semibold flex items-center gap-2 glow-blue disabled:opacity-60"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? "Running Analysis..." : "Run Module"}
          </button>
        </div>
      </Section>

      {analysis && (
        <div className="space-y-6">
          {/* Fallback Notice */}
          {analysis.fallbackUsed && (
            <div className="rounded-2xl bg-yellow-500/10 border border-yellow-500/20 p-4 text-sm text-yellow-200 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Generated using fallback analysis (AI providers unavailable).
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card
              icon={<Layers className="w-5 h-5 text-brand-blue" />}
              title="Industry"
              value={analysis.category || "Technology"}
            />
            <Card
              icon={<Target className="w-5 h-5 text-brand-purple" />}
              title="Provider"
              value={analysis.provider || "AI"}
            />
            <Card
              icon={<Brain className="w-5 h-5 text-brand-green" />}
              title="Confidence"
              value={`${analysis.confidenceScore || 80}%`}
              badge={<ScoreBar value={analysis.confidenceScore || 80} color="green" />}
            />
          </div>

          {/* Product Summary */}
          <Section title="Product Summary">
            <div className="rounded-3xl bg-white/5 border border-white/10 p-6 text-sm text-muted-foreground">
              {analysis.productSummary || "No summary available yet."}
            </div>
          </Section>

          {/* Two Column Layout */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left Column */}
            <div className="space-y-6">
              <Section title="Unique Value Proposition">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-sm text-muted-foreground">
                  {analysis.uniqueValueProposition || "Enter product details and run analysis."}
                </div>
              </Section>
              <Section title="Target Audience">
                <List items={analysis.targetAudience || []} />
              </Section>
              <Section title="Pain Points">
                <List items={analysis.painPoints || []} />
              </Section>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <Section title="Market Opportunities">
                <List items={analysis.marketOpportunities || []} />
              </Section>
              <Section title="SEO Suggestions">
                <List items={analysis.seoSuggestions || []} />
              </Section>
              <Section title="Campaign Ideas">
                <List items={analysis.campaignIdeas || []} />
              </Section>
            </div>
          </div>

          {/* Competitor Ideas */}
          <Section title="Competitor Ideas">
            <List items={analysis.competitorIdeas || []} />
          </Section>

          {/* Final Recommendation */}
          <Section title="Final Recommendation">
            <div className="rounded-3xl bg-white/5 border border-white/10 p-6 text-sm text-muted-foreground">
              {analysis.finalRecommendation || "Run analysis to get a recommendation."}
            </div>
          </Section>

          {/* Data Sources */}
          <Section title="Data Sources" description="Where the analysis was generated from.">
            <div className="space-y-2 text-sm text-muted-foreground">
              {(analysis.dataSourcesUsed || []).map((item: string, idx: number) => (
                <div
                  key={idx}
                  className="rounded-2xl bg-white/5 p-3 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-brand-blue" />
                  {item}
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-12 px-4 rounded-2xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-brand-blue/50"
      />
    </div>
  );
}

function Card({
  icon,
  title,
  value,
  badge
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="glass rounded-3xl p-5 border border-white/10">
      <div className="flex items-center gap-3 mb-4">
        {icon}
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{title}</div>
      </div>
      <div className="text-2xl font-semibold">{value || "ΓÇö"}</div>
      {badge && <div className="mt-4">{badge}</div>}
    </div>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm text-muted-foreground">
      {items.length > 0 ? (
        items.map((item, idx) => (
          <li
            key={idx}
            className="rounded-2xl bg-white/5 border border-white/10 p-4 flex items-start gap-2"
          >
            <CheckCircle2 className="w-4 h-4 mt-0.5 text-brand-blue flex-shrink-0" />
            {item}
          </li>
        ))
      ) : (
        <li className="rounded-2xl bg-white/5 p-4">No data available yet.</li>
      )}
    </ul>
  );
}

