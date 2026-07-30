import { useState, useEffect } from 'react';
import { Bot, CheckCircle2, XCircle, Clock, Activity, Shield, Zap, Layers, ListOrdered } from 'lucide-react';
import { getBrainAgents, type AgentInfo, type AgentData } from '../../lib/admin-api';

export default function AdminAgentsPage() {
  const [data, setData] = useState<AgentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBrainAgents()
      .then(res => setData({ agents: res.agents, status: res.status, health: res.health }))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="inline-loader"><span className="spin">&#9696;</span> Loading agents...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!data) return <div className="empty">No agent data available</div>;

  const agents = data.agents || [];

  return (
    <div>
      <div className="page-header">
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Bot size={32} color="#6366f1" /> AI Agents
        </h1>
        <p>Monitor agent health, execution metrics, and task queues</p>
      </div>

      <div className="admin-metric-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #6366f1' }}>
          <div className="admin-metric-header"><Bot size={18} color="#6366f1" /><span>Total Agents</span></div>
          <div className="admin-metric-value">{agents.length}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #10b981' }}>
          <div className="admin-metric-header"><CheckCircle2 size={18} color="#10b981" /><span>Healthy</span></div>
          <div className="admin-metric-value">{agents.filter(a => a.status === 'HEALTHY').length}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #f59e0b' }}>
          <div className="admin-metric-header"><Activity size={18} color="#f59e0b" /><span>Registered</span></div>
          <div className="admin-metric-value">{data.status?.registeredAgents || 0}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #8b5cf6' }}>
          <div className="admin-metric-header"><ListOrdered size={18} color="#8b5cf6" /><span>Completed</span></div>
          <div className="admin-metric-value">{data.status?.completedTasks || 0}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '16px', marginTop: '24px' }}>
        {agents.map((agent: AgentInfo, i: number) => {
          const isHealthy = agent.status === 'HEALTHY';
          const invocations = agent.metrics?.invocations || 0;
          const avgTime = agent.metrics?.avgTime || 0;
          const failures = agent.metrics?.failures || 0;
          return (
            <div key={agent.name || i} className="admin-section-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Bot size={20} color={isHealthy ? '#10b981' : '#f59e0b'} />
                  <div>
                    <strong style={{ fontSize: '16px' }}>{agent.name}</strong>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                      {(agent.capabilities || []).map((cap: string, ci: number) => (
                        <span key={ci} className="badge" style={{ fontSize: '11px' }}>{cap}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '999px', background: isHealthy ? '#063b2a' : '#33280b', color: isHealthy ? '#10e18b' : '#ffc53d', fontSize: '13px', fontWeight: 600 }}>
                  {isHealthy ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                  {agent.status}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginTop: '8px' }}>
                <div><div style={{ fontSize: '11px', color: '#6b7280' }}>Invocations</div><div style={{ fontWeight: 600 }}>{invocations.toLocaleString()}</div></div>
                <div><div style={{ fontSize: '11px', color: '#6b7280' }}>Avg Time</div><div style={{ fontWeight: 600 }}>{avgTime.toFixed(0)}ms</div></div>
                <div><div style={{ fontSize: '11px', color: '#6b7280' }}>Failures</div><div style={{ fontWeight: 600, color: failures > 0 ? '#ef4444' : '#10b981' }}>{failures}</div></div>
                <div><div style={{ fontSize: '11px', color: '#6b7280' }}>Queue</div><div style={{ fontWeight: 600 }}>{(agent as any).queueSize ?? '—'}</div></div>
                <div><div style={{ fontSize: '11px', color: '#6b7280' }}>Last Exec</div><div style={{ fontWeight: 600, fontSize: '12px' }}>{agent.lastExecution ? new Date(agent.lastExecution).toLocaleString() : '—'}</div></div>
              </div>
            </div>
          );
        })}
        {agents.length === 0 && <div className="empty" style={{ padding: '40px' }}>No agents registered</div>}
      </div>
    </div>
  );
}