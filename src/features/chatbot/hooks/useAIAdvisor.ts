import { useState, useCallback, useRef, useEffect } from 'react';
import { useIsMounted } from '../../../hooks/useIsMounted';
import { askGemini, getGeminiErrorMessage } from '../../../core/gemini';
import type { ChatMessage } from '@/types';
import { toast } from '../../../toast';
import { useI18n } from '../../../i18n/index';
import { useSettingsStore } from '../../../store/settingsStore';
import { secureGet, secureSet } from '../../../core/secureStore';

export function useAIAdvisor() {
  const { t } = useI18n();
  const isMounted = useIsMounted();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync ref with state to avoid stale closures in callbacks without triggering re-renders
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const sendMessage = useCallback(async (userMessage: string) => {
    const { aiPremiumUntil } = useSettingsStore.getState();
    const isPremium = aiPremiumUntil > Date.now();
    
    // Check usage if not premium
    if (!isPremium) {
      const today = new Date().toISOString().split('T')[0];
      const usageKey = `ai_usage_${today}`;
      const rawCount = await secureGet(usageKey);
      const count = Number(rawCount || 0);
      
      if (count >= 10) {
        toast(t('chat.limitReached') || 'Daily limit reached (10 messages). Upgrade to AI Pro in the Shop for unlimited chat!', 'warning');
        const win = window as Window & { showShop?: () => void };
        if (win.showShop) win.showShop();
        return;
      }
      
      await secureSet(usageKey, String(count + 1));
    }

    if (isMounted.current) {
      setIsLoading(true);
      setError(null);
    }

    const userMsg: ChatMessage = {
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };
    
    // Add user message to state immediately
    if (isMounted.current) {
      setMessages(prev => [...prev, userMsg]);
    }

    try {
      // Current messages array
      const history = messagesRef.current;
      
      const result = await askGemini(userMessage, history);
      
      if (!isMounted.current) return;

      if (result.error) {
        const errMsg = getGeminiErrorMessage(result.error, result.debug);
        setError(errMsg);
        toast(errMsg, 'error');
        setMessages(prev => [...prev, {
          role: 'system',
          content: `❌ ${errMsg}`,
          timestamp: Date.now(),
        }]);
      } else {
        // Stream simulation for better UX with performance-optimized chunk batching
        const fullText = result.text || '';
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
        };
        
        setMessages(prev => [...prev, assistantMsg]);
        
        let currentText = '';
        const chunks = fullText.split(/([ \n])/); // Split by words/spaces
        const BATCH_SIZE = 4;
        
        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
          if (!isMounted.current) break;
          const batch = chunks.slice(i, i + BATCH_SIZE).join('');
          currentText += batch;
          
          if (isMounted.current) {
            setMessages(prev => {
              const newArr = [...prev];
              newArr[newArr.length - 1] = { ...assistantMsg, content: currentText };
              return newArr;
            });
          }
          // Smooth delay to simulate streaming with minimal re-render churn (25ms)
          await new Promise(r => setTimeout(r, 25));
        }
      }
    } catch (err: unknown) {
      if (!isMounted.current) return;
      const errorObj = err as { name?: string; message?: string };
      if (errorObj.name !== 'AbortError') {
        const msg = errorObj.message || String(err);
        setError(msg);
        toast(msg, 'error');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [t, isMounted]);

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isLoading, error, sendMessage, clear };
}
