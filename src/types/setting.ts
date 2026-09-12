/**
 * Represents a single setting entry in the DB.
 */
export interface SettingEntry {
  id: string;
  key?: string;
  value: unknown;
}

export interface SalaryAllowance {
  id: string;
  label: string;
  amount: number;
}

export interface SalaryDeduction {
  id: string;
  label: string;
  amount: number;
}

export interface DigitalEnvelope {
  id: string;
  name: string;
  limit: number;
  spent: number;
  color: string;
  icon: string;
}

export interface ChildTransaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: 'income' | 'expense';
}

export interface ChildAccount {
  id: string;
  name: string;
  age: number;
  balance: number;
  allowance: number;
  allowancePeriod?: 'daily' | 'weekly' | 'monthly';
  period?: 'daily' | 'weekly' | 'monthly';
  transactions: ChildTransaction[];
}

import type { LanguageCode } from './language';

export type { LanguageCode };

/**
 * Represents the structured application settings.
 */
export interface AppSettings {
  language: LanguageCode;
  theme: 'light' | 'dark' | 'auto';
  darkPalette: string;
  lightPalette: string;
  baseCurrency: string;
  numberSystem: 'latn' | 'arab';
  decimalPlaces: 0 | 1 | 2;
  numberSeparator: 'comma_dot' | 'dot_comma' | 'space_comma' | 'space_dot' | 'none';
  fontSize: 'normal' | 'large';
  currencyDisplayMode: 'symbol' | 'code' | 'nameAr' | 'nameEn' | 'local';
  incognito: boolean;
  dbEncryption: boolean;
  useBiometric: boolean;
  aiResponseLength: 'short' | 'long';
  firstDayOfMonth: number;
  firstDayOfWeek: number;
  lastCurrencyUpdate?: string;
  lastGoldSync?: string;
  homeOrder: Array<{ id: string; visible: boolean; labelKey: string; icon: string }>;
  qaOrder: string[];
  qaVisibility: Record<string, boolean>;
  qaColumns?: number;
  hourlyRate: number;
  isWorkHoursEnabled: boolean;
  salaryBasic?: number;
  salaryAllowances?: SalaryAllowance[];
  salaryDeductions?: SalaryDeduction[];
  hasOnboarded: boolean;
  completedMilestones?: string[];
  unlockedItems?: string[];
  streakShields?: number;
  aiPremiumUntil?: number;
  lockedYears?: number[];
  isSimpleMode?: boolean;
  envelopes?: DigitalEnvelope[];
  childAccounts?: ChildAccount[];

  // Next-Gen UI Features (Opt-in)
  enableAdvancedDashboard?: boolean;
  enable3DCity?: boolean;
  enableGamification?: boolean;
  enablePredictiveAI?: boolean;
}
