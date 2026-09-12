/**
 * Represents a single financial transaction.
 * Matches the schema in 'transactions' table of masarifi_dexie.
 */
export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  originalAmount?: number;
  category: string;
  description?: string;
  notes?: string;
  date: string;        // ISO string (YYYY-MM-DDTHH:mm:ss.sssZ)
  createdAt?: string | number;   // ISO string or timestamp
  currency?: string;
  paymentMethod?: string;
  status?: 'cleared' | 'pending' | 'reconciled' | string;
  accountId?: string | null;
  account?: string | null;
  attachment?: string;  // Base64 image string
  location?: string;
  smsText?: string;
  isRecurring?: boolean;
  shared?: boolean;
  splitBy?: number;
  customSplits?: Record<string, number>;
  _encrypted?: boolean;
  icon?: string;
  includedMembers?: string[];
  goalId?: string;
  recurrence?: string;
  necessity?: 'need' | 'want';
  isFavorite?: boolean;
  isDraft?: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
  mood?: string;
  coolingExpireDate?: string;
  tripId?: string; // Travel Trip ID associated with this transaction
  isDemo?: number | boolean;
  splits?: Array<{
    category: string;
    amount: number;
    description?: string;
  }>; // Split transaction categories and amounts
  runningBalance?: number;
}
