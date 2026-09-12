export interface Subscription {
  id: string;
  name: string;
  amount: number;
  nextBillingDate: string;
  category?: string;
  icon?: string;
  notes?: string;
  renewDate?: string;
  createdAt?: string | number;
  isDemo?: number | boolean;
}
