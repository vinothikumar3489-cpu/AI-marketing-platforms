import { useState, useEffect, useCallback } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Clock, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';

interface LoadingPageProps {
  chatId: string;
  onComplete: () => void;
  onError: (error: string) => void;
  onRetry?: () => void;
}

const STAGE_NAMES = [
  'Preparing analysis',
  'Loading website evidence',
  'Analysing product',
  'Discovering market signals',
  'Building audience intelligence',
  'Validating competitors',
  'Creating positioning',
  'Planning campaigns',
  'Building channel recommendations',
  'Generating executive brief',
  'Saving results',
  'Finalising dashboard',
];

const STAGE_DESCRIPTIONS = [
  'Setting up analysis pipeline and configuring data sources',
  'Fetching and parsing website content, meta tags, and structure',
  'Extracting product features, benefits, and positioning from evidence',
  'Identifying market trends, signals, and growth indicators',
  'Building audience segments based on content and behavioral signals',
  'Cross-referencing competitors from multiple data sources',
  'Developing evidence-backed positioning and messaging',
  'Creating campaign strategies aligned with audience and goals',
  'Analysing channel fit and audience-platform alignment',
  'Synthesizing all findings into an executive brief',
  'Persisting results to database and generating report data',
  'Preparing dashboard with all completed analysis modules',
];

const MAX_POLL_TIME = 600;
const POLL_INTERVAL = 3000;

export function AnalysisLoadingPage({ chatId, onComplete, onError, onRetry }: LoadingPageProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSteps] = useState(12);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [currentStage, setCurrentStage] = useState(STAGE_NAMES[0]);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [maxWaitExceeded, setMaxWaitExceeded] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 1;
        if (next > MAX_POLL_TIME) {
          setMaxWaitExceeded(true);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (finished || error) return;
    
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    async function pollStatus() {
      if (cancelled) return;
      try {
        const res = await api.get(`/api/chats/${chatId}/growth-workspace/status`);
        
        if (cancelled) return;
        
        if (res.status === 'completed' || res.status === 'partial') {
          setCurrentStep(12);
          setCurrentStage('Complete');
          setCompletedSteps(STAGE_NAMES);
          setFinished(true);
          setTimeout(() => onComplete(), 500);
          return;
        }
        
        if (res.status === 'running' && res.currentStep) {
          setCurrentStep(res.currentStep);
          const stageIndex = Math.min(res.currentStep - 1, STAGE_NAMES.length - 1);
          setCurrentStage(res.stage || STAGE_NAMES[stageIndex]);
          setCompletedSteps(res.completedSteps || []);
        }
        
        if (res.status === 'error') {
          setError(res.error || 'Analysis failed');
          onError(res.error || 'Analysis failed');
          return;
        }
      } catch (err: any) {
        if (!cancelled) {
          setError('Status check failed: ' + (err.message || 'Connection error'));
          onError('Status check failed. Please check your connection.');
          return;
        }
      }
      
      if (!cancelled && !finished) {
        pollTimer = setTimeout(pollStatus, POLL_INTERVAL);
      }
    }

    pollTimer = setTimeout(pollStatus, 2000);
    
    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [chatId, finished, error, onComplete, onError]);

  if (maxWaitExceeded && !error && !finished) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="py-12 px-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <Clock className="w-12 h-12 text-yellow-400" />
            <h3 className="text-lg font-semibold text-yellow-300">Analysis Taking Longer Than Expected</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              The analysis has been running for over {Math.floor(MAX_POLL_TIME / 60)} minutes. 
              This can happen when AI providers are slow to respond. You can wait longer or retry.
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Retry Analysis
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const currentIndex = Math.min(currentStep - 1, STAGE_NAMES.length - 1);

  if (error) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="py-12 px-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <XCircle className="w-12 h-12 text-red-400" />
            <h3 className="text-lg font-semibold text-red-300">Analysis Failed</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {error}
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Retry Analysis
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="py-8 px-6">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="relative">
            <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
          </div>
          
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-purple-300">Full Analysis Running</h3>
            <p className="text-sm text-muted-foreground">
              Running comprehensive growth analysis
            </p>
          </div>

          <div className="w-full max-w-md space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Step {currentStep} of {totalSteps}</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(elapsed)}
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          <div className="text-sm font-medium text-blue-300">
            {currentStage}
          </div>

          <div className="w-full max-w-md space-y-1">
            {STAGE_NAMES.map((stage, index) => {
              const isCompleted = completedSteps.includes(stage) || index < currentIndex;
              const isCurrent = index === currentIndex && !isCompleted;
              
              return (
                <div
                  key={stage}
                  className={`flex items-center gap-2 text-xs py-1 px-2 rounded ${
                    isCompleted
                      ? 'text-green-400'
                      : isCurrent
                      ? 'text-purple-300 bg-purple-500/10'
                      : 'text-muted-foreground/50'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  ) : isCurrent ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-current opacity-30 flex-shrink-0" />
                  )}
                  <span>{stage}</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
