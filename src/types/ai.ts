/**
 * AI Providers and Configuration
 */
export type AIProvider = 'gemini' | 'groq' | 'puter' | 'custom';

export interface AIProviderConfig {
  active: AIProvider;
  geminiKey?: string;
  groqKey?: string;
  usePuter?: boolean;
  custom?: { url: string; key: string; model: string };
}

export interface AIConfig {
  provider: AIProvider;
  geminiKey?: string;
  groqKey?: string;
  usePuter?: boolean;
  customConfig?: { url: string; key: string; model: string };
}

export interface ChatMessage {
  id?: number | string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

export interface StreamChunk {
  type: 'text' | 'done' | 'error';
  content: string;
}

/**
 * Context provided to the AI for financial advice.
 */
export interface FinancialContext {
  balance: number;
  currency: string;
  monthlyIncome: number;
  monthlyExpense: number;
  savingsRate: number;
  daysLeft: number;
  dailyAverage: number;
  topCategories: string;
  recentTransactions: string;
  activeGoals: string;
  activeDebts: string;
  budgetStatus: string;
  yearIncome: number;
  yearExpense: number;
  yearSavingsRate: number;
}

/**
 * Callbacks for streaming AI responses.
 */
export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
  signal?: AbortSignal;
}

export interface SmartRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
  title: string;
  body: string;
  action: string | null;
}

