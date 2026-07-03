import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for persisting form state to localStorage with auto-save
 * @param key - localStorage key
 * @param defaultValue - Default form values
 * @param autoSaveDelay - Debounce delay for auto-save (ms)
 */
export function useFormPersistence<T>(
  key: string,
  defaultValue: T,
  autoSaveDelay: number = 1000
) {
  // Initialize state from localStorage or default
  const [form, setForm] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log(`📂 Restored draft from localStorage: ${key}`);
        return { ...defaultValue, ...parsed };
      }
    } catch (error) {
      console.error('Failed to restore draft:', error);
    }
    return defaultValue;
  });

  const [saveTimeout, setSaveTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Auto-save to localStorage with debounce
  useEffect(() => {
    if (!isDirty) return;

    // Clear existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    // Set new timeout for auto-save
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(form));
        console.log(`💾 Auto-saved draft: ${key}`);
        setIsDirty(false);
      } catch (error) {
        console.error('Failed to save draft:', error);
      }
    }, autoSaveDelay);

    setSaveTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [form, key, autoSaveDelay, isDirty]);

  // Update form and mark as dirty
  const updateForm = useCallback((updates: Partial<T> | ((prev: T) => T)) => {
    setForm((prev) => {
      const next = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates };
      setIsDirty(true);
      return next;
    });
  }, []);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(key);
      console.log(`🗑️ Cleared draft: ${key}`);
      setForm(defaultValue);
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  }, [key, defaultValue]);

  // Force immediate save
  const saveDraft = useCallback(() => {
    try {
      localStorage.setItem(key, JSON.stringify(form));
      console.log(`💾 Force-saved draft: ${key}`);
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  }, [key, form]);

  // Check if draft exists
  const hasDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved !== null;
    } catch {
      return false;
    }
  }, [key]);

  return {
    form,
    updateForm,
    clearDraft,
    saveDraft,
    hasDraft,
    isDirty,
    setForm,
  };
}
