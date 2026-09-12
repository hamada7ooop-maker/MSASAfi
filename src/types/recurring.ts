import { Transaction } from './transaction';

export interface RecurringTransaction extends Omit<Transaction, 'date'> {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  nextDate: string;
  startDate?: string;
  lastProcessed?: string;
  endDate?: string;
  isActive: boolean;
  autoConfirm?: boolean; // If false, the transaction requires manual confirmation (Confirm/Skip/Postpone)
}

