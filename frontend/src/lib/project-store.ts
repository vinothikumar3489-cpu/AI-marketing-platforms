
// Return active chat ID synchronously from localStorage
function getActiveChatId() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("marketform_active_chat_id");
}

// Set active chat ID
function setActiveChatId(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("marketform_active_chat_id", id);
  window.dispatchEvent(new Event("marketform-chat-change"));
}

// For backward compatibility
export type ProductProject = {
  id: string;
  productName: string;
  websiteUrl: string;
  description: string;
  industry: string;
  targetAudience: string;
  pricing: string;
  competitors: string;
  createdAt: string;
  updatedAt: string;
  productAnalysis?: any;
  modules?: Record<string, any>;
};

export function getProjects(): ProductProject[] {
  return [];
}

export function saveProjects(projects: ProductProject[]) {}

export function getActiveProjectId() {
  return getActiveChatId();
}

export function setActiveProjectId(id: string) {
  setActiveChatId(id);
}

// Now getActiveProject will just returns a mock project with chat ID
export function getActiveProject() {
  const chatId = getActiveChatId();
  if (!chatId) return null;
  return {
    id: chatId,
    productName: "New Product",
    websiteUrl: "",
    description: "",
    industry: "",
    targetAudience: "",
    pricing: "",
    competitors: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as ProductProject;
}

export function createBlankProject() {
  const id = "temp-" + Date.now();
  setActiveChatId(id);
  return {
    id,
    productName: "New Product Project",
    websiteUrl: "",
    description: "",
    industry: "",
    targetAudience: "",
    pricing: "",
    competitors: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as ProductProject;
}

export function upsertProject(input: Partial<ProductProject> & { id?: string }) {
  return createBlankProject();
}

export function deleteProject(id: string) {}

export async function generateProductAnalysis(input: ProductProject) {
  try {
    const { api } = await import("@/lib/api");
    const chatId = getActiveChatId();
    if (!chatId) throw new Error("No active chat");
    const resp = await api.post(`/api/chats/${chatId}/product-analysis/run`, input);
    return resp.data;
  } catch {
    return null;
  }
}

export function saveModuleResult(module: string, result: any) {}
