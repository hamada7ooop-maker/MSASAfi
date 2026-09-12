// ============================================
// مصاريفي — AI Financial Advisor
// Primary: Gemini 1.5 Flash | Fallback: Groq
// ============================================

import { db as DB } from './db/core';
import { fmt, getMonthName, silentFail } from './utils';
import { t, LANGUAGE_META } from '../i18n/engine';
import { CURRENCIES } from './currency';
import { CATEGORY_MAP } from './categoryUtils';
import { useSettingsStore } from '../store/settingsStore';
import { secureGet, secureSet, secureRemove } from './secureStore';
import { TransactionRepository } from './db/repositories/transactions';
import { BudgetRepository } from './db/repositories/budgets';
import { GoalRepository } from './db/repositories/goals';
import { DebtRepository } from './db/repositories/debts';
import { AccountRepository } from './db/repositories/accounts';
import { StatisticsService, calculateFinancialScore } from './services/StatisticsService';
import type { ChatMessage } from '@/types';

export interface AIResponse {
  text?: string;
  provider?: string;
  error?: string;
  debug?: string;
}

export interface CustomAIConfig {
  url: string;
  key: string;
  model?: string;
}

const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1/models';
const GROQ_MODEL = 'llama-3.1-8b-instant';
const GROQ_API_BASE = 'https://api.groq.com/openai/v1/chat/completions';

export async function getActiveProviderName(): Promise<string> {
  const [gemini, groq, custom, freeAi] = await Promise.all([
    getGeminiKey(),
    getGroqKey(),
    DB.getSetting('customAiConfig'),
    hasPuterKey()
  ]);
  if (freeAi) return 'Free AI';
  if (gemini) return 'Gemini';
  if (groq) return 'Groq';
  if (custom) return 'Custom';
  return '';
}

// ─── Key Management ──────────────────────────────────────────────────────────

export async function getGeminiKey(): Promise<string | null> {
  return await secureGet('geminiApiKey');
}

export async function getGroqKey(): Promise<string | null> {
  return await secureGet('groqApiKey');
}

export async function saveGeminiKey(key: string, endpoint: string | null = null): Promise<boolean> {
  if (!key || key.trim().length < 4) return false;
  const saved = await secureSet('geminiApiKey', key.trim());
  if (saved && endpoint) await DB.setSetting('geminiApiEndpoint', endpoint.trim());
  return saved;
}

export async function saveGroqKey(key: string, endpoint: string | null = null): Promise<boolean> {
  if (!key || key.trim().length < 4) return false;
  const saved = await secureSet('groqApiKey', key.trim());
  if (saved && endpoint) await DB.setSetting('groqApiEndpoint', endpoint.trim());
  return saved;
}

export async function hasGeminiKey(): Promise<boolean> {
  const k = await getGeminiKey();
  return !!(k && k.length >= 4);
}

export async function hasGroqKey(): Promise<boolean> {
  const k = await getGroqKey();
  return !!(k && k.length >= 4);
}

export async function hasCustomKey(): Promise<boolean> {
  const c = (await DB.getSetting('customAiConfig')) as string | undefined;
  if (!c) return false;
  try {
    const p = JSON.parse(c) as CustomAIConfig;
    return !!(p.url && p.key);
  } catch (_) {
    return false;
  }
}

export async function hasPuterKey(): Promise<boolean> {
  return (await DB.getSetting('usePuter')) === true;
}

export async function savePuterKey(): Promise<boolean> {
  await DB.setSetting('usePuter', true);
  return true;
}

export async function hasAnyKey(): Promise<boolean> {
  const [g, gr, c, p] = await Promise.all([hasGeminiKey(), hasGroqKey(), hasCustomKey(), hasPuterKey()]);
  return !!(g || gr || c || p);
}

export async function removeGeminiKey(): Promise<void> {
  await secureRemove('geminiApiKey');
  await DB.setSetting('geminiApiEndpoint', null);
}

export async function removeGroqKey(): Promise<void> {
  await secureRemove('groqApiKey');
  await DB.setSetting('groqApiEndpoint', null);
}

export async function removeCustomKey(): Promise<void> {
  await secureRemove('customAiConfig');
}

export async function removePuterKey(): Promise<void> {
  await DB.setSetting('usePuter', false);
}

export async function getConnectedProviders(): Promise<string[]> {
  const [g, gr, c, p] = await Promise.all([hasGeminiKey(), hasGroqKey(), hasCustomKey(), hasPuterKey()]);
  const list: string[] = [];
  if (p) list.push('Free AI');
  if (g) list.push('Gemini');
  if (gr) list.push('Groq');
  if (c) list.push('Custom');
  return list;
}

// ─── Financial Context Builder ───────────────────────────────────────────────

async function buildFinancialContext(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // 1. Fetch deterministic data via Repositories
  const [
    monthlyStats,
    allBudgets,
    allGoals,
    allDebts,
    totalBalance,
    recentTxnsList
  ] = await Promise.all([
    StatisticsService.getMonthlySummary(year, month),
    BudgetRepository.getAll(),
    GoalRepository.getAll(),
    DebtRepository.getAll(),
    AccountRepository.getTotalBalance(),
    TransactionRepository.getAll(10)
  ]);

  const currency = useSettingsStore.getState().baseCurrency || 'SAR';
  const monthName = getMonthName(month);
  const financialScore = calculateFinancialScore({
    monthStats: monthlyStats,
    budgets: allBudgets,
    savings: totalBalance,
    debts: allDebts
  });

  const getAiCatLabel = (cat: string): string => {
    const catId = Object.keys(CATEGORY_MAP).find(k => (CATEGORY_MAP as Record<string, string>)[k] === cat);
    if (catId) return t(`ai.cat.${catId}`) || cat;
    return cat;
  };

  // Format Category Breakdown
  const catBreakdown = Object.entries(monthlyStats.breakdown || {})
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 6)
    .map(([c, a]) => `${getAiCatLabel(c)}: ${fmt(a as number)}`)
    .join(', ');

  // Format Recent Transactions
  const recentTxnsText = recentTxnsList.map(tx => {
    const date = tx.date ? tx.date.substring(0, 10) : '?';
    const cat = getAiCatLabel(tx.category);
    const typeLabel = tx.type === 'income' ? '+' : '-';
    return `${date} ${typeLabel}${fmt(tx.amount)} ${cat}${tx.description ? ' (' + tx.description + ')' : ''}`;
  }).join('\n');

  // Format Budgets
  const budgetStatus = allBudgets.slice(0, 5).map(b => {
    const spent = monthlyStats.breakdown[b.category] || 0;
    const pct = b.limit > 0 ? Math.round(spent / b.limit * 100) : 0;
    return `${getAiCatLabel(b.category)}: ${fmt(spent)}/${fmt(b.limit)} (${pct}%)${pct >= 100 ? ' ❌' : ''}`;
  }).join(', ');

  // Format Goals & Debts
  const activeGoals = allGoals.filter(g => (g.saved || 0) < g.target)
    .map(g => `${g.name || (g as { title?: string }).title || ''}: ${fmt(g.saved || 0)}/${fmt(g.target)}`).join(', ');
  
  const activeDebts = allDebts.filter(d => (Number(d.paid) || 0) < Number(d.total))
    .map(d => `${d.name}: ${fmt(Number(d.total) - (Number(d.paid) || 0))} remaining`).join(', ');

  const currentLangCode = useSettingsStore.getState().language || 'ar';
  const currentLangMeta = (LANGUAGE_META as Record<string, { name?: string; nameEn?: string }>)[currentLangCode];
  const currentLangName = currentLangMeta?.nameEn || currentLangMeta?.name || 'Arabic';

  // Work Hours Context
  const { hourlyRate: hRate, isWorkHoursEnabled } = useSettingsStore.getState();
  const hourlyRate = isWorkHoursEnabled ? (hRate || 0) : 0;
  const debtInHours = hourlyRate > 0 ? (allDebts.filter(d => (Number(d.total) - (Number(d.paid) || 0)) > 0).reduce((s, d) => s + (Number(d.total) - (Number(d.paid) || 0)), 0) / hourlyRate).toFixed(1) : '0';

  // App Knowledge Strings
  const currencyCount = Object.keys(CURRENCIES).length;
  const langCount = Object.keys(LANGUAGE_META).length;

  return `${t('ai.prompt.identity')}

═══ APP KNOWLEDGE ═══
🌍 Languages: ${langCount} | 💱 Currencies: ${currencyCount}
${t('ai.prompt.features')}
👤 Context: Language=${currentLangName}, Currency=${currency}, HourlyRate=${hourlyRate}

═══ DETERMINISTIC FINANCIAL TRUTH (DO NOT CONTRADICT THIS) ═══
📊 Financial Health Score: ${financialScore}/100
💰 Current Total Balance: ${fmt(totalBalance)} ${currency}
🗓️ Month: ${monthName} ${year}
📈 Monthly Income: ${fmt(monthlyStats.income)}
📉 Monthly Expense: ${fmt(monthlyStats.expense)}
🏦 Monthly Net: ${fmt(monthlyStats.net)}
🏷️ Top Categories: ${catBreakdown || 'None'}
🎯 Budget Status: ${budgetStatus || 'None'}
⭐ Active Goals: ${activeGoals || 'None'}
💳 Active Debts: ${activeDebts || 'None'}
⏳ Work Hours to clear Debt: ${debtInHours}h

═══ RECENT ACTIVITY ═══
${recentTxnsText || 'No recent activity'}

═══ AI ADVISOR RULES ═══
1. ALWAYS reply in ${currentLangName}.
2. Be CONCISE but insightful.
3. Your advice MUST align with the Financial Health Score of ${financialScore}.
4. Use ${currency} for all amounts.
5. If HourlyRate > 0, occasionally mention how many work hours a purchase costs to add perspective.
6. If score < 50, be firm and cautionary. If > 80, be encouraging.
`;
}

// ─── Generic HTTP helper ──────────────────────────────────────────────────────

interface FetchResult {
  status: number;
  data?: Record<string, unknown> | unknown[] | string;
  error?: string;
}

interface FetchOptions extends RequestInit {
  timeout?: number;
}

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

async function callGemini(
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

async function callGroq(
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

async function callCustom(
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

async function callFreeAI(
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

let _lastAiCallTime = 0;
let _currentAiController: AbortController | null = null;
const AI_RATE_LIMIT_MS = 2000;

export function sanitizeUserMessage(message: unknown): string {
  if (!message || typeof message !== 'string') return '';
  
  let clean = message.trim().slice(0, 1000);
  clean = clean.replace(/<\/?[^>]+(>|$)/g, "");
  
  const injectionPatterns = [
    /ignore\s+(?:all\s+|previous\s+|the\s+|system\s+|above\s+)*(?:instructions|rules|directives|prompts)/gi,
    /system\s+override/gi,
    /you\s+are\s+now\s+a/gi,
    /new\s+instructions/gi,
    /translate\s+the\s+above/gi,
    /تجاهل\s+(?:التعليمات|السابقة|كل)/gi,
    /تغيير\s+الدور/gi
  ];
  
  for (const pattern of injectionPatterns) {
    if (pattern.test(clean)) {
      clean = clean.replace(pattern, "[Neutralized Override Pattern]");
    }
  }
  
  return clean;
}

export async function askGemini(userMessage: string, conversationHistory: ChatMessage[] = []): Promise<AIResponse> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { error: 'network_error', debug: 'No internet connection' };
  }

  const sanitizedMessage = sanitizeUserMessage(userMessage);
  if (!sanitizedMessage) {
    return { error: 'empty_response', debug: 'Message was empty or blocked by security filters.' };
  }

  if (_currentAiController) {
    _currentAiController.abort();
    _currentAiController = null;
  }

  const now = Date.now();
  if (now - _lastAiCallTime < AI_RATE_LIMIT_MS) {
    return { error: 'rate_limit', debug: 'Please wait a moment before sending another message.' };
  }
  _lastAiCallTime = now;
  
  _currentAiController = new AbortController();
  const signal = _currentAiController.signal;

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
        _currentAiController = null;
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
        _currentAiController = null;
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
        _currentAiController = null;
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
          _currentAiController = null;
          return result;
        }
      }
    } catch (err: unknown) {
      const errorObj = err as { name?: string };
      if (errorObj.name === 'AbortError') return { error: 'aborted' };
    }
  }

  _currentAiController = null;
  return { error: 'network_error' };
}

export function getGeminiErrorMessage(errorCode: string, debug: string = ''): string {
  const debugStr = debug ? `: ${debug}` : '';
  const msg = t(`chat.error.${errorCode}`, { debug: debugStr });
  if (msg === `chat.error.${errorCode}`) return t('chat.error.generic', { debug: debug || errorCode });
  return msg;
}
