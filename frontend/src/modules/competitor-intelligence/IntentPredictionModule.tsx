import { useEffect, useState } from "react";
import { toast } from 'sonner';
import { AlertCircle, Sparkles } from "lucide-react";
import { Section } from "@/components/ui-kit";
import SafeValue from "@/components/SafeValue";
import { getActiveProject } from "@/lib/project-store";
import { api } from "@/lib/api";

interface IntentData {
  intents: string[];
  signals: string[];
  buyingTriggers: string[];
  buyerIntentScore: number | null;
  audience: string | null;
}

export function IntentPredictionModule() {
  const [data, setData] = useState<IntentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const project = typeof window !== "undefined" ? getActiveProject() : null;
  const chatId = project?.id || "";

  useEffect(() => {
    if (!chatId) return;
    (async () => {
      try {
        const resp = await api.get(`/api/chats/${chatId}/competitor-intelligence`);
        if (resp?.success && resp.intentPrediction) {
          setData(resp.intentPrediction);
        }
      } catch (e: any) {
        console.warn('[Intent] Failed to load prediction:', e?.message || e);
      }
    })();
  }, [chatId]);

  const run = async () => {
    if (!chatId) return toast.error("Select or create a project first.");
    setLoading(true);
    setError(null);
    try {
      const resp = await api.post(`/api/chats/${chatId}/competitor-intelligence/intent/run`, {});
      if (resp?.success && resp.intentPrediction) {
        setData(resp.intentPrediction);
      } else {
        setError(resp?.error || "Failed to run intent prediction");
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to run intent prediction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Section title="Intent Prediction" description="Derived from the verified competitor analysis for this project.">
        {data ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <InfoCard label="Buyer Intent Score" value={data.buyerIntentScore != null ? `${data.buyerIntentScore}/100` : "Not measurable yet"} />
            <InfoCard label="Audience" value={data.audience || "Not identified"} />
            <InfoCard label="Intent Signals" value={data.intents.length > 0 ? data.intents.join(", ") : "No signals detected"} />
            <InfoCard label="Buying Triggers" value={data.buyingTriggers.length > 0 ? data.buyingTriggers.join(". ") : "No triggers identified"} />
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-muted-foreground">
            <p className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4" />
              No intent prediction available yet.
            </p>
            <p className="mb-4">Intent signals are derived from a verified competitor analysis. Run competitor analysis first, then generate intent prediction.</p>
            <button
              onClick={run}
              disabled={loading}
              className="px-5 h-10 rounded-xl gradient-brand text-white text-sm font-semibold flex items-center gap-2 glow-blue disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4" />
              {loading ? "Predicting..." : "Generate Intent Prediction"}
            </button>
            {error && <p className="mt-3 text-red-300 text-xs">{error}</p>}
          </div>
        )}
      </Section>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{label}</div>
      <div className="text-sm text-foreground"><SafeValue value={value} /></div>
    </div>
  );
}

export default IntentPredictionModule;
