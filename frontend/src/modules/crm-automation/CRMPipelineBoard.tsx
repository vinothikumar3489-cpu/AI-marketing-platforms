import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { TrendingUp, ChevronDown, Loader2, AlertTriangle, GripVertical } from 'lucide-react';
import { Card, Badge } from '../../components/UI';
import { useProject } from '../../context/ProjectContext';
import { listCRMPipelines, listCRMDeals, moveDealStage } from '../../lib/api';
import { CRMLoadingState } from './CRMLoadingState';
import { CRMEmptyState } from './CRMEmptyState';

export function CRMPipelineBoard() {
  const { selectedChatId } = useProject();
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDealId, setExpandedDealId] = useState<string | null>(null);
  const [movingDealId, setMovingDealId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedChatId) { setLoading(false); return; }
    loadPipelines();
  }, [selectedChatId]);

  useEffect(() => {
    if (selectedPipelineId) loadDeals();
  }, [selectedPipelineId]);

  async function loadPipelines() {
    if (!selectedChatId) return;
    setLoading(true); setError(null);
    try {
      const result = await listCRMPipelines(selectedChatId);
      const list = Array.isArray(result) ? result : [];
      setPipelines(list);
      if (list.length > 0 && !selectedPipelineId) {
        setSelectedPipelineId(list[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load pipelines');
    } finally {
      setLoading(false);
    }
  }

  async function loadDeals() {
    if (!selectedChatId || !selectedPipelineId) return;
    setLoading(true);
    try {
      const result = await listCRMDeals(selectedChatId, { pipelineId: selectedPipelineId });
      setDeals(Array.isArray(result) ? result : []);
    } catch {
      setDeals([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleMoveStage(dealId: string, stageId: string) {
    if (!selectedChatId) return;
    setMovingDealId(dealId);
    try {
      await moveDealStage(selectedChatId, dealId, stageId);
      toast.success('Deal moved');
      await loadDeals();
    } catch (err: any) {
      toast.error(err.message || 'Failed to move deal');
    } finally {
      setMovingDealId(null);
    }
  }

  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId);
  const stages = selectedPipeline?.stages?.sort((a: any, b: any) => a.order - b.order) || [];

  function getDealsForStage(stageId: string) {
    return deals.filter(d => d.stageId === stageId);
  }

  if (loading && pipelines.length === 0) return <CRMLoadingState message="Loading pipeline..." />;
  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '60px 20px', background: '#0f1729', borderRadius: '12px', border: '1px solid rgba(255,71,87,0.2)' }}>
        <AlertTriangle size={36} style={{ color: '#ff4757' }} />
        <div style={{ color: '#ff8a8a', fontSize: '14px' }}>{error}</div>
        <button onClick={loadPipelines} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #53a7ff', background: 'rgba(83,167,255,0.15)', color: '#53a7ff', cursor: 'pointer', fontSize: '12px' }}>Retry</button>
      </div>
    );
  }

  if (pipelines.length === 0) {
    return <CRMEmptyState title="No Pipelines" message="Create a pipeline to start managing deals." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: '#e5e7eb', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} style={{ color: '#10e18b' }} /> Pipeline Board
          </div>
          <div style={{ color: '#6b7a93', fontSize: '12px', marginTop: '2px' }}>{deals.length} deals across {stages.length} stages</div>
        </div>
        <select
          value={selectedPipelineId}
          onChange={e => setSelectedPipelineId(e.target.value)}
          style={{
            padding: '8px 12px', background: '#0f1729', border: '1px solid #293245',
            borderRadius: '6px', color: '#e5e7eb', fontSize: '13px', cursor: 'pointer', minWidth: '200px',
          }}
        >
          {pipelines.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '12px', minHeight: '400px' }}>
        {stages.map(stage => {
          const stageDeals = getDealsForStage(stage.id);
          return (
            <div key={stage.id} style={{ flex: '0 0 280px', minWidth: '280px', display: 'flex', flexDirection: 'column' }}>
              <div style={{
                padding: '10px 14px', background: '#151d2b', borderRadius: '8px 8px 0 0',
                borderBottom: `3px solid ${stage.isClosed ? '#ff4757' : '#53a7ff'}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ color: '#e5e7eb', fontSize: '13px', fontWeight: 600 }}>{stage.name}</span>
                <Badge tone={stage.isClosed ? 'red' : 'blue'}>{stageDeals.length}</Badge>
              </div>
              <div style={{
                flex: 1, background: '#0a111f', borderRadius: '0 0 8px 8px',
                border: '1px solid #293245', borderTop: 'none',
                padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px',
              }}>
                {stageDeals.length === 0 ? (
                  <div style={{ color: '#4a5568', fontSize: '11px', textAlign: 'center', padding: '20px 0' }}>No deals</div>
                ) : (
                  stageDeals.map(deal => {
                    const isExpanded = expandedDealId === deal.id;
                    const allStages = stages;
                    const currentIndex = allStages.findIndex((s: any) => s.id === stage.id);
                    const isMoving = movingDealId === deal.id;
                    return (
                      <div key={deal.id} style={{
                        background: '#0f1729', border: '1px solid #293245', borderRadius: '6px',
                        padding: '10px', cursor: 'pointer', transition: 'border-color 0.2s',
                      }}
                        onClick={() => setExpandedDealId(isExpanded ? null : deal.id)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: '#e5e7eb', fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {deal.name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7a93', marginTop: '2px' }}>
                              {deal.value != null ? `${deal.currency || '$'}${deal.value.toLocaleString()}` : 'Not measured'}
                            </div>
                            {deal.contact && (
                              <div style={{ fontSize: '11px', color: '#9aa7bd', marginTop: '4px' }}>
                                {deal.contact.firstName} {deal.contact.lastName}
                              </div>
                            )}
                          </div>
                          <GripVertical size={14} style={{ color: '#4a5568', flexShrink: 0 }} />
                        </div>

                        {isExpanded && (
                          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #1d2738' }}>
                            {deal.description && <div style={{ fontSize: '12px', color: '#9aa7bd', marginBottom: '8px' }}>{deal.description}</div>}
                            <div style={{ fontSize: '11px', color: '#6b7a93', marginBottom: '8px' }}>
                              {deal.expectedCloseDate && <div>Expected close: {new Date(deal.expectedCloseDate).toLocaleDateString()}</div>}
                              {deal.source && <div>Source: {deal.source}</div>}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <label style={{ color: '#9aa7bd', fontSize: '10px', fontWeight: 600 }}>Move to stage:</label>
                              <select
                                value={stage.id}
                                onChange={e => { handleMoveStage(deal.id, e.target.value); }}
                                onClick={e => e.stopPropagation()}
                                disabled={isMoving}
                                style={{
                                  width: '100%', padding: '6px 8px', background: '#0f1729',
                                  border: '1px solid #293245', borderRadius: '4px', color: '#e5e7eb', fontSize: '11px', cursor: 'pointer',
                                }}
                              >
                                {allStages.map((s: any) => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
