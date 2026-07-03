import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getActiveProject } from '@/lib/project-store';
import { AlertCircle, CheckCircle, Sparkles, Download, Calendar, Search, Megaphone, Settings, Clock, ArrowRight, Loader2 } from 'lucide-react';

interface SolutionStatus {
  canGenerate: boolean;
  moduleCount: number;
  availableModules: Record<string, boolean>;
  hasSolution: boolean;
  lastGenerated: string | null;
  recommendation: string;
}

interface MarketingSolution {
  contentStrategy: any;
  seoImplementation: any;
  campaignAssets: any;
  automationSetup: any;
  nextActions: any;
  metadata: {
    generatedAt: string;
    productName: string;
    modulesUsed: string[];
    providers: Record<string, string>;
  };
}

export function SolutionGeneratorPage() {
  const [status, setStatus] = useState<SolutionStatus | null>(null);
  const [solution, setSolution] = useState<MarketingSolution | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const project = typeof window !== 'undefined' ? getActiveProject() : null;
  const chatId = project?.id || '';

  // Debug logging
  useEffect(() => {
    console.log('≡ƒöì [Solution Generator] Component mounted', {
      projectId: project?.id,
      productName: project?.productName,
      chatId,
      hasChat: !!chatId
    });
  }, []);

  useEffect(() => {
    if (!chatId) {
      console.log('ΓÜá∩╕Å [Solution Generator] No chat selected');
      setError('Please create or select a project first');
      return;
    }
    
    console.log('≡ƒöì [Solution Generator] Loading data for chatId:', chatId);
    loadSolutionStatus();
    loadExistingSolution();
  }, [chatId]);

  const loadSolutionStatus = async () => {
    try {
      console.log('≡ƒôí [Solution Generator] Fetching status...');
      const response = await api.get(`/api/chats/${chatId}/solution-status`);
      console.log('Γ£à [Solution Generator] Status response:', response.data);
      
      if (response.data.success) {
        setStatus(response.data);
      }
    } catch (err: any) {
      console.error('Γ¥î [Solution Generator] Failed to load status:', err.response?.data || err.message);
    }
  };

  const loadExistingSolution = async () => {
    try {
      console.log('≡ƒôí [Solution Generator] Fetching existing solution...');
      const response = await api.get(`/api/chats/${chatId}/solution`);
      console.log('Γ£à [Solution Generator] Solution response:', { 
        success: response.data.success, 
        hasSolution: !!response.data.solution 
      });
      
      if (response.data.success && response.data.solution) {
        setSolution(response.data.solution);
      }
    } catch (err: any) {
      console.log('Γä╣∩╕Å [Solution Generator] No existing solution');
    }
  };

  const generateSolution = async () => {
    if (!chatId) {
      setError('Please create or select a project first');
      return;
    }
    
    setGenerating(true);
    setError(null);
    
    try {
      console.log('≡ƒôí [Solution Generator] Generating solution for chatId:', chatId);
      const response = await api.post(`/api/chats/${chatId}/generate-solution`);
      console.log('Γ£à [Solution Generator] Generate response:', response.data);
      
      if (response.data.success) {
        setSolution(response.data.solution);
        await loadSolutionStatus();
      } else {
        setError(response.data.error || 'Failed to generate solution');
      }
    } catch (err: any) {
      console.error('Γ¥î [Solution Generator] Generate error:', err.response?.data || err.message);
      setError(err.response?.data?.error || 'Failed to generate solution');
    } finally {
      setGenerating(false);
    }
  };

  const renderModuleStatus = () => {
    if (!status) return null;

    const moduleLabels: Record<string, string> = {
      productAnalysis: 'Product Analysis',
      marketDiscovery: 'Market Discovery',
      audienceIntelligence: 'Audience Intelligence',
      competitorAnalysis: 'Competitor Analysis',
      seoIntelligence: 'SEO Intelligence',
      campaignGenerator: 'Campaign Generator'
    };

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Analysis Modules Status</h2>
          <p className="text-muted-foreground">
            {status.moduleCount} of 6 modules completed ΓÇó {status.recommendation}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(status.availableModules).map(([key, available]) => (
            <div 
              key={key} 
              className={`rounded-2xl border p-4 flex items-center gap-3 ${
                available 
                  ? 'bg-green-500/10 border-green-500/20' 
                  : 'bg-white/5 border-white/10'
              }`}
            >
              {available ? (
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
              )}
              <span className={`text-sm ${available ? 'text-white' : 'text-muted-foreground'}`}>
                {moduleLabels[key] || key}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={generateSolution}
          disabled={!status.canGenerate || generating}
          className="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold flex items-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-500/20"
        >
          {generating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating Solution...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate Complete Solution
            </>
          )}
        </button>
      </div>
    );
  };

  const renderSolution = () => {
    if (!solution) return null;

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">
                Marketing Solution for {solution.metadata?.productName}
              </h3>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Generated {new Date(solution.metadata?.generatedAt).toLocaleString()}
              </div>
            </div>
            <span className="text-xs bg-green-500/20 text-green-400 px-4 py-2 rounded-full font-medium">
              Complete
            </span>
          </div>
          
          {solution.metadata?.modulesUsed && (
            <div className="flex flex-wrap gap-2">
              {solution.metadata.modulesUsed.map((module, idx) => (
                <span key={idx} className="text-xs bg-white/10 px-3 py-1 rounded-full">
                  {module}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Content Strategy */}
        {solution.contentStrategy && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-6 h-6 text-blue-400" />
              <h3 className="text-lg font-semibold">Content Strategy</h3>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              {solution.contentStrategy.contentCalendar && (
                <div>
                  <span className="text-white font-medium">Calendar: </span>
                  {typeof solution.contentStrategy.contentCalendar === 'object' 
                    ? JSON.stringify(solution.contentStrategy.contentCalendar, null, 2)
                    : solution.contentStrategy.contentCalendar}
                </div>
              )}
              {solution.contentStrategy.channels && (
                <div>
                  <span className="text-white font-medium">Channels: </span>
                  {Array.isArray(solution.contentStrategy.channels)
                    ? solution.contentStrategy.channels.join(', ')
                    : solution.contentStrategy.channels}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SEO Implementation */}
        {solution.seoImplementation && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Search className="w-6 h-6 text-green-400" />
              <h3 className="text-lg font-semibold">SEO Implementation</h3>
            </div>
            <div className="space-y-3 text-sm">
              {solution.seoImplementation.priorityFixes && (
                <div>
                  <div className="text-white font-medium mb-2">Priority Fixes:</div>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {Array.isArray(solution.seoImplementation.priorityFixes)
                      ? solution.seoImplementation.priorityFixes.map((fix, idx) => (
                          <li key={idx}>{fix}</li>
                        ))
                      : <li>{solution.seoImplementation.priorityFixes}</li>}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Campaign Assets */}
        {solution.campaignAssets && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Megaphone className="w-6 h-6 text-purple-400" />
              <h3 className="text-lg font-semibold">Campaign Assets</h3>
            </div>
            <div className="space-y-4 text-sm">
              {solution.campaignAssets.adCopy && (
                <div>
                  <div className="text-white font-medium mb-2">Ad Copy:</div>
                  {solution.campaignAssets.adCopy.headlines && (
                    <div className="mb-3">
                      <div className="text-xs text-muted-foreground uppercase mb-1">Headlines</div>
                      <div className="space-y-1">
                        {solution.campaignAssets.adCopy.headlines.map((headline: string, idx: number) => (
                          <div key={idx} className="bg-white/5 rounded-lg p-2 text-muted-foreground">
                            {headline}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Automation Setup */}
        {solution.automationSetup && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Settings className="w-6 h-6 text-orange-400" />
              <h3 className="text-lg font-semibold">Automation Setup</h3>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              {typeof solution.automationSetup === 'object' && (
                <pre className="bg-black/20 rounded-lg p-4 overflow-x-auto text-xs">
                  {JSON.stringify(solution.automationSetup, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* Next Actions */}
        {solution.nextActions && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <ArrowRight className="w-6 h-6 text-cyan-400" />
              <h3 className="text-lg font-semibold">Next Actions</h3>
            </div>
            <div className="grid gap-4">
              {solution.nextActions.thisWeek && (
                <div>
                  <div className="text-white font-medium mb-2">This Week:</div>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {Array.isArray(solution.nextActions.thisWeek)
                      ? solution.nextActions.thisWeek.map((action, idx) => (
                          <li key={idx}>{action}</li>
                        ))
                      : <li>{solution.nextActions.thisWeek}</li>}
                  </ul>
                </div>
              )}
              {solution.nextActions.thisMonth && (
                <div>
                  <div className="text-white font-medium mb-2">This Month:</div>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {Array.isArray(solution.nextActions.thisMonth)
                      ? solution.nextActions.thisMonth.map((action, idx) => (
                          <li key={idx}>{action}</li>
                        ))
                      : <li>{solution.nextActions.thisMonth}</li>}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Marketing Solution Generator</h1>
        <p className="text-muted-foreground">
          Generate a complete marketing strategy with ready-to-use assets based on your intelligence modules
        </p>
      </div>

      {!chatId && (
        <div className="rounded-2xl bg-yellow-500/10 border border-yellow-500/20 p-4 text-sm text-yellow-200 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          Please create or select a project first to generate a marketing solution.
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-200 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {chatId && renderModuleStatus()}
      {chatId && renderSolution()}
    </div>
  );
}

export default SolutionGeneratorPage;
