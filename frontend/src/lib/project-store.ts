
function getActiveChatId() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("selectedChatId");
}

function setActiveChatId(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("selectedChatId", id);
  window.dispatchEvent(new Event("marketform-chat-change"));
}

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

export function generateProductAnalysis(input: ProductProject) {
  return null;
}

export function saveModuleResult(module: string, result: any) {}
