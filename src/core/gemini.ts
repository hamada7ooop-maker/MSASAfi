// ============================================
// مصاريفي — AI Financial Advisor
// Primary: Gemini 1.5 Flash | Fallback: Groq
// ============================================

import { db as DB } from './db/core';
import { t } from '../i18n/engine';
import { silentFail } from './utils';
import type { ChatMessage } from '@/types';
import {
  getActiveProviderName, getGeminiKey, getGroqKey, saveGeminiKey, saveGroqKey,
  hasGeminiKey, hasGroqKey, hasCustomKey, hasPuterKey, savePuterKey, hasAnyKey,
  removeGeminiKey, removeGroqKey, removeCustomKey, removePuterKey,
  getConnectedProviders,
} from './ai/providerKeys';
import type { CustomAIConfig } from './ai/providerKeys';
import { buildFinancialContext } from './ai/contextBuilder';
import { callGemini, callGroq, callCustom, callFreeAI } from './ai/providers';
import type { AIResponse } from './ai/providers';
import {
  isRateLimited, markRequestStart, beginRequest, endRequest,
  sanitizeUserMessage,
} from './ai/rateLimiter';

/**
 * Public surface preserved after the L-1 split.
 *
 * The key/provider, context-building and throttling concerns now live in
 * `core/ai/`. They are re-exported here so the three existing call sites in
 * `features/chatbot` keep importing from one place -- the split is internal
 * and must not ripple into feature code.
 */
export {
  getActiveProviderName, getGeminiKey, getGroqKey, saveGeminiKey, saveGroqKey,
  hasGeminiKey, hasGroqKey, hasCustomKey, hasPuterKey, savePuterKey, hasAnyKey,
  removeGeminiKey, removeGroqKey, removeCustomKey, removePuterKey,
  getConnectedProviders, sanitizeUserMessage,
};
export type { CustomAIConfig } from './ai/providerKeys';
export type { AIResponse } from './ai/providers';





export async function askGemini(userMessage: string, conversationHistory: ChatMessage[] = []): Promise<AIResponse> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { error: 'network_error', debug: 'No internet connection' };
  }

  const sanitizedMessage = sanitizeUserMessage(userMessage);
  if (!sanitizedMessage) {
    return { error: 'empty_response', debug: 'Message was empty or blocked by security filters.' };
  }

  if (isRateLimited()) {
    return { error: 'rate_limit', debug: 'Please wait a moment before sending another message.' };
  }
  markRequestStart();

  const signal = beginRequest();

  const [geminiKey, groqKey, customConfigStr, puterKey] = await Promise.all([
    getGeminiKey(),
    getGroqKey(),
    DB.getSetting('customAiConfig') as Promise<string | undefined>,
    hasPuterKey()
  ]);

  if (!geminiKey && !groqKey && !customConfigStr && !puterKey) return { error: 'no_api_key' };

  const systemCtx = await buildFinancialContext();

  if (puterKey) {
    try {
      const result = await Promise.race([
        callFreeAI(sanitizedMessage, conversationHistory, systemCtx, signal),
        new Promise<AIResponse>((_, r) => setTimeout(() => r({ error: 'timeout' }), 30000)),
      ]);
      if (result.text || result.error) {
        endRequest();
        return result;
      }
    } catch (err: unknown) {
      const errorObj = err as { name?: string };
      if (errorObj.name === 'AbortError') return { error: 'aborted' };
      silentFail('Free AI timeout/error')(err);
    }
  }

  if (geminiKey) {
    try {
      const result = await Promise.race([
        callGemini(sanitizedMessage, conversationHistory, systemCtx, geminiKey, signal),
        new Promise<AIResponse>((_, r) => setTimeout(() => r(new Error('timeout')), 20000)),
      ]);
      if (result.text) {
        endRequest();
        return result;
      }
    } catch (err: unknown) {
      const errorObj = err as { name?: string };
      if (errorObj.name === 'AbortError') return { error: 'aborted' };
    }
  }

  if (groqKey) {
    try {
      const result = await Promise.race([
        callGroq(sanitizedMessage, conversationHistory, systemCtx, groqKey, signal),
        new Promise<AIResponse>((_, r) => setTimeout(() => r(new Error('timeout')), 20000)),
      ]);
      if (result.text) {
        endRequest();
        return result;
      }
    } catch (err: unknown) {
      const errorObj = err as { name?: string };
      if (errorObj.name === 'AbortError') return { error: 'aborted' };
    }
  }

  if (customConfigStr) {
    try {
      const config = JSON.parse(customConfigStr) as CustomAIConfig;
      if (config.url && config.key) {
        const result = await Promise.race([
          callCustom(sanitizedMessage, conversationHistory, systemCtx, config, signal),
          new Promise<AIResponse>((_, r) => setTimeout(() => r(new Error('timeout')), 20000)),
        ]);
        if (result.text) {
          endRequest();
          return result;
        }
      }
    } catch (err: unknown) {
      const errorObj = err as { name?: string };
      if (errorObj.name === 'AbortError') return { error: 'aborted' };
    }
  }

  endRequest();
  return { error: 'network_error' };
}

export function getGeminiErrorMessage(errorCode: string, debug: string = ''): string {
  const debugStr = debug ? `: ${debug}` : '';
  const msg = t(`chat.error.${errorCode}`, { debug: debugStr });
  if (msg === `chat.error.${errorCode}`) return t('chat.error.generic', { debug: debug || errorCode });
  return msg;
}
