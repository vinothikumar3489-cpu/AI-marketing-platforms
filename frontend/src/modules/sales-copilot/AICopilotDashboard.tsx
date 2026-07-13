import { useEffect, useState } from 'react';
import {
  LayoutDashboard, TrendingUp, AlertTriangle, CheckCircle2, Loader2,
  Target, Users, DollarSign, Clock, Activity, Zap, Brain,
} from 'lucide-react';
import { Card, Badge, Loading } from '../../components/UI';
import { useProject } from '../../context/ProjectContext';
import {
  getCopilotDashboard, getCustomerHealth, getCopilotNotifications,
} from '../../lib/api';

export function AICopilotDashboard() {
  const { selectedChatId } = useProject();
  const [dashboard, setDashboard] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [notifications, setNotifications] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'health' | 'alerts'>('overview');

  useEffect(() => {
    if (!selectedChatId) return;
    loadAll();
  }, [selectedChatId]);

  async function loadAll() {
    setLoading(true);
    try {
      const [d, h, n] = await Promise.all([
        getCopilotDashboard(selectedChatId),
        getCustomerHealth(selectedChatId),
        getCopilotNotifications(selectedChatId),
      ]);
      setDashboard(d);
      setHealth(h);
      setNotifications(n);
    } catch { /* silent */ }
    setLoading(false);
  }

  const container: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: '16px',
    padding: '20px', maxWidth: '1200px', margin: '0 auto',
  };

  const tabBar: React.CSSProperties = {
    display: 'flex', gap: '4px', borderBottom: '1px solid #293245', paddingBottom: '8px', marginBottom: '8px',
  };

  const tabBtn = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px', borderRadius: '6px 6px 0 0',
    border: 'none', background: active ? 'rgba(83,167,255,0.12)' : 'transparent',
    color: active ? '#53a7ff' : '#6b7a93', cursor: 'pointer', fontSize: '13px', fontWeight: active ? 600 : 400,
    borderBottom: active ? '2px solid #53a7ff' : '2px solid transparent',
  });

  const cardGrid: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px',
  };

  const statCard: React.CSSProperties = {
    padding: '16px', background: '#0f1729', borderRadius: '8px',
    border: '1px solid #293245',
  };

  if (loading) return <div style={container}><Loading /></div>;

  const d = dashboard || {};
  const totals = d.totals || {};
  const pipelineHealth = d.pipelineHealth || [];

  return (
    <div style={container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Brain size={20} style={{ color: '#a855f7' }} />
          <span style={{ color: '#e5e7eb', fontSize: '18px', fontWeight: 700 }}>AI Sales Copilot</span>
        </div>
        <button onClick={loadAll} style={{
          padding: '8px 16px', borderRadius: '6px', border: '1px solid #293245',
          background: '#101622', color: '#9aa7bd', cursor: 'pointer', fontSize: '12px',
        }}>Refresh</button>
      </div>

      <div style={tabBar}>
        <button style={tabBtn(tab === 'overview')} onClick={() => setTab('overview')}>Overview</button>
        <button style={tabBtn(tab === 'health')} onClick={() => setTab('health')}>Customer Health</button>
        <button style={tabBtn(tab === 'alerts')} onClick={() => setTab('alerts')}>
          Alerts {notifications?.notifications?.length ? ` (${notifications.notifications.length})` : ''}
        </button>
      </div>

      {tab === 'overview' && (
        <>
          <div style={cardGrid}>
            <div style={statCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Target size={14} style={{ color: '#53a7ff' }} />
                <span style={{ color: '#6b7a93', fontSize: '11px', fontWeight: 600 }}>OPEN DEALS</span>
              </div>
              <div style={{ color: '#e5e7eb', fontSize: '28px', fontWeight: 700 }}>{totals.openDeals || 0}</div>
              <div style={{ color: '#6b7a93', fontSize: '11px' }}>of {totals.deals || 0} total</div>
            </div>
            <div style={statCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <TrendingUp size={14} style={{ color: '#10e18b' }} />
                <span style={{ color: '#6b7a93', fontSize: '11px', fontWeight: 600 }}>CLOSING PROBABILITY</span>
              </div>
              <div style={{ color: '#e5e7eb', fontSize: '28px', fontWeight: 700 }}>
                {d.closingProbability?.value != null ? `${d.closingProbability.value}%` : 'Not Measured'}
              </div>
              <div style={{ color: '#6b7a93', fontSize: '11px' }}>{d.closingProbability?.inferenceStatus || ''}</div>
            </div>
            <div style={statCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Clock size={14} style={{ color: '#ffb347' }} />
                <span style={{ color: '#6b7a93', fontSize: '11px', fontWeight: 600 }}>AVG DEAL AGE</span>
              </div>
              <div style={{ color: '#e5e7eb', fontSize: '28px', fontWeight: 700 }}>
                {d.avgDealAge?.value != null ? `${d.avgDealAge.value}d` : 'Not Measured'}
              </div>
              <div style={{ color: '#6b7a93', fontSize: '11px' }}>{d.avgDealAge?.inferenceStatus || ''}</div>
            </div>
            <div style={statCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Users size={14} style={{ color: '#a855f7' }} />
                <span style={{ color: '#6b7a93', fontSize: '11px', fontWeight: 600 }}>CONTACTS</span>
              </div>
              <div style={{ color: '#e5e7eb', fontSize: '28px', fontWeight: 700 }}>{totals.contacts || 0}</div>
              <div style={{ color: '#6b7a93', fontSize: '11px' }}>leads & customers</div>
            </div>
            <div style={statCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Activity size={14} style={{ color: '#ff4757' }} />
                <span style={{ color: '#6b7a93', fontSize: '11px', fontWeight: 600 }}>STALE DEALS</span>
              </div>
              <div style={{ color: '#e5e7eb', fontSize: '28px', fontWeight: 700 }}>{d.staleDeals?.count || 0}</div>
              <div style={{ color: '#6b7a93', fontSize: '11px' }}>no activity 14+ days</div>
            </div>
            <div style={statCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <AlertTriangle size={14} style={{ color: '#ffb347' }} />
                <span style={{ color: '#6b7a93', fontSize: '11px', fontWeight: 600 }}>FOLLOW-UPS NEEDED</span>
              </div>
              <div style={{ color: '#e5e7eb', fontSize: '28px', fontWeight: 700 }}>{d.followUpsNeeded?.count || 0}</div>
              <div style={{ color: '#6b7a93', fontSize: '11px' }}>contacts needing outreach</div>
            </div>
          </div>

          <Card>
            <h4 style={{ margin: '0 0 12px 0', color: '#e5e7eb' }}>Pipeline Health</h4>
            {pipelineHealth.length === 0 ? (
              <div style={{ color: '#6b7a93', fontStyle: 'italic', fontSize: '13px' }}>No active pipelines</div>
            ) : pipelineHealth.map((p: any) => (
              <div key={p.pipelineId} style={{ marginBottom: '12px' }}>
                <div style={{ color: '#9aa7bd', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  {p.pipelineName} ({p.totalDeals} deals)
                </div>
                <div style={{ display: 'flex', gap: '4px', height: '24px' }}>
                  {(p.stageDistribution || []).map((s: any) => (
                    <div key={s.stageId} style={{
                      flex: s.dealCount || 0.5, background: s.dealCount > 0 ? '#53a7ff' : '#1d2738',
                      borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: s.dealCount > 0 ? '#fff' : '#4a5568', fontSize: '11px', fontWeight: 600,
                      minWidth: '30px', transition: 'flex 0.3s',
                    }} title={`${s.stageName}: ${s.dealCount} deals`}>
                      {s.dealCount > 0 ? s.dealCount : ''}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '10px', color: '#6b7a93' }}>
                  {(p.stageDistribution || []).map((s: any) => (
                    <span key={s.stageId} title={s.stageName}>{s.stageName.slice(0, 8)}</span>
                  ))}
                </div>
              </div>
            ))}
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Card>
              <h4 style={{ margin: '0 0 8px 0', color: '#e5e7eb', fontSize: '14px' }}>Lead Score Distribution</h4>
              {Object.keys(d.leadScoreDistribution || {}).length === 0 ? (
                <div style={{ color: '#6b7a93', fontStyle: 'italic', fontSize: '12px' }}>Not measured</div>
              ) : Object.entries(d.leadScoreDistribution).map(([stage, count]: any) => (
                <div key={stage} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px', borderBottom: '1px solid #1d2738' }}>
                  <span style={{ color: '#9aa7bd' }}>{stage.replace(/_/g, ' ')}</span>
                  <span style={{ color: '#e5e7eb', fontWeight: 600 }}>{count}</span>
                </div>
              ))}
            </Card>
            <Card>
              <h4 style={{ margin: '0 0 8px 0', color: '#e5e7eb', fontSize: '14px' }}>Tasks & Workflows</h4>
              <div style={{ display: 'grid', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#9aa7bd' }}>Tasks overdue</span>
                  <Badge tone={d.tasksDueToday?.overdue > 0 ? 'red' : 'green'}>{d.tasksDueToday?.overdue || 0}</Badge>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#9aa7bd' }}>Tasks due today</span>
                  <Badge tone={d.tasksDueToday?.count > 0 ? 'yellow' : 'green'}>{d.tasksDueToday?.count || 0}</Badge>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#9aa7bd' }}>Active workflows</span>
                  <span style={{ color: '#e5e7eb' }}>{totals.workflows || 0}</span>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}

      {tab === 'health' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={cardGrid}>
            <div style={statCard}>
              <div style={{ color: '#10e18b', fontSize: '24px', fontWeight: 700 }}>{health?.summary?.healthy || 0}</div>
              <div style={{ color: '#6b7a93', fontSize: '12px' }}>Healthy</div>
            </div>
            <div style={statCard}>
              <div style={{ color: '#ffb347', fontSize: '24px', fontWeight: 700 }}>{health?.summary?.needsAttention || 0}</div>
              <div style={{ color: '#6b7a93', fontSize: '12px' }}>Needs Attention</div>
            </div>
            <div style={statCard}>
              <div style={{ color: '#ff4757', fontSize: '24px', fontWeight: 700 }}>{health?.summary?.atRisk || 0}</div>
              <div style={{ color: '#6b7a93', fontSize: '12px' }}>At Risk</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Card>
              <h4 style={{ margin: '0 0 8px 0', color: '#e5e7eb', fontSize: '14px' }}>Risk Indicators</h4>
              {[
                { label: 'Inactive Customers', value: health?.inactiveCustomers?.count },
                { label: 'No Follow-up', value: health?.noFollowUp?.count },
                { label: 'Deals Stuck', value: health?.dealsStuck?.count },
                { label: 'Missed Meetings', value: health?.missedMeetings?.count },
                { label: 'No Owner Assigned', value: health?.noOwnerAssigned?.count },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1d2738', fontSize: '13px' }}>
                  <span style={{ color: '#9aa7bd' }}>{item.label}</span>
                  <Badge tone={(item.value || 0) > 0 ? 'red' : 'green'}>{item.value ?? 0}</Badge>
                </div>
              ))}
            </Card>
            <Card>
              <h4 style={{ margin: '0 0 8px 0', color: '#e5e7eb', fontSize: '14px' }}>At-Risk Contacts</h4>
              {(health?.contactHealth || []).filter((c: any) => c.healthStatus === 'AT_RISK').slice(0, 10).map((c: any) => (
                <div key={c.contactId} style={{ padding: '6px 0', borderBottom: '1px solid #1d2738', fontSize: '12px' }}>
                  <div style={{ color: '#e5e7eb', fontWeight: 600 }}>{c.contactName}</div>
                  <div style={{ color: '#ff4757', fontSize: '11px' }}>{c.riskFlags?.slice(0, 2).map((f: any) => f.flag).join(', ')}</div>
                </div>
              ))}
              {health?.contactHealth?.filter((c: any) => c.healthStatus === 'AT_RISK').length === 0 && (
                <div style={{ color: '#6b7a93', fontStyle: 'italic', fontSize: '12px' }}>No at-risk contacts</div>
              )}
            </Card>
          </div>
        </div>
      )}

      {tab === 'alerts' && (
        <Card>
          <h4 style={{ margin: '0 0 12px 0', color: '#e5e7eb' }}>AI Copilot Alerts</h4>
          {(!notifications?.notifications || notifications.notifications.length === 0) ? (
            <div style={{ color: '#6b7a93', fontStyle: 'italic', fontSize: '13px' }}>No alerts at this time</div>
          ) : notifications.notifications.map((n: any, i: number) => (
            <div key={i} style={{
              padding: '12px', marginBottom: '8px', borderRadius: '6px',
              background: n.severity === 'WARNING' ? 'rgba(255,71,87,0.06)' : 'rgba(83,167,255,0.06)',
              border: `1px solid ${n.severity === 'WARNING' ? 'rgba(255,71,87,0.15)' : 'rgba(83,167,255,0.15)'}`,
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              {n.severity === 'WARNING' ? <AlertTriangle size={16} style={{ color: '#ff4757', flexShrink: 0 }} /> : <Activity size={16} style={{ color: '#53a7ff', flexShrink: 0 }} />}
              <div style={{ flex: 1 }}>
                <div style={{ color: '#e5e7eb', fontSize: '13px' }}>{n.message}</div>
                <div style={{ color: '#6b7a93', fontSize: '11px', marginTop: '2px' }}>{n.type}</div>
              </div>
              <Badge tone={n.severity === 'WARNING' ? 'red' : 'blue'}>{n.count || ''}</Badge>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
