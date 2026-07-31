import { useEffect, useState } from "react";
import { toast } from 'sonner';
import { AlertCircle, Sparkles } from "lucide-react";
import { Section } from "@/components/ui-kit";
import { renderSafeValue } from '../../lib/normalizers';
import { getActiveProject } from "@/lib/project-store";
import { api } from "@/lib/api";

interface PositioningData {
  positioningStatement: string;
  differentiation: string;
  messagingAngles: string[];
  competitiveGaps: string[];
  marketWedge: string;
  recommendedStrategy?: string;
}

export function PositioningEngineModule() {
  const [data, setData] = useState<PositioningData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const project = typeof window !== "undefined" ? getActiveProject() : null;
  const chatId = project?.id || "";

  useEffect(() => {
    if (!chatId) return;
    (async () => {
      try {
        const resp = await api.get(`/api/chats/${chatId}/competitor-intelligence`);
        if (resp?.success && resp.positioningEngine) {
          setData(resp.positioningEngine);
        }
      } catch (e: any) {
        console.warn('[Positioning] Failed to load positioning:', e?.message || e);
      }
    })();
  }, [chatId]);

  const run = async () => {
    if (!chatId) return toast.error("Select or create a project first.");
    setLoading(true);
    setError(null);
    try {
      const resp = await api.post(`/api/chats/${chatId}/competitor-intelligence/positioning/run`, {});
      if (resp?.success && resp.positioningEngine) {
        setData(resp.positioningEngine);
      } else {
        setError(resp?.error || "Failed to generate positioning");
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to generate positioning");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Section title="Positioning Engine" description="Derived from the verified competitor analysis for this project.">
        {data ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Positioning Statement</div>
              <div className="text-sm text-foreground mt-2">{renderSafeValue(data.positioningStatement)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Differentiation</div>
              <div className="text-sm text-foreground mt-2">{renderSafeValue(data.differentiation)}</div>
            </div>
            {data.messagingAngles?.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Messaging Angles</div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {data.messagingAngles.map((item, i) => (
                    <div key={i} className="rounded-2xl bg-white/5 p-3 text-sm">{renderSafeValue(item)}</div>
                  ))}
                </div>
              </div>
            )}
            {data.competitiveGaps?.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Competitive Gaps</div>
                <div className="mt-2 grid gap-2">
                  {data.competitiveGaps.map((item, i) => (
                    <div key={i} className="rounded-2xl bg-white/5 p-3 text-sm">{renderSafeValue(item)}</div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Market Wedge</div>
              <div className="text-sm text-foreground mt-2">{renderSafeValue(data.marketWedge)}</div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-muted-foreground">
            <p className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4" />
              No positioning available yet.
            </p>
            <p className="mb-4">Positioning is derived from a verified competitor analysis. Run competitor analysis first, then generate positioning.</p>
            <button
              onClick={run}
              disabled={loading}
              className="px-5 h-10 rounded-xl gradient-brand text-white text-sm font-semibold flex items-center gap-2 glow-blue disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4" />
              {loading ? "Generating..." : "Generate Positioning"}
            </button>
            {error && <p className="mt-3 text-red-300 text-xs">{error}</p>}
          </div>
        )}
      </Section>
    </div>
  );
}

export default PositioningEngineModule;
