import React from 'react';
import { FileText, Target, Search, Code, Copy, Settings, HelpCircle, Activity, CheckCircle } from 'lucide-react';
import SafeValue from '../SafeValue';

export const PriorityBadge = ({ priority }: { priority: string }) => {
  const p = (priority && typeof priority === 'string' ? priority.toLowerCase() : '') || 'medium';
  let color = '#ffa502';
  let bg = 'rgba(255, 165, 2, 0.1)';
  let icon = '🟡';
  
  if (p.includes('high') || p.includes('critical')) {
    color = '#ff4757';
    bg = 'rgba(255, 71, 87, 0.1)';
    icon = '🔴';
  } else if (p.includes('low')) {
    color = '#10e18b';
    bg = 'rgba(16, 225, 139, 0.1)';
    icon = '🟢';
  }

  return (
    <span style={{ 
      color, 
      background: bg, 
      padding: '4px 10px', 
      borderRadius: '12px', 
      fontSize: '11px', 
      fontWeight: 'bold', 
      textTransform: 'uppercase',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px'
    }}>
      {icon} {priority || 'Medium'} PRIORITY
    </span>
  );
};

export const ContentSectionTags = ({ sections }: { sections: string[] | string }) => {
  const tags = Array.isArray(sections) ? sections : (typeof sections === 'string' ? sections.split(',').map(s => s.trim()) : []);
  if (!tags.length) return null;
  
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
      {tags.map((tag, i) => (
        <span key={i} style={{ 
          background: '#1d2738', 
          color: '#e2e8f0', 
          padding: '4px 10px', 
          borderRadius: '16px', 
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <CheckCircle size={12} color="#10e18b" /> {tag}
        </span>
      ))}
    </div>
  );
};

export const OpportunityProgress = ({ score }: { score: number }) => {
  const safeScore = Math.min(100, Math.max(0, Number(score) || 0));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ flex: 1, background: '#1d2738', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ 
          width: `${safeScore}%`, 
          height: '100%', 
          background: 'linear-gradient(90deg, #a855f7, #53a7ff)',
          borderRadius: '4px'
        }}></div>
      </div>
      <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>{safeScore}%</span>
    </div>
  );
};

export const RecommendationActions = () => {
  return (
    <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
      <button style={{ 
        background: '#a855f7', 
        color: '#fff', 
        border: 'none', 
        padding: '8px 16px', 
        borderRadius: '6px', 
        fontSize: '13px', 
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: '0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}
      onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
      onMouseOut={e => e.currentTarget.style.opacity = '1'}
      >
        <Code size={14} /> Generate Content
      </button>
      <button style={{ 
        background: 'transparent', 
        color: '#9aa7bd', 
        border: '1px solid #293245', 
        padding: '8px 16px', 
        borderRadius: '6px', 
        fontSize: '13px', 
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}
      onMouseOver={e => { e.currentTarget.style.background = '#1d2738'; e.currentTarget.style.color = '#fff'; }}
      onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9aa7bd'; }}
      >
        <Search size={14} /> View Details
      </button>
      <button style={{ 
        background: 'transparent', 
        color: '#9aa7bd', 
        border: '1px solid #293245', 
        padding: '8px 16px', 
        borderRadius: '6px', 
        fontSize: '13px', 
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}
      onMouseOver={e => { e.currentTarget.style.background = '#1d2738'; e.currentTarget.style.color = '#fff'; }}
      onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9aa7bd'; }}
      >
        <Copy size={14} /> Copy Brief
      </button>
    </div>
  );
};

export const PriorityCard = ({ data }: { data: any }) => {
  if (!data) return null;
  
  // Determine card type based on sourceModule, category, or content structure
  const category = (data.sourceModule || data.category || data.type || '').toLowerCase();
  
  // Enhanced technical issue detection
  const isTechnical = category.includes('technical') || 
                      category.includes('seo') || 
                      category.includes('performance') || 
                      category.includes('page speed') ||
                      category.includes('audit') ||
                      // Also detect by data structure - technical issues have these fields
                      (data.severity !== undefined) ||
                      (data.affectedMetric !== undefined) ||
                      (data.technicalImpact !== undefined) ||
                      (data.implementationDifficulty !== undefined) ||
                      (data.estimatedTime !== undefined && !data.contentType) ||
                      // Check if it's from technical audit
                      (data.source === 'Technical Audit') ||
                      (data.sourceModule === 'technicalAudit');
  
  const isContent = category.includes('content') || 
                     category.includes('keyword') || 
                     category.includes('landing') ||
                     // Content cards have these fields
                     (data.contentType !== undefined) ||
                     (data.targetKeyword !== undefined && !isTechnical) ||
                     (data.suggestedH1 !== undefined);
  
  const isGEO = category.includes('geo') || 
                category.includes('ai') || 
                category.includes('visibility') ||
                // GEO cards have these fields
                (data.aiPlatforms !== undefined) ||
                (data.platforms !== undefined && Array.isArray(data.platforms));
  
  // Render technical action card
  if (isTechnical) {
    const title = data.title || data.action || data.issue || 'Technical Issue';
    const priority = data.priority || data.severity || 'High';
    const description = data.description || data.reason || data.whyItMatters || 'Fix this technical issue to improve SEO performance.';
    const impact = data.impact || data.expectedImpact || data.technicalImpact || 'Improved SEO score';
    const difficulty = data.difficulty || data.implementationDifficulty || 'Medium';
    const time = data.estimatedTime || data.time || '1-2 hours';
    const source = data.source || 'Technical Audit';
    const affectedMetric = data.affectedMetric || data.metric || 'N/A';

    return (
      <div style={{
        background: '#151d2b',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #1d2738',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        borderLeft: '4px solid #ff4757'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
            <Code size={16} color="#ff4757" /> <SafeValue value={title} />
          </h3>
          <PriorityBadge priority={priority} />
        </div>
        <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#9aa7bd', lineHeight: '1.5' }}><SafeValue value={description} /></p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#0b1220', padding: '12px', borderRadius: '6px' }}>
          <div>
            <span style={{ display: 'block', fontSize: '11px', color: '#9aa7bd', textTransform: 'uppercase', marginBottom: '4px' }}>Affected Metric</span>
            <span style={{ fontSize: '13px', color: '#53a7ff' }}><SafeValue value={affectedMetric} /></span>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '11px', color: '#9aa7bd', textTransform: 'uppercase', marginBottom: '4px' }}>Impact</span>
            <span style={{ fontSize: '13px', color: '#10e18b' }}><SafeValue value={impact} /></span>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '11px', color: '#9aa7bd', textTransform: 'uppercase', marginBottom: '4px' }}>Difficulty</span>
            <span style={{ fontSize: '13px', color: '#e2e8f0' }}><SafeValue value={difficulty} /></span>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '11px', color: '#9aa7bd', textTransform: 'uppercase', marginBottom: '4px' }}>Time</span>
            <span style={{ fontSize: '13px', color: '#e2e8f0' }}><SafeValue value={time} /></span>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <span style={{ display: 'block', fontSize: '11px', color: '#9aa7bd', textTransform: 'uppercase', marginBottom: '4px' }}>Source</span>
            <span style={{ fontSize: '13px', color: '#53a7ff' }}><SafeValue value={source} /></span>
          </div>
        </div>
      </div>
    );
  }
  
  // Render GEO/AI visibility action card
  if (isGEO) {
    const title = data.title || data.action || data.opportunity || 'AI Visibility Opportunity';
    const priority = data.priority || 'High';
    const description = data.description || data.reason || 'Improve AI search engine visibility.';
    const platforms = data.platforms || data.aiPlatforms || ['ChatGPT', 'Gemini', 'Claude'];
    const impact = data.impact || data.expectedImpact || '+25% AI Traffic';

    return (
      <div style={{
        background: '#151d2b',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #1d2738',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        borderLeft: '4px solid #a855f7'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
            <Activity size={16} color="#a855f7" /> <SafeValue value={title} />
          </h3>
          <PriorityBadge priority={priority} />
        </div>
        <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#9aa7bd', lineHeight: '1.5' }}><SafeValue value={description} /></p>
        <div style={{ marginBottom: '12px' }}>
          <span style={{ display: 'block', fontSize: '11px', color: '#9aa7bd', textTransform: 'uppercase', marginBottom: '6px' }}>Target Platforms</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {Array.isArray(platforms) ? platforms.map((p, i) => (
              <span key={i} style={{ background: '#1d2738', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', color: '#e2e8f0' }}><SafeValue value={p} /></span>
            )) : <span style={{ fontSize: '13px', color: '#e2e8f0' }}><SafeValue value={platforms} /></span>}
          </div>
        </div>
        <div style={{ background: '#0b1220', padding: '12px', borderRadius: '6px' }}>
          <span style={{ display: 'block', fontSize: '11px', color: '#9aa7bd', textTransform: 'uppercase', marginBottom: '4px' }}>Expected Impact</span>
          <span style={{ fontSize: '13px', color: '#10e18b' }}><SafeValue value={impact} /></span>
        </div>
      </div>
    );
  }
  
  // Default: Render content/landing page card (original behavior)
  const title = data.pageTitle || data.title || data.action || data.opportunity || 'Recommendation';
  const priority = data.priority || data.impact || 'High';
  const contentType = data.contentType || 'Landing Page';
  const targetKeyword = data.targetKeyword || data.keyword || 'Target Keyword Missing';
  const searchIntent = data.searchIntent || data.intent || 'Informational';
  const suggestedH1 = data.suggestedH1 || data.h1 || title;
  const whyItMatters = data.whyItMatters || data.reason || data.description || 'Improve search visibility and traffic potential.';
  const sections = data.contentSections || data.sections || ['Introduction', 'Core Benefits', 'Next Steps'];
  const cta = data.CTASuggestion || data.cta || 'Explore Features';
  const rawScore = data.opportunityScore || data.confidenceScore || data.score || Math.floor(Math.random() * 30) + 70;
  const score = typeof rawScore === 'object' && rawScore !== null ? (rawScore.value || rawScore.score || 70) : rawScore;

  // Extract expected impacts
  const estimatedTraffic = data.estimatedTraffic || '+18% Organic Traffic';
  const visibility = data.aiVisibility || 'Better AI Visibility';
  const difficulty = data.implementationDifficulty || data.difficulty || 'Medium';
  const time = data.estimatedTime || data.time || '2 Days';

  return (
    <div style={{
      background: '#151d2b',
      borderRadius: '12px',
      padding: '24px',
      border: '1px solid #1d2738',
      boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
      transition: 'transform 0.2s, box-shadow 0.2s',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }}
    onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 15px 35px rgba(0,0,0,0.3)'; }}
    onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)'; }}
    >
      {/* Header */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
            <FileText size={18} color="#a855f7" /> <SafeValue value={title} />
          </h3>
          <PriorityBadge priority={priority} />
        </div>
        <span style={{ fontSize: '13px', color: '#9aa7bd' }}>Content Type: <b style={{ color: '#e2e8f0' }}><SafeValue value={contentType} /></b></span>
      </div>

      {/* Grid Specs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', background: '#0b1220', padding: '16px', borderRadius: '8px' }}>
        <div>
          <span style={{ display: 'block', fontSize: '11px', color: '#9aa7bd', textTransform: 'uppercase', marginBottom: '4px' }}>Target Keyword</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#53a7ff', fontWeight: '500' }}>
            <Target size={14} /> <SafeValue value={targetKeyword} />
          </div>
        </div>
        <div>
          <span style={{ display: 'block', fontSize: '11px', color: '#9aa7bd', textTransform: 'uppercase', marginBottom: '4px' }}>Search Intent</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#fff' }}>
            <Search size={14} /> <span style={{ textTransform: 'capitalize' }}><SafeValue value={searchIntent} /></span>
          </div>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <span style={{ display: 'block', fontSize: '11px', color: '#9aa7bd', textTransform: 'uppercase', marginBottom: '4px' }}>Suggested H1</span>
          <div style={{ fontSize: '15px', color: '#fff', fontWeight: 'bold' }}><SafeValue value={suggestedH1} /></div>
        </div>
      </div>

      {/* Why it matters & Sections */}
      <div>
        <h4 style={{ fontSize: '14px', color: '#fff', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <HelpCircle size={14} color="#ffa502" /> Why This Matters
        </h4>
        <p style={{ margin: 0, fontSize: '13px', color: '#9aa7bd', lineHeight: '1.6' }}><SafeValue value={whyItMatters} /></p>

        <h4 style={{ fontSize: '14px', color: '#fff', margin: '16px 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Settings size={14} color="#10e18b" /> Recommended Sections
        </h4>
        <ContentSectionTags sections={sections} />
      </div>

      {/* Primary CTA & Opportunity Score */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', borderTop: '1px solid #1d2738', paddingTop: '20px' }}>
        <div>
          <span style={{ display: 'block', fontSize: '12px', color: '#9aa7bd', marginBottom: '8px' }}>Primary CTA</span>
          <span style={{ display: 'inline-block', background: '#1d2738', padding: '6px 12px', borderRadius: '4px', fontSize: '13px', color: '#fff', border: '1px solid #293245' }}>
            <SafeValue value={cta} />
          </span>
        </div>
        <div>
          <span style={{ display: 'block', fontSize: '12px', color: '#9aa7bd', marginBottom: '8px' }}>Opportunity Score</span>
          <OpportunityProgress score={score} />
        </div>
      </div>

      {/* Impact & Implementation */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', background: '#0b1220', padding: '16px', borderRadius: '8px' }}>
        <div>
          <h4 style={{ fontSize: '12px', color: '#9aa7bd', margin: '0 0 10px 0', textTransform: 'uppercase' }}>Expected Impact</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '13px', color: '#10e18b', display: 'flex', alignItems: 'center', gap: '6px' }}><Activity size={12} /> <SafeValue value={estimatedTraffic} /></span>
            <span style={{ fontSize: '13px', color: '#10e18b', display: 'flex', alignItems: 'center', gap: '6px' }}><Activity size={12} /> <SafeValue value={visibility} /></span>
          </div>
        </div>
        <div>
          <h4 style={{ fontSize: '12px', color: '#9aa7bd', margin: '0 0 10px 0', textTransform: 'uppercase' }}>Implementation</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: '#e2e8f0' }}>
            <span>Difficulty: <b style={{ color: (difficulty && typeof difficulty === 'string' ? difficulty.toLowerCase() : '') === 'hard' ? '#ff4757' : (difficulty && typeof difficulty === 'string' ? difficulty.toLowerCase() : '') === 'medium' ? '#ffa502' : '#10e18b', textTransform: 'capitalize' }}><SafeValue value={difficulty} /></b></span>
            <span>Time: <b><SafeValue value={time} /></b></span>
          </div>
        </div>
      </div>

      <RecommendationActions />
    </div>
  );
};
