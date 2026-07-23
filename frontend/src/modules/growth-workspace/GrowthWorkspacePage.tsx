import { useState, useEffect } from 'react';
import { PageHeader, Section } from '@/components/ui-kit';
import { getActiveProject, setActiveProjectId } from '@/lib/project-store';
import { api } from '@/lib/api';
import { UnifiedAnalysisForm } from './UnifiedAnalysisForm';
import { AnalysisLoadingPage } from './AnalysisLoadingPage';
import { WorkflowStepper } from './WorkflowStepper';
import { WorkflowResultViewer } from './WorkflowResultViewer';
import { AnalysisSummary } from './AnalysisSummary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export function GrowthWorkspacePage() {
  const [project, setProject] = useState(getActiveProject());
  const [loading, setLoading] = useState(false);
  const [loadingResults, setLoadingResults] = useState(true);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [savedInput, setSavedInput] = useState<any>(null);
  const [analysisStage, setAnalysisStage] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    const load = () => {
      const p = getActiveProject();
      setProject(p);
      if (p?.id) {
        fetchSavedResults(p.id);
      } else {
        setLoadingResults(false);
      }
    };
    load();
    window.addEventListener('marketform-chat-change', load);
    return () => window.removeEventListener('marketform-chat-change', load);
  }, []);

  async function fetchSavedResults(chatId: string) {
    setLoadingResults(true);
    try {
      console.log('[GW] Fetching saved growth workspace results for chatId:', chatId);
      const res = await api.get(`/api/chats/${chatId}/growth-workspace/results`);
      
      if (res && (res.success || res.exists)) {
        setAnalysisData(res.results || null);
        setSteps(res.steps || []);
        setSummary(res.summary || null);
        setSavedInput(res.input || null);
      } else {
        setAnalysisData(null);
        setSteps([]);
        setSummary(null);
        setSavedInput(null);
      }
    } catch (err) {
      console.warn('[GW] No saved results found:', err instanceof Error ? err.message : err);
      setAnalysisData(null);
      setSteps([]);
      setSummary(null);
    } finally {
      setLoadingResults(false);
    }
  }

  async function handleRunAnalysis(formData: any) {
    let activeProject = project;

    setAnalysisStage('running');
    setAnalysisError(null);

    // Auto-create a real chat if project is null or has a temp ID
    if (!activeProject?.id || activeProject.id.startsWith('temp-')) {
      try {
        const chatTitle = formData.websiteUrl ? formData.websiteUrl.replace(/^https?:\/\//, '').split('/')[0] : (formData.productName || 'New Analysis');
        const res = await api.post('/api/chats', { title: chatTitle });
        const chat = res.data || res.chat || res;
        if (!chat?.id) throw new Error('No chat ID returned');
        setActiveProjectId(chat.id);
        activeProject = { id: chat.id, productName: chat.productName || chatTitle, websiteUrl: formData.websiteUrl || '', description: '', industry: '', targetAudience: '', pricing: '', competitors: '', createdAt: '', updatedAt: '' };
        setProject(activeProject);
        window.dispatchEvent(new Event('marketform-chat-change'));
      } catch (err: any) {
        toast.error('Failed to create project: ' + (err.message || 'Unknown error'));
        setAnalysisStage('error');
        setAnalysisError(err.message || 'Failed to create project');
        return;
      }
    }

    if (!activeProject?.id) {
      toast.error('Please select or create a project first.');
      setAnalysisStage('error');
      setAnalysisError('Please select or create a project first.');
      return;
    }

    setLoading(true);
    
    // Initialize steps as running
    const initialSteps = [
      { key: 'product', label: 'Product Analysis', status: 'pending' },
      { key: 'market', label: 'Market Discovery', status: 'pending' },
      { key: 'audience', label: 'Audience Intelligence', status: 'pending' },
      { key: 'competitor', label: 'Competitor Analysis', status: 'pending' },
      { key: 'intent', label: 'Intent Prediction', status: 'pending' },
      { key: 'positioning', label: 'Positioning Engine', status: 'pending' },
      { key: 'campaign', label: 'Campaign Generator', status: 'pending' },
      { key: 'channel', label: 'Channel Recommendation', status: 'pending' }
    ];
    
    setSteps(initialSteps);
    setAnalysisData(null);
    setSummary(null);

    try {
      console.log('🚀 Starting full growth analysis...');
      
      const res = await api.post(`/api/chats/${project.id}/growth-workspace/run-full-analysis`, formData);

      console.log('[GW] Analysis response:', { status: res.success, stepsCount: res.steps?.length });

      if (res.success) {
        console.log('✅ Analysis complete!');
        setAnalysisData(res.results);
        setSteps(res.steps || initialSteps);
        setSummary(res.summary || null);
        setSavedInput(formData);
        setAnalysisStage('completed');
        toast.success('Full growth analysis completed successfully!');
      } else {
        console.error('⚠️ Analysis failed:', res.error);
        setSteps(res.steps || initialSteps);
        setAnalysisStage('error');
        setAnalysisError(res.error || 'Unknown error');
        
        if (res.errorCode === 'CHAT_NOT_FOUND') {
          toast.error('Project not found. Please create or select a valid project first.');
        } else {
          toast.error(`Analysis failed: ${res.error || 'Unknown error'}`);
        }
      }
    } catch (err: any) {
      console.error('[GW] Analysis error:', err?.message || err);
      setAnalysisStage('error');
      setAnalysisError(err.response?.data?.error || err.message || 'Connection error');
      
      // Handle different error types
      if (err.response?.status === 404 || err.response?.data?.errorCode === 'CHAT_NOT_FOUND') {
        toast.error('Project not found. Please create or select a valid project first.');
      } else if (err.response?.data?.error) {
        // Show backend error message (but not raw Prisma errors)
        const errorMsg = err.response.data.error;
        if (errorMsg.includes('Prisma') || errorMsg.includes('P2003')) {
          toast.error('Database error: Invalid project reference. Please create a new project and try again.');
        } else {
          toast.error(`Error: ${errorMsg}`);
        }
      } else {
        toast.error('Failed to run analysis. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleAnalysisComplete() {
    if (project?.id) {
      fetchSavedResults(project.id);
    }
    setAnalysisStage('completed');
  }

  function handleRetry() {
    if (savedInput) {
      handleRunAnalysis(savedInput);
    }
  }

  return (
    <>
      <Toaster theme="dark" position="bottom-right" />
      <PageHeader
        eyebrow="All-in-One Analysis Command Center"
        title="Growth Workspace"
        description="Enter your product details once and run a complete 8-module growth analysis: Product Analysis, Market Discovery, Audience Intelligence, Competitor Analysis, Intent Prediction, Positioning Engine, Campaign Generator, and Channel Recommendation."
      />

      {analysisStage === 'running' && project?.id ? (
        <AnalysisLoadingPage
          chatId={project.id}
          onComplete={handleAnalysisComplete}
          onError={(error) => {
            setAnalysisStage('error');
            setAnalysisError(error);
          }}
          onRetry={handleRetry}
        />
      ) : loadingResults ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            <span className="ml-3 text-muted-foreground">Loading workspace...</span>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Section (if analysis exists) */}
          {summary && analysisData && (
            <AnalysisSummary summary={summary} />
          )}

          {/* Unified Input Form */}
          <Section
            title="Product & Campaign Configuration"
            description="Fill out this unified form once. All 8 modules will use this data."
          >
            <UnifiedAnalysisForm
              onSubmit={handleRunAnalysis}
              loading={loading}
              savedInput={savedInput}
            />
          </Section>

          {/* Workflow Stepper */}
          {steps.length > 0 && (
            <Section
              title="Analysis Progress"
              description="Track the progress of your 8-module growth analysis"
            >
              <WorkflowStepper steps={steps} loading={loading} />
            </Section>
          )}

          {/* Results Viewer */}
          {analysisData && (
            <Section
              title="Analysis Results"
              description="Click on any completed module below to view detailed insights"
            >
              <WorkflowResultViewer results={analysisData} steps={steps} />
            </Section>
          )}

          {/* Empty State */}
          {!loading && !analysisData && steps.length === 0 && (
            <Card className="bg-white/5 border-white/10 mt-6">
              <CardHeader>
                <CardTitle>Ready to Start</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Fill out the form above and click "Run Full Analysis" to generate comprehensive growth insights across all 8 modules.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Product Analysis - Understand your product's USP and features</li>
                  <li>Market Discovery - Analyze market size and trends</li>
                  <li>Audience Intelligence - Identify target segments and personas</li>
                  <li>Competitor Analysis - Map competitive landscape</li>
                  <li>Intent Prediction - Identify high-intent prospects</li>
                  <li>Positioning Engine - Craft unique positioning</li>
                  <li>Campaign Generator - Create campaign ideas</li>
                  <li>Channel Recommendation - Find best marketing channels</li>
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </>
  );
}
