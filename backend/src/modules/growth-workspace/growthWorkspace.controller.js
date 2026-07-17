import { runFullGrowthAnalysis, getGrowthWorkspaceResults } from './growthWorkspace.service.js';

export const runFullAnalysisHandler = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user?.id;
  const input = req.body;

  console.log('[Growth API] run started');
  console.log('[Growth API] chatId:', chatId);
  console.log('[Growth API] websiteUrl:', input?.websiteUrl);

  if (!userId) {
    return res.status(400).json({ success: false, error: 'User not authenticated' });
  }

  if (!input.websiteUrl) {
    return res.status(400).json({ success: false, error: 'Missing required field: websiteUrl' });
  }

  // Map frontend multi-step form arrays to string fields for the AI service
  const mappedInput = {
    ...input,
    targetCountry: Array.isArray(input.targetCountries) && input.targetCountries.length > 0 ? input.targetCountries.join(', ') : 'Global',
    targetAudience: Array.isArray(input.audienceTypes) && input.audienceTypes.length > 0 ? input.audienceTypes.join(', ') : 'General Market',
    campaignGoal: Array.isArray(input.campaignGoals) && input.campaignGoals.length > 0 ? input.campaignGoals.join(', ') + (input.customGoal ? ` - ${input.customGoal}` : '') : (input.customGoal || 'Growth'),
    preferredChannel: Array.isArray(input.preferredChannels) && input.preferredChannels.length > 0 ? input.preferredChannels.join(', ') : 'Digital Channels',
    budgetRange: input.budget ? `${input.currency || 'USD'} ${input.budget}` : 'Standard',
    businessStage: input.businessType || 'Growth',
    tone: 'Professional and outcome-focused',
    duration: '30 days',
    description: (input.description || '') + (input.additionalNotes ? `\nAdditional Notes: ${input.additionalNotes}` : '')
  };

  try {
    console.info('[Growth Stage]', { stage: 'START_PIPELINE', status: 'running', chatId });
    const result = await runFullGrowthAnalysis({ chatId, userId, input: mappedInput });

    if (!result.success) {
      console.info('[Growth Stage]', { stage: 'PIPELINE_FAILED', status: 'failed', error: result.error, chatId });
      return res.status(500).json({
        success: false,
        error: result.error || 'Growth analysis failed',
        results: result.results || null,
        steps: result.steps || []
      });
    }

    const stageLabel = result.overallStatus === 'PARTIAL' ? 'PIPELINE_PARTIAL' : 'PIPELINE_COMPLETE';
    const stageStatus = result.overallStatus === 'PARTIAL' ? 'partial' : 'completed';
    console.info('[Growth Stage]', { stage: stageLabel, status: stageStatus, overallStatus: result.overallStatus, chatId });
    
    return res.json({
      success: true,
      chatId: result.chatId,
      results: result.results,
      steps: result.steps,
      summary: result.summary,
      overallStatus: result.overallStatus || 'completed',
      warnings: result.warnings || []
    });

  } catch (error) {
    console.error('[Growth API] step failed:', error.message);
    console.error('[Growth API] error stack:', error.stack);
    
    return res.status(500).json({
      success: false,
      error: 'Growth analysis failed',
      details: error.message || 'Unknown error'
    });
  }
};

export const getResultsHandler = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user?.id;

  console.log('🔍 [Growth Workspace Controller] Get Results:', { chatId, userId });

  if (!chatId || !userId) {
    return res.status(400).json({ success: false, error: 'Missing chatId or user' });
  }

  try {
    const result = await getGrowthWorkspaceResults({ chatId, userId });

    if (!result.success) {
      return res.json({
        success: false,
        exists: result.exists,
        error: result.error
      });
    }

    console.log('✅ [Growth Workspace Controller] Results found');

    return res.json({
      success: true,
      exists: result.exists,
      results: result.results,
      steps: result.steps,
      input: result.input,
      summary: result.summary,
      overallStatus: result.overallStatus || 'completed'
    });

  } catch (error) {
    console.error('❌ [Growth Workspace Controller] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get results'
    });
  }
};

export const getStatusHandler = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user?.id;

  if (!chatId || !userId) {
    return res.status(400).json({ 
      status: 'error',
      error: 'Missing chatId or user' 
    });
  }

  try {
    const result = await getGrowthWorkspaceResults({ chatId, userId });

    if (!result.success || !result.exists) {
      return res.json({
        status: 'not_started',
        currentStep: 0,
        totalSteps: 12,
        stage: null,
        startedAt: null,
        completedSteps: [],
        error: null
      });
    }

    if (result.overallStatus === 'in_progress') {
      const runningStep = result.steps?.findIndex(s => s.status === 'running');
      const completedSteps = result.steps?.filter(s => s.status === 'completed').map(s => s.label) || [];
      
      const stageNames = [
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
        'Finalising dashboard'
      ];

      const currentStepIndex = runningStep >= 0 ? Math.min(runningStep + 3, 11) : completedSteps.length;
      
      return res.json({
        status: 'running',
        currentStep: currentStepIndex + 1,
        totalSteps: 12,
        stage: stageNames[Math.min(currentStepIndex, 11)] || 'Processing',
        startedAt: null,
        completedSteps,
        error: null
      });
    }

    const completedCount = result.steps?.filter(s => s.status === 'completed').length || 0;
    
    return res.json({
      status: completedCount >= 8 ? 'completed' : 'partial',
      currentStep: 12,
      totalSteps: 12,
      stage: 'Complete',
      startedAt: null,
      completedSteps: result.steps?.filter(s => s.status === 'completed').map(s => s.label) || [],
      error: null
    });

  } catch (error) {
    return res.status(500).json({
      status: 'error',
      currentStep: 0,
      totalSteps: 12,
      stage: null,
      startedAt: null,
      completedSteps: [],
      error: error.message || 'Failed to get status'
    });
  }
};
