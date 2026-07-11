import { generateContentStudioPlan } from './content-studio.service.js';
import { generateEmailCampaignPlan } from './email-campaign.service.js';
import { generateCreativeStudioPlan } from './creative-studio.service.js';
import { generateVideoStudioPlan } from './video-studio.service.js';
import { generateCampaignPlannerPlan } from './campaign-planner.service.js';
import { generateSocialCalendarPlan } from './social-calendar.service.js';

function buildExecutionContext(context) {
  const ec = context.evidenceContext || {};
  return {
    productName: context.productName || ec.product?.name || 'N/A',
    companyName: context.companyName || ec.company?.name || null,
    targetAudience: context.targetAudience || ec.product?.targetAudience || ec.audience?.primary || null,
    industry: context.industry || ec.product?.industry || null,
    productUsp: context.productUsp || ec.product?.usp || null,
    seoData: context.seoData || (ec.seo ? JSON.stringify({ issues: ec.seo.issues?.length || 0, opportunities: ec.seo.contentOpportunities?.length || 0 }) : null),
    growthData: context.growthData || (ec.growth ? JSON.stringify({ score: ec.growth.overallScore }) : null),
    campaignGoal: context.campaignGoal || null,
    tone: context.tone || 'professional',
    seoKeywords: context.seoKeywords || (ec.seo?.contentOpportunities?.slice(0, 5).map(o => o.opportunity) || []),
    platforms: context.platforms || [],
    brandColors: context.brandColors || null,
    senderName: context.senderName || null,
    totalBudget: context.totalBudget || null,
    evidence: {
      website: ec.website || null,
      audience: ec.audience || null,
      competitors: ec.competitors || null,
      seo: ec.seo || null,
      channels: ec.channels || [],
      growth: ec.growth || null,
      sourceSummary: ec.sourceSummary || null,
    },
  };
}

export async function generateAllExecutionModules(context) {
  const execCtx = buildExecutionContext(context);
  const results = {};

  try {
    results.contentStudio = await generateContentStudioPlan(execCtx);
    console.log('[MarketingExecution] Content Studio:',
      results.contentStudio?.totalGenerated || 0, 'assets generated');
  } catch (e) {
    console.warn('[MarketingExecution] Content Studio failed:', e.message);
    results.contentStudio = { error: e.message, assets: {}, totalGenerated: 0 };
  }

  try {
    results.emailCampaigns = await generateEmailCampaignPlan(execCtx);
    console.log('[MarketingExecution] Email Campaign Studio:',
      results.emailCampaigns?.totalGenerated || 0, 'campaigns generated');
  } catch (e) {
    console.warn('[MarketingExecution] Email Campaign Studio failed:', e.message);
    results.emailCampaigns = { error: e.message, campaigns: {}, totalGenerated: 0 };
  }

  try {
    results.creativeStudio = await generateCreativeStudioPlan(execCtx);
    console.log('[MarketingExecution] Creative Studio:',
      results.creativeStudio?.totalGenerated || 0, 'briefs generated');
  } catch (e) {
    console.warn('[MarketingExecution] Creative Studio failed:', e.message);
    results.creativeStudio = { error: e.message, briefs: {}, totalGenerated: 0 };
  }

  try {
    results.videoStudio = await generateVideoStudioPlan(execCtx);
    console.log('[MarketingExecution] Video Studio:',
      results.videoStudio?.totalGenerated || 0, 'scripts generated');
  } catch (e) {
    console.warn('[MarketingExecution] Video Studio failed:', e.message);
    results.videoStudio = { error: e.message, scripts: {}, totalGenerated: 0 };
  }

  try {
    results.campaignPlans = await generateCampaignPlannerPlan(execCtx);
    console.log('[MarketingExecution] Campaign Planner:',
      results.campaignPlans?.totalGenerated || 0, 'plans generated');
  } catch (e) {
    console.warn('[MarketingExecution] Campaign Planner failed:', e.message);
    results.campaignPlans = { error: e.message, plans: {}, totalGenerated: 0 };
  }

  try {
    results.socialCalendars = await generateSocialCalendarPlan(execCtx);
    console.log('[MarketingExecution] Social Calendar:',
      results.socialCalendars?.totalGenerated || 0, 'calendars generated');
  } catch (e) {
    console.warn('[MarketingExecution] Social Calendar failed:', e.message);
    results.socialCalendars = { error: e.message, calendars: {}, totalGenerated: 0 };
  }

  // Phase 7 — Measurement plan / KPI dashboard
  const analyticsConnected = !!(process.env.GA_API_KEY || process.env.MIXPANEL_API_KEY || process.env.POSTHOG_API_KEY);
  const measurementPlan = analyticsConnected ? {
    status: 'connected',
    note: 'Analytics provider detected. KPIs will be tracked automatically.',
    platforms: {
      googleAnalytics: !!process.env.GA_API_KEY,
      mixpanel: !!process.env.MIXPANEL_API_KEY,
      posthog: !!process.env.POSTHOG_API_KEY,
    },
  } : {
    status: 'not_connected',
    note: 'No analytics provider configured. KPIs show measurement plan with values marked "Not connected".',
    measurementPlan: [
      { metric: 'Website traffic', measurementMethod: 'Connect Google Analytics', currentValue: 'Not connected', targetValue: 'Not connected' },
      { metric: 'Email open rate', measurementMethod: 'Connect email provider (Gmail/SendGrid/Brevo)', currentValue: 'Not connected', targetValue: 'Not connected' },
      { metric: 'Conversion rate', measurementMethod: 'Connect analytics + CRM', currentValue: 'Not connected', targetValue: 'Not connected' },
      { metric: 'Channel reach', measurementMethod: 'Per-platform analytics', currentValue: 'Not connected', targetValue: 'Not connected' },
      { metric: 'Content engagement', measurementMethod: 'Connect analytics + social platform APIs', currentValue: 'Not connected', targetValue: 'Not connected' },
    ],
  };

  const totalAssets = Object.values(results).reduce((sum, mod) => sum + (mod.totalGenerated || 0), 0);

  return {
    ...results,
    measurementPlan,
    _summary: {
      modulesGenerated: Object.keys(results).filter(k => !k.startsWith('_')).length,
      totalAssetsGenerated: totalAssets,
      generatedAt: new Date().toISOString(),
      evidenceVersion: '2.0.0',
      analyticsConnected,
    },
  };
}

export async function generateSingleModule(type, context) {
  const execCtx = buildExecutionContext(context);
  switch (type) {
    case 'content-studio': return { module: type, data: await generateContentStudioPlan(execCtx) };
    case 'email-campaigns': return { module: type, data: await generateEmailCampaignPlan(execCtx) };
    case 'creative-studio': return { module: type, data: await generateCreativeStudioPlan(execCtx) };
    case 'video-studio': return { module: type, data: await generateVideoStudioPlan(execCtx) };
    case 'campaign-plans': return { module: type, data: await generateCampaignPlannerPlan(execCtx) };
    case 'social-calendars': return { module: type, data: await generateSocialCalendarPlan(execCtx) };
    default: throw new Error(`Unknown execution module: ${type}`);
  }
}

export function getExecutionSummary(data) {
  if (!data) return { total: 0, modules: [] };
  const modules = [];
  if (data.contentStudio?.totalGenerated) modules.push({ name: 'Content Studio', count: data.contentStudio.totalGenerated });
  if (data.emailCampaigns?.totalGenerated) modules.push({ name: 'Email Campaigns', count: data.emailCampaigns.totalGenerated });
  if (data.creativeStudio?.totalGenerated) modules.push({ name: 'Creative Studio', count: data.creativeStudio.totalGenerated });
  if (data.videoStudio?.totalGenerated) modules.push({ name: 'Video Studio', count: data.videoStudio.totalGenerated });
  if (data.campaignPlans?.totalGenerated) modules.push({ name: 'Campaign Planner', count: data.campaignPlans.totalGenerated });
  if (data.socialCalendars?.totalGenerated) modules.push({ name: 'Social Calendar', count: data.socialCalendars.totalGenerated });
  return { total: modules.reduce((s, m) => s + m.count, 0), modules };
}
