import { useState, useEffect, useCallback } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Clock, XCircle } from 'lucide-react';

interface LoadingPageProps {
  chatId: string;
  onComplete: (data: any) => void;
  onError: (error: string) => void;
}

const STAGES = [
  'Loading Evidence',
  'Reading Website',
  'Understanding Product',
  'Analysing Audience',
  'Finding Competitors',
  'Planning Campaign',
  'Building Funnel',
  'Selecting Channels',
  'Preparing Timeline',
  'Creating KPIs',
  'Generating Executive Summary',
  'Saving Campaign',
];

const STAGE_DESCRIPTIONS = [
  'Loading evidence snapshot and intelligence data',
  'Analysing website content and structure',
  'Understanding product features and positioning',
  'Building audience segments from evidence',
  'Cross-referencing competitor data',
  'Creating campaign strategy aligned with goals',
  'Building marketing funnel stages',
  'Selecting optimal channels based on audience fit',
  'Preparing campaign timeline and milestones',
  'Defining measurable KPIs and tracking framework',
  'Synthesizing all findings into executive summary',
  'Persisting campaign plan to database',
];

export function CampaignPlanLoadingPage({ chatId, onComplete, onError }: LoadingPageProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(p => p + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaign/${chatId}/status`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` },
      });
      const data = await res.json();

      if (data.status === 'draft' || data.status === 'completed') {
        const planRes = await fetch(`/api/campaign/${chatId}/plan`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` },
        });
        const planData = await planRes.json();
        if (planData.success && planData.exists) {
          onComplete(planData.campaignPlan);
        }
        return;
      }

      if (data.status === 'error') {
        setError('Campaign generation failed');
        onError('Campaign generation failed');
        return;
      }
    } catch {
      // still generating
    }
    setTimeout(pollStatus, 3000);
  }, [chatId, onComplete, onError]);

  useEffect(() => {
    const initialDelay = setTimeout(pollStatus, 3000);

    const stepTimer = setInterval(() => {
      setCurrentStep(p => Math.min(p + 1, STAGES.length));
    }, 5000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(stepTimer);
    };
  }, [pollStatus]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const currentIndex = Math.min(currentStep - 1, STAGES.length - 1);

  if (error) {
    return (
      <div style={{
        background: '#101622',
        border: '1px solid rgba(255,71,87,0.3)',
        borderRadius: '12px',
        padding: '40px 24px',
        textAlign: 'center',
      }}>
        <XCircle size={40} style={{ color: '#ff4757', marginBottom: '16px' }} />
        <h3 style={{ color: '#ff8a8a', margin: '0 0 8px 0' }}>Campaign Planning Failed</h3>
        <p style={{ color: '#9aa7bd', margin: '0 0 16px 0' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{
      background: '#101622',
      border: '1px solid #293245',
      borderRadius: '12px',
      padding: '32px 24px',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        <div style={{ position: 'relative' }}>
          <Loader2 size={36} style={{ color: '#a855f7', animation: 'spin 1s linear infinite' }} />
        </div>

        <div style={{ textAlign: 'center' }}>
          <h3 style={{ color: '#a855f7', margin: '0 0 4px 0', fontSize: '18px' }}>Building Campaign Intelligence</h3>
          <p style={{ color: '#9aa7bd', margin: 0, fontSize: '13px' }}>
            Planning your evidence-based campaign
          </p>
        </div>

        <div style={{ width: '100%', maxWidth: '480px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9aa7bd', marginBottom: '8px' }}>
            <span>Step {currentStep} of {STAGES.length}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} />
              {formatTime(elapsed)}
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            background: '#1d2738',
            borderRadius: '3px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${(currentStep / STAGES.length) * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #a855f7, #53a7ff)',
              borderRadius: '3px',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>

        <div style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#53a7ff',
        }}>
          {STAGES[currentIndex]}
        </div>

        <div style={{ width: '100%', maxWidth: '480px' }}>
          {STAGES.map((stage, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <div
                key={stage}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: isCompleted ? '#10e18b' : isCurrent ? '#a855f7' : '#4a5568',
                  background: isCurrent ? 'rgba(168,85,247,0.08)' : 'transparent',
                  marginBottom: '2px',
                }}
              >
                {isCompleted ? (
                  <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
                ) : isCurrent ? (
                  <Loader2 size={14} style={{ flexShrink: 0, animation: 'spin 1s linear infinite' }} />
                ) : (
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid #4a5568', flexShrink: 0 }} />
                )}
                <span>{stage}</span>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
