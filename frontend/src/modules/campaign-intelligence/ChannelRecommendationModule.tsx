import { useEffect, useState } from "react";
import { Section } from "@/components/ui-kit";
import SafeValue from "@/components/SafeValue";
import { getActiveProject } from "@/lib/project-store";
import { api } from "@/lib/api";

interface ChannelItem {
  channel: string;
  recommendation?: string;
  reason?: string;
  evidence?: string;
  confidence?: number;
  status: 'VERIFIED' | 'AI_INFERRED' | 'UNAVAILABLE' | 'PARTIAL';
}

export function ChannelRecommendationModule() {
  const [channels, setChannels] = useState<ChannelItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const project = typeof window !== "undefined" ? getActiveProject() : null;
  const chatId = project?.id || "";

  useEffect(() => {
    if (!chatId) {
      setLoading(false);
      setChannels(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const resp: any = await api.get(`/chats/${chatId}/full-results`);
        if (cancelled) return;

        const growthData = resp?.growth || null;

        if (!growthData) {
          setChannels(null);
          setLoading(false);
          return;
        }

        const rawChannel = growthData.channel || growthData.channelRecommendation || null;

        if (!rawChannel) {
          setChannels([]);
          setLoading(false);
          return;
        }

        const rawList = rawChannel.recommendedChannels || rawChannel.channels || rawChannel.recommendations || [];

        if (rawList.length === 0) {
          setChannels([]);
          setLoading(false);
          return;
        }

        const items: ChannelItem[] = rawList.map((c: any) => ({
          channel: c.channel || c.name || typeof c === 'string' ? c : 'Unknown',
          recommendation: c.recommendation || c.recommendedContent || c.desc || '',
          reason: c.reason || c.rationale || c.evidence || '',
          evidence: c.evidence || c.source || '',
          confidence: typeof c.confidence === 'number' ? c.confidence : null,
          status: c.status || (c.confidence >= 80 ? 'VERIFIED' : c.confidence >= 50 ? 'AI_INFERRED' : 'PARTIAL'),
        }));

        setChannels(items);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Failed to load channel recommendations');
          setChannels(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [chatId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Section title="Channel Recommendation" description="Loading channel recommendations from analysis data.">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </Section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Section title="Channel Recommendation" description="Channel recommendations could not be loaded.">
          <div className="rounded-3xl border border-yellow-500/20 bg-yellow-500/5 p-5 text-sm text-yellow-200">
            Channel recommendations are currently unavailable. Run a Growth analysis to generate channel recommendations.
          </div>
        </Section>
      </div>
    );
  }

  if (!channels || channels.length === 0) {
    return (
      <div className="space-y-6">
        <Section title="Channel Recommendation" description="Channel recommendations from your Growth analysis.">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-muted-foreground">
            Channel recommendations are currently unavailable. Run a Growth analysis to generate channel recommendations.
          </div>
        </Section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Section title="Channel Recommendation" description="Recommended marketing channels based on your analysis.">
        <div className="grid gap-4 lg:grid-cols-2">
          {channels.map((item, i) => (
            <ChannelCard key={i} item={item} />
          ))}
        </div>
      </Section>
    </div>
  );
}

function ChannelCard({ item }: { item: ChannelItem }) {
  const statusColor =
    item.status === 'VERIFIED' ? 'text-green-400' :
    item.status === 'AI_INFERRED' ? 'text-yellow-400' :
    item.status === 'PARTIAL' ? 'text-orange-400' :
    'text-muted-foreground';

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-foreground">
          <SafeValue value={item.channel} />
        </div>
        <span className={`text-xs uppercase tracking-wider ${statusColor}`}>
          {item.status}
        </span>
      </div>
      {item.recommendation && (
        <div className="text-xs text-muted-foreground">
          <SafeValue value={item.recommendation} />
        </div>
      )}
      {item.reason && (
        <div className="text-xs text-muted-foreground/70">
          <span className="text-muted-foreground/50">Why: </span>
          <SafeValue value={item.reason} />
        </div>
      )}
      {item.evidence && (
        <div className="text-xs text-muted-foreground/50">
          <span className="text-muted-foreground/40">Source: </span>
          <SafeValue value={item.evidence} />
        </div>
      )}
      {typeof item.confidence === 'number' && (
        <div className="text-xs text-muted-foreground/50">
          Confidence: {item.confidence}%
        </div>
      )}
    </div>
  );
}
