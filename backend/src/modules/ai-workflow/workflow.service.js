import { prisma } from '../../config/prisma.js';
import { callAI } from '../../ai/services/aiRouter.service.js';
import { generateAutomationPlanStep, getAutomationPlanStatus } from './automation.adapter.js';

export async function generateCompleteSolution({ chatId, userId }) {
  try {
    // 1. Verify chat belongs to user
    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) {
      return { success: false, error: "Chat not found or unauthorized" };
    }

    // 2. Collect all saved intelligence data
    const [productAnalysis, productIntelligence, competitorIntelligence, seoIntelligence, campaignIntelligence] = await Promise.all([
      prisma.productAnalysis.findUnique({ where: { chatId } }),
      prisma.productIntelligence.findUnique({ where: { chatId } }),
      prisma.competitorIntelligence.findUnique({ where: { chatId } }),
      prisma.seoIntelligence.findUnique({ where: { chatId } }),
      prisma.campaignIntelligence.findUnique({ where: { chatId } })
    ]);

    // 3. Check if we have enough data
    const availableModules = [];
    const contextData = {};

    if (productAnalysis?.outputJson) {
      availableModules.push('Product Analysis');
      contextData.productAnalysis = productAnalysis.outputJson;
    }

    if (productIntelligence?.marketDiscovery) {
      availableModules.push('Market Discovery');
      contextData.marketDiscovery = productIntelligence.marketDiscovery;
    }

    if (productIntelligence?.audienceIntelligence) {
      availableModules.push('Audience Intelligence');
      contextData.audienceIntelligence = productIntelligence.audienceIntelligence;
    }

    if (competitorIntelligence?.competitorAnalysis) {
      availableModules.push('Competitor Analysis');
      contextData.competitorAnalysis = competitorIntelligence.competitorAnalysis;
    }

    if (seoIntelligence?.seoAudit) {
      availableModules.push('SEO Intelligence');
      contextData.seoIntelligence = seoIntelligence.seoAudit;
    }

    if (campaignIntelligence?.campaignGenerator) {
      availableModules.push('Campaign Generator');
      contextData.campaignGenerator = campaignIntelligence.campaignGenerator;
    }

    if (availableModules.length < 2) {
      return { 
        success: false, 
        error: `Need at least 2 modules to generate solution. Currently have: ${availableModules.length}` 
      };
    }

    // 4. Generate complete marketing solution using shared AI router
    const prompt = buildSolutionPrompt(contextData, availableModules, chat.productName);

    const aiResult = await callAI(prompt);

    if (!aiResult.success) {
      return { success: false, error: "AI generation failed" };
    }

    // 5. Structure the solution (callAI returns already-parsed JSON)
    const parsedSolution = aiResult.data || {};

    const solution = {
      contentStrategy: parsedSolution.contentStrategy || generateFallbackContentStrategy(contextData),
      seoImplementation: parsedSolution.seoImplementation || generateFallbackSEO(contextData),
      campaignAssets: parsedSolution.campaignAssets || generateFallbackCampaign(contextData),
      automationSetup: parsedSolution.automationSetup || generateFallbackAutomation(),
      nextActions: parsedSolution.nextActions || generateFallbackNextActions(availableModules),
      metadata: {
        generatedAt: new Date().toISOString(),
        productName: chat.productName || 'Unknown Product',
        modulesUsed: availableModules,
        providers: {
          ai: aiResult.provider || 'ai',
          fallbackUsed: false
        }
      }
    };

    // 6. Save solution in AgentRun
    await prisma.agentRun.create({
      data: {
        chatId,
        userId,
        agentType: 'solution-generator',
        status: 'completed',
        input: { availableModules, productName: chat.productName },
        output: solution
      }
    });

    // 7. Add message to chat
    await prisma.message.create({
      data: {
        chatId,
        role: 'assistant',
        content: `Complete marketing solution generated using ${availableModules.length} intelligence modules.`,
        analysisData: { summary: solution.metadata }
      }
    });

    return { success: true, data: solution };

  } catch (error) {
    console.error('Generate complete solution error:', error);
    return { success: false, error: error.message };
  }
}

function buildSolutionPrompt(contextData, availableModules, productName) {
  return `You are an expert marketing strategist. Generate a complete, actionable marketing solution based on the provided intelligence data.

Product: ${productName}

Available Intelligence Modules: ${availableModules.join(', ')}

Context Data:
${JSON.stringify(contextData, null, 2)}

Generate a comprehensive marketing solution with these sections:

1. **Content Strategy**: 
   - Content calendar (12 weeks)
   - Content themes and topics
   - Distribution channels
   - Engagement tactics

2. **SEO Implementation**:
   - Priority technical fixes
   - Keyword integration plan
   - Content optimization roadmap
   - Link building strategy

3. **Campaign Assets**:
   - Ad copy variations (3-5 headlines, descriptions)
   - Landing page recommendations
   - Email sequences
   - Social media content

4. **Automation Setup**:
   - Tracking implementation
   - Monitoring dashboards
   - Alert configurations
   - Reporting schedule

5. **Next Actions**:
   - Immediate steps (this week)
   - Short-term goals (this month)
   - Long-term roadmap (this quarter)

Return as JSON with these exact keys: contentStrategy, seoImplementation, campaignAssets, automationSetup, nextActions.
Each section should be an object with detailed, actionable information.`;
}

function generateFallbackContentStrategy(contextData) {
  return {
    contentCalendar: {
      weeks: 12,
      themes: ['Product Education', 'Customer Success', 'Industry Insights', 'Product Updates'],
      frequency: 'Weekly blog posts, daily social updates'
    },
    channels: ['Blog', 'LinkedIn', 'Twitter', 'Email Newsletter'],
    tactics: ['SEO-optimized articles', 'Thought leadership', 'Customer stories']
  };
}

function generateFallbackSEO(contextData) {
  const seoData = contextData.seoIntelligence || {};
  return {
    priorityFixes: seoData.technicalIssues || ['Improve page speed', 'Fix mobile responsiveness', 'Add schema markup'],
    keywordPlan: seoData.keywordOpportunities || ['Target long-tail keywords', 'Optimize title tags', 'Create keyword-rich content'],
    timeline: '3-month implementation roadmap'
  };
}

function generateFallbackCampaign(contextData) {
  return {
    adCopy: {
      headlines: [
        'Transform Your Business Today',
        'The Smart Solution You\'ve Been Looking For',
        'Get Results That Matter'
      ],
      descriptions: [
        'Join thousands of satisfied customers',
        'Easy setup. Powerful results.',
        'Start your free trial today'
      ]
    },
    landingPage: {
      hero: 'Clear value proposition',
      features: 'Benefit-focused feature list',
      cta: 'Strong call-to-action',
      social_proof: 'Customer testimonials and logos'
    },
    emailSequence: ['Welcome email', 'Educational content', 'Case study', 'Product demo', 'Special offer']
  };
}

function generateFallbackAutomation() {
  return {
    tracking: ['Google Analytics 4 setup', 'Conversion tracking', 'Event tracking'],
    monitoring: ['Weekly performance dashboards', 'Automated alerts for anomalies'],
    reporting: ['Monthly performance reports', 'Quarterly strategy reviews']
  };
}

function generateFallbackNextActions(availableModules) {
  return {
    thisWeek: [
      'Review complete solution',
      'Set up tracking infrastructure',
      'Begin content calendar planning'
    ],
    thisMonth: [
      'Launch first campaign',
      'Implement priority SEO fixes',
      'Create initial content batch'
    ],
    thisQuarter: [
      'Scale successful campaigns',
      'Expand content distribution',
      'Optimize based on performance data'
    ]
  };
}

const STEP_ORDER = ["check_readiness", "automation_plan", "asset_review", "solution_generate", "approval_pending"];

async function createAgentRun({ chatId, userId, stepType, status, input, output }) {
  return prisma.agentRun.create({
    data: {
      chatId,
      userId,
      agentType: `workflow_${stepType}`,
      status,
      input: input || {},
      output: output || {},
    },
  });
}

async function updateAgentRun(id, data) {
  return prisma.agentRun.update({ where: { id }, data });
}

export async function executeWorkflowStep({ chatId, userId, stepType, context = {} }) {
  const validSteps = STEP_ORDER;
  if (!validSteps.includes(stepType)) {
    return { success: false, error: `Unknown step type: ${stepType}. Valid: ${validSteps.join(", ")}` };
  }

  const run = await createAgentRun({
    chatId,
    userId,
    stepType,
    status: "running",
    input: { stepType, contextKeys: Object.keys(context) },
  });

  try {
    let result;

    switch (stepType) {
      case "check_readiness": {
        const [pa, pi, ci, si, cai] = await Promise.all([
          prisma.productAnalysis.findUnique({ where: { chatId } }),
          prisma.productIntelligence.findUnique({ where: { chatId } }),
          prisma.competitorIntelligence.findUnique({ where: { chatId } }),
          prisma.seoIntelligence.findUnique({ where: { chatId } }),
          prisma.campaignIntelligence.findUnique({ where: { chatId } }),
        ]);

        const modules = {
          productAnalysis: !!pa?.outputJson,
          marketDiscovery: !!pi?.marketDiscovery,
          audienceIntelligence: !!pi?.audienceIntelligence,
          competitorAnalysis: !!ci?.competitorAnalysis,
          seoIntelligence: !!si?.seoAudit,
          campaignGenerator: !!cai?.campaignGenerator,
        };

        const count = Object.values(modules).filter(Boolean).length;
        result = { success: true, data: { modules, count, canGenerate: count >= 2 } };
        break;
      }

      case "automation_plan": {
        const adapterResult = await generateAutomationPlanStep({ chatId, userId });
        if (!adapterResult.success) {
          result = { success: false, error: adapterResult.error };
          break;
        }
        result = {
          success: true,
          data: {
            planId: adapterResult.plan.id,
            assetCount: adapterResult.plan.assets?.length || 0,
            readinessModules: adapterResult.readinessModules,
          },
        };
        break;
      }

      case "asset_review": {
        const planStatus = await getAutomationPlanStatus({ chatId, userId });
        if (!planStatus.success || !planStatus.exists) {
          result = { success: false, error: planStatus.exists === false ? "No automation plan found. Run automation_plan step first." : planStatus.error };
          break;
        }
        result = { success: true, data: planStatus.summary };
        break;
      }

      case "solution_generate": {
        const solutionResult = await generateCompleteSolution({ chatId, userId });
        if (!solutionResult.success) {
          result = { success: false, error: solutionResult.error };
          break;
        }
        result = { success: true, data: { hasSolution: true, summary: solutionResult.data.metadata } };
        break;
      }

      case "approval_pending": {
        result = {
          success: true,
          data: {
            status: "pending",
            message: "Workflow steps complete. Waiting for user approval on automation assets.",
          },
        };
        break;
      }

      default:
        result = { success: false, error: `Unhandled step: ${stepType}` };
    }

    if (!result.success) {
      await updateAgentRun(run.id, { status: "failed", output: { error: result.error } });
      return { success: false, step: stepType, error: result.error };
    }

    await updateAgentRun(run.id, { status: "completed", output: result.data });
    return { success: true, step: stepType, data: result.data };
  } catch (error) {
    await updateAgentRun(run.id, { status: "failed", output: { error: error.message } });
    return { success: false, step: stepType, error: error.message };
  }
}

export async function startWorkflow({ chatId, userId }) {
  const results = [];

  for (const stepType of STEP_ORDER) {
    const stepResult = await executeWorkflowStep({ chatId, userId, stepType });
    results.push(stepResult);
    if (!stepResult.success) {
      break;
    }
  }

  const completed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return {
    success: failed === 0,
    workflowComplete: failed === 0 && completed === STEP_ORDER.length,
    steps: results,
    summary: { total: results.length, completed, failed, lastStep: results[results.length - 1]?.step || null },
  };
}

export async function getWorkflowStatus({ chatId, userId }) {
  const runs = await prisma.agentRun.findMany({
    where: {
      chatId,
      userId,
      agentType: { startsWith: "workflow_" },
    },
    orderBy: { createdAt: "asc" },
  });

  const steps = runs.map((r) => ({
    step: r.agentType.replace("workflow_", ""),
    status: r.status,
    output: r.output,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));

  const completedSteps = steps.filter((s) => s.status === "completed").length;
  const currentStepIndex = steps.length;

  return {
    success: true,
    workflowActive: steps.length > 0,
    steps,
    progress: {
      completed: completedSteps,
      total: STEP_ORDER.length,
      currentStep: currentStepIndex < STEP_ORDER.length ? STEP_ORDER[currentStepIndex] : null,
      isComplete: completedSteps >= STEP_ORDER.length,
    },
  };
}
