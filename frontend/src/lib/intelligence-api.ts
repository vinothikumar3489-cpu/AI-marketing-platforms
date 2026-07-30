import { api } from './api';

export async function getIntelligenceOverview() {
  return api.get<{ success: boolean; overview: any }>('/admin/intelligence/overview');
}

export async function getMarketData() {
  return api.get<{ success: boolean; market: any }>('/admin/intelligence/market');
}

export async function getCompetitorData() {
  return api.get<{ success: boolean; competitors: any }>('/admin/intelligence/competitors');
}

export async function getSeoOpportunities() {
  return api.get<{ success: boolean; seoOpportunities: any[] }>('/admin/intelligence/seo-opportunities');
}

export async function getContentOpportunities() {
  return api.get<{ success: boolean; contentOpportunities: any[] }>('/admin/intelligence/content-opportunities');
}

export async function getCampaignInsights() {
  return api.get<{ success: boolean; campaign: any }>('/admin/intelligence/campaign-insights');
}

export async function getLeadOpportunities() {
  return api.get<{ success: boolean; leadOpportunities: any[] }>('/admin/intelligence/lead-opportunities');
}

export async function getAlerts(params?: { priority?: string; acknowledged?: string }) {
  const q = params ? '?' + new URLSearchParams(params as any).toString() : '';
  return api.get<{ success: boolean; alerts: any[]; total: number; unacknowledged: number }>(`/admin/intelligence/alerts${q}`);
}

export async function acknowledgeAlert(alertId: string) {
  return api.post<{ success: boolean; acknowledged: boolean }>(`/admin/intelligence/alerts/${alertId}/acknowledge`);
}

export async function getTrendData() {
  return api.get<{ success: boolean; trends: any }>('/admin/intelligence/trends');
}

export async function getInsightsData() {
  return api.get<{ success: boolean; insights: any[]; total: number }>('/admin/intelligence/insights');
}

export async function runIntelligenceCycle() {
  return api.post<{ success: boolean; cycle: any }>('/admin/intelligence/run-cycle');
}

export async function runIntelligenceModule(name: string) {
  return api.post<{ success: boolean; module: string; result: any }>(`/admin/intelligence/run-module/${name}`);
}