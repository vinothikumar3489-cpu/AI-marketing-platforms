import { useState } from 'react';
import {
  Brain, TrendingUp, Target, Clock, Send, FileText,
  AlertTriangle, Loader2, Star, MessageSquare, Zap,
} from 'lucide-react';
import { Card, Badge, Loading } from '../../components/UI';
import {
  getDealInsights, generateFollowUp, scoreOpportunity, generateProposal,
} from '../../lib/api';

interface Props {
  chatId: string;
  dealId: string;
  dealName?: string;
}

export function DealInsightsPanel({ chatId, dealId, dealName }: Props) {
  const [insights, setInsights] = useState<any>(null);
  const [score, setScore] = useState<any>(null);
  const [followUp, setFollowUp] = useState<any>(null);
  const [proposal, setProposal] = useState<any>(null);
  const [loading, setLoading] = useState<'insights' | 'score' | 'followup' | 'proposal' | null>(null);

  const container: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px',
  };

  const btn: React.CSSProperties = {
    padding: '8px 16px', borderRadius: '6px', border: '1px solid #293245',
    background: '#101622', color: '#e5e7eb', cursor: 'pointer', fontSize: '12px',
    display: 'flex', alignItems: 'center', gap: '6px',
  };

  async function loadInsights() {
    setLoading('insights');
    try {
      const [d, s] = await Promise.all([
        getDealInsights(chatId, dealId),
        scoreOpportunity(chatId, dealId),
      ]);
      setInsights(d);
      setScore(s);
    } catch { /* silent */ }
    setLoading(null);
  }

  async function loadFollowUp(channel: string) {
    setLoading('followup');
    try {
      const r = await generateFollowUp(chatId, dealId, channel);
      setFollowUp(r);
    } catch { /* silent */ }
    setLoading(null);
  }

  async function loadProposal() {
    setLoading('proposal');
    try {
      const r = await generateProposal(chatId, dealId);
      setProposal(r);
    } catch { /* silent */ }
    setLoading(null);
  }

  return (
    <div style={container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Brain size={16} style={{ color: '#a855f7' }} />
          <span style={{ color: '#e5e7eb', fontWeight: 600, fontSize: '14px' }}>
            {dealName ? `AI Insights: ${dealName}` : 'AI Deal Insights'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button style={btn} onClick={loadInsights} disabled={loading !== null}>
            {loading === 'insights' ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
            Analyze
          </button>
          <button style={btn} onClick={() => loadFollowUp('email')} disabled={loading !== null}>
            {loading === 'followup' ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            Follow-up
          </button>
          <button style={btn} onClick={loadProposal} disabled={loading !== null}>
            {loading === 'proposal' ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
            Proposal
          </button>
        </div>
      </div>

      {!insights && !followUp && !proposal && (
        <div style={{ color: '#6b7a93', fontSize: '13px', fontStyle: 'italic', padding: '20px', textAlign: 'center' }}>
          Select a deal and click Analyze to generate AI-powered insights, recommendations, and proposals.
        </div>
      )}

      {loading === 'insights' && <Loading />}

      {insights && insights.data && (
        <div style={{ display: 'grid', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            {[
              { label: 'Score', icon: <Star size={14} />, val: insights.data.score || 'Not Measured', color: '#ffb347' },
              { label: 'Probability', icon: <TrendingUp size={14} />, val: `${insights.data.closingProbability || '?'}%`, color: '#10e18b' },
              { label: 'Urgency', icon: <AlertTriangle size={14} />, val: insights.data.urgency || 'Not Measured', color: '#ff4757' },
            ].map(m => (
              <div key={m.label} style={{ padding: '12px', background: '#0f1729', borderRadius: '6px', border: '1px solid #293245' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', color: m.color }}>
                  {m.icon}
                  <span style={{ fontSize: '11px', fontWeight: 600 }}>{m.label}</span>
                </div>
                <div style={{ color: '#e5e7eb', fontSize: '18px', fontWeight: 700 }}>{m.val}</div>
              </div>
            ))}
          </div>

          {insights.data.summary && (
            <Card>
              <h4 style={{ margin: '0 0 6px 0', color: '#e5e7eb', fontSize: '13px' }}>Executive Summary</h4>
              <div style={{ color: '#9aa7bd', fontSize: '13px', lineHeight: 1.5 }}>{insights.data.summary}</div>
            </Card>
          )}

          {insights.data.insights?.length > 0 && (
            <div>
              <h4 style={{ color: '#e5e7eb', fontSize: '13px', marginBottom: '6px' }}>Insights</h4>
              <div style={{ display: 'grid', gap: '6px' }}>
                {insights.data.insights.map((ins: any, i: number) => (
                  <div key={i} style={{
                    padding: '8px 12px', borderRadius: '6px', fontSize: '13px',
                    background: ins.type === 'RISK' ? 'rgba(255,71,87,0.06)' : ins.type === 'OPPORTUNITY' ? 'rgba(16,225,139,0.06)' : 'rgba(83,167,255,0.06)',
                    border: `1px solid ${ins.type === 'RISK' ? 'rgba(255,71,87,0.15)' : ins.type === 'OPPORTUNITY' ? 'rgba(16,225,139,0.15)' : 'rgba(83,167,255,0.15)'}`,
                    color: '#9aa7bd',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <Badge tone={ins.type === 'RISK' ? 'red' : ins.type === 'OPPORTUNITY' ? 'green' : 'blue'}>
                        {ins.type}
                      </Badge>
                      {ins.inferenceStatus && (
                        <span style={{ fontSize: '10px', color: '#6b7a93' }}>{ins.inferenceStatus.replace(/_/g, ' ')}</span>
                      )}
                    </div>
                    <div>{ins.message || ins.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {insights.data.recommendedActions?.length > 0 && (
            <div>
              <h4 style={{ color: '#e5e7eb', fontSize: '13px', marginBottom: '6px' }}>Recommended Actions</h4>
              <div style={{ display: 'grid', gap: '6px' }}>
                {insights.data.recommendedActions.map((a: any, i: number) => (
                  <div key={i} style={{
                    padding: '8px 12px', borderRadius: '6px', fontSize: '13px',
                    background: 'rgba(83,167,255,0.06)', border: '1px solid rgba(83,167,255,0.15)', color: '#9aa7bd',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <Zap size={12} style={{ color: '#53a7ff' }} />
                      <Badge tone="blue">{a.priority || 'NORMAL'}</Badge>
                      {a.inferenceStatus && <span style={{ fontSize: '10px', color: '#6b7a93' }}>{a.inferenceStatus.replace(/_/g, ' ')}</span>}
                    </div>
                    <div>{a.action}</div>
                    {a.channel && <div style={{ fontSize: '11px', color: '#6b7a93' }}>Channel: {a.channel}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {followUp && followUp.data && (
        <Card>
          <h4 style={{ margin: '0 0 6px 0', color: '#e5e7eb', fontSize: '13px' }}>
            <Send size={14} style={{ display: 'inline', marginRight: '6px' }} />
            AI Follow-Up Draft
          </h4>
          <div style={{ color: '#9aa7bd', fontSize: '13px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
            {followUp.data.content || followUp.data.draft || 'No draft generated'}
          </div>
          {followUp.data.inferenceStatus && (
            <div style={{ fontSize: '10px', color: '#6b7a93', marginTop: '6px' }}>
              Status: {followUp.data.inferenceStatus.replace(/_/g, ' ')}
            </div>
          )}
        </Card>
      )}

      {proposal && proposal.data && (
        <Card>
          <h4 style={{ margin: '0 0 6px 0', color: '#e5e7eb', fontSize: '13px' }}>
            <FileText size={14} style={{ display: 'inline', marginRight: '6px' }} />
            AI Proposal
          </h4>
          {proposal.data.id && (
            <div style={{ fontSize: '11px', color: '#6b7a93', marginBottom: '6px' }}>
              ID: {proposal.data.id} | Version: {proposal.data.version || 1}
            </div>
          )}
          <div style={{ color: '#9aa7bd', fontSize: '13px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
            {proposal.data.content || proposal.data.body || 'No proposal generated'}
          </div>
        </Card>
      )}
    </div>
  );
}
