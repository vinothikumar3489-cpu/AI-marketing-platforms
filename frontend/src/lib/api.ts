const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

import { normalizeDeep } from './normalizers';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export function getToken() {
  return localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
}

export function setToken(token: string) {
  localStorage.setItem('auth_token', token);
}

export function clearAuth() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  localStorage.removeItem('selectedChatId');
}

async function request<T>(method: Method, path: string, body?: any, signal?: AbortSignal): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    throw new ApiError('Backend server is unreachable. Please ensure the server is running.', 502, err);
  }

  let data: any = null;
  try { data = await res.json(); } catch { data = null; }
  
  if (!res.ok) {
    if (res.status === 401) {
      clearAuth();
    }
    throw new ApiError(data?.error || data?.message || `Request failed: ${res.status}`, res.status, data);
  }

  // Unwrap standardized { success: true, data: ... } format
  if (data && data.success && data.data !== undefined) {
    data = data.data as T;
  }

  // Normalize deep to prevent React error #31 while preserving data structure
  if (path.includes('full-results') && data && typeof data === 'object') {
    return {
      ...data,
      seoIntelligence: normalizeDeep(data?.seoIntelligence),
      seo: normalizeDeep(data?.seo),
    } as T;
  }

  return data as T;
}

export const api = {
  get: <T = any>(path: string, signal?: AbortSignal) => request<T>('GET', path, undefined, signal),
  post: <T = any>(path: string, body?: any, signal?: AbortSignal) => request<T>('POST', path, body, signal),
  put: <T = any>(path: string, body?: any, signal?: AbortSignal) => request<T>('PUT', path, body, signal),
  patch: <T = any>(path: string, body?: any, signal?: AbortSignal) => request<T>('PATCH', path, body, signal),
  del: <T = any>(path: string, signal?: AbortSignal) => request<T>('DELETE', path, undefined, signal),
};

export async function tryPost(paths: string[], body?: any) {
  let last: any;
  for (const path of paths) {
    try { return await api.post(path, body); } catch (e) { last = e; }
  }
  throw last;
}

export async function tryGet(paths: string[]) {
  let last: any;
  for (const path of paths) {
    try { return await api.get(path); } catch (e) { last = e; }
  }
  throw last;
}

// ============================================
// PHASE 9 — Integration API Functions
// ============================================

export async function getIntegrationHealth() {
  return api.get<{
    success: boolean;
    providers: {
      email: { configured: boolean; provider: string | null; smtpUserConfigured: boolean; smtpPassConfigured: boolean; smtpPassLength?: number; from: string | null; port587?: string; port465?: string };
      image: { pollinations: { configured: boolean }; fal: { configured: boolean; model: string }; reason: string };
      storage: { configured: boolean; provider: string | null };
      video: { shotstack: { configured: boolean; stage: string }; creatomate: { configured: boolean }; reason: string };
      ai: { gemini: boolean; groq: boolean };
    };
  }>('/integrations/health');
}

export async function sendTestEmail(chatId: string, payload: {
  recipientEmail: string;
  subject: string;
  body: string;
  approvalChecked: boolean;
  senderName?: string;
}) {
  return api.post<{
    success: boolean;
    provider?: string;
    messageId?: string;
    sentAt?: string;
    maskedRecipient?: string;
    recipient?: string;
    status?: string;
    warnings?: string[];
    error?: string;
    details?: string;
    code?: string;
  }>(`/integrations/${chatId}/studio/email/send-test`, payload);
}

export async function generatePosterImage(chatId: string, payload: {
  prompt: string;
  headline?: string;
  cta?: string;
  platform?: string;
  dimensions?: string;
  brandColors?: string[];
  audience?: string;
}) {
  return api.post<{
    success: boolean;
    provider?: string;
    imageUrl?: string;
    cloudinaryPublicId?: string;
    prompt?: string;
    generatedAt?: string;
    warnings?: string[];
    error?: string;
  }>(`/integrations/${chatId}/studio/creative/generate-image`, payload);
}

export async function renderVideo(chatId: string, payload: {
  script?: string;
  scenes: Array<{ title?: string; visual?: string; voiceover?: string; duration?: number }>;
  duration?: number;
  platform?: string;
  aspectRatio?: string;
  prompt?: string;
}) {
  return api.post<{
    success: boolean;
    provider?: string;
    videoUrl?: string | null;
    storyboard?: any;
    scenes?: any[];
    script?: string;
    duration?: number;
    generatedAt?: string;
    warnings?: string[];
    error?: string;
    renderId?: string;
    status?: string;
  }>(`/integrations/${chatId}/studio/video/render`, payload);
}

export async function getVideoStatus(provider: string, renderId: string) {
  return api.get<{
    success: boolean;
    provider?: string;
    status?: string;
    renderId?: string;
    videoUrl?: string | null;
    error?: string;
  }>(`/integrations/video/status/${provider}/${renderId}`);
}

export async function downloadReport(chatId: string, type: 'executive' | 'growth' | 'seo', format: string): Promise<void> {
  const token = getToken();
  const url = `${API_BASE}/chats/${chatId}/report/${type}/${format}`;

  try {
    const res = await fetch(url, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });

    if (!res.ok) {
      let errMsg = `Download failed: ${res.status}`;
      try {
        const errData = await res.json();
        errMsg = errData?.error || errMsg;
      } catch { /* ignore */ }
      throw new Error(errMsg);
    }

    const blob = await res.blob();
    if (blob.size === 0) throw new Error('Downloaded file is empty');

    // Extract filename from Content-Disposition header or use fallback
    const disposition = res.headers.get('Content-Disposition');
    let filename = `Report_${type}_${chatId}.${format === 'markdown' ? 'md' : format}`;
    if (disposition) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, '');
      }
    }

    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(blobUrl);
    a.remove();
  } catch (err: any) {
    console.error('[Download Report]', err);
    // Try to show a toast if sonner toast is available
    try {
      const { toast } = await import('sonner');
      toast.error(err.message || 'Failed to download report. Check server connection.');
    } catch {
      alert(err.message || 'Failed to download report. Check server connection.');
    }
    throw err;
  }
}

// ============================================
// PHASE A — Evidence Context & Content Generation
// ============================================

export async function getEvidenceContext(chatId: string) {
  return api.get<{
    success: boolean;
    data: {
      company: any;
      product: any;
      website: any;
      audience: any;
      competitors: any;
      seo: any;
      channels: any[];
      growth: any;
      sourceSummary: any;
    };
  }>(`/automation/${chatId}/evidence-context`);
}

export async function generateExecutionModule(chatId: string, module: string) {
  return api.post<{ success: boolean; data: any }>(`/automation/${chatId}/execute/${module}`);
}

export async function getExecutionData(chatId: string) {
  return api.get<{ success: boolean; exists: boolean; data: any }>(`/automation/${chatId}/execution`);
}

export async function getCampaignPlan(chatId: string) {
  return api.get<any>(`/automation/${chatId}/plan`);
}

// ============================================
// CONTENT STUDIO API (Phases 1–10)
// ============================================

export async function getContentBrief(chatId: string, signal?: AbortSignal) {
  return api.get<any>(`/automation/${chatId}/content-brief`, signal);
}

export async function generateContentItem(chatId: string, contentType: string, signal?: AbortSignal) {
  return api.post<any>(`/automation/${chatId}/content`, { contentType }, signal);
}

export async function generateContentPlan(chatId: string, types?: string[], signal?: AbortSignal) {
  return api.post<any>(`/automation/${chatId}/content/plan`, { types }, signal);
}

export async function getContentAssets(chatId: string, type?: string, signal?: AbortSignal) {
  const query = type ? `?type=${type}` : '';
  return api.get<any>(`/automation/${chatId}/content/assets${query}`, signal);
}

export async function getAssetVersionHistory(assetId: string, signal?: AbortSignal) {
  return api.get<any>(`/automation/content/assets/${assetId}/versions`, signal);
}

export async function regenerateContentAsset(assetId: string, signal?: AbortSignal) {
  return api.post<any>(`/automation/content/assets/${assetId}/regenerate`, {}, signal);
}

// ============================================
// EMAIL CAMPAIGN MODULE (Phase 16)
// ============================================

export async function generateEmailCampaign(chatId: string, campaignPlanId: string) {
  return api.post<{
    campaign: any;
    items: any[];
    channelFit: any;
    aiProvider: string | null;
    validationIssues: any[];
  }>(`/chats/${chatId}/email-campaign/generate`, { campaignPlanId });
}

export async function getEmailCampaign(chatId: string, campaignId: string) {
  return api.get<any>(`/chats/${chatId}/email-campaign/${campaignId}`);
}

export async function listEmailCampaigns(chatId: string) {
  return api.get<any[]>(`/chats/${chatId}/email-campaign`);
}

export async function updateEmailItem(chatId: string, campaignId: string, itemId: string, updates: any) {
  return api.patch<any>(`/chats/${chatId}/email-campaign/${campaignId}/items/${itemId}`, updates);
}

export async function regenerateEmailItem(chatId: string, campaignId: string, itemId: string, customPrompt?: string) {
  return api.post<any>(`/chats/${chatId}/email-campaign/${campaignId}/items/${itemId}/regenerate`, { customPrompt });
}

export async function submitCampaignForReview(chatId: string, campaignId: string) {
  return api.post<any>(`/chats/${chatId}/email-campaign/${campaignId}/submit-review`);
}

export async function approveEmailCampaign(chatId: string, campaignId: string) {
  return api.post<any>(`/chats/${chatId}/email-campaign/${campaignId}/approve`);
}

export async function requestCampaignChanges(chatId: string, campaignId: string, feedback: string) {
  return api.post<any>(`/chats/${chatId}/email-campaign/${campaignId}/request-changes`, { feedback });
}

export async function createEmailCampaignVersion(chatId: string, campaignId: string, reason: string) {
  return api.post<any>(`/chats/${chatId}/email-campaign/${campaignId}/versions`, { reason });
}

export async function restoreEmailCampaignVersion(chatId: string, campaignId: string, versionId: string) {
  return api.post<any>(`/chats/${chatId}/email-campaign/${campaignId}/versions/${versionId}/restore`);
}

// ============================================
// CRM MODULE (Phase 17)
// ============================================

export async function getCRMDashboard(chatId: string) {
  return api.get<any>(`/chats/${chatId}/crm/dashboard`);
}

export async function listCRMContacts(chatId: string, params?: any) {
  const q = params ? '?' + new URLSearchParams(params).toString() : '';
  return api.get<any[]>(`/chats/${chatId}/crm/contacts${q}`);
}

export async function getCRMContact(chatId: string, contactId: string) {
  return api.get<any>(`/chats/${chatId}/crm/contacts/${contactId}`);
}

export async function createCRMContact(chatId: string, data: any) {
  return api.post<any>(`/chats/${chatId}/crm/contacts`, data);
}

export async function updateCRMContact(chatId: string, contactId: string, data: any) {
  return api.patch<any>(`/chats/${chatId}/crm/contacts/${contactId}`, data);
}

export async function archiveCRMContact(chatId: string, contactId: string) {
  return api.del<any>(`/chats/${chatId}/crm/contacts/${contactId}`);
}

export async function deleteCRMCompany(chatId: string, companyId: string) {
  return api.del<any>(`/chats/${chatId}/crm/companies/${companyId}`);
}

export async function deleteCRMDeal(chatId: string, dealId: string) {
  return api.del<any>(`/chats/${chatId}/crm/deals/${dealId}`);
}

export async function cancelCRMTask(chatId: string, taskId: string) {
  return api.post<any>(`/chats/${chatId}/crm/tasks/${taskId}/cancel`);
}

export async function assignCRMTask(chatId: string, taskId: string, assignedTo: string) {
  return api.post<any>(`/chats/${chatId}/crm/tasks/${taskId}/assign`, { assignedTo });
}

export async function listCRMCompanies(chatId: string, params?: any) {
  const q = params ? '?' + new URLSearchParams(params).toString() : '';
  return api.get<any[]>(`/chats/${chatId}/crm/companies${q}`);
}

export async function getCRMCompany(chatId: string, companyId: string) {
  return api.get<any>(`/chats/${chatId}/crm/companies/${companyId}`);
}

export async function createCRMCompany(chatId: string, data: any) {
  return api.post<any>(`/chats/${chatId}/crm/companies`, data);
}

export async function updateCRMCompany(chatId: string, companyId: string, data: any) {
  return api.patch<any>(`/chats/${chatId}/crm/companies/${companyId}`, data);
}

export async function listCRMDeals(chatId: string, params?: any) {
  const q = params ? '?' + new URLSearchParams(params).toString() : '';
  return api.get<any[]>(`/chats/${chatId}/crm/deals${q}`);
}

export async function getCRMDeal(chatId: string, dealId: string) {
  return api.get<any>(`/chats/${chatId}/crm/deals/${dealId}`);
}

export async function createCRMDeal(chatId: string, data: any) {
  return api.post<any>(`/chats/${chatId}/crm/deals`, data);
}

export async function updateCRMDeal(chatId: string, dealId: string, data: any) {
  return api.patch<any>(`/chats/${chatId}/crm/deals/${dealId}`, data);
}

export async function moveDealStage(chatId: string, dealId: string, stageId: string) {
  return api.post<any>(`/chats/${chatId}/crm/deals/${dealId}/move-stage`, { stageId });
}

export async function listCRMPipelines(chatId: string) {
  return api.get<any[]>(`/chats/${chatId}/crm/pipelines`);
}

export async function getCRMPipeline(chatId: string, pipelineId: string) {
  return api.get<any>(`/chats/${chatId}/crm/pipelines/${pipelineId}`);
}

export async function createCRMPipeline(chatId: string, data: any) {
  return api.post<any>(`/chats/${chatId}/crm/pipelines`, data);
}

export async function getDefaultCRMPipeline(chatId: string) {
  return api.get<any>(`/chats/${chatId}/crm/pipelines/default`);
}

export async function createCRMPipelineStage(chatId: string, pipelineId: string, data: any) {
  return api.post<any>(`/chats/${chatId}/crm/pipelines/${pipelineId}/stages`, data);
}

export async function renameCRMPipelineStage(chatId: string, pipelineId: string, stageId: string, data: any) {
  return api.patch<any>(`/chats/${chatId}/crm/pipelines/${pipelineId}/stages/${stageId}`, data);
}

export async function deleteCRMPipelineStage(chatId: string, pipelineId: string, stageId: string) {
  return api.del<any>(`/chats/${chatId}/crm/pipelines/${pipelineId}/stages/${stageId}`);
}

export async function reorderCRMPipelineStages(chatId: string, pipelineId: string, stageIds: string[]) {
  return api.post<any>(`/chats/${chatId}/crm/pipelines/${pipelineId}/reorder-stages`, { stageIds });
}

export async function deleteCRMPipeline(chatId: string, pipelineId: string) {
  return api.del<any>(`/chats/${chatId}/crm/pipelines/${pipelineId}`);
}

export async function listCRMTasks(chatId: string, params?: any) {
  const q = params ? '?' + new URLSearchParams(params).toString() : '';
  return api.get<any[]>(`/chats/${chatId}/crm/tasks${q}`);
}

export async function createCRMTask(chatId: string, data: any) {
  return api.post<any>(`/chats/${chatId}/crm/tasks`, data);
}

export async function updateCRMTask(chatId: string, taskId: string, data: any) {
  return api.patch<any>(`/chats/${chatId}/crm/tasks/${taskId}`, data);
}

export async function completeCRMTask(chatId: string, taskId: string) {
  return api.post<any>(`/chats/${chatId}/crm/tasks/${taskId}/complete`);
}

export async function listCRMActivities(chatId: string, params?: any) {
  const q = params ? '?' + new URLSearchParams(params).toString() : '';
  return api.get<any[]>(`/chats/${chatId}/crm/activities${q}`);
}

export async function createCRMActivity(chatId: string, data: any) {
  return api.post<any>(`/chats/${chatId}/crm/activities`, data);
}

export async function generateLeadJourney(chatId: string, contactId: string) {
  return api.post<any>(`/chats/${chatId}/crm/lead-journey/${contactId}/generate`);
}

export async function getLeadJourney(chatId: string, contactId: string) {
  return api.get<any>(`/chats/${chatId}/crm/lead-journey/${contactId}`);
}

export async function listCRMWorkflows(chatId: string, params?: any) {
  const q = params ? '?' + new URLSearchParams(params).toString() : '';
  return api.get<any[]>(`/chats/${chatId}/crm/workflows${q}`);
}

export async function getCRMWorkflow(chatId: string, workflowId: string) {
  return api.get<any>(`/chats/${chatId}/crm/workflows/${workflowId}`);
}

export async function createCRMWorkflow(chatId: string, data: any) {
  return api.post<any>(`/chats/${chatId}/crm/workflows`, data);
}

export async function updateCRMWorkflow(chatId: string, workflowId: string, data: any) {
  return api.patch<any>(`/chats/${chatId}/crm/workflows/${workflowId}`, data);
}

export async function submitWorkflowForReview(chatId: string, workflowId: string) {
  return api.post<any>(`/chats/${chatId}/crm/workflows/${workflowId}/submit-review`);
}

export async function approveCRMWorkflow(chatId: string, workflowId: string) {
  return api.post<any>(`/chats/${chatId}/crm/workflows/${workflowId}/approve`);
}

export async function requestWorkflowChanges(chatId: string, workflowId: string, feedback: string) {
  return api.post<any>(`/chats/${chatId}/crm/workflows/${workflowId}/request-changes`, { feedback });
}

export async function activateCRMWorkflow(chatId: string, workflowId: string) {
  return api.post<any>(`/chats/${chatId}/crm/workflows/${workflowId}/activate`);
}

export async function pauseCRMWorkflow(chatId: string, workflowId: string) {
  return api.post<any>(`/chats/${chatId}/crm/workflows/${workflowId}/pause`);
}

export async function executeCRMWorkflow(chatId: string, workflowId: string, triggerContext?: any) {
  return api.post<any>(`/chats/${chatId}/crm/workflows/${workflowId}/run`, { triggerContext });
}

export async function testCRMWorkflow(chatId: string, workflowId: string, testData?: any) {
  return api.post<any>(`/chats/${chatId}/crm/workflows/${workflowId}/test`, { testData });
}

export async function getCRMWorkflowLogs(chatId: string, workflowId: string) {
  return api.get<any[]>(`/chats/${chatId}/crm/workflows/${workflowId}/logs`);
}

export async function getCRMWorkflowVersions(chatId: string, workflowId: string) {
  return api.get<any[]>(`/chats/${chatId}/crm/workflows/${workflowId}/versions`);
}

export async function restoreCRMWorkflowVersion(chatId: string, workflowId: string, versionId: string) {
  return api.post<any>(`/chats/${chatId}/crm/workflows/${workflowId}/restore/${versionId}`);
}

export async function uploadCRMImport(chatId: string, csvText: string, fileName: string) {
  return api.post<any>(`/chats/${chatId}/crm/import/upload`, { csvText, fileName });
}

export async function mapCRMImportColumns(chatId: string, importId: string, columnMapping: any, importType: string) {
  return api.post<any>(`/chats/${chatId}/crm/import/${importId}/map`, { columnMapping, importType });
}

export async function validateCRMImport(chatId: string, importId: string) {
  return api.post<any>(`/chats/${chatId}/crm/import/${importId}/validate`);
}

export async function confirmCRMImport(chatId: string, importId: string) {
  return api.post<any>(`/chats/${chatId}/crm/import/${importId}/confirm`);
}

export async function getCRMImportJob(chatId: string, importId: string) {
  return api.get<any>(`/chats/${chatId}/crm/import/${importId}`);
}

// ============================================
// SALES COPILOT (Phase 18 — FleetNimble AI Sales Copilot)
// ============================================

export async function getCopilotDashboard(chatId: string) {
  return api.get<any>(`/chats/${chatId}/copilot/dashboard`);
}

export async function getDealInsights(chatId: string, dealId: string) {
  return api.get<any>(`/chats/${chatId}/copilot/deals/${dealId}/insights`);
}

export async function generateFollowUp(chatId: string, dealId: string, channel: string) {
  return api.post<any>(`/chats/${chatId}/copilot/deals/${dealId}/follow-up`, { channel });
}

export async function getNextBestAction(chatId: string, contactId: string) {
  return api.get<any>(`/chats/${chatId}/copilot/contacts/${contactId}/nba`);
}

export async function scoreOpportunity(chatId: string, dealId: string) {
  return api.get<any>(`/chats/${chatId}/copilot/deals/${dealId}/score`);
}

export async function getSalesTimeline(chatId: string, params?: any) {
  const q = params ? '?' + new URLSearchParams(params).toString() : '';
  return api.get<any>(`/chats/${chatId}/copilot/timeline${q}`);
}

export async function getConversationMemory(chatId: string, params?: any) {
  const q = params ? '?' + new URLSearchParams(params).toString() : '';
  return api.get<any>(`/chats/${chatId}/copilot/memory${q}`);
}

export async function getMeetingPrep(chatId: string, contactId: string) {
  return api.get<any>(`/chats/${chatId}/copilot/contacts/${contactId}/meeting-prep`);
}

export async function generateProposal(chatId: string, dealId: string) {
  return api.post<any>(`/chats/${chatId}/copilot/deals/${dealId}/proposals`);
}

export async function listProposals(chatId: string, dealId?: string) {
  const q = dealId ? `?dealId=${dealId}` : '';
  return api.get<any>(`/chats/${chatId}/copilot/proposals${q}`);
}

export async function getCustomerHealth(chatId: string) {
  return api.get<any>(`/chats/${chatId}/copilot/health`);
}

export async function runCopilotAutomation(chatId: string, action: string, config: any) {
  return api.post<any>(`/chats/${chatId}/copilot/automation`, { action, config });
}

export async function getCopilotNotifications(chatId: string) {
  return api.get<any>(`/chats/${chatId}/copilot/notifications`);
}
