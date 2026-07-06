import { generateContentStudioPlan } from './content-studio.service.js';
import { generateEmailCampaignPlan } from './email-campaign.service.js';
import { generateCreativeStudioPlan } from './creative-studio.service.js';
import { generateVideoStudioPlan } from './video-studio.service.js';
import { generateCampaignPlannerPlan } from './campaign-planner.service.js';
import { generateSocialCalendarPlan } from './social-calendar.service.js';

export async function generateAllExecutionModules(context) {
  const results = {};

  try {
    results.contentStudio = await generateContentStudioPlan(context);
    console.log('[MarketingExecution] Content Studio:',
      results.contentStudio?.totalGenerated || 0, 'assets generated');
  } catch (e) {
    console.warn('[MarketingExecution] Content Studio failed:', e.message);
    results.contentStudio = { error: e.message, assets: {}, totalGenerated: 0 };
  }

  try {
    results.emailCampaigns = await generateEmailCampaignPlan(context);
    console.log('[MarketingExecution] Email Campaign Studio:',
      results.emailCampaigns?.totalGenerated || 0, 'campaigns generated');
  } catch (e) {
    console.warn('[MarketingExecution] Email Campaign Studio failed:', e.message);
    results.emailCampaigns = { error: e.message, campaigns: {}, totalGenerated: 0 };
  }

  try {
    results.creativeStudio = await generateCreativeStudioPlan(context);
    console.log('[MarketingExecution] Creative Studio:',
      results.creativeStudio?.totalGenerated || 0, 'briefs generated');
  } catch (e) {
    console.warn('[MarketingExecution] Creative Studio failed:', e.message);
    results.creativeStudio = { error: e.message, briefs: {}, totalGenerated: 0 };
  }

  try {
    results.videoStudio = await generateVideoStudioPlan(context);
    console.log('[MarketingExecution] Video Studio:',
      results.videoStudio?.totalGenerated || 0, 'scripts generated');
  } catch (e) {
    console.warn('[MarketingExecution] Video Studio failed:', e.message);
    results.videoStudio = { error: e.message, scripts: {}, totalGenerated: 0 };
  }

  try {
    results.campaignPlans = await generateCampaignPlannerPlan(context);
    console.log('[MarketingExecution] Campaign Planner:',
      results.campaignPlans?.totalGenerated || 0, 'plans generated');
  } catch (e) {
    console.warn('[MarketingExecution] Campaign Planner failed:', e.message);
    results.campaignPlans = { error: e.message, plans: {}, totalGenerated: 0 };
  }

  try {
    results.socialCalendars = await generateSocialCalendarPlan(context);
    console.log('[MarketingExecution] Social Calendar:',
      results.socialCalendars?.totalGenerated || 0, 'calendars generated');
  } catch (e) {
    console.warn('[MarketingExecution] Social Calendar failed:', e.message);
    results.socialCalendars = { error: e.message, calendars: {}, totalGenerated: 0 };
  }

  const totalAssets = Object.values(results).reduce((sum, mod) => sum + (mod.totalGenerated || 0), 0);

  return {
    ...results,
    _summary: {
      modulesGenerated: Object.keys(results).filter(k => !k.startsWith('_')).length,
      totalAssetsGenerated: totalAssets,
      generatedAt: new Date().toISOString(),
      evidenceVersion: '2.0.0',
    },
  };
}

export async function generateSingleModule(type, context) {
  switch (type) {
    case 'content-studio': return { module: type, data: await generateContentStudioPlan(context) };
    case 'email-campaigns': return { module: type, data: await generateEmailCampaignPlan(context) };
    case 'creative-studio': return { module: type, data: await generateCreativeStudioPlan(context) };
    case 'video-studio': return { module: type, data: await generateVideoStudioPlan(context) };
    case 'campaign-plans': return { module: type, data: await generateCampaignPlannerPlan(context) };
    case 'social-calendars': return { module: type, data: await generateSocialCalendarPlan(context) };
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
