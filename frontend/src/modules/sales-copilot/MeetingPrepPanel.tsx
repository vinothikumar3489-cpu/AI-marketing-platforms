import { useState } from 'react';
import { Calendar, Brain, Loader2, User, FileText, Target } from 'lucide-react';
import { Card, Badge, Loading } from '../../components/UI';
import { getMeetingPrep, getNextBestAction } from '../../lib/api';

interface Props {
  chatId: string;
  contactId?: string;
  contactName?: string;
}

export function MeetingPrepPanel({ chatId, contactId, contactName }: Props) {
  const [prep, setPrep] = useState<any>(null);
  const [nba, setNba] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const container: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px',
  };

  const btn: React.CSSProperties = {
    padding: '8px 16px', borderRadius: '6px', border: '1px solid #293245',
    background: '#101622', color: '#e5e7eb', cursor: 'pointer', fontSize: '12px',
    display: 'flex', alignItems: 'center', gap: '6px',
  };

  async function loadPrep() {
    if (!contactId) return;
    setLoading(true);
    try {
      const [p, n] = await Promise.all([
        getMeetingPrep(chatId, contactId),
        getNextBestAction(chatId, contactId),
      ]);
      setPrep(p);
      setNba(n);
    } catch { /* silent */ }
    setLoading(false);
  }

  return (
    <div style={container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={16} style={{ color: '#a855f7' }} />
          <span style={{ color: '#e5e7eb', fontWeight: 600, fontSize: '14px' }}>
            {contactName ? `Meeting Prep: ${contactName}` : 'Meeting Preparation'}
          </span>
        </div>
        <button style={btn} onClick={loadPrep} disabled={!contactId || loading}>
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
          Generate Brief
        </button>
      </div>

      {!contactId && (
        <div style={{ color: '#6b7a93', fontSize: '13px', fontStyle: 'italic', padding: '20px', textAlign: 'center' }}>
          Select a contact to generate AI-powered meeting preparation briefs.
        </div>
      )}

      {loading && <Loading />}

      {!loading && prep && prep.data && (
        <div style={{ display: 'grid', gap: '12px' }}>
          {prep.data.contactSummary && (
            <Card>
              <h4 style={{ margin: '0 0 6px 0', color: '#e5e7eb', fontSize: '13px' }}>
                <User size={14} style={{ display: 'inline', marginRight: '4px' }} />
                Contact Summary
              </h4>
              <div style={{ color: '#9aa7bd', fontSize: '13px', lineHeight: 1.5 }}>{prep.data.contactSummary}</div>
            </Card>
          )}

          {prep.data.objectives?.length > 0 && (
            <Card>
              <h4 style={{ margin: '0 0 6px 0', color: '#e5e7eb', fontSize: '13px' }}>
                <Target size={14} style={{ display: 'inline', marginRight: '4px' }} />
                Meeting Objectives
              </h4>
              {(prep.data.objectives || []).map((obj: any, i: number) => (
                <div key={i} style={{ padding: '4px 0', color: '#9aa7bd', fontSize: '13px' }}>
                  <Badge tone="blue" style={{ marginRight: '6px' }}>{i + 1}</Badge>
                  {obj.objective || obj}
                </div>
              ))}
            </Card>
          )}

          {prep.data.keyPoints?.length > 0 && (
            <Card>
              <h4 style={{ margin: '0 0 6px 0', color: '#e5e7eb', fontSize: '13px' }}>Key Talking Points</h4>
              {(prep.data.keyPoints || []).map((pt: any, i: number) => (
                <div key={i} style={{ padding: '4px 0', fontSize: '13px', color: '#9aa7bd', borderBottom: i < prep.data.keyPoints.length - 1 ? '1px solid #1d2738' : 'none' }}>
                  {pt.point || pt}
                </div>
              ))}
            </Card>
          )}

          {prep.data.openQuestions?.length > 0 && (
            <Card>
              <h4 style={{ margin: '0 0 6px 0', color: '#e5e7eb', fontSize: '13px' }}>Questions to Ask</h4>
              {(prep.data.openQuestions || []).map((q: any, i: number) => (
                <div key={i} style={{
                  padding: '8px', marginBottom: '4px', borderRadius: '4px',
                  background: 'rgba(83,167,255,0.06)', border: '1px solid rgba(83,167,255,0.15)',
                  color: '#9aa7bd', fontSize: '12px',
                }}>
                  {q.question || q}
                </div>
              ))}
            </Card>
          )}

          {prep.data.recentActivity?.length > 0 && (
            <Card>
              <h4 style={{ margin: '0 0 6px 0', color: '#e5e7eb', fontSize: '13px' }}>Recent Activity</h4>
              {(prep.data.recentActivity || []).map((act: any, i: number) => (
                <div key={i} style={{ padding: '4px 0', fontSize: '12px', color: '#6b7a93', borderBottom: '1px solid #1d2738' }}>
                  {act.type || 'activity'} — {act.description?.slice(0, 80) || ''}
                  {act.date && <span style={{ marginLeft: '8px' }}>{new Date(act.date).toLocaleDateString()}</span>}
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      {!loading && nba && nba.data && (
        <Card>
          <h4 style={{ margin: '0 0 6px 0', color: '#e5e7eb', fontSize: '13px' }}>
            <Target size={14} style={{ display: 'inline', marginRight: '4px' }} />
            Next Best Action
          </h4>
          <div style={{ color: '#9aa7bd', fontSize: '13px', lineHeight: 1.5 }}>
            {nba.data.recommendation || nba.data.action || 'No recommendation available'}
          </div>
          {nba.data.inferenceStatus && (
            <div style={{ fontSize: '10px', color: '#6b7a93', marginTop: '4px' }}>
              {nba.data.inferenceStatus.replace(/_/g, ' ')}
            </div>
          )}
          {nba.data.priority && (
            <div style={{ marginTop: '4px' }}>
              <Badge tone={nba.data.priority === 'HIGH' ? 'red' : nba.data.priority === 'MEDIUM' ? 'yellow' : 'blue'}>
                {nba.data.priority} priority
              </Badge>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
