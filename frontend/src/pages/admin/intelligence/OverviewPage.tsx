import { useState, useEffect } from 'react';
import { Activity, Cpu, Bell, Lightbulb, Target, TrendingUp, Clock, AlertTriangle, Play, CheckCircle2, XCircle } from 'lucide-react';
import { getIntelligenceOverview, runIntelligenceCycle } from '../../../lib/intelligence-api';

export default function IntelligenceOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const fetchData = () => {
    setLoading(true);
    getIntelligenceOverview()
      .then(res => setData(res.overview))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleRunCycle = async () => {
    setRunning(true);
    try {
      await runIntelligenceCycle();
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <div className="inline-loader"><span className="spin">&#9696;</span> Loading Intelligence Overview...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!data) return <div className="empty">No intelligence overview available</div>;

  const cycleStatus = data.lastCycleErrors > 0 ? '#ef4444' : data.lastCycleElapsed > 30000 ? '#f59e0b' : '#10b981';

  const moduleStatusColor = (s: string) => s === 'ok' || s === 'healthy' ? '#10b981' : s === 'running' ? '#3b82f6' : s === 'error' ? '#ef4444' : '#6b7280';

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Activity size={32} color="#a855f7" /> Intelligence Overview
            </h1>
          </div>
          <button className="primary-btn small" onClick={handleRunCycle} disabled={running}>
            <Play size={14} /> {running ? 'Running...' : 'Run Cycle'}
          </button>
        </div>
        <p>Real-time status of the autonomous intelligence system</p>
      </div>

      <div className="admin-metric-grid">
        <div className="admin-metric-card" style={{ borderTop: '3px solid #a855f7' }}>
          <div className="admin-metric-header"><Cpu size={18} color="#a855f7" /> Modules</div>
          <div className="admin-metric-value">{data.modulesInitialized}/{data.modules}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #3b82f6' }}>
          <div className="admin-metric-header"><Activity size={18} color="#3b82f6" /> Active Jobs</div>
          <div className="admin-metric-value">{data.activeJobs}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #10b981' }}>
          <div className="admin-metric-header"><Target size={18} color="#10b981" /> Opportunities</div>
          <div className="admin-metric-value">{data.totalOpportunities}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #f59e0b' }}>
          <div className="admin-metric-header"><Lightbulb size={18} color="#f59e0b" /> High Value</div>
          <div className="admin-metric-value">{data.highValueOpportunities}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #ef4444' }}>
          <div className="admin-metric-header"><Bell size={18} color="#ef4444" /> Alerts</div>
          <div className="admin-metric-value">{data.totalAlerts}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #ff6b35' }}>
          <div className="admin-metric-header"><AlertTriangle size={18} color="#ff6b35" /> Critical</div>
          <div className="admin-metric-value">{data.criticalAlerts}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #06b6d4' }}>
          <div className="admin-metric-header"><TrendingUp size={18} color="#06b6d4" /> Insights</div>
          <div className="admin-metric-value">{data.totalInsights}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #8b5cf6' }}>
          <div className="admin-metric-header"><Clock size={18} color="#8b5cf6" /> Cycle Time</div>
          <div className="admin-metric-value">{(data.lastCycleTime / 1000).toFixed(1)}s</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginTop: '24px' }}>
        <div className="admin-section-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
            <Activity size={18} color="#3b82f6" /> Module Status
          </h3>
          {data.moduleStatus && Object.entries(data.moduleStatus).length > 0 ? (
            Object.entries(data.moduleStatus).map(([name, status]: [string, any]) => (
              <div key={name} className="admin-list-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: moduleStatusColor(String(status)) }} />
                  <strong>{name}</strong>
                </div>
                <span style={{ color: moduleStatusColor(String(status)), textTransform: 'capitalize' }}>{String(status)}</span>
              </div>
            ))
          ) : (
            <div className="empty" style={{ padding: '20px' }}>No module status data</div>
          )}
        </div>

        <div className="admin-section-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
            <Clock size={18} color="#8b5cf6" /> Last Cycle
          </h3>
          <div style={{ display: 'grid', gap: '8px' }}>
            <div className="admin-list-row">
              <span>Duration</span>
              <span style={{ color: '#94a0b8' }}>{(data.lastCycleTime / 1000).toFixed(1)}s</span>
            </div>
            <div className="admin-list-row">
              <span>Elapsed</span>
              <span style={{ color: cycleStatus }}>
                {data.lastCycleElapsed > 60000 ? `${(data.lastCycleElapsed / 60000).toFixed(1)}m` : `${(data.lastCycleElapsed / 1000).toFixed(1)}s`}
              </span>
            </div>
            <div className="admin-list-row">
              <span>Errors</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {data.lastCycleErrors > 0 ? <XCircle size={14} color="#ef4444" /> : <CheckCircle2 size={14} color="#10b981" />}
                <span style={{ color: data.lastCycleErrors > 0 ? '#ef4444' : '#10b981' }}>{data.lastCycleErrors}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
