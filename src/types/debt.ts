/**
 * Represents a debt (Money lent to others or owed to others).
 */
export interface Debt {
  id: string;
  type: 'lent' | 'owed';
  name: string;
  person?: string;
  total: number;
  paid: number;
  dueDate?: string;
  notes?: string;
  icon?: string;
  accountId?: string;
  interestRate?: number;
  termMonths?: number;
  interestType?: 'declining' | 'flat';
  transactionId?: string;
  createdAt?: string | number;
  isDemo?: number | boolean;
}
