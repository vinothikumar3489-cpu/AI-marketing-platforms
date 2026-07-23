import { prisma } from "../../../config/prisma.js";
import { buildExecutiveDashboard } from "../../../services/executive-command-center.service.js";
import { redisConnection as redis } from "../../../config/redis.js";

/**
 * GET /api/dashboard/summary
 * Returns comprehensive dashboard data for the logged-in user
 */
export const getDashboardSummary = async (req, res) => {
  const userId = req.user.id;

  try {
    const cacheKey = `dashboard:summary:${userId}`;
    const cachedData = await redis.get(cacheKey);
    
    if (cachedData) {
      console.log('⚡ [Dashboard] Returning cached summary for user:', userId);
      return res.json(JSON.parse(cachedData));
    }

    console.log('📊 [Dashboard] Fetching summary for user:', userId);

    // Get all user's chats (projects)
    const chats = await prisma.chat.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        productIntelligence: true,
        competitorIntelligence: true,
        seoIntelligence: true,
        automationPlan: true,
        AgentRun: true,
      }
    });

    const totalProjects = chats.length;

    // Safety: Return empty dashboard if no chats
    if (chats.length === 0) {
      console.log('✅ [Dashboard] No projects found, returning empty dashboard');
      return res.json({
        success: true,
        totalProjects: 0,
        completedGrowthAnalyses: 0,
        completedSeoAnalyses: 0,
        campaignPlansGenerated: 0,
        automationPlansDrafted: 0,
        recentProjects: [],
        latestProjectSummary: null,
        recentActivity: [],
      });
    }

    // Count completed analyses
    const completedGrowthAnalyses = chats.filter(chat => 
      chat.productIntelligence?.status === 'completed' &&
      chat.competitorIntelligence?.status === 'completed'
    ).length;

    const completedSeoAnalyses = chats.filter(chat => 
      chat.seoIntelligence?.status === 'completed'
    ).length;

    const campaignPlansGenerated = 0; // Campaign intelligence not yet implemented

    const automationPlansDrafted = chats.filter(chat =>
      chat.automationPlan !== null
    ).length;

    // Get recent projects (last 10)
    const recentProjects = chats.slice(0, 10).map(chat => {
      const modulesCompleted = [
        chat.productIntelligence?.productAnalysis ? 1 : 0,
        chat.productIntelligence?.marketDiscovery ? 1 : 0,
        chat.productIntelligence?.audienceIntelligence ? 1 : 0,
        chat.competitorIntelligence?.competitorAnalysis ? 1 : 0,
        chat.competitorIntelligence?.intentPrediction ? 1 : 0,
        chat.competitorIntelligence?.positioningEngine ? 1 : 0,
        chat.seoIntelligence?.seoScore ? 1 : 0,
        chat.automationPlan ? 1 : 0,
      ].reduce((a, b) => a + b, 0);

      // Calculate growth score
      let growthScore = 0;
      let scoreCount = 0;
      
      if (chat.productIntelligence?.productAnalysis?.confidenceScore) {
        growthScore += chat.productIntelligence.productAnalysis.confidenceScore;
        scoreCount++;
      }
      if (chat.productIntelligence?.marketDiscovery?.confidenceScore) {
        growthScore += chat.productIntelligence.marketDiscovery.confidenceScore;
        scoreCount++;
      }
      if (chat.productIntelligence?.audienceIntelligence?.confidenceScore) {
        growthScore += chat.productIntelligence.audienceIntelligence.confidenceScore;
        scoreCount++;
      }
      if (chat.competitorIntelligence?.competitorAnalysis?.confidenceScore) {
        growthScore += chat.competitorIntelligence.competitorAnalysis.confidenceScore;
        scoreCount++;
      }
      
      const avgGrowthScore = scoreCount > 0 ? Math.round(growthScore / scoreCount) : 0;

      // Get SEO score
      const seoScore = chat.seoIntelligence?.seoScore || 0;

      // Extract basic info
      const productData = chat.productIntelligence?.inputJson || {};
      
      // Status badges
      const statusBadges = [];
      if (chat.productIntelligence?.status === 'completed') statusBadges.push('Growth Analysis');
      if (chat.seoIntelligence?.status === 'completed') statusBadges.push('SEO Analysis');
      if (chat.competitorIntelligence?.status === 'completed') statusBadges.push('Competitor Analysis');
      if (chat.automationPlan) statusBadges.push('Automation Ready');
      
      return {
        id: chat.id,
        title: chat.title,
        productName: chat.productName || productData.productName || 'Unnamed Project',
        website: productData.websiteUrl || '',
        industry: productData.industry || '',
        lastUpdated: chat.updatedAt,
        createdAt: chat.createdAt,
        modulesCompleted,
        totalModules: 9,
        growthScore: avgGrowthScore,
        seoScore: seoScore,
        statusBadges,
        hasAutomation: !!chat.automationPlan,
      };
    });

    // Get latest project for summary
    let latestProjectSummary = null;
    if (chats.length > 0) {
      const latest = chats[0];
      const productData = latest.productIntelligence?.inputJson || {};
      
      // Helper to safely parse JSON if it's a string
      const safeParse = (obj) => {
        if (!obj) return {};
        if (typeof obj === 'string') {
          try { return JSON.parse(obj); } catch (e) { return {}; }
        }
        return obj;
      };

      const productAnalysis = safeParse(latest.productIntelligence?.productAnalysis);
      const marketDiscovery = safeParse(latest.productIntelligence?.marketDiscovery);
      const audienceIntelligence = safeParse(latest.productIntelligence?.audienceIntelligence);
      const competitorAnalysis = safeParse(latest.competitorIntelligence?.competitorAnalysis);
      const keywordOpportunities = safeParse(latest.seoIntelligence?.keywordOpportunities);

      // Calculate overall growth score
      let growthScore = 0;
      let scoreCount = 0;
      
      if (productAnalysis?.confidenceScore) {
        growthScore += productAnalysis.confidenceScore;
        scoreCount++;
      }
      if (marketDiscovery?.confidenceScore) {
        growthScore += marketDiscovery.confidenceScore;
        scoreCount++;
      }
      if (audienceIntelligence?.confidenceScore) {
        growthScore += audienceIntelligence.confidenceScore;
        scoreCount++;
      }
      if (competitorAnalysis?.confidenceScore) {
        growthScore += competitorAnalysis.confidenceScore;
        scoreCount++;
      }

      const avgGrowthScore = scoreCount > 0 ? Math.round(growthScore / scoreCount) : 0;
      const seoScore = latest.seoIntelligence?.seoScore || 0;

      // Extract recommendations safely
      const bestChannel = audienceIntelligence?.bestChannels?.[0] ||
        audienceIntelligence?.recommendedChannels?.[0]?.channel ||
        'Not analyzed yet';

      const topOpportunity = marketDiscovery?.growthOpportunities?.[0]?.opportunity ||
        competitorAnalysis?.differentiationOpportunities?.[0]?.opportunity ||
        keywordOpportunities?.[0]?.keyword ||
        'Market expansion';

      const topRisk = marketDiscovery?.marketRisks?.[0]?.risk ||
        competitorAnalysis?.threats?.[0]?.threat ||
        'Competition';

      const nextAction = latest.automationPlan?.campaignObjective ||
        'Complete Growth Workspace analysis';

      latestProjectSummary = {
        id: latest.id,
        productName: latest.productName || productData.productName || 'Latest Project',
        website: productData.websiteUrl || '',
        industry: productData.industry || '',
        lastUpdated: latest.updatedAt,
        growthScore: avgGrowthScore,
        seoScore: seoScore,
        bestChannel,
        topOpportunity,
        topRisk,
        nextAction,
      };
    }

    // Recent activity timeline
    const recentActivity = [];
    
    for (const chat of chats.slice(0, 5)) {
      if (chat.productIntelligence?.createdAt) {
        recentActivity.push({
          type: 'growth_analysis',
          chatId: chat.id,
          projectName: chat.title,
          timestamp: chat.productIntelligence.createdAt,
          message: 'Growth Workspace analysis completed',
        });
      }
      if (chat.seoIntelligence?.createdAt) {
        recentActivity.push({
          type: 'seo_analysis',
          chatId: chat.id,
          projectName: chat.title,
          timestamp: chat.seoIntelligence.createdAt,
          message: 'SEO Intelligence analysis completed',
        });
      }
      if (chat.automationPlan?.createdAt) {
        recentActivity.push({
          type: 'automation_plan',
          chatId: chat.id,
          projectName: chat.title,
          timestamp: chat.automationPlan.createdAt,
          message: 'Automation plan generated',
        });
      }
      if (chat.AgentRun?.length > 0) {
        const latestAgent = chat.AgentRun[0];
        recentActivity.push({
          type: 'agent_run',
          chatId: chat.id,
          projectName: chat.title,
          timestamp: latestAgent.createdAt,
          message: `AI agent executed: ${latestAgent.agentType}`,
        });
      }
    }

    // Sort recent activity by timestamp
    recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const topRecentActivity = recentActivity.slice(0, 10);

    console.log('✅ [Dashboard] Summary generated:', {
      totalProjects,
      completedGrowthAnalyses,
      completedSeoAnalyses,
      campaignPlansGenerated,
      automationPlansDrafted,
      recentProjectsCount: recentProjects.length
    });

    // CRM and AI Usage Aggregation
    const crmAggregation = await prisma.$transaction([
      prisma.cRMDeal.aggregate({
        where: { userId },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.cRMContact.count({
        where: { userId }
      }),
      prisma.cRMTask.groupBy({
        by: ['status'],
        where: { userId },
        _count: { id: true }
      }),
      prisma.cRMActivity.groupBy({
        by: ['activityType'],
        where: { userId },
        _count: { id: true }
      }),
      prisma.agentRun.count({
        where: { userId }
      })
    ]);

    const [dealsStats, contactsCount, tasksStats, activitiesStats, aiUsageCount] = crmAggregation;
    const crmSummary = {
      totalDeals: dealsStats._count.id || 0,
      totalPipelineValue: dealsStats._sum.amount || 0,
      totalContacts: contactsCount || 0,
      tasksByStatus: tasksStats.reduce((acc, curr) => ({ ...acc, [curr.status]: curr._count.id }), {}),
      activitiesByType: activitiesStats.reduce((acc, curr) => ({ ...acc, [curr.activityType]: curr._count.id }), {}),
      totalAiAgentRuns: aiUsageCount || 0,
    };

    const responsePayload = {
      success: true,
      totalProjects,
      completedGrowthAnalyses,
      completedSeoAnalyses,
      campaignPlansGenerated,
      automationPlansDrafted,
      recentProjects,
      latestProjectSummary,
      recentActivity: topRecentActivity,
      crmSummary,
    };

    // Cache the payload for 5 minutes (300 seconds)
    await redis.set(cacheKey, JSON.stringify(responsePayload), 'EX', 300);

    return res.json(responsePayload);

  } catch (error) {
    console.error('❌ [Dashboard] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch dashboard summary'
    });
  }
};

/**
 * GET /api/dashboard/executive/:chatId
 * Full executive command center for a project
 */
export const getExecutiveDashboard = async (req, res) => {
  const userId = req.user.id;
  const { chatId } = req.params;

  try {
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId },
      include: {
        productIntelligence: true,
        competitorIntelligence: true,
        seoIntelligence: {
          include: {
            scoreBreakdown: true,
            keywordIntelligence: true,
            geoIntelligence: true,
            competitorSeoRecord: true,
            contentGapRecord: true,
          },
        },
        automationPlan: true,
      },
    });

    if (!chat) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const executive = buildExecutiveDashboard(chat);
    return res.json({ success: true, ...executive });
  } catch (error) {
    console.error('❌ [Executive Dashboard] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/dashboard/export
 * Export executive report in various formats
 */
export const exportExecutiveReport = async (req, res) => {
  const userId = req.user.id;
  const { chatId, format = 'csv', reportType = 'executive' } = req.body;

  try {
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId },
      include: {
        productIntelligence: true,
        competitorIntelligence: true,
        seoIntelligence: {
          include: {
            scoreBreakdown: true,
            keywordIntelligence: true,
            geoIntelligence: true,
            competitorSeoRecord: true,
            contentGapRecord: true,
          },
        },
      },
    });

    if (!chat) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const executive = buildExecutiveDashboard(chat);
    const filename = `${(executive.project.productName || 'report').replace(/\s+/g, '_')}_${reportType}`;

    if (format === 'csv') {
      const rows = [
        ['Metric', 'Value', 'Confidence'],
        ...executive.globalKpis.map(k => [k.label, k.value, k.confidence]),
        ['Business Health Score', executive.businessHealth.score, executive.businessHealth.grade],
      ];
      const csv = rows.map(r => r.join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send(csv);
    }

    if (format === 'json' || format === 'docx' || format === 'pdf' || format === 'ppt') {
      return res.json({
        success: true,
        format,
        reportType,
        filename: `${filename}.${format === 'json' ? 'json' : format}`,
        data: executive,
        message: format === 'json'
          ? 'JSON export ready'
          : `${format.toUpperCase()} export generated as structured data — use client-side renderer for full document`,
      });
    }

    return res.status(400).json({ success: false, error: 'Unsupported format. Use: pdf, ppt, docx, csv, json' });
  } catch (error) {
    console.error('❌ [Export] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
