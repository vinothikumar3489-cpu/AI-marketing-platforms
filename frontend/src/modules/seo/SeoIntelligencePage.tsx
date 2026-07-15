
import { useEffect, useState } from "react";
import { toast } from 'sonner';
import { AlertCircle, Sparkles } from "lucide-react";
import { Section } from "@/components/ui-kit";
import { getActiveProject } from "@/lib/project-store";
import { api } from "@/lib/api";

const emptyForm = {
  productName: "",
  websiteUrl: "",
  targetKeywords: "",
  targetCountry: "",
  industry: "",
};

export function SeoIntelligencePage() {
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
        const resp = await api.get(`/api/chats/${chatId}/seo-intelligence`);
        if (resp?.data?.success && resp.data.seoAnalysis) {
          setData(resp.data.seoAnalysis);
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
      const resp = await api.post(`/api/chats/${chatId}/seo-intelligence/run`, form);
      if (resp?.data?.success) {
        setData(resp.data.seoAnalysis);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Failed to run SEO analysis";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Section
        title="SEO Intelligence"
        description="Enter website details, run SEO audit, and save the result for your workflow."
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
            <label className="block text-sm font-semibold mb-2">Target Country</label>
            <input
              value={form.targetCountry}
              onChange={(e) => setForm({ ...form, targetCountry: e.target.value })}
              placeholder="India"
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
          <div className="lg:col-span-2">
            <label className="block text-sm font-semibold mb-2">Target Keywords (comma separated)</label>
            <textarea
              value={form.targetKeywords}
              onChange={(e) => setForm({ ...form, targetKeywords: e.target.value })}
              rows={2}
              placeholder="resume builder, online resume maker, CV maker"
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
            disabled={loading || !form.websiteUrl.trim()}
            className="px-6 h-11 rounded-xl gradient-brand text-white font-semibold flex items-center gap-2 glow-blue disabled:opacity-60"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? "Running Audit..." : "Run SEO Audit"}
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

          {/* Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass rounded-3xl p-5 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Overall SEO Score</div>
              </div>
              <div className="text-3xl font-bold text-brand-blue">{data.seoScore != null ? `${data.seoScore}/100` : '—'}</div>
            </div>
            <div className="glass rounded-3xl p-5 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">PageSpeed Score</div>
              </div>
              <div className="text-3xl font-bold text-brand-purple">{data.pageSpeedScore != null ? `${data.pageSpeedScore}/100` : '—'}</div>
            </div>
          </div>

          {/* Meta Tags Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section title="Meta Title Analysis">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-sm text-muted-foreground">
                {data.metaTitleAnalysis || "No analysis available yet."}
              </div>
            </Section>
            <Section title="Meta Description Analysis">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-sm text-muted-foreground">
                {data.metaDescriptionAnalysis || "No analysis available yet."}
              </div>
            </Section>
          </div>

          {/* Headings, Keywords, Technical Issues */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Section title="Heading Structure">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {(data.headingStructure || []).map((item, i) => (
                  <li key={i} className="rounded-2xl bg-white/5 border border-white/10 p-3">
                    {typeof item === 'object' ? (item.value || item.title || item.name || '') : item}
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="Keyword Suggestions">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {(data.keywordSuggestions || []).map((item, i) => (
                  <li key={i} className="rounded-2xl bg-white/5 border border-white/10 p-3">
                    {typeof item === 'object' ? (item.value || item.title || item.name || '') : item}
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="Technical SEO Issues">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {(data.technicalSeoIssues || []).map((item, i) => (
                  <li key={i} className="rounded-2xl bg-white/5 border border-white/10 p-3">
                    {typeof item === 'object' ? (item.value || item.title || item.name || '') : item}
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          {/* Content Improvements and Opportunities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section title="Content Improvement Ideas">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {(data.contentImprovementIdeas || []).map((item, i) => (
                  <li key={i} className="rounded-2xl bg-white/5 border border-white/10 p-3">
                    {typeof item === 'object' ? (item.value || item.title || item.name || '') : item}
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="Priority Fixes">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {(data.priorityFixes || []).map((item, i) => (
                  <li key={i} className="rounded-2xl bg-white/5 border border-white/10 p-3">
                    {typeof item === 'object' ? (item.value || item.title || item.name || '') : item}
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          {/* Final Recommendations */}
          <Section title="Backlink Authority Notes">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-sm text-muted-foreground">
              {data.backlinkAuthorityNotes || "No notes available yet."}
            </div>
          </Section>

          <Section title="Final Recommendation">
            <div className="rounded-3xl bg-white/5 border border-white/10 p-6 text-sm text-muted-foreground">
              {data.finalRecommendation || "Run SEO audit to get a recommendation."}
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

export default SeoIntelligencePage;

