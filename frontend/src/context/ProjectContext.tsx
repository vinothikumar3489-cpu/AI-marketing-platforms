import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import { normalizeFullResults } from '../lib/normalizers';
import { useAuth } from './AuthContext';

type ProjectCtx = {
  chats: any[];
  selectedChatId: string;
  fullResults: any;
  loading: boolean;
  refreshChats: () => Promise<void>;
  selectChat: (id: string) => Promise<void>;
  clearSelection: () => void;
  loadFullResults: (id?: string) => Promise<any>;
  createChat: (title: string) => Promise<string>;
  deleteChat: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
};
const ProjectContext = createContext<ProjectCtx | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChatId, setSelectedChatId] = useState(localStorage.getItem('selectedChatId') || '');
  const [fullResults, setFullResults] = useState<any>({ growth: null, seo: null, executive: null, profile: null, chat: null });
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const createChatInFlightRef = useRef(false);
  const createChatPromiseRef = useRef<Promise<string> | null>(null);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  async function refreshChats() {
    if (!user) return;
    setLoading(true);
    try {
      const res: any = await api.get('/chats');
      if (!mountedRef.current) return;
      const list = res.chats || res.data || res || [];
      setChats(Array.isArray(list) ? list : []);
      const exists = list.some((c: any) => c.id === selectedChatId);
      if (selectedChatId && !exists) {
        localStorage.removeItem('selectedChatId');
        setSelectedChatId('');
        setFullResults({ growth: null, seo: null, executive: null, profile: null, chat: null });
      }
    } finally { if (mountedRef.current) setLoading(false); }
  }

  async function selectChat(id: string) {
    if (!id) {
      console.warn('selectChat called with empty ID');
      return;
    }
    
    console.log('');
    console.log('[ProjectContext selectChat]');
    console.log('selectedChatId:', id);
    console.log('previousSelectedChatId:', selectedChatId);
    console.log('isSwitch:', id !== selectedChatId);
    
    // Only clear results if switching to a different chat
    if (id !== selectedChatId) {
      console.log('[ProjectContext] Clearing results for chat switch');
      setFullResults({ growth: null, seo: null, executive: null, profile: null, chat: null });
    }
    
    setSelectedChatId(id);
    localStorage.setItem('selectedChatId', id);
    
    // Load results for the selected chat
    await loadFullResults(id);
    console.log('[ProjectContext selectChat complete] chatId:', id);
  }

  async function loadFullResults(id = selectedChatId) {
    if (!id) {
      return { growth: null, seo: null, executive: null, profile: null, chat: null };
    }
    
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    
    setLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!mountedRef.current || signal.aborted) return { growth: null, seo: null, executive: null, profile: null, chat: null };
      
      const res: any = await api.get(`/chats/${id}/full-results`, signal);
      if (!mountedRef.current || signal.aborted) return { growth: null, seo: null, executive: null, profile: null, chat: null };
      
      const normalized = normalizeFullResults(res);

      setFullResults(normalized);
      return normalized;
    } catch (error: any) {
      if (error.name === 'AbortError') return { growth: null, seo: null, executive: null, profile: null, chat: null };
      console.error('Failed to load full results:', error.message || error);
      
      const emptyResults = { growth: null, seo: null, executive: null, profile: null, chat: null };
      
      if (error.response?.status === 404) {
        if (mountedRef.current) setFullResults(emptyResults);
      }
      
      return emptyResults;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  async function createChat(title: string) {
    if (createChatInFlightRef.current && createChatPromiseRef.current) {
      console.info('[ProjectContext createChat] request already in-flight, reusing existing promise', { title });
      return createChatPromiseRef.current;
    }

    createChatInFlightRef.current = true;
    const promise = (async () => {
      console.info('[ProjectContext createChat requested]', { title, selectedChatId, pending: createChatInFlightRef.current });
      const res: any = await api.post('/chats', { title: title || 'New Product Analysis' });
      const chat = res.chat || res.data || res;
      const id = chat.id;
      
      if (!id) {
        throw new Error('Failed to create chat: No chat ID returned');
      }
      
      console.log('');
      console.log('[ProjectContext createChat]');
      console.log('chatId:', id);
      console.log('previousSelectedChatId:', selectedChatId);
      console.log('');
      
      // IMMEDIATELY set the selected chat ID - don't wait for refresh
      setSelectedChatId(id);
      localStorage.setItem('selectedChatId', id);
      
      // Clear results while new chat is being created
      setFullResults({ growth: null, seo: null, executive: null, profile: null, chat: null });
      
      // Refresh chat list in background (non-blocking)
      refreshChats().catch(err => console.warn('Chat refresh failed:', err));
      
      return id;
    })();

    createChatPromiseRef.current = promise;

    try {
      return await promise;
    } finally {
      createChatInFlightRef.current = false;
      createChatPromiseRef.current = null;
    }
  }

  function clearSelection() {
    setSelectedChatId('');
    localStorage.removeItem('selectedChatId');
    setFullResults({ growth: null, seo: null, executive: null, profile: null, chat: null });
  }

  async function deleteChat(id: string) {
    if (!id) {
      console.warn('deleteChat called with empty ID');
      return;
    }

    console.log('🗑️ [ProjectContext] Deleting chat:', id);

    try {
      await api.del(`/chats/${id}`);
      console.log('✅ [ProjectContext] Chat deleted successfully:', id);

      // If the deleted chat was selected, clear selection
      if (selectedChatId === id) {
        clearSelection();
      }

      // Refresh chat list
      await refreshChats();
    } catch (error: any) {
      console.error('❌ [ProjectContext] Failed to delete chat:', error.message || error);
      throw error;
    }
  }

  async function clearHistory() {
    console.log('🗑️ [ProjectContext] Clearing all chat history');

    try {
      await api.del('/chats/clear-history');
      console.log('✅ [ProjectContext] All chat history cleared successfully');

      // Clear selection and refresh
      clearSelection();
      await refreshChats();
    } catch (error: any) {
      console.error('❌ [ProjectContext] Failed to clear history:', error.message || error);
      throw error;
    }
  }

  useEffect(() => {
    if (!user) {
      setChats([]);
      setSelectedChatId('');
      setFullResults({ growth: null, seo: null, executive: null, profile: null, chat: null });
      return;
    }
    refreshChats();
  }, [user]);
  useEffect(() => { if (user && selectedChatId) loadFullResults(selectedChatId).catch((e) => console.warn('Initial full results load failed:', e)); }, [user, selectedChatId]);

  const value = useMemo(() => ({ chats, selectedChatId, fullResults, loading, refreshChats, selectChat, clearSelection, loadFullResults, createChat, deleteChat, clearHistory }), [chats, selectedChatId, fullResults, loading]);
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export const useProject = () => {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used inside ProjectProvider');
  return ctx;
};
