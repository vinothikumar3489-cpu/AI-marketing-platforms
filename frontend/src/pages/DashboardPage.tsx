import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { Card, PageHeader, ScoreCard } from '../components/UI';
import { Bot, CheckCircle, Activity, Zap } from 'lucide-react';

export default function DashboardPage() {
  const { chats, selectedChatId, fullResults, refreshChats } = useProject();
  const navigate = useNavigate();

  useEffect(() => {
    refreshChats();
  }, []);

  // Show current project summary if available
  const hasGrowth = fullResults?.growth && Object.keys(fullResults.growth).length > 0;
  const hasSeo = fullResults?.seoIntelligence && Object.keys(fullResults.seoIntelligence).length > 0;
  const totalProjects = (chats || []).length;
  const analyzedCount = (chats || []).filter((c: any) => c.growthScore || c.seoScore).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '30px' }}>
        <PageHeader eyebrow="Executive Command Center" title="Global Dashboard" subtitle="Platform status and latest project summary." />
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/app/growth-workspace" className="primary-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <Zap size={16} /> Open Analysis
          </Link>
        </div>
      </div>

      <div className="score-grid" style={{ marginBottom: '20px' }}>
        <ScoreCard label="Active Project" value={selectedChatId ? 'Yes' : 'None selected'} tone="blue" />
        <ScoreCard label="Growth Data" value={hasGrowth ? 'Available' : 'Not yet run'} tone={hasGrowth ? 'green' : 'purple'} />
        <ScoreCard label="SEO Data" value={hasSeo ? 'Available' : 'Not yet run'} tone={hasSeo ? 'green' : 'pink'} />
        <ScoreCard label="Total Projects" value={totalProjects} />
        <ScoreCard label="Analyzed" value={analyzedCount} tone="purple" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        <Card>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Activity size={18} /> Platform Status</h3>
          <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: '#151d2b', borderRadius: '8px' }}>
              <CheckCircle size={16} color="#10e18b" />
              <span style={{ color: '#9aa7bd' }}>Analysis pipeline operational</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: '#151d2b', borderRadius: '8px' }}>
              <CheckCircle size={16} color="#10e18b" />
              <span style={{ color: '#9aa7bd' }}>{totalProjects} saved project{totalProjects !== 1 ? 's' : ''}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: '#151d2b', borderRadius: '8px' }}>
              <CheckCircle size={16} color={selectedChatId ? '#10e18b' : '#ffb347'} />
              <span style={{ color: '#9aa7bd' }}>{selectedChatId ? 'Project selected' : 'No project selected'}</span>
            </div>
          </div>
        </Card>

        <Card>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Bot size={18} /> Quick Actions</h3>
          <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link to="/app/growth-workspace" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', background: '#151d2b', borderRadius: '8px', textDecoration: 'none', color: '#fff' }}>
              <Zap size={18} color="#53a7ff" />
              <div>
                <div style={{ fontWeight: 'bold' }}>Growth Workspace</div>
                <div style={{ fontSize: '12px', color: '#9aa7bd' }}>Business intelligence analysis</div>
              </div>
            </Link>
            <Link to="/app/seo" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', background: '#151d2b', borderRadius: '8px', textDecoration: 'none', color: '#fff' }}>
              <Activity size={18} color="#10e18b" />
              <div>
                <div style={{ fontWeight: 'bold' }}>SEO Intelligence</div>
                <div style={{ fontSize: '12px', color: '#9aa7bd' }}>Search & GEO optimization audit</div>
              </div>
            </Link>
            <Link to="/app/chat-history" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', background: '#151d2b', borderRadius: '8px', textDecoration: 'none', color: '#fff' }}>
              <Bot size={18} color="#a855f7" />
              <div>
                <div style={{ fontWeight: 'bold' }}>Project History</div>
                <div style={{ fontSize: '12px', color: '#9aa7bd' }}>Manage all saved analyses</div>
              </div>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
