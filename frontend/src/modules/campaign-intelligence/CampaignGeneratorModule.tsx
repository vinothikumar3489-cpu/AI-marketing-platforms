
import { useEffect, useState } from "react";
import { toast } from 'sonner';
import { AlertCircle, Sparkles, Copy } from "lucide-react";
import { Section } from "@/components/ui-kit";
import { getActiveProject } from "@/lib/project-store";
import { api } from "@/lib/api";
import { renderSafeValue } from '../../lib/normalizers';

const emptyForm = {
  productName: "",
  targetAudience: "",
  campaignGoal: "",
  platform: "",
  tone: "",
  budgetRange: "",
  duration: ""
};

export function CampaignGeneratorModule() {
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
        const resp = await api.get(`/chats/${chatId}/campaign-intelligence`);
        const gen = resp?.campaignGenerator || resp?.campaignPlan || null;
        if (gen) {
          setData(gen);
        }
      } catch (e) {
        // silent
      }
    })();
  }, [chatId]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const run = async () => {
    if (!chatId) return toast.error("Select or create a project first.");
    setLoading(true);
    setError(null);
    try {
      const resp = await api.post(`/chats/${chatId}/campaign-intelligence/campaign/run`, form);
      const gen = resp?.campaignGenerator || resp?.campaignPlan || resp;
      setData(gen);
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Failed to generate campaign";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Section
        title="Campaign Generator"
        description="Enter details to generate a complete marketing campaign plan."
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
            <label className="block text-sm font-semibold mb-2">Target Audience</label>
            <input
              value={form.targetAudience}
              onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
              placeholder="Students and freshers"
              className="w-full h-12 px-4 rounded-2xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-brand-blue/50"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Campaign Goal</label>
            <input
              value={form.campaignGoal}
              onChange={(e) => setForm({ ...form, campaignGoal: e.target.value })}
              placeholder="Get more student users"
              className="w-full h-12 px-4 rounded-2xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-brand-blue/50"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Primary Platform</label>
            <input
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
              placeholder="Instagram"
              className="w-full h-12 px-4 rounded-2xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-brand-blue/50"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Tone</label>
            <input
              value={form.tone}
              onChange={(e) => setForm({ ...form, tone: e.target.value })}
              placeholder="Friendly and professional"
              className="w-full h-12 px-4 rounded-2xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-brand-blue/50"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Budget Range</label>
            <input
              value={form.budgetRange}
              onChange={(e) => setForm({ ...form, budgetRange: e.target.value })}
              placeholder="Low budget"
              className="w-full h-12 px-4 rounded-2xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-brand-blue/50"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-sm font-semibold mb-2">Duration</label>
            <input
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
              placeholder="7 days"
              className="w-full h-12 px-4 rounded-2xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-brand-blue/50"
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
            {loading ? "Generating Campaign..." : "Generate Campaign"}
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

          <Section title="Campaign Strategy">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-sm text-muted-foreground">
              {renderSafeValue(data.campaignStrategy) || "No strategy available yet."}
            </div>
          </Section>

          <Section title="Ad Copies">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(data.adCopies || []).map((copy: string, index: number) => (
                <div key={index} className="rounded-2xl bg-white/5 border border-white/10 p-4 text-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Ad {index + 1}</span>
                    <button
                      onClick={() => copyToClipboard(copy)}
                      className="text-muted-foreground hover:text-white transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  {renderSafeValue(copy)}
                </div>
              ))}
            </div>
          </Section>

          <Section title="Social Media Posts">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(data.socialMediaPosts || []).map((post: string, index: number) => (
                <div key={index} className="rounded-2xl bg-white/5 border border-white/10 p-4 text-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Post {index + 1}</span>
                    <button
                      onClick={() => copyToClipboard(post)}
                      className="text-muted-foreground hover:text-white transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  {renderSafeValue(post)}
                </div>
              ))}
            </div>
          </Section>

          <Section title="Email Campaign">
            <div className="space-y-3">
              {(data.emailCampaign || []).map((email: string, index: number) => (
                <div key={index} className="rounded-2xl bg-white/5 border border-white/10 p-4 text-sm flex justify-between items-center">
                  <span>{renderSafeValue(email)}</span>
                  <button
                    onClick={() => copyToClipboard(email)}
                    className="text-muted-foreground hover:text-white transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Hashtags">
            <div className="flex flex-wrap gap-2">
              {(data.hashtags || []).map((hashtag: string, index: number) => (
                <div key={index} className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm flex items-center gap-2">
                  <span>{renderSafeValue(hashtag)}</span>
                  <button
                    onClick={() => copyToClipboard(hashtag)}
                    className="text-muted-foreground hover:text-white transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Landing Page Headline">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-sm flex justify-between items-center">
              <span>{renderSafeValue(data.landingPageHeadline) || "No headline available yet."}</span>
              <button
                onClick={() => copyToClipboard(data.landingPageHeadline)}
                className="text-muted-foreground hover:text-white transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </Section>

          <Section title="CTA Suggestions">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(data.ctaSuggestions || []).map((cta: string, index: number) => (
                <div key={index} className="rounded-2xl bg-white/5 border border-white/10 p-4 text-sm flex justify-between items-center">
                  <span>{renderSafeValue(cta)}</span>
                  <button
                    onClick={() => copyToClipboard(cta)}
                    className="text-muted-foreground hover:text-white transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </Section>

          <Section title="7-Day Content Calendar">
            <div className="space-y-3">
              {(data.sevenDayContentCalendar || []).map((day: any, index: number) => (
                <div key={index} className="rounded-2xl bg-white/5 border border-white/10 p-4 text-sm flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{renderSafeValue(day.day)}</div>
                    <div className="text-muted-foreground">{renderSafeValue(day.content)}</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(`${day.day}: ${day.content}`)}
                    className="text-muted-foreground hover:text-white transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Final Recommendation">
            <div className="rounded-3xl bg-white/5 border border-white/10 p-6 text-sm text-muted-foreground">
              {renderSafeValue(data.finalRecommendation) || "Run campaign generator to get a recommendation."}
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}
