import { useEffect, useState } from 'react';
import { Users, Building, TrendingUp, ClipboardList, Activity, Workflow, Mail, FileText, Loader2, AlertTriangle } from 'lucide-react';
import { Card, Badge, Loading } from '../../components/UI';
import { useProject } from '../../context/ProjectContext';
import { getCRMDashboard } from '../../lib/api';
import { CRMLoadingState } from './CRMLoadingState';
import { CRMEmptyState } from './CRMEmptyState';

export function CRMDashboard() {
  const { selectedChatId } = useProject();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedChatId) { setLoading(false); return; }
    loadDashboard();
  }, [selectedChatId]);

  async function loadDashboard() {
    if (!selectedChatId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getCRMDashboard(selectedChatId);
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load CRM dashboard');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <CRMLoadingState message="Loading CRM dashboard..." />;
  if (error) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '60px 20px', gap: '16px', background: '#0f1729', borderRadius: '12px',
        border: '1px solid rgba(255,71,87,0.2)',
      }}>
        <AlertTriangle size={40} style={{ color: '#ff4757' }} />
        <h3 style={{ color: '#ff8a8a', margin: 0 }}>Failed to Load Dashboard</h3>
        <p style={{ color: '#9aa7bd', margin: 0, fontSize: '13px', textAlign: 'center' }}>{error}</p>
        <button onClick={loadDashboard} style={{
          padding: '8px 16px', borderRadius: '6px', border: '1px solid #53a7ff',
          background: 'rgba(83,167,255,0.15)', color: '#53a7ff', cursor: 'pointer', fontSize: '12px',
        }}>Retry</button>
      </div>
    );
  }

  if (!data) {
    return <CRMEmptyState title="No Dashboard Data" message="CRM data is not available yet." />;
  }

  const counts = data.counts || {};
  const recentActivities = data.recentActivities || [];
  const workflowSummary = data.workflowSummary || {};

  const statCards = [
    { label: 'Contacts', value: counts.contacts ?? 0, icon: Users, color: '#53a7ff' },
    { label: 'Companies', value: counts.companies ?? 0, icon: Building, color: '#a855f7' },
    { label: 'Open Deals', value: counts.openDeals ?? 0, icon: TrendingUp, color: '#10e18b' },
    { label: 'Due Tasks', value: counts.dueTasks ?? 0, icon: ClipboardList, color: '#ffb347' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div>
        <div style={{ color: '#e5e7eb', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={20} style={{ color: '#53a7ff' }} /> CRM Dashboard
        </div>
        <div style={{ color: '#6b7a93', fontSize: '12px', marginTop: '2px' }}>
          Overview of contacts, deals, tasks, and activities
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        {statCards.map((stat) => (
          <Card key={stat.label} style={{ textAlign: 'center', padding: '20px' }}>
            <stat.icon size={24} style={{ color: stat.color, marginBottom: '8px' }} />
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#e5e7eb' }}>{stat.value}</div>
            <div style={{ fontSize: '12px', color: '#6b7a93' }}>{stat.label}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <Card>
          <h4 style={{ margin: '0 0 12px 0', color: '#e5e7eb', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
            <Activity size={14} style={{ color: '#53a7ff' }} /> Recent Activities
          </h4>
          {recentActivities.length === 0 ? (
            <div style={{ color: '#6b7a93', fontSize: '12px', padding: '20px 0', textAlign: 'center' }}>No recent activities</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {recentActivities.slice(0, 10).map((act: any, i: number) => (
                <div key={act.id || i} style={{ fontSize: '12px', padding: '6px 0', borderBottom: '1px solid #1d2738', display: 'flex', gap: '8px' }}>
                  <span style={{ color: '#53a7ff', flexShrink: 0 }}>{act.activityType}</span>
                  <span style={{ color: '#e5e7eb' }}>{act.title}</span>
                  <span style={{ color: '#6b7a93', marginLeft: 'auto', flexShrink: 0 }}>
                    {act.activityDate ? new Date(act.activityDate).toLocaleDateString() : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h4 style={{ margin: '0 0 12px 0', color: '#e5e7eb', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
            <Workflow size={14} style={{ color: '#a855f7' }} /> Workflow Status
          </h4>
          {Object.keys(workflowSummary).length === 0 ? (
            <div style={{ color: '#6b7a93', fontSize: '12px', padding: '20px 0', textAlign: 'center' }}>No workflows configured</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {Object.entries(workflowSummary).map(([key, val]: [string, any]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #1d2738', fontSize: '13px' }}>
                  <span style={{ color: '#9aa7bd', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</span>
                  <Badge tone={val > 0 ? 'green' : 'gray'}>{val}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {data.campaignPlanId && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={16} style={{ color: '#53a7ff' }} />
            <span style={{ color: '#e5e7eb', fontSize: '13px' }}>Campaign Plan Available</span>
            <Badge tone="blue">Active</Badge>
          </div>
        </Card>
      )}
    </div>
  );
}
