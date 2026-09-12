/**
 * Represents a recurring bill or subscription.
 */
export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  type?: 'bill' | 'subscription';
  isPaid?: boolean;
  paidDate?: string;
  recurring?: 'daily' | 'monthly' | 'weekly' | 'yearly' | 'custom';
  renewCycle?: 'daily' | 'monthly' | 'weekly' | 'yearly' | 'custom';
  notes?: string;
  icon?: string;
  createdAt?: string | number;
  isDemo?: number | boolean;
}
