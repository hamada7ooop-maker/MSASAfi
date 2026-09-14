import { db as DB } from '../db/core';
import { silentFail } from '../utils';
import type { ChatMessage } from '@/types';
import type { CustomAIConfig } from './providerKeys';

/**
 * Transport for every AI provider: Gemini, Groq, a user-supplied endpoint and
 * the free-endpoint fallback chain.
 *
 * Extracted from core/gemini.ts as part of L-1. Everything here is request
 * plumbing -- URL shapes, payload formats, status mapping and timeouts. It
 * holds no policy: which provider to use is decided in `providerKeys.ts`, what
 * to send is decided in `contextBuilder.ts`, and whether to send at all is
 * decided in `rateLimiter.ts`.
 */

export interface AIResponse {
  text?: string;
  provider?: string;
  error?: string;
  debug?: string;
}

export interface FetchResult {
  status: number;
  data?: Record<string, unknown> | unknown[] | string;
  error?: string;
}

export interface FetchOptions extends RequestInit {
  timeout?: number;
}

const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1/models';
const GROQ_MODEL = 'llama-3.1-8b-instant';
const GROQ_API_BASE = 'https://api.groq.com/openai/v1/chat/completions';
// ─── Financial Context Builder ───────────────────────────────────────────────

async function doFetch(url: string, options: FetchOptions = {}): Promise<FetchResult> {
  let controller: AbortController | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  if (options.timeout) {
    controller = new AbortController();
    options.signal = controller.signal;
    timeoutId = setTimeout(() => controller?.abort(), options.timeout);
    delete options.timeout;
  }

  try {
    const res = await fetch(url, options);
    if (timeoutId) clearTimeout(timeoutId);
    
    let data: Record<string, unknown> | unknown[] | string = {};
    const textRes = await res.text();
    try { 
      data = JSON.parse(textRes) as Record<string, unknown> | unknown[]; 
    } catch (_) {
      data = textRes; // Fallback to raw text
    }
    return { status: res.status, data };
  } catch (err: unknown) {
    if (timeoutId) clearTimeout(timeoutId);
    const errorObj = err as { name?: string; message?: string };
    return { status: 0, error: errorObj.name === 'AbortError' ? 'timeout' : errorObj.message };
  }
}

// ─── Gemini API ───────────────────────────────────────────────────────────────

interface GeminiCandidate {
  content?: {
    parts?: Array<{ text?: string }>;
  };
}

interface GeminiResponseData {
  candidates?: GeminiCandidate[];
  error?: {
    message?: string;
  };
}

export async function callGemini(
  userMessage: string,
  history: ChatMessage[],
  systemCtx: string,
  apiKey: string,
  signal: AbortSignal | null = null
): Promise<AIResponse> {
  const customEndpoint = (await DB.getSetting('geminiApiEndpoint')) as string | undefined;
  const apiBase = customEndpoint || GEMINI_API_BASE;
  
  const contents = [
    { role: 'user', parts: [{ text: "SYSTEM INSTRUCTIONS: " + systemCtx }] },
    { role: 'model', parts: [{ text: "Understood. I am your Masarifi AI advisor." }] }
  ];
  
  for (const m of history.slice(-6)) {
    contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] });
  }
  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  const { status, data } = await doFetch(
    `${apiBase}/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
      timeout: 15000,
      signal: signal || undefined
    }
  );

  const geminiData = data as GeminiResponseData | undefined;

  if (status === 0) return { error: 'network_error' };
  if (status === 429) return { error: 'rate_limit' };
  if (status >= 400) return { error: 'api_error', debug: `${status}: ${geminiData?.error?.message || 'Error'}` };

  const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return { error: 'empty_response' };
  return { text, provider: 'Gemini' };
}

// ─── Groq API ─────────────────────────────────────────────────────────────────

interface GroqChoice {
  message?: {
    content?: string;
  };
}

interface GroqResponseData {
  choices?: GroqChoice[];
  error?: {
    message?: string;
  };
}

export async function callGroq(
  userMessage: string,
  history: ChatMessage[],
  systemCtx: string,
  apiKey: string,
  signal: AbortSignal | null = null
): Promise<AIResponse> {
  const customEndpoint = (await DB.getSetting('groqApiEndpoint')) as string | undefined;
  const apiBase = customEndpoint || GROQ_API_BASE;

  const messages = [{ role: 'system', content: systemCtx }];
  for (const m of history.slice(-6)) {
    messages.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content });
  }
  messages.push({ role: 'user', content: userMessage });

  const { status, data } = await doFetch(apiBase, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    }),
    timeout: 15000,
    signal: signal || undefined
  });

  const groqData = data as GroqResponseData | undefined;

  if (status === 429) return { error: 'rate_limit' };
  if (status >= 400) return { error: 'api_error', debug: `${status}` };

  const text = groqData?.choices?.[0]?.message?.content;
  if (!text) return { error: 'empty_response' };
  return { text, provider: 'Groq' };
}

export async function callCustom(
  userMessage: string,
  history: ChatMessage[],
  systemCtx: string,
  config: CustomAIConfig,
  signal: AbortSignal | null = null
): Promise<AIResponse> {
  const { url, key, model } = config;
  const messages = [{ role: 'system', content: systemCtx }];
  for (const m of history.slice(-6)) {
    messages.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content });
  }
  messages.push({ role: 'user', content: userMessage });

  const { status, data } = await doFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-3.5-turbo',
      messages,
      max_tokens: 400,
      temperature: 0.7,
    }),
    timeout: 15000,
    signal: signal || undefined
  });

  const customData = data as GroqResponseData | undefined;

  if (status >= 400) return { error: 'api_error', debug: `${status}` };
  const text = customData?.choices?.[0]?.message?.content;
  if (!text) return { error: 'empty_response' };
  return { text, provider: 'Custom' };
}

// ─── Free AI: Pollinations API ──────────────────────────────────────────────

const FREE_AI_ENDPOINTS = [
  { name: 'Pollinations', url: 'https://text.pollinations.ai/openai' },
  { name: 'Pollinations-v1', url: 'https://gen.pollinations.ai/v1/chat/completions' },
];

export async function callFreeAI(
  userMessage: string,
  history: ChatMessage[],
  systemCtx: string,
  signal: AbortSignal | null = null
): Promise<AIResponse> {
  const messages = [{ role: 'system', content: systemCtx }];
  for (const m of history.slice(-6)) {
    messages.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content });
  }
  messages.push({ role: 'user', content: userMessage });

  // Step 1: Try Puter Token if available
  const puterToken = (await DB.getSetting('puterAuthToken')) as string | undefined;
  if (puterToken) {
    try {
      const res = await doFetch('https://api.puter.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${puterToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          max_tokens: 300,
          temperature: 0.6
        }),
        timeout: 8000,
        signal: signal || undefined
      });
      
      const puterData = res.data as GroqResponseData | undefined;
      const text = puterData?.choices?.[0]?.message?.content;
      if (res.status < 400 && text) {
        return { text, provider: 'Free AI (Puter)' };
      }
      silentFail('[FreeAI] Puter Token invalid or timed out')(new Error(String(res.error || res.status)));
    } catch (err: unknown) {
      silentFail('[FreeAI] Puter Token failed')(err);
    }
  }

  // Step 2: Try Pollinations endpoints
  for (const endpoint of FREE_AI_ENDPOINTS) {
    try {
      const { status, data, error } = await doFetch(endpoint.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai',
          messages,
          max_tokens: 300,
          temperature: 0.6,
        }),
        timeout: 12000,
        signal: signal || undefined
      });

      if (error === 'timeout' || status >= 400) {
        silentFail(`[FreeAI] ${endpoint.name} failed/timeout`)(new Error(String(error || status)));
        continue;
      }

      const pollData = data as GroqResponseData | undefined;
      const text = pollData?.choices?.[0]?.message?.content;
      if (text) {
        return { text, provider: 'Free AI' };
      }
      silentFail(`[FreeAI] ${endpoint.name} empty response`)(new Error('empty response'));
    } catch (err: unknown) {
      silentFail(`[FreeAI] ${endpoint.name} exception`)(err);
    }
  }

  // Step 3: All free endpoints failed
  silentFail('[FreeAI] All endpoints failed')(new Error('All endpoints failed'));
  return { error: 'api_error', debug: 'All free AI endpoints unreachable' };
}
