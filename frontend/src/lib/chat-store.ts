
import { api } from "./api";

export type ChatProject = {
  id: string;
  title: string;
  productName?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
};

export type FullChatData = {
  chat: ChatProject;
  productAnalysis?: any;
  marketDiscovery?: any;
  competitorAnalysis?: any;
  seoAnalysis?: any;
  campaignGenerator?: any;
  audienceIntelligence?: any;
  assistantMessages?: any[];
};

const ACTIVE_KEY = "marketform_active_chat_id";

export function getActiveChatId() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveChatId(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_KEY, id);
  window.dispatchEvent(new Event("marketform-chat-change"));
}

export async function fetchChats(): Promise<ChatProject[]> {
  try {
    const res = await api.get("/api/chats");
    return res.data || [];
  } catch (e) {
    console.error("Failed to fetch chats", e);
    return [];
  }
}

export async function fetchFullChat(chatId: string): Promise<FullChatData | null> {
  try {
    const res = await api.get(`/api/chats/${chatId}/full`);
    return res.data || null;
  } catch (e) {
    console.error("Failed to fetch full chat", e);
    return null;
  }
}

export async function createChat(title: string, productName?: string): Promise<ChatProject> {
  const res = await api.post("/api/chats", { title, productName: productName || title });
  return res.data;
}

export async function updateChat(chatId: string, title: string, productName?: string): Promise<ChatProject> {
  const res = await api.put(`/api/chats/${chatId}`, { title, productName: productName || title });
  return res.data;
}

export async function deleteChat(chatId: string): Promise<void> {
  await api.delete(`/api/chats/${chatId}`);
}
