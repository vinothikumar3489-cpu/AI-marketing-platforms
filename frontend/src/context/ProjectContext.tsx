import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import { normalizeFullResults } from '../lib/normalizers';
import { useAuth } from './AuthContext';

type CreateChatReason = 'USER_CLICK_NEW_ANALYSIS' | 'USER_CLICK_PROJECT_DROPDOWN' | 'FIRST_ACCOUNT_BOOTSTRAP' | 'ANALYSIS_RUN_NO_CHAT';
const VALID_CREATE_REASONS: readonly CreateChatReason[] = ['USER_CLICK_NEW_ANALYSIS', 'USER_CLICK_PROJECT_DROPDOWN', 'FIRST_ACCOUNT_BOOTSTRAP', 'ANALYSIS_RUN_NO_CHAT'];

type ProjectCtx = {
  chats: any[];
  selectedChatId: string;
  fullResults: any;
  loading: boolean;
  chatsLoaded: boolean;
  refreshChats: () => Promise<void>;
  selectChat: (id: string) => Promise<void>;
  clearSelection: () => void;
  loadFullResults: (id?: string) => Promise<any>;
  createChat: (title: string, reason: CreateChatReason) => Promise<string>;
  deleteChat: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
};
const ProjectContext = createContext<ProjectCtx | null>(null);

const EMPTY_FULL_RESULTS = { growth: null, seo: null, executive: null, profile: null, chat: null };

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChatId, setSelectedChatId] = useState(localStorage.getItem('selectedChatId') || '');
  const [fullResults, setFullResults] = useState<any>(EMPTY_FULL_RESULTS);
  const [loading, setLoading] = useState(false);
  const [chatsLoaded, setChatsLoaded] = useState(false);
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const createChatInFlightRef = useRef(false);
  const createChatPromiseRef = useRef<Promise<string> | null>(null);
  const bootstrapAttemptedRef = useRef(false);
  const selectedChatIdRef = useRef(selectedChatId);
  selectedChatIdRef.current = selectedChatId;
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const refreshChats = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res: any = await api.get('/chats');
      if (!mountedRef.current) return;
      const list = res.chats || res.data || res || [];
      const chatArray = Array.isArray(list) ? list : [];
      setChats(chatArray);
      setChatsLoaded(true);
      const currentId = selectedChatIdRef.current;
      const exists = chatArray.some((c: any) => c.id === currentId);
      if (currentId && !exists) {
        localStorage.removeItem('selectedChatId');
        setSelectedChatId('');
        setFullResults(EMPTY_FULL_RESULTS);
      }
    } finally { if (mountedRef.current) setLoading(false); }
  }, [user]);

  const loadFullResults = useCallback(async (id?: string) => {
    const chatId = id || selectedChatIdRef.current;
    if (!chatId) return EMPTY_FULL_RESULTS;
    
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    
    setLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!mountedRef.current || signal.aborted) return EMPTY_FULL_RESULTS;
      
      const res: any = await api.get(`/chats/${chatId}/full-results`, signal);
      if (!mountedRef.current || signal.aborted) return EMPTY_FULL_RESULTS;
      
      const normalized = normalizeFullResults(res);
      if (mountedRef.current) setFullResults(normalized);
      return normalized;
    } catch (error: any) {
      if (error.name === 'AbortError') return EMPTY_FULL_RESULTS;
      console.error('Failed to load full results:', error.message || error);
      
      if (error.response?.status === 404 && mountedRef.current) {
        setFullResults(EMPTY_FULL_RESULTS);
      }
      
      return EMPTY_FULL_RESULTS;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const selectChat = useCallback(async (id: string) => {
    if (!id) {
      console.warn('selectChat called with empty ID');
      return;
    }
    
    const prevId = selectedChatIdRef.current;
    if (id !== prevId) setFullResults(EMPTY_FULL_RESULTS);
    
    setSelectedChatId(id);
    localStorage.setItem('selectedChatId', id);
    
    await loadFullResults(id);
  }, [loadFullResults]);

  const createChat = useCallback(async (title: string, reason: CreateChatReason) => {
    if (!VALID_CREATE_REASONS.includes(reason)) {
      console.error('[ProjectContext] createChat called with invalid reason:', reason, { title, selectedChatId: selectedChatIdRef.current, chats });
      throw new Error(`Invalid createChat reason: ${reason}. Allowed: ${VALID_CREATE_REASONS.join(', ')}`);
    }

    if (createChatInFlightRef.current && createChatPromiseRef.current) {
      return createChatPromiseRef.current;
    }

    createChatInFlightRef.current = true;
    const promise = (async () => {
      const res: any = await api.post('/chats', { title: title || 'New Product Analysis' });
      const chat = res.chat || res.data || res;
      const id = chat.id;
      if (!id) throw new Error('Failed to create chat: No chat ID returned');
      
      setSelectedChatId(id);
      localStorage.setItem('selectedChatId', id);
      setFullResults(EMPTY_FULL_RESULTS);
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
  }, [refreshChats]);

  const clearSelection = useCallback(() => {
    setSelectedChatId('');
    localStorage.removeItem('selectedChatId');
    setFullResults(EMPTY_FULL_RESULTS);
  }, []);

  const deleteChat = useCallback(async (id: string) => {
    if (!id) return;
    try {
      await api.del(`/chats/${id}`);
      if (selectedChatIdRef.current === id) clearSelection();
      await refreshChats();
    } catch (error: any) {
      console.error('Failed to delete chat:', error.message || error);
      throw error;
    }
  }, [refreshChats, clearSelection]);

  const clearHistory = useCallback(async () => {
    try {
      await api.del('/chats/clear-history');
      clearSelection();
      await refreshChats();
    } catch (error: any) {
      console.error('Failed to clear history:', error.message || error);
      throw error;
    }
  }, [refreshChats, clearSelection]);

  useEffect(() => {
    if (!user) {
      setChats([]);
      setChatsLoaded(false);
      setSelectedChatId('');
      setFullResults(EMPTY_FULL_RESULTS);
      return;
    }
    refreshChats();
  }, [user, refreshChats]);

  const hasSelectedChat = Boolean(selectedChatId);
  const hasZeroChats = chatsLoaded && chats.length === 0;

  useEffect(() => {
    if (!user) return;
    if (!chatsLoaded) return;
    if (bootstrapAttemptedRef.current) return;
    if (!hasZeroChats) return;
    if (hasSelectedChat) return;
    if (createChatInFlightRef.current) return;

    bootstrapAttemptedRef.current = true;
    createChat('New Analysis', 'FIRST_ACCOUNT_BOOTSTRAP').catch(err => {
      console.warn('[ProjectContext] first-account bootstrap chat creation failed:', err);
      bootstrapAttemptedRef.current = false;
    });
  }, [user, chatsLoaded, hasZeroChats, hasSelectedChat, createChat]);

  const value = useMemo(() => ({
    chats, selectedChatId, fullResults, loading, chatsLoaded,
    refreshChats, selectChat, clearSelection, loadFullResults,
    createChat, deleteChat, clearHistory,
  }), [chats, selectedChatId, fullResults, loading, chatsLoaded,
      refreshChats, selectChat, clearSelection, loadFullResults,
      createChat, deleteChat, clearHistory]);

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export const useProject = () => {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used inside ProjectProvider');
  return ctx;
};