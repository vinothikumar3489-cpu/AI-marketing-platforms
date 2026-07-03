import { runFullGrowthAnalysis, getGrowthWorkspaceResults } from './growthWorkspace.service.js';

export const runFullAnalysisHandler = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user?.id;
  const input = req.body;

  console.log('🚀 [Growth Workspace Controller] Run Full Analysis:', { chatId, userId });

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
    const result = await runFullGrowthAnalysis({ chatId, userId, input: mappedInput });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
        results: result.results,
        steps: result.steps
      });
    }

    console.log('✅ [Growth Workspace Controller] Analysis complete');
    
    return res.json({
      success: true,
      chatId: result.chatId, // Return the actual or newly created chatId
      results: result.results,
      steps: result.steps,
      summary: result.summary,
      overallStatus: result.overallStatus,
      warnings: result.warnings || []
    });

  } catch (error) {
    console.error('❌ [Growth Workspace Controller] Error:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to run full analysis'
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
      summary: result.summary
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

  console.log('🔍 [Growth Workspace Controller] Get Status:', { chatId, userId });

  if (!chatId || !userId) {
    return res.status(400).json({ success: false, error: 'Missing chatId or user' });
  }

  try {
    const result = await getGrowthWorkspaceResults({ chatId, userId });

    if (!result.success || !result.exists) {
      return res.json({
        status: 'not_started',
        progress: 0,
        steps: []
      });
    }

    const completedCount = result.steps.filter(s => s.status === 'completed').length;
    const progress = Math.round((completedCount / result.steps.length) * 100);

    return res.json({
      status: progress === 100 ? 'completed' : 'in_progress',
      progress,
      currentStep: result.steps.find(s => s.status === 'running')?.label || null,
      steps: result.steps
    });

  } catch (error) {
    console.error('❌ [Growth Workspace Controller] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get status'
    });
  }
};
