import { useState } from 'react';
import { Brain, Clock, Loader2, MessageSquare, Phone, Mail, Calendar, FileText } from 'lucide-react';
import { Card, Badge, Loading } from '../../components/UI';
import { getSalesTimeline, getConversationMemory } from '../../lib/api';

interface Props {
  chatId: string;
  contactId?: string;
  dealId?: string;
}

const interactionIcons: Record<string, any> = {
  EMAIL: Mail, CALL: Phone, MEETING: Calendar, NOTE: FileText, MESSAGE: MessageSquare, TASK: Clock,
};

export function CopilotMemoryTimeline({ chatId, contactId, dealId }: Props) {
  const [timeline, setTimeline] = useState<any>(null);
  const [memory, setMemory] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const container: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px',
  };

  const btn: React.CSSProperties = {
    padding: '8px 16px', borderRadius: '6px', border: '1px solid #293245',
    background: '#101622', color: '#e5e7eb', cursor: 'pointer', fontSize: '12px',
    display: 'flex', alignItems: 'center', gap: '6px',
  };

  async function loadTimeline() {
    setLoading(true);
    try {
      const params: any = {};
      if (contactId) params.contactId = contactId;
      if (dealId) params.dealId = dealId;
      const [t, m] = await Promise.all([
        getSalesTimeline(chatId, params),
        getConversationMemory(chatId, params),
      ]);
      setTimeline(t);
      setMemory(m);
    } catch { /* silent */ }
    setLoading(false);
  }

  function getIcon(type: string) {
    return interactionIcons[type] || MessageSquare;
  }

  return (
    <div style={container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={16} style={{ color: '#a855f7' }} />
          <span style={{ color: '#e5e7eb', fontWeight: 600, fontSize: '14px' }}>Timeline & Conversation Memory</span>
        </div>
        <button style={btn} onClick={loadTimeline} disabled={loading}>
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
          Load Timeline
        </button>
      </div>

      {loading && <Loading />}

      {!loading && timeline && timeline.data && (
        <>
          <h4 style={{ color: '#e5e7eb', fontSize: '13px', margin: '0 0 8px 0' }}>
            Sales Timeline ({timeline.data.total || timeline.data.events?.length || 0} events)
          </h4>

          {(timeline.data.events || timeline.data || []).length === 0 ? (
            <div style={{ color: '#6b7a93', fontStyle: 'italic', fontSize: '13px', padding: '20px', textAlign: 'center' }}>
              No timeline events found
            </div>
          ) : (
            <div style={{ position: 'relative', paddingLeft: '24px' }}>
              <div style={{ position: 'absolute', left: '8px', top: '0', bottom: '0', width: '2px', background: '#293245' }} />
              {(timeline.data.events || timeline.data || []).slice(0, 50).map((ev: any, i: number) => {
                const Icon = getIcon(ev.type || ev.eventType);
                return (
                  <div key={ev.id || i} style={{ position: 'relative', marginBottom: '12px' }}>
                    <div style={{
                      position: 'absolute', left: '-20px', top: '2px', width: '20px', height: '20px',
                      borderRadius: '50%', background: '#101622', border: '2px solid #293245',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={10} style={{ color: '#6b7a93' }} />
                    </div>
                    <div style={{
                      padding: '8px 12px', borderRadius: '6px', background: '#0f1729',
                      border: '1px solid #293245',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <Badge tone="blue" style={{ fontSize: '10px' }}>{ev.type || ev.eventType || 'event'}</Badge>
                        {ev.createdAt && (
                          <span style={{ color: '#6b7a93', fontSize: '10px' }}>
                            {new Date(ev.createdAt).toLocaleDateString()} {new Date(ev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <div style={{ color: '#9aa7bd', fontSize: '12px' }}>
                        {ev.description || ev.summary || ev.content?.slice(0, 120) || ''}
                      </div>
                      {(ev.contactName || ev.dealName) && (
                        <div style={{ color: '#6b7a93', fontSize: '10px', marginTop: '2px' }}>
                          {ev.contactName && <span>Contact: {ev.contactName} </span>}
                          {ev.dealName && <span>Deal: {ev.dealName}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {timeline.data.nextCursor && (
            <button style={{
              padding: '6px 12px', borderRadius: '6px', border: '1px solid #293245',
              background: '#101622', color: '#53a7ff', cursor: 'pointer', fontSize: '11px',
            }}>
              Load More
            </button>
          )}
        </>
      )}

      {!loading && memory && memory.data && memory.data.length > 0 && (
        <Card>
          <h4 style={{ margin: '0 0 8px 0', color: '#e5e7eb', fontSize: '13px' }}>
            <MessageSquare size={14} style={{ display: 'inline', marginRight: '4px' }} />
            Conversation Memory ({memory.data.length} entries)
          </h4>
          <div style={{ display: 'grid', gap: '6px' }}>
            {memory.data.slice(0, 10).map((mem: any, i: number) => (
              <div key={mem.id || i} style={{
                padding: '8px', borderRadius: '6px', fontSize: '12px',
                background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)',
                color: '#9aa7bd',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <Badge tone="purple">{mem.interactionType || 'chat'}</Badge>
                  {mem.createdAt && <span style={{ color: '#6b7a93', fontSize: '10px' }}>{new Date(mem.createdAt).toLocaleDateString()}</span>}
                </div>
                <div>{(mem.content || mem.summary || '').slice(0, 200)}</div>
                {mem.keyInsights?.length > 0 && (
                  <div style={{ marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {mem.keyInsights.slice(0, 3).map((k: any, j: number) => (
                      <Badge key={j} tone="purple" style={{ fontSize: '9px' }}>{k.insight?.slice(0, 30) || k}</Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
