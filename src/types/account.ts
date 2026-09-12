/**
 * Represents a financial account (Bank, Cash, Wallet, etc.)
 */
export interface Account {
  id: string;
  name: string;
  type: 'bank' | 'cash' | 'ewallet' | 'crypto' | 'savings' | 'credit';
  balance: number;
  initialBalance?: number;
  currency?: string;
  icon?: string;
  color?: string;
  archived?: boolean;
  createdAt?: string | number;
  isDemo?: number | boolean;
}
