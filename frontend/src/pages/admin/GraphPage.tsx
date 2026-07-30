import { useState, useEffect } from 'react';
import { Share2, Layers, Link2, AlertTriangle, Search, Shield, Zap, Globe, Package } from 'lucide-react';
import { getBrainGraph, type GraphData } from '../../lib/admin-api';

export default function AdminGraphPage() {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    getBrainGraph()
      .then(res => setData(res.graph))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="inline-loader"><span className="spin">&#9696;</span> Loading knowledge graph...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!data) return <div className="empty">No graph data available</div>;

  const filteredEntities = (data.newestEntities || []).filter((e: any) =>
    !searchQuery || (e.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Share2 size={32} color="#06b6d4" /> Knowledge Graph
        </h1>
        <p>Entity relationship graph, coverage, and health monitoring</p>
      </div>

      <div className="admin-metric-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #06b6d4' }}>
          <div className="admin-metric-header"><Layers size={18} color="#06b6d4" /><span>Entities</span></div>
          <div className="admin-metric-value">{data.entityCount?.toLocaleString() || '—'}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #8b5cf6' }}>
          <div className="admin-metric-header"><Link2 size={18} color="#8b5cf6" /><span>Relationships</span></div>
          <div className="admin-metric-value">{data.relationshipCount?.toLocaleString() || '—'}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #f59e0b' }}>
          <div className="admin-metric-header"><AlertTriangle size={18} color="#f59e0b" /><span>Duplicate Rate</span></div>
          <div className="admin-metric-value">{(data.duplicateRate * 100)?.toFixed(1) || '0'}%</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #10b981' }}>
          <div className="admin-metric-header"><Shield size={18} color="#10b981" /><span>Avg Confidence</span></div>
          <div className="admin-metric-value">{data.averageConfidence?.toFixed(1) || '—'}%</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginTop: '24px' }}>
        <div className="admin-section-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
            <Globe size={18} color="#3b82f6" /> Entity Types
          </h3>
          {data.entityTypes && Object.keys(data.entityTypes).length > 0 ? (
            <div style={{ display: 'grid', gap: '8px' }}>
              {Object.entries(data.entityTypes).map(([type, count]) => (
                <div key={type} className="admin-list-row">
                  <span>{type}</span>
                  <span style={{ color: '#94a0b8' }}>{String(count)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty" style={{ padding: '20px' }}>No entity type data</div>
          )}
        </div>

        <div className="admin-section-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
            <Package size={18} color="#a855f7" /> Relationship Types
          </h3>
          {data.relationshipTypes && Object.keys(data.relationshipTypes).length > 0 ? (
            <div style={{ display: 'grid', gap: '8px' }}>
              {Object.entries(data.relationshipTypes).map(([type, count]) => (
                <div key={type} className="admin-list-row">
                  <span>{type}</span>
                  <span style={{ color: '#94a0b8' }}>{String(count)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty" style={{ padding: '20px' }}>No relationship type data</div>
          )}
        </div>
      </div>

      <div className="admin-section-card" style={{ marginTop: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Zap size={18} color="#f59e0b" /> Newest Entities
          </h3>
          <div style={{ position: 'relative', width: '240px' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
            <input
              type="text"
              placeholder="Search entities..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '32px', height: '34px', fontSize: '13px' }}
            />
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Confidence</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntities.map((e: any, i: number) => (
                <tr key={e.id || i}>
                  <td><strong>{e.name || e.label || 'Unnamed'}</strong></td>
                  <td><span className="badge">{e.type || e.entityType || '—'}</span></td>
                  <td>{e.confidence != null ? `${(e.confidence * 100).toFixed(0)}%` : (e.score != null ? `${e.score.toFixed(0)}%` : '—')}</td>
                  <td style={{ color: '#6b7280', fontSize: '12px' }}>{e.createdAt ? new Date(e.createdAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
              {filteredEntities.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>No entities found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}