import { useEffect, useState } from 'react';
import { Clock, Mail, Phone, Calendar, FileText, MessageSquare, Activity, AlertCircle, Loader2 } from 'lucide-react';
import { Card, Badge, Loading } from '../../components/UI';
import { useProject } from '../../context/ProjectContext';
import { listCRMActivities } from '../../lib/api';
import { CRMLoadingState } from './CRMLoadingState';
import { CRMEmptyState } from './CRMEmptyState';

interface Props {
  contactId?: string;
  dealId?: string;
  limit?: number;
  compact?: boolean;
}

const activityIcons: Record<string, any> = {
  note: FileText, call: Phone, meeting: Calendar, email: Mail,
  stage_change: Activity, task_completion: CheckMark,
  campaign_association: MessageSquare, workflow_execution: Activity,
};

function CheckMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const activityColors: Record<string, string> = {
  note: '#53a7ff', call: '#10e18b', meeting: '#a855f7', email: '#ffb347',
  stage_change: '#ff4757', task_completion: '#10e18b',
  campaign_association: '#53a7ff', workflow_execution: '#6b7a93',
};

export function CRMActivityTimeline({ contactId, dealId, limit = 50, compact = false }: Props) {
  const { selectedChatId } = useProject();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedChatId) { setLoading(false); return; }
    loadActivities();
  }, [selectedChatId, contactId, dealId]);

  async function loadActivities() {
    if (!selectedChatId) return;
    setLoading(true); setError(null);
    try {
      const params: any = { limit };
      if (contactId) params.contactId = contactId;
      if (dealId) params.dealId = dealId;
      const result = await listCRMActivities(selectedChatId, params);
      setActivities(Array.isArray(result) ? result.sort((a: any, b: any) =>
        new Date(b.activityDate || b.createdAt).getTime() - new Date(a.activityDate || a.createdAt).getTime()
      ) : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  }

  const container: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: compact ? '4px' : '12px',
    padding: compact ? '8px' : '16px',
  };

  if (loading) return <div style={container}><CRMLoadingState message="Loading activities..." /></div>;

  if (error) {
    return (
      <div style={container}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '12px', background: 'rgba(255,71,87,0.06)', borderRadius: '6px', border: '1px solid rgba(255,71,87,0.15)' }}>
          <AlertCircle size={14} style={{ color: '#ff4757' }} />
          <span style={{ color: '#ff8a8a', fontSize: '12px' }}>{error}</span>
        </div>
        <button onClick={loadActivities} style={{
          padding: '6px 12px', borderRadius: '6px', border: '1px solid #293245',
          background: '#101622', color: '#53a7ff', cursor: 'pointer', fontSize: '11px',
        }}>Retry</button>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div style={container}>
        <CRMEmptyState title="No Activities" message="No activities recorded yet. Activities are automatically created when contacts are updated, deals move stages, or tasks are completed." />
      </div>
    );
  }

  return (
    <div style={container}>
      <div style={{ position: 'relative', paddingLeft: compact ? '20px' : '32px' }}>
        <div style={{
          position: 'absolute', left: compact ? '9px' : '15px', top: '0', bottom: '0',
          width: '2px', background: '#293245',
        }} />
        {activities.slice(0, limit).map((act: any, i: number) => {
          const Icon = activityIcons[act.activityType] || Activity;
          const color = activityColors[act.activityType] || '#6b7a93';
          return (
            <div key={act.id || i} style={{ position: 'relative', marginBottom: compact ? '6px' : '12px' }}>
              <div style={{
                position: 'absolute', left: compact ? '-14px' : '-23px', top: '2px',
                width: compact ? '18px' : '26px', height: compact ? '18px' : '26px',
                borderRadius: '50%', background: '#0f1729', border: '2px solid #293245',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={compact ? 8 : 12} style={{ color }} />
              </div>
              <div style={{
                padding: compact ? '6px 10px' : '10px 14px', borderRadius: '6px',
                background: '#0f1729', border: '1px solid #293245',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{
                        color, fontSize: compact ? '11px' : '12px', fontWeight: 600,
                        textTransform: 'capitalize',
                      }}>
                        {act.activityType?.replace(/_/g, ' ')}
                      </span>
                      {act.source && <Badge tone="gray" style={{ fontSize: '9px' }}>{act.source.replace(/_/g, ' ')}</Badge>}
                    </div>
                    <div style={{ color: '#e5e7eb', fontSize: compact ? '12px' : '13px', fontWeight: 500, marginTop: '2px' }}>
                      {act.title}
                    </div>
                    {act.description && (
                      <div style={{ color: '#9aa7bd', fontSize: compact ? '11px' : '12px', marginTop: '2px', lineHeight: 1.4 }}>
                        {act.description.slice(0, compact ? 80 : 200)}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                      {(act.contactName || act.contact?.firstName) && (
                        <span style={{ color: '#6b7a93', fontSize: '10px' }}>
                          Contact: {act.contactName || `${act.contact?.firstName || ''} ${act.contact?.lastName || ''}`}
                        </span>
                      )}
                      {(act.dealName || act.deal?.name) && (
                        <span style={{ color: '#6b7a93', fontSize: '10px' }}>
                          Deal: {act.dealName || act.deal?.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ color: '#4a5568', fontSize: compact ? '9px' : '10px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {new Date(act.activityDate || act.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
