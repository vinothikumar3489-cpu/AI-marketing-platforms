import { generateCompleteSolution, executeWorkflowStep, startWorkflow, getWorkflowStatus } from './workflow.service.js';
import { prisma } from '../../config/prisma.js';

export const generateSolutionHandler = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user?.id;

  console.log('🔍 [WORKFLOW GENERATE] Route hit:', { chatId, userId, path: req.path });

  if (!chatId || !userId) {
    return res.status(400).json({ success: false, error: "Missing chatId or user authentication" });
  }

  try {
    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) {
      console.log('❌ [WORKFLOW GENERATE] Chat not found:', chatId);
      return res.status(404).json({ success: false, error: "Chat not found" });
    }

    console.log('🚀 [WORKFLOW GENERATE] Generating solution for:', { chatId, productName: chat.productName });
    const result = await generateCompleteSolution({ chatId, userId });
    
    if (!result.success) {
      console.log('❌ [WORKFLOW GENERATE] Generation failed:', result.error);
      return res.status(500).json({ success: false, error: result.error });
    }

    console.log('✅ [WORKFLOW GENERATE] Solution generated successfully');
    return res.json({
      success: true,
      solution: result.data,
      deliverables: {
        contentCalendar: "12-week content strategy",
        seoImplementation: "Technical fixes and roadmap",
        campaignAssets: "Ad copy and landing pages",
        automationSetup: "Monitoring and tracking"
      }
    });
  } catch (error) {
    console.error('❌ [WORKFLOW GENERATE] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getSolutionHandler = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user?.id;

  console.log('🔍 [WORKFLOW GET] Route hit:', { chatId, userId, path: req.path });

  if (!chatId || !userId) return res.status(400).json({ success: false, error: "Missing chatId or user" });

  try {
    const solution = await prisma.agentRun.findFirst({
      where: { chatId, userId, agentType: "solution-generator", status: "completed" },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('✅ [WORKFLOW GET] Found solution:', !!solution);
    return res.json({ success: true, solution: solution?.output || null });
  } catch (error) {
    console.error('❌ [WORKFLOW GET] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getSolutionStatusHandler = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user?.id;

  console.log('🔍 [WORKFLOW STATUS] Route hit:', { chatId, userId, path: req.path });

  try {
    const [pa, pi, ci, si, cai, sol] = await Promise.all([
      prisma.productAnalysis.findUnique({ where: { chatId } }),
      prisma.productIntelligence.findUnique({ where: { chatId } }),
      prisma.competitorIntelligence.findUnique({ where: { chatId } }),
      prisma.seoIntelligence.findUnique({ where: { chatId } }),
      prisma.campaignIntelligence.findUnique({ where: { chatId } }),
      prisma.agentRun.findFirst({ where: { chatId, userId, agentType: "solution-generator", status: "completed" }, orderBy: { createdAt: 'desc' } })
    ]);

    const modules = { 
      productAnalysis: !!pa?.outputJson, 
      marketDiscovery: !!pi?.marketDiscovery, 
      audienceIntelligence: !!pi?.audienceIntelligence, 
      competitorAnalysis: !!ci?.competitorAnalysis, 
      seoIntelligence: !!si?.seoAudit, 
      campaignGenerator: !!cai?.campaignGenerator 
    };
    const count = Object.values(modules).filter(Boolean).length;

    console.log('✅ [WORKFLOW STATUS] Module status:', { count, modules, hasSolution: !!sol });

    return res.json({ 
      success: true, 
      canGenerate: count >= 2, 
      moduleCount: count, 
      availableModules: modules, 
      hasSolution: !!sol, 
      lastGenerated: sol?.createdAt || null, 
      recommendation: count < 2 ? "Run at least 2 modules" : "Ready to generate" 
    });
  } catch (error) {
    console.error('❌ [WORKFLOW STATUS] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const startWorkflowHandler = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user?.id;

  if (!chatId || !userId) {
    return res.status(400).json({ success: false, error: "Missing chatId or user authentication" });
  }

  try {
    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) {
      return res.status(404).json({ success: false, error: "Chat not found" });
    }

    const result = await startWorkflow({ chatId, userId });
    return res.json(result);
  } catch (error) {
    console.error("❌ [WORKFLOW START] Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getWorkflowStatusHandler = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user?.id;

  if (!chatId || !userId) {
    return res.status(400).json({ success: false, error: "Missing chatId or user authentication" });
  }

  try {
    const result = await getWorkflowStatus({ chatId, userId });
    return res.json(result);
  } catch (error) {
    console.error("❌ [WORKFLOW STATUS CHECK] Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const executeWorkflowStepHandler = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user?.id;
  const { stepType, context } = req.body;

  if (!chatId || !userId) {
    return res.status(400).json({ success: false, error: "Missing chatId or user authentication" });
  }

  if (!stepType) {
    return res.status(400).json({ success: false, error: "Missing stepType in request body" });
  }

  try {
    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) {
      return res.status(404).json({ success: false, error: "Chat not found" });
    }

    const result = await executeWorkflowStep({ chatId, userId, stepType, context: context || {} });
    return res.json(result);
  } catch (error) {
    console.error("❌ [WORKFLOW STEP] Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
