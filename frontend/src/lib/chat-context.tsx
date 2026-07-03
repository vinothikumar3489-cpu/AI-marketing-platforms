
import React, { createContext, useContext, useEffect, useState } from "react";
import { fetchFullChat, getActiveChatId } from "@/lib/chat-store";
import type { FullChatData } from "@/lib/chat-store";

type ChatContextType = {
  fullChat: FullChatData | null;
  setFullChat: React.Dispatch<React.SetStateAction<FullChatData | null>>;
  loading: boolean;
  refresh: () => Promise<void>;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [fullChat, setFullChat] = useState<FullChatData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const chatId = getActiveChatId();
    if (!chatId) {
      setFullChat(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchFullChat(chatId);
      setFullChat(data);
    } catch (e) {
      console.error("Failed to refresh chat data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    window.addEventListener("marketform-chat-change", refresh);
    return () => window.removeEventListener("marketform-chat-change", refresh);
  }, []);

  return (
    <ChatContext.Provider value={{ fullChat, setFullChat, loading, refresh }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
}
